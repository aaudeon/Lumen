"""Secret passages: one module per level, none of them in the numbered campaign.

A host passage hides an engraved stone. Standing on it opens a staircase down to
one of these levels — a side room, harder than its host, that gives back to the
host's portal once cleared. Each rewards a companion no shop sells, and a relic
of a higher rank.

The package is called ``hidden`` because ``secrets`` is a standard-library name.
"""


def secret_maker(trial, scramble, replace, finish):
    """Author the solved board, shuffle it, and keep the exact inverse as witness."""
    def make(level_id, host, biome, name, subtitle, ports, shuffle, *, marks=(),
             actions=None, relic=None, relic_name="", reward="", rule="", **features):
        solution = actions or (("walk", finish),)
        level = trial(level_id, name, subtitle, "Secret", biome, ports, marks=marks,
                      solution=solution, rule=rule, **features)
        empty = ports.index(None)
        inverse = tuple(("slide", cell) for cell in reversed((empty, *shuffle[:-1])))
        return replace(level, tiles=scramble(level.tiles, shuffle),
                       solution=inverse + solution, par=level.par + len(shuffle),
                       host=host, reward=reward, relic=relic, relicName=relic_name)
    return make


NAMES = ("crypte", "caverne", "noyee", "veine", "coeur", "lac_profond")


def build_secret_levels(trial, scramble, replace, finish):
    """Strict by default: a broken room is a broken game. While several rooms are
    being written at once, LUMEN_HIDDEN_LENIENT=1 skips the ones that fail to load,
    so one half-written module does not blind the checks of the others."""
    import importlib
    import os
    make = secret_maker(trial, scramble, replace, finish)
    lenient = os.environ.get("LUMEN_HIDDEN_LENIENT") == "1"
    rooms = []
    for name in NAMES:
        try:
            try:
                module = importlib.import_module(f"{__name__}.{name}")
            except ImportError:
                module = importlib.import_module(name)
            rooms.append(module.build(make))
        except Exception as error:  # noqa: BLE001 - the whole point is to report and go on
            if not lenient:
                raise
            print(f"[hidden] {name} ignoré : {error!r}")
    return tuple(rooms)
