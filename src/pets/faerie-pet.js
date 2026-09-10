/** Licorne de poche — a foal the size of a lantern, held up by insect wings.
 *
 * She never lands: the legs keep pedalling in the void, the wings blur far too
 * fast for a bird, and the mane always answers the body a beat late.
 */
import { creatureKit } from './kit.js';

export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  const { orb, pill, cone, ring, blade, mat, glow, group, piece, eyes, limb, chain } = kit;
  const coat = mat(palette.primary, { roughness: .86 });
  const pale = mat(palette.secondary, { roughness: .74 });
  const hair = mat(palette.accent, { roughness: .5 });
  const spark = glow(palette.accent);
  const veil = mat(palette.secondary, { roughness: .16, transparent: true, opacity: .34 });
  const vein = mat(palette.primary, { roughness: .4 });

  const body = group(root, 0, .072, 0);
  piece(body, pill, coat, [0, 0, 0], [.028, .03, .034]).rotation.x = Math.PI / 2;
  piece(body, orb, coat, [0, .006, .036], [.027, .031, .026]);
  piece(body, orb, coat, [0, .008, -.038], [.028, .031, .028]);
  piece(body, orb, pale, [0, -.022, .002], [.022, .013, .042]);

  // A neck long enough to read as a horse: the head clears the withers by its own height.
  const neck = group(body, 0, .024, .042);
  neck.rotation.x = .42;
  piece(neck, pill, coat, [0, .018, .002], [.016, .014, .017]);
  piece(neck, pill, coat, [0, .044, -.002], [.013, .012, .014]);
  const head = group(neck, 0, .064, .002);
  head.rotation.x = -.55;
  piece(head, orb, coat, [0, 0, 0], [.019, .021, .023]);
  piece(head, orb, coat, [0, -.008, .02], [.015, .015, .019]);
  piece(head, orb, pale, [0, -.012, .036], [.012, .011, .014]);
  piece(head, orb, pale, [0, -.015, .048], [.008, .007, .006]);
  const [leftEye, rightEye] = eyes(head, { x: .016, y: .007, z: .012, size: .009, pupil: palette.eye });
  const ears = [-1, 1].map(side => {
    const ear = group(head, side * .011, .019, -.004);
    piece(ear, cone, coat, [0, .01, 0], [.006, .018, .005]);
    piece(ear, cone, pale, [0, .008, .002], [.0035, .011, .003]);
    return ear;
  });

  // The spiral is stacked, not modelled: each ring is smaller and turned further.
  const horn = group(head, 0, .016, .016);
  horn.rotation.x = .3;
  for (let i = 0; i < 5; i++) {
    const coil = group(horn, 0, i * .0105, 0);
    coil.rotation.y = i * .85;
    piece(coil, cone, i % 2 ? spark : hair, [0, .006, 0], [.0086 - i * .0013, .0115, .0086 - i * .0013]);
    if (i % 2 === 0) piece(coil, ring(.008 - i * .0013, .0016), spark, [0, .0016, 0]).rotation.x = Math.PI / 2;
  }
  const hornTip = piece(horn, orb, spark, [0, .056, 0], [.006]);

  // Locks strung along the crest of the neck, not a blanket over the shoulders.
  const manes = [0, 1, 2].map(i => chain(neck, {
    x: (i - 1) * .004, y: .054 - i * .018, z: -.014,
    count: 3, length: .017 - i * .002, thickness: .0095 - i * .001, taper: .78, colour: hair,
  }));
  const forelock = chain(head, { x: 0, y: .01, z: .021, count: 2, length: .01, thickness: .007, taper: .7, colour: hair });
  const tail = [-1, 0, 1].map(i => chain(body, {
    x: i * .007, y: .026 - Math.abs(i) * .006, z: -.05,
    count: 3, length: .021, thickness: .0095 - Math.abs(i) * .0015, taper: .8, colour: hair,
  }));

  const legs = [
    limb(body, { x: -.017, y: -.006, z: .034, thigh: .042, shin: .036, thickness: .008, colour: coat, foot: pale, footSize: .78 }),
    limb(body, { x: .017, y: -.006, z: .034, thigh: .042, shin: .036, thickness: .008, colour: coat, foot: pale, footSize: .78 }),
    limb(body, { x: -.019, y: -.004, z: -.036, thigh: .046, shin: .038, thickness: .0085, colour: coat, foot: pale, footSize: .78 }),
    limb(body, { x: .019, y: -.004, z: -.036, thigh: .046, shin: .038, thickness: .0085, colour: coat, foot: pale, footSize: .78 }),
  ];
  // A hoof, not a paw: the kit's foot squashed into a stub under the fetlock.
  for (const leg of legs) leg.ankle.scale.set(1.15, .5, .95);

  // Two panes and their ribs, all set out along the span: an insect wing bends.
  const innerPane = blade([[-.028, -.009], [-.014, .015], [.026, .016], [.03, -.012]], .002);
  const outerPane = blade([[-.028, -.013], [-.024, .015], [.02, .01], [.032, -.004]], .002);
  const wings = [-1, 1].map(side => {
    const mount = group(body, side * .015, .03, .004);
    mount.rotation.y = side > 0 ? 0 : Math.PI;
    const hinge = group(mount, 0, 0, 0);
    const pane = group(hinge, 0, 0, 0);
    pane.rotation.x = Math.PI / 2;
    // Membranes are glass: they colour the light instead of blocking it.
    for (const [shape, span] of [[innerPane, .03], [outerPane, .078]]) {
      piece(pane, shape, veil, [span, 0, 0]).castShadow = false;
    }
    for (let i = 0; i < 3; i++) {
      piece(pane, pill, vein, [.026 + i * .03, .008 - i * .005, .001], [.0011, .015, .0011])
        .rotation.z = Math.PI / 2 + (i - 1) * .1;
    }
    return { hinge, pane };
  });

  let buzz = 0;
  let pedal = 0;
  let drift = 0;
  let maneLag = 0;
  let blink = 2.4;
  return {
    ground: false,
    home: [-.62, 0, -.12],
    scale: 1,
    animate(time, { speed = 0, dt = .016 } = {}) {
      // 26 Hz idling, 30 Hz in flight: a dragonfly's rate, far past any wingbeat a bird can hold.
      buzz += dt * (164 + speed * 22);
      pedal += dt * (2.4 + speed * 5.6);
      drift += dt * (1.3 + speed * 2.4);
      const stroke = Math.sin(buzz);
      // The twist runs a quarter beat behind the stroke: the figure of eight an insect rows with.
      const twist = Math.cos(buzz) * (.36 + speed * .18);
      const sweep = -speed * .26 + Math.sin(drift * 1.6) * .07;
      wings.forEach(({ hinge, pane }) => {
        hinge.rotation.z = .16 + stroke * (.24 + speed * .3);
        hinge.rotation.y = sweep;
        pane.rotation.x = Math.PI / 2 + twist;
      });
      // Too quick to keep an edge: the membranes thin out as the beat rises.
      veil.opacity = .34 - speed * .1;
      // Hooves that never find ground: they cycle, idly at rest, hard when Lumen runs.
      legs.forEach((leg, i) => {
        const phase = pedal + (i % 2 ? Math.PI : 0) + (i > 1 ? 1.05 : 0);
        leg.hip.rotation.x = .2 + Math.sin(phase) * (.32 + speed * .55);
        // Hocks fold forward where knees fold back.
        leg.knee.rotation.x = (i > 1 ? -1 : 1) * (.42 - Math.cos(phase) * (.4 + speed * .4));
        leg.ankle.rotation.x = -leg.hip.rotation.x * .6;
      });
      body.position.y = .072 + Math.sin(drift * 2) * .005;
      body.rotation.x = -.15 * speed + Math.sin(drift) * .05;
      body.rotation.z = Math.sin(drift * .8) * .07 * (1 - speed);
      // The hair chases the shoulders instead of sharing them; the gap is the float.
      const tilt = body.rotation.x + body.rotation.z;
      maneLag += (tilt - maneLag) * (1 - Math.exp(-dt * 4.2));
      const drag = (tilt - maneLag) * 7 + speed * .5;
      manes.forEach((lock, i) => {
        lock.wave(.16 + speed * .12, drift * 2.1 - i * .7, 'y');
        // Laid back along the crest, not driven through the withers.
        lock.links.forEach((link, j) => { link.rotation.x = (j ? -.12 : -.5) + drag * (1 - j * .3); });
      });
      forelock.wave(.22, drift * 2.6, 'y');
      forelock.links.forEach((link, j) => { link.rotation.x = (j ? -.1 : -2.3) + drag * .7; });
      tail.forEach((strand, i) => {
        strand.wave(.2 + speed * .16, drift * 1.8 - i * .9, 'y');
        strand.links.forEach((link, j) => {
          link.rotation.x = (j ? -.16 : .45) + drag * (.8 - j * .2) + Math.sin(drift * 2.4 - j) * .08;
        });
      });
      // Two beats of unequal length: the horn twinkles instead of breathing.
      const pulse = Math.max(0, Math.sin(time * 2.4)) * Math.max(0, Math.sin(time * 5.1));
      spark.emissiveIntensity = 1.1 + pulse * 3.6;
      hornTip.scale.setScalar(.006 * (.85 + pulse * .75));
      neck.rotation.x = .42 - speed * .22 + Math.sin(drift + 1) * .05;
      head.rotation.x = -.55 + Math.sin(time * 1.1) * .07 + speed * .1;
      head.rotation.y = Math.sin(time * .8) * .3 * (1 - speed);
      ears.forEach((ear, i) => {
        ear.rotation.x = -.15 - Math.max(0, Math.sin(time * 1.7 + i * 2.4)) * .3;
        ear.rotation.z = Math.sin(time * 2.1 + i) * .12;
      });
      if (time > blink) blink = time + 2.1 + (pedal % 2);
      const shut = Math.max(0, 1 - Math.abs(time - blink + 2.1) * 15);
      leftEye.scale.y = rightEye.scale.y = 1 - shut * .9;
    },
  };
}
