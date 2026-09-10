/** Louveteau des cimes — un rôdeur, pas un chien de compagnie.
 *
 * Long sur pattes hautes, poitrail étroit, museau conique et queue en brosse
 * portée bas. Marche latérale à quatre temps : chaque épaule se soulève quand
 * sa patte charge le sol et la tête reste sous la ligne du garrot. À l'arrêt il
 * plante ses quatre appuis, respire, et redresse rarement le museau vers le vent.
 */
import { creatureKit } from './kit.js';

// Lateral-sequence footfalls (hind then fore, one side after the other): never a trot.
const BEATS = [.25, .75, 0, .5];
// A prowl carries weight most of the cycle; only the short swing looks quick.
const STANCE = .64;
// He reads the wind now and then; a familiar that sniffs on every idle beat is a mime.
const SNIFF_CYCLE = 11.5;
const SNIFF_HOLD = 2.8;

/** Poses one leg on its beat and reports how hard the paw is loading the ground. */
function stalk(leg, beat, reach, lift, crouch) {
  const cycle = beat - Math.floor(beat);
  const planted = cycle < STANCE;
  const phase = planted ? cycle / STANCE : (cycle - STANCE) / (1 - STANCE);
  // Planted, the hip sweeps back at a constant rate: that is what pushes the body along.
  leg.hip.rotation.x = reach * (planted ? 1 - 2 * phase : 2 * phase - 1);
  leg.knee.rotation.x = crouch + (planted ? 0 : Math.sin(phase * Math.PI) * lift);
  leg.ankle.rotation.x = -(leg.hip.rotation.x + leg.knee.rotation.x) * .4;
  return planted ? Math.max(0, Math.sin(phase * Math.PI * 2)) : 0;
}

export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  const { orb, pill, cone, mat, group, piece, eyes, limb, chain } = kit;
  const pelt = mat(palette.primary, { roughness: .95 });
  const under = mat(palette.secondary, { roughness: .92 });
  const shade = mat(palette.accent, { roughness: .88 });

  const spine = group(root, 0, .142, 0);
  piece(spine, pill, pelt, [0, 0, -.006], [.036, .056, .04]).rotation.x = Math.PI / 2;
  piece(spine, pill, under, [0, -.019, .004], [.028, .044, .029]).rotation.x = Math.PI / 2;
  // Dark saddle down the back: the mark that reads as loup from behind.
  piece(spine, orb, shade, [0, .029, -.012], [.03, .013, .07]);

  const croup = group(spine, 0, .002, -.074);
  piece(croup, orb, pelt, [0, 0, 0], [.038, .042, .038]);
  for (const side of [-1, 1]) piece(croup, orb, pelt, [side * .028, -.016, .008], [.02, .028, .03]);

  // Deep and narrow: a wolf is a wedge seen from the front, not a barrel.
  const chest = group(spine, 0, .024, .07);
  piece(chest, orb, pelt, [0, 0, 0], [.037, .043, .036]);
  piece(chest, orb, under, [0, -.026, .008], [.027, .026, .028]);
  const shoulders = [-1, 1].map(side => {
    const blade = group(chest, side * .031, -.002, -.006);
    piece(blade, orb, pelt, [0, 0, 0], [.014, .03, .028]);
    return blade;
  });

  const neck = group(chest, 0, .008, .026);
  piece(neck, pill, pelt, [0, 0, .026], [.023, .019, .024]).rotation.x = Math.PI / 2;
  // Pale ruff where the neck meets the shoulders.
  for (const side of [-1, 1]) piece(neck, orb, under, [side * .02, -.009, .014], [.017, .022, .026]);

  const head = group(neck, 0, -.002, .06);
  piece(head, orb, pelt, [0, 0, 0], [.026, .026, .03]);
  piece(head, orb, under, [0, -.013, .016], [.018, .013, .022]);
  const snout = group(head, 0, -.008, .022);
  piece(snout, cone, pelt, [0, 0, .016], [.014, .044, .015]).rotation.x = Math.PI / 2;
  piece(snout, orb, under, [0, -.006, .022], [.011, .008, .026]);
  piece(snout, orb, shade, [0, .001, .042], [.008, .007, .008]);
  const [leftEye, rightEye] = eyes(head, {
    x: .016, y: .009, z: .021, size: .0105, pupil: palette.eye ?? 0xa8d8ff, glowing: true,
  });
  const ears = [-1, 1].map(side => {
    const ear = group(head, side * .018, .022, -.008);
    piece(ear, cone, pelt, [0, .018, 0], [.015, .04, .011]);
    piece(ear, cone, shade, [0, .015, .004], [.009, .027, .006]);
    return ear;
  });

  const tail = chain(spine, { x: 0, y: .014, z: -.096, count: 5, length: .026, thickness: .02, taper: .9, colour: pelt });
  // A short brush, not a fox's whip: bare at the root, thick, then a dark tip.
  tail.links.forEach((link, i) => {
    if (i) piece(link, orb, i > 3 ? shade : pelt, [0, 0, -.014], [.026 - i * .003, .025 - i * .002, .02]);
  });

  const legs = [
    limb(root, { x: -.03, y: .138, z: .062, thigh: .062, shin: .056, thickness: .0135, colour: pelt, foot: shade, footSize: .9 }),
    limb(root, { x: .03, y: .138, z: .062, thigh: .062, shin: .056, thickness: .0135, colour: pelt, foot: shade, footSize: .9 }),
    limb(root, { x: -.031, y: .146, z: -.07, thigh: .07, shin: .058, thickness: .0155, colour: pelt, foot: shade, footSize: .95 }),
    limb(root, { x: .031, y: .146, z: -.07, thigh: .07, shin: .058, thickness: .0155, colour: pelt, foot: shade, footSize: .95 }),
  ];

  let pace = 0;
  let prowl = 0;
  // The sniff is scheduled on the creature's own clock so it survives a rewound time.
  let clock = 0;
  return {
    ground: true,
    home: [-.62, 0, -.19],
    scale: 1.08,
    animate(time, { moving = false, speed = 0, dt = .016 } = {}) {
      clock += dt;
      // Few strides, long ones: the louveteau eats ground without hurrying.
      pace += dt * (.26 + speed * .96);
      prowl += ((moving ? 1 : 0) - prowl) * (1 - Math.exp(-dt * 3.2));
      // Standing still he keeps his four feet planted; only the walk opens the stride.
      const gait = .06 + prowl * .94;
      const reach = (.06 + speed * .44) * gait;
      const loads = legs.map((leg, i) => stalk(leg, pace + BEATS[i], reach,
        prowl * (i < 2 ? .34 + speed * .3 : .42 + speed * .42), i < 2 ? .1 : .26));
      const scent = clock % SNIFF_CYCLE;
      const sniff = scent < SNIFF_HOLD ? Math.sin(scent / SNIFF_HOLD * Math.PI) ** 2 * (1 - prowl) : 0;

      // Each shoulder rides up as its own paw takes the load: the prowler's roll.
      shoulders.forEach((blade, i) => {
        blade.position.y = -.002 + loads[i] * .021 * gait;
        blade.rotation.z = (i ? -1 : 1) * loads[i] * .32 * gait;
      });
      chest.position.y = .024 + Math.sin(time * 1.05) * .0035 * (1 - prowl);
      chest.rotation.z = (loads[1] - loads[0]) * .15 * gait;
      spine.position.y = .142 - prowl * .014 - (loads[2] + loads[3]) * .005 * gait;
      spine.rotation.y = Math.sin(pace * Math.PI * 2) * .07 * prowl;
      spine.rotation.x = (loads[2] + loads[3] - loads[0] - loads[1]) * .05 * gait;
      croup.rotation.z = (loads[2] - loads[3]) * .17 * gait;

      // The head hangs below the shoulders, and sinks further as he takes the trail.
      neck.rotation.x = .42 + prowl * .16 - sniff * 1.05;
      neck.rotation.y = Math.sin(time * .31) * .18 * (1 - prowl) - spine.rotation.y * .6;
      head.rotation.x = -.17 - sniff * .52 + Math.sin(pace * Math.PI * 2 + 1) * .06 * prowl;
      head.rotation.y = Math.sin(time * .43) * .26 * (1 - prowl) + sniff * .38;
      head.rotation.z = sniff * .14;
      snout.rotation.x = Math.sin(time * 7.4) * .05 * sniff;
      // Ears stay pricked: they swivel on the spot, tip forward on the trail, and
      // keep aiming at the wind while the muzzle swings up.
      ears.forEach((ear, i) => {
        ear.rotation.x = .03 + prowl * .12 + Math.sin(time * (1.2 + i * .43)) * .15 * (1 - prowl) + sniff * .22;
        ear.rotation.z = (i ? -1 : 1) * (.15 + prowl * .06);
      });
      // Eyes narrow to a pale slit while stalking, wide open when he reads the wind.
      leftEye.scale.y = rightEye.scale.y = 1 - prowl * .3 + sniff * .12;

      // Low, heavy tail: it counter-swings against the shoulders instead of flicking.
      tail.wave(.07 + prowl * .17, pace * Math.PI * 2 + 2.4, 'y');
      tail.links[0].rotation.x = -.6 + prowl * .3 + sniff * .18;
      tail.links[2].rotation.x = Math.sin(pace * Math.PI * 4) * .08 * prowl;
    },
  };
}
