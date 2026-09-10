/** Tortue-île — a carapace an island moved onto.
 *
 * She is the only familiar carrying a landscape, so she moves like a hull and
 * not like an animal: every footfall heels the deck to the other side and
 * pushes her bow down, the roll takes a second to die away, the meadow catches
 * it a beat late and the crown of the tree later still. The fall down her flank
 * runs off its own clock — walk, wait or sleep, the water keeps going.
 */
import { creatureKit, trot } from './kit.js';

const LARGEUR = .09;
const HAUTEUR = .062;
const LONGUEUR = .118;
/** How far down the dome the visible fall runs, from the crown past the rim. */
const CHUTE = [.55, 1.75];

/** A point a hair off the shell's flank, `a` radians down from the crown. */
function flanc(a) {
  const sin = Math.sin(a);
  const cos = Math.cos(a);
  // Along the dome's own normal, and further out once past the rim: water that
  // has left the shell falls clear of it instead of dribbling underneath.
  const ecart = (.006 + Math.max(0, -cos) * .05) / Math.hypot(sin / LARGEUR, cos / HAUTEUR);
  return [LARGEUR * sin + ecart * sin / LARGEUR, HAUTEUR * cos + ecart * cos / HAUTEUR];
}

const SOURCE = flanc(CHUTE[0]);
const EMBOUCHURE = flanc(CHUTE[1]);
const BASSIN = [EMBOUCHURE[0], EMBOUCHURE[1] - .006, .008];

/** One closed loop of the fall: down the flank, then back up inside the shell.
 * A counter that wrapped would teleport the water, and the check measures every
 * step a mesh takes; this path is continuous and hides the climb home under the
 * carapace, where the drop shrinks to nothing.
 */
function courant(t) {
  const cycle = t - Math.floor(t);
  if (cycle < .58) {
    const u = cycle / .58;
    const [x, y] = flanc(CHUTE[0] + u * (CHUTE[1] - CHUTE[0]));
    return [x, y, -.004 + u * .012, .85 + u * .35, .7 + u * .9];
  }
  const v = (cycle - .58) / .42;
  return [
    EMBOUCHURE[0] + (SOURCE[0] - EMBOUCHURE[0]) * v - Math.sin(v * Math.PI) * .045,
    EMBOUCHURE[1] + (SOURCE[1] - EMBOUCHURE[1]) * v,
    .008 - v * .012, .05, .05];
}

export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  const { orb, cone, pill, disc, dome, mat, glow, group, piece, eyes, limb } = kit;
  const domeGeo = dome(.55);
  const ecaille = mat(palette.primary, { roughness: .84 });
  const cuir = mat(palette.secondary, { roughness: .98 });
  const verdure = mat(palette.accent, { roughness: .96 });
  const eau = glow(palette.accent);

  const body = group(root, 0, 0, 0);
  const coque = group(body, 0, .072, 0);
  piece(coque, domeGeo, ecaille, [0, 0, 0], [LARGEUR, HAUTEUR, LONGUEUR]);
  // Leather rim round the shell's mouth, plastron under it: she closes on every side.
  piece(coque, disc, cuir, [0, -.004, 0], [LARGEUR * 1.03, .014, LONGUEUR * 1.05]);
  piece(body, disc, cuir, [0, .054, .002], [LARGEUR * .74, .011, LONGUEUR * .78]);
  // Scutes ride half-sunk in the dome, and clear of the meridian the water takes.
  for (const [yaw, tilt] of [[.8, .7], [-.95, .7], [2.35, .85], [-2.35, .85], [Math.PI, 1]]) {
    const x = Math.sin(tilt) * Math.sin(yaw);
    const z = Math.sin(tilt) * Math.cos(yaw);
    piece(coque, orb, cuir, [x * LARGEUR * .92, Math.cos(tilt) * HAUTEUR * .86, z * LONGUEUR * .92], [.026, .014, .03]);
  }

  // A mound of turf capping the crown, not a plate laid over it: the shell
  // disappears under the meadow instead of poking through the middle of it.
  const ile = group(coque, -.006, .046, -.004);
  piece(ile, domeGeo, verdure, [0, 0, 0], [.05, .03, .056]);
  piece(ile, orb, cuir, [.034, .016, .016], [.014, .011, .013]);
  piece(ile, orb, cuir, [-.03, .017, -.022], [.015, .012, .014]);
  piece(ile, orb, cuir, [.006, .0167, -.04], [.01, .009, .009]);

  const arbre = group(ile, -.014, .023, .008);
  piece(arbre, pill, cuir, [0, .026, 0], [.006, .022, .006]);
  // Each mass pivots on the trunk itself, so it swings round the tree instead of
  // drifting off the branch it hangs from.
  const feuillages = [[0, .058, 0, .03], [.021, .042, .018, .022], [-.019, .047, -.017, .02]]
    .map(([x, y, z, rayon]) => {
      const masse = group(arbre, 0, y, 0);
      piece(masse, orb, verdure, [x, rayon * .35, z], [rayon, rayon * .82, rayon]);
      return masse;
    });

  const gouttes = [];
  for (let i = 0; i < 10; i++) gouttes.push(piece(coque, orb, eau, [...SOURCE, -.004], [.009, .012, .008]));
  piece(coque, orb, verdure, BASSIN, [.021, .011, .019]);
  const ecume = piece(coque, orb, eau, [BASSIN[0], BASSIN[1] + .009, BASSIN[2]], [.018, .008, .016]);

  const cou = group(body, 0, .066, .086);
  piece(cou, pill, cuir, [0, 0, .02], [.017, .016, .017]).rotation.x = Math.PI / 2;
  const tete = group(cou, 0, .006, .052);
  piece(tete, orb, cuir, [0, 0, 0], [.026, .022, .03]);
  piece(tete, cone, ecaille, [0, -.005, .024], [.012, .02, .012]).rotation.x = Math.PI / 2;
  const [oeilGauche, oeilDroit] = eyes(tete, { x: .016, y: .008, z: .018, size: .0095, pupil: palette.eye ?? 0x24302b });

  const queue = group(body, 0, .062, -.112);
  piece(queue, cone, cuir, [0, 0, -.018], [.013, .034, .013]).rotation.x = -Math.PI / 2;

  // Stumps, not legs: short enough that the hull almost rests on the stones.
  const legs = [-1, 1].flatMap(side => [.066, -.062].map(z =>
    limb(body, { x: side * .066, y: .07, z, thigh: .028, shin: .014, thickness: .028, colour: cuir, foot: ecaille, footSize: .9 })));

  let stride = 0;
  let roulis = 0;
  let vitesse = 0;
  let tangage = 0;
  let plonge = 0;
  let prairie = 0;
  let cime = 0;
  let bord = 1;
  let blink = 4;
  return {
    expression: { head: tete, neck: cou, legs, tail: queue },
    ground: true,
    home: [-.62, 0, -.22],
    scale: 1.2,
    animate(time, { speed = 0, footfall = false, dt = .016 } = {}) {
      stride += dt * (.8 + speed * 1.7);
      // Every footfall is a wave under the hull: it heels her to the other side
      // and shoves her bow down. Between steps the swell alone keeps her moving.
      if (footfall) { bord = -bord; vitesse += bord * (.16 + speed * .6); plonge -= .45 + speed * .75; }
      const houle = Math.sin(time * .58) * .018;
      vitesse += ((houle - roulis) * 70 - vitesse * 3.6) * dt;
      roulis += vitesse * dt;
      plonge -= (tangage * 120 + plonge * 9) * dt;
      tangage += plonge * dt;
      // Nothing up there is bolted down: the meadow takes the roll a beat late,
      // the crown of the tree later still.
      prairie += (roulis - prairie) * (1 - Math.exp(-dt * 7));
      cime += (prairie - cime) * (1 - Math.exp(-dt * 3.4));
      // Her legs only work for ground covered; standing still, she stands still.
      const bounce = trot(legs, stride, { lift: .26 * speed, reach: .44 * speed, bounce: .006 });
      // Her broad feet stay flat whatever the knee above them does.
      for (const leg of legs) leg.ankle.rotation.x -= leg.knee.rotation.x;
      // She rolls about her deck line, not about the stones under her feet.
      body.position.set(roulis * .06, bounce * speed, Math.cos(stride * 2) * .018 * speed);
      body.rotation.z = roulis;
      body.rotation.x = tangage + speed * .045;
      body.rotation.y = Math.sin(stride) * .09 * speed;
      // Each stage carries only what the stage under it has not caught up with.
      ile.rotation.z = prairie - roulis;
      ile.rotation.x = -tangage * .35;
      arbre.rotation.z = cime - prairie + Math.sin(time * 1.05) * .075;
      arbre.rotation.x = -tangage * .5 + Math.sin(time * .81 + 1.4) * .055;
      const brise = .085 + speed * .3;
      feuillages.forEach((masse, i) => {
        masse.rotation.z = Math.sin(time * (1.7 + i * .43) + i * 2) * brise + (cime - prairie) * .6;
        masse.rotation.x = Math.cos(time * (1.35 + i * .37) + i) * brise;
      });
      // The fall keeps its own time; only the drops turn, to hang plumb.
      const chute = time * 1.15;
      gouttes.forEach((goutte, i) => {
        const [x, y, z, largeur, longueur] = courant(chute + i / gouttes.length);
        goutte.position.set(x, y, z);
        goutte.scale.set(.009 * largeur, .012 * longueur, .008 * largeur);
        goutte.rotation.z = -roulis;
      });
      const remous = .9 + Math.sin(time * 5.4) * .16;
      ecume.position.y = BASSIN[1] + .009 + Math.sin(time * 6.7) * .003;
      ecume.scale.set(.018 * remous, .008 * remous, .016 * remous);
      // She cranes out when Lumen sets off, and looks around when he stops.
      cou.position.z = .086 + speed * .012;
      cou.rotation.y = Math.sin(time * .34) * .3 * (1 - speed * .5);
      cou.rotation.x = -.07 + Math.sin(time * .47) * .12 - speed * .12;
      tete.rotation.x = Math.sin(time * .53 + .8) * .16;
      tete.rotation.y = Math.sin(time * .41 + 2) * .22;
      queue.rotation.y = Math.sin(stride * .5) * .24;
      if (time > blink) { blink = time + 4.6 + (stride % 3); }
      const shut = Math.max(0, 1 - Math.abs(time - blink + 4.6) * 8);
      oeilGauche.scale.y = oeilDroit.scale.y = 1 - shut * .9;
    },
  };
}
