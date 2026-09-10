/** Chat tigré — the reference familiar.
 *
 * Trots beside Lumen with a diagonal gait, sits back on its haunches when he
 * stops, and never stops flicking its tail. Ears turn on their own schedule.
 */
import { creatureKit, trot } from './kit.js';

export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  const { box, orb, pill, cone, mat, group, piece, eyes, limb, chain } = kit;
  const fur = mat(palette.primary, { roughness: .96 });
  const belly = mat(palette.secondary, { roughness: .95 });
  const mark = mat(palette.accent, { roughness: .9 });

  const body = group(root, 0, 0, 0);
  const spine = group(body, 0, .105, 0);
  piece(spine, pill, fur, [0, 0, 0], [.052, .055, .052]).rotation.x = Math.PI / 2;
  piece(spine, pill, belly, [0, -.018, .01], [.044, .04, .044]).rotation.x = Math.PI / 2;
  // Tabby bands across the back.
  for (let i = 0; i < 3; i++) piece(spine, box, mark, [0, .051, .05 - i * .048], [.10, .006, .015]);

  const neck = group(spine, 0, .028, .085);
  piece(neck,pill,fur,[0,.008,.012],[.025,.019,.026]).rotation.x=.6;
  const head = group(neck, 0, .022, .026);
  piece(head, orb, fur, [0, 0, 0], [.047, .042, .044]);
  piece(head, orb, belly, [0, -.014, .034], [.028, .022, .022]);
  piece(head, orb, mark, [0, -.006, .05], [.011, .008, .009]);
  for (const side of [-1, 1]) {
    piece(head, orb, fur, [side * .034, .004, .02], [.02, .022, .016]);
    for (let w = 0; w < 3; w++) {
      piece(head, pill, belly, [side * .038, -.006 + w * .006, .04], [.002, .022, .002]).rotation.z = Math.PI / 2 + side * (w - 1) * .22;
    }
  }
  const [leftEye, rightEye] = eyes(head, { x: .021, y: .008, z: .036, size: .0135, pupil: palette.eye ?? 0x8fd07a });
  const ears = [-1, 1].map(side => {
    const ear = group(head, side * .026, .034, -.002);
    piece(ear, cone, fur, [0, .014, 0], [.021, .034, .014]);
    piece(ear, cone, mark, [0, .011, .004], [.012, .022, .006]);
    return ear;
  });

  const tail = chain(spine, { x: 0, y: .022, z: -.055, count: 5, length: .034, thickness: .019, taper: .88, colour: fur });
  piece(tail.links.at(-1), orb, mark, [0, 0, -.03], [.016, .016, .022]);

  const legs = [
    limb(body, { x: -.032, y: .092, z: .046, thigh: .05, shin: .04, thickness: .017, colour: fur, foot: belly }),
    limb(body, { x: .032, y: .092, z: .046, thigh: .05, shin: .04, thickness: .017, colour: fur, foot: belly }),
    limb(body, { x: -.034, y: .096, z: -.05, thigh: .056, shin: .042, thickness: .02, colour: fur, foot: belly }),
    limb(body, { x: .034, y: .096, z: -.05, thigh: .056, shin: .042, thickness: .02, colour: fur, foot: belly }),
  ];

  let stride = 0;
  let sit = 0;
  let blink = 3;
  return {
    ground: true,
    home: [-.62, 0, -.16],
    scale: 1.15,
    animate(time, { moving = false, speed = 0, dt = .016 } = {}) {
      stride += dt * (3.2 + speed * 7.5);
      // Sitting is a posture, not a pose swap: it eases in when Lumen stops.
      sit += ((moving ? 0 : 1) - sit) * (1 - Math.exp(-dt * 4.5));
      const bounce = trot(legs, stride, { lift: .55, reach: .62 * speed + .05, bounce: .008 });
      body.position.y = bounce * speed;
      // Haunches drop, forelegs stay straight, chest lifts: a cat sitting down.
      legs[2].hip.rotation.x += sit * 1.15;
      legs[3].hip.rotation.x += sit * 1.15;
      legs[2].knee.rotation.x += sit * 1.5;
      legs[3].knee.rotation.x += sit * 1.5;
      legs[0].hip.rotation.x *= 1 - sit;
      legs[1].hip.rotation.x *= 1 - sit;
      spine.rotation.x = -sit * .42 + Math.sin(stride * 2) * .035 * speed;
      spine.position.y = .105 - sit * .026;
      // The tail lashes when idle and streams out when running.
      tail.wave(.16 + sit * .2, time * (2.2 + speed * 2), 'y');
      tail.links[0].rotation.x = -.5 + sit * .75 - speed * .45;
      neck.rotation.x = sit * .2 - speed * .18;
      head.rotation.y = Math.sin(time * .62) * .34 * (1 - speed);
      head.rotation.x = Math.sin(time * .9) * .1 * (1 - speed);
      ears.forEach((ear, i) => {
        ear.rotation.z = Math.sin(time * 1.4 + i * 2.1) * .16;
        ear.rotation.x = -.1 - Math.max(0, Math.sin(time * .5 + i)) * .25;
      });
      if (time > blink) { blink = time + 2.4 + (stride % 2); }
      const shut = Math.max(0, 1 - Math.abs(time - blink + 2.4) * 14);
      leftEye.scale.y = rightEye.scale.y = 1 - shut * .9;
    },
  };
}
