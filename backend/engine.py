"""Sliding-path rules and a bounded, state-aware hint search.

The hero is never carried by a sliding tile. Safe directed routes respect
patrolling predators, tide-driven currents, sealed gates and fragile stones
that collapse after departure, cracking their neighbours as they fall.
"""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field, replace
import heapq
import itertools
import time
import uuid

SIZE = 4
OUTSIDE, FINISH = -1, SIZE * SIZE
DIRECTIONS = {"N": (-1, 0), "E": (0, 1), "S": (1, 0), "W": (0, -1)}
OPPOSITE = {"N": "S", "S": "N", "E": "W", "W": "E"}
HIGH, LOW = "haute", "basse"


class GameError(ValueError):
    """A rejected user action, with a safe French UI message."""


@dataclass(frozen=True)
class Tile:
    """A stone. ``hazard`` names the single rule painted on it, if any.

    ``engraved`` marks the one stone of a passage that hides a staircase. The
    mark belongs to the stone and slides with it: finding it is half the secret,
    bringing it within reach is the other half.
    """
    id: str
    ports: tuple[str, ...]
    hazard: str | None = None
    flow: str | None = None
    engraved: bool = False


MECHANICS = {
    "ice": ("Gardez votre élan", "Sur la glace bleue, Lumen continue tout droit : impossible de tourner ou de s’arrêter. Placez une dalle stable pour prendre un virage et préparez tout le trajet avant de partir."),
    "ice_gate": ("Les refuges scellés", "Glissez tout droit sur la glace et arrêtez-vous sur chacun des leviers pour ouvrir la porte. Un carrefour gelé ne permet pas de tourner : préparez vos appuis."),
    "ice_chain": ("La traversée des séracs", "La glace impose la ligne droite ; les ponts fissurés tombent derrière vous. Utilisez leurs vides pour déplacer le lest sur son sceau, puis rejoignez le levier."),
    "ice_master": ("Le serment de Boréale", "Deux leviers et une pierre de lest gardent la sortie. Préparez vos lignes de glisse, traversez le pont fragile, puis utilisez le vide libéré pour activer le sceau."),
    "fragile": ("Traversée éclair", "Rejoignez une pierre stable en une seule marche : les dalles fissurées s’effondrent derrière vous. Utilisez ces nouveaux vides pour déplacer les autres pierres."),
    "current": ("Courants à sens unique", "Sur une dalle à courant, Lumen peut seulement repartir dans le sens de la flèche. Placez ces pierres pour former un trajet dans le bon sens."),
    "crocodile": ("Gardiens de la jungle", "Les crocodiles bloquent le passage. Déplacez leurs dalles pour dégager votre route : ils restent sur leur pierre."),
    "patrol": ("Gardiens en maraude", "Le crocodile change de pierre à chaque dalle que vous déplacez. Sa prochaine case est annoncée : comptez vos déplacements pour passer dans son dos."),
    "gate": ("Sceaux et portes", "Une porte de pierre barre le passage tant que son sceau reste éteint. Posez la pierre de lest sur le sceau, ou faites toucher le levier à Lumen, pour ouvrir la voie ailleurs sur le plateau."),
    "tide": ("La marée", "Le levier de marée inverse tous les courants et découvre les dalles immergées. Choisissez l’état du plateau qui ouvre la suite de votre route."),
    "chain": ("Réactions en chaîne", "Quand une dalle fissurée s’effondre, elle lézarde ses voisines : elles deviennent fragiles à leur tour. Choisissez quels passages sacrifier pour libérer de l’espace."),
    "relais": ("Un chemin à réutiliser", "Avancez avant de tout relier. Les pierres laissées derrière Lumen peuvent servir à construire la suite du passage."),
    "default": ("Suivez la lumière", "Glissez les pierres vers le vide et reliez les chemins. Une pierre occupée par Lumen ne peut pas bouger."),
}


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
    # Board-level features: guardians walk cells, seals and levers open gates,
    # the tide flips every current, and one relic rewards a detour.
    patrols: tuple[tuple[int, ...], ...] = ()
    levers: tuple[int, ...] = ()
    seals: tuple[int, ...] = ()
    tide: bool = False
    relic: int | None = None
    relicName: str = ""
    rule: str = ""
    stepPar: int = 0
    # Secret passages: a host names the level under its engraved stone; that
    # level names its host back, and the companion it rewards.
    secret: str = ""
    host: str = ""
    reward: str = ""

    def mechanic(self):
        hazards = {tile.hazard for tile in self.tiles if tile and tile.hazard}
        key = self.rule or next((name for name, present in (
            ("patrol", bool(self.patrols)), ("gate", "gate" in hazards),
            ("tide", self.tide), ("chain", "brittle" in hazards),
            ("fragile", "fragile" in hazards), ("current", "current" in hazards),
            ("crocodile", "crocodile" in hazards),
            ("ice", "ice" in hazards),
            ("relais", self.id == "relais")) if present), "default")
        title, text = MECHANICS[key]
        return {"key": key, "title": title, "text": text}

    def public(self):
        result = {key: getattr(self, key) for key in
                ("id", "name", "subtitle", "difficulty", "par", "stepPar", "biome",
                 "biomeLevel", "chapter", "relicName")}
        result["mechanic"] = self.mechanic()
        result["relic"] = self.relic
        # Whether a passage hides something is public; where it hides it is not.
        result["secret"] = bool(self.secret)
        result["host"] = self.host
        result["reward"] = self.reward
        return result


@dataclass(frozen=True)
class Board:
    """The stones plus every live board value the movement rules read."""
    tiles: tuple[Tile | None, ...]
    level: Level = field(default=None, repr=False)
    guards: tuple[int, ...] = ()
    tide: str = HIGH
    pulled: tuple[int, ...] = ()

    @property
    def guard_cells(self):
        """Guardians patrol cells, so a stone sliding away never carries one."""
        return tuple(route[step % len(route)]
                     for route, step in zip(self.level.patrols, self.guards))

    @property
    def gates_open(self):
        return (all(cell in self.pulled for cell in self.level.levers)
                and all(self.pressed(cell) for cell in self.level.seals))

    def pressed(self, cell):
        tile = self.tiles[cell]
        return tile is not None and tile.hazard == "weight"

    def departure(self, tile):
        """The one side a current allows, mirrored while the tide is low."""
        return OPPOSITE[tile.flow] if self.tide == LOW and tile.flow else tile.flow

    def blocked(self, index):
        """Cells the explorer may not step onto."""
        tile = self.tiles[index]
        if tile is None or index in self.guard_cells:
            return True
        if tile.hazard == "crocodile":
            return True
        if tile.hazard == "gate" and not self.gates_open:
            return True
        return tile.hazard == "submerged" and self.tide == HIGH


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


def connected_neighbors(board, position, heading=None):
    """Directed edges: guardians and closed gates block entry, currents constrain departure."""
    tiles = board.tiles
    if position == OUTSIDE:
        if not board.blocked(0) and "W" in tiles[0].ports:
            yield 0
        return
    if position == FINISH:
        return
    tile = tiles[position]
    if tile is None:
        return
    # Departure is never blocked: a gate closing behind Lumen must not strand him.
    allowed = (board.departure(tile),) if tile.hazard == "current" else tile.ports
    if tile.hazard == "ice":
        allowed = (heading,) if heading else ()
    if position == 0 and "W" in tile.ports and "W" in allowed:
        yield OUTSIDE
    if position == 15 and "E" in tile.ports and "E" in allowed:
        yield FINISH
    for side, destination in neighbors(position):
        other = tiles[destination]
        if (side in tile.ports and side in allowed and other
                and not board.blocked(destination) and OPPOSITE[side] in other.ports):
            yield destination


def paths_from(board, hero):
    """Stable destinations; ice retains the incoming heading at intersections.

    Separate visits to the same ice tile from different sides must remain
    distinct. Routes never reuse a tile that would already have collapsed.
    """
    paths = {hero: [hero]}
    queue = deque([(hero, None, [hero])])
    seen = {(hero, None)}
    while queue:
        at, heading, path = queue.popleft()
        for destination in connected_neighbors(board, at, heading):
            if destination in path:
                continue
            icy = 0 <= destination < FINISH and board.tiles[destination].hazard == "ice"
            incoming = ({1: "E", -1: "W", SIZE: "S", -SIZE: "N"}[destination - at]
                        if icy else None)
            key = (destination, incoming)
            if key in seen:
                continue
            seen.add(key)
            route = path + [destination]
            if (destination in {OUTSIDE, FINISH}
                    or board.tiles[destination].hazard not in {"fragile", "ice"}):
                paths.setdefault(destination, route)
            queue.append((destination, incoming, route))
    return paths


def walk_impact(board, path):
    """Stones lost and stones cracked by one crossing, before it is played."""
    collapsed, weakened = [], []
    for step, index in enumerate(path[:-1]):
        tile = board.tiles[index] if 0 <= index < FINISH else None
        if tile and tile.hazard == "fragile":
            collapsed.append({"index": index, "tileId": tile.id, "pathStep": step})
            for _, side in neighbors(index):
                neighbour = board.tiles[side]
                if neighbour and neighbour.hazard == "brittle" and side not in weakened:
                    weakened.append(side)
    return collapsed, sorted(index for index in weakened
                             if index not in {event["index"] for event in collapsed})


def walk_result(board, hero, destination, paths=None):
    """Play one crossing: stones fall, their brittle neighbours crack, levers latch."""
    paths = paths if paths is not None else paths_from(board, hero)
    if destination not in paths or destination == hero:
        raise GameError("Le chemin vers cette case n’est pas encore relié dans le bon sens.")
    path = paths[destination]
    collapsed, weakened = walk_impact(board, path)
    tiles = list(board.tiles)
    for index in weakened:
        tiles[index] = replace(tiles[index], hazard="fragile")
    for event in collapsed:
        tiles[event["index"]] = None
    pulled = board.pulled
    if destination in board.level.levers and destination not in pulled:
        pulled = tuple(sorted(pulled + (destination,)))
    report = {"collapsed": collapsed, "weakened": weakened,
              "relic": board.level.relic is not None and board.level.relic in path}
    return replace(board, tiles=tuple(tiles), pulled=pulled), path, report


def slide_options(board, hero):
    """Stones pinned by Lumen or by a guardian's weight stay put."""
    pinned = {hero, *board.guard_cells}
    return sorted((source, target) for target, tile in enumerate(board.tiles) if tile is None
                  for _, source in neighbors(target)
                  if board.tiles[source] and source not in pinned)


def board_key(board):
    # Shape-equivalent tiles are interchangeable only when their hazards and
    # current directions also match. Stable IDs are retained in actual boards.
    return (tuple(None if tile is None else
                  ("".join(sorted(tile.ports)), tile.hazard, tile.flow) for tile in board.tiles),
            board.guards, board.tide, board.pulled)


def search_key(board, hero):
    # Directed currents and irreversible collapses invalidate component merging.
    return board_key(board), hero


def advanced_guards(board, hero):
    """One patrol step per stone move; a guardian waits at a gap or a busy cell."""
    steps = list(board.guards)
    cells = list(board.guard_cells)
    for i, route in enumerate(board.level.patrols):
        target = route[(steps[i] + 1) % len(route)]
        if board.tiles[target] is None or target == hero or target in cells[:i] + cells[i + 1:]:
            continue
        # Wrap the counter so two identical rounds share one search state.
        steps[i] = (steps[i] + 1) % len(route)
        cells[i] = target
    return tuple(steps)


def guard_preview(board, hero):
    """Where each guardian stands now, and the cell it will reach on the next slide."""
    after = advanced_guards(board, hero)
    return [{"index": cell, "next": route[step % len(route)], "route": list(route)}
            for cell, route, step in zip(board.guard_cells, board.level.patrols, after)]


def swapped(board, source, target=None, hero=OUTSIDE):
    if target is None:
        target = min((i for _, i in neighbors(source) if board.tiles[i] is None), default=None)
    if target is None or (source, target) not in slide_options(board, hero):
        raise GameError("Seule une pierre voisine du vide choisi peut glisser.")
    tiles = list(board.tiles)
    tiles[target], tiles[source] = tiles[source], None
    moved = replace(board, tiles=tuple(tiles))
    return replace(moved, guards=advanced_guards(moved, hero))


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
        self.guards = tuple(0 for _ in self.level.patrols)
        self.tide = HIGH
        self.pulled = ()
        self.relic = False
        self.revealed = False
        self.hero = OUTSIDE
        self.previous_hero = None
        self.moves = self.steps = 0
        self.hint = None
        self.walk_path = None
        self.collapsed = []
        self.weakened = []
        self.message = self.level.subtitle

    @property
    def board(self):
        return Board(self.tiles, self.level, self.guards, self.tide, self.pulled)

    def _adopt(self, board):
        self.tiles = board.tiles
        self.guards = board.guards
        self.tide = board.tide
        self.pulled = board.pulled

    def _save(self, walk_path=None):
        route = tuple(walk_path) if walk_path else None
        self.history.append((self.tiles, self.hero, self.previous_hero, self.moves,
                             self.steps, route, self.guards, self.tide, self.pulled, self.relic,
                             self.revealed))

    def state(self):
        board = self.board
        paths = paths_from(board, self.hero)
        won = self.hero == FINISH
        options = [] if won else slide_options(board, self.hero)
        level = self.level
        impact = {}
        if any(tile and tile.hazard in {"fragile", "brittle"} for tile in self.tiles):
            for index, path in paths.items():
                collapsed, weakened = walk_impact(board, path)
                if collapsed or weakened:
                    impact[str(index)] = {"collapse": [event["index"] for event in collapsed],
                                          "weaken": weakened}
        return {
            "id": self.id, "levelId": level.id, "biome": level.biome,
            "size": SIZE, "mechanic": level.mechanic(),
            "tiles": [None if t is None else {"id": t.id, "ports": list(t.ports),
                       "hazard": t.hazard, "flow": t.flow, "engraved": t.engraved,
                       "heading": board.departure(t) if t.hazard == "current" else None}
                      for t in self.tiles],
            "hero": self.hero, "entry": {"index": 0, "side": "W"},
            "exit": {"index": 15, "side": "E"}, "moves": self.moves,
            "steps": self.steps, "won": won,
            "reachable": sorted(i for i in paths if 0 <= i < FINISH),
            "walkRoutes": {str(i): path for i, path in paths.items() if i != self.hero},
            "walkImpact": impact,
            "emptyCells": [i for i, tile in enumerate(self.tiles) if tile is None],
            "slideOptions": [{"index": source, "to": target} for source, target in options],
            "slidable": sorted({source for source, _ in options}),
            "canEnter": self.hero == OUTSIDE and any(i >= 0 for i in paths),
            "canExit": not won and FINISH in paths,
            "guardians": guard_preview(board, self.hero),
            "levers": [{"index": cell, "pulled": cell in self.pulled} for cell in level.levers],
            "seals": [{"index": cell, "pressed": board.pressed(cell)} for cell in level.seals],
            "gatesOpen": board.gates_open,
            "tide": self.tide, "canTide": bool(level.tide) and not won,
            "relic": None if level.relic is None else
                     {"index": level.relic, "name": level.relicName, "taken": self.relic},
            "descent": None if not level.secret else {
                "level": level.secret, "revealed": self.revealed,
                "here": 0 <= self.hero < FINISH and bool(self.tiles[self.hero])
                        and self.tiles[self.hero].engraved},
            "historyLength": len(self.history), "hint": self.hint,
            "message": self.message, "collapsed": self.collapsed, "weakened": self.weakened,
            **({"walkPath": self.walk_path} if self.walk_path else {}),
        }

    def act(self, action, index=None, to=None):
        if not isinstance(action, str) or action not in {"slide", "walk", "tide", "undo", "reset", "hint"}:
            raise GameError("Action inconnue.")
        if to is not None and (action != "slide" or not valid_index(to)):
            raise GameError("Choisissez un vide valide pour ce déplacement.")
        if action == "slide":
            self._slide(index, to)
        elif action == "walk":
            self._walk(index)
        elif action == "tide":
            self._tide()
        elif action == "undo":
            if not self.history:
                raise GameError("Aucune action à annuler.")
            (self.tiles, self.hero, self.previous_hero, self.moves, self.steps,
             route, self.guards, self.tide, self.pulled, self.relic,
             self.revealed) = self.history.pop()
            self.walk_path = list(reversed(route)) if route else None
            self.collapsed = []
            self.weakened = []
            self.hint = None
            self.message = "Un pas en arrière. Les pierres retrouvent leur place."
        elif action == "reset":
            self.history.clear()
            self._reset()
        else:
            self.walk_path = None
            self.collapsed = []
            self.weakened = []
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
        board = self.board
        if index in board.guard_cells:
            raise GameError("Un crocodile pèse sur cette pierre. Attendez qu’il change de case.")
        options = [to for source, to in slide_options(board, self.hero) if source == index]
        if target is None and options:
            target = options[0]
        if target not in options:
            raise GameError("Seule une pierre voisine du vide choisi peut glisser.")
        self._save()
        self._adopt(swapped(board, index, target, self.hero))
        self.moves += 1
        self.hint = self.walk_path = None
        self.collapsed = []
        self.weakened = []
        holes = sum(1 for tile in self.tiles if tile is None)
        self.message = ("Le crocodile avance d’une pierre." if self.level.patrols else
                        "Un nouveau passage s’ouvre." if holes > 1 else "Le chemin se transforme.")

    def _tide(self):
        if not self.level.tide:
            raise GameError("Aucun levier de marée sur ce plateau.")
        if self.hero == FINISH:
            raise GameError("Le passage est déjà accompli.")
        self._save()
        self.tide = LOW if self.tide == HIGH else HIGH
        self.moves += 1
        self.hint = self.walk_path = None
        self.collapsed = []
        self.weakened = []
        self.message = ("La marée descend : les courants s’inversent et les dalles immergées émergent."
                        if self.tide == LOW else
                        "La marée remonte et rend aux courants leur sens premier.")

    def _walk(self, index):
        if self.hero == FINISH:
            raise GameError("Lumen est arrivé à destination.")
        board = self.board
        paths = paths_from(board, self.hero)
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
            hazard = self.tiles[index].hazard
            if index in board.guard_cells or hazard == "crocodile":
                raise GameError("Un crocodile garde cette pierre. Attendez qu’il s’écarte, ou contournez sa dalle.")
            if hazard == "gate" and not board.gates_open:
                raise GameError("Cette porte est close. Activez son sceau pour l’ouvrir.")
            if hazard == "submerged" and self.tide == HIGH:
                raise GameError("Cette dalle dort sous l’eau. Faites descendre la marée pour la découvrir.")
            if hazard == "fragile":
                raise GameError("Cette dalle va s’effondrer : choisissez une pierre stable au-delà pour la traverser sans arrêt.")
            if hazard == "ice":
                raise GameError("Impossible de s’arrêter sur la glace : choisissez une dalle stable dans le prolongement, sans virage.")
        next_board, path, report = walk_result(board, self.hero, index, paths)
        had_relic = self.relic
        self._save(path)
        self._adopt(next_board)
        self.previous_hero = path[-2]
        self.hero = index
        self.steps += len(path) - 1
        self.walk_path = path
        self.collapsed = report["collapsed"]
        self.weakened = report["weakened"]
        self.relic = had_relic or report["relic"]
        # Standing on the engraved stone opens the way down, once and for good.
        opened = (0 <= index < FINISH and self.tiles[index].engraved
                  and bool(self.level.secret) and not self.revealed)
        self.revealed = self.revealed or opened
        self.hint = None
        self.message = (
            "Le passage est accompli !" if index == FINISH else
            "La pierre sonne creux. Un escalier s’ouvre sous vos pieds." if opened else
            f"Vous emportez {self.level.relicName} !" if report["relic"] and not had_relic else
            "Les dalles voisines se lézardent : elles tomberont à la prochaine course." if report["weakened"] else
            "Les dalles s’effondrent derrière Lumen. Utilisez les nouveaux vides !" if report["collapsed"] else
            "Le sceau s’illumine : une porte vient de s’ouvrir." if next_board.pulled != board.pulled else
            "Lumen suit la lumière.")


def apply_plan(board, hero, actions):
    """Validate every actual transition; never treat directed walks as reversible."""
    for action in actions:
        kind, index, *extra = action
        if kind == "slide":
            target = extra[0] if extra else None
            if index == hero:
                raise GameError("Pierre occupée.")
            board = swapped(board, index, target, hero)
        elif kind == "walk":
            board, _, _ = walk_result(board, hero, index)
            hero = index
        elif kind == "tide":
            if not board.level.tide:
                raise GameError("Aucun levier de marée sur ce plateau.")
            board = replace(board, tide=LOW if board.tide == HIGH else HIGH)
        else:
            raise GameError("Action inconnue.")
    return board, hero


def start_board(level):
    return Board(level.tiles, level, tuple(0 for _ in level.patrols))


def demonstrated_steps(level):
    """How many steps the authored solution walks: the reference a run is scored against."""
    board, hero, steps = start_board(level), OUTSIDE, 0
    for action in level.solution:
        if action[0] == "walk":
            board, path, _ = walk_result(board, hero, action[1])
            hero = action[1]
            steps += len(path) - 1
        else:
            board, hero = apply_plan(board, hero, (action,))
    return steps


def witness_cache(level):
    board, hero = start_board(level), OUTSIDE
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
            board, hero = start_board(level), OUTSIDE
            route = []
            for action in level.solution:
                if action[0] == "walk":
                    route = paths_from(board, hero)[action[1]]
                    final_board = board.tiles
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


def trial(level_id, name, subtitle, difficulty, biome, ports, marks=(), solution=(), **extra):
    """A short authored puzzle: ``ports`` holds one string per cell, None for a gap."""
    tiles = tuple(None if value is None else
                  Tile(f"{level_id}-{index}", tuple(value), *dict(marks).get(index, (None, None)))
                  for index, value in enumerate(ports))
    par = sum(1 for action in solution if action[0] in {"slide", "tide"})
    return Level(level_id, name, subtitle, difficulty, par, tiles, solution, biome, **extra)


ROCK = ""
TRIALS = (
    trial("gardiens", "La ronde du gardien",
          "Le crocodile change de pierre à chaque dalle déplacée. Passez dans son dos.",
          "Découverte", "jungle",
          ["WE", "WE", "WE", "WS",
           ROCK, ROCK, ROCK, "NS",
           ROCK, ROCK, "NS", None,
           ROCK, ROCK, ROCK, "NE"],
          solution=(("slide", 10), ("slide", 14), ("walk", FINISH)),
          patrols=((1, 2, 6, 5),), rule="patrol"),
    trial("sentinelle", "La sentinelle",
          "Avancez d’abri en abri : le gardien tourne, et le couloir se libère derrière lui.",
          "Aventure", "jungle",
          ["WE", "WE", "WE", "WS",
           ROCK, "ES", "EW", "NW",
           ROCK, "NS", None, ROCK,
           ROCK, "NE", "WE", "WE"],
          solution=(("walk", 7), ("slide", 11, 10), ("walk", 6),
                    ("slide", 10, 11), ("walk", FINISH)),
          patrols=((6, 5, 1, 2),), rule="patrol"),
    trial("sceaux", "Le sceau du temple",
          "Une porte de pierre barre la route. Conduisez Lumen jusqu’au levier caché.",
          "Découverte", "jungle",
          ["WE", "WES", "WE", "WS",
           ROCK, None, ROCK, "NS",
           ROCK, "N", "NS", None,
           ROCK, ROCK, ROCK, "NE"],
          marks=((3, ("gate", None)),),
          solution=(("slide", 9, 5), ("slide", 10, 11), ("walk", 5), ("walk", FINISH)),
          levers=(5,), rule="gate"),
    trial("contrepoids", "Le contrepoids",
          "La porte ne cède qu’à un poids. Amenez la pierre de lest jusqu’au sceau.",
          "Défi", "jungle",
          ["WE", "WE", "WE", "WS",
           ROCK, ROCK, ROCK, "NS",
           None, ROCK, ROCK, "NS",
           ROCK, ROCK, ROCK, "NE"],
          marks=((7, ("gate", None)), (12, ("weight", None))),
          solution=(("slide", 12), ("slide", 13), ("slide", 9), ("slide", 5),
                    ("slide", 4), ("slide", 8), ("walk", FINISH)),
          seals=(4,), rule="gate"),
    trial("vigie", "La vigie",
          "Le lest doit atteindre le sceau, et le gardien quitter le couloir au même instant.",
          "Maîtrise", "jungle",
          ["WE", "WE", "WE", "WS",
           ROCK, ROCK, ROCK, "NS",
           ROCK, ROCK, ROCK, "NS",
           ROCK, None, "", "NE"],
          marks=((7, ("gate", None)), (14, ("weight", None))),
          solution=(("slide", 14), ("slide", 10), ("slide", 9), ("slide", 8),
                    ("slide", 12), ("slide", 13), ("slide", 9), ("slide", 13),
                    ("walk", FINISH)),
          seals=(12,), patrols=((6, 5, 1, 2),), rule="gate"),
    trial("reflux", "L’heure du reflux",
          "Un courant contraire ferme la descente. Attendez que la mer se retire.",
          "Découverte", "atlantis",
          ["WE", "WE", "WE", "WS",
           ROCK, ROCK, ROCK, "NS",
           ROCK, ROCK, "NS", None,
           ROCK, ROCK, ROCK, "NE"],
          marks=((1, ("current", "E")), (7, ("current", "N")), (10, ("submerged", None))),
          solution=(("slide", 10), ("walk", 7), ("tide", None), ("walk", FINISH)),
          tide=True, rule="tide"),
    trial("estran", "L’estran",
          "Trois courants, deux marées : chaque palier attend son niveau d’eau.",
          "Expert", "atlantis",
          ["WE", "WS", ROCK, "WS",
           ROCK, "NE", "WE", None,
           ROCK, ROCK, ROCK, "NS",
           ROCK, ROCK, ROCK, "NE"],
          marks=((1, ("current", "S")), (6, ("current", "W")), (11, ("current", "S"))),
          solution=(("slide", 3), ("walk", 6), ("tide", None), ("walk", 11),
                    ("tide", None), ("walk", FINISH)),
          tide=True, rule="tide"),
    trial("fissures", "Les premières fissures",
          "Une dalle qui tombe lézarde ses voisines. Repartez avant que le sol ne cède.",
          "Découverte", "volcano",
          ["WE", "WS", ROCK, ROCK,
           ROCK, "NS", ROCK, ROCK,
           "NS", "NE", ROCK, ROCK,
           ROCK, None, "WE", "WE"],
          marks=((0, ("brittle", None)), (1, ("fragile", None)), (5, ("brittle", None))),
          solution=(("slide", 9), ("walk", 5), ("slide", 8), ("walk", FINISH)),
          rule="chain"),
    trial("sacrifice", "Le passage sacrifié",
          "Le vide manque à l’appel. Choisissez le pont que vous acceptez de perdre.",
          "Légende", "volcano",
          ["WE", "WS", ROCK, None,
           ROCK, "NS", ROCK, ROCK,
           "NS", ROCK, ROCK, ROCK,
           ROCK, "NE", "WE", "WE"],
          marks=((0, ("brittle", None)), (1, ("fragile", None)), (5, ("brittle", None))),
          solution=(("walk", 5), ("slide", 2, 3), ("slide", 6, 2), ("slide", 10, 6),
                    ("slide", 9, 10), ("slide", 8, 9), ("walk", FINISH)),
          rule="chain"),
)

# One optional treasure per passage. Each pair is (relic cell, route cell it
# hangs from): the relic stone becomes a dead end, so reaching it always costs
# a detour and never shortens the road to the exit.
RELIC_SPURS = {
    "aube": (7, 11), "jardins": (10, 11), "brumes": (11, 10), "relais": (4, 5),
    "gardiens": (5, 1), "sentinelle": (11, 7), "sceaux": (6, 7),
    "contrepoids": (10, 11), "vigie": (6, 2),
    "lagon": (10, 6), "reflux": (6, 2), "estran": (4, 5),
    "cendres": (13, 14), "braises": (3, 7), "fissures": (10, 14),
    "sacrifice": (12, 13),
}
RELIC_NAMES = {
    "aube": "l’Œil de jade", "jardins": "la Fleur de pierre",
    "brumes": "l’Amulette de liane", "canopee": "la Couronne de fougères",
    "relais": "le Galet des voyageurs", "gardiens": "la Dent du gardien",
    "sentinelle": "le Sifflet d’écorce", "sceaux": "la Clé de mousse",
    "contrepoids": "le Contrepoids doré", "vigie": "l’Œuf de héron",
    "lagon": "la Perle du lagon", "marees": "la Conque des marées",
    "corail": "le Corail-lyre", "abysses": "la Tablette des abysses",
    "trident": "l’Éclat du trident", "reflux": "l’Étoile de reflux",
    "estran": "le Miroir d’estran", "cendres": "la Larme de cendre",
    "braises": "le Charbon-cœur", "obsidienne": "le Verre d’obsidienne",
    "forge": "le Marteau des anciens", "caldera": "la Braise éternelle",
    "fissures": "l’Écaille de lave", "sacrifice": "le Sceau de basalte",
}


def with_relics(level):
    """Open a one-stone spur off the route and hide the level's treasure there."""
    spur = RELIC_SPURS.get(level.id)
    if spur is None:
        return level
    cell, anchor = spur
    side = next(name for name, target in neighbors(anchor) if target == cell)
    tiles = list(level.tiles)
    tiles[anchor] = replace(tiles[anchor], ports=tuple(sorted({*tiles[anchor].ports, side})))
    tiles[cell] = replace(tiles[cell], ports=(OPPOSITE[side],))
    return replace(level, tiles=tuple(tiles), relic=cell, relicName=RELIC_NAMES[level.id])


def ordered_campaign(base, trials):
    """Each world keeps its five original passages, then its newer trials."""
    result = []
    for biome in ("jungle", "atlantis", "volcano", "boreal"):
        family = ([level for level in base if level.biome == biome]
                  + [level for level in trials if level.biome == biome])
        for position, level in enumerate(family, 1):
            ready = with_relics(replace(level, biomeLevel=position))
            result.append(replace(ready, stepPar=demonstrated_steps(ready)))
    return tuple(replace(level, chapter=index) for index, level in enumerate(result, 1))


try:
    from .boreal import build_boreal_levels
except ImportError:
    from boreal import build_boreal_levels

try:
    from .hidden import build_secret_levels
except ImportError:
    from hidden import build_secret_levels

# Secret passages hang under a host's engraved stone. Each entry is
# (branch cell, anchor stone, side the anchor opens, engraved stone). Stones move
# during a solution, so both are named by id: the anchor gains a port towards the
# branch, and the engraved stone — never on the exit route — fits that branch once
# brought there. Verified by test_secret_stones_are_reachable.
SECRET_SPURS = {
    "vigie": (4, "vigie-0", "S", "vigie-5"),
    "estran": (14, "estran-15", "W", "estran-8"),
    "braises": (4, "braises-5", "W", "braises-13"),
    "sacrifice": (10, "sacrifice-8", "E", "sacrifice-2"),
    "seracs": (11, "seracs-15", "N", "seracs-4"),
    "aurore": (14, "aurore-15", "W", "aurore-4"),
}


def with_secret(level, secrets):
    """Name the level's secret, open its branch, and engrave the stone that fits it."""
    spur = SECRET_SPURS.get(level.id)
    hidden = next((item for item in secrets if item.host == level.id), None)
    if spur is None or hidden is None:
        return level
    _, anchor, side, stone = spur
    # Like a relic stone, the engraved stone is a one-port dead end: Lumen can
    # stand on it, no route can ever reuse it, and puzzles built on a scarcity
    # of corridors — braises needs its collapse trick — keep their scarcity.
    tiles = tuple(replace(tile, ports=tuple(sorted({*tile.ports, side}))) if tile and tile.id == anchor
                  else replace(tile, ports=(OPPOSITE[side],), engraved=True) if tile and tile.id == stone else tile
                  for tile in level.tiles)
    return replace(level, tiles=tiles, secret=hidden.id)


SECRET_LEVELS = tuple(replace(level, stepPar=demonstrated_steps(level))
                      for level in build_secret_levels(trial, scramble, replace, FINISH))
LEVELS = tuple(with_secret(level, SECRET_LEVELS) for level in ordered_campaign(
    hazard_campaign(LEVELS), TRIALS + build_boreal_levels(trial, scramble, replace, FINISH)))
LEVEL_BY_ID = {level.id: level for level in LEVELS + SECRET_LEVELS}

WITNESSES = {level.id: witness_cache(level) for level in LEVELS + SECRET_LEVELS}


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
    tiles = board.tiles
    guards = set(board.guard_cells)
    frontier = [(0, at) for at in paths if 0 <= at < FINISH]
    if not frontier:
        frontier = [(0 if tiles[0] and "W" in tiles[0].ports else 1, 0)]
    heapq.heapify(frontier)
    seen = set()
    while frontier:
        cost, at = heapq.heappop(frontier)
        if at in seen:
            continue
        seen.add(at)
        tile = tiles[at]
        if at == 15:
            return cost + (0 if tile and "E" in tile.ports else 1)
        for side, dest in neighbors(at):
            other = tiles[dest]
            edge = int(not tile or side not in tile.ports) + int(not other or OPPOSITE[side] not in other.ports)
            edge += int(bool(other and other.hazard == "crocodile") or dest in guards)
            edge += int(bool(tile and tile.hazard == "current" and board.departure(tile) != side))
            edge += int(bool(other and other.hazard == "gate" and not board.gates_open))
            edge += int(bool(other and other.hazard == "submerged" and board.tide == HIGH))
            if dest not in seen:
                heapq.heappush(frontier, (cost + edge, dest))
    return 20


def solve_plan(game, max_states=12000, time_limit=1.4):
    """Bounded search over real slides, walks and tide levers, with side effects.

    None honestly means the search budget was exhausted. Each plan returned
    has valid explicit destinations even when a tile borders several holes.
    """
    if game.hero == FINISH:
        return ()
    started = time.monotonic()
    sequence = itertools.count()
    board, hero = game.board, game.hero
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
        options = slide_options(board, hero)
        for source, target in options:
            # Keep the old two-item shape where there is a single possible hole.
            count = sum(1 for other, _ in options if other == source)
            action = ("slide", source, target) if count > 1 else ("slide", source)
            transitions.append((swapped(board, source, target, hero), hero, action, 1.0))
        for destination in paths:
            if destination == hero or destination == FINISH:
                continue
            next_board, _, _ = walk_result(board, hero, destination, paths)
            transitions.append((next_board, destination, ("walk", destination), .35))
        if board.level.tide:
            flipped = replace(board, tide=LOW if board.tide == HIGH else HIGH)
            transitions.append((flipped, hero, ("tide", None), 1.0))
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
    if kind == "tide":
        result["index"] = None
        result["text"] = ("Faites descendre la marée pour inverser les courants."
                          if game.tide == HIGH else "Laissez la marée remonter.")
        return result
    if kind == "slide":
        target = extra[0] if extra else next(to for source, to in slide_options(game.board, game.hero) if source == index)
        result["to"] = target
        label = f"Glissez la pierre ligne {index // SIZE + 1}, colonne {index % SIZE + 1}, vers le vide ligne {target // SIZE + 1}, colonne {target % SIZE + 1}."
    elif index == FINISH:
        label = "Le chemin rejoint la sortie. Faites traverser Lumen !"
    elif index == OUTSIDE:
        label = "Ramenez Lumen à l’entrée pour libérer cette pierre."
    else:
        route = paths_from(game.board, game.hero)[index]
        crossing = any(game.tiles[i] and game.tiles[i].hazard == "fragile" for i in route if 0 <= i < FINISH)
        label = ("Traversez les dalles fissurées sans arrêt jusqu’à la pierre stable " if crossing else "Amenez Lumen ")
        label += f"ligne {index // SIZE + 1}, colonne {index % SIZE + 1}, pour libérer la suite."
    result["text"] = label
    return result
