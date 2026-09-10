/** Chat d’ombre — a cat made of smoke.
 *
 * Where the tabby trots and sits, this one stalks: one paw at a time, belly
 * skimming the stone, shoulder blades rolling over a spine that never bounces.
 * Its tail undulates instead of lashing, and frays at the tip into three volutes
 * that keep turning while he stands, paws planted, and scans the dark.
 */
import { creatureKit } from './kit.js';

/** Lateral sequence — hind, fore, hind, fore — so three paws always stay down. */
const PAW_ORDER = [.25, .75, 0, .5];

/** A stalk, not a trot: long reach, low lift, and the crouch each leg holds. */
function stalk(legs, phase, reach, lift) {
  legs.forEach((leg, i) => {
    const step = phase + PAW_ORDER[i] * Math.PI * 2;
    leg.hip.rotation.x = leg.tuck + Math.sin(step) * reach;
    leg.knee.rotation.x = leg.crouch + Math.max(0, Math.sin(step + 1.1)) ** 2 * lift;
    // The pad stays flat on the stone however deeply the leg folds above it.
    leg.ankle.rotation.x = -(leg.hip.rotation.x + leg.knee.rotation.x) * .85;
  });
}

export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  const { orb, pill, cone, mat, glow, group, piece, eyes, limb, chain } = kit;
  const smoke = mat(palette.primary, { roughness: .98 });
  const haze = mat(palette.secondary, { roughness: .94 });
  const mark = mat(palette.accent, { roughness: .6 });
  const vapour = glow(palette.accent);

  const body = group(root, 0, 0, 0);
  const spine = group(body, 0, .082, 0);
  // A short chest and a long rump: the barrel of a cat flattened into a stalk.
  piece(spine, pill, smoke, [0, .004, .032], [.046, .03, .045]).rotation.x = Math.PI / 2;
  piece(spine, pill, smoke, [0, 0, -.044], [.049, .044, .047]).rotation.x = Math.PI / 2;
  // The belly hangs low and pale, the only part of him that catches the light.
  piece(spine, pill, haze, [0, -.021, 0], [.038, .05, .036]).rotation.x = Math.PI / 2;
  // Two ridges of paler smoke crest the spine, proud of the line of the back.
  for (let i = 0; i < 2; i++) piece(spine, orb, haze, [0, .041, .03 - i * .058], [.028, .012, .022]);

  const shoulders = [-1, 1].map(side => {
    const blade = group(spine, side * .03, .022, .05);
    piece(blade, orb, smoke, [0, 0, 0], [.023, .026, .03]);
    return blade;
  });

  // Neck and skull reach out ahead of the chest — the stalker's whole outline.
  const neck = group(spine, 0, .012, .07);
  piece(neck, pill, smoke, [0, -.002, .018], [.027, .02, .027]).rotation.x = Math.PI / 2;
  const head = group(neck, 0, .01, .042);
  piece(head, orb, smoke, [0, 0, 0], [.041, .036, .04]);
  piece(head, orb, haze, [0, -.014, .03], [.023, .017, .02]);
  piece(head, orb, mark, [0, -.007, .045], [.009, .007, .008]);
  for (const side of [-1, 1]) {
    // Cheek tufts pointing out and back, as if he were always moving forward.
    piece(head, cone, smoke, [side * .032, -.002, -.002], [.015, .034, .012])
      .rotation.set(0, side * .5, -side * 1.45);
    for (let w = 0; w < 3; w++) {
      piece(head, pill, haze, [side * .034, -.008 + w * .006, .036], [.0018, .019, .0018])
        .rotation.z = Math.PI / 2 + side * (w - 1) * .26;
    }
  }
  const sockets = eyes(head, {
    x: .019, y: .009, z: .034, size: .0125,
    white: palette.primary, pupil: palette.eye ?? 0xffd166, glowing: true,
  });
  const ears = [-1, 1].map(side => {
    const ear = group(head, side * .024, .03, -.004);
    piece(ear, cone, smoke, [0, .019, 0], [.016, .044, .012]);
    // The lining is set into the front face of the ear, not buried behind it.
    piece(ear, cone, mark, [0, .014, .007], [.01, .028, .004]);
    return ear;
  });

  const tail = chain(spine, { x: 0, y: .014, z: -.086, count: 6, length: .028, thickness: .015, taper: .87, colour: smoke });
  const tip = tail.links.at(-1);
  // The tail does not end: it frays into volutes that orbit the last vertebra.
  const volutes = [0, 1, 2].map(() => {
    const volute = group(tip, 0, 0, -.022);
    piece(volute, orb, vapour, [.021, 0, -.008], [.01, .008, .013]);
    piece(volute, orb, haze, [.03, .004, -.004], [.007, .006, .008]);
    return volute;
  });

  // Short legs, folded deep: the elbows stay under the chest and the body stays low.
  const legs = [
    { ...limb(body, { x: -.03, y: .084, z: .05, thigh: .034, shin: .028, thickness: .014, colour: smoke, foot: haze }), tuck: -.35, crouch: 1.15 },
    { ...limb(body, { x: .03, y: .084, z: .05, thigh: .034, shin: .028, thickness: .014, colour: smoke, foot: haze }), tuck: -.35, crouch: 1.15 },
    { ...limb(body, { x: -.032, y: .09, z: -.048, thigh: .04, shin: .032, thickness: .016, colour: smoke, foot: haze }), tuck: -.4, crouch: 1.35 },
    { ...limb(body, { x: .032, y: .09, z: -.048, thigh: .04, shin: .032, thickness: .016, colour: smoke, foot: haze }), tuck: -.4, crouch: 1.35 },
  ];

  let creep = 0;
  let prowl = 0;
  return {
    ground: true,
    home: [-.62, 0, -.2],
    scale: 1.05,
    animate(time, { moving = false, speed = 0, dt = .016 } = {}) {
      creep += dt * (1.8 + speed * 5.6);
      prowl += ((moving ? 1 : 0) - prowl) * (1 - Math.exp(-dt * 3.2));
      // Watching, the four pads stay planted; the stalk unfolds only once he sets off.
      stalk(legs, creep, (.1 + speed * .47) * prowl, (.13 + speed * .45) * prowl);
      // Nothing bounces: the weight slides sideways from shoulder to shoulder.
      body.position.x = Math.sin(creep) * .014 * prowl;
      spine.position.y = .082 - prowl * .009;
      spine.rotation.y = Math.sin(creep) * .13 * prowl;
      spine.rotation.z = Math.sin(creep + 1.1) * .07 * prowl;
      const breath = Math.sin(time * .9) * .004 * (1 - prowl);
      shoulders.forEach((blade, i) => {
        // Each blade rides up and forward as the foreleg reaches out under it.
        const roll = Math.sin(creep + i * Math.PI) * prowl;
        blade.position.y = .022 + breath + roll * .011;
        blade.position.z = .05 + roll * .008;
      });
      // A slow S from base to tip, never the tabby's whipcrack.
      tail.wave(.19 + speed * .1, time * 1.15, 'y');
      // Carried low and level, tip riding up: the length must never scrape the stone.
      tail.links[0].rotation.x = -.18 - prowl * .05;
      for (let i = 1; i < tail.links.length; i++) tail.links[i].rotation.x = .075 + Math.sin(time * .8 - i * .55) * .07;
      volutes.forEach((volute, i) => {
        const drift = time * (1.7 + i * .45) + i * 2.1;
        volute.rotation.z = drift;
        volute.rotation.x = Math.sin(drift * .5) * .6;
        volute.position.z = -.022 - .011 * (1 + Math.sin(time * 1.3 + i * 1.7));
      });
      // Head high while he watches; it sinks below the blades once he sets off,
      // the neck pushing it forward and the skull holding the muzzle level.
      neck.rotation.x = -.26 + prowl * .56;
      head.rotation.x = .14 - prowl * .41 + Math.sin(time * .52) * .07 * (1 - prowl);
      // Standing, he never sits: he sweeps the dark from one side to the other.
      const sweep = Math.sin(time * .5) * .6 * (1 - prowl);
      head.rotation.y = sweep - Math.sin(creep) * .09 * prowl;
      // Ears hold on whatever he heard while the head keeps sweeping past it.
      ears.forEach((ear, i) => {
        ear.rotation.y = -sweep * .4 + Math.sin(time * 1.1 + i * 2.4) * .12;
        ear.rotation.x = -.06 - prowl * .16;
      });
      // Lids close to a hunter's slit as he sets off; the lanterns stay lit.
      const lid = 1 - prowl * .42 - Math.max(0, Math.sin(time * .7)) * .14;
      sockets.forEach(socket => { socket.scale.y = lid; });
    },
  };
}
