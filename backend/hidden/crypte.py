"""La crypte des racines — under La vigie (jungle).

The reference secret passage. A long snake of a route, two four-way stones a
crocodile keeps for himself, and a dead end where the relic waits. The shuffle
runs 24 slides deep: harder than its host, as a secret should be.
"""


def build(make):
    return make(
        "crypte", "vigie", "jungle", "La crypte des racines",
        "Sous la vigie, les racines ont gardé un couloir. Deux gardiens y dorment.",
        ["WE", "WS", "NESW", "NESW",
         "E", "NSW", "SE", "WS",
         "", "NE", "WN", "NS",
         "", "", None, "NE"],
        (13, 9, 10, 6, 2, 1, 5, 4, 8, 12, 13, 14, 15, 11, 7, 3, 2, 6, 10, 9, 5, 1, 0, 4),
        marks=((2, ("crocodile", None)), (3, ("crocodile", None))),
        relic=4, relic_name="l’Œil de la crypte", reward="salamandre", rule="crocodile",
    )
