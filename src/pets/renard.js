/** Renard des glaces — the companion at the end of the secret passage.
 *
 * Lighter and quicker than any dog here: thin legs, a needle muzzle, pricked
 * ears that each keep their own watch, and a tail that outweighs the animal.
 * He trots with the tail held flat behind him. The moment Lumen stops he sits,
 * then winds the tail round his flank and across his forepaws and buries his
 * nose in it — a ball of fur that unrolls at the first step.
 */
import { creatureKit, trot } from './kit.js';

const lerp = (a, b, t) => a + (b - a) * t;

export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  const { orb, pill, cone, mat, group, piece, eyes, limb, chain } = kit;
  const fur = mat(palette.primary, { roughness: .97 });
  const under = mat(palette.secondary, { roughness: .95 });
  const shade = mat(palette.accent, { roughness: .88 });

  const body = group(root, 0, 0, 0);
  const spine = group(body, 0, .118, 0);
  piece(spine, pill, fur, [0, 0, 0], [.036, .05, .036]).rotation.x = Math.PI / 2;
  piece(spine, pill, under, [0, -.015, .004], [.029, .042, .029]).rotation.x = Math.PI / 2;
  piece(spine, orb, fur, [0, .004, .062], [.034, .036, .032]);
  piece(spine, orb, fur, [0, .002, -.06], [.033, .034, .03]);

  const neck = group(spine, 0, .026, .076);
  piece(neck, pill, fur, [0, .008, .012], [.019, .017, .02]).rotation.x = .7;
  // Winter ruff: the neck reads wider than the head, as on the real animal.
  for (const side of [-1, 1]) piece(neck, orb, under, [side * .019, -.004, .01], [.016, .02, .02]);

  const head = group(neck, 0, .024, .026);
  piece(head, orb, fur, [0, 0, 0], [.035, .032, .033]);
  for (const side of [-1, 1]) piece(head, orb, under, [side * .026, -.011, .01], [.017, .015, .015]);
  const muzzle = group(head, 0, -.006, .026);
  piece(muzzle, cone, fur, [0, 0, .02], [.013, .05, .012]).rotation.x = Math.PI / 2;
  piece(muzzle, orb, under, [0, -.007, .02], [.01, .007, .022]);
  piece(muzzle, orb, shade, [0, .001, .046], [.007, .006, .007]);
  const [leftEye, rightEye] = eyes(head, {
    x: .015, y: .008, z: .026, size: .0105, pupil: palette.eye ?? 0x76c8d8, glowing: true,
  });
  const ears = [-1, 1].map(side => {
    const ear = group(head, side * .02, .026, -.006);
    piece(ear, cone, fur, [0, .02, 0], [.014, .044, .009]);
    piece(ear, cone, shade, [0, .017, .0035], [.008, .03, .005]);
    return ear;
  });

  // Thick at the root and barely tapering, padded with fluff: the tail is the silhouette.
  const tail = chain(spine, { x: 0, y: .01, z: -.074, count: 7, length: .025, thickness: .03, taper: .95, colour: fur });
  const tailBase = tail.links[0].parent;
  tail.links.forEach((link, i) => {
    if (i) piece(link, orb, i > 4 ? under : fur, [0, 0, -.012], [.031 - i * .0012, .03 - i * .0012, .019]);
  });

  const legs = [
    limb(body, { x: -.024, y: .11, z: .052, thigh: .054, shin: .046, thickness: .011, colour: fur, foot: shade, footSize: .85 }),
    limb(body, { x: .024, y: .11, z: .052, thigh: .054, shin: .046, thickness: .011, colour: fur, foot: shade, footSize: .85 }),
    limb(body, { x: -.026, y: .118, z: -.052, thigh: .06, shin: .048, thickness: .0125, colour: fur, foot: shade, footSize: .9 }),
    limb(body, { x: .026, y: .118, z: -.052, thigh: .06, shin: .048, thickness: .0125, colour: fur, foot: shade, footSize: .9 }),
  ];
  const hips = legs.map(leg => leg.hip.position.y);

  let stride = 0;
  let sit = 0;
  let curl = 0;
  let blink = 3;
  return {
    expression: { head, neck, ears, tail, legs },
    ground: true,
    home: [-.62, 0, -.16],
    scale: 1.05,
    animate(time, { moving = false, speed = 0, dt = .016 } = {}) {
      // Short quick strides: more footfalls a second than any dog in the bestiary.
      stride += dt * (3.6 + speed * 12);
      sit += ((moving ? 0 : 1) - sit) * (1 - Math.exp(-dt * 5));
      // The curl only starts once he is seated, and unwinds faster than it wound.
      const wantCurl = moving ? 0 : Math.max(0, (sit - .55) / .45);
      curl += (wantCurl - curl) * (1 - Math.exp(-dt * (moving ? 7 : 2.4)));
      const drop = sit * .02 + curl * .04;
      const breath = Math.sin(time * 1.7) * curl;

      const bounce = trot(legs, stride, { lift: .9, reach: .06 + speed * .68, bounce: .015 });
      body.position.y = bounce * speed;
      legs.forEach((leg, i) => {
        const hind = i > 1;
        // Seated: haunches fold, forelegs stay planted. Curled: everything tucks under the fur.
        const seat = hind ? lerp(-.85, -1.35, curl) : lerp(0, -1.2, curl);
        const fold = hind ? lerp(1.05, 2.5, curl) : lerp(0, 2.3, curl);
        leg.hip.rotation.x = lerp(leg.hip.rotation.x, seat, sit);
        leg.knee.rotation.x = lerp(leg.knee.rotation.x, fold, sit);
        leg.ankle.rotation.x = lerp(leg.ankle.rotation.x, hind ? -.2 : 0, sit);
        leg.hip.position.y = hips[i] - drop;
      });

      spine.position.y = .118 - drop + breath * .0025;
      // The chest lifts to sit, then the whole back rounds into the ball.
      spine.rotation.x = -sit * .36 * (1 - curl) + curl * .18 + Math.sin(stride * 2) * .04 * speed;
      spine.rotation.z = Math.sin(stride) * .035 * speed;
      spine.scale.setScalar(1 + breath * .015);

      // Flat behind him at a trot, sweeping the ground once seated, then wound
      // round the flank and across the forepaws with the tip under his nose.
      tail.wave(.08 + speed * .1 + sit * (1 - curl) * .22, time * (1.8 + speed * 3) + stride * .5, 'y');
      tailBase.rotation.x = lerp(.12 - speed * .1, lerp(-.75, -.55, curl), sit);
      tail.links.forEach((link, i) => {
        link.rotation.y -= curl * (.3 + i * .05);
        link.rotation.x = Math.sin(stride * 2 - i * .5) * .05 * speed * (1 - sit) + (i === 1 ? curl * .5 : 0);
      });
      tail.links.at(-1).rotation.y += Math.sin(time * 5.3) * .18 * sit;

      const idleLook = (1 - speed) * (1 - curl);
      neck.rotation.x = -.08 - speed * .14 + sit * .15 + curl * .95;
      neck.rotation.y = curl * .35;
      head.rotation.x = Math.sin(stride * 2 + .6) * .05 * speed + Math.sin(time * .8) * .08 * idleLook + curl * .45;
      head.rotation.y = Math.sin(time * .66) * .42 * idleLook + curl * .55;
      head.rotation.z = curl * .25;

      ears.forEach((ear, i) => {
        const own = time * (1.35 + i * .47) + i * 2.6;
        // Each ear keeps its own watch: a slow swivel, and a sharp flick now and then.
        const flick = Math.max(0, Math.sin(own * 1.9)) ** 10 * .35;
        ear.rotation.y = (i ? -1 : 1) * (Math.sin(own) * .38 * (1 - speed * .5) + flick);
        ear.rotation.x = -.08 + speed * .28 - curl * .55 + flick * .3;
        ear.rotation.z = (i ? -1 : 1) * (.12 + curl * .2);
      });

      if (time > blink) blink = time + 2.6 + (stride % 1.5);
      const shut = Math.max(Math.max(0, 1 - Math.abs(time - blink + 2.6) * 14), curl * .9);
      // Almond eyes, narrowed to slits inside the ball.
      leftEye.scale.y = rightEye.scale.y = .85 * (1 - shut);
    },
  };
}
