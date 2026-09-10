/** Dragonneau de braise — the ember hatchling.
 *
 * Too heavy for the wings it has: it sinks between beats and claws the lost
 * height back in one hard stroke, so its flight saws up and down instead of
 * gliding. Every few seconds it coughs a mouthful of embers past its snout.
 */
import { creatureKit } from './kit.js';

export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  const { THREE, orb, pill, cone, blade, mat, glow, group, piece, eyes, limb, chain } = kit;
  const hide = mat(palette.primary, { roughness: .74 });
  const belly = mat(palette.secondary, { roughness: .66 });
  const crest = mat(palette.accent, { roughness: .46 });
  // A membrane is one polygon thick, so it has to be lit from either face.
  const film = mat(palette.secondary, { roughness: .5, side: THREE.DoubleSide });
  const fire = glow(palette.accent);

  const body = group(root, 0, .05, 0);
  piece(body, orb, hide, [0, 0, .006], [.05, .046, .057]);
  piece(body, orb, belly, [0, -.024, .014], [.038, .03, .045]);
  // Dorsal spines, seated in the curve of the back rather than perched on it.
  for (let i = 0; i < 3; i++) {
    const along = .024 - i * .032;
    piece(body, cone, crest, [0, .046 - along * along * 9, along], [.011, .024 - i * .004, .011]).rotation.x = .36;
  }

  // The skull is thrust clear of the chest, so a neck shows in the outline.
  const neck = group(body, 0, .026, .044);
  piece(neck, pill, hide, [0, .015, .028], [.017, .021, .017]).rotation.x = Math.PI / 2 - .49;
  const head = group(neck, 0, .03, .056);
  piece(head, orb, hide, [0, 0, 0], [.042, .04, .039]);
  piece(head, orb, belly, [0, -.011, .03], [.027, .022, .028]);
  piece(head, orb, crest, [0, .024, .016], [.026, .008, .021]);
  const jaw = group(head, 0, -.022, .008);
  piece(jaw, orb, belly, [0, -.004, .02], [.024, .01, .026]);
  for (const side of [-1, 1]) {
    piece(head, cone, crest, [side * .022, .031, -.01], [.009, .028, .009]).rotation.set(-.42, 0, -side * .34);
  }
  const [leftEye, rightEye] = eyes(head, { x: .024, y: .006, z: .028, size: .0125, pupil: palette.eye, glowing: true });
  const muzzle = group(head, 0, -.008, .058);

  const vane = blade([[0, -.004], [.028, -.017], [.058, -.016], [.088, .004], [.058, .028], [.032, .04], [.012, .032], [0, .014]], .005);
  const web = blade([[0, -.006], [.038, -.014], [.04, .024], [0, .018]], .005);
  const wings = [-1, 1].map(side => {
    const shoulder = group(body, side * .026, .026, .004);
    piece(shoulder, pill, hide, [side * .02, 0, 0], [.008, .01, .008]).rotation.z = Math.PI / 2;
    piece(shoulder, web, film, [side * .002, 0, 0], [side, 1, 1]).rotation.x = -Math.PI / 2;
    const elbow = group(shoulder, side * .04, 0, -.004);
    piece(elbow, pill, hide, [side * .046, 0, .002], [.005, .036, .005]).rotation.z = Math.PI / 2;
    piece(elbow, vane, film, [0, 0, 0], [side, 1, 1]).rotation.x = -Math.PI / 2;
    piece(elbow, pill, hide, [side * .03, 0, -.016], [.004, .03, .004]).rotation.set(0, side * .5, Math.PI / 2);
    return { shoulder, elbow, side };
  });

  const tail = chain(body, { x: 0, y: .01, z: -.048, count: 5, length: .028, thickness: .018, taper: .84, colour: hide });
  piece(tail.links.at(-1), cone, crest, [0, 0, -.042], [.02, .032, .007]).rotation.x = -Math.PI / 2;

  const legs = [-1, 1].map(side =>
    limb(body, { x: side * .024, y: -.026, z: .012, thigh: .03, shin: .024, thickness: .013, colour: hide, foot: crest, footSize: .7 }));

  const sparks = [0, 1, 2, 3].map(i => ({
    mesh: piece(muzzle, orb, fire, [0, 0, 0], [.002]),
    sway: Math.sin(i * 2.3) * .5,
    climb: .3 - i * .18,
  }));

  const clamp = THREE.MathUtils.clamp;
  let surge = 0;
  let lean = 0;
  let since = 1.6;
  let blink = 2.4;
  return {
    ground: false,
    home: [-.62, 0, -.14],
    animate(time, { moving = false, speed = 0, dt = .016 } = {}) {
      surge += dt * (1.32 + speed * .96);
      lean += ((moving ? 1 : 0) - lean) * (1 - Math.exp(-dt * 5.2));
      // The saw: a quarter of the cycle clawing back up, the rest of it sagging.
      const saw = surge % 1;
      const climb = saw < .26 ? Math.sin(saw / .26 * Math.PI * .5) : 1 - (saw - .26) / .74;
      const power = saw < .26 ? Math.sin(saw / .26 * Math.PI) : 0;
      body.position.y = .05 + (climb - .45) * (.05 + speed * .042);
      body.rotation.x = lean * .38 - power * .3 + (1 - climb) * .16;
      body.rotation.z = Math.sin(surge * Math.PI * 3) * .07;

      // Two beats a cycle: the first hauls him up, the second only slows the fall.
      const beat = (saw < .26 ? saw / .26 : 1 + (saw - .26) / .74) * Math.PI * 2;
      const flap = Math.sin(beat);
      wings.forEach(({ shoulder, elbow, side }) => {
        shoulder.rotation.z = side * (.12 + flap * (.28 + power * .58));
        shoulder.rotation.x = -flap * .2;
        elbow.rotation.z = side * (-.22 + Math.sin(beat - .8) * (.2 + power * .36));
      });

      tail.wave(.13 + speed * .11, surge * Math.PI * 2, 'y');
      tail.links[0].rotation.x = .3 - climb * .52 - lean * .18;
      legs.forEach((leg, i) => {
        leg.hip.rotation.x = .5 - climb * .42 + Math.sin(surge * Math.PI * 2 + i * 2.2) * .15;
        leg.knee.rotation.x = .62 + power * .5;
        leg.ankle.rotation.x = -.3 - power * .3;
      });

      // A puff is rare and quick: the head rears, the jaw drops, embers go.
      since += dt;
      if (since > 3.2 + (surge % 1.6)) since = 0;
      const gape = Math.max(0, 1 - Math.abs(since - .2) * 3.4);
      // Leaning forward is the body's business; the head stays on the horizon.
      neck.rotation.x = -.16 - lean * .12 - power * .24 - gape * .3;
      head.rotation.x = -gape * .18 + Math.sin(time * 1.6) * .09 * (1 - speed);
      head.rotation.y = Math.sin(time * .9) * .36 * (1 - speed);
      jaw.rotation.x = .12 + gape * .62;
      sparks.forEach((spark, i) => {
        // Each ember lags the one before it. A spent one is drawn back into the
        // throat as it dies, so no glow is left hanging in the air until the next puff.
        const life = clamp(since * 2.1 - i * .16, 0, 1);
        const flight = life < 1 ? life : 0;
        spark.mesh.position.set(spark.sway * flight * .04, spark.climb * flight * .03 - flight * flight * .018, flight * .07);
        spark.mesh.scale.setScalar(Math.sin(life * Math.PI) * .014);
      });

      if (time > blink) { blink = time + 3.6 + (surge % 2); }
      const shut = Math.max(0, 1 - Math.abs(time - blink + 3.6) * 15);
      leftEye.scale.y = rightEye.scale.y = 1 - shut * .85;
    },
  };
}
