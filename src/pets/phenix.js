/** Phénix éteint — the ash bird from the bottom of the Cœur éteint.
 *
 * It no longer burns; it smoulders. In flight it glides, sags as the glide
 * runs out of lift, then buys the height back with two hard beats — glide,
 * flap, flap, glide — and every downstroke fans the embers at its wing and
 * tail tips. When Lumen stops it folds its wings flat against its flanks,
 * settles a little lower and goes still: only the embers and the smoke off
 * its back keep living.
 */
import { creatureKit } from './kit.js';

const TAU = Math.PI * 2;

export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  const { THREE, box, orb, pill, cone, blade, mat, glow, group, piece, eyes, limb, chain } = kit;
  const ash = mat(palette.primary, { roughness: .94 });
  const singe = mat(palette.secondary, { roughness: .9 });
  // A feather is one polygon deep, so it has to be lit from either face.
  const vane = mat(palette.primary, { roughness: .9, side: THREE.DoubleSide });
  const fire = glow(palette.accent);
  const ink = mat(0x1a1418, { roughness: .4 });

  // The kit's volumes are rounded blocks: anything meant to show has to stand
  // proud of a face, not sit flush with it or float inside.
  const body = group(root, 0, .05, 0);
  piece(body, orb, ash, [0, 0, 0], [.048, .044, .06]);
  // Scorched throat and belly, proud of the chest and of the keel.
  piece(body, orb, singe, [0, -.02, .03], [.032, .028, .036]);
  // Scorched shoulder plates, seated on the back where the wings root.
  for (const side of [-1, 1]) piece(body, orb, singe, [side * .028, .04, .004], [.016, .008, .024]);

  // A fine, forward-thrust head held clear of the chest on a raked neck.
  const neck = group(body, 0, .03, .048);
  piece(neck, pill, ash, [0, .019, .014], [.012, .0193, .012]).rotation.x = .858;
  const head = group(neck, 0, .038, .036);
  piece(head, orb, ash, [0, 0, 0], [.026, .026, .036]);
  piece(head, orb, singe, [0, -.013, .022], [.015, .011, .018]);
  piece(head, cone, singe, [0, -.006, .046], [.008, .026, .006]).rotation.x = Math.PI / 2;
  // A bird's eyes sit on the sides of the skull; turn each socket outward so
  // the pupil stands proud of the cheek instead of inside the block.
  const [leftEye, rightEye] = eyes(head, { x: .024, y: .005, z: .014, size: .011, pupil: palette.eye, glowing: true });
  leftEye.rotation.y = -1.25;
  rightEye.rotation.y = 1.25;
  // A swept crest of three plumes, singed at the tips.
  const crest = [0, 1, 2].map(i => {
    const plume = group(head, (i - 1) * .009, .02, -.004 - i * .002);
    piece(plume, cone, ash, [0, .016, -.01], [.007, .036, .005]).rotation.x = -.9 - i * .12;
    piece(plume, cone, singe, [0, .028, -.024], [.004, .014, .003]).rotation.x = -.9 - i * .12;
    return plume;
  });

  // Two panels a wing: the outer one sweeps back to a single point.
  const inner = blade([[0, -.012], [.03, -.018], [.054, -.014], [.056, .02], [.036, .036], [.012, .032], [0, .022]], .006);
  const outer = blade([[0, -.014], [.04, -.022], [.078, -.024], [.098, -.006], [.08, .018], [.056, .032], [.024, .038], [0, .032]], .006);
  const wings = [-1, 1].map(side => {
    // The joint slides outward as the wing folds, so the folded panel hangs on
    // the flank instead of inside it; the knob over it hides the root either way.
    const shoulder = group(body, side * .038, .026, .006);
    piece(shoulder, orb, singe, [side * .006, 0, 0], [.014, .011, .016]);
    // The roll pivot turns a folded wing edge-on, leading edge up along the back.
    const roll = group(shoulder, 0, 0, 0);
    piece(roll, inner, vane, [0, 0, 0], [side, 1, 1]).rotation.x = -Math.PI / 2;
    piece(roll, box, singe, [side * .028, .0075, -.028], [.05, .003, .007]);
    const elbow = group(roll, side * .054, 0, -.002);
    piece(elbow, outer, vane, [0, 0, 0], [side, 1, 1]).rotation.x = -Math.PI / 2;
    piece(elbow, box, singe, [side * .04, .0075, -.03], [.06, .003, .007]).rotation.y = side * .18;
    piece(elbow, box, singe, [side * .08, .0075, -.008], [.028, .003, .006]).rotation.y = side * .7;
    const ember = piece(elbow, orb, fire, [side * .097, .003, .005], [.006]);
    return { shoulder, roll, elbow, ember, side };
  });

  // Three streamers for a tail; each one dies in an ember.
  const plumes = [-1, 0, 1].map(i => {
    const streamer = chain(body, { x: i * .012, y: -.006, z: -.052, count: i ? 3 : 4, length: .03, thickness: i ? .01 : .013, taper: .86, colour: ash });
    streamer.links[0].userData.spread = i;
    piece(streamer.links.at(-1), pill, singe, [0, 0, -.036], [.006, .008, .006]).rotation.x = Math.PI / 2;
    const ember = piece(streamer.links.at(-1), orb, fire, [0, 0, -.048], [.0055]);
    return { ...streamer, ember };
  });
  const embers = [...wings.map(wing => wing.ember), ...plumes.map(plume => plume.ember)];

  const legs = [-1, 1].map(side =>
    limb(body, { x: side * .018, y: -.036, z: .012, thigh: .022, shin: .02, thickness: .009, colour: singe, foot: ink, footSize: .7 }));

  // Smoke off the back: each puff has its own skin so it can fade alone.
  const vent = group(body, 0, .036, -.016);
  const smoke = [0, 1, 2, 3].map(i => {
    const skin = mat(0x2a2326, { roughness: 1, transparent: true, opacity: .5, depthWrite: false });
    return { mesh: piece(vent, orb, skin, [0, 0, 0], [.006]), skin, offset: i / 4, sway: Math.sin(i * 2.7) };
  });

  let clock = 0;
  let rest = 1;
  // Where the bird is in its glide-flap-flap-glide cycle; it only advances aloft.
  let cycle = .55;
  let blink = 3.1;
  return {
    expression: { head, neck, wings, tail: plumes[1], legs },
    ground: false,
    home: [-.62, 0, -.16],
    scale: 1.1,
    animate(time, { moving = false, speed = 0, dt = .016 } = {}) {
      dt = Math.min(dt, .1);
      clock += dt;
      rest += ((moving ? 0 : 1) - rest) * (1 - Math.exp(-dt * 3.6));
      const fly = 1 - rest;
      cycle += dt * fly / (1.7 - speed * .35);
      const t = cycle % 1;

      // Two beats fill the first .44 of the cycle; the rest is a glide that
      // loses lift, so the bird sags until the next pair of strokes. Each beat
      // lifts the wing first, then sweeps it down: the downstroke is the power.
      let flap = 0, lag = 0, thrust = 0, window = 0;
      if (t < .44) {
        const beat = (t % .22) / .22;
        window = Math.min(1, t * 12, (.44 - t) * 12);
        flap = Math.sin(beat * TAU) * window;
        lag = Math.sin(beat * TAU - .9) * window;
        thrust = Math.max(0, -Math.cos(beat * TAU)) * window;
      }
      // Whatever the cycle froze on when the bird stopped must not leak into the perch.
      flap *= fly; lag *= fly; thrust *= fly;
      const glide = 1 - window;
      const stall = t < .44 ? 0 : Math.pow((t - .44) / .56, 1.7);
      // The nose stays down through the stall and the first beat hauls it back
      // up, so the dive never snaps level when the cycle wraps.
      const dive = t < .44 ? Math.max(0, 1 - t / .16) : stall;
      const altitude = t < .44 ? -.022 + t / .44 * .05 + thrust * .008 : .028 - stall * .05;

      body.position.y = .05 + altitude * fly - rest * .028;
      body.rotation.x = fly * (speed * .26 + dive * .2) - thrust * .14 - rest * .08;
      body.rotation.z = Math.sin(clock * .6) * .05 * fly;

      wings.forEach(({ shoulder, roll, elbow, side }) => {
        shoulder.position.x = side * (.038 + rest * .016);
        shoulder.rotation.z = side * (fly * (.08 * glide + Math.sin(clock * 1.3) * .025 * glide) + flap * (.6 + speed * .18) - rest * .12);
        shoulder.rotation.y = side * (rest * 1.5 + fly * speed * .12);
        shoulder.rotation.x = -thrust * .12;
        roll.rotation.x = -rest * 1.45;
        elbow.rotation.z = side * (-.1 * glide * fly + lag * .4);
        elbow.rotation.y = side * (rest * .08 - flap * .1);
      });

      // Streamers trail the motion: up when the bird sinks, down when it climbs.
      plumes.forEach(plume => {
        plume.wave(.08 * fly + .03, clock * (1.4 + fly * 2.2) + plume.links[0].userData.spread, 'y');
        plume.links[0].rotation.y -= plume.links[0].userData.spread * (.2 + fly * .12);
        plume.links[0].rotation.x = -.42 * rest + fly * (.06 + dive * .16) - thrust * .3;
      });

      // Talons trail tucked under the tail in flight; they drop for the perch it never quite takes.
      legs.forEach((leg, i) => {
        leg.hip.rotation.x = 1.05 * fly + thrust * .25 + rest * (.32 + Math.sin(clock * 1.7 + i) * .04);
        leg.knee.rotation.x = .45 * fly + .6 * rest;
        leg.ankle.rotation.x = 1.1 * fly - .5 * rest;
      });

      // Embers glow low and uneven at rest; every downstroke fans them bright.
      const flicker = Math.sin(clock * 17) * .18 + Math.sin(clock * 29 + 1.3) * .12;
      fire.emissiveIntensity = 1.1 + flicker + thrust * 1.7;
      embers.forEach((ember, i) => ember.scale.setScalar(.0055 + Math.sin(clock * 13 + i * 2.1) * .0012 + thrust * .003));

      // Smoke: a puff rises off the back, drifts astern faster in flight, and thins out.
      smoke.forEach(({ mesh, skin, offset, sway }) => {
        const life = (clock * .42 + offset) % 1;
        mesh.position.set(Math.sin(life * 5 + sway * 3) * .01, life * .075, -life * (.03 + speed * .09 + fly * .02));
        mesh.scale.setScalar(.004 + life * .011);
        skin.opacity = .55 * (1 - life) * Math.min(1, life * 6);
      });

      // Dozing at rest, the head droops and scans slowly; aloft it holds the horizon.
      neck.rotation.x = rest * .22 - fly * (speed * .2 + dive * .1);
      head.rotation.x = -body.rotation.x * .6 + Math.sin(clock * .7) * .08 * rest - thrust * .08;
      head.rotation.y = Math.sin(clock * .45) * .5 * rest + Math.sin(clock * 1.1) * .1 * fly;
      crest.forEach((plume, i) => { plume.rotation.x = -thrust * .2 - rest * .12 + Math.sin(clock * 2.3 + i) * .04; });

      if (time > blink) { blink = time + 3.4 + (cycle % 1.5); }
      const shut = Math.max(0, 1 - Math.abs(time - blink + 3.4) * 12);
      leftEye.scale.y = rightEye.scale.y = 1 - shut * .9;
    },
  };
}
