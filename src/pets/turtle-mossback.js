/** Tortue moussue — a shell the forest moved into.
 *
 * She keeps the slowest gait of the menagerie: one long stride, and the shell
 * rolling half a beat behind it. Hurry her and she folds head, legs and tail
 * into the dome; stop, and she unfolds nine times slower than she went in.
 */
import { creatureKit, trot } from './kit.js';

export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  const { orb, cone, pill, disc, dome, blade, mat, group, piece, eyes, limb } = kit;
  const domeGeo = dome(.56);
  const leaf = blade([[0, 0], [.009, .013], [0, .027], [-.009, .013]], .004);
  const shell = mat(palette.primary, { roughness: .78 });
  const hide = mat(palette.secondary, { roughness: .98 });
  const moss = mat(palette.accent, { roughness: 1 });

  const body = group(root, 0, 0, 0);
  const carapace = group(body, 0, .066, 0);
  piece(carapace, domeGeo, shell, [0, 0, 0], [.092, .06, .114]);
  // Flat rim under the dome, plastron under that: the shell closes on every side.
  piece(carapace, disc, hide, [0, -.006, 0], [.098, .014, .12]);
  piece(body, disc, hide, [0, .048, .004], [.066, .011, .086]);
  // Scutes ride half-sunk in the dome, so the shell reads as plates and not a ball.
  for (const [yaw, tilt] of [[0, 0], [1.02, .66], [-1.02, .66], [2.5, .78], [-2.5, .78], [.6, 1.15], [-.6, 1.15], [Math.PI, 1.02]]) {
    const x = Math.sin(tilt) * Math.sin(yaw);
    const z = Math.sin(tilt) * Math.cos(yaw);
    piece(carapace, orb, hide, [x * .083, Math.cos(tilt) * .053, z * .103], [.026, .015, .03]);
  }
  const tufts = [[.85, .55], [-.62, 1.05], [2.35, .72], [-2.35, .95], [-1.75, 1.18]].map(([yaw, tilt]) => {
    const x = Math.sin(tilt) * Math.sin(yaw);
    const z = Math.sin(tilt) * Math.cos(yaw);
    const tuft = group(carapace, x * .084, Math.cos(tilt) * .055, z * .104);
    piece(tuft, orb, moss, [0, .002, 0], [.024, .011, .021]);
    piece(tuft, pill, moss, [.006, .014, -.003], [.0035, .009, .0035]);
    piece(tuft, leaf, moss, [.006, .017, -.003]).rotation.y = yaw;
    return tuft;
  });

  // Head and neck leave by the mouth of the shell, level with the rim.
  const neck = group(carapace, 0, -.004, .05);
  const throat = piece(neck, pill, hide, [0, 0, 0], [.017, .01, .017]);
  throat.rotation.x = Math.PI / 2;
  const head = group(neck, 0, 0, .082);
  piece(head, orb, hide, [0, 0, 0], [.027, .023, .03]);
  piece(head, cone, shell, [0, -.004, .03], [.013, .028, .013]).rotation.x = Math.PI / 2;
  const [leftEye, rightEye] = eyes(head, { x: .017, y: .009, z: .019, size: .0095, pupil: palette.eye ?? 0x2b2a20 });

  const tail = group(body, 0, .056, -.104);
  piece(tail, cone, hide, [0, 0, -.019], [.013, .038, .013]).rotation.x = -Math.PI / 2;

  const stump = { y: .062, thigh: .02, shin: .012, thickness: .022, colour: hide, foot: shell, footSize: .8 };
  const legs = [
    limb(body, { x: -.063, z: .072, ...stump }),
    limb(body, { x: .063, z: .072, ...stump }),
    limb(body, { x: -.063, z: -.072, ...stump }),
    limb(body, { x: .063, z: -.072, ...stump }),
  ];

  let stride = 0;
  let tuck = 0;
  let blink = 5;
  return {
    ground: true,
    home: [-.62, 0, -.2],
    scale: 1.35,
    animate(time, { moving = false, speed = 0, dt = .016 } = {}) {
      // Fright shuts her in a blink; trust only creeps back out over seconds.
      const alarm = moving && speed > .3 ? 1 : 0;
      tuck += (alarm - tuck) * (1 - Math.exp(-dt * (alarm ? 6.5 : .7)));
      const out = 1 - tuck;
      // Two and a half seconds a stride: nothing in the bestiary plods slower.
      stride += dt * (.85 + speed * 1.75);
      const swing = Math.sin(stride);
      // Standing still she stands still: the legs only work for ground covered.
      const bounce = trot(legs, stride, { lift: speed * (.34 - tuck * .12), reach: speed * (.5 - tuck * .2), bounce: .008 });
      legs.forEach((leg, i) => {
        // A third of the leg folds up at the hip, the rest swings in under the rim.
        leg.hip.scale.setScalar(1 - tuck * .35);
        leg.hip.rotation.z = (i % 2 ? -1 : 1) * tuck * .3;
      });
      // She waddles: the whole shell shifts onto the loaded side at every step.
      body.position.x = swing * .02 * speed;
      body.position.y = (bounce + Math.abs(swing) * .005) * speed - tuck * .018;
      body.position.z = Math.cos(stride * 2) * .014 * speed;
      body.rotation.z = swing * .07 * speed;
      body.rotation.y = Math.sin(stride - .9) * .16 * speed;
      // Most of the roll belongs to the shell alone, half a beat late: the mass
      // swings over legs that stay planted instead of tipping them off the ground.
      carapace.rotation.z = Math.sin(stride - .55) * .14 * speed;
      carapace.rotation.x = Math.sin(time * .9) * .014 - speed * .07 + Math.cos(stride * 2) * .05 * speed;
      carapace.position.y = .066 - tuck * .01;
      // The neck is the mechanism: a tube that always spans the mouth of the
      // shell to the skull, so lengthening it is what pushes the head out.
      const poke = out * (.082 + Math.sin(time * .43) * .013);
      throat.scale.y = (poke + .014) / 3;
      throat.position.z = throat.scale.y * 1.5;
      head.position.z = poke;
      neck.rotation.x = -tuck * .3 - out * (.08 + Math.sin(time * .53) * .22);
      neck.rotation.y = Math.sin(time * .37) * .4 * out;
      head.rotation.x = Math.sin(time * .46 + 1) * .24 * out;
      head.rotation.y = Math.sin(time * .61) * .3 * out;
      tail.position.z = -.104 + tuck * .04;
      tail.rotation.x = tuck * .7;
      tail.rotation.y = Math.sin(stride * .5 + 1.2) * .24 * out;
      // Moss trembles on its own and is shaken harder by every roll of the shell.
      const shake = .05 + speed * .2 + Math.abs(swing) * speed * .28;
      tufts.forEach((tuft, i) => {
        tuft.rotation.z = Math.sin(time * (7.6 + i * 1.9) + i) * shake;
        tuft.rotation.x = Math.cos(time * (6.1 + i * 1.3) + i * 2.2) * shake * .8;
      });
      if (time > blink) { blink = time + 3.8 + (stride % 3); }
      const shut = Math.max(0, 1 - Math.abs(time - blink + 3.8) * 9) * out;
      leftEye.scale.y = rightEye.scale.y = 1 - shut * .92;
    },
  };
}
