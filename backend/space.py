"""Taquin orbital : un volume de 27 emplacements et six directions de passage."""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass, replace
import heapq
import itertools
import time
import uuid

try:
    from .engine import Game, GameError, Level, Tile, LEVELS as LAND_LEVELS
except ImportError:
    from engine import Game, GameError, Level, Tile, LEVELS as LAND_LEVELS

SIDE = 3
CELL_COUNT = SIDE ** 3
OUTSIDE, FINISH = -1, CELL_COUNT
DIRECTIONS = {
    "N": (0, 0, -1), "E": (1, 0, 0), "S": (0, 0, 1),
    "W": (-1, 0, 0), "U": (0, 1, 0), "D": (0, -1, 0),
}
OPPOSITE = {"N": "S", "S": "N", "E": "W", "W": "E", "U": "D", "D": "U"}


def cube_coordinates(index: int) -> tuple[int, int, int]:
    if type(index) is not int or not 0 <= index < CELL_COUNT:
        raise GameError("Choisissez un cube valide.")
    return index % SIDE, index // (SIDE * SIDE), index // SIDE % SIDE


def cube_index(horizontal: int, height: int, depth: int) -> int:
    return horizontal + SIDE * depth + SIDE * SIDE * height


def cube_neighbors(index: int):
    horizontal, height, depth = cube_coordinates(index)
    for direction, (along, above, behind) in DIRECTIONS.items():
        coordinates = horizontal + along, height + above, depth + behind
        if all(0 <= value < SIDE for value in coordinates):
            yield direction, cube_index(*coordinates)


def volume_paths(tiles: tuple[Tile | None, ...], hero: int) -> dict[int, list[int]]:
    paths = {hero: [hero]}
    queue = deque([hero])
    while queue:
        position = queue.popleft()
        destinations = []
        if position == OUTSIDE:
            if tiles[0] and "W" in tiles[0].ports:
                destinations.append(0)
        elif position != FINISH and tiles[position]:
            tile = tiles[position]
            if position == 0 and "W" in tile.ports:
                destinations.append(OUTSIDE)
            if position == CELL_COUNT - 1 and "E" in tile.ports:
                destinations.append(FINISH)
            for direction, destination in cube_neighbors(position):
                other = tiles[destination]
                if direction in tile.ports and other and OPPOSITE[direction] in other.ports:
                    destinations.append(destination)
        for destination in destinations:
            if destination not in paths:
                paths[destination] = paths[position] + [destination]
                queue.append(destination)
    return paths


def cube_slide_options(tiles: tuple[Tile | None, ...], hero: int) -> list[tuple[int, int]]:
    return sorted((source, target) for target, tile in enumerate(tiles) if tile is None
                  for _, source in cube_neighbors(target) if tiles[source] and source != hero)


def shifted(tiles: tuple[Tile | None, ...], source: int, target: int) -> tuple[Tile | None, ...]:
    result = list(tiles)
    result[source], result[target] = result[target], result[source]
    return tuple(result)


@dataclass(frozen=True)
class SpaceLevel(Level):
    solved: tuple[Tile | None, ...] = ()

    def mechanic(self):
        return {"key": "space", "title": "Les chemins du vide",
                "text": "26 cubes, un vide et trois axes. Reliez les tunnels jusqu'au sas de sortie. "
                        "Les cubes glissent sans tourner ; celui qui porte Lumen reste immobile."}

    def public(self):
        return {**super().public(), "size": SIDE, "depth": SIDE, "boardKind": "volume"}


def orbital_level(level_id, name, subtitle, route, shuffle, relic, anchor, relic_name, order):
    shapes = ("EW", "NS", "UD", "NU", "SD", "EU", "WD")
    ports = [set(shapes[(index * 5 + order) % len(shapes)]) for index in range(CELL_COUNT)]
    for step, position in enumerate(route):
        before = "W" if step == 0 else next(side for side, cell in cube_neighbors(position) if cell == route[step - 1])
        after = "E" if step == len(route) - 1 else next(side for side, cell in cube_neighbors(position) if cell == route[step + 1])
        ports[position] = {before, after}
    branch = next(side for side, cell in cube_neighbors(anchor) if cell == relic)
    ports[anchor].add(branch)
    ports[relic] = {OPPOSITE[branch]}
    empty = 8
    tiles = tuple(None if index == empty else Tile(f"{level_id}-{index}", tuple(sorted(sides)))
                  for index, sides in enumerate(ports))
    solved = tiles
    inverse = []
    for source in shuffle:
        if (source, empty) not in cube_slide_options(tiles, OUTSIDE):
            raise ValueError(f"Melange orbital invalide : {level_id}, {source} -> {empty}")
        inverse.append(("slide", empty, source))
        tiles = shifted(tiles, source, empty)
        empty = source
    return SpaceLevel(level_id, name, subtitle, "Exploration" if order == 1 else "Aventure" if order < 4 else "Expert",
                      len(shuffle), tiles, tuple(reversed(inverse)) + (("walk", FINISH),),
                      biome="space", biomeLevel=order, chapter=len(LAND_LEVELS) + order,
                      relic=relic, relicName=relic_name, rule="space", stepPar=len(route) + 1, solved=solved)


SPACE_LEVELS = (
    orbital_level("orbite", "Le sas orbital", "Un premier passage au coeur du cube.",
                  (0, 1, 10, 13, 22, 23, 26), (5, 14, 13), 4, 1, "l'Eclat du vide", 1),
    orbital_level("transit", "La station en transit", "Les etages derivent, les tunnels se repondent.",
                  (0, 3, 12, 13, 14, 23, 26), (5, 4, 13, 22, 21, 12), 11, 14, "la Cle d'orbite", 2),
    orbital_level("parallaxe", "Le puits des parallaxes", "Descendre pour remonter de l'autre cote.",
                  (0, 9, 10, 1, 4, 13, 22, 21, 24, 25, 26),
                  (17, 16, 7, 4, 13, 22, 23, 14, 5, 4, 1), 17, 26, "le Prisme des parallaxes", 3),
    orbital_level("astrolabe", "L'astrolabe brise", "Un escalier impossible entre trois horizons.",
                  (0, 1, 4, 13, 10, 19, 20, 23, 14, 17, 26),
                  (7, 16, 15, 12, 3, 4, 13, 22, 23, 14, 11, 10, 19, 20, 23, 26),
                  16, 13, "l'Anneau de l'astrolabe", 4),
    orbital_level("singularite", "Le coeur de la singularite", "Tous les axes convergent vers le dernier sas.",
                  (0, 3, 4, 13, 12, 9, 18, 19, 10, 11, 14, 23, 22, 25, 26),
                  (5, 4, 13, 16, 17, 26, 25, 22, 19, 10, 9, 12, 21, 24, 25, 16, 13, 14, 23, 22),
                  7, 4, "la Graine d'etoile", 5),
)
SPACE_LEVEL_BY_ID = {level.id: level for level in SPACE_LEVELS}


def layout_key(tiles):
    return tuple(tile.id if tile else None for tile in tiles)


def witness_plans(level):
    tiles = level.tiles
    plans = {}
    for offset, action in enumerate(level.solution):
        plans[layout_key(tiles)] = level.solution[offset:]
        if action[0] == "slide":
            tiles = shifted(tiles, action[1], action[2])
    return plans


SPACE_PLANS = {level.id: witness_plans(level) for level in SPACE_LEVELS}


def valid_plan(tiles, hero, plan, *, routes=volume_paths, slides=cube_slide_options, finish=FINISH):
    for action in plan:
        kind, index, *target = action
        if kind == "slide":
            if (index, target[0]) not in slides(tiles, hero):
                return False
            tiles = shifted(tiles, index, target[0])
        else:
            if index == hero or index not in routes(tiles, hero):
                return False
            hero = index
    return hero == finish


def space_plan(game, max_states=1500, time_limit=.45):
    sequence = itertools.count()
    frontier = [(0, next(sequence), 0, game.tiles, game.hero, ())]
    visited = {(layout_key(game.tiles), game.hero): 0}
    started = time.monotonic()
    expanded = 0
    while frontier and expanded < max_states and time.monotonic() - started < time_limit:
        _, _, cost, tiles, hero, actions = heapq.heappop(frontier)
        if cost != visited.get((layout_key(tiles), hero)):
            continue
        expanded += 1
        paths = game.routes(tiles, hero)
        if game.finish_index in paths:
            return actions + (("walk", game.finish_index),)
        witnessed = game.plans[game.level.id].get(layout_key(tiles))
        if witnessed:
            if valid_plan(tiles, hero, witnessed, routes=game.routes, slides=game.slides, finish=game.finish_index):
                return actions + witnessed
            if hero != OUTSIDE and OUTSIDE in paths and valid_plan(tiles, OUTSIDE, witnessed, routes=game.routes, slides=game.slides, finish=game.finish_index):
                return actions + (("walk", OUTSIDE),) + witnessed
        transitions = [(shifted(tiles, source, target), hero, ("slide", source, target))
                       for source, target in game.slides(tiles, hero)]
        transitions.extend((tiles, destination, ("walk", destination)) for destination in paths if destination != hero)
        for next_tiles, next_hero, action in transitions:
            key = (layout_key(next_tiles), next_hero)
            next_cost = cost + 1
            if next_cost >= visited.get(key, float("inf")):
                continue
            visited[key] = next_cost
            mismatch = sum(actual != expected for actual, expected in zip(next_tiles, game.level.solved))
            heapq.heappush(frontier, (next_cost + mismatch * .6, next(sequence), next_cost,
                                     next_tiles, next_hero, actions + (action,)))
    return None


class SpaceGame(Game):
    finish_index = FINISH
    plans = SPACE_PLANS

    def routes(self, tiles, hero):
        return volume_paths(tiles, hero)

    def slides(self, tiles, hero):
        return cube_slide_options(tiles, hero)

    def __init__(self, level_id="orbite"):
        if not isinstance(level_id, str) or level_id not in SPACE_LEVEL_BY_ID:
            raise GameError("Ce passage spatial n'existe pas.")
        self.id = uuid.uuid4().hex
        self.level = SPACE_LEVEL_BY_ID[level_id]
        self.history = []
        self._reset()

    def state(self):
        paths = volume_paths(self.tiles, self.hero)
        won = self.hero == FINISH
        options = [] if won else cube_slide_options(self.tiles, self.hero)
        return {
            "id": self.id, "levelId": self.level.id, "biome": "space", "boardKind": "volume",
            "size": SIDE, "depth": SIDE, "cellCount": CELL_COUNT, "finishIndex": FINISH,
            "mechanic": self.level.mechanic(),
            "tiles": [None if tile is None else {"id": tile.id, "ports": list(tile.ports),
                      "hazard": None, "flow": None, "heading": None, "engraved": False} for tile in self.tiles],
            "hero": self.hero, "entry": {"index": 0, "side": "W"},
            "exit": {"index": CELL_COUNT - 1, "side": "E"},
            "moves": self.moves, "steps": self.steps, "won": won, "lost": False, "caughtBy": None,
            "reachable": sorted(index for index in paths if 0 <= index < CELL_COUNT),
            "walkRoutes": {str(index): route for index, route in paths.items() if index != self.hero},
            "walkImpact": {}, "emptyCells": [index for index, tile in enumerate(self.tiles) if tile is None],
            "slideOptions": [{"index": source, "to": target} for source, target in options],
            "slidable": sorted({source for source, _ in options}),
            "canEnter": self.hero == OUTSIDE and len(paths) > 1, "canExit": not won and FINISH in paths,
            "guardians": [], "levers": [], "seals": [], "gatesOpen": True, "tide": "haute", "canTide": False,
            "relic": {"index": self.level.relic, "name": self.level.relicName, "taken": self.relic},
            "descent": None, "historyLength": len(self.history), "hint": self.hint,
            "message": self.message, "collapsed": [], "weakened": [],
            **({"walkPath": self.walk_path} if self.walk_path else {}),
        }

    def act(self, action, index=None, to=None):
        if not isinstance(action, str) or action not in {"slide", "walk", "hint", "undo", "reset"}:
            raise GameError("Action inconnue pour ce plateau spatial.")
        if to is not None and (action != "slide" or type(to) is not int or not 0 <= to < CELL_COUNT):
            raise GameError("Choisissez un vide valide dans le volume.")
        if action in {"undo", "reset"}:
            return super().act(action, index)
        if self.hero == self.finish_index:
            raise GameError("Lumen a rejoint le sas de sortie.")
        if action == "slide":
            self._slide(index, to)
        elif action == "walk":
            self._walk(index)
        else:
            plan = space_plan(self)
            self.walk_path = None
            if plan:
                kind, target, *destination = plan[0]
                self.hint = {"type": kind, "index": target}
                if destination:
                    self.hint["to"] = destination[0]
                if kind == "slide":
                    horizontal, height, depth = cube_coordinates(target)
                    self.message = f"Glissez le cube etage {height + 1}, rangee {depth + 1}, colonne {horizontal + 1} vers le vide."
                else:
                    self.message = "Rejoignez le sas de sortie." if target == self.finish_index else "Avancez pour liberer le prochain cube."
            elif self.history:
                self.hint = {"type": "undo", "index": None}
                self.message = "Revenez d'un coup pour retrouver une configuration connue."
            else:
                self.hint = None
                self.message = "La recherche est bornee. Essayez un autre alignement."
            if self.hint:
                self.hint["text"] = self.message
        return self.state()

    def _slide(self, index, target=None):
        cube_coordinates(index)
        options = self.slides(self.tiles, self.hero)
        if target is None:
            target = next((empty for source, empty in options if source == index), None)
        if (index, target) not in options:
            raise GameError("Seul un cube voisin du vide peut glisser, sans emporter Lumen.")
        self._save()
        self.tiles = shifted(self.tiles, index, target)
        self.moves += 1
        self.hint = self.walk_path = None
        self.message = "Le cube glisse. Les tunnels changent d'alignement."

    def _walk(self, index):
        paths = volume_paths(self.tiles, self.hero)
        if index is None:
            options = [position for position, route in paths.items() if position not in {self.hero, OUTSIDE}
                       and len(route) > 1 and route[1] != self.previous_hero]
            if not options:
                raise GameError("Aucun tunnel relie dans cette direction.")
            index = min(options, key=lambda position: (len(paths[position]), -position))
        if type(index) is not int or not OUTSIDE <= index <= FINISH or index == self.hero or index not in paths:
            raise GameError("Les ouvertures des cubes doivent se faire face sur tout le trajet.")
        route = paths[index]
        self._save(route)
        had_relic = self.relic
        self.previous_hero = route[-2]
        self.hero = index
        self.steps += len(route) - 1
        self.walk_path = route
        self.relic = self.relic or self.level.relic in route
        self.hint = None
        self.message = ("Le sas s'ouvre. Le passage spatial est accompli !" if index == FINISH else
                        f"Vous emportez {self.level.relicName} !" if self.relic and not had_relic else
                        "Lumen traverse les tunnels en apesanteur.")