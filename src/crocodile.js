import { blockGeometry } from './pets/voxel-shapes.js';
import { sampleCaptureMotion } from './motion.js';

/** A low, armoured jungle guardian. All pivots stay inside overlapping joints.
 * Awareness changes its pose only; patrols and collisions belong to the engine.
 */
export function buildCrocodile(tools, parent, seed = 0) {
  const { THREE, geometry, material, mesh, animations, block } = tools;
  const cut = geometry(blockGeometry(THREE, 1, 1, 1, .08));
  const skin = material(seed % 3 > 1.5 ? 0x577744 : 0x517846);
  const flank = material(0x79914e), armour = material(0x304f36);
  const belly = material(0xc9b77c), ivory = material(0xf5e3b4);
  const gold = material(0xe7b84e, { roughness: .4 });
  const black = material(0x182820), flesh = material(0x98574c);
  const group = (owner, name, x = 0, y = 0, z = 0) => {
    const node = new THREE.Group(); node.name = name; node.position.set(x, y, z); owner.add(node); return node;
  };
  const part = (owner, surface, pos, size) => mesh(owner, cut, surface, pos, size);
  const body = group(parent, 'croc-body', 0, .18, -.03);
  const trunk = part(body, skin, [0, 0, -.07], [.32, .19, .44]);
  part(body, belly, [0, -.074, -.04], [.27, .055, .41]);
  part(body, flank, [0, .056, -.095], [.255, .085, .34]);
  for (const side of [-1, 1]) {
    for (let row = 0; row < 4; row++) {
      part(body, armour, [side * .064, .108, .038 - row * .08], [.065, .047, .058]);
      // Small square scales break up the flat flanks, with no blurry texture.
      mesh(body, block, row % 2 ? flank : armour, [side * .159, .015, .043 - row * .085], [.012, .035, .04]);
    }
  }

  const neck = group(body, 'croc-neck', 0, .028, .095);
  part(neck, skin, [0, -.005, .028], [.218, .14, .135]);
  const head = group(neck, 'croc-head', 0, .018, .07);
  part(head, skin, [0, 0, .015], [.265, .145, .16]);
  part(head, flank, [0, -.03, .153], [.226, .09, .265]);
  part(head, skin, [0, -.005, .115], [.208, .055, .175]);
  part(head, flesh, [0, -.073, .151], [.197, .012, .25]);
  const jaw = group(head, 'croc-jaw', 0, -.065, -.016);
  part(jaw, belly, [0, -.013, .167], [.214, .045, .291]);
  part(jaw, flesh, [0, .012, .167], [.188, .014, .263]);
  part(jaw, flesh, [0, .023, .13], [.094, .019, .11]);
  const eyes = [];
  for (const side of [-1, 1]) {
    part(head, armour, [side * .105, .046, .012], [.095, .087, .10]);
    const eye = group(head, 'croc-eye', side * .114, .066, .052);
    part(eye, gold, [0, 0, 0], [.062, .054, .043]);
    const pupil = mesh(eye, block, black, [0, .001, .024], [.016, .037, .008]);
    mesh(eye, block, ivory, [-side * .01, .012, .029], [.011, .010, .006]);
    const brow = part(eye, armour, [0, .032, -.001], [.085, .023, .068]);
    brow.rotation.z = side * -.14;
    const lid = part(eye, skin, [0, .026, .014], [.066, .003, .044]);
    eyes.push({ pupil, brow, lid, side });
    part(head, armour, [side * .067, .019, .242], [.047, .027, .041]);
    mesh(head, block, black, [side * .067, .021, .264], [.025, .012, .007]);
    for (let tooth = 0; tooth < 3; tooth++) {
      const z = .072 + tooth * .077;
      part(head, ivory, [side * .10, -.084, z], [.026, .032, .026]);
      if (tooth < 2) part(jaw, ivory, [side * .092, .025, z + .05], [.024, .029, .024]);
    }
  }

  let owner = body;
  const tail = [];
  for (let i = 0; i < 4; i++) {
    const joint = group(owner, `croc-tail-${i}`, 0, i ? 0 : -.016, i ? -.105 : -.255);
    const width = .19 * (.73 ** i);
    part(joint, i === 3 ? armour : skin, [0, 0, -.054], [width, .11 * (.8 ** i), .14]);
    part(joint, armour, [0, .059 * (.8 ** i), -.06], [width * .45, .035 * (.82 ** i), .068]);
    tail.push(joint); owner = joint;
  }

  const legs = [];
  for (const [index, [side, z]] of [[-1, .08], [1, .08], [-1, -.20], [1, -.20]].entries()) {
    const hip = group(body, `croc-hip-${index}`, side * .125, -.012, z);
    part(hip, skin, [side * .062, -.018, -.015], [.15, .086, .103]);
    const knee = group(hip, `croc-knee-${index}`, side * .103, -.04, -.027);
    part(knee, flank, [0, -.023, .005], [.075, .083, .076]);
    const foot = group(knee, `croc-foot-${index}`, side * .012, -.068, .023);
    part(foot, armour, [0, -.012, .016], [.101, .037, .105]);
    for (let toe = -1; toe <= 1; toe++) part(foot, ivory, [toe * .031, -.008, .072], [.02, .022, .041]);
    legs.push({ hip, knee, foot, side });
  }

  const target = new THREE.Vector3();
  let alert = 0, gaze = 0, stride = seed, blinkClock = 1.8 + seed % 2;
  animations.push((time, { walking = 0, dt = .016, heroPosition = null, capture = null } = {}) => {
    dt = Math.max(0, Math.min(.1, dt));
    const catching = capture === null ? null : sampleCaptureMotion(capture);
    let watch = 0, aim = 0;
    if (heroPosition) {
      parent.updateWorldMatrix(true, false);
      parent.worldToLocal(target.copy(heroPosition));
      watch = THREE.MathUtils.clamp((2.4 - Math.hypot(target.x, target.z)) / 1.5, 0, 1);
      aim = THREE.MathUtils.clamp(Math.atan2(target.x, target.z), -.7, .7);
    }
    alert += (watch - alert) * (1 - Math.exp(-dt * 4));
    gaze += (aim * alert - gaze) * (1 - Math.exp(-dt * 6));
    stride += dt * (3 + walking * 8);
    body.position.y = .18 + Math.sin(time * 1.65 + seed) * .003 + Math.abs(Math.sin(stride)) * walking * .007;
    body.position.z = -.03 + (catching?.lunge || 0) * .2;
    body.rotation.z = Math.sin(stride) * walking * .045;
    trunk.scale.y = .19 * (1 + Math.sin(time * 1.65 + seed) * .025);
    neck.rotation.y = gaze * (1 - walking * .45) + Math.sin(time * .45 + seed) * .09 * (1 - alert);
    neck.rotation.x = -.10 * alert - .025 * Math.sin(time * 1.1 + seed);
    const yawn = Math.max(0, Math.sin(time * .72 + seed)) ** 18 * (1 - alert);
    const warning = Math.max(0, Math.sin(time * 2.5 + seed)) ** 10 * alert;
    jaw.rotation.x = catching ? .06 + catching.jawOpen * .9 : .06 + yawn * .38 + alert * .15 + warning * .16;
    tail.forEach((joint, i) => {
      joint.rotation.y = Math.sin(time * 1.5 + seed - i * .68) * (.09 + alert * .07)
        + Math.sin(stride - i * .65) * walking * .16;
      joint.rotation.x = -.025 + Math.sin(time * 1.1 + i) * .025;
    });
    legs.forEach(({ hip, knee, foot, side }, i) => {
      const phase = stride + (i === 0 || i === 3 ? 0 : Math.PI);
      hip.rotation.x = Math.sin(phase) * walking * .38;
      hip.rotation.y = side * (.12 + Math.cos(phase) * walking * .23);
      knee.rotation.x = Math.max(0, -Math.cos(phase)) * walking * .5;
      foot.rotation.x = -hip.rotation.x - knee.rotation.x;
    });
    blinkClock -= dt;
    if (blinkClock < -.16) blinkClock = 2.7 + (seed % 1.8) + alert;
    const shut = Math.max(0, 1 - Math.abs(blinkClock) / .11);
    eyes.forEach(({ pupil, brow, lid, side }) => {
      pupil.position.x = gaze * .012;
      pupil.scale.x = .016 - alert * .005;
      brow.rotation.z = side * (-.14 - alert * .21);
      lid.scale.y = .003 + shut * .052;
      lid.position.y = .026 - shut * .026;
    });
  });
  return body;
}
