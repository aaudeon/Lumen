/** Lynx de brume — le traqueur.
 *
 * Il ne trotte pas : une seule patte quitte le sol à la fois, un quart de cycle
 * après la précédente, et l'omoplate roule avec elle. À l'arrêt la nuque
 * s'affaisse, la tête balaie le sol et les pinceaux d'oreilles frémissent.
 */
import { creatureKit } from './kit.js';

/** Cycle offsets, in leg order (front left, front right, hind left, hind right),
 *  that lift the paws in the cat's lateral sequence: hind left, front left,
 *  hind right, front right — never the diagonal pair of a trot. */
const BEATS = [.75, .25, 0, .5];
/** Under a quarter of the cycle in the air, so three paws are always planted. */
const SWING = .23;

function prowl(legs, phase, { lift, reach }) {
  legs.forEach((leg, i) => {
    const cycle = (phase / (Math.PI * 2) + BEATS[i]) % 1;
    const swinging = cycle < SWING;
    const portion = swinging ? cycle / SWING : (cycle - SWING) / (1 - SWING);
    // Snap the paw forward and high, then drive it back slowly under the weight.
    leg.hip.rotation.x = swinging ? Math.cos(Math.PI * portion) * reach : (portion * 2 - 1) * reach;
    leg.knee.rotation.x = swinging ? Math.sin(Math.PI * portion) * lift : lift * .04;
    // The pad stays flat on the ground whatever the hip and knee are doing.
    leg.ankle.rotation.x = -(leg.hip.rotation.x + leg.knee.rotation.x) * .6;
  });
}

export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  const { orb, pill, cone, mat, group, piece, eyes, limb, chain } = kit;
  const fur = mat(palette.primary, { roughness: .97 });
  const pale = mat(palette.secondary, { roughness: .95 });
  const slate = mat(palette.accent, { roughness: .86 });

  // High on the leg: the back rides at .22 and the belly clears .09 of daylight.
  const body = group(root, 0, 0, 0);
  const spine = group(body, 0, .158, 0);
  piece(spine, pill, fur, [0, 0, .018], [.062, .044, .056]).rotation.x = Math.PI / 2;
  piece(spine, orb, fur, [0, -.006, .062], [.07, .05, .046]);
  piece(spine, orb, fur, [0, -.002, -.062], [.064, .054, .056]);
  piece(spine, pill, pale, [0, -.02, .01], [.05, .04, .042]).rotation.x = Math.PI / 2;
  for (let i = 0; i < 2; i++) piece(spine, orb, slate, [0, .046, .01 - i * .05], [.042, .012, .018]);

  // Shoulder blades ride on their own pivot so the walk can roll through them.
  const blades = [-1, 1].map(side => {
    const blade = group(spine, side * .03, .052, .054);
    piece(blade, orb, fur, [side * .016, -.02, 0], [.028, .034, .03]);
    return { blade, side };
  });

  const neck = group(spine, 0, .04, .078);
  piece(neck, pill, fur, [0, .006, .016], [.036, .026, .036]).rotation.x = Math.PI / 2.6;
  const head = group(neck, 0, .028, .042);
  piece(head, orb, fur, [0, 0, 0], [.05, .046, .044]);
  piece(head, orb, pale, [0, -.016, .034], [.03, .024, .022]);
  piece(head, orb, slate, [0, -.01, .05], [.012, .009, .009]);
  // The ruff hangs off the cheeks and answers the head half a beat late.
  const ruffs = [-1, 1].map(side => {
    const ruff = group(head, side * .04, -.006, .004);
    piece(ruff, cone, pale, [0, -.028, 0], [.03, .056, .022]).rotation.z = side * .5;
    piece(ruff, cone, fur, [side * .01, -.044, -.004], [.018, .04, .015]).rotation.z = side * .7;
    return { ruff, side };
  });
  const [leftEye, rightEye] = eyes(head, {
    x: .023, y: .012, z: .036, size: .014, white: palette.secondary, pupil: palette.eye, glowing: true,
  });

  const ears = [-1, 1].map(side => {
    const ear = group(head, side * .03, .036, -.004);
    piece(ear, cone, fur, [0, .016, 0], [.022, .038, .014]);
    piece(ear, cone, slate, [0, .012, .005], [.012, .024, .006]);
    // The tuft is the lynx's signature: a long brush that never quite settles.
    const tuft = group(ear, 0, .034, 0);
    piece(tuft, pill, slate, [0, .014, 0], [.0035, .012, .0035]);
    piece(tuft, pill, slate, [0, .032, -.002], [.0025, .008, .0025]);
    return { ear, tuft, side };
  });

  // Short and heavy: three thick links, not a whip.
  const tail = chain(spine, { x: 0, y: .034, z: -.09, count: 3, length: .026, thickness: .028, taper: .92, colour: fur });
  piece(tail.links.at(-1), orb, slate, [0, 0, -.026], [.026, .026, .022]);

  const legs = [
    limb(body, { x: -.04, y: .158, z: .05, thigh: .076, shin: .066, thickness: .021, colour: fur, foot: pale, footSize: .95 }),
    limb(body, { x: .04, y: .158, z: .05, thigh: .076, shin: .066, thickness: .021, colour: fur, foot: pale, footSize: .95 }),
    limb(body, { x: -.042, y: .17, z: -.062, thigh: .084, shin: .07, thickness: .024, colour: fur, foot: pale, footSize: .9 }),
    limb(body, { x: .042, y: .17, z: -.062, thigh: .084, shin: .07, thickness: .024, colour: fur, foot: pale, footSize: .9 }),
  ];

  let stride = 0;
  let hunt = 0;
  let blink = 2.4;
  return {
    expression: { head, ears, tail },
    ground: true,
    home: [-.66, 0, -.2],
    scale: 1.15,
    animate(time, { moving = false, speed = 0, dt = .016 } = {}) {
      stride += dt * (1.05 + speed * 3.8);
      // Hunting is the resting posture: it settles in once Lumen stands still.
      hunt += ((moving ? 0 : 1) - hunt) * (1 - Math.exp(-dt * 3.4));
      prowl(legs, stride, { lift: .05 + speed * .74, reach: .04 + speed * .46 });
      const weight = Math.sin(stride - .16);
      // Paws land on the midline, so the whole animal rolls over its standing side.
      body.position.x = weight * .012 * speed;
      body.position.y = Math.abs(Math.cos(stride * 2)) * .012 * speed;
      body.rotation.z = -weight * .09 * speed;
      spine.rotation.y = weight * .13 * speed;
      spine.rotation.x = hunt * .1 - speed * .05;
      blades.forEach(({ blade, side }, i) => {
        // Each scapula rides its own foreleg and lifts clear of the spine on the reach.
        const swing = legs[i].hip.rotation.x;
        blade.rotation.x = swing * .8;
        blade.rotation.z = side * weight * .12 * speed;
        blade.position.y = .052 + Math.max(0, -swing) * .04 + hunt * .006;
      });
      // Neck sags and the head hangs low; at rest it sweeps the ground, slow and wide.
      const sweep = Math.sin(time * .78);
      neck.position.y = .04 - hunt * .014;
      neck.rotation.x = .16 + hunt * .28 - speed * .08;
      neck.rotation.y = sweep * .2 * hunt;
      head.rotation.x = -.1 + hunt * .06 + Math.sin(stride * 2) * .05 * speed;
      head.rotation.y = sweep * (.44 * hunt + .08) - weight * .13 * speed;
      head.rotation.z = -sweep * .22 * hunt;
      ruffs.forEach(({ ruff, side }, i) => {
        ruff.rotation.y = -head.rotation.y * .4;
        ruff.rotation.z = side * (.1 + hunt * .12) + Math.sin(time * 1.9 + i * 3.1) * .06;
        ruff.rotation.x = .08 + hunt * .14;
      });
      ears.forEach(({ ear, tuft, side }, i) => {
        ear.rotation.z = Math.sin(time * 1.1 + i * 2.4) * .1;
        ear.rotation.x = -.08 - head.rotation.y * side * .4;
        // The brushes buzz on their own, fast and short, and lag the head sweep.
        tuft.rotation.x = Math.sin(time * 11.2 + i * 1.9) * .24 - .1;
        tuft.rotation.z = Math.sin(time * 14.3 + i) * .18 - head.rotation.y * .8;
      });
      // A stub tail does not lash: it rides level, then shivers in short bursts.
      const flick = Math.max(0, Math.sin(time * 1.45)) ** 8;
      tail.wave(.04 + flick * .38, time * 16, 'y');
      tail.links[0].rotation.x = .34 - speed * .28 - flick * .2;
      if (time > blink) { blink = time + 3.1 + (stride % 2); }
      const shut = Math.max(0, 1 - Math.abs(time - blink + 3.1) * 12);
      leftEye.scale.y = rightEye.scale.y = 1 - shut * .9;
    },
  };
}
