"""La caverne sous les aurores — under La couronne boréale (boreal).

Two ice corridors cross in the dark, and their junction is ice too: Lumen
slides down the first, later along the second, and can never turn where they
meet — one walk cannot cross the junction twice, so the road takes two runs
with a stable landing between them. The door at the foot of the first slope
stays shut until a lever buried beside the entrance is touched, so the whole
descent must be prepared before it starts. The shuffle runs 28 slides deep,
six more than its host, and the relic waits in a dead end above the exit.
"""


def build(make):
    return make(
        "caverne", "aurore", "boreal", "La caverne sous les aurores",
        "Deux couloirs de glace se croisent sous les aurores. La porte au pied de la pente "
        "n’obéit qu’au levier enfoui près de l’entrée.",
        ["WES", "WE", "WS", "",
         "N", None, "NS", "S",
         "SE", "WE", "NESW", "NSW",
         "NE", "WE", "NW", "NE"],
        (6, 7, 3, 2, 1, 0, 4, 8, 9, 10, 11, 15, 14, 13, 12, 8,
         4, 5, 6, 10, 9, 13, 14, 15, 11, 7, 3, 2),
        # Column 2 and row 2 are ice; stone 10 is the frozen crossing. The gate
        # is the only landing under the first slope.
        marks=((6, ("ice", None)), (9, ("ice", None)), (10, ("ice", None)),
               (14, ("gate", None))),
        levers=(4,),
        actions=(("walk", 4), ("walk", 14), ("walk", 16)),
        relic=7, relic_name="la Plume d’aurore", reward="hibou", rule="ice_gate",
    )
