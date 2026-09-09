"""Sliding-path rules and a bounded, state-aware hint search.

The hero is never carried by a sliding tile. Safe directed routes respect
predators, one-way currents and fragile stones that collapse after departure.
"""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass, replace
import heapq
import itertools
import time
import uuid

SIZE = 4
OUTSIDE, FINISH = -1, SIZE * SIZE
DIRECTIONS = {"N": (-1, 0), "E": (0, 1), "S": (1, 0), "W": (0, -1)}
OPPOSITE = {"N": "S", "S": "N", "E": "W", "W": "E"}


class GameError(ValueError):
    """A rejected user action, with a safe French UI message."""


@dataclass(frozen=True)
class Tile:
    id: str
    ports: tuple[str, ...]
    hazard: str | None = None
    flow: str | None = None


@dataclass(frozen=True)
class Level:
    id: str
    name: str
    subtitle: str
    difficulty: str
    par: int
    tiles: tuple[Tile | None, ...]
    solution: tuple[tuple, ...]
    biome: str = "jungle"
    biomeLevel: int = 1
    chapter: int = 1

    def public(self):
        result = {key: getattr(self, key) for key in
                ("id", "name", "subtitle", "difficulty", "par",
                 "biome", "biomeLevel", "chapter")}
        hazards = {tile.hazard for tile in self.tiles if tile and tile.hazard}
        if "fragile" in hazards:
            mechanic = {"title": "Traversée éclair", "text": "Rejoignez une pierre stable en une seule marche : les dalles fissurées s’effondrent derrière vous. Utilisez ces nouveaux vides pour déplacer les autres pierres."}
        elif "current" in hazards:
            mechanic = {"title": "Courants à sens unique", "text": "Sur une dalle à courant, Lumen peut seulement repartir dans le sens de la flèche. Placez ces pierres pour former un trajet dans le bon sens."}
        elif "crocodile" in hazards:
            mechanic = {"title": "Gardiens de la jungle", "text": "Les crocodiles bloquent le passage. Déplacez leurs dalles pour dégager votre route : ils restent sur leur pierre."}
        elif self.id == "relais":
            mechanic = {"title": "Un chemin à réutiliser", "text": "Avancez avant de tout relier. Les pierres laissées derrière Lumen peuvent servir à construire la suite du passage."}
        else:
            mechanic = {"title": "Suivez la lumière", "text": "Glissez les pierres vers le vide et reliez les chemins. Une pierre occupée par Lumen ne peut pas bouger."}
        result["mechanic"] = mechanic
        return result


def neighbors(index):
    row, col = divmod(index, SIZE)
    for side, (dr, dc) in DIRECTIONS.items():
        rr, cc = row + dr, col + dc
        if 0 <= rr < SIZE and 0 <= cc < SIZE:
            yield side, rr * SIZE + cc


def make_tiles(level_id, ports, empty):
    return tuple(None if i == empty else Tile(f"{level_id}-{i}", tuple(value))
                 for i, value in enumerate(ports))


def scramble(tiles, sources):
    board = list(tiles)
    for source in sources:
        empty = board.index(None)
        assert source in [i for _, i in neighbors(empty)]
        board[empty], board[source] = board[source], None
    return tuple(board)


def route_level(level_id, name, subtitle, difficulty, biome, biome_level, route, sources):
    """Build a fixed puzzle and its exact inverse from a complete route.

    The authored routes and legal scrambles are stable across launches.
    Par is a demonstrated solution length, not a claim of optimality.
    """
    chapter = {"jungle": 0, "atlantis": 5, "volcano": 10}[biome] + biome_level
    assert route[0] == 0 and route[-1] == FINISH - 1
    assert len(set(route)) == len(route) < FINISH
    shapes = ("NE", "NS", "NW", "ES", "EW", "SW")
    ports = [shapes[(i * 5 + chapter) % len(shapes)] for i in range(FINISH)]
    empty = next(i for i in reversed(range(FINISH)) if i not in route)
    for step, at in enumerate(route):
        previous = "W" if step == 0 else next(
            side for side, dest in neighbors(at) if dest == route[step - 1])
        following = "E" if step == len(route) - 1 else next(
            side for side, dest in neighbors(at) if dest == route[step + 1])
        ports[at] = previous + following
    solved = make_tiles(level_id, ports, empty)
    # Each forward slide leaves its source empty. To undo it, slide the tile
    # at the previous empty cell; reverse that sequence to restore the route.
    reverse_sources = tuple(reversed((empty, *sources[:-1])))
    solution = tuple(("slide", i) for i in reverse_sources) + (("walk", FINISH),)
    return Level(level_id, name, subtitle, difficulty, len(sources),
                 scramble(solved, sources), solution, biome, biome_level, chapter)


# The first level preserves its original puzzle. The fifth level, relais, has
# only six traversable tiles: a static corner-to-corner route needs at least
# seven, making interleaved walking/sliding a mathematical requirement.
_first_solved = make_tiles("aube", ["WE", "WE", "WS", "SE", "NE", "WN",
    "NS", "NW", "SE", "SW", "NE", "WS", "NS", "WE", "NE", "NE"], 14)
_second_solved = make_tiles("jardins", ["WS", "NW", "WE", "NE", "NE", "WS",
    "SE", "WS", "SE", "NE", "WN", "NS", "WS", "WE", "NS", "NE"], 14)
LEVELS = (
    Level("aube", "Le premier passage", "Deux pierres suffisent à réveiller le chemin.",
          "Initiation", 2, scramble(_first_solved, [10, 6]),
          (("slide", 10), ("slide", 14), ("walk", FINISH))),
    Level("jardins", "Les jardins suspendus", "Retrouvez le fil entre les détours.",
          "Exploration", 6, scramble(_second_solved, [13, 9, 5, 6, 10, 9]),
          (("slide", 10), ("slide", 6), ("slide", 5), ("slide", 9),
           ("slide", 13), ("slide", 14), ("walk", FINISH)),
          biomeLevel=2, chapter=2),
    route_level("brumes", "Le sentier des brumes", "Suivez les pierres entre les racines.",
                "Exploration", "jungle", 3,
                (0, 4, 8, 9, 5, 6, 10, 14, 15),
                (12, 8, 4, 5, 9, 10, 14, 15)),
    route_level("canopee", "Le temple de la canopée", "Les détours cachent le passage du temple.",
                "Aventure", "jungle", 4,
                (0, 1, 5, 4, 8, 9, 10, 6, 7, 11, 15),
                (15, 11, 7, 6, 2, 1, 0, 4, 8, 9, 5, 6)),
    Level("relais", "La pierre voyageuse", "Avancez, puis réutilisez le chemin derrière vous.",
          "Défi", 16, make_tiles("relais", ["WE", "WS", "", "", "", "NE", "",
              "WS", "", "", "", "NS", "", "", "", "NE"], 2),
          (("walk", 5),) + tuple(("slide", i) for i in
              [1, 0, 4, 8, 9, 10, 6, 2, 1, 0, 4, 8, 9, 10, 6, 2])
          + (("walk", FINISH),), biomeLevel=5, chapter=5),
    route_level("lagon", "Les portes du lagon", "Retrouvez l'entrée de la cité engloutie.",
                "Exploration", "atlantis", 1,
                (0, 4, 5, 6, 2, 3, 7, 11, 15),
                (15, 11, 7, 3, 2, 1, 0, 4, 5, 1)),
    route_level("marees", "La salle des marées", "Un long détour traverse le palais submergé.",
                "Aventure", "atlantis", 2,
                (0, 1, 2, 3, 7, 6, 5, 9, 13, 14, 15),
                (8, 4, 0, 1, 5, 6, 2, 3, 7, 11, 15, 14, 13, 12)),
    route_level("corail", "Le labyrinthe de corail", "Remontez le chemin parmi les vestiges.",
                "Défi", "atlantis", 3,
                (0, 4, 8, 12, 13, 9, 5, 6, 10, 11, 15),
                (10, 11, 7, 3, 2, 6, 7, 11, 15, 14, 13, 12, 8, 9, 5, 1, 0, 4)),
    route_level("abysses", "Les archives des abysses", "Les pierres ont gardé la mémoire du passage.",
                "Expert", "atlantis", 4,
                (0, 1, 5, 4, 8, 12, 13, 14, 10, 6, 7, 11, 15),
                (13, 12, 8, 4, 5, 1, 2, 6, 5, 1, 0, 4, 5, 6, 7, 3, 2, 6, 10, 14, 15, 11)),
    route_level("trident", "Le sanctuaire du trident", "Reliez les derniers vestiges d'Atlantis.",
                "Maîtrise", "atlantis", 5,
                (0, 4, 5, 1, 2, 3, 7, 6, 10, 9, 13, 14, 15),
                (8, 9, 10, 11, 7, 3, 2, 6, 7, 3, 2, 1, 0, 4, 5, 1, 0, 4,
                 5, 9, 10, 11, 15, 14, 13, 9)),
    route_level("cendres", "Le seuil des cendres", "Ouvrez une voie dans la pierre volcanique.",
                "Défi", "volcano", 1,
                (0, 1, 2, 6, 5, 4, 8, 12, 13, 9, 10, 14, 15),
                (15, 14, 13, 12, 8, 9, 13, 12, 8, 4, 0, 1, 5, 6, 2, 3, 7, 11)),
    route_level("braises", "Le pont des braises", "Chaque virage rapproche Lumen du cœur ardent.",
                "Expert", "volcano", 2,
                (0, 4, 8, 9, 5, 1, 2, 3, 7, 6, 10, 11, 15),
                (15, 11, 10, 14, 13, 12, 8, 4, 5, 9, 13, 12, 8, 4, 0, 1, 2, 3, 7, 6, 10, 14)),
    route_level("obsidienne", "La spirale d'obsidienne", "Une route sinueuse parcourt presque tout le temple.",
                "Expert", "volcano", 3,
                (0, 1, 5, 9, 8, 12, 13, 14, 10, 6, 2, 3, 7, 11, 15),
                (0, 1, 2, 3, 7, 11, 15, 14, 13, 12, 8, 4, 0, 1, 2, 6, 5, 4,
                 8, 9, 10, 6, 5, 9, 10, 11)),
    route_level("forge", "La forge des anciens", "Réveillez le chemin gravé dans la roche noire.",
                "Maîtrise", "volcano", 4,
                (0, 4, 8, 12, 13, 9, 5, 1, 2, 6, 10, 14, 15),
                (7, 6, 5, 4, 8, 9, 10, 14, 13, 12, 8, 9, 13, 14, 15, 11,
                 7, 6, 5, 4, 0, 1, 2, 3, 7, 11, 10, 14, 13, 9)),
    route_level("caldera", "Le cœur de la caldeira", "Reconstituez l'ultime passage des chemins oubliés.",
                "Légende", "volcano", 5,
                (0, 4, 8, 12, 13, 14, 10, 9, 5, 1, 2, 3, 7, 11, 15),
                (2, 1, 0, 4, 8, 12, 13, 9, 10, 11, 7, 6, 2, 1, 0, 4, 5, 6,
                 2, 1, 0, 4, 5, 1, 2, 3, 7, 6, 10, 14, 15, 11, 10, 6)),
)
LEVEL_BY_ID = {level.id: level for level in LEVELS}


def connected_neighbors(board, position):
    """Directed edges: predators block entry; currents constrain departure."""
    if position == OUTSIDE:
        if board[0] and board[0].hazard != "crocodile" and "W" in board[0].ports:
            yield 0
        return
    if position == FINISH:
        return
    tile = board[position]
    if tile is None or tile.hazard == "crocodile":
        return
    allowed = (tile.flow,) if tile.hazard == "current" else tile.ports
    if position == 0 and "W" in tile.ports and "W" in allowed:
        yield OUTSIDE
    if position == 15 and "E" in tile.ports and "E" in allowed:
        yield FINISH
    for side, destination in neighbors(position):
        other = board[destination]
        if (side in tile.ports and side in allowed and other
                and other.hazard != "crocodile" and OPPOSITE[side] in other.ports):
            yield destination


def paths_from(board, hero):
    """Exact shortest routes to stable stopping places, through fragile cells.

    Every route is simple, so a fragile cell is never reused after collapsing.
    The client receives these routes rather than approximating directed paths.
    """
    paths = {hero: [hero]}
    queue = deque([hero])
    while queue:
        at = queue.popleft()
        for destination in connected_neighbors(board, at):
            if destination not in paths:
                paths[destination] = paths[at] + [destination]
                queue.append(destination)
    return {at: path for at, path in paths.items()
            if at in {OUTSIDE, FINISH} or at == hero
            or board[at].hazard != "fragile"}


def walk_result(board, hero, destination, paths=None):
    paths = paths if paths is not None else paths_from(board, hero)
    if destination not in paths or destination == hero:
        raise GameError("Le chemin vers cette case n’est pas encore relié dans le bon sens.")
    path = paths[destination]
    result = list(board)
    collapsed = []
    for step, index in enumerate(path[:-1]):
        if 0 <= index < FINISH and result[index] and result[index].hazard == "fragile":
            collapsed.append({"index": index, "tileId": result[index].id, "pathStep": step})
            result[index] = None
    return tuple(result), path, collapsed


def slide_options(board, hero):
    return sorted((source, target) for target, tile in enumerate(board) if tile is None
                  for _, source in neighbors(target) if board[source] and source != hero)


def board_key(board):
    # Shape-equivalent tiles are interchangeable only when their hazards and
    # current directions also match. Stable IDs are retained in actual boards.
    return tuple(None if tile is None else
                 ("".join(sorted(tile.ports)), tile.hazard, tile.flow) for tile in board)


def search_key(board, hero):
    # Directed currents and irreversible collapses invalidate component merging.
    return board_key(board), hero


def swapped(board, source, target=None):
    if target is None:
        target = min((i for _, i in neighbors(source) if board[i] is None), default=None)
    if target is None or (source, target) not in slide_options(board, OUTSIDE):
        raise GameError("Seule une pierre voisine du vide choisi peut glisser.")
    result = list(board)
    result[target], result[source] = result[source], None
    return tuple(result)


def valid_index(value, *, outside=False):
    low, high = (OUTSIDE, FINISH) if outside else (0, FINISH - 1)
    return type(value) is int and low <= value <= high


class Game:
    def __init__(self, level_id="aube"):
        if not isinstance(level_id, str) or level_id not in LEVEL_BY_ID:
            raise GameError("Ce niveau n’existe pas.")
        self.id = uuid.uuid4().hex
        self.level = LEVEL_BY_ID[level_id]
        self.history = []
        self._reset()

    def _reset(self):
        self.tiles = self.level.tiles
        self.hero = OUTSIDE
        self.previous_hero = None
        self.moves = self.steps = 0
        self.hint = None
        self.walk_path = None
        self.collapsed = []
        self.message = self.level.subtitle

    def _save(self, walk_path=None):
        route = tuple(walk_path) if walk_path else None
        self.history.append((self.tiles, self.hero, self.previous_hero,
                             self.moves, self.steps, route))

    def state(self):
        paths = paths_from(self.tiles, self.hero)
        won = self.hero == FINISH
        options = [] if won else slide_options(self.tiles, self.hero)
        return {
            "id": self.id, "levelId": self.level.id, "biome": self.level.biome,
            "size": SIZE, "mechanic": self.level.public()["mechanic"],
            "tiles": [None if t is None else {"id": t.id, "ports": list(t.ports),
                       "hazard": t.hazard, "flow": t.flow} for t in self.tiles],
            "hero": self.hero, "entry": {"index": 0, "side": "W"},
            "exit": {"index": 15, "side": "E"}, "moves": self.moves,
            "steps": self.steps, "won": won,
            "reachable": sorted(i for i in paths if 0 <= i < FINISH),
            "walkRoutes": {str(i): path for i, path in paths.items() if i != self.hero},
            "emptyCells": [i for i, tile in enumerate(self.tiles) if tile is None],
            "slideOptions": [{"index": source, "to": target} for source, target in options],
            "slidable": sorted({source for source, _ in options}),
            "canEnter": self.hero == OUTSIDE and any(i >= 0 for i in paths),
            "canExit": not won and FINISH in paths,
            "historyLength": len(self.history), "hint": self.hint,
            "message": self.message, "collapsed": self.collapsed,
            **({"walkPath": self.walk_path} if self.walk_path else {}),
        }

    def act(self, action, index=None, to=None):
        if not isinstance(action, str) or action not in {"slide", "walk", "undo", "reset", "hint"}:
            raise GameError("Action inconnue.")
        if to is not None and (action != "slide" or not valid_index(to)):
            raise GameError("Choisissez un vide valide pour ce déplacement.")
        if action == "slide":
            self._slide(index, to)
        elif action == "walk":
            self._walk(index)
        elif action == "undo":
            if not self.history:
                raise GameError("Aucune action à annuler.")
            (self.tiles, self.hero, self.previous_hero,
             self.moves, self.steps, route) = self.history.pop()
            self.walk_path = list(reversed(route)) if route else None
            self.collapsed = []
            self.hint = None
            self.message = "Un pas en arrière. Les pierres retrouvent leur place."
        elif action == "reset":
            self.history.clear()
            self._reset()
        else:
            self.walk_path = None
            self.collapsed = []
            self.hint = find_hint(self)
            self.message = self.hint["text"] if self.hint else (
                "Le passage est accompli." if self.hero == FINISH else
                "Aucune piste trouvée dans le temps imparti. Essayez d’annuler quelques actions.")
        return self.state()

    def _slide(self, index, target=None):
        if not valid_index(index):
            raise GameError("Choisissez une case valide.")
        if self.hero == FINISH:
            raise GameError("Le passage est déjà accompli.")
        if index == self.hero:
            raise GameError("Cette pierre porte Lumen. Faites-le avancer avant de la déplacer.")
        options = [to for source, to in slide_options(self.tiles, self.hero) if source == index]
        if target is None and options:
            target = options[0]
        if target not in options:
            raise GameError("Seule une pierre voisine du vide choisi peut glisser.")
        self._save()
        self.tiles = swapped(self.tiles, index, target)
        self.moves += 1
        self.hint = self.walk_path = None
        self.collapsed = []
        self.message = "Un nouveau passage s’ouvre." if len(self.state()["emptyCells"]) > 1 else "Le chemin se transforme."

    def _walk(self, index):
        if self.hero == FINISH:
            raise GameError("Lumen est arrivé à destination.")
        paths = paths_from(self.tiles, self.hero)
        if index is None:
            # Advance to the closest stable landing place, automatically crossing
            # a run of fragile cells without allowing an unsafe intermediate stop.
            options = [i for i, path in paths.items() if i != self.hero and i != OUTSIDE
                       and len(path) > 1 and path[1] != self.previous_hero]
            if not options:
                raise GameError("Le chemin s’arrête ici. Reliez une pierre stable, ou revenez sur vos pas.")
            index = min(options, key=lambda i: (len(paths[i]), -100 if i == FINISH else
                        abs(3 - i // SIZE) + abs(3 - i % SIZE), i))
        if not valid_index(index, outside=True):
            raise GameError("Choisissez une destination valide.")
        if index == self.hero:
            raise GameError("Lumen se trouve déjà sur cette case.")
        if 0 <= index < FINISH and self.tiles[index]:
            if self.tiles[index].hazard == "crocodile":
                raise GameError("Un crocodile garde cette pierre. Déplacez sa dalle pour le contourner.")
            if self.tiles[index].hazard == "fragile":
                raise GameError("Cette dalle va s’effondrer : choisissez une pierre stable au-delà pour la traverser sans arrêt.")
        next_board, path, collapsed = walk_result(self.tiles, self.hero, index, paths)
        self._save(path)
        self.tiles = next_board
        self.previous_hero = path[-2]
        self.hero = index
        self.steps += len(path) - 1
        self.walk_path = path
        self.collapsed = collapsed
        self.hint = None
        self.message = ("Le passage est accompli !" if index == FINISH else
                        "Les dalles s’effondrent derrière Lumen. Utilisez les nouveaux vides !" if collapsed else
                        "Lumen suit la lumière.")


def apply_plan(board, hero, actions):
    """Validate every actual transition; never treat directed walks as reversible."""
    for action in actions:
        kind, index, *extra = action
        if kind == "slide":
            target = extra[0] if extra else None
            if index == hero:
                raise GameError("Pierre occupée.")
            board = swapped(board, index, target)
        elif kind == "walk":
            board, _, _ = walk_result(board, hero, index)
            hero = index
        else:
            raise GameError("Action inconnue.")
    return board, hero


def witness_cache(level):
    board, hero = level.tiles, OUTSIDE
    result = {}
    for offset, action in enumerate(level.solution):
        result.setdefault(board_key(board), []).append((hero, level.solution[offset:]))
        try:
            board, hero = apply_plan(board, hero, (action,))
        except GameError as exc:
            raise AssertionError((level.id, offset, action, str(exc))) from exc
    assert hero == FINISH, level.id
    return result


def hazard_campaign(levels):
    levels = list(levels)
    garden = levels[1]
    ports = ["NESW", "WE", "WS", "", "", "NE", "WE", "WS", "", "", "", "NS", "", "", "", "NE"]
    levels[1] = replace(garden, par=3, tiles=make_tiles(garden.id, ports, 4),
        subtitle="Un gardien bloque l’entrée. Écartez sa pierre pour ouvrir le passage.",
        solution=(("slide", 0), ("slide", 1), ("slide", 2), ("walk", FINISH)))
    levels[2] = route_level("brumes", "Le sentier des brumes",
        "Faites sortir le crocodile du passage, puis retrouvez le détour entre les racines.",
        "Exploration", "jungle", 3, (0, 4, 8, 9, 5, 6, 10, 14, 15),
        (9, 5, 1, 0, 4, 5, 1, 0, 4))
    result = []
    crocodiles = {"jardins": {"jardins-0"}, "brumes": {"brumes-1", "brumes-3"},
                  "canopee": {"canopee-2", "canopee-12"}}
    for level in levels:
        changes = {}
        if level.id in crocodiles:
            for tile in level.tiles:
                if tile and tile.id in crocodiles[level.id]:
                    # Four visible openings make these occupied stones tempting
                    # bridges, but the explorer must route around their guardian.
                    changes[tile.id] = replace(tile, ports=tuple("NESW"), hazard="crocodile")
        if level.biome in {"atlantis", "volcano"}:
            board, hero = level.tiles, OUTSIDE
            route = []
            for action in level.solution:
                if action[0] == "walk":
                    route = paths_from(board, hero)[action[1]]
                    final_board = board
                board, hero = apply_plan(board, hero, (action,))
            cells = [i for i in route if 0 <= i < FINISH]
            # Start with two marked stones; later chapters combine several.
            positions = cells[1:-1: max(2, 5 - level.biomeLevel)]
            for index in positions:
                tile = final_board[index]
                if level.biome == "atlantis":
                    dest = route[route.index(index) + 1]
                    flow = next(side for side, target in neighbors(index) if target == dest)
                    changes[tile.id] = replace(tile, hazard="current", flow=flow)
                else:
                    changes[tile.id] = replace(tile, hazard="fragile")
        if changes:
            level = replace(level, tiles=tuple(changes.get(t.id, t) if t else None for t in level.tiles))
        result.append(level)
    # This first short collapse puzzle teaches a new action sequence: cross,
    # open a second hole, and use that hole to bring the missing turn across.
    source = result[10]
    ports = ["WE", "WS", "", "", "", "NE", "", "WS", "", "", "NS", "", "", "", "NE", "WE"]
    tiles = list(make_tiles(source.id, ports, 3))
    tiles[1] = replace(tiles[1], hazard="fragile")
    result[10] = replace(source, tiles=tuple(tiles), par=3,
        subtitle="Traversez la fissure, puis utilisez le vide qu’elle laisse derrière vous.",
        difficulty="Découverte", solution=(("walk", 5), ("slide", 2, 1),
        ("slide", 6, 2), ("slide", 7, 6), ("walk", FINISH)))
    # Only six stones have corridors, while a complete entrance-to-exit route
    # needs at least seven. Cross first, then recycle the entrance stone into
    # the bridge ahead; the fallen stone opens a second hole for that transfer.
    source = result[11]
    ports = ["WE", "WS", "", "", "", "NE", "", "WS", "", "", "", "NS", "", "", "", "NE"]
    tiles = list(make_tiles(source.id, ports, 2))
    tiles[1] = replace(tiles[1], hazard="fragile")
    result[11] = replace(source, tiles=tuple(tiles), par=8,
        subtitle="Traversez le pont fragile, puis réutilisez une pierre laissée derrière vous.",
        difficulty="Aventure", solution=(("walk", 5), ("slide", 0, 1),
        ("slide", 1, 2), ("slide", 4, 0), ("slide", 8, 4),
        ("slide", 9, 8), ("slide", 10, 9), ("slide", 6, 10),
        ("slide", 2, 6), ("walk", FINISH)))
    return tuple(result)


LEVELS = hazard_campaign(LEVELS)
LEVEL_BY_ID = {level.id: level for level in LEVELS}

WITNESSES = {level.id: witness_cache(level) for level in LEVELS}


def known_plan(level, board, hero, paths):
    for expected_hero, actions in reversed(WITNESSES[level.id].get(board_key(board), [])):
        # First try the witnessed actions directly, preserving an explorer who
        # has already advanced. A detour to the expected position is optional.
        candidates = [actions]
        if expected_hero != hero and expected_hero in paths:
            candidates.append((("walk", expected_hero),) + actions)
        for candidate in candidates:
            try:
                _, end = apply_plan(board, hero, candidate)
                if end == FINISH:
                    return candidate
            except GameError:
                continue
    return None


def path_deficit(board, paths):
    """Relaxed distance used for search order only, never legality."""
    frontier = [(0, at) for at in paths if 0 <= at < FINISH]
    if not frontier:
        frontier = [(0 if board[0] and "W" in board[0].ports else 1, 0)]
    heapq.heapify(frontier)
    seen = set()
    while frontier:
        cost, at = heapq.heappop(frontier)
        if at in seen:
            continue
        seen.add(at)
        tile = board[at]
        if at == 15:
            return cost + (0 if tile and "E" in tile.ports else 1)
        for side, dest in neighbors(at):
            other = board[dest]
            edge = int(not tile or side not in tile.ports) + int(not other or OPPOSITE[side] not in other.ports)
            edge += int(bool(other and other.hazard == "crocodile"))
            edge += int(bool(tile and tile.hazard == "current" and tile.flow != side))
            if dest not in seen:
                heapq.heappush(frontier, (cost + edge, dest))
    return 20


def solve_plan(game, max_states=12000, time_limit=1.4):
    """Bounded search over real slides and walks, including collapse side effects.

    None honestly means the search budget was exhausted. Each plan returned
    has valid explicit destinations even when a tile borders several holes.
    """
    if game.hero == FINISH:
        return ()
    started = time.monotonic()
    sequence = itertools.count()
    board, hero = game.tiles, game.hero
    frontier = [(0, next(sequence), 0, board, hero, ())]
    visited = {search_key(board, hero): 0}
    expanded = 0
    while frontier and expanded < max_states and time.monotonic() - started < time_limit:
        _, _, cost, board, hero, actions = heapq.heappop(frontier)
        if cost != visited.get(search_key(board, hero)):
            continue
        expanded += 1
        paths = paths_from(board, hero)
        if FINISH in paths:
            return actions + (("walk", FINISH),)
        known = known_plan(game.level, board, hero, paths)
        if known is not None:
            return actions + known
        transitions = []
        for source, target in slide_options(board, hero):
            # Keep the old two-item shape where there is a single possible hole.
            count = sum(1 for s, _ in slide_options(board, hero) if s == source)
            action = ("slide", source, target) if count > 1 else ("slide", source)
            transitions.append((swapped(board, source, target), hero, action, 1.0))
        for destination in paths:
            if destination == hero or destination == FINISH:
                continue
            next_board, _, _ = walk_result(board, hero, destination, paths)
            transitions.append((next_board, destination, ("walk", destination), .35))
        for next_board, next_hero, action, weight in transitions:
            key = search_key(next_board, next_hero)
            next_cost = cost + weight
            if next_cost >= visited.get(key, float("inf")):
                continue
            visited[key] = next_cost
            next_paths = paths_from(next_board, next_hero)
            estimate = next_cost + 2.5 * path_deficit(next_board, next_paths)
            heapq.heappush(frontier, (estimate, next(sequence), next_cost,
                                     next_board, next_hero, actions + (action,)))
    return None


def find_hint(game):
    plan = solve_plan(game)
    if not plan:
        return None
    kind, index, *extra = plan[0]
    result = {"type": kind, "index": index}
    if kind == "slide":
        target = extra[0] if extra else next(to for source, to in slide_options(game.tiles, game.hero) if source == index)
        result["to"] = target
        label = f"Glissez la pierre ligne {index // SIZE + 1}, colonne {index % SIZE + 1}, vers le vide ligne {target // SIZE + 1}, colonne {target % SIZE + 1}."
    elif index == FINISH:
        label = "Le chemin rejoint la sortie. Faites traverser Lumen !"
    elif index == OUTSIDE:
        label = "Ramenez Lumen à l’entrée pour libérer cette pierre."
    else:
        route = paths_from(game.tiles, game.hero)[index]
        crossing = any(game.tiles[i] and game.tiles[i].hazard == "fragile" for i in route if 0 <= i < FINISH)
        label = ("Traversez les dalles fissurées sans arrêt jusqu’à la pierre stable " if crossing else "Amenez Lumen ")
        label += f"ligne {index // SIZE + 1}, colonne {index % SIZE + 1}, pour libérer la suite."
    result["text"] = label
    return result
