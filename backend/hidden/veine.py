"""La veine de magma — under Les braises (volcano).

The host teaches the collapse trick once: cross one fragile stone, then push
the entrance stone through the gap it leaves. This room doubles the bet. Six
corridor stones for a seven-cell road, and the only way past the threshold is
a single run over TWO fragile slabs (1 then 5) down to the landing stone 9.
Both slabs fall, and their fall cracks the stones beside them: the threshold
(0) and the landing stone (9) turn fragile in the same instant. The threshold
must then travel the very gulf the slabs opened — 0, 1, 2, 6 — while the rocks
circle through those same three holes, until it reaches 10 and becomes the
last, already crumbling, bridge. Harder than its host: twice the crossing,
three holes to steer instead of two, and a shuffle nine slides deep on top.

Checked by bounded search (19 slides): the witness is optimal at 17; nothing
wins without crossing a fragile slab, and nothing wins without the holes the
collapse opens. The relic hangs west of the exit stone 15, a one-port dead end
the witness never visits. It sits there, and not north of stone 11, because a
dead end that opens onto the middle of the road is a resting place: parked on
it, Lumen could wait for the last bridge to be slid under him and never need
the gulf at all.
"""


def build(make):
    return make(
        "veine", "braises", "volcano", "La veine de magma",
        "Sous les braises, la roche coule encore. Deux dalles ne tiendront qu’une seule course ; "
        "le seuil suivra Lumen par le gouffre qu’elles auront ouvert.",
        ["WE", "WS", None, "",
         "", "NS", "", "",
         "", "NE", "", "WS",
         "", "", "E", "NEW"],
        (1, 5, 6, 10, 11, 15, 14, 13, 9),
        marks=((0, ("brittle", None)), (1, ("fragile", None)),
               (5, ("fragile", None)), (9, ("brittle", None))),
        # One run over both fragile slabs, then the threshold stone follows
        # through the gulf they left — 1, then the old hole at 2 — while two
        # rocks trade places through the same holes to clear 6 and 10 for it.
        actions=(("walk", 9),
                 ("slide", 0, 1), ("slide", 1, 2), ("slide", 6, 5), ("slide", 5, 1),
                 ("slide", 10, 6), ("slide", 6, 5), ("slide", 2, 6), ("slide", 6, 10),
                 ("walk", 16)),
        relic=14, relic_name="le Cœur de basalte", reward="limace", rule="chain",
    )
