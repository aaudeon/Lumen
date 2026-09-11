/** Limace de magma — celle qui dort au fond du passage secret.
 *
 * Pas une patte. Un long corps de croûte sombre en quatre anneaux, et une seule
 * façon d'avancer : une vague de contraction naît à la queue, gonfle chaque
 * anneau en passant, et s'éteint dans un hochement de tête. Là où la croûte se
 * plisse, les fissures s'ouvrent et la lave dessous flambe. Au repos la vague
 * passe toutes les cinq secondes ; en marche elle court, et tout le corps
 * avance d'un cran quand elle franchit le manteau. Deux pédoncules portent des
 * yeux de braise qui dérivent chacun de leur côté — et rentrent dans la tête
 * au premier danger.
 */
import { creatureKit } from './kit.js';

// Bands from tail to head: [length, width, height]. The mantle band is the thickest.
const BANDS = [
  [.05, .036, .027],
  [.062, .054, .04],
  [.062, .06, .046],
  [.05, .05, .038],
];
// The crest reaches each band this much later, in radians of the peristaltic clock.
const LAG = 1.05;
// At rest she periscopes now and then: chin up, eyes scanning, on her own slow cycle.
const SCAN_CYCLE = 8.5;
const SCAN_HOLD = 1.8;
const SCAN_OFFSET = 4;

export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  const { box, orb, pill, cone, disc, mat, glow, group, piece, chain } = kit;
  const crust = mat(palette.primary, { roughness: .98 });
  // One lava material per band, so a single crest can light the body up in sequence.
  const lava = () => mat(palette.secondary, { roughness: .4, emissive: palette.secondary, emissiveIntensity: .4, toneMapped: false });
  const eyeGlow = glow(palette.eye ?? 0xfff3c4);

  const body = group(root, 0, 0, 0);
  const bands = BANDS.map(([length, width, height], i) => {
    const seg = group(body, 0, 0, 0);
    // Everything hangs from y = 0: a bulging band rises without leaving the ground.
    piece(seg, pill, crust, [0, height / 2, 0], [width / 2, length / 3, height / 2]).rotation.x = Math.PI / 2;
    const sole = lava();
    piece(seg, disc, sole, [0, .003, 0], [width * .55, .006, length * .49]);
    const ember = glow(palette.secondary);
    const core = glow(palette.accent);
    const cracks = [];
    const crack = (at, size, yaw) => {
      const mesh = piece(seg, box, ember, at, size);
      mesh.rotation.y = yaw;
      cracks.push(mesh);
    };
    const top = height - .0015;
    const zig = i % 2 ? 1 : -1;
    crack([0, top, 0], [.0035, .0035, length * .6], zig * .22);
    crack([zig * width * .2, top - height * .06, -length * .12], [.003, .0035, length * .34], -zig * .95);
    if (i) crack([-zig * width * .22, top - height * .07, length * .16], [.003, .0035, length * .3], zig * 1.1);
    // Flank seams: the crust is thinnest where the band bends.
    for (const side of [-1, 1]) {
      const seam = piece(seg, box, ember, [side * width / 2, height * .55, side * zig * length * .1], [.003, .003, length * .38]);
      seam.rotation.x = side * .55;
      cracks.push(seam);
    }
    cracks.push(piece(seg, orb, core, [zig * width * .06, top, length * .08], [.0055, .003, .007]));
    return { seg, length, sole, ember, core, cracks, widths: cracks.map(mesh => mesh.scale.x) };
  });
  const span = BANDS.reduce((sum, [length]) => sum + length, 0);

  // The mantle: a raised shield on the third band, with the breathing pore on its right.
  const [mantleLength, mantleWidth, mantleHeight] = BANDS[2];
  const mantle = bands[2].seg;
  piece(mantle, orb, crust, [0, mantleHeight * .86, .004], [mantleWidth * .56, mantleHeight * .3, mantleLength * .46]);
  const pore = group(mantle, mantleWidth * .56, mantleHeight * .8, .012);
  piece(pore, kit.ring(.0065, .0018), crust, [0, 0, 0], [1, 1, 1]).rotation.y = Math.PI / 2;
  const breath = piece(pore, orb, bands[2].ember, [0, 0, 0], [.003, .0045, .0045]);

  const tail = group(body, 0, 0, 0);
  piece(tail, cone, crust, [0, 0, -.014], [BANDS[0][1] * .36, .03, BANDS[0][2] * .4]).rotation.x = -Math.PI / 2;
  piece(tail, orb, bands[0].core, [0, 0, -.027], [.0028, .0028, .0035]);

  const [, headWidth, headHeight] = BANDS[3];
  const head = group(body, 0, 0, 0);
  piece(head, orb, crust, [0, 0, .008], [headWidth * .42, headHeight * .44, .017]);
  // The mouth is a slit of lava under the snout.
  piece(head, box, bands[3].sole, [0, -headHeight * .3, .022], [.014, .003, .005]);
  const stalks = [-1, 1].map(side => {
    // Two hinges: `post` splays the stalk outward, `mount` aims it up and forward.
    const post = group(head, side * .012, headHeight * .3, .002);
    post.rotation.z = -side * .42;
    const mount = group(post, 0, 0, 0);
    mount.rotation.x = Math.PI / 2 + .3;
    const stalk = chain(mount, { count: 2, length: .019, thickness: .006, taper: .8, colour: crust });
    const tip = group(stalk.links[1], 0, 0, -.019);
    piece(tip, orb, eyeGlow, [0, 0, 0], [.0068, .0068, .0068]);
    const pupil = piece(tip, orb, crust, [0, 0, -.005], [.0028, .0028, .002]);
    (root.userData.petEyes ||= []).push({ socket: tip, iris: pupil });
    return { post, links: stalk.links, own: 1.3 + side * 1.3 };
  });

  let pulse = 0;
  let walk = 0;
  let clock = 0;
  let blink = 4;
  return {
    expression: { head, tail },
    ground: true,
    home: [-.62, 0, -.16],
    scale: 1.4,
    animate(time, { moving = false, speed = 0, dt = .016, danger = 0 } = {}) {
      clock += dt;
      // Heavy: she takes her time getting going, and as long to stop.
      walk += ((moving ? 1 : 0) - walk) * (1 - Math.exp(-dt * 2.6));
      // Le rig lisse deja l'alarme et la remet a zero lors d'une reinitialisation.
      const fear = Math.min(1, Math.max(0, danger));
      // One clock for every band: the crest is born at the tail and dies at the head.
      pulse += dt * (1.25 + walk * (4.2 + speed * 3));
      const amp = .085 + walk * .25;
      const scan = (clock + SCAN_OFFSET) % SCAN_CYCLE;
      const look = scan < SCAN_HOLD ? Math.sin(scan / SCAN_HOLD * Math.PI) ** 2 * (1 - walk) * (1 - fear) : 0;

      let cursor = -span / 2;
      const crests = bands.map((band, i) => {
        const crest = Math.max(0, Math.sin(pulse - i * LAG)) ** 2;
        const squeeze = amp * crest + fear * .1;
        band.seg.scale.set(1 + squeeze * .55, 1 + squeeze * .85, 1 - squeeze);
        const length = band.length * band.seg.scale.z;
        band.seg.position.z = cursor + length / 2;
        cursor += length;
        // Where the band bunches, the crust folds: cracks gape and the lava shows.
        const heat = .3 + crest * 2.1 + fear * .7 + (Math.sin(time * .7 + i * 1.9) + 1) * .12;
        band.ember.emissiveIntensity = heat;
        band.core.emissiveIntensity = heat * 1.4 + .3;
        band.sole.emissiveIntensity = .3 + crest * 1.1 + fear * .4;
        band.cracks.forEach((mesh, k) => { mesh.scale.x = band.widths[k] * (1 + crest * 1.5); });
        return crest;
      });
      // The middle holds still, so head and tail both breathe in and out; the whole
      // slug also lurches a notch forward as the crest crosses the mantle.
      const lurch = (crests[1] + crests[2]) * .5;
      body.position.z = (span / 2 - cursor) / 2 + lurch * .02 * (.25 + walk * .75) - .006;

      tail.position.set(0, BANDS[0][2] * .42 * bands[0].seg.scale.y, -span / 2);
      tail.rotation.x = crests[0] * (.35 + walk * .35) + Math.sin(time * .5) * .05;
      tail.rotation.y = Math.sin(time * .37 + 1) * .08 * (1 - walk);

      head.position.set(0, headHeight * .5 * bands[3].seg.scale.y, cursor - .004);
      // The crest ends in a nod; the periscope is the opposite: chin up, eyes out.
      head.rotation.x = crests[3] * (.12 + walk * .2) - look * .3 + Math.sin(time * .45) * .03;
      head.rotation.y = Math.sin(time * .3) * .1 * (1 - walk) + look * Math.sin(scan * 2.2) * .28;

      stalks.forEach(({ post, links, own }) => {
        // Each eye drifts on its own clock; both whip back when the crest hits the head.
        const recoil = crests[3] * (.25 + walk * .3);
        links[0].rotation.x = Math.sin(time * .8 + own) * .2 - recoil + look * .15;
        links[0].rotation.y = Math.sin(time * .55 + own * 1.7) * .3 + look * Math.sin(scan * 3 + own) * .5;
        links[1].rotation.x = Math.sin(time * .8 + own - 1) * .28 - recoil * .6;
        links[1].rotation.y = Math.sin(time * .55 + own * 1.7 - 1) * .22;
        // Danger: the stalks sink back into the head, eyes first.
        post.scale.setScalar(1 - fear * .62 + look * .1);
      });

      const puff = .5 + .5 * Math.sin(time * (1.1 + walk * 1.6));
      breath.scale.set(.002 + puff * .0025, .003 + puff * .002, .003 + puff * .002);
      breath.position.x = puff * .002;

      if (time > blink) blink = time + 4.2 + (pulse % 1.5);
      const shut = Math.max(0, 1 - Math.abs(time - blink + 4.2) * 10);
      eyeGlow.emissiveIntensity = 1.6 * (1 - shut * .85);
    },
  };
}
