import * as THREE from 'three';
import { SPACE_PORTS } from './volume.js';
import { createRouteMotion } from './motion.js';

export const LUNAR_FACES = Object.keys(SPACE_PORTS);
export const LUNAR_GAP = 1.3;
export const LUNAR_FINISH = 162;
export const LUNAR_FACE_NAMES = {
  N: 'Face avant', E: 'Face droite', S: 'Face arri\u00e8re',
  W: 'Face gauche', U: 'Dessus', D: 'Dessous',
};
export const LUNAR_CAMERA_UP = {
  N: 'U', E: 'U', S: 'U', W: 'U', U: 'N', D: 'S',
};
const OPPOSITE = { N: 'S', S: 'N', E: 'W', W: 'E', U: 'D', D: 'U' };
const KEY_DIRECTIONS = {
  N: { arrowright: 'W', arrowup: 'U' }, E: { arrowright: 'N', arrowup: 'U' },
  S: { arrowright: 'E', arrowup: 'U' }, W: { arrowright: 'S', arrowup: 'U' },
  U: { arrowright: 'E', arrowup: 'N' }, D: { arrowright: 'E', arrowup: 'S' },
};

export function surfaceIndex(cube, face) {
  return cube * 6 + LUNAR_FACES.indexOf(face);
}

export function surfaceParts(index) {
  return { cube: Math.floor(index / 6), face: LUNAR_FACES[index % 6] };
}

export function lunarCubePosition(cube) {
  return new THREE.Vector3((cube % 3 - 1) * LUNAR_GAP,
    (Math.floor(cube / 9) - 1) * LUNAR_GAP, (Math.floor(cube / 3) % 3 - 1) * LUNAR_GAP);
}

export function isExteriorSurface(index) {
  if (!Number.isInteger(index) || index < 0 || index >= LUNAR_FINISH) return false;
  const { cube, face } = surfaceParts(index);
  const coordinates = [cube % 3, Math.floor(cube / 9), Math.floor(cube / 3) % 3];
  return SPACE_PORTS[face].some((normal, axis) => normal && coordinates[axis] === (normal > 0 ? 2 : 0));
}

export function surfaceNeighbor(index, direction) {
  if (!isExteriorSurface(index)) return null;
  const { cube, face } = surfaceParts(index);
  if (!SPACE_PORTS[direction] || direction === face || direction === OPPOSITE[face]) return null;
  const coordinates = [cube % 3, Math.floor(cube / 9), Math.floor(cube / 3) % 3]
    .map((value, axis) => value + SPACE_PORTS[direction][axis]);
  if (coordinates.every(value => value >= 0 && value < 3)) {
    return { index: surfaceIndex(coordinates[0] + coordinates[2] * 3 + coordinates[1] * 9, face), back: OPPOSITE[direction] };
  }
  return { index: surfaceIndex(cube, direction), back: face };
}

export function lunarKeyDestination(index, key) {
  const { face } = surfaceParts(index);
  const directions = KEY_DIRECTIONS[face];
  if (!directions) return null;
  const direction = directions[key] || (key === 'arrowleft' ? OPPOSITE[directions.arrowright]
    : key === 'arrowdown' ? OPPOSITE[directions.arrowup] : null);
  return direction ? surfaceNeighbor(index, direction)?.index ?? null : null;
}

export function surfaceFrame(index, state) {
  const node = index === -1 ? state.entry.index : index === state.finishIndex ? state.exit.index : index;
  const { cube, face } = surfaceParts(node);
  const normal = new THREE.Vector3(...SPACE_PORTS[face]);
  const center = lunarCubePosition(cube);
  const offset = LUNAR_GAP / 2 + .012 + (index === -1 || index === state.finishIndex ? .8 : 0);
  return { node, cube, face, normal, center, position: center.clone().addScaledVector(normal, offset) };
}

export function surfaceQuaternion(normal, forward) {
  const tangent = forward.clone().addScaledVector(normal, -forward.dot(normal));
  if (tangent.lengthSq() < 1e-8) {
    tangent.set(0, 0, 1);
    if (Math.abs(tangent.dot(normal)) > .9) tangent.set(1, 0, 0);
    tangent.addScaledVector(normal, -tangent.dot(normal));
  }
  tangent.normalize();
  const right = new THREE.Vector3().crossVectors(normal, tangent).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, normal, tangent));
}

export function createSurfaceMotion(path, state, speed = 2.4) {
  const frames = path.map(index => surfaceFrame(index, state));
  const points = [frames[0].position], normals = [frames[0].normal];
  const vertexDistances = [0], distances = [0];
  function append(position, normal) {
    const length = position.distanceTo(points.at(-1));
    if (length < 1e-8) return;
    vertexDistances.push(vertexDistances.at(-1) + length);
    points.push(position); normals.push(normal);
  }
  for (let index = 1; index < frames.length; index++) {
    const previous = frames[index - 1], next = frames[index];
    if (previous.face !== next.face) {
      // L'arc passe a l'exterieur de l'arete ; une diagonale traverserait la roche.
      const edge = previous.center.clone().addScaledVector(previous.normal, LUNAR_GAP / 2)
        .addScaledVector(next.normal, LUNAR_GAP / 2);
      for (let step = 0; step <= 8; step++) {
        const angle = step / 8 * Math.PI / 2;
        const normal = previous.normal.clone().multiplyScalar(Math.cos(angle)).addScaledVector(next.normal, Math.sin(angle)).normalize();
        append(edge.clone().addScaledVector(normal, .04), normal);
      }
    }
    append(next.position, next.normal);
    distances.push(vertexDistances.at(-1));
  }
  const route = createRouteMotion(points, speed);
  return {
    path, points, distances, duration: route.duration, length: route.length,
    sample(elapsed) {
      const sample = route.sample(elapsed);
      let segment = vertexDistances.findIndex((distance, index) => index > 0 && sample.distance < distance) - 1;
      if (segment < 0) segment = Math.max(0, points.length - 2);
      const length = vertexDistances[segment + 1] - vertexDistances[segment];
      const fraction = length > 0 ? Math.max(0, Math.min(1, (sample.distance - vertexDistances[segment]) / length)) : 1;
      const normal = normals[segment].clone().lerp(normals[segment + 1] || normals[segment], fraction).normalize();
      const forward = (points[segment + 1] || points[segment]).clone().sub(points[segment]);
      return { ...sample, normal, quaternion: surfaceQuaternion(normal, forward) };
    },
  };
}

export function lunarLabel(index) {
  if (index === -1) return 'Module d\u2019arriv\u00e9e';
  if (index === LUNAR_FINISH) return 'Balise de sortie';
  const { cube, face } = surfaceParts(index);
  return `${LUNAR_FACE_NAMES[face]} \u00b7 cube ${cube + 1}`;
}