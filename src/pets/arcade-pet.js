/** Fantôme malicieux — an arcade sprite escaped from its cabinet.
 *
 * Nothing about him is round: a stair-stepped dome, a hem of five tongues, a
 * pixel grin, two square eyes that snap to a new heading in a single frame. He
 * never glides either — every offset is quantised to a rung, so he climbs the
 * air in steps.
 */
import { creatureKit } from './kit.js';

const CELL = .026;
const RUNG = .02;
/** Rung the sparks hop along: their ring has to clear his corners. */
const ORBIT = CELL * .9;
/** The headings the pupils jump between; a ghost stares, it never tracks. */
const GAZES = [[-1, 0], [1, 0], [0, 1], [-1, -.7], [1, -.7], [0, -1]];
/** The grin, in cells: it steps up at the corners like everything else here. */
const GRIN = [[-2, .5], [-1, .2], [0, 0], [1, .2], [2, .5]];

export default function build(tools, root, palette) {
  const kit = creatureKit(tools, root);
  const { box, mat, glow, group, piece } = kit;
  const shell = mat(palette.primary, { roughness: .72 });
  const crown = mat(palette.secondary, { roughness: .62 });
  const white = mat(palette.accent, { roughness: .34 });
  const iris = mat(palette.eye, { roughness: .28 });
  const spark = glow(palette.accent);
  const coats = [shell, crown, white, iris, spark];
  // He blinks by turning to glass rather than by shutting his eyes.
  for (const coat of coats) coat.transparent = true;

  const ghost = group(root, 0, 0, 0);
  // One cube per rank. The four lower ones keep a flat face so the eyes and the
  // grin have somewhere to sit; the last two draw the dome in, two steps.
  [[7, 6], [7, 6], [7, 6], [7, 6], [5, 4], [3, 2]].forEach(([wide, deep], i) => {
    piece(ghost, box, i > 3 ? crown : shell, [0, (i + .5) * CELL, 0], [wide * CELL, CELL, deep * CELL]);
  });

  // Five tongues under the hem line, each free to lengthen on its own. They are
  // rooted a tenth of a cell inside the body so the seam never opens.
  const hem = [-2, -1, 0, 1, 2].map(slot => {
    const tongue = group(ghost, slot * 1.4 * CELL, 0, 0);
    piece(tongue, box, slot % 2 ? crown : shell, [0, -.5 * CELL, 0], [1.2 * CELL, 1.2 * CELL, 6 * CELL]);
    return tongue;
  });

  const pupils = [-1, 1].map(side => {
    const socket = group(ghost, side * 1.5 * CELL, 3 * CELL, 2.6 * CELL);
    piece(socket, box, white, [0, 0, 0], [1.8 * CELL, 1.8 * CELL, CELL]);
    return piece(socket, box, iris, [0, 0, .75 * CELL], [CELL, CELL, .55 * CELL]);
  });

  // A brow bolted to the dome's step and jutting out over the eye it shades.
  for (const side of [-1, 1]) piece(ghost, box, crown, [side * 1.5 * CELL, 4.3 * CELL, 2.6 * CELL], [1.8 * CELL, .9 * CELL, 1.6 * CELL]);
  GRIN.forEach(([slot, lift]) => piece(ghost, box, iris, [slot * CELL, (1.2 + lift) * CELL, 2.95 * CELL], [.9 * CELL, .5 * CELL, .7 * CELL]));

  const motes = [0, 1, 2].map(() => piece(ghost, box, spark, [0, 0, 0], [.5 * CELL]));

  let drift = 0;
  let gaze = 0;
  let gazeIn = .5;
  let blinkIn = 2.2;
  let fade = 0;
  return {
    expression: { pupils },
    ground: false,
    home: [-.62, 0, -.2],
    scale: 1.1,
    animate(time, { moving = false, speed = 0, dt = .016 } = {}) {
      drift += dt * (1.15 + speed * 3.4);
      // Quantise before anything is applied: the staircase is the whole point.
      const climb = Math.sin(drift) * (1.9 + speed * 2.6) + Math.sin(drift * .43 + 1) * 1.2;
      ghost.position.y = Math.round(climb) * RUNG;
      ghost.position.x = Math.round(Math.sin(drift * .62) * (1.2 + speed * 2.2)) * RUNG;
      ghost.position.z = Math.round(Math.sin(drift * .35) * (.6 + speed * 2.4)) * RUNG;
      ghost.rotation.z = Math.round(Math.sin(drift * .5) * (1 + speed * 2)) * .07;
      // A wave runs along the hem, but each tongue lands on a rung of its own.
      // It only ever lengthens, so no tongue retracts up inside the body.
      hem.forEach((tongue, i) => {
        tongue.scale.y = 1 + Math.round((Math.sin(drift * 2.3 - i * .85) * .5 + .5) * (2 + speed * 2)) * .3;
      });
      // The sparks he sheds hop around a square orbit, never between its cells.
      motes.forEach((mote, i) => {
        const turn = drift * (.55 + i * .16) + i * 2.1;
        mote.position.set(
          Math.round(Math.cos(turn) * 5) * ORBIT,
          Math.round(Math.sin(turn * .8) * 3 + 6) * CELL * .5,
          Math.round(Math.sin(turn) * 5) * ORBIT);
      });
      // Timers run on dt, not on the clock, so the stare keeps its rhythm even
      // when the scene rewinds its time between showcase and world.
      gazeIn -= dt;
      if (gazeIn <= 0) {
        gaze = (gaze + 1 + Math.floor(Math.abs(Math.cos(drift)) * 3)) % GAZES.length;
        gazeIn = (moving ? .34 : .8) + Math.abs(Math.sin(drift * 3)) * .5;
      }
      const [aim, rise] = GAZES[gaze];
      pupils.forEach(pupil => {
        pupil.position.x = aim * CELL * .34;
        pupil.position.y = rise * CELL * .34;
      });
      blinkIn -= dt;
      if (blinkIn <= 0) { blinkIn = 2.4 + Math.abs(Math.sin(drift)) * 2.6; fade = 1; }
      fade = Math.max(0, fade - dt * 3.2);
      for (const coat of coats) coat.opacity = 1 - fade * .62;
    },
  };
}
