/** Wyrm de jade — the wingless familiar.
 *
 * One wave runs from muzzle to tail and never stops. It quickens and the body
 * draws itself out when Lumen walks; when he rests the wyrm winds back into a
 * slow spiral and hangs there, barbels drifting.
 */
import { creatureKit } from './kit.js';

const LINKS = 12;
const SEGMENT = .032;
const TAPER = .935;
/** Phase step per link: one crest at a time must fit the body, never two. */
const LAG = .58;
/** The resting spiral: bend per link, and the sideways drift that turns the
 *  coil into a corkscrew — a flat ring would vanish seen edge-on. */
const CURL = -.44;
const DRIFT = .2;

export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  const { orb, cone, blade, mat, glow, group, piece, eyes, chain } = kit;
  const jade = mat(palette.primary, { roughness: .46, metalness: .14 });
  const deep = mat(palette.secondary, { roughness: .64 });
  const pale = mat(palette.accent, { roughness: .38 });
  const spark = glow(palette.eye);
  const leaf = blade([[0, 0], [.006, .024], [.02, .03], [.03, .005]], .004);

  const serpent = group(root, 0, .01, .15);
  const spine = chain(serpent, { count: LINKS, length: SEGMENT, thickness: .026, taper: TAPER, colour: jade });
  // A dark belly the whole length and a crest that picks up where the mane ends:
  // two unbroken lines are what make a coiled rope read as an animal this small.
  spine.links.forEach((link, i) => {
    const girth = TAPER ** i;
    piece(link, orb, deep, [0, -.021 * girth, -SEGMENT * .5], [.018 * girth, .011 * girth, .026]);
    if (i > 1) piece(link, cone, pale, [0, .028 * girth, -SEGMENT * .5], [.005, .026 * girth, .011]).rotation.x = -.35;
  });
  piece(spine.links.at(-1), cone, pale, [0, 0, -.03], [.026, .05, .008]).rotation.x = -Math.PI / 2;

  // Fins are the only limbs a wyrm has: they scull, and they read the wave.
  const fins = [];
  for (let i = 1; i < LINKS; i += 3) {
    const girth = TAPER ** i;
    for (const side of [-1, 1]) {
      const flap = group(spine.links[i], side * .018 * girth, -.004, -SEGMENT * .5);
      piece(flap, leaf, pale, [0, 0, 0], [girth * .8, girth * .8, 1]).rotation.y = Math.PI / 2;
      fins.push({ flap, side, i });
    }
  }

  // Half again as wide as the body it sits on: below that, a serpent has no head.
  const head = group(spine.links[0], 0, .006, .032);
  piece(head, orb, jade, [0, 0, 0], [.036, .033, .042]);
  piece(head, orb, jade, [0, -.006, .036], [.024, .02, .028]);
  piece(head, orb, deep, [0, -.019, .03], [.019, .011, .026]);
  piece(head, orb, deep, [0, .004, .055], [.015, .012, .01]);
  piece(head, orb, spark, [0, -.032, .034], [.01, .01, .01]);
  for (const side of [-1, 1]) {
    piece(head, orb, deep, [side * .008, .008, .053], [.005, .004, .006]);
    const horn = group(head, side * .018, .024, -.008);
    // Swept back off the brow, the way a stag carries its antlers.
    horn.rotation.set(-.9, -side * .3, 0);
    piece(horn, cone, pale, [0, .029, 0], [.0075, .058, .0075]);
    piece(horn, cone, pale, [side * .009, .044, -.007], [.005, .026, .005]).rotation.z = -side * .5;
  }
  const [leftEye, rightEye] = eyes(head, { x: .022, y: .012, z: .029, size: .0105, pupil: palette.eye, glowing: true });

  // The mane keeps drifting after the head has turned, which sells the swimming.
  const mane = [];
  for (let i = 0; i < 2; i++) {
    for (const side of [-1, 0, 1]) {
      const strand = group(spine.links[i], side * .013, .022 - i * .003, -SEGMENT * .3);
      piece(strand, leaf, side ? deep : pale, [0, 0, 0], [.9 - i * .2, 1.15 - i * .25, 1]).rotation.y = Math.PI / 2;
      mane.push({ strand, side, i });
    }
  }

  const barbels = [-1, 1].map(side => {
    const stem = group(head, side * .015, -.004, .05);
    stem.rotation.set(-.15, Math.PI - side * .42, 0);
    return chain(stem, { count: 4, length: .02, thickness: .0042, taper: .84, colour: pale });
  });

  let swim = 0;
  let coil = 1;
  return {
    ground: false,
    home: [-.62, 0, -.18],
    animate(time, { moving = false, speed = 0, dt = .016 } = {}) {
      swim += dt * (1.9 + speed * 4.2);
      // Winding and unwinding is a state, not a pose swap: it eases either way.
      coil += ((moving ? 0 : 1) - coil) * (1 - Math.exp(-dt * 3.2));
      const amp = .12 + speed * .26;
      const stretch = -SEGMENT * (1 + (1 - coil) * .24);
      spine.links.forEach((link, i) => {
        const phase = swim - i * LAG;
        link.rotation.y = coil * DRIFT + Math.sin(phase) * amp;
        // A quarter turn behind the lateral bend, so the wave is a helix, not an S.
        link.rotation.x = coil * CURL + Math.cos(phase) * amp * .62;
        if (i) link.position.z = stretch;
      });
      head.rotation.y = Math.sin(swim + .9) * .24 + Math.sin(time * .47) * .3 * coil;
      // Curled up, the muzzle tucks down towards the middle of the spiral.
      head.rotation.x = -.08 + coil * .34 + Math.cos(swim + .9) * .2;
      fins.forEach(({ flap, side, i }) => {
        const phase = swim - i * LAG;
        flap.rotation.z = side * (-.8 - Math.sin(phase) * .5);
        flap.rotation.x = Math.cos(phase * 1.4) * .34;
      });
      mane.forEach(({ strand, side, i }) => {
        strand.rotation.z = side * .5 - Math.sin(swim - i * LAG) * .26;
        strand.rotation.x = -.2 - speed * .5 + Math.sin(time * 1.6 + i * .9) * .22;
      });
      barbels.forEach((barbel, i) => {
        barbel.wave(.34 + speed * .2, time * 1.9 + i * 2.4, 'y');
        barbel.links[0].rotation.x = -.22 + Math.sin(time * 1.25 + i * 1.1) * .28;
      });
      // Lidless most of the time: the nictitating veil sweeps once in a while.
      const veil = Math.max(0, Math.sin(time * .87) * 26 - 25);
      leftEye.scale.y = rightEye.scale.y = 1 - veil * .85;
    },
  };
}
