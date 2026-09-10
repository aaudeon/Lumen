/** Petit Saturne — une planète de poche et sa lune.
 *
 * Ne marche pas : il flotte. Le globe tourne sur son axe penché, les trois
 * anneaux glissent en sens contraires, et la lune boucle son orbite en passant
 * derrière. Quand Lumen part, tout le système s'emballe.
 */
import { creatureKit } from './kit.js';

export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  const { THREE, geo, orb, ring, dome, mat, glow, group, piece } = kit;
  const crust = mat(palette.primary, { roughness: .82 });
  const pale = mat(palette.secondary, { roughness: .66 });
  const gold = mat(palette.accent, { roughness: .5, metalness: .25 });
  const storm = glow(palette.accent);
  const spark = glow(palette.eye ?? 0xffffff);
  const shard = geo(new THREE.OctahedronGeometry(1));
  const icecap = dome(.26);

  const system = group(root, 0, .012, 0);
  // The axis carries the globe, so its slow precession also sways the bands.
  const axis = group(system, 0, 0, 0);
  const globe = group(axis, 0, 0, 0);
  const equator = .052;
  const polar = equator * .94;
  /** Radius of the globe at a given height: the bands and the storms ride on it. */
  const skin = height => equator * Math.sqrt(Math.max(0, 1 - (height / polar) ** 2));
  piece(globe, orb, crust, [0, 0, 0], [equator, polar, equator]);
  for (const [height, paint] of [[-.028, pale], [-.010, gold], [.010, pale], [.027, gold]]) {
    piece(globe, orb, paint, [0, height, 0], [skin(height) * 1.03, .0065, skin(height) * 1.03]);
  }
  // Both ice caps, hugging the crust: the pair is what shows the axis is tilted.
  for (const flip of [0, Math.PI]) {
    piece(globe, icecap, pale, [0, 0, 0], [equator * 1.02, polar * 1.02, equator * 1.02]).rotation.x = flip;
  }
  // Two storms lying flat on the crust, well off the axis: they make the spin readable.
  for (const [longitude, height, size] of [[0, -.007, .016], [2.3, .024, .010]]) {
    const spot = group(globe, 0, 0, 0);
    spot.rotation.y = longitude;
    piece(spot, orb, storm, [0, height, skin(height) * .94], [size, size * .62, size * .42]);
  }

  const belts = [
    { span: .070, thickness: .0066, surface: gold, tilt: [.22, .15], rate: 1.5, rocks: 4 },
    { span: .090, thickness: .0048, surface: pale, tilt: [.47, -.09], rate: -1.05, rocks: 4 },
    { span: .110, thickness: .0034, surface: crust, tilt: [.72, .12], rate: .62, rocks: 3 },
  ].map(belt => {
    const plane = group(system, 0, 0, 0);
    plane.rotation.set(belt.tilt[0], 0, belt.tilt[1]);
    const spinner = group(plane, 0, 0, 0);
    piece(spinner, ring(belt.span, belt.thickness), belt.surface, [0, 0, 0]).rotation.x = -Math.PI / 2;
    // Loose rock caught in the ring: a bare torus would spin invisibly.
    for (let i = 0; i < belt.rocks; i++) {
      const angle = i / belt.rocks * Math.PI * 2;
      piece(spinner, orb, i % 2 ? pale : gold, [Math.cos(angle) * belt.span, 0, Math.sin(angle) * belt.span], [.0085, .0056, .0085]);
    }
    return { spinner, rate: belt.rate };
  });

  // The moon runs outside the last ring, so its orbit never cuts through one.
  const moonPlane = group(system, 0, 0, 0);
  moonPlane.rotation.set(.44, 0, -.16);
  const moonArm = group(moonPlane, 0, 0, 0);
  const moon = group(moonArm, .144, 0, 0);
  piece(moon, orb, pale, [0, 0, 0], [.0165, .0157, .0165]);
  piece(moon, orb, crust, [0, .004, .0146], [.008, .0065, .004]);

  // The sparks keep to the poles, clear of the rings and of the moon's lane.
  const stars = [[.108, .92, .126], [.132, -.64, -.132], [.098, 1.36, .142], [.126, .74, -.122], [.114, -1.08, .134]]
    .map(([reach, rate, height], i) => {
      const node = group(system, 0, 0, 0);
      piece(node, shard, spark, [0, 0, 0], [.007, .010, .007]);
      return { node, reach, rate, height, phase: i * 1.7 };
    });

  let spin = 0;
  let lean = 0;
  return {
    expression: { orbits: belts.map(belt => belt.spinner) },
    ground: false,
    home: [-.62, 0, -.12],
    scale: 1,
    animate(time, { moving = false, speed = 0, dt = .016 } = {}) {
      // One clock winds the whole system, so every orbit quickens together.
      spin += dt * (1 + speed * 2.4);
      lean += ((moving ? 1 : 0) - lean) * (1 - Math.exp(-dt * 3));
      globe.rotation.y = spin * 1.6;
      axis.rotation.z = .32 + Math.sin(spin * .5) * .06;
      axis.rotation.x = Math.sin(spin * .37) * .05;
      belts.forEach(belt => { belt.spinner.rotation.y = spin * belt.rate; });
      moonArm.rotation.y = -spin * 1.15;
      moon.rotation.y = spin * .9;
      moonPlane.rotation.z = -.16 + Math.sin(spin * .3) * .08;
      // The system tips back as Lumen tows it, then rights itself.
      system.rotation.x = -lean * .18 + Math.sin(spin * .45) * .03;
      system.rotation.z = Math.sin(spin * .33) * .04 - lean * .05;
      stars.forEach((star, i) => {
        const angle = spin * star.rate + star.phase;
        star.node.position.set(Math.cos(angle) * star.reach, star.height + Math.sin(angle * .7) * .006, Math.sin(angle) * star.reach);
        star.node.scale.setScalar(.55 + Math.abs(Math.sin(spin * (2.1 + i * .6) + star.phase)) * .75);
      });
    },
  };
}
