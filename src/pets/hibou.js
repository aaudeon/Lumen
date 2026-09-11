/** Harfang des aurores — the snowy owl from the far end of a secret passage.
 *
 * It does not flap its way along: it glides, wings spread and all but still,
 * and every few seconds buys its height back with two slow, deep strokes. The
 * head is the show — it snaps round to a new bearing, far past where a neck
 * should allow, freezes there, then snaps again. When Lumen walks the strokes
 * come closer together and the gaze mostly keeps to the road.
 */
import { creatureKit } from './kit.js';

const TAU = Math.PI * 2;
/** Deterministic noise in [0,1): the owl schedules its glances and strokes on it. */
const noise = n => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  const { THREE, box, orb, cone, ring, blade, mat, glow, group, piece, limb } = kit;
  const plume = mat(palette.primary, { roughness: .92 });
  const down = mat(palette.secondary, { roughness: .9 });
  const bar = mat(palette.accent, { roughness: .8 });
  // A feather is one polygon deep, so it has to be lit from either face.
  const vane = mat(palette.primary, { roughness: .88, side: THREE.DoubleSide });
  const gold = glow(palette.eye);
  const ink = mat(0x1a1418, { roughness: .3 });

  // The kit's volumes are rounded blocks, not spheres: anything meant to show
  // has to sit on a face, not float inside the block.
  const body = group(root, 0, .06, 0);
  piece(body, orb, plume, [0, 0, 0], [.054, .056, .052]);
  piece(body, orb, down, [0, -.014, .034], [.038, .042, .034]);
  // Snowy-owl barring: short dark chevrons over the back and down the flanks.
  for (let i = 0; i < 3; i++) piece(body, box, bar, [(i - 1) * .022, .056, -.012 - (i % 2) * .018], [.016, .003, .008]).rotation.y = (i - 1) * .3;
  for (const side of [-1, 1]) piece(body, box, bar, [side * .054, .012, -.01], [.003, .008, .016]).rotation.x = side * .3;

  // An owl shows no neck: the skull perches straight on the shoulders and turns
  // on a hidden pivot, which is what lets it swing so far round.
  const head = group(body, 0, .092, .008);
  piece(head, orb, plume, [0, 0, 0], [.058, .054, .054]);
  piece(head, orb, down, [0, -.036, .05], [.018, .01, .012]);
  const sockets = [-1, 1].map(side => {
    // Facial disc: a pale saucer per eye, rimmed dark, with the gold eye set in it.
    piece(head, orb, down, [side * .022, -.004, .054], [.03, .032, .008]);
    const socket = group(head, side * .023, .002, .062);
    piece(socket, orb, gold, [0, 0, 0], [.019, .02, .01]);
    const pupil = piece(socket, orb, ink, [0, 0, .009], [.009, .01, .005]);
    piece(socket, ring(.021, .002), bar, [0, 0, .004]);
    (root.userData.petEyes ||= []).push({ socket, iris: pupil });
    return socket;
  });
  piece(head, cone, bar, [0, -.02, .06], [.009, .018, .008]).rotation.x = 2.5;
  const ears = [-1, 1].map(side => {
    const ear = group(head, side * .03, .05, -.006);
    piece(ear, cone, plume, [0, .01, 0], [.011, .018, .009]).rotation.z = -side * .55;
    piece(ear, cone, bar, [0, .016, 0], [.005, .012, .004]).rotation.z = -side * .55;
    return ear;
  });

  // Broad, rounded wings in two panels; the outer edge is notched into primaries.
  const inner = blade([[0, -.012], [.028, -.017], [.052, -.014], [.056, .028], [.042, .046], [.016, .046], [0, .036]], .006);
  const outer = blade([[0, -.014], [.036, -.02], [.07, -.012], [.08, .01], [.075, .034], [.064, .028], [.057, .05], [.046, .04], [.037, .056], [.027, .044], [.014, .052], [.005, .04], [0, .034]], .006);
  const wings = [-1, 1].map(side => {
    const shoulder = group(body, side * .034, .028, .004);
    piece(shoulder, orb, plume, [side * .02, 0, 0], [.014, .012, .016]);
    piece(shoulder, inner, vane, [0, 0, 0], [side, 1, 1]).rotation.x = -Math.PI / 2;
    piece(shoulder, box, down, [side * .03, .0075, .014], [.048, .003, .008]);
    piece(shoulder, box, bar, [side * .038, .0075, -.014], [.012, .003, .02]).rotation.y = side * .4;
    const elbow = group(shoulder, side * .054, 0, -.002);
    piece(elbow, outer, vane, [0, 0, 0], [side, 1, 1]).rotation.x = -Math.PI / 2;
    piece(elbow, box, bar, [side * .036, .0075, -.006], [.01, .003, .024]).rotation.y = side * .3;
    piece(elbow, box, bar, [side * .062, .0075, -.014], [.008, .003, .02]).rotation.y = side * .5;
    return { shoulder, elbow, side };
  });

  const tail = group(body, 0, -.008, -.046);
  const feathers = [-2, -1, 0, 1, 2].map(i => {
    const quill = group(tail, 0, 0, 0);
    piece(quill, box, plume, [0, 0, -.034], [.015, .004, .068]);
    piece(quill, box, bar, [0, 0, -.072], [.013, .004, .012]);
    quill.userData.spread = i;
    return quill;
  });

  const legs = [-1, 1].map(side =>
    limb(body, { x: side * .02, y: -.04, z: .01, thigh: .024, shin: .022, thickness: .011, colour: down, foot: bar, footSize: .85 }));

  let clock = 0;
  let lean = 0;
  // A burst is two beats long; `stroke` counts through it and idles at 2.
  let stroke = 2;
  let rest = .6;
  let burst = 0;
  let yaw = 0, tilt = 0, aimYaw = 0, aimTilt = 0;
  let hold = .8;
  let glance = 0;
  let lidAt = -1, nextBlink = 2.6, wink = false;
  return {
    expression: { head, ears, wings, tail, legs },
    ground: false,
    home: [-.62, 0, -.16],
    animate(time, { moving = false, dt = .016 } = {}) {
      dt = Math.min(dt, .1);
      clock += dt;
      lean += ((moving ? 1 : 0) - lean) * (1 - Math.exp(-dt * 4));

      // Two beats, then nothing. Walking only shortens the silence between them.
      if (stroke >= 2) {
        rest -= dt;
        if (rest <= 0) { stroke = 0; burst++; }
      }
      let flap = 0, lag = 0, thrust = 0, window = 0;
      if (stroke < 2) {
        stroke += dt / (.72 - lean * .26);
        if (stroke >= 2) rest = moving ? .35 + noise(burst) * .5 : 1.3 + noise(burst) * 1.4;
        window = Math.min(1, stroke * 4, (2 - stroke) * 4);
        flap = -Math.sin(stroke * TAU) * window;
        lag = -Math.sin(stroke * TAU - .9) * window;
        thrust = Math.max(0, flap);
      }
      const glide = 1 - window;
      wings.forEach(({ shoulder, elbow, side }) => {
        // Spread and nearly still between bursts; the wrist trails the shoulder in a
        // beat, and the beat digs deeper when there is a walker to keep up with.
        shoulder.rotation.z = side * (.14 * glide + Math.sin(time * 1.1) * .03 * glide + flap * (.58 + lean * .34));
        shoulder.rotation.x = Math.sin(time * 1.3 + side) * .025 * glide - thrust * .12;
        shoulder.rotation.y = side * lean * .22;
        elbow.rotation.z = side * (-.1 * glide + lag * (.4 + lean * .22));
        elbow.rotation.y = -side * flap * .12;
      });

      // Each downstroke lifts the chest; the glide lets it sag back, slowly.
      body.position.y = .06 + thrust * .018 - Math.sin(clock * .8) * .005 * glide;
      body.rotation.x = lean * .34 - thrust * .16;
      body.rotation.z = Math.sin(clock * .5) * .07 * (1 - lean) - lean * flap * .05;
      const breath = Math.sin(clock * 1.6) * .012 * (1 - lean);
      body.scale.set(1 + breath, 1 - breath, 1 + breath);

      // The head picks a bearing, snaps to it at one speed, and stops dead there.
      hold -= dt;
      if (hold <= 0) {
        glance++;
        aimYaw = (noise(glance * 3.1) * 2 - 1) * (moving ? .55 : 2.1);
        // Straight ahead now and then, or it never looks where it is going.
        if (noise(glance * 7.7) < .3) aimYaw *= .15;
        aimTilt = (noise(glance * 5.3) - .5) * (moving ? .2 : .6);
        hold = moving ? .45 + noise(glance * 2.3) * .7 : .7 + noise(glance * 2.3) * 1.5;
      }
      const snap = 16 * dt;
      yaw += clamp(aimYaw - yaw, -snap, snap);
      tilt += clamp(aimTilt - tilt, -snap, snap);
      const nod = Math.min(1, Math.abs(aimYaw - yaw) * 4);
      head.rotation.set(-body.rotation.x * .7 + nod * .1, yaw, tilt);

      // The fan opens for a beat or a steer, and leans against the head's swing.
      const fan = window * .6 + lean * .5;
      feathers.forEach(quill => { quill.rotation.y = quill.userData.spread * (.14 + fan * .16); });
      tail.rotation.set(-.15 + thrust * .25 - lean * .15, -yaw * .06, -body.rotation.z * .5);

      // Talons stay tucked under the belly; a downstroke swings them back a touch.
      legs.forEach((leg, i) => {
        leg.hip.rotation.x = -.9 + lean * .3 + thrust * .3;
        leg.knee.rotation.x = 2.3 - thrust * .4;
        leg.ankle.rotation.x = -.2 + Math.sin(clock * 2 + i) * .06;
      });

      // An owl's blink is slow, a curtain rather than a flick; sometimes one eye only.
      if (clock > nextBlink) { lidAt = clock; wink = noise(clock * 1.7) < .3; nextBlink = clock + 3 + noise(clock) * 2.5; }
      const shut = Math.max(0, 1 - Math.abs(clock - lidAt - .16) * 6);
      sockets[0].scale.y = 1 - shut * .92;
      sockets[1].scale.y = 1 - shut * .92 * (wink ? 0 : 1);
    },
  };
}
