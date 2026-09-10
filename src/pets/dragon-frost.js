/** Dragon de givre — a crystal glider that almost never flaps.
 *
 * It rides on broad stiff panes instead of membranes: the wings only tilt to
 * carry a turn while the whole body rolls slowly along its own length. Its
 * crest rings — every spike on its own pitch — and a thin fall of frost
 * crystals condenses beneath it and is gone before it reaches the stones.
 */
import { creatureKit } from './kit.js';

const TAU = Math.PI * 2;

/** Wing panes, root to tip: broad flat facets, cut so the seams read as edges. */
const PANES = [
  [[0, -.034], [.060, -.033], [.066, .054], [0, .062]],
  [[.056, -.033], [.108, -.030], [.112, .042], [.062, .054]],
  [[.104, -.030], [.148, .004], [.108, .042]],
];
const FIN = [[0, -.008], [.016, .03], [.036, .036], [.03, -.016]];

export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  const { THREE, geo, orb, cone, pill, blade, mat, glow, group, piece, eyes, limb, chain } = kit;
  const shard = geo(new THREE.OctahedronGeometry(1, 0));
  const ice = mat(palette.primary, { roughness: .3, metalness: .2 });
  const rime = mat(palette.secondary, { roughness: .22 });
  const edge = glow(palette.accent);
  const pane = mat(palette.secondary, { transparent: true, opacity: .34, roughness: .06, metalness: .3, side: THREE.DoubleSide });

  // A deep keeled hull: the thin neck and tail have to read against a real body.
  const body = group(root, 0, 0, 0);
  piece(body, pill, ice, [0, 0, 0], [.032, .05, .036]).rotation.x = Math.PI / 2;
  piece(body, pill, rime, [0, -.02, .008], [.022, .042, .022]).rotation.x = Math.PI / 2;
  piece(body, orb, ice, [0, .008, .05], [.035, .032, .034]);

  // Each crest spike hangs on its own pivot, so each can ring at its own pitch.
  const spikes = [];
  function spike(parent, [x, y, z], size, tilt) {
    const stem = group(parent, x, y, z);
    stem.rotation.x = tilt;
    piece(stem, cone, edge, [0, size * .5, 0], [size * .3, size, size * .13]);
    spikes.push({ stem, tilt, rate: 5.4 + spikes.length * 1.15 });
  }
  spike(body, [0, .031, .036], .03, -.42);
  spike(body, [0, .034, .006], .038, -.3);
  spike(body, [0, .033, -.026], .033, -.2);
  spike(body, [0, .026, -.052], .024, -.1);

  const neckBase = group(body, 0, .028, .054);
  neckBase.rotation.y = Math.PI;
  const neck = chain(neckBase, { count: 5, length: .028, thickness: .016, taper: .88, colour: ice });
  neck.links.slice(1, 4).forEach((link, i) => spike(link, [0, .011, -.013], .019 - i * .003, .35));

  const headMount = group(neck.links.at(-1), 0, 0, -.028);
  headMount.rotation.y = Math.PI;
  const head = group(headMount, 0, 0, 0);
  piece(head, orb, ice, [0, .004, 0], [.026, .024, .03]);
  piece(head, orb, rime, [0, -.005, .032], [.015, .012, .028]);
  piece(head, cone, edge, [0, .001, .058], [.007, .016, .007]).rotation.x = Math.PI / 2;
  const jaw = group(head, 0, -.012, .008);
  piece(jaw, orb, rime, [0, -.004, .022], [.013, .008, .026]);
  for (const side of [-1, 1]) {
    piece(head, cone, edge, [side * .014, .02, -.014], [.009, .042, .009]).rotation.set(-.95, 0, side * -.3);
    piece(head, blade([[0, 0], [side * .032, .016], [side * .028, -.02]], .004), pane, [side * .021, -.002, -.006]).rotation.y = side * .5;
  }
  const [leftEye, rightEye] = eyes(head, { x: .017, y: .01, z: .021, size: .0098, pupil: palette.eye, glowing: true });

  const wings = [-1, 1].map(side => {
    const shoulder = group(body, side * .028, .02, .02);
    // Panes sit at slightly different dihedrals: the wing is cut, not sewn.
    const panes = PANES.map((points, i) => {
      const plate = group(shoulder, 0, i * .0025, 0);
      plate.rotation.z = side * (.06 - i * .07);
      piece(plate, blade(points.map(([x, y]) => [x * side, y]), .005), pane, [0, -.0025, 0]).rotation.x = -Math.PI / 2;
      return plate;
    });
    piece(shoulder, pill, edge, [side * .052, .004, .03], [.0033, .035, .0033]).rotation.z = Math.PI / 2;
    // The lit tip rides the outer pane, so it never drifts off the wing.
    piece(panes.at(-1), cone, edge, [side * .142, -.0025, 0], [.005, .022, .005]).rotation.z = side * -Math.PI / 2;
    return { shoulder, side, panes };
  });

  const tail = chain(body, { x: 0, y: .004, z: -.064, count: 5, length: .026, thickness: .018, taper: .82, colour: ice });
  spike(tail.links[1], [0, .012, -.013], .018, -.2);
  spike(tail.links[3], [0, .009, -.011], .014, -.1);
  piece(tail.links.at(-1), blade(FIN, .004), pane, [0, -.014, -.02]).rotation.y = Math.PI / 2;

  const legs = [
    limb(body, { x: -.028, y: -.016, z: .034, thigh: .03, shin: .024, thickness: .011, colour: ice, foot: edge, footSize: .55 }),
    limb(body, { x: .028, y: -.016, z: .034, thigh: .03, shin: .024, thickness: .011, colour: ice, foot: edge, footSize: .55 }),
    limb(body, { x: -.03, y: -.014, z: -.024, thigh: .034, shin: .027, thickness: .012, colour: ice, foot: edge, footSize: .62 }),
    limb(body, { x: .03, y: -.014, z: -.024, thigh: .034, shin: .027, thickness: .012, colour: ice, foot: edge, footSize: .62 }),
  ];

  // Motes hang off the root, not the body: what he sheds does not roll with him.
  const motes = [0, 1, 2, 3, 4, 5].map(i => ({
    mesh: piece(root, shard, edge, [0, 0, 0], [.008]),
    phase: i / 6,
    rate: .78 + (i % 3) * .17,
    span: .07 + (i % 2) * .022,
    size: .009 - (i % 3) * .002,
    x: (i - 2.5) * .016,
    z: .03 - (i % 4) * .026,
  }));

  let glide = 0;
  let fall = 0;
  let bank = 0;
  let poise = 0;
  let blink = 3.1;
  return {
    ground: false,
    home: [-.62, 0, -.12],
    animate(time, { moving = false, speed = 0, dt = .016 } = {}) {
      glide += dt * (.82 + speed * 2.05);
      fall += dt * (.5 + speed * 1.2);
      // A course, not a mood: the glider takes a while to commit, and to unwind.
      poise += ((moving ? 1 : 0) - poise) * (1 - Math.exp(-dt * 2.2));
      // The bank is held, so the roll lags the intent instead of snapping to it.
      const lean = Math.sin(glide * .87) * (.17 + speed * .42);
      bank += (lean - bank) * (1 - Math.exp(-dt * 3.1));
      body.rotation.z = bank;
      body.rotation.y = -bank * .5;
      body.rotation.x = -.04 - poise * .16 + Math.sin(glide * .61) * .07;
      body.position.y = Math.sin(glide * .74) * (.007 + speed * .016);
      body.position.z = Math.sin(glide * .53) * speed * .014;

      wings.forEach(({ shoulder, side, panes }) => {
        // Barely a beat: the wings hold their angle and lean into the turn.
        shoulder.rotation.z = side * (.19 + Math.sin(glide * 1.12 + side) * .04) + lean * .62;
        shoulder.rotation.x = -.05 - poise * .26 + Math.sin(glide * .93 + side * .7) * .05;
        shoulder.rotation.y = side * (bank * .34 - poise * .1);
        panes.forEach((plate, i) => {
          // Washout: the outer panes twist further into the turn than the root.
          plate.rotation.z = side * (.06 - i * .07) + lean * i * .12 + Math.sin(glide * (1.5 + i * .55) + side * 1.3) * .025;
        });
      });

      neck.wave(.05 + speed * .07, glide * 1.15, 'y');
      neck.links[0].rotation.x = .26 - poise * .32 + Math.sin(glide * .68) * .07;
      neck.links[2].rotation.x = -.14 + poise * .18;
      head.rotation.y = Math.sin(time * .47) * .34 * (1 - poise);
      head.rotation.x = Math.sin(time * .71) * .12 + poise * .1;
      const breath = (1 - Math.cos(glide * 1.6)) * .5;
      jaw.rotation.x = .05 + breath * .17 * (1 - poise * .55);

      tail.wave(.1 + speed * .14, glide * 1.42, 'y');
      tail.links[0].rotation.x = .1 + Math.sin(glide * .82) * .09 - poise * .22;

      spikes.forEach(({ stem, tilt, rate }) => {
        // Ice sings: every spike shivers at its own frequency, none in unison.
        stem.rotation.x = tilt + Math.sin(time * rate) * (.05 + speed * .06);
        stem.rotation.z = Math.cos(time * rate * .73) * (.04 + speed * .04);
      });

      // Landing gear stays folded in flight: knees out, feet drawn to the belly.
      legs.forEach((leg, i) => {
        leg.hip.rotation.x = .62 + poise * .22 + Math.sin(glide * 1.3 + i * 1.6) * (.07 + speed * .07);
        leg.knee.rotation.x = -2.3 - poise * .2 + Math.sin(glide * 1.05 + i * 2.2) * (.09 + speed * .08);
        leg.ankle.rotation.x = 1.62;
      });

      motes.forEach(mote => {
        const cycle = (fall * mote.rate + mote.phase) % 1;
        const drop = (1 - Math.cos(cycle * TAU)) * .5;
        mote.mesh.position.set(
          mote.x + Math.sin(cycle * TAU + mote.phase * TAU) * .013,
          -.03 - drop * mote.span,
          mote.z - drop * (.03 + speed * .08));
        // The crystal thins away as it sinks; its climb back happens unseen.
        mote.mesh.scale.setScalar(mote.size * Math.max(0, Math.sin(cycle * TAU)));
        mote.mesh.rotation.set(cycle * 5.1, cycle * 7.3, 0);
      });

      if (time > blink) { blink = time + 4.2 + (glide % 3); }
      const shut = Math.max(0, 1 - Math.abs(time - blink + 4.2) * 16);
      leftEye.scale.y = rightEye.scale.y = 1 - shut * .85;
    },
  };
}
