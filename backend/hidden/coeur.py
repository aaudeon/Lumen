"""Le cœur éteint — under Le passage sacrifié (volcano).

The volcano's basalt heart was torn from its seal and left at the top of the
room; the gate before the exit stays dark until it is set back. A single fragile
bridge leads in, and what it cracks on the way down is material: the witness
stops on a cracked stone on purpose, lets it fall as he leaves, and rolls the
heart down through the two gaps the collapse left — the fallen bridge, then the
sacrificed stone. Walking past the sacrifice instead costs two more slides.

The rule cannot be dodged. Any road from the entry to the exit spans seven
stones, and the room holds exactly seven stones with ports that are not dead
ends — the fragile bridge, both brittle stones and the gate among them. Laid out
in one go, every way out crosses the bridge, cracks its neighbours and needs the
heart on its seal. Carrying already-crossed stones forward to spare the bridge
is conceivable but never cheaper: an exhaustive search over slides and walks
finds no way out at all, bridge or no bridge, under twenty-one slides, so the
witness — sixteen to undo the shuffle, five to solve the room — is optimal.
Harder than its host because the crossing, the seal and the way out share the
same few gaps.
"""


def build(make):
    return make(
        "coeur", "sacrifice", "volcano", "Le cœur éteint",
        "Le volcan a perdu son cœur de basalte. Franchissez le dernier pont, "
        "sacrifiez ce qu’il fissure, et rendez le cœur à son sceau.",
        ["WE", "WS", "", "",
         "", "NE", "WES", "W",
         "", "NS", "", None,
         "", "", "NE", "WE"],
        (7, 6, 5, 1, 0, 4, 8, 9, 10, 14, 15, 11, 7, 3, 2, 6),
        marks=((0, ("brittle", None)), (1, ("fragile", None)), (5, ("brittle", None)),
               (2, ("weight", None)), (15, ("gate", None))),
        seals=(9,),
        # Cross to the cracked stone 5, drop the heart into the fallen bridge,
        # leave (5 falls), lower the heart, clear the seal, set it, walk out.
        actions=(("walk", 5), ("slide", 2, 1), ("walk", 6), ("slide", 1, 5),
                 ("slide", 10, 11), ("slide", 9, 10), ("slide", 5, 9), ("walk", 16)),
        relic=7, relic_name="la Cendre du phénix", reward="phenix", rule="gate",
    )
