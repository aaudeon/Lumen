"""Le lac sous la glace — under Le pont des séracs (boreal).

A frozen lake with no shore. From the launch stone in the bottom row, the ice
ribbon runs north and ends on a stone that cannot be landed on: the glide has
nowhere to stop. The only stable slab that fits is the ballast stone, and the
seal it must press is the very last cell of the ribbon. So the ballast is
delivered *through* the ribbon — the ice stones step aside one by one, the
weight climbs the lane they occupied, then the ice is laid back in place.

Harder than its host on two counts. The shuffle is sixteen slides deep, and the
order of play is forced: the entry route crosses the seal cell, and delivering
the weight swaps the entry stone away — a player who sorts the stones before
walking Lumen in finds the door of the lake closed for good.

Route once solved: 0 → 1 → 2 → 6 → 10 → 14 → 13 (launch), then the glide
13 → 9 → 5 onto the weight at 1, east to 2 and 3, down through the gate at 7
to 11 and out by 15. The relic waits west of the launch stone, in a dead end.
"""


def build(make):
    return make(
        "lac_profond", "seracs", "boreal", "Le lac sous la glace",
        "Sous les séracs, un lac a gelé sans rive. La seule berge où s’arrêter est le lest lui-même, posé sur son sceau.",
        ["WE", "WE", "WES", "WS",
         "SE", "NS", "NS", "NS",
         None, "NS", "NS", "NS",
         "E", "ENW", "NW", "NE"],
        (9, 5, 1, 0, 4, 8, 12, 13, 14, 10, 6, 2, 3, 7, 11, 10),
        marks=((4, ("weight", None)), (5, ("ice", None)), (9, ("ice", None)),
               (7, ("gate", None))),
        seals=(1,),
        actions=(
            # Walk in first: the entry stone leaves with the delivery below.
            ("walk", 13),
            # The ice steps aside, the weight climbs its lane and takes the seal,
            # then the ice comes back — the ribbon now ends on a stable slab.
            ("slide", 9, 8), ("slide", 5, 9), ("slide", 4, 5),
            ("slide", 0, 4), ("slide", 1, 0), ("slide", 5, 1),
            ("slide", 9, 5), ("slide", 8, 9),
            ("walk", 16),
        ),
        relic=12, relic_name="le Cristal du lac", reward="renard", rule="ice",
    )
