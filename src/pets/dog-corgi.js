/** Corgi baroudeur — a long low back, stub legs, and a tail that never rests.
 *
 * He answers distance with cadence rather than reach: three hurried steps for
 * every stride of Lumen's, each one rolling through hindquarters that arrive a
 * beat late. Halted, he does not settle — he treads on the spot, tongue out,
 * tail beating harder than ever.
 */
import { creatureKit, trot } from './kit.js';

export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  const { orb, pill, mat, group, piece, eyes, limb, chain } = kit;
  const fur = mat(palette.primary, { roughness: .95 });
  const cream = mat(palette.secondary, { roughness: .92 });
  const mark = mat(palette.accent, { roughness: .86 });

  // The barrel is three times as long as it is deep and rides a paw's width off
  // the stone: everything else is hung on it so he reads long before he reads dog.
  const spine = group(root, 0, .06, 0);
  piece(spine, pill, fur, [0, 0, 0], [.042, .082, .042]).rotation.x = Math.PI / 2;
  piece(spine, orb, cream, [0, -.021, .004], [.036, .023, .094]);

  const rump = group(spine, 0, .004, -.096);
  piece(rump, orb, fur, [0, 0, 0], [.05, .048, .046]);
  piece(rump, orb, mark, [0, .034, .004], [.036, .015, .034]);

  const chest = group(spine, 0, .004, .092);
  piece(chest, orb, fur, [0, .002, 0], [.046, .043, .04]);
  piece(chest, orb, cream, [0, -.016, .016], [.036, .032, .03]);

  // A ruff stands in for a neck, so the skull is carried low and forward, set
  // into the shoulders rather than perched above them.
  const neck = group(chest, 0, .022, .026);
  piece(neck, orb, fur, [0, -.002, -.004], [.032, .03, .028]);
  piece(neck, orb, cream, [0, -.018, .012], [.026, .02, .024]);

  const head = group(neck, 0, .017, .016);
  piece(head, orb, fur, [0, 0, 0], [.038, .035, .034]);
  for (const side of [-1, 1]) piece(head, orb, fur, [side * .028, -.008, .004], [.018, .02, .02]);
  piece(head, orb, cream, [0, -.014, .024], [.024, .019, .024]);
  piece(head, orb, mark, [0, -.005, .042], [.01, .009, .009]);
  const [leftEye, rightEye] = eyes(head, { x: .021, y: .009, z: .026, size: .012, pupil: palette.eye ?? 0x4a3324 });
  const tongue = group(head, 0, -.024, .034);
  piece(tongue, orb, mark, [0, -.008, .006], [.008, .004, .014]);
  const ears = [-1, 1].map(side => {
    const ear = group(head, side * .024, .028, -.006);
    piece(ear, orb, fur, [0, .024, 0], [.019, .028, .01]);
    piece(ear, orb, cream, [0, .02, .006], [.011, .019, .005]);
    return ear;
  });

  // A stub carried upright and finished with a pompon, so the beat reads as a
  // flag over the rump rather than a sweep across the back.
  const tailBase = group(rump, 0, .034, -.024);
  tailBase.rotation.x = 1.32;
  const tail = chain(tailBase, { count: 2, length: .016, thickness: .019, taper: .86, colour: fur });
  piece(tail.links.at(-1), orb, cream, [0, 0, -.023], [.027, .027, .027]);

  // Forelegs hang off the barrel, hind legs off the rump, so the roll of the
  // hindquarters is something the back feet have to walk through.
  const legs = [
    limb(spine, { x: -.032, y: -.018, z: .078, thigh: .025, shin: .018, thickness: .019, colour: fur, foot: cream, footSize: .58 }),
    limb(spine, { x: .032, y: -.018, z: .078, thigh: .025, shin: .018, thickness: .019, colour: fur, foot: cream, footSize: .58 }),
    limb(rump, { x: -.034, y: -.02, z: .01, thigh: .027, shin: .018, thickness: .021, colour: fur, foot: cream, footSize: .58 }),
    limb(rump, { x: .034, y: -.02, z: .01, thigh: .027, shin: .018, thickness: .021, colour: fur, foot: cream, footSize: .58 }),
  ];

  let stride = 0;
  let perk = 0;
  let blink = 1.2;
  return {
    expression: { head, ears, tail: tailBase },
    ground: true,
    home: [-.62, 0, -.14],
    animate(time, { speed = 0, footfall = false, dt = .016 } = {}) {
      stride += dt * (9.2 + speed * 16);
      // Standing still only shrinks the fidget; it never switches it off.
      const busy = .34 + speed * .66;
      if (footfall) perk = 1;
      perk = Math.max(0, perk - dt * 2.8);
      const hop = trot(legs, stride, { lift: .46, reach: .12 + speed * .36, bounce: .01 });
      spine.position.y = .06 + hop * busy;
      const swing = Math.sin(stride);
      // The heavy hindquarters answer half a beat late: that lag is the waddle.
      const roll = Math.sin(stride - .6);
      rump.rotation.z = roll * (.12 + speed * .2);
      rump.rotation.y = roll * (.1 + speed * .17);
      rump.position.y = .004 + Math.abs(roll) * .007 * busy;
      spine.rotation.z = -swing * .06 * busy;
      spine.rotation.y = -swing * .04 * busy;
      chest.rotation.x = Math.sin(stride * 2) * .07 * busy;
      neck.rotation.x = -.12 * speed - perk * .14 + Math.sin(stride * 2) * .06 * busy;
      head.rotation.x = Math.sin(stride * 2 + 1) * .08 * busy;
      head.rotation.y = Math.sin(time * 1.3) * .32 * (1 - speed) + swing * .07 * speed;
      // The stub is the loudest thing about him, and loudest of all at rest.
      const beat = time * (19 + speed * 8);
      tailBase.rotation.y = Math.sin(beat) * (1.16 - speed * .24 + perk * .16);
      tail.wave(.5, beat - .9, 'y');
      tongue.rotation.x = .34 + Math.sin(time * (7 + speed * 4)) * .3;
      // Splayed outward at ease; every footfall of Lumen's pricks them forward.
      ears.forEach((ear, i) => {
        ear.rotation.x = -.05 + perk * .3 + Math.sin(stride + i * Math.PI) * .13 * busy;
        ear.rotation.z = (i ? -1 : 1) * (.12 + Math.sin(time * 1.7 + i * 2.3) * .16 * (1 - speed * .6));
      });
      blink -= dt;
      if (blink < -.1) blink = 1.8 + (stride % 1.7);
      const shut = Math.max(0, 1 - Math.abs(blink) * 15);
      leftEye.scale.y = rightEye.scale.y = 1 - shut * .88;
    },
  };
}
