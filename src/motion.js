/** Travel a connected polyline with one acceleration and one deceleration. */
export function createRouteMotion(points, speed = 3.4) {
  if (!Array.isArray(points) || points.length < 2 || !(speed > 0) || !Number.isFinite(speed)) {
    throw new Error('A route needs two points and a positive speed.');
  }
  const vertices = points.map(point => {
    const vertex = { x: point.x, y: point.y, z: point.z };
    if (!Object.values(vertex).every(Number.isFinite)) throw new Error('Invalid route coordinate.');
    return vertex;
  });
  const segments = [];
  let totalLength = 0;
  for (let i = 1; i < vertices.length; i++) {
    const from = vertices[i - 1];
    const to = vertices[i];
    const length = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
    if (length > 0.000001) {
      segments.push({ from, to, length, start: totalLength });
      totalLength += length;
    }
  }
  const ramp = Math.min(0.12, totalLength / speed);
  const duration = totalLength / speed + ramp;
  return {
    duration,
    length: totalLength,
    sample(elapsed) {
      const time = Math.max(0, Math.min(Number.isFinite(elapsed) ? elapsed : 0, duration));
      let distance;
      if (!ramp) distance = 0;
      else if (time < ramp) distance = speed * time * time / (2 * ramp);
      else if (time > duration - ramp) distance = totalLength - speed * (duration - time) ** 2 / (2 * ramp);
      else distance = speed * (time - ramp / 2);
      distance = Math.max(0, Math.min(distance, totalLength));
      const segment = segments.find(part => distance < part.start + part.length) || segments.at(-1);
      if (!segment) return { position: { ...vertices.at(-1) }, distance, heading: null, complete: true };
      const fraction = Math.max(0, Math.min(1, (distance - segment.start) / segment.length));
      return {
        position: {
          x: segment.from.x + (segment.to.x - segment.from.x) * fraction,
          y: segment.from.y + (segment.to.y - segment.from.y) * fraction,
          z: segment.from.z + (segment.to.z - segment.from.z) * fraction,
        },
        distance,
        heading: Math.atan2(segment.to.x - segment.from.x, segment.to.z - segment.from.z),
        complete: time >= duration,
      };
    },
  };
}

/** Derive the preview from reciprocal path openings, never just adjacent cells. */
export function findWalkPreview(state, destination) {
  if (!state || state.won || state.hero === destination) return [];
  // The engine includes currents, crocodiles and all collapse decisions in these routes.
  if (state.walkRoutes) return state.walkRoutes[String(destination)] || [];
  const { size, tiles, hero } = state;
  const end = size * size;
  const directions = [['N', 'S', -size], ['E', 'W', 1], ['S', 'N', size], ['W', 'E', -1]];
  const paths = new Map([[hero, [hero]]]);
  const queue = [hero];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const at = queue[cursor];
    const candidates = [];
    if (at === -1) {
      if (tiles[0]?.ports.includes('W')) candidates.push(0);
    } else if (at === end) {
      candidates.push(end - 1);
    } else {
      if (at === 0 && tiles[at]?.ports.includes('W')) candidates.push(-1);
      if (at === end - 1 && tiles[at]?.ports.includes('E')) candidates.push(end);
      for (const [side, opposite, delta] of directions) {
        const next = at + delta;
        if (next < 0 || next >= end || (Math.abs(delta) === 1 && Math.floor(next / size) !== Math.floor(at / size))) continue;
        if (tiles[at]?.ports.includes(side) && tiles[next]?.ports.includes(opposite)) candidates.push(next);
      }
    }
    for (const next of candidates) {
      if (paths.has(next)) continue;
      const path = [...paths.get(at), next];
      if (next === destination) return path;
      paths.set(next, path);
      queue.push(next);
    }
  }
  return [];
}

/** Choose the nearest safe stopping place reached through the requested adjacent cell. */
export function directionalDestination(state, adjacent) {
  if (!state?.walkRoutes) return adjacent;
  const routes = Object.values(state.walkRoutes).filter(path => path.length > 1 && path[1] === adjacent);
  routes.sort((a, b) => a.length - b.length || a.at(-1) - b.at(-1));
  return routes[0]?.at(-1) ?? null;
}
