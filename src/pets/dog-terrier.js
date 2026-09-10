/** Terrier des fouilles — the digger of the pack.
 *
 * Clipped, jerky trot beside Lumen; the instant Lumen halts, the terrier rakes
 * the stone with alternating forepaws, muzzle down, then lifts its head to see
 * what came up and starts over. Its wiry coat shivers out of step with the rest.
 */
import { creatureKit, trot } from './kit.js';

/** A terrier never glides: warping the stride phase snaps each swing short. */
const snap = phase => phase + Math.sin(phase * 2) * .42;
/** 0 → 1 → 0 across a window, so a burst opens and closes instead of switching on. */
const swell = (value, from, to) => Math.sin(Math.PI * Math.min(1, Math.max(0, (value - from) / (to - from))));

export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  const { orb, pill, cone, box, mat, group, piece, eyes, limb, chain } = kit;
  const fur = mat(palette.primary, { roughness: .98, flatShading: true });
  const pale = mat(palette.secondary, { roughness: .95 });
  const dark = mat(palette.accent, { roughness: .92, flatShading: true });

  const body = group(root, 0, 0, 0);
  const spine = group(body, 0, .098, 0);
  piece(spine, pill, fur, [0, 0, 0], [.044, .046, .042]).rotation.x = Math.PI / 2;
  piece(spine, pill, pale, [0, -.02, .008], [.035, .038, .032]).rotation.x = Math.PI / 2;
  piece(spine, orb, fur, [0, .006, -.068], [.042, .04, .033]);

  /** Each tuft owns its pivot so the coat can shiver out of step with itself. */
  function tuft(parent, [x, y, z], [roll, pitch], size, surface) {
    const node = group(parent, x, y, z);
    node.rotation.set(pitch, 0, roll);
    piece(node, cone, surface, [0, size * .5, 0], [size * .44, size, size * .3]);
    return { node, roll, pitch };
  }
  const coat = [
    tuft(spine, [0, .044, .036], [.12, -.55], .034, fur),
    tuft(spine, [-.03, .036, .004], [-.62, -.18], .03, dark),
    tuft(spine, [.032, .034, -.008], [.58, .14], .032, fur),
    tuft(spine, [0, .039, -.034], [-.16, .46], .03, fur),
    tuft(spine, [-.036, .014, -.046], [1.15, .22], .028, dark),
    tuft(spine, [.036, .014, -.044], [-1.12, .2], .028, fur),
    tuft(spine, [-.02, .04, -.07], [.24, -.92], .032, dark),
    tuft(spine, [-.026, .034, .022], [.62, .5], .03, fur),
    tuft(spine, [.026, .034, .022], [-.72, .86], .03, dark),
  ];

  const neck = group(spine, 0, .026, .066);
  // A ruff at the throat: without it the skull hangs clear of the chest.
  piece(neck, orb, fur, [0, .004, .004], [.031, .026, .027]);
  const head = group(neck, 0, .02, .022);
  piece(head, orb, fur, [0, 0, 0], [.036, .034, .033]);
  // Square muzzle: a box reads blunt where a cone would read feline.
  piece(head, box, pale, [0, -.012, .04], [.032, .024, .044]);
  piece(head, box, dark, [0, -.006, .064], [.015, .011, .01]);
  const beard = tuft(head, [0, -.026, .042], [0, 1.94], .03, pale);
  const [leftEye, rightEye] = eyes(head, { x: .019, y: .01, z: .026, size: .011, pupil: palette.eye ?? 0x33291f });
  const brows = [-1, 1].map(side => {
    const brow = group(head, side * .019, .026, .022);
    piece(brow, box, dark, [0, 0, 0], [.018, .009, .013]);
    return brow;
  });
  // Drop ears: a flat leaf down the cheek, its tip on its own pivot so it lags.
  const ears = [-1, 1].map(side => {
    const ear = group(head, side * .028, .028, .004);
    piece(ear, pill, fur, [0, -.018, 0], [.007, .014, .016]);
    const tip = group(ear, 0, -.038, 0);
    piece(tip, orb, dark, [0, -.016, .003], [.0085, .018, .015]);
    return { ear, tip };
  });

  const tail = chain(spine, { x: 0, y: .03, z: -.076, count: 3, length: .028, thickness: .011, taper: .8, colour: fur });
  piece(tail.links.at(-1), orb, pale, [0, 0, -.026], [.009, .009, .011]);

  const legs = [
    limb(body, { x: -.028, y: .084, z: .048, thigh: .04, shin: .034, thickness: .015, colour: fur, foot: pale }),
    limb(body, { x: .028, y: .084, z: .048, thigh: .04, shin: .034, thickness: .015, colour: fur, foot: pale }),
    limb(body, { x: -.031, y: .086, z: -.05, thigh: .044, shin: .034, thickness: .017, colour: fur, foot: pale }),
    limb(body, { x: .031, y: .086, z: -.05, thigh: .044, shin: .034, thickness: .017, colour: fur, foot: pale }),
  ];

  let stride = 0;
  let dig = 0;
  let settle = 1;
  let jolt = 0;
  return {
    ground: true,
    home: [-.62, 0, .06],
    scale: 1.05,
    animate(time, { moving = false, speed = 0, footfall = false, dt = .016 } = {}) {
      settle += ((moving ? 0 : 1) - settle) * (1 - Math.exp(-dt * 5.5));
      stride += dt * (4.6 + speed * 9.4);
      // Burst and swipe run off the same cycle, so a dig never opens mid-stroke.
      dig = moving ? 0 : dig + dt;
      const cycle = dig % 2.3;
      const rake = Math.min(1, swell(cycle, 0, 1.35) * 2.4) * settle;
      const perk = swell(cycle, 1.5, 2.25) * settle;
      const claw = cycle * 24;
      if (footfall) jolt = 1;
      jolt *= Math.exp(-dt * 9);

      const bounce = trot(legs, snap(stride), { lift: .68, reach: (.07 + speed * .62) * (1 - settle * .72), bounce: .014 });
      body.position.y = bounce * speed;
      body.rotation.z = Math.sin(snap(stride)) * .05 * speed;
      // Forepaws rake in alternation while the hindquarters stay planted and high.
      for (let i = 0; i < 2; i++) {
        const swipe = Math.sin(claw + i * Math.PI);
        legs[i].hip.rotation.x = legs[i].hip.rotation.x * (1 - rake) - (.5 + swipe * .78) * rake;
        // Elbows out, so the paws work either side of the muzzle instead of through it.
        legs[i].hip.rotation.z = (i ? 1 : -1) * rake * .38;
        legs[i].knee.rotation.x += (.62 + swipe * .5) * rake;
        legs[i].ankle.rotation.x = -legs[i].hip.rotation.x * .4 - rake * .55;
      }
      legs[2].hip.rotation.x -= rake * .16;
      legs[3].hip.rotation.x -= rake * .16;

      spine.rotation.x = rake * .38 - perk * .12 + Math.sin(stride * 2) * .055 * speed;
      spine.rotation.y = Math.sin(snap(stride)) * .07 * speed;
      spine.position.y = .098 - rake * .016 + perk * .006;
      neck.rotation.x = rake * .62 - perk * .64 - speed * .12 + Math.sin(time * 2.6) * .03;
      head.rotation.x = rake * .4 - perk * .34 + Math.sin(claw) * .06 * rake;
      head.rotation.y = Math.sin(time * .9) * .26 * (1 - rake) * (1 - speed) - Math.sin(snap(stride)) * .07 * speed;
      head.rotation.z = Math.sin(claw * .5) * .07 * rake;

      coat.forEach((hair, i) => {
        const shiver = Math.sin(time * 9.5 + i * 1.9) * (.13 + speed * .46) + Math.sin(claw + i) * .22 * rake;
        hair.node.rotation.z = hair.roll + shiver;
        hair.node.rotation.x = hair.pitch + shiver * .55;
      });
      beard.node.rotation.x = beard.pitch + rake * .3 + Math.sin(claw * .7) * .18 * rake;

      ears.forEach(({ ear, tip }, i) => {
        const side = i ? 1 : -1;
        // The leaf swings on the stride; its tip answers a beat later and on every footfall.
        const flop = Math.sin(snap(stride) + i * Math.PI) * (.14 + speed * .52) + Math.sin(claw * .6 + i) * .3 * rake;
        const late = Math.sin(snap(stride) - .9 + i * Math.PI) * (.12 + speed * .5) + Math.sin(claw * .6 - 1 + i) * .26 * rake;
        ear.rotation.x = .24 + flop * .5 + jolt * .28 - perk * .3;
        ear.rotation.z = side * (.34 + flop * .26 + perk * .2);
        tip.rotation.x = late * .7 + jolt * .5;
        tip.rotation.z = side * (.12 + late * .3);
      });
      brows.forEach((brow, i) => {
        const side = i ? 1 : -1;
        brow.position.y = .026 + perk * .009 - rake * .005;
        brow.rotation.z = side * (.2 - rake * .46 + perk * .3);
      });
      // Eyes narrow while he works, wide open the moment he checks his hole.
      leftEye.scale.y = rightEye.scale.y = 1 - rake * .42 + perk * .12;

      tail.wave(.055 + speed * .05 + rake * .06, time * 24, 'y');
      // Rump down, tail up: raking tips the spine forward, the tail holds its flag.
      tail.links[0].rotation.x = 1.02 + speed * .2 - perk * .12 + rake * .22;
    },
  };
}
