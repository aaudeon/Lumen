export const CUBE_GAP = 1.55;
export const SPACE_PORTS = {
  N: [0, 0, -1], E: [1, 0, 0], S: [0, 0, 1],
  W: [-1, 0, 0], U: [0, 1, 0], D: [0, -1, 0],
};

export function boardShape(state) {
  const size = state?.size || 4;
  const depth = state?.depth || 1;
  return { size, depth, count: size * size * depth, finish: state?.finishIndex ?? size * size * depth };
}

export function cellCoordinates(state, index) {
  const { size } = boardShape(state);
  return { column: index % size, row: Math.floor(index / size) % size, layer: Math.floor(index / (size * size)) };
}

export function adjacentCell(state, index, direction) {
  const { size, depth, count } = boardShape(state);
  if (index < 0 || index >= count || !SPACE_PORTS[direction]) return null;
  const { column, row, layer } = cellCoordinates(state, index);
  const [along, above, behind] = SPACE_PORTS[direction];
  const nextColumn = column + along, nextLayer = layer + above, nextRow = row + behind;
  if (nextColumn < 0 || nextColumn >= size || nextRow < 0 || nextRow >= size || nextLayer < 0 || nextLayer >= depth) return null;
  return nextColumn + size * nextRow + size * size * nextLayer;
}

export function volumePosition(index, spread = 0) {
  const entrance = index === -1, exit = index === 27;
  const cell = entrance ? 0 : exit ? 26 : index;
  const column = cell % 3, layer = Math.floor(cell / 9), row = Math.floor(cell / 3) % 3;
  return {
    x: (column - 1) * CUBE_GAP + (entrance ? -1.2 : exit ? 1.2 : 0),
    y: (layer - 1) * (CUBE_GAP + spread * .95),
    z: (row - 1) * CUBE_GAP,
  };
}

export function cellLabel(state, index) {
  const { depth, finish } = boardShape(state);
  if (index === -1) return 'Entree';
  if (index === finish) return 'Sortie';
  const { column, row, layer } = cellCoordinates(state, index);
  return `${depth > 1 ? `Etage ${layer + 1} - ` : ''}Ligne ${row + 1}, colonne ${column + 1}`;
}