/** Méduse de l’estran — the tide-pool jellyfish, found at the end of a secret way.
 *
 * She does not fly so much as fall upward. The bell snaps shut and she jumps a
 * hand's width; then it hangs open and she sinks, slower and slower, until the
 * next beat. Eight filaments learn of each jump a half-second late, link by
 * link, and the pink heart under the crown flares with every stroke. At rest
 * her rhythm wanders and she turns on herself; when Lumen sets off she faces
 * the way he goes and beats in a hurry.
 */
import { creatureKit } from './kit.js';

const TAU = Math.PI * 2;
const wrap = phase => ((phase % 1) + 1) % 1;

/** The bell over one beat: shut in a snap, released slower, then left hanging open. */
function squeeze(phase) {
  const t = wrap(phase);
  if (t < .16) return Math.sin(t / .16 * Math.PI / 2);
  if (t < .64) return Math.cos((t - .16) / .48 * Math.PI / 2) ** 2;
  return 0;
}
/** Height over one beat: a kick that runs out fast, then a fall that gathers pace. */
function lift(phase) {
  const t = wrap(phase);
  return t < .3 ? Math.sin(t / .3 * Math.PI / 2) : 1 - ((t - .3) / .7) ** 1.7;
}
/** How hard the water drags on whatever hangs below her. */
function haul(phase) {
  const t = wrap(phase);
  return t < .3 ? Math.sin(t / .3 * Math.PI) : 0;
}

export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  const { THREE, box, orb, disc, dome, ring, mat, glow, group, piece, chain } = kit;
  // Glass only reads as glass if both faces catch light and it never hides what floats inside.
  const glass = mat(palette.primary, { transparent: true, opacity: .5, roughness: .22, side: THREE.DoubleSide, depthWrite: false });
  const veil = mat(palette.secondary, { transparent: true, opacity: .34, roughness: .3, side: THREE.DoubleSide, depthWrite: false });
  const skin = mat(palette.primary, { roughness: .5 });
  const frill = mat(palette.secondary, { roughness: .6 });
  const flesh = mat(palette.accent, { roughness: .55 });
  const heart = glow(palette.accent);
  const halo = glow(palette.eye ?? 0xffffff);

  const body = group(root, 0, 0, 0);
  const spin = group(body, 0, 0, 0);
  const bell = group(spin, 0, .06, 0);
  piece(bell, dome(.56), glass, [0, 0, 0], [.076, .062, .076]).castShadow = false;
  piece(bell, dome(.5), veil, [0, .004, 0], [.06, .048, .06]).castShadow = false;
  piece(bell, ring(.074, .006), frill, [0, -.006, 0]).rotation.x = Math.PI / 2;
  // Radial canals: bars of cold light crossing under the crown, seen through the glass.
  for (let i = 0; i < 4; i++) piece(bell, box, halo, [0, .026, 0], [.1, .003, .005]).rotation.y = i * Math.PI / 4;
  const core = piece(bell, orb, heart, [0, .022, 0], [.02, .017, .02]);
  const pearl = piece(bell, orb, halo, [0, -.014, 0], [.0095, .011, .0095]);
  const scallops = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i + .5) / 8 * TAU;
    const hinge = group(bell, Math.cos(angle) * .07, -.008, Math.sin(angle) * .07);
    hinge.rotation.y = -angle;
    piece(hinge, disc, frill, [.006, -.007, 0], [.011, .007, .016]);
    scallops.push(hinge);
  }

  // A strand hangs from a spoke whose x axis points outward: bending a link about
  // its y draws it in under the bell, about its x swings it along the rim.
  function hang(parent, radius, angle, options) {
    const spoke = group(parent, 0, 0, 0);
    spoke.rotation.y = -angle;
    const hanger = group(spoke, radius, 0, 0);
    hanger.rotation.x = -Math.PI / 2;
    const { links } = chain(hanger, options);
    return { spoke, links, lag: new Float32Array(links.length), own: angle * 2.7 };
  }
  const skirt = group(spin, 0, .052, 0);
  const filaments = [];
  for (let i = 0; i < 8; i++) {
    filaments.push(hang(skirt, .06, i / 8 * TAU,
      { count: 6, length: .028, thickness: .008, taper: .9, colour: i % 2 ? frill : skin }));
  }
  const mouth = group(spin, 0, .044, 0);
  const arms = [0, 1, 2, 3].map(i => hang(mouth, .011, (i + .5) / 4 * TAU,
    { count: 4, length: .03, thickness: .012, taper: .8, colour: flesh }));

  /** The haul runs down a strand one link at a time: the tip learns of the jump last. */
  function drag(strand, pull, ease, time, { grip, splay, hook, ripple, tempo }) {
    const { links, lag, own } = strand;
    for (let k = 0; k < links.length; k++) lag[k] += ((k ? lag[k - 1] : pull) - lag[k]) * ease;
    links.forEach((link, k) => {
      const slack = 1 - lag[k];
      // Hauled, it streams straight and tucks in; slack, it splays and hooks at the tip.
      link.rotation.y = lag[k] * grip - slack * (splay + k * hook);
      link.rotation.x = Math.sin(time * tempo + own + k * .85) * ripple * (.4 + slack);
    });
  }

  let beat = .7;
  let drive = 0;
  let turn = 0;
  return {
    expression: { head: bell, tail: { links: arms.flatMap(arm => arm.links) }, orbits: filaments.map(f => f.spoke) },
    ground: false,
    home: [-.62, 0, -.16],
    scale: 1.1,
    animate(time, { moving = false, speed = 0, dt = .016 } = {}) {
      drive += ((moving ? 1 : 0) - drive) * (1 - Math.exp(-dt * 3));
      // One clock for bell, jump and strands. Idle it wanders; behind Lumen it winds tight.
      beat += dt * (.58 + drive * .5 + speed * .55) * (1 + Math.sin(time * .37) * .28 * (1 - drive));
      const shut = squeeze(beat);
      const height = lift(beat - .05);
      const pull = haul(beat - .05);

      bell.scale.set(1 - shut * .2, 1 + shut * .3, 1 - shut * .2);
      skirt.scale.set(1 - shut * .18, 1, 1 - shut * .18);
      core.scale.set(.02 + shut * .008, .017 + shut * .012, .02 + shut * .008);
      pearl.scale.set(.0095 + shut * .003, .011 + shut * .004, .0095 + shut * .003);
      // The light is the stroke made visible: it flares as the bell shuts.
      heart.emissiveIntensity = 1.2 + shut * 2;
      halo.emissiveIntensity = .9 + shut * 1.6;
      scallops.forEach((hinge, i) => {
        hinge.rotation.z = -shut * .7 + Math.sin(time * 3.1 + i * 1.3) * .14 * (1 - shut);
      });

      body.position.y = (height - .42) * (.05 + speed * .03);
      // The bell leads when she follows; at rest she turns slowly on herself.
      body.rotation.x = drive * .3 + (height - .5) * .08;
      body.rotation.z = Math.sin(time * .47) * .05;
      turn += dt * .32 * (1 - drive);
      spin.rotation.y = turn;

      const ease = 1 - Math.exp(-dt * 13);
      for (const filament of filaments) drag(filament, pull, ease, time, { grip: .1, splay: .02, hook: .035, ripple: .11, tempo: 2.4 });
      for (const arm of arms) drag(arm, pull, ease * .8, time, { grip: .06, splay: .05, hook: .09, ripple: .1, tempo: 1.6 });
    },
  };
}
