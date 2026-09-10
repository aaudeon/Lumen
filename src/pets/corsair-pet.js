/** Poulpe navigateur — il rame dans l'air, par jets.
 *
 * Ne marche pas : il nage. Le manteau se contracte, les huit tentacules se
 * rassemblent vers l'arrière, il bondit d'un coup — puis les bras s'ouvrent en
 * corolle pendant qu'il ralentit, et le cycle recommence. Chaque bras garde son
 * propre déphasage, et Lumen en marche enchaîne les jets.
 */
import { creatureKit } from './kit.js';

const TAU = Math.PI * 2;

/** One jet stroke: a brutal rise then a long decay. A sine would only glide. */
function burst(phase, rise = .2) {
  const t = (phase % 1 + 1) % 1;
  return t < rise
    ? Math.sin(t / rise * Math.PI / 2)
    : Math.cos((t - rise) / (1 - rise) * Math.PI / 2) ** 2;
}

export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  const { orb, cone, disc, mat, glow, group, piece, eyes, chain } = kit;
  const hide = mat(palette.primary, { roughness: .72 });
  const pale = mat(palette.secondary, { roughness: .58 });
  const coral = mat(palette.accent, { roughness: .5 });
  const spark = glow(palette.accent);

  const body = group(root, 0, 0, 0);
  // The mantle is one sac tapering to a tail: the arms leave it at the narrow
  // end, so no tentacle ever runs through a lobe of the body.
  const mantle = group(body, 0, .015, -.012);
  piece(mantle, orb, hide, [0, 0, 0], [.05, .055, .052]);
  piece(mantle, orb, hide, [0, .012, -.04], [.046, .048, .042]);
  piece(mantle, orb, hide, [0, .022, -.072], [.03, .032, .028]);
  piece(mantle, orb, pale, [0, -.03, -.008], [.038, .024, .046]);
  // Hooded ridges: they ride the mantle, so the squeeze reads on the face too.
  for (const side of [-1, 1]) piece(mantle, orb, hide, [side * .037, .028, .014], [.026, .017, .026]);
  const [leftEye, rightEye] = eyes(mantle, { x: .042, y: .004, z: .018, size: .023, pupil: palette.eye ?? 0x24343d });
  leftEye.rotation.y = -.62;
  rightEye.rotation.y = .62;

  const star = group(mantle, 0, .045, .03);
  star.rotation.x = -.93;
  const rays = [];
  for (let i = 0; i < 5; i++) {
    const angle = i / 5 * TAU;
    const ray = group(star, Math.sin(angle) * .011, Math.cos(angle) * .011, 0);
    ray.rotation.z = -angle;
    piece(ray, cone, coral, [0, .011, 0], [.007, .026, .005]);
    rays.push(ray);
  }
  piece(star, orb, spark, [0, 0, .003], [.011, .011, .006]);

  // Le siphon: slung clear of the belly, mouth astern, so the flare that pushes
  // him along is visible from the side.
  const siphon = group(body, 0, -.028, -.02);
  piece(siphon, cone, pale, [0, 0, -.02], [.014, .046, .014]).rotation.x = Math.PI / 2;
  piece(siphon, orb, coral, [0, 0, -.04], [.012, .012, .009]);
  const bloom = group(siphon, 0, 0, -.045);
  piece(bloom, orb, spark, [0, 0, 0], [.012, .012, .009]);

  // Eight arms on a ring around the tail: `roll` spaces them, `fan` is the one
  // hinge that shuts them into a spear or opens the corolla.
  const skirt = group(body, 0, .033, -.084);
  const arms = [];
  for (let i = 0; i < 8; i++) {
    const roll = group(skirt, 0, 0, 0);
    roll.rotation.z = (i + .5) / 8 * TAU;
    const fan = group(roll, 0, .026, 0);
    const arm = chain(fan, { count: 5, length: .026, thickness: .0155, taper: .82, colour: pale });
    // A sucker every other arm — the mesh budget pays for the corolla instead.
    if (i % 2) piece(arm.links[2], disc, coral, [0, -.013, -.012], [.008, .006, .008]);
    arms.push({ ...arm, fan, own: i * .786 });
  }

  let jet = .35;
  let drive = 0;
  let blink = 2.6;
  return {
    ground: false,
    home: [-.62, 0, -.14],
    scale: 1.1,
    animate(time, { moving = false, speed = 0, dt = .016 } = {}) {
      drive += ((moving ? 1 : 0) - drive) * (1 - Math.exp(-dt * 3.4));
      // One clock for the whole jet: mantle, arms and glide can never disagree.
      jet += dt * (.5 + drive * .34 + speed * .82);
      const squeeze = burst(jet);
      const gather = burst(jet + .07);
      const lunge = burst(jet - .08);
      const open = 1 - gather;

      mantle.scale.set(1 - squeeze * .24, 1 - squeeze * .26, 1 + squeeze * .16);
      mantle.position.z = -.012 - squeeze * .012;
      siphon.scale.set(1 + squeeze * .5, 1 + squeeze * .5, 1 + squeeze * .28);
      siphon.rotation.x = -.2 + squeeze * .26;
      // The water he throws away: a bead of light that swells with the stroke.
      bloom.scale.setScalar(.28 + squeeze * .95);

      body.position.z = lunge * .052 - .014;
      body.position.y = lunge * .02 - .006 + Math.sin(time * .8) * .005;
      body.rotation.x = -lunge * .16 + Math.sin(time * .7) * .04;
      body.rotation.z = Math.sin(time * .53) * .13 * (1 - speed * .6);

      arms.forEach(arm => {
        const ripple = jet * 5.2 + time * 1.2 + arm.own;
        // Snapped back into a spear for the jet, spread wide into a corolla after.
        arm.fan.rotation.x = .26 + open * .72 + Math.sin(time * 1.5 + arm.own) * .08;
        arm.wave(.14 + open * .2, ripple, 'x');
        arm.wave(.07 + open * .1, ripple * .62 + arm.own * 1.9, 'y');
        const curl = open * .17 - gather * .1;
        arm.links.forEach((link, k) => { link.rotation.x += curl * (.4 + k * .3); });
      });

      star.rotation.z = time * .5;
      star.rotation.x = -.93 + squeeze * .16;
      rays.forEach((ray, i) => { ray.scale.y = 1 + Math.sin(time * 2.6 + i * 1.3) * .16 - squeeze * .12; });

      if (time > blink) blink = time + 3.1 + (jet % 2);
      const shut = Math.max(0, 1 - Math.abs(time - blink + 3.1) * 13);
      leftEye.scale.y = rightEye.scale.y = 1 - shut * .88;
      leftEye.rotation.x = rightEye.rotation.x = Math.sin(time * .9) * .18 - lunge * .12;
    },
  };
}
