/** Modelling toolkit for familiars: shared shapes, and rigs a creature can move.
 *
 * A familiar is a small animal, not an ornament. It owns a body it can actually
 * articulate — legs that carry a gait, a tail that answers the mood, ears and a
 * head that look around — so no two creatures move alike.
 *
 * Every builder receives this kit and returns a spec (see `src/pets/index.js`).
 */

import { blockGeometry, shellGeometry } from './voxel-shapes.js';

export function creatureKit(tools, root) {
  const { THREE, geo, box, glow, part } = tools;
  const mat=(color,extra={})=>tools.mat(color,{flatShading:true,...extra});
  // Keep the rig's shape aliases and dimensions while replacing its rounded clay volumes.
  const orb = geo(blockGeometry(THREE,2,2,2,.12));
  const cone = geo(new THREE.ConeGeometry(1, 1, 4));
  const pill = geo(blockGeometry(THREE,2,3,2,.10));
  const disc = geo(blockGeometry(THREE,2,1,2,.08));
  const ring = (radius, thickness = .012) => geo(new THREE.TorusGeometry(radius, thickness, 4, 12));
  const dome = (open = .55) => geo(shellGeometry(THREE,box,open));

  /** A flat extruded outline, for wings, fins and leaves. */
  function blade(points, depth = .014) {
    const shape = new THREE.Shape();
    points.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
    shape.closePath();
    return geo(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }));
  }

  const group = (parent, x = 0, y = 0, z = 0) => {
    const node = new THREE.Group();
    node.position.set(x, y, z);
    parent.add(node);
    return node;
  };
  const piece = (parent, shape, surface, [x, y, z], [sx, sy = sx, sz = sx] = [1]) =>
    part(parent, shape, surface, [x, y, z], [sx, sy, sz]);

  /** Two-part eye: white, then a pupil that sits proud of it. */
  function eyes(parent, { x, y, z, size = .028, white = 0xf6f2e2, pupil = 0x241f24, glowing = false }) {
    const sclera = mat(white, { roughness: .35 });
    const iris = glowing ? glow(pupil) : mat(pupil, { roughness: .3 });
    return [-1, 1].map(side => {
      const socket = group(parent, side * x, y, z);
      piece(socket, orb, sclera, [0, 0, 0], [size, size * 1.05, size * .7]);
      const pupilMesh = piece(socket, orb, iris, [0, 0, size * .5], [size * .5, size * .68, size * .4]);
      (root.userData.petEyes ||= []).push({ socket, iris: pupilMesh });
      return socket;
    });
  }

  /** A leg that can actually take a step: hip pivot, shin, and a planted foot. */
  function limb(parent, { x, y, z, thigh = .07, shin = .06, thickness = .026, colour, foot, footSize = 1 }) {
    const hip = group(parent, x, y, z);
    piece(hip, pill, colour, [0, -thigh / 2, 0], [thickness, thigh * .5, thickness]);
    const knee = group(hip, 0, -thigh, 0);
    // A block at the pivot keeps the two segments joined during a deep bend.
    piece(knee,orb,colour,[0,0,0],[thickness*.9]);
    piece(knee, pill, colour, [0, -shin / 2, 0], [thickness * .86, shin * .5, thickness * .86]);
    const ankle = group(knee, 0, -shin, 0);
    piece(ankle, orb, foot || colour, [0, -.012, .012], [thickness * 1.5 * footSize, .016, thickness * 2.1 * footSize]);
    return { hip, knee, ankle, reach: thigh + shin };
  }

  /** A chain of segments: tails, necks, serpentine bodies. Drive it with `wave`. */
  function chain(parent, { x = 0, y = 0, z = 0, count = 4, length = .05, thickness = .03, taper = .82, colour, shape }) {
    const links = [];
    let node = group(parent, x, y, z);
    let width = thickness;
    for (let i = 0; i < count; i++) {
      const joint = group(node, 0, 0, i ? -length : 0);
      piece(joint, shape || pill, colour, [0, 0, -length / 2], [width, length * .5, width]).rotation.x = Math.PI / 2;
      links.push(joint);
      node = joint;
      width *= taper;
    }
    return {
      links,
      /** Ripple the chain; `bend` in radians, `phase` shifts the wave along it. */
      wave(bend, phase = 0, axis = 'y') {
        links.forEach((link, i) => { link.rotation[axis] = Math.sin(phase - i * .8) * bend; });
      },
    };
  }

  return {
    THREE, root, geo, box, orb, cone, pill, disc, dome, ring, blade,
    mat, glow, part, group, piece, eyes, limb, chain,
  };
}

/** The gait every four-legged familiar shares: diagonal pairs, one bounce per stride. */
export function trot(legs, phase, { lift = .3, reach = .5, bounce = 0 } = {}) {
  legs.forEach((leg, i) => {
    const offset = i === 0 || i === 3 ? 0 : Math.PI;
    const swing = Math.sin(phase + offset);
    leg.hip.rotation.x = swing * reach;
    leg.knee.rotation.x = Math.max(0, -Math.cos(phase + offset)) * lift;
    if (leg.ankle) leg.ankle.rotation.x = -leg.hip.rotation.x * .5;
  });
  return Math.abs(Math.sin(phase * 2)) * bounce;
}
