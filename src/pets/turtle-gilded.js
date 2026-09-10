/** Tortue dorée — a ceremonial shell that walks as if it were carrying an offering.
 *
 * Nothing about her hurries. She keeps a four-beat walk with three feet always
 * planted, so the shell rises and settles but never rolls, and holds her neck
 * stretched forward with the head level above it. Her two signatures: eyelids
 * that take most of a second to come down, and gilded plates that pulse in
 * cascade from her nose to her tail.
 */
import { creatureKit } from './kit.js';

/** Lateral-sequence walk: a hind foot lifts, then the fore foot on that side. */
const CADENCE = [.5, 0, .75, .25];
function marche(pattes, cycle, reach, lift) {
  pattes.forEach((patte, i) => {
    const t = (cycle + CADENCE[i]) % 1;
    const swinging = t > .75;
    const u = swinging ? (t - .75) * 4 : t / .75;
    // Planted feet sweep back at a constant rate; only the free one is lifted.
    patte.hip.rotation.x = reach * (swinging ? 1 - 2 * u : 2 * u - 1);
    patte.knee.rotation.x = swinging ? Math.sin(u * Math.PI) * lift : 0;
    // The sole stays flat whatever the hip and the knee are doing.
    patte.ankle.rotation.x = -(patte.hip.rotation.x + patte.knee.rotation.x);
  });
}

export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  const { orb, cone, pill, disc, dome, ring, mat, glow, group, piece, eyes, limb } = kit;
  const coque = dome(.5);
  const ecaille = mat(palette.primary, { roughness: .28, metalness: .7 });
  const cuir = mat(palette.secondary, { roughness: .82 });
  const dorure = mat(palette.accent, { roughness: .22, metalness: .8 });

  // The shell is the animal: a low wide oval, its own height again off the ground.
  const [RX, RY, RZ] = [.088, .058, .112];
  const body = group(root, 0, 0, 0);
  const carapace = group(body, 0, .066, 0);
  piece(carapace, coque, ecaille, [0, 0, 0], [RX, RY, RZ]);
  piece(carapace, disc, cuir, [0, -.004, 0], [.094, .012, .118]);
  piece(carapace, disc, cuir, [0, -.014, 0], [.07, .01, .09]);
  // Three gold circles on the dome: the rim, then two tightening bands.
  for (const [radius, y, thickness] of [[.093, -.002, .0075], [.081, .025, .006], [.056, .046, .005]]) {
    piece(carapace, ring(radius, thickness), dorure, [0, y, 0], [1, 1.27, 1]).rotation.x = Math.PI / 2;
  }

  /** Plates in concentric rings, each on its own emissive so the pulse can travel. */
  const plaques = [];
  for (const [tilt, count, taille] of [[0, 1, .022], [.62, 5, .019], [1.12, 8, .017]]) {
    for (let i = 0; i < count; i++) {
      const yaw = (i / count) * Math.PI * 2 + (count > 1 ? Math.PI / count : 0);
      const x = Math.sin(tilt) * Math.sin(yaw) * RX;
      const y = Math.cos(tilt) * RY;
      const z = Math.sin(tilt) * Math.cos(yaw) * RZ;
      // Seat every plate flat on the flattened dome, not on the sphere it came from,
      // and a hair proud of it so plate and shell never fight for the same pixel.
      const [nx, ny, nz] = [x / (RX * RX), y / (RY * RY), z / (RZ * RZ)];
      const saillie = .0012 / Math.hypot(nx, ny, nz);
      const plaque = group(carapace, x + nx * saillie, y + ny * saillie, z + nz * saillie);
      plaque.rotation.order = 'YXZ';
      plaque.rotation.set(Math.atan2(Math.hypot(nx, nz), ny), Math.atan2(nx, nz), 0);
      const surface = glow(palette.accent);
      const mesh = piece(plaque, disc, surface, [0, 0, 0], [taille, .005, taille]);
      plaques.push({ mesh, surface, rang: (z + RZ) / (RZ * 2) });
    }
  }

  // The neck leaves from under the rim and clears the shell before the head starts.
  const collier = ring(.019, .0035);
  const cou = group(carapace, 0, .026, .086);
  piece(cou, pill, cuir, [0, 0, .026], [.016, .026, .016]).rotation.x = Math.PI / 2;
  for (const z of [.026, .05]) piece(cou, collier, dorure, [0, 0, z], [1, 1, 1]);

  const tete = group(cou, 0, .022, .072);
  piece(tete, orb, cuir, [0, 0, 0], [.025, .022, .028]);
  piece(tete, cone, ecaille, [0, -.004, .026], [.013, .03, .013]).rotation.x = Math.PI / 2;
  piece(tete, orb, dorure, [0, .017, .002], [.019, .008, .024]);
  const yeux = eyes(tete, { x: .0145, y: .006, z: .019, size: .0092, pupil: palette.eye ?? 0x3a2c14 });
  // A lid is a shell that swings down over the eye, not an eyeball that flattens.
  const paupieres = yeux.map(oeil => {
    const paupiere = group(tete, oeil.position.x, oeil.position.y, oeil.position.z);
    piece(paupiere, coque, ecaille, [0, 0, 0], [.0108, .0112, .0108]);
    return paupiere;
  });

  const queue = group(carapace, 0, -.016, -.104);
  piece(queue, cone, cuir, [0, 0, -.02], [.014, .036, .014]).rotation.x = -Math.PI / 2;
  piece(queue, ring(.013, .004), dorure, [0, 0, -.01], [1, 1, 1]);

  // Short columns at the four corners of the shell, far enough apart to step past.
  const bracelet = ring(.026, .005);
  const pattes = [[-.062, .075], [.062, .075], [-.062, -.075], [.062, -.075]].map(([x, z]) =>
    limb(body, { x, y: .066, z, thigh: .022, shin: .016, thickness: .021, colour: cuir, foot: ecaille, footSize: .72 }));
  for (const patte of pattes) piece(patte.hip, bracelet, dorure, [0, -.014, 0], [1, 1, 1]).rotation.x = Math.PI / 2;

  let cycle = 0;
  let onde = 0;
  let clignement = 3.2;
  return {
    ground: true,
    home: [-.62, 0, -.22],
    scale: 1.3,
    animate(time, { speed = 0, dt = .016 } = {}) {
      cycle = (cycle + dt * (.15 + speed * .62)) % 1;
      marche(pattes, cycle, .05 + speed * .5, .1 + speed * .58);
      // Weight passes from foot to foot: four even heaves a stride, and no roll.
      // Only the shell rides them — the planted feet stay on the ground.
      const battement = cycle * Math.PI * 8;
      carapace.position.y = .066 + (.5 - .5 * Math.cos(battement)) * .009 * speed
        + Math.sin(time * .85) * .0018 * (1 - speed * .6);
      carapace.rotation.x = Math.sin(battement) * .03 * speed;
      // The neck stays stretched and high; walking pumps it, never lets it sag.
      cou.position.z = .086 + Math.sin(cycle * Math.PI * 4) * .009 * speed;
      cou.rotation.x = -.4 + Math.sin(time * .5) * .04 - speed * .06;
      cou.rotation.y = Math.sin(time * .23) * .16 * (1 - speed * .7);
      // Whatever the neck does, the head holds itself level: a ceremonial carriage.
      tete.rotation.x = -cou.rotation.x - .1 - carapace.rotation.x + Math.sin(time * .41) * .05;
      tete.rotation.y = Math.sin(time * .31) * .26 * (1 - speed * .6) - cou.rotation.y * .5;
      queue.rotation.y = Math.sin(cycle * Math.PI * 2) * .22 * speed + Math.sin(time * .44) * .07;
      queue.rotation.x = -.1 - speed * .2;
      // The gilding pulses from nose to tail, quicker once she is under way.
      onde += dt * (1.4 + speed * 3.4);
      for (const { mesh, surface, rang } of plaques) {
        const pulse = .5 + .5 * Math.sin(onde + rang * 2.6);
        mesh.position.y = pulse * .0018;
        surface.emissiveIntensity = .3 + pulse * 1.6;
      }
      // Most of a second to come down, a beat shut, then slower still to open.
      clignement -= dt;
      const depuis = -clignement;
      if (depuis > 2.55) clignement = 3.4 + (onde % 2);
      const descente = depuis < 0 ? 0
        : depuis < .95 ? depuis / .95
        : depuis < 1.45 ? 1
        : Math.max(0, 1 - (depuis - 1.45) / 1.1);
      const fermeture = descente * descente * (3 - 2 * descente);
      for (const paupiere of paupieres) paupiere.rotation.x = -1.3 + fermeture * 2.85;
    },
  };
}
