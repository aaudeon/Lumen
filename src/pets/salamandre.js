/** Salamandre des racines — celle qui attend au fond du passage.
 *
 * Lézard bas et long, à plat sur les pierres. Quatre pattes écartées avancent
 * par paires diagonales pendant que le tronc et la queue serpentent en S sous
 * une tête qui ne bouge pas d'une ligne. Des taches de braise le long du dos
 * battent comme un cœur lent, plus vite quand Lumen marche. À l'arrêt c'est une
 * pierre avec une queue : ventre au sol, coudes dehors, seule la queue trace un
 * S paresseux et la langue goûte le noir — et de loin en loin, elle se hisse sur
 * les bras pour deux pompes de parade, l'arrière-train toujours posé.
 */
import { creatureKit } from './kit.js';

// Limb segments, hip to sole. The forearm is solved so the sole meets the ground
// whatever height the trunk rides at: no foot floats, none sinks.
const HUMERUS = .028;
const FOREARM = .02;
const SOLE = .006;
const HIP_DROP = .004;
// Two postures: belly on the stones at rest, up on her legs to walk.
const REST = { height: .031, splay: 1.32 };
const WALK = { height: .046, splay: .95 };
// The display runs on her own clock, offset so a fresh creature never opens on it.
const DISPLAY_CYCLE = 9.5;
const DISPLAY_HOLD = 1.3;
const DISPLAY_OFFSET = 5;
const DISPLAY_PITCH = .19;
// Distances behind the neck pivot: where the rump chain starts, where the shoulders sit.
const RUMP_AT = .08;
const SHOULDER_AT = .018;
// Wave spacing baked into `chain.wave`: tail links continue the rump's phase.
const LINK_PHASE = .8;

/** Forearm angle from vertical that brings the sole to the ground from a hip `drop` above it. */
const reachDown = (splay, drop) =>
  Math.acos(Math.min(1, Math.max(.05, (drop - SOLE - HUMERUS * Math.cos(splay)) / FOREARM)));

export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  const { box, orb, pill, mat, glow, group, piece, eyes, chain } = kit;
  const skin = mat(palette.primary, { roughness: .9 });
  const belly = mat(palette.secondary, { roughness: .78 });
  // Three ember materials, so one pulse can travel from the shoulders to the tail.
  const embers = [0, 1, 2].map(() => glow(palette.accent));
  const spots = [];
  const spot = (parent, rank, at, size) => {
    const mesh = piece(parent, orb, embers[rank % 3], at, size);
    spots.push({ mesh, base: size[1], rank: rank % 3 });
  };

  // The trunk pivots at the neck: its yaw sweeps the body behind, never the head.
  const trunk = group(root, 0, REST.height, .075);
  piece(trunk, pill, skin, [0, 0, -.042], [.031, .03, .021]).rotation.x = Math.PI / 2;
  piece(trunk, pill, belly, [0, -.008, -.042], [.025, .027, .016]).rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) {
    piece(trunk, orb, skin, [side * .022, .005, -.02], [.013, .011, .015]);
    spot(trunk, 0, [side * .016, .022, -.034], [.007, .004, .009]);
    spot(trunk, 1, [side * .009, .024, -.06], [.005, .003, .006]);
  }

  // Hindquarters, then a tapering tail: one serpent from the shoulders back.
  const rump = chain(trunk, { z: -RUMP_AT, count: 3, length: .036, thickness: .027, taper: .92, colour: skin });
  rump.links.forEach((link, i) => {
    const width = .027 * .92 ** i;
    link.children[0].scale.z *= .74;
    piece(link, pill, belly, [0, -.007, -.018], [width * .8, .015, width * .62]).rotation.x = Math.PI / 2;
    const side = i % 2 ? -1 : 1;
    spot(link, i + 2, [side * width * .45, width * .74, -.014], [.0065, .0035, .008]);
    spot(link, i + 1, [-side * width * .3, width * .78, -.03], [.0045, .003, .0055]);
  });
  const tail = chain(rump.links[2], { z: -.036, count: 6, length: .025, thickness: .02, taper: .78, colour: skin });
  tail.links.forEach((link, i) => {
    link.children[0].scale.z *= .85;
    if (i < 4) {
      const width = .02 * .78 ** i;
      spot(link, i + 2, [(i % 2 ? 1 : -1) * width * .3, width * .8, -.014], [.004 * (1 - i * .12), .003, .005]);
    }
  });
  spot(tail.links[5], 2, [0, 0, -.03], [.0035, .0035, .006]);

  // Sprawled leg: humerus out to the side, forearm down, a flat hand with fanned toes.
  function leg(parent, side, z) {
    const hip = group(parent, side * .026, -HIP_DROP, z);
    piece(hip, pill, skin, [0, -HUMERUS / 2, 0], [.011, .012, .0095]);
    const knee = group(hip, 0, -HUMERUS, 0);
    piece(knee, orb, skin, [0, 0, 0], [.011, .01, .01]);
    piece(knee, pill, skin, [0, -FOREARM / 2, 0], [.0085, .0085, .008]);
    const ankle = group(knee, 0, -FOREARM, 0);
    piece(ankle, box, belly, [0, -SOLE / 2, .004], [.016, SOLE, .014]);
    for (const toe of [-1, 0, 1]) {
      piece(ankle, box, skin, [toe * .0055, -.003, .015], [.0035, .0045, .011]).rotation.y = -toe * .42;
    }
    return { hip, knee, ankle, side };
  }
  const legs = [
    leg(trunk, -1, -SHOULDER_AT),
    leg(trunk, 1, -SHOULDER_AT),
    leg(rump.links[1], -1, -.02),
    leg(rump.links[1], 1, -.02),
  ];

  const neck = group(trunk, 0, .004, -.004);
  piece(neck, pill, skin, [0, 0, .014], [.017, .011, .014]).rotation.x = Math.PI / 2;
  piece(neck, pill, belly, [0, -.007, .014], [.013, .01, .01]).rotation.x = Math.PI / 2;
  const head = group(neck, 0, .002, .032);
  piece(head, orb, skin, [0, 0, .006], [.027, .015, .028]);
  piece(head, orb, skin, [0, -.002, .036], [.017, .011, .016]);
  piece(head, orb, belly, [0, -.011, .018], [.021, .005, .03]);
  // The throat sac swells during the display: scale the group, never the mesh.
  const throat = group(head, 0, -.014, .01);
  piece(throat, orb, belly, [0, 0, 0], [.012, .007, .013]);
  for (const side of [-1, 1]) spot(head, 0, [side * .013, .014, -.002], [.0045, .003, .0055]);
  // Eyes bulge on the sides of the skull: dark sclera, and a pupil that glows.
  const [leftEye, rightEye] = eyes(head, {
    x: .022, y: .007, z: .018, size: .0105, white: 0x1b1517, pupil: palette.eye ?? 0xffe9a8, glowing: true,
  });
  leftEye.rotation.y = -.75;
  rightEye.rotation.y = .75;
  const tongue = group(head, 0, -.007, .05);
  piece(tongue, box, belly, [0, 0, .012], [.0028, .0018, .024]);
  for (const side of [-1, 1]) piece(tongue, box, belly, [side * .0025, 0, .027], [.0022, .0018, .008]).rotation.y = -side * .5;

  let flow = 0;
  let walk = 0;
  let clock = 0;
  let heart = 0;
  let blink = 3.4;
  let lastFlick = -10;
  let nextFlick = .8;
  return {
    expression: { head, neck, tail },
    ground: true,
    home: [-.62, 0, -.18],
    scale: 1.1,
    animate(time, { moving = false, speed = 0, dt = .016 } = {}) {
      clock += dt;
      walk += ((moving ? 1 : 0) - walk) * (1 - Math.exp(-dt * 5));
      // One clock for legs, trunk and tail: the S and the steps can never disagree.
      flow += dt * (1.1 + walk * (3 + speed * 11));
      // The heartbeat keeps its own integrated phase: a change of pace never makes it skip.
      heart += dt * (1.6 + walk * .8 + speed * 3.2);

      const show = (clock + DISPLAY_OFFSET) % DISPLAY_CYCLE;
      const display = show < DISPLAY_HOLD ? Math.sin(show / DISPLAY_HOLD * Math.PI) ** 2 * (1 - walk) : 0;
      const bob = display * Math.abs(Math.sin(show / DISPLAY_HOLD * Math.PI * 2));

      // Posture: belly on the stones and elbows out at rest; she rises onto her legs to walk.
      const height = REST.height + (WALK.height - REST.height) * walk;
      const splay = REST.splay + (WALK.splay - REST.splay) * walk;
      // The push-up pitches the trunk nose-up about the neck. Lifting the pivot by the
      // rump's drop and counter-pitching the rump keeps the hindquarters on the ground.
      const pitch = bob * DISPLAY_PITCH;
      const sway = Math.sin(flow) * .12 * walk;
      trunk.rotation.set(-pitch + Math.sin(flow * 2) * .02 * walk, sway, 0);
      trunk.position.set(Math.sin(flow + .4) * .004 * walk, height + Math.sin(pitch) * RUMP_AT, .075);
      rump.links[0].rotation.x = pitch;
      const hipDrop = [height - HIP_DROP + Math.sin(pitch) * (RUMP_AT - SHOULDER_AT), height - HIP_DROP];

      const reach = walk * (.28 + speed * .34);
      legs.forEach((leg, i) => {
        const front = i < 2;
        const phase = flow + (i === 0 || i === 3 ? 0 : Math.PI);
        const swing = Math.sin(phase);
        const lift = Math.max(0, Math.cos(phase)) * walk * .45;
        // Forelegs brace under the chest for the push-up: less sprawl, a straighter arm.
        const out = splay - (front ? bob * .3 : 0);
        const fold = reachDown(out, hipDrop[front ? 0 : 1]);
        leg.hip.rotation.y = -leg.side * swing * reach;
        leg.hip.rotation.z = leg.side * (out + lift);
        leg.knee.rotation.z = -leg.side * (out + lift * .65 - fold);
        // The sole stays flat whatever the forearm does; toes drop on the lifted foot.
        leg.ankle.rotation.z = -leg.side * (fold + lift * .35);
        leg.ankle.rotation.y = leg.side * swing * reach * .6;
        leg.ankle.rotation.x = -lift * .5;
      });

      // The trunk yaws with the stride and the neck cancels it: the head holds its line.
      rump.wave(.17 * walk + .01, flow + .9, 'y');
      tail.wave(.13 + .1 * walk, flow + .9 - 3 * LINK_PHASE, 'y');
      // The tail lies along the ground at rest, and lifts a little to trail behind the walk.
      tail.links[0].rotation.x = -.06 - (1 - walk) * (.07 + Math.sin(flow * .5) * .04);
      neck.rotation.y = -sway * .9;
      neck.rotation.x = -bob * .12;
      head.rotation.x = -bob * .15 - walk * .05;
      throat.scale.setScalar(1 + bob * .7);

      // Two quick flicks, then the tongue stays in for a while.
      if (clock >= nextFlick) { lastFlick = clock; nextFlick = clock + 1.3 + (flow % 1.9); }
      const since = clock - lastFlick;
      const dart = since < .55 ? Math.abs(Math.sin(since / .55 * Math.PI * 2)) ** .6 : 0;
      tongue.scale.z = .06 + dart * .94;

      if (clock > blink) blink = clock + 3.4 + (flow % 1.3);
      const shut = Math.max(0, 1 - Math.abs(clock - blink + 3.4) * 4.5);
      leftEye.scale.y = rightEye.scale.y = 1 - shut * .9;

      // Ember heartbeat down the back: slow when she waits, racing when Lumen walks.
      const pulses = embers.map((ember, k) => {
        const pulse = Math.max(0, Math.sin(heart - k * 1.1)) ** 3;
        ember.emissiveIntensity = .7 + pulse * (.9 + walk * 1.6);
        return pulse;
      });
      spots.forEach(({ mesh, base, rank }) => { mesh.scale.y = base * (1 + pulses[rank] * .6); });
    },
  };
}
