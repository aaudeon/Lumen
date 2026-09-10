/** Reactions are layered over each animal's own gait, on the creature alone.
 * Restore the authored pose before every tick: additive ears/tails must never drift.
 */
const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
const durations = { curious: 3.2, danger: 2.8, treasure: 2.6, victory: 4.2 };

export function expressiveCreature(THREE, stage, creature, spec, id) {
  const rig = spec.expression || {};
  const eyes = creature.userData.petEyes || [];
  const tails = rig.tail?.links || (rig.tail ? [rig.tail] : []);
  const ears = (rig.ears || []).map(ear => ear.ear || ear);
  const wings = rig.wings || [];
  const pupils = [...eyes.map(eye => eye.iris), ...(rig.pupils || [])];
  const nodes = [...new Set([rig.head, rig.neck, rig.jaw, ...ears, ...tails,
    ...wings.map(wing => wing.shoulder), ...eyes.map(eye => eye.socket), ...pupils,
    ...(rig.legs || []).map(leg => leg.hip), ...(rig.orbits || [])].filter(Boolean))];
  const saved = nodes.map(node => ({ node, position: node.position.clone(),
    rotation: node.rotation.clone(), scale: node.scale.clone() }));
  const family = id.startsWith('cat-') ? 'cat' : id.startsWith('dog-') ? 'dog'
    : id.startsWith('turtle-') ? 'turtle' : id.startsWith('dragon-') ? 'dragon' : 'wonder';
  let applied = false, event = null, age = 0, alarm = 0, interest = 0, gaze = 0;
  function restore() {
    if (!applied) return;
    for (const pose of saved) {
      pose.node.position.copy(pose.position);
      pose.node.rotation.copy(pose.rotation);
      pose.node.scale.copy(pose.scale);
    }
    applied = false;
  }
  function react(kind) {
    if (kind === 'reset') {
      restore(); stage.position.set(0, 0, 0); stage.rotation.set(0, 0, 0);
      event = null; age = alarm = interest = gaze = 0;
    } else if (durations[kind]) { event = kind; age = 0; }
  }
  return { ...spec, react,
    animate(time, context = {}) {
      const dt = clamp(context.dt ?? .016, 0, .1);
      age += dt;
      if (event && age >= durations[event]) event = null;
      const envelope = event ? Math.min(1, age * 6, (durations[event] - age) * 3) : 0;
      const joy = event === 'victory' || event === 'treasure' ? envelope : 0;
      const alert = event === 'danger' ? envelope : clamp(context.danger || 0);
      alarm += ((joy ? 0 : alert) - alarm) * (1 - Math.exp(-dt * (alert ? 10 : 3)));
      const curious = event === 'curious' ? envelope : clamp(context.interest || 0);
      interest += (curious * (1 - alarm) * (1 - joy) - interest) * (1 - Math.exp(-dt * 5));
      const attention = Math.max(alarm, interest);
      const look = event === 'curious' ? Math.sin(age * 2) * .7 : clamp(context.look || 0, -.9, .9);
      gaze += (look * attention - gaze) * (1 - Math.exp(-dt * 8));
      restore();
      spec.animate?.(time, { ...context, danger: alarm });
      for (const pose of saved) {
        pose.position.copy(pose.node.position); pose.rotation.copy(pose.node.rotation); pose.scale.copy(pose.node.scale);
      }
      applied = true;

      // Anticipation, lift and landing; the tortoise celebrates with a head bob.
      const beat = Math.max(0, Math.sin(age * (family === 'dog' ? 12 : 8)));
      const hop = joy * beat * beat * (family === 'turtle' ? .006 : spec.ground ? .045 : .06);
      stage.position.set(0, hop + alarm * (family === 'cat' ? .012 : 0), -alarm * .055 + interest * .018);
      stage.rotation.set(alarm * -.08, joy * Math.sin(age * 7) * (family === 'dog' ? .24 : .08),
        joy * Math.sin(age * 8) * (family === 'turtle' ? .025 : .07));
      if (rig.head) {
        rig.head.rotation.y += gaze * .75;
        rig.head.rotation.z += interest * (.22 + Math.sin(time * 2.1) * .08);
        rig.head.rotation.x += alarm * -.17 - joy * (.12 + beat * .16) + interest * .1;
      }
      ears.forEach((ear, i) => {
        const side = i % 2 ? 1 : -1;
        ear.rotation.x += alarm * (family === 'cat' ? -.6 : -.3) + interest * .23;
        ear.rotation.z += side * (alarm * .35 + joy * Math.sin(age * 13 + i) * .22);
      });
      tails.forEach((tail, i) => {
        tail.rotation.y += joy * Math.sin(age * (family === 'dog' ? 24 : 12) - i * .6) * .36;
        tail.rotation.x += alarm * (family === 'cat' ? .35 : family === 'dog' ? -.2 : .1);
        if (family === 'cat') tail.scale.x *= 1 + alarm * .35;
      });
      wings.forEach(({ shoulder, side }) => {
        shoulder.rotation.z += side * (alarm * .38 + joy * Math.sin(age * 16) * .27);
      });
      if (rig.jaw) rig.jaw.rotation.x += alarm * .19 + joy * beat * .22;
      if (family === 'turtle' && rig.neck && rig.head) {
        // Compress the connected throat, while keeping the skull's proportions.
        const reach = 1 - alarm * .68;
        rig.neck.scale.z *= reach;
        rig.head.scale.z /= reach;
        for (const leg of rig.legs || []) leg.hip.scale.multiplyScalar(1 - alarm * .3);
      }
      for (const { socket } of eyes) socket.scale.y *= 1 + alarm * .32 - joy * .32;
      pupils.forEach(pupil => {
        pupil.position.x += gaze * pupil.scale.x * .45;
        pupil.position.y += interest * pupil.scale.y * .16;
        pupil.scale.x *= 1 - alarm * .25;
      });
      (rig.orbits || []).forEach((orbit, i) => {
        orbit.rotation.z += alarm * .25 + joy * Math.sin(age * 7 + i) * .3;
      });
    },
  };
}
