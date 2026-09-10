/** Automate à ressort — a copper robot that travels by bounds.
 *
 * It owns no legs: a coil spring carries it. Walking, it gathers until the wire
 * stacks tight, snaps open and arcs through the air; standing still it only
 * breathes on the spring while its cogs turn and its antenna trails behind.
 */
import { creatureKit } from './kit.js';

const COILS = 6;
const WIRE = .0052;
const REST_GAP = .0182;
// Two coils meet wire on wire: the spring may stack, never pass through itself.
const SHUT_GAP = WIRE * 2 + .0004;
const BASE = .018;
// The chassis plate seats on the top coil instead of swallowing it.
const SEAT = .0575;

const ease = k => k * k * (3 - 2 * k);

/** One bound in four beats — gather, snap open, arc, land with a shiver.
 * Returns the coil compression (1 stacked, negative stretched) and the flight height. */
function bound(p) {
  if (p < .40) return [(p / .40) ** 2, 0];
  if (p < .54) return [1 - ease((p - .40) / .14) * 1.8, 0];
  if (p < .88) { const k = (p - .54) / .34; return [ease(k) * .8 - .8, Math.sin(k * Math.PI)]; }
  const k = (p - .88) / .12;
  return [Math.sin(k * Math.PI) * .5 * (1 - k), 0];
}

export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  const { box, orb, pill, disc, ring, mat, glow, group, piece, eyes } = kit;
  const copper = mat(palette.primary, { metalness: .62, roughness: .38, flatShading: true });
  const panel = mat(palette.secondary, { metalness: .5, roughness: .44 });
  const brass = mat(palette.accent, { metalness: .78, roughness: .28 });
  const spark = glow(palette.accent);

  /** A toothed wheel: the teeth are what the eye reads as turning, so they are real meshes. */
  function cog(parent, { x, y, z, radius, teeth, yaw = Math.PI / 2 }) {
    const mount = group(parent, x, y, z);
    mount.rotation.y = yaw;
    const wheel = group(mount, 0, 0, 0);
    piece(wheel, ring(radius, radius * .17), brass, [0, 0, 0]);
    piece(wheel, disc, panel, [0, 0, 0], [radius * .4, .012, radius * .4]).rotation.x = Math.PI / 2;
    for (let i = 0; i < teeth; i++) {
      const angle = (i / teeth) * Math.PI * 2;
      piece(wheel, box, copper, [Math.cos(angle) * radius, Math.sin(angle) * radius, 0],
        [radius * .34, radius * .34, .013]).rotation.z = angle;
    }
    return wheel;
  }

  const rig = group(root, 0, 0, 0);
  piece(rig, disc, panel, [0, .008, 0], [.05, .016, .05]);
  const coils = [];
  for (let i = 0; i < COILS; i++) {
    const wire = piece(rig, ring(.046 - i * .0034, WIRE), brass, [0, BASE + i * REST_GAP, 0]);
    wire.rotation.x = Math.PI / 2;
    coils.push(wire);
  }

  const shell = group(rig, 0, BASE + (COILS - 1) * REST_GAP + SEAT, 0);
  piece(shell, box, copper, [0, 0, 0], [.108, .086, .09]);
  piece(shell, box, panel, [0, .002, .047], [.086, .066, .008]);
  piece(shell, box, brass, [0, -.046, 0], [.094, .012, .078]);
  piece(shell, box, copper, [0, .048, -.014], [.052, .014, .05]);
  for (const side of [-1, 1]) {
    piece(shell, orb, brass, [side * .047, .033, .04], [.005, .005, .005]);
    piece(shell, orb, brass, [side * .047, -.031, .04], [.005, .005, .005]);
  }

  // The glass blinks and swivels; its brass ring is bolted to the face and never does.
  const sockets = eyes(shell, { x: .031, y: .006, z: .054, size: .025, pupil: palette.eye });
  const bezel = ring(.026, .005);
  for (const side of [-1, 1]) piece(shell, bezel, brass, [side * .031, .006, .060]);

  const stem = group(shell, 0, .054, -.014);
  piece(stem, pill, brass, [0, .020, 0], [.005, .014, .005]);
  const whip = group(stem, 0, .036, 0);
  piece(whip, pill, brass, [0, .016, 0], [.004, .010, .004]);
  const bulb = piece(whip, orb, spark, [0, .032, 0], [.014, .014, .014]);

  // Two drive wheels sunk into the flanks, two ratchets flanking the winding key.
  const drive = [-1, 1].map(side => cog(shell, { x: side * .058, y: -.004, z: .004, radius: .034, teeth: 5 }));
  const ratchets = [-1, 1].map(side => cog(shell, { x: side * .037, y: -.018, z: -.048, radius: .016, teeth: 4, yaw: 0 }));
  const winder = group(shell, 0, .006, -.048);
  piece(winder, disc, brass, [0, 0, -.012], [.008, .028, .008]).rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) piece(winder, box, panel, [side * .019, 0, -.026], [.03, .01, .012]);

  const seated = shell.position.y;
  let phase = .55;
  let carry = 0;
  let lagA = seated;
  let lagB = seated;
  let spin = 0;
  let shutter = 1.9;
  return {
    ground: true,
    home: [-.62, 0, -.14],
    scale: 1.05,
    animate(time, { moving = false, speed = 0, dt = .016 } = {}) {
      carry += ((moving ? 1 : 0) - carry) * (1 - Math.exp(-dt * 4.2));
      phase = (phase + dt * (.6 + speed * .82)) % 1;
      const [press, arc] = bound(phase);
      // Standing still the coil only breathes; the bound itself belongs to the walk.
      const squeeze = press * carry + Math.sin(time * 2.3) * .34 * (1 - carry);
      const flight = arc * carry;
      const gap = squeeze > 0 ? REST_GAP - squeeze * (REST_GAP - SHUT_GAP) : REST_GAP * (1 - squeeze * .5);
      coils.forEach((coil, i) => {
        coil.position.y = BASE + i * gap;
        coil.scale.x = coil.scale.y = 1 + squeeze * .12;
      });
      const perch = BASE + (COILS - 1) * gap + SEAT;
      shell.position.y = perch;
      rig.position.y = flight * .085;
      rig.rotation.x = squeeze * .08 - flight * .18;
      // It rocks on the coil between bounds and hangs quiet in the air.
      rig.rotation.z = Math.sin(time * 6.4) * (.03 + carry * .06) * (1 - flight);
      // The antenna is dragged by the body, one lag behind the mast, two behind the tip.
      const head = rig.position.y + perch;
      lagA += (head - lagA) * (1 - Math.exp(-dt * 12));
      lagB += (lagA - lagB) * (1 - Math.exp(-dt * 7.5));
      stem.rotation.x = (lagA - head) * 6.5 + Math.sin(time * 1.6) * .06;
      stem.rotation.z = Math.sin(time * 1.1) * .08 * (1 - carry);
      whip.rotation.x = (lagB - lagA) * 9;
      bulb.scale.setScalar(.014 + Math.sin(time * 3.6) * .003 + carry * .002);
      spin += dt * (1.15 + speed * 6.2);
      drive.forEach(wheel => { wheel.rotation.z = spin; });
      // The key drives the ratchets the other way round.
      winder.rotation.z = -spin * .42;
      ratchets.forEach(wheel => { wheel.rotation.z = spin * 2.35; });
      // A glass shutter falls over the eyes and lifts again, on its own schedule.
      if (time > shutter + .06) shutter = time + 1.5 + phase * 1.8;
      const shut = Math.max(0, 1 - Math.abs(time - shutter) * 24);
      sockets.forEach((socket, i) => {
        socket.scale.y = 1 - shut * .8;
        socket.rotation.y = Math.sin(time * .9 + i * .5) * .26 * (1 - carry);
      });
    },
  };
}
