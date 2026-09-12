"""Les Archives des Echos : un taquin partage entre deux epoques."""
from __future__ import annotations

from dataclasses import dataclass, replace
import heapq
import itertools
import time
import uuid

try:
    from .engine import Board, Game, GameError, Level, Tile, FINISH, OUTSIDE, SIZE, OPPOSITE, neighbors, paths_from, slide_options, swapped
    from .space import layout_key, shifted
    from .packs import ECHO_PACK_ID
except ImportError:
    from engine import Board, Game, GameError, Level, Tile, FINISH, OUTSIDE, SIZE, OPPOSITE, neighbors, paths_from, slide_options, swapped
    from space import layout_key, shifted
    from packs import ECHO_PACK_ID

EPOCH_NAMES = ("Ruines", "Apog\u00e9e")


@dataclass(frozen=True)
class EchoTile(Tile):
    alternate: tuple[str, ...] = ()
    chronolith: bool = False


@dataclass(frozen=True)
class EchoLevel(Level):
    fragments: tuple[tuple[int, int, str], ...] = ()

    def mechanic(self):
        return {"key": "echoes", "title": "Les pierres se souviennent",
                "text": "Sur un chronolithe, changez d'\u00e9poque. Les pierres gardent leur place, "
                        "mais leurs chemins changent. Retrouvez chaque fragment de m\u00e9moire pour ouvrir la sortie."}

    def public(self):
        return {**super().public(), "packId": ECHO_PACK_ID, "boardKind": "echoes"}


def make_echo_level(level_id, name, subtitle, networks, anchors, fragments, empty, shuffle, relic, relic_anchor, relic_name, actions, order):
    eras = []
    for epoch, routes in enumerate(networks):
        ports = [set(("NS", "EW", "NE", "SW")[(index * 5 + order + epoch) % 4]) for index in range(FINISH)]
        authored = {index for route in routes for index in route}
        for index in authored:
            ports[index] = set()
        for route in routes:
            for start, end in zip(route, route[1:]):
                side = next(side for side, destination in neighbors(start) if destination == end)
                ports[start].add(side)
                ports[end].add(OPPOSITE[side])
        ports[0].add("W")
        ports[15].add("E")
        if epoch == 1:
            side = next(side for side, destination in neighbors(relic_anchor) if destination == relic)
            ports[relic_anchor].add(side)
            ports[relic] = {OPPOSITE[side]}
        eras.append(ports)
    tiles = tuple(None if index == empty else EchoTile(f"{level_id}-{index}", tuple(sorted(eras[0][index])),
                  alternate=tuple(sorted(eras[1][index])), chronolith=index in anchors) for index in range(FINISH))
    inverse = []
    for source in shuffle:
        if source not in {cell for _, cell in neighbors(empty)} or tiles[source] is None:
            raise ValueError(f"Melange des Echos invalide : {level_id}, {source} -> {empty}")
        inverse.append(("slide", empty, source))
        tiles = shifted(tiles, source, empty)
        empty = source
    solution = tuple(reversed(inverse)) + tuple(actions)
    return EchoLevel(level_id, name, subtitle, "Aventure" if order < 3 else "Expert", len(shuffle) + sum(action[0] == "echo" for action in actions),
                     tiles, solution, biome="echoes", biomeLevel=order, chapter=39 + order,
                     relic=relic, relicName=relic_name, rule="echoes", fragments=tuple(fragments))


ECHO_LEVELS = (
    make_echo_level("vestibule", "Le vestibule des heures", "La premi\u00e8re porte s'ouvre dans un autre temps.",
        (((0,1,5,4,8,12),), ((0,4,5,6,10,11,15),)), (5,),
        ((12,0,"La voix des pierres"), (11,1,"Le premier soleil")), 14, (10,6,5), 9, 10, "le Sablier de ros\u00e9e",
        (("walk",12),("walk",5),("echo",None),("walk",11),("walk",FINISH)), 1),
    make_echo_level("palimpseste", "La galerie palimpseste", "Deux cartes se cachent sur les m\u00eames dalles.",
        (((0,4,8,9,5,1,2,6),), ((0,1,5,9,13,12,8),(9,10,11,15))), (5,),
        ((6,0,"La fresque effac\u00e9e"),(13,1,"Les noms retrouv\u00e9s")), 14, (10,9,13,12,8,4), 7, 11, "la Plume du souvenir",
        (("walk",6),("walk",5),("echo",None),("walk",13),("walk",FINISH)), 2),
    make_echo_level("revers", "Le pont des revers", "Ce qui manque aujourd'hui tient encore hier.",
        (((0,1,5,4,8),(10,14,15)), ((5,6,2,3,7,11,10),(10,9))), (5,10),
        ((8,0,"Le pont disparu"),(7,1,"La promesse"),(15,0,"Le retour")), 12, (13,9,5,6,10,14,15,11,7), 13, 9, "le Fil du temps",
        (("walk",8),("walk",5),("echo",None),("walk",7),("walk",10),("echo",None),("walk",15),("walk",FINISH)), 3),
    make_echo_level("resonance", "La chambre de r\u00e9sonance", "Les souvenirs dessinent une sortie dans les ruines.",
        (((0,1,2,6,5,4,8,12),(10,14,15)), ((5,9,10,6,7,11,15),)), (5,10),
        ((12,0,"Le silence"),(7,1,"Le chant"),(14,0,"La r\u00e9ponse")), 13, (9,5,6,10,14,15,11,7,3,2,1,5), 3, 7, "la Cloche de cristal",
        (("walk",12),("walk",5),("echo",None),("walk",7),("walk",10),("echo",None),("walk",14),("walk",FINISH)), 4),
    make_echo_level("anamnesis", "Le dernier souvenir", "La cit\u00e9 attend celui qui se souviendra de son nom.",
        (((0,4,8,9,5,1,2,3),(10,14,15)), ((9,5,6,7,11,10),(9,8,12))), (9,10),
        ((3,0,"Les voyageurs"),(6,1,"Les b\u00e2tisseurs"),(7,1,"Le nom de Lumen"),(14,0,"La m\u00e9moire rendue")),
        13, (14,10,6,5,9,8,12,13,14,15,11,7,3,2,1,5,4,8), 12, 8, "la Graine du lendemain",
        (("walk",3),("walk",9),("echo",None),("walk",7),("walk",10),("echo",None),("walk",14),("walk",FINISH)), 5),
)
ECHO_LEVEL_BY_ID = {level.id: level for level in ECHO_LEVELS}


def echo_paths(level, tiles, hero, memories):
    paths = paths_from(Board(tiles, level), hero)
    if len(memories) != len(level.fragments):
        paths.pop(FINISH, None)
    return paths


def remember(level, path, epoch, memories):
    return tuple(sorted(set(memories) | {number for number, (index, phase, _) in enumerate(level.fragments)
                                        if phase == epoch and index in path}))


def shift_epoch(tiles):
    return tuple(replace(tile, ports=tile.alternate, alternate=tile.ports) if tile else None for tile in tiles)


def echo_transition(level, tiles, hero, epoch, memories, action):
    kind, index, *destination = action
    if kind == "slide":
        board = Board(tiles, level)
        target = destination[0] if destination else next((target for source, target in slide_options(board, hero) if source == index), None)
        if (index, target) not in slide_options(board, hero):
            raise GameError("Cette pierre ne peut pas glisser.")
        return shifted(tiles, index, target), hero, epoch, memories
    if kind == "echo":
        if not 0 <= hero < FINISH or not tiles[hero] or not tiles[hero].chronolith:
            raise GameError("Rejoignez un chronolithe pour changer d'\u00e9poque.")
        return shift_epoch(tiles), hero, 1 - epoch, remember(level, [hero], 1 - epoch, memories)
    paths = echo_paths(level, tiles, hero, memories)
    if index == hero or index not in paths:
        raise GameError("Les chemins ne sont pas reli\u00e9s dans cette \u00e9poque.")
    return tiles, index, epoch, remember(level, paths[index], epoch, memories)


def echo_key(tiles, epoch, memories):
    return layout_key(tiles), epoch, memories


def echo_witnesses(level):
    tiles, hero, epoch, memories = level.tiles, OUTSIDE, 0, ()
    witnesses = {}
    steps = 0
    for offset, action in enumerate(level.solution):
        witnesses.setdefault(echo_key(tiles, epoch, memories), []).append((hero, level.solution[offset:]))
        if action[0] == "walk":
            steps += len(echo_paths(level, tiles, hero, memories)[action[1]]) - 1
        tiles, hero, epoch, memories = echo_transition(level, tiles, hero, epoch, memories, action)
    if hero != FINISH:
        raise ValueError(f"La solution des Echos n'aboutit pas : {level.id}")
    return witnesses, steps


class EchoGame(Game):
    def __init__(self, level_id="vestibule"):
        if not isinstance(level_id, str) or level_id not in ECHO_LEVEL_BY_ID:
            raise GameError("Ce passage des Echos n'existe pas.")
        self.id = uuid.uuid4().hex
        self.level = ECHO_LEVEL_BY_ID[level_id]
        self.history = []
        self._reset()

    def _reset(self):
        super()._reset()
        self.epoch = 0
        self.memories = ()
        self.echo_history = []

    def _save(self, walk_path=None):
        super()._save(walk_path)
        self.echo_history.append((self.epoch, self.memories))

    def state(self):
        state = super().state()
        paths = echo_paths(self.level, self.tiles, self.hero, self.memories)
        state.update({
            "boardKind": "echoes", "packId": ECHO_PACK_ID,
            "reachable": sorted(index for index in paths if 0 <= index < FINISH),
            "walkRoutes": {str(index): route for index, route in paths.items() if index != self.hero},
            "canExit": self.hero != FINISH and FINISH in paths,
            "echoes": {"phase": self.epoch, "name": EPOCH_NAMES[self.epoch],
                "canShift": 0 <= self.hero < FINISH and bool(self.tiles[self.hero] and self.tiles[self.hero].chronolith),
                "anchors": [index for index, tile in enumerate(self.tiles) if tile and tile.chronolith],
                "fragments": [{"id": number, "index": index, "phase": phase, "name": name, "taken": number in self.memories}
                              for number, (index, phase, name) in enumerate(self.level.fragments)],
                "gateOpen": len(self.memories) == len(self.level.fragments)},
        })
        for item, tile in zip(state["tiles"], self.tiles):
            if item:
                item["alternatePorts"] = list(tile.alternate)
                item["chronolith"] = tile.chronolith
        state["relic"]["phase"] = 1
        return state

    def act(self, action, index=None, to=None):
        if not isinstance(action, str) or action not in {"slide", "walk", "echo", "hint", "undo", "reset"}:
            raise GameError("Action inconnue dans les Archives.")
        if to is not None and (action != "slide" or type(to) is not int or not 0 <= to < FINISH):
            raise GameError("Choisissez un vide valide.")
        if action == "undo" and self.history:
            self.epoch, self.memories = self.echo_history.pop()
        if action == "echo":
            if self.hero == FINISH:
                raise GameError("Le passage est d\u00e9j\u00e0 accompli.")
            tiles, _, epoch, memories = echo_transition(self.level, self.tiles, self.hero, self.epoch, self.memories, ("echo", None))
            self._save()
            self.tiles, self.epoch, self.memories = tiles, epoch, memories
            self.moves += 1
            self.walk_path = self.hint = None
            self.message = "La cit\u00e9 se souvient. Vous contemplez son apog\u00e9e." if epoch else "Le temps reprend son cours. Les ruines vous accueillent."
            return self.state()
        if action == "hint":
            self.walk_path = None
            plan = echo_plan(self)
            if plan:
                kind, target, *destination = plan[0]
                self.hint = {"type": kind, "index": target}
                if destination:
                    self.hint["to"] = destination[0]
                self.message = ("Activez le chronolithe pour changer d'\u00e9poque." if kind == "echo" else
                                "Glissez la pierre indiqu\u00e9e vers le vide." if kind == "slide" else
                                "La m\u00e9moire est compl\u00e8te. Rejoignez la sortie." if target == FINISH else
                                "Suivez le chemin vers le prochain souvenir.")
            elif self.history:
                self.hint = {"type": "undo", "index": None}
                self.message = "Revenez d'un coup pour retrouver un chemin connu."
            else:
                self.hint = None
                self.message = "Aucun chemin trouv\u00e9 dans le temps de recherche."
            if self.hint:
                self.hint["text"] = self.message
            return self.state()
        return super().act(action, index, to)

    def _walk(self, index):
        if self.hero == FINISH:
            raise GameError("Lumen a retrouv\u00e9 le dernier souvenir.")
        paths = echo_paths(self.level, self.tiles, self.hero, self.memories)
        if index is None:
            choices = [destination for destination, route in paths.items() if destination not in {self.hero, OUTSIDE}
                       and len(route) > 1 and route[1] != self.previous_hero]
            if not choices:
                raise GameError("Le chemin s'arr\u00eate ici. Une autre \u00e9poque garde peut-\u00eatre le passage.")
            index = min(choices, key=lambda destination: (len(paths[destination]), -destination))
        if type(index) is not int or index == self.hero or index not in paths:
            raise GameError("Ce chemin n'est pas reli\u00e9 dans cette \u00e9poque, ou la m\u00e9moire est incompl\u00e8te.")
        route = paths[index]
        self._save(route)
        previous = self.memories
        self.memories = remember(self.level, route, self.epoch, self.memories)
        had_relic = self.relic
        self.relic = self.relic or self.epoch == 1 and self.level.relic in route
        self.previous_hero = route[-2]
        self.hero = index
        self.steps += len(route) - 1
        self.walk_path = route
        self.hint = None
        self.message = ("Les Archives s'\u00e9veillent. La cit\u00e9 n'est plus oubli\u00e9e." if index == FINISH else
                        "La m\u00e9moire est compl\u00e8te : une porte oubli\u00e9e se r\u00e9veille." if len(self.memories) == len(self.level.fragments) and previous != self.memories else
                        f"Fragment retrouv\u00e9 : {self.level.fragments[next(number for number in self.memories if number not in previous)][2]}." if previous != self.memories else
                        f"Vous emportez {self.level.relicName} !" if self.relic and not had_relic else "Lumen suit les traces d'une autre vie.")


def echo_plan(game, max_states=2000, time_limit=.5):
    serial = itertools.count()
    initial = (game.tiles, game.hero, game.epoch, game.memories)
    frontier = [(0, next(serial), 0, initial, ())]
    seen = {(echo_key(game.tiles, game.epoch, game.memories), game.hero): 0}
    started = time.monotonic()
    while frontier and len(seen) < max_states and time.monotonic() - started < time_limit:
        _, _, cost, current, plan = heapq.heappop(frontier)
        tiles, hero, epoch, memories = current
        paths = echo_paths(game.level, tiles, hero, memories)
        if FINISH in paths:
            return plan + (("walk", FINISH),)
        witnessed = ECHO_WITNESSES[game.level.id].get(echo_key(tiles, epoch, memories), [])
        for expected, remainder in sorted(witnessed, key=lambda item: (item[0] != hero, len(item[1]))):
            prefix = () if hero == expected else (("walk", expected),) if expected in paths else None
            if prefix is not None:
                trial = current
                try:
                    for action in prefix + remainder:
                        trial = echo_transition(game.level, *trial, action)
                    if trial[1] == FINISH:
                        return plan + prefix + remainder
                except GameError:
                    pass
        options = [("slide", source, target) for source, target in slide_options(Board(tiles, game.level), hero)]
        options.extend(("walk", destination) for destination in paths if destination != hero)
        if 0 <= hero < FINISH and tiles[hero] and tiles[hero].chronolith:
            options.append(("echo", None))
        for action in options:
            following = echo_transition(game.level, *current, action)
            next_tiles, next_hero, next_epoch, next_memories = following
            key = (echo_key(next_tiles, next_epoch, next_memories), next_hero)
            next_cost = cost + 1
            if next_cost >= seen.get(key, float("inf")):
                continue
            seen[key] = next_cost
            estimate = next_cost + (len(game.level.fragments) - len(next_memories)) * 2
            heapq.heappush(frontier, (estimate, next(serial), next_cost, following, plan + (action,)))
    return None


ECHO_WITNESSES = {}
for _level in ECHO_LEVELS:
    _witnesses, _steps = echo_witnesses(_level)
    ECHO_WITNESSES[_level.id] = _witnesses
    ECHO_LEVEL_BY_ID[_level.id] = replace(_level, stepPar=_steps)
ECHO_LEVELS = tuple(ECHO_LEVEL_BY_ID[level.id] for level in ECHO_LEVELS)