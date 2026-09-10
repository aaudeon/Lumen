"""Five fixed ice puzzles. Each shuffle has an explicit, reversible witness.

Only the setup is shuffled. Lever visits, lost bridges and the final weight
placements remain real gameplay transitions in the demonstrated solutions.
"""


def build_boreal_levels(trial, scramble, replace, finish):
    def make(id, name, subtitle, ports, ice, shuffle, *, marks=(),
             actions=None, difficulty="Maîtrise", rule="ice", **features):
        solution = actions or (("walk", finish),)
        level = trial(id, name, subtitle, difficulty, "boreal", ports,
                      marks=tuple((i, ("ice", None)) for i in ice) + marks,
                      solution=solution, rule=rule, **features)
        empty = ports.index(None)
        inverse = tuple(("slide", cell) for cell in reversed((empty, *shuffle[:-1])))
        return replace(level, tiles=scramble(level.tiles, shuffle),
                       solution=inverse + solution, par=level.par + len(shuffle))

    return (
        make("banquise", "Le lac miroir",
             "Prévoyez vos appuis : sur la glace, même un carrefour se traverse tout droit.",
             ["WE", "NESW", "WE", "WS", "NE", "NS", "ES", "NS",
              "NW", "WE", "SW", "NS", "NE", "NS", None, "NE"],
             (1, 2, 7, 11), (10, 6, 2, 3, 7, 11, 15, 14)),
        make("aiguilles", "Les aiguilles du nord",
             "Un zigzag dans le glacier : les pierres sèches sont vos seuls virages.",
             ["WS", "NE", "ES", "WS", "NS", "NW", "NESW", "NS",
              "NE", "WE", "NW", "NS", None, "ES", "NW", "NE"],
             (4, 6, 7, 9, 11), (13, 9, 5, 1, 2, 6, 10, 14, 15, 11, 7, 6)),
        make("refuge", "Le refuge des veilleurs",
             "Deux leviers sous la neige. Il faut quitter la route du portail pour les atteindre.",
             ["WE", "WES", "WE", "WS", "E", "WNS", "NW", "NS",
              "NE", "NS", "SW", "NS", "NE", "N", None, "NE"],
             (2, 7, 9, 11), (10, 6, 2, 3, 7, 11, 15, 14, 13, 9, 5, 1, 2, 6, 10, 14),
             marks=((3, ("gate", None)),), levers=(5, 13),
             actions=(("walk", 5), ("walk", 13), ("walk", finish)),
             relic=4, relicName="la Boussole polaire", rule="ice_gate", difficulty="Légende"),
        make("seracs", "Le pont des séracs",
             "Sacrifiez le premier pont, replacez la glace, puis faites peser le lest sur le sceau.",
             ["WE", "WS", "", None, "", "NS", "", "",
              "NS", "", "", "", "", "NE", "WE", "WE"],
             (8, 14), (2, 6, 10, 11, 15, 14, 13, 9, 8, 4, 5, 1),
             marks=((0, ("brittle", None)), (1, ("fragile", None)),
                    (5, ("brittle", None)), (12, ("weight", None)), (15, ("gate", None))),
             levers=(13,), seals=(8,),
             actions=(("walk", 5), ("slide", 2, 3), ("slide", 6, 2),
                      ("slide", 10, 6), ("slide", 9, 10), ("slide", 8, 9),
                      ("slide", 12, 8), ("walk", 13), ("walk", finish)),
             difficulty="Légende", rule="ice_chain"),
        make("aurore", "La couronne boréale",
             "Le dernier sanctuaire exige deux haltes, un pont sacrifié et un lest placé au bon moment.",
             ["WE", "WE", "WE", "WS", "", "", "", "NS",
              "", "", "", "WNS", None, "", "E", "NE"],
             (1, 7), (8, 9, 5, 6, 10, 14, 13, 9, 10, 11, 15, 14, 10, 6, 7, 3, 2, 1, 5, 4),
             marks=((2, ("fragile", None)), (10, ("weight", None)), (15, ("gate", None))),
             levers=(3, 11), seals=(6,),
             actions=(("walk", 3), ("slide", 6, 2), ("slide", 10, 6),
                      ("walk", 11), ("walk", finish)),
             difficulty="Légende", rule="ice_master"),
    )
