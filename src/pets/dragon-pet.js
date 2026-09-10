/** Dragonnet cuivré — the dragon that gave up flying.
 *
 * Its wings stay folded over the coppered back and never beat: it walks,
 * sprawled and low, on four clawed feet. The trunk snakes sideways at every
 * step the way a lizard's does, and the head refuses to follow — it holds its
 * line while the body slides underneath. Embers glow in its throat, and at
 * rest it opens the wings for a moment, stretches, and folds them away.
 */
import { creatureKit } from './kit.js';

/** Lateral sequence, the reptile order: a hind foot, then the fore of the same flank. */
const BEATS = [Math.PI * .5, Math.PI * 1.5, 0, Math.PI];
/** How far ahead of the trunk pivot the skull rides, and where the chest yaws. */
const SKULL = .129;
const SHOULDER = .046;
/** The neck rakes back this far from vertical; the throat hangs under that line. */
const RAKE = .62;
/** A point `reach` up the neck, `drop` below its underside. */
const along = (reach, drop) => [
  0,
  reach * Math.sin(RAKE) - drop * Math.cos(RAKE),
  reach * Math.cos(RAKE) + drop * Math.sin(RAKE),
];

/** A sprawled step. The femur points out and down, so the leg swings fore and aft
 *  around the vertical, and the foot clears the ground by lifting that femur toward
 *  the horizontal while the shin folds under it. */
function crawl(leg, phase, reach, lift) {
  const raised = Math.max(0, -Math.cos(phase));
  const fold = raised * lift;
  leg.hip.rotation.y = -leg.side * Math.sin(phase) * reach;
  leg.hip.rotation.z = leg.side * (1.02 + fold * .8);
  leg.knee.rotation.z = -leg.side * (.86 + fold * 1.15);
  leg.knee.rotation.x = .28 + fold * .7;
  leg.ankle.rotation.x = -.22 - fold * .5;
  return raised;
}

export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  const { THREE, orb, pill, cone, blade, mat, glow, group, piece, eyes, limb, chain } = kit;
  const patine = mat(palette.primary, { roughness: .54, metalness: .26 });
  const cuivre = mat(palette.secondary, { roughness: .3, metalness: .66 });
  const ecaille = mat(palette.accent, { roughness: .36, metalness: .48 });
  // A membrane is one polygon thick, so it has to be lit from either face.
  const voile = mat(palette.secondary, { roughness: .62, side: THREE.DoubleSide });
  const braise = glow(palette.accent);

  const body = group(root, 0, .078, 0);
  const trunk = group(body, 0, 0, 0);
  const chest = group(trunk, 0, .002, SHOULDER);
  const croup = group(trunk, 0, 0, -.044);
  piece(chest, pill, patine, [0, 0, 0], [.038, .026, .038]).rotation.x = Math.PI / 2;
  piece(chest, orb, cuivre, [0, -.024, .006], [.03, .014, .04]);
  piece(croup, pill, patine, [0, 0, .004], [.036, .026, .036]).rotation.x = Math.PI / 2;
  piece(croup, orb, cuivre, [0, -.022, 0], [.028, .012, .036]);
  // The crest: one scale per vertebra, tall enough to draw the wave from the side.
  for (let i = 0; i < 3; i++) {
    piece(chest, cone, ecaille, [0, .035 - i * .002, .026 - i * .026], [.009, .032 - i * .004, .006]).rotation.x = .5;
    piece(croup, cone, ecaille, [0, .031 - i * .003, .018 - i * .026], [.008, .026 - i * .004, .005]).rotation.x = .5;
  }

  // The neck climbs clear of the shoulders: the skull has to sit on it, not in it,
  // and the throat has to stand in open air for the embers to read.
  const neck = group(chest, 0, .026, .028);
  piece(neck, orb, patine, [0, .004, .006], [.022, .019, .022]);
  piece(neck, pill, patine, along(.034, 0), [.016, .019, .016]).rotation.x = Math.PI / 2 - RAKE;
  piece(neck, orb, cuivre, along(.026, .011), [.013, .01, .018]);
  // Embers under the jaw: they swell and rise where the throat meets the skull.
  const embers = [0, 1, 2].map(i => piece(neck, orb, braise, along(.02 + i * .011, .026), [.005]));
  const throats = embers.map(ember => ember.position.y);

  const head = group(neck, ...along(.068, 0));
  piece(head, orb, patine, [0, 0, 0], [.026, .022, .028]);
  piece(head, orb, patine, [0, -.002, .026], [.017, .014, .022]);
  piece(head, orb, cuivre, [0, .01, .012], [.022, .01, .024]);
  for (const side of [-1, 1]) {
    piece(head, orb, patine, [side * .012, .009, .042], [.005, .005, .006]);
    piece(head, cone, ecaille, [side * .016, .016, -.012], [.006, .03, .006]).rotation.set(-.7, 0, -side * .42);
    piece(head, cone, ecaille, [side * .019, -.002, -.014], [.005, .016, .005]).rotation.set(-.2, 0, -side * 1.1);
  }
  const jaw = group(head, 0, -.014, .006);
  piece(jaw, orb, cuivre, [0, -.002, .022], [.015, .007, .022]);
  piece(jaw, orb, braise, [0, .004, .012], [.009, .004, .012]);
  const [leftEye, rightEye] = eyes(head, { x: .016, y: .008, z: .02, size: .0105, pupil: palette.eye, glowing: true });

  // Folded wings: the forearm lies back along the flank, the vane packed against it.
  const vane = blade([[0, 0], [.028, -.012], [.058, -.008], [.068, .01], [.03, .026], [.004, .018]], .004);
  const wings = [-1, 1].map(side => {
    const shoulder = group(trunk, side * .019, .026, .03);
    shoulder.rotation.z = side * .42;
    piece(shoulder, pill, patine, [side * .02, 0, 0], [.007, .019, .007]).rotation.z = Math.PI / 2;
    const elbow = group(shoulder, side * .04, 0, 0);
    elbow.rotation.y = side * 2.05;
    piece(elbow, pill, patine, [side * .026, 0, 0], [.005, .025, .005]).rotation.z = Math.PI / 2;
    piece(elbow, vane, voile, [0, -.002, 0], [side, 1, 1]).rotation.x = -Math.PI / 2;
    for (let f = 0; f < 2; f++) {
      piece(elbow, pill, cuivre, [side * .03, .004 + f * .005, 0], [.003, .022, .003]).rotation.set(0, 0, Math.PI / 2 + side * (f * .3 - .15));
    }
    return { shoulder, elbow, side };
  });

  const tail = chain(croup, { x: 0, y: .006, z: -.03, count: 6, length: .0235, thickness: .017, taper: .87, colour: patine });
  tail.links.forEach((link, i) => {
    if (i % 2) piece(link, cone, ecaille, [0, .012 - i * .001, -.014], [.005, .017 - i * .001, .004]).rotation.x = .5;
  });
  piece(tail.links.at(-1), cone, ecaille, [0, 0, -.03], [.008, .03, .008]).rotation.x = -Math.PI / 2;

  const legs = [
    { ...limb(chest, { x: -.03, y: -.004, z: .006, thigh: .03, shin: .026, thickness: .011, colour: patine, foot: cuivre, footSize: .9 }), side: -1 },
    { ...limb(chest, { x: .03, y: -.004, z: .006, thigh: .03, shin: .026, thickness: .011, colour: patine, foot: cuivre, footSize: .9 }), side: 1 },
    { ...limb(croup, { x: -.031, y: 0, z: -.004, thigh: .032, shin: .028, thickness: .012, colour: patine, foot: cuivre, footSize: .95 }), side: -1 },
    { ...limb(croup, { x: .031, y: 0, z: -.004, thigh: .032, shin: .028, thickness: .012, colour: patine, foot: cuivre, footSize: .95 }), side: 1 },
  ];
  for (const leg of legs) {
    for (let c = -1; c < 2; c++) piece(leg.ankle, cone, ecaille, [c * .008, -.01, .028], [.003, .012, .003]).rotation.x = 1.9;
  }

  let stride = 0;
  let clock = 0;
  let pace = 0;
  let open = 0;
  // The stretch runs on the creature's own clock, so a rewound time never skips it.
  let stretchAt = 1;
  return {
    ground: true,
    home: [-.62, 0, -.15],
    scale: 1.1,
    animate(time, { moving = false, speed = 0, dt = .016 } = {}) {
      clock += dt;
      stride += dt * (1.5 + speed * 6.6);
      pace += ((moving ? 1 : 0) - pace) * (1 - Math.exp(-dt * 4.4));
      // Walking is a lateral wave first and a leg cycle second: the trunk leads it.
      const amp = .05 + speed * .3;
      const bend = Math.sin(stride);
      // Standing still, the feet stay planted; only the wave keeps breathing.
      const loads = legs.map((leg, i) => crawl(leg, stride + BEATS[i], (.06 + speed * .5) * pace, (.16 + speed * .62) * pace));

      trunk.position.x = Math.sin(stride - .45) * (.006 + speed * .026);
      trunk.rotation.y = bend * amp * .45;
      trunk.rotation.z = (loads[1] - loads[0] + loads[3] - loads[2]) * .045 * pace;
      chest.rotation.y = bend * amp;
      croup.rotation.y = Math.sin(stride - .95) * amp * .85;
      // A sprawled walker barely rises: it lifts its belly off the stones to set off,
      // then keeps it level while the gait goes sideways.
      body.position.y = .078 + speed * (.003 + Math.abs(Math.sin(stride)) * .004);

      tail.wave(amp * 1.15, stride - 1.9, 'y');
      tail.links[0].rotation.x = .12 - speed * .3;

      // The head keeps its line while the body serpents under it: the neck slides back
      // by what the two yaws carry the skull sideways, then counter-turns on top.
      const yaw = trunk.rotation.y + chest.rotation.y;
      const carried = trunk.position.x + Math.sin(trunk.rotation.y) * SKULL + Math.sin(chest.rotation.y) * (SKULL - SHOULDER);
      neck.position.x = -carried * .94 / Math.cos(yaw);
      neck.rotation.y = -yaw * .95 + Math.sin(time * .5) * .3 * (1 - speed);
      neck.rotation.x = -.1 + speed * .26 + Math.sin(time * 1.7) * .035;
      head.rotation.x = .12 - speed * .3 + Math.sin(time * 1.1) * .07 * (1 - speed);
      head.rotation.z = -bend * amp * .3;
      jaw.rotation.x = .1 + Math.max(0, Math.sin(time * 2.6)) * .16 * (1 - speed);

      // Embers breathe with the throat, brightest just after the jaw closes.
      embers.forEach((ember, i) => {
        const pulse = .5 + Math.sin(time * 2.2 - i * .8) * .5;
        ember.scale.setScalar(.0035 + pulse * .005);
        ember.position.y = throats[i] + pulse * .003;
      });

      // At rest the wings unpack, hold a beat, and pack away again.
      if (clock > stretchAt + 1.1) stretchAt = clock + 4.2;
      const stretching = !moving && clock > stretchAt;
      open += ((stretching ? 1 : 0) - open) * (1 - Math.exp(-dt * 5.5));
      const flutter = Math.sin(time * 9) * open * .12;
      wings.forEach(({ shoulder, elbow, side }) => {
        shoulder.rotation.z = side * (.42 + open * .38 + flutter);
        shoulder.rotation.x = -open * .55 + Math.sin(stride) * .05 * side * pace;
        elbow.rotation.y = side * (2.05 - open * 1.75);
        elbow.rotation.z = side * (flutter * .8 - open * .35);
      });

      const shut = Math.max(0, Math.sin(time * .74) * 12 - 11);
      leftEye.scale.y = rightEye.scale.y = 1 - shut * .85;
    },
  };
}
