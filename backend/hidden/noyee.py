"""La salle noyée — under L’estran (atlantis).

A chamber the sea fills twice a day. The road climbs down the west wall while
the water is high, then stops short: the next stone sleeps under the tide and
the current beyond it runs the wrong way. Lumen must let the sea withdraw to
cross the middle, then call it back, because the last two currents only carry
him east at high water. Two tide changes on the route, one drowned stone, a
dead end where the relic waits, and a shuffle 20 slides deep: harder than its
host, whose three currents never hide a stone.
"""


def build(make):
    return make(
        "noyee", "estran", "atlantis", "La salle noyée",
        "Sous l’estran, la mer entre et sort. Une dalle dort sous l’eau : attendez le reflux, puis rappelez la marée.",
        ["WS", "ES", "ESW", "W",
         "NS", "NS", "NS", "",
         "NS", "NS", "NS", None,
         "NE", "NW", "NE", "WE"],
        (10, 6, 2, 1, 5, 9, 13, 14, 15, 11, 7, 3, 2, 6, 10, 14, 13, 9, 8, 4),
        # High water carries Lumen down the west wall (4) and out to the east
        # (10, 14); low water uncovers 9 and turns 5 back towards the north.
        marks=((4, ("current", "S")), (5, ("current", "S")), (9, ("submerged", None)),
               (10, ("current", "S")), (14, ("current", "E"))),
        actions=(("walk", 13), ("tide", None), ("walk", 6), ("tide", None), ("walk", 16)),
        relic=3, relic_name="la Larme d’estran", reward="meduse", rule="tide", tide=True,
    )
