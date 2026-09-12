"""Chemins lunaires sur l'enveloppe externe d'un taquin cubique."""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass
import uuid

try:
    from .engine import GameError, Tile
    from .space import SIDE, CELL_COUNT, DIRECTIONS, OPPOSITE, cube_coordinates, cube_index
    from .space import SpaceGame, SpaceLevel, SPACE_LEVELS, LAND_LEVELS, cube_slide_options, shifted, witness_plans
except ImportError:
    from engine import GameError, Tile
    from space import SIDE, CELL_COUNT, DIRECTIONS, OPPOSITE, cube_coordinates, cube_index
    from space import SpaceGame, SpaceLevel, SPACE_LEVELS, LAND_LEVELS, cube_slide_options, shifted, witness_plans

FACES = tuple(DIRECTIONS)
OUTSIDE, FINISH = -1, CELL_COUNT * len(FACES)


@dataclass(frozen=True)
class LunarTile(Tile):
    faces: tuple[tuple[str, tuple[str, ...]], ...] = ()


def surface_index(cube: int, face: str) -> int:
    cube_coordinates(cube)
    if face not in FACES:
        raise GameError("Choisissez une face lunaire valide.")
    return cube * len(FACES) + FACES.index(face)


def surface_parts(index: int) -> tuple[int, str]:
    if type(index) is not int or not 0 <= index < FINISH:
        raise GameError("Choisissez un chemin de surface valide.")
    return index // len(FACES), FACES[index % len(FACES)]


def is_exterior(index: int) -> bool:
    cube, face = surface_parts(index)
    coordinates = cube_coordinates(cube)
    return any(normal and coordinates[axis] == (SIDE - 1 if normal > 0 else 0)
               for axis, normal in enumerate(DIRECTIONS[face]))


def surface_neighbor(index: int, direction: str) -> tuple[int, str] | None:
    cube, face = surface_parts(index)
    if not is_exterior(index) or direction not in FACES or direction in (face, OPPOSITE[face]):
        return None
    coordinates = tuple(value + delta for value, delta in zip(cube_coordinates(cube), DIRECTIONS[direction]))
    if all(0 <= value < SIDE for value in coordinates):
        return surface_index(cube_index(*coordinates), face), OPPOSITE[direction]
    return surface_index(cube, direction), face


def surface_ports(tiles: tuple[LunarTile | None, ...], index: int) -> tuple[str, ...]:
    if not is_exterior(index):
        return ()
    cube, face = surface_parts(index)
    tile = tiles[cube]
    return dict(tile.faces).get(face, ()) if tile else ()


def surface_paths(tiles: tuple[LunarTile | None, ...], hero: int, entry: int, exit: int) -> dict[int, list[int]]:
    paths = {hero: [hero]}
    queue = deque([hero])
    while queue:
        position = queue.popleft()
        destinations = []
        if position == OUTSIDE:
            # Le module d'entree est fixe, comme le portail de sortie.
            if surface_ports(tiles, entry):
                destinations.append(entry)
        elif position != FINISH:
            ports = surface_ports(tiles, position)
            if position == entry and ports:
                destinations.append(OUTSIDE)
            # Le portail appartient a cet emplacement, pas a un cube particulier.
            if position == exit and ports:
                destinations.append(FINISH)
            for direction in ports:
                neighbor = surface_neighbor(position, direction)
                if neighbor and neighbor[1] in surface_ports(tiles, neighbor[0]):
                    destinations.append(neighbor[0])
        for destination in destinations:
            if destination not in paths:
                paths[destination] = paths[position] + [destination]
                queue.append(destination)
    return paths


@dataclass(frozen=True)
class LunarLevel(SpaceLevel):
    entry_surface: int = 0
    exit_surface: int = 0

    def mechanic(self):
        return {"key": "lunar", "title": "La Lune sous vos pieds",
                "text": "Les chemins parcourent uniquement les six faces externes. "
                        "Lumen suit le sol autour des ar\u00eates, m\u00eame sous le cube. "
                        "Glissez les cubes sans les tourner ; celui qui le porte reste immobile."}

    def public(self):
        return {**super().public(), "boardKind": "surface", "region": "moon"}


def lunar_level(level_id, name, subtitle, patches, shuffle, relic_name, order):
    route = tuple(surface_index(cube, face) for cube, face in patches)
    if len(set(route)) != len(route) or not all(is_exterior(index) for index in route):
        raise ValueError(f"Parcours lunaire invalide : {level_id}")
    paths = {index: set() for index in route}
    for start, end in zip(route, route[1:]):
        side, back = next((direction, neighbor[1]) for direction in FACES
                          if (neighbor := surface_neighbor(start, direction)) and neighbor[0] == end)
        paths[start].add(side)
        paths[end].add(back)
    paths[route[0]].add("I")
    paths[route[-1]].add("O")
    anchor, direction, (relic, back) = next(
        (anchor, direction, neighbor) for anchor in route[len(route) // 2:] + route[1:]
        for direction in FACES if (neighbor := surface_neighbor(anchor, direction)) and neighbor[0] not in paths)
    paths[anchor].add(direction)
    paths[relic] = {back}
    tiles = []
    for cube in range(CELL_COUNT):
        if cube == 13:
            tiles.append(None)
            continue
        faces = []
        for face_number, face in enumerate(FACES):
            tangents = [side for side in FACES if side not in (face, OPPOSITE[face])]
            offset = (cube * 5 + face_number + order) % 4
            fallback = {tangents[offset], tangents[(offset + 1 + order % 2) % 4]}
            faces.append((face, tuple(sorted(paths.get(surface_index(cube, face), fallback)))))
        tiles.append(LunarTile(f"{level_id}-{cube}", (), faces=tuple(faces)))
    solved = tuple(tiles)
    tiles, empty, inverse = solved, 13, []
    for source in shuffle:
        if (source, empty) not in cube_slide_options(tiles, OUTSIDE):
            raise ValueError(f"Melange lunaire invalide : {level_id}, {source} -> {empty}")
        inverse.append(("slide", empty, source))
        tiles = shifted(tiles, source, empty)
        empty = source
    return LunarLevel(level_id, name, subtitle, "Aventure" if order < 3 else "Expert",
                      len(shuffle), tiles, tuple(reversed(inverse)) + (("walk", FINISH),),
                      biome="space", biomeLevel=len(SPACE_LEVELS) + order,
                      chapter=len(LAND_LEVELS) + len(SPACE_LEVELS) + order,
                      relic=relic, relicName=relic_name, rule="lunar", stepPar=len(route) + 1,
                      solved=solved, entry_surface=route[0], exit_surface=route[-1])


LUNAR_LEVELS = (
    lunar_level("clairdelune", "Le premier clair de Lune", "Le chemin descend au-del\u00e0 de l'horizon.",
                ((18,"U"),(19,"U"),(20,"U"),(20,"E"),(11,"E"),(2,"E"),(2,"D"),(1,"D"),(0,"D")),
                (14,23,20), "la Poussi\u00e8re d'argent", 1),
    lunar_level("tranquillite", "La mer de la Tranquillit\u00e9", "Quatre horizons autour d'une lune silencieuse.",
                ((18,"U"),(21,"U"),(24,"U"),(24,"S"),(15,"S"),(6,"S"),(6,"D"),(7,"D"),
                 (8,"D"),(8,"E"),(17,"E"),(26,"E"),(26,"U")),
                (4,7,16,15,24,21), "le Galet de la Tranquillit\u00e9", 2),
    lunar_level("terminateur", "La ligne du terminateur", "Entre ombre et lumi\u00e8re, retrouvez le sol.",
                ((18,"U"),(19,"U"),(22,"U"),(25,"U"),(25,"S"),(16,"S"),(7,"S"),(7,"D"),
                 (4,"D"),(1,"D"),(1,"N"),(10,"N"),(19,"N"),(20,"N"),(20,"E"),(11,"E"),(2,"E"),(2,"D")),
                (10,11,14,23,22,19,18,9,12,13,4), "l'Aiguille du cr\u00e9puscule", 3),
    lunar_level("facecachee", "La face cach\u00e9e", "Chaque ar\u00eate ouvre un autre paysage.",
                ((18,"U"),(21,"U"),(22,"U"),(23,"U"),(26,"U"),(26,"S"),(17,"S"),(8,"S"),
                 (8,"D"),(7,"D"),(6,"D"),(6,"W"),(15,"W"),(24,"W"),(21,"W"),(18,"W"),
                 (18,"N"),(19,"N"),(20,"N"),(20,"E"),(11,"E"),(2,"E")),
                (22,21,12,3,0,9,18,19,10,11,14,17,26,25,16,13), "le Fragment de la face cach\u00e9e", 4),
    lunar_level("selenite", "La couronne de s\u00e9l\u00e9nite", "Le dernier sentier enlace les six faces de la Lune.",
                ((18,"U"),(18,"W"),(9,"W"),(0,"W"),(0,"D"),(3,"D"),(6,"D"),(6,"S"),
                 (7,"S"),(8,"S"),(8,"E"),(17,"E"),(26,"E"),(26,"U"),(25,"U"),(22,"U"),
                 (19,"U"),(19,"N"),(10,"N"),(1,"N"),(2,"N"),(2,"D"),(5,"D"),(8,"D")),
                (14,23,26,25,22,19,10,1,4,3,12,21,24,15,16,7,8,17,14,13), "la Fleur de s\u00e9l\u00e9nite", 5),
)
LUNAR_LEVEL_BY_ID = {level.id: level for level in LUNAR_LEVELS}
LUNAR_PLANS = {level.id: witness_plans(level) for level in LUNAR_LEVELS}


class LunarGame(SpaceGame):
    finish_index = FINISH
    plans = LUNAR_PLANS

    def __init__(self, level_id="clairdelune"):
        if not isinstance(level_id, str) or level_id not in LUNAR_LEVEL_BY_ID:
            raise GameError("Ce passage lunaire n'existe pas.")
        self.id = uuid.uuid4().hex
        self.level = LUNAR_LEVEL_BY_ID[level_id]
        self.history = []
        self._reset()

    def routes(self, tiles, hero):
        return surface_paths(tiles, hero, self.level.entry_surface, self.level.exit_surface)

    def slides(self, tiles, hero):
        cube = surface_parts(hero)[0] if 0 <= hero < FINISH else OUTSIDE
        return cube_slide_options(tiles, cube)

    def state(self):
        paths = self.routes(self.tiles, self.hero)
        won = self.hero == FINISH
        options = [] if won else self.slides(self.tiles, self.hero)
        entry_cube, entry_face = surface_parts(self.level.entry_surface)
        exit_cube, exit_face = surface_parts(self.level.exit_surface)
        hero_surface = self.level.entry_surface if self.hero == OUTSIDE else self.level.exit_surface if won else self.hero
        hero_cube, hero_face = surface_parts(hero_surface)
        return {
            "id": self.id, "levelId": self.level.id, "biome": "space", "region": "moon", "boardKind": "surface",
            "size": SIDE, "depth": SIDE, "cellCount": CELL_COUNT, "finishIndex": FINISH,
            "mechanic": self.level.mechanic(),
            "tiles": [None if tile is None else {"id": tile.id, "ports": [], "faces": dict(tile.faces),
                      "hazard": None, "flow": None, "heading": None, "engraved": False} for tile in self.tiles],
            "hero": self.hero, "heroCube": hero_cube if 0 <= self.hero < FINISH else OUTSIDE, "heroFace": hero_face,
            "entry": {"index": self.level.entry_surface, "cube": entry_cube, "face": entry_face},
            "exit": {"index": self.level.exit_surface, "cube": exit_cube, "face": exit_face},
            "moves": self.moves, "steps": self.steps, "won": won, "lost": False, "caughtBy": None,
            "reachable": sorted(index for index in paths if 0 <= index < FINISH),
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

    def _slide(self, index, target=None):
        super()._slide(index, target)
        self.message = "Le cube glisse. Le paysage lunaire change de visage."

    def _walk(self, index):
        paths = self.routes(self.tiles, self.hero)
        if index is None:
            options = [position for position, route in paths.items() if position not in {self.hero, OUTSIDE}
                       and len(route) > 1 and route[1] != self.previous_hero]
            if not options:
                raise GameError("Le chemin s'arr\u00eate sur cette face. Alignez les pistes voisines.")
            index = min(options, key=lambda position: (len(paths[position]), position))
        if type(index) is not int or not OUTSIDE <= index <= FINISH or index == self.hero or index not in paths:
            raise GameError("Seuls les chemins reli\u00e9s sur les faces ext\u00e9rieures sont praticables.")
        route = paths[index]
        self._save(route)
        had_relic = self.relic
        self.previous_hero = route[-2]
        self.hero = index
        self.steps += len(route) - 1
        self.walk_path = route
        self.relic = self.relic or self.level.relic in route
        self.hint = None
        self.message = ("Le voyage autour de la Lune est accompli !" if index == FINISH else
                        f"Vous emportez {self.level.relicName} !" if self.relic and not had_relic else
                        "Lumen suit la surface, au-del\u00e0 de l'horizon.")