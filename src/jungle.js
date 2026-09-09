/** A self-contained jungle dressing; the central 4 × 4 board stays clear. */
export function createJungleEnvironment({ THREE, scene, world, textures: maps = {} }) {
  const parent = world || scene;
  const group = new THREE.Group();
  group.name = 'jungle-environment';
  parent.add(group);
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const instances = [];
  const leaves = [];
  let disposed = false;
  const ownGeometry = geometry => { geometries.add(geometry); return geometry; };
  const ownMaterial = material => { materials.add(material); return material; };
  const rand = value => {
    const n = Math.sin(value * 127.1 + 311.7) * 43758.5453123;
    return n - Math.floor(n);
  };
  const up = new THREE.Vector3(0, 1, 0);
  const axis = new THREE.Vector3(1, 0, 0);
  const sway = new THREE.Quaternion();
  const cameraDirection = new THREE.Vector3();

  // A folded central ridge and angular margins give each broad frond real facets.
  const leafVertices = [];
  const leafIndices = [];
  const bands = 9;
  for (let i = 0; i <= bands; i++) {
    const t = i / bands;
    const width = Math.pow(Math.sin(t * Math.PI), 0.8) * 0.27 * (i % 2 ? 0.92 : 1);
    const bend = -0.32 * t * t + Math.sin(t * Math.PI) * 0.045;
    leafVertices.push(-width, t, bend, 0, t, bend + Math.sin(t * Math.PI) * 0.055, width, t, bend);
    if (i < bands) {
      const a = i * 3;
      leafIndices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4,
        a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
    }
  }
  const leafGeometry = ownGeometry(new THREE.BufferGeometry());
  leafGeometry.setAttribute('position', new THREE.Float32BufferAttribute(leafVertices, 3));
  leafGeometry.setIndex(leafIndices);
  leafGeometry.computeVertexNormals();
  // Palm crowns use a slim stem and separated, swept leaflets instead of solid blades.
  const palmVertices = [];
  const palmBend = t => -0.3 * t * t + Math.sin(t * Math.PI) * 0.045;
  function palmTriangle(a, b, c) { palmVertices.push(...a, ...b, ...c); }
  for (let i = 0; i < 12; i++) {
    const t = i / 12;
    const next = (i + 1) / 12;
    const a = [-0.01, t, palmBend(t) + 0.015];
    const b = [0.01, t, palmBend(t) + 0.015];
    const c = [-0.01, next, palmBend(next) + 0.015];
    const d = [0.01, next, palmBend(next) + 0.015];
    palmTriangle(a, c, b); palmTriangle(b, c, d);
  }
  for (let i = 0; i < 8; i++) {
    const t = 0.09 + i * 0.105;
    const width = Math.sin(t * Math.PI) * 0.27;
    for (const side of [-1, 1]) {
      const root = [side * 0.008, t, palmBend(t) + 0.018];
      const ridge = [side * width * 0.56, t + 0.074, palmBend(t + 0.07) + 0.023];
      const tip = [side * width, t + 0.135, palmBend(t + 0.135) - 0.01];
      const edge = [side * width * 0.64, t + 0.039, palmBend(t + 0.039)];
      const base = [side * 0.008, t + 0.026, palmBend(t + 0.026) + 0.012];
      palmTriangle(root, ridge, tip);
      palmTriangle(root, tip, edge);
      palmTriangle(root, edge, base);
    }
  }
  const palmGeometry = ownGeometry(new THREE.BufferGeometry());
  palmGeometry.setAttribute('position', new THREE.Float32BufferAttribute(palmVertices, 3));
  palmGeometry.computeVertexNormals();
  for (const geometry of [leafGeometry, palmGeometry]) {
    const positions = geometry.attributes.position;
    const uv = new Float32Array(positions.count * 2);
    for (let i = 0; i < positions.count; i++) { uv[i * 2] = 0.5 + positions.getX(i) / 0.6; uv[i * 2 + 1] = positions.getY(i); }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
  const leafMaterials = [0xabbda3, 0xc4d2b4, 0xdcdfb6, 0xe2e6bc].map(color =>
    ownMaterial(new THREE.MeshStandardMaterial({ color, map: maps.leaf || null, roughness: 0.92, side: THREE.DoubleSide, flatShading: true })));
  const bark = ownMaterial(new THREE.MeshStandardMaterial({ color: 0xc3b09a, map: maps.bark || null, roughness: 1, flatShading: true }));
  const rootMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: 0x7f8266, map: maps.bark || null, roughness: 1, flatShading: true }));
  const mossRock = ownMaterial(new THREE.MeshStandardMaterial({ color: 0xaac297, map: maps.moss || null, roughness: 1, flatShading: true }));
  const cylinder = ownGeometry(new THREE.CylinderGeometry(0.86, 1, 1, 5));
  const rockGeometry = ownGeometry(new THREE.DodecahedronGeometry(1, 0));
  const trunkSegments = [];
  const rootSegments = [];
  const rockTransforms = [];

  function segment(list, a, b, radius) {
    list.push({ a: new THREE.Vector3(...a), b: new THREE.Vector3(...b), radius });
  }
  function addLeaf(base, direction, length, width, seed, amplitude = 0.028, canopy = false) {
    const originalMaterial = leafMaterials[seed % leafMaterials.length];
    const material = canopy ? ownMaterial(originalMaterial.clone()) : originalMaterial;
    if (canopy) { material.transparent = true; material.depthWrite = false; }
    const leaf = new THREE.Mesh(canopy ? palmGeometry : leafGeometry, material);
    leaf.position.set(...base);
    leaf.quaternion.setFromUnitVectors(up, new THREE.Vector3(...direction).normalize());
    leaf.scale.set(width * length, length, length);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    group.add(leaf);
    leaves.push({ mesh: leaf, base: leaf.quaternion.clone(), phase: seed * 1.73, amplitude,
      canopy, outward: canopy ? new THREE.Vector3(base[0], 0, base[2]).normalize() : null });
  }

  // All canopies fan away from the board. Their footprint never crosses x/z ±2.7.
  const trees = [
    [-3.23, -3.22, 1.62], [3.3, -3.2, 1.8],
    [-3.3, 3.22, 1.4], [3.24, 3.3, 1.48],
  ];
  trees.forEach(([x, z, height], treeIndex) => {
    const outward = new THREE.Vector3(x, 0, z).normalize();
    const points = [];
    for (let j = 0; j <= 5; j++) {
      const t = j / 5;
      points.push([x + outward.x * t * t * 0.28, -0.12 + height * t, z + outward.z * t * t * 0.28]);
      if (j) segment(trunkSegments, points[j - 1], points[j], 0.12 - t * 0.058);
    }
    const crown = points.at(-1);
    const outwardAngle = Math.atan2(outward.z, outward.x);
    for (let j = 0; j < 6; j++) {
      const angle = outwardAngle + (j - 2.5) * 0.47;
      const elevation = j % 3 === 0 ? 0.55 : 0.17;
      addLeaf(crown, [Math.cos(angle), elevation, Math.sin(angle)], 0.9 + rand(j + treeIndex * 7) * 0.35,
        0.75 + rand(j + treeIndex * 13) * 0.15, treeIndex * 6 + j, 0.034, true);
    }
    // Small mossy outcrops support the palms without introducing a second platform.
    for (let j = 0; j < 3; j++) {
      rockTransforms.push({ x: x + (rand(j + treeIndex * 11) - 0.5) * 0.45,
        y: -0.35 - j * 0.12, z: z + (rand(j + treeIndex * 19 + 3) - 0.5) * 0.45,
        scale: 0.36 + rand(j + treeIndex * 5 + 2) * 0.17 });
    }
    const inner = [Math.sign(x) * 2.62, -0.43, Math.sign(z) * 2.62];
    segment(rootSegments, inner, [x, -0.18, z], 0.09);
    for (let j = 0; j < 3; j++) {
      segment(rootSegments, [x, -0.1, z], [x + Math.cos(j * 2.1) * 0.4, -0.55, z + Math.sin(j * 2.1) * 0.4], 0.06);
    }
  });

  // Six banana/fern rosettes make the lower jungle silhouette lush and varied.
  const plants = [
    [-3.16, -1.08], [-3.12, 1.47], [3.15, -1.27],
    [3.19, 1.65], [-1.25, -3.16], [1.5, 3.18],
  ];
  plants.forEach(([x, z], plantIndex) => {
    const outward = Math.atan2(z, x);
    for (let j = 0; j < 5; j++) {
      const angle = outward + (j - 2) * 0.43;
      const length = 0.75 + rand(50 + plantIndex * 6 + j) * 0.6;
      addLeaf([x, -0.18, z], [Math.cos(angle) * 0.66, 0.75 + (j % 2) * 0.4, Math.sin(angle) * 0.66],
        length, j % 2 ? 1.2 : 0.8, 24 + plantIndex * 5 + j, 0.022);
    }
    rockTransforms.push({ x, y: -0.47, z, scale: 0.32 });
  });

  // Long, tapering roots and delicate hanging vines below the island's edges.
  for (let i = 0; i < 18; i++) {
    const side = i % 4;
    const along = (rand(i + 120) - 0.5) * 5.1;
    const x = side < 2 ? (side ? 2.83 : -2.83) : along;
    const z = side >= 2 ? (side === 2 ? -2.83 : 2.83) : along;
    const length = 0.9 + rand(i + 190) * 1.65;
    let previous = [x, -0.37, z];
    for (let j = 1; j <= 7; j++) {
      const t = j / 7;
      const point = [x + Math.sin(i * 2.3 + t * 4) * t * 0.12,
        -0.37 - length * t, z + Math.cos(i * 1.9 + t * 3) * t * 0.12];
      segment(rootSegments, previous, point, (i % 3 === 0 ? 0.036 : 0.02) * (1 - t * 0.75));
      previous = point;
      if (i < 12 && j === 3) {
        const outward = new THREE.Vector3(x, 0, z).normalize();
        addLeaf(point, [outward.x, -0.4, outward.z], 0.3 + rand(i) * 0.16, 1.1, 54 + i, 0.025);
      }
    }
  }

  const transform = new THREE.Object3D();
  const direction = new THREE.Vector3();
  function buildSegments(items, material) {
    const instanced = new THREE.InstancedMesh(cylinder, material, items.length);
    items.forEach(({ a, b, radius }, index) => {
      direction.subVectors(b, a);
      transform.position.copy(a).add(b).multiplyScalar(0.5);
      transform.quaternion.setFromUnitVectors(up, direction.clone().normalize());
      transform.scale.set(radius, direction.length(), radius);
      transform.updateMatrix();
      instanced.setMatrixAt(index, transform.matrix);
    });
    instanced.castShadow = true;
    instanced.receiveShadow = true;
    instanced.instanceMatrix.needsUpdate = true;
    group.add(instanced);
    instances.push(instanced);
  }
  buildSegments(trunkSegments, bark);
  buildSegments(rootSegments, rootMaterial);
  const rocks = new THREE.InstancedMesh(rockGeometry, mossRock, rockTransforms.length);
  rockTransforms.forEach((rock, index) => {
    transform.position.set(rock.x, rock.y, rock.z);
    transform.rotation.set(index * 0.4, index * 1.71, index * 0.7);
    transform.scale.set(rock.scale, rock.scale * 0.85, rock.scale);
    transform.updateMatrix();
    rocks.setMatrixAt(index, transform.matrix);
  });
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  group.add(rocks);
  instances.push(rocks);

  const glowSize = 24;
  const pixels = new Uint8Array(glowSize * glowSize * 4);
  for (let y = 0; y < glowSize; y++) for (let x = 0; x < glowSize; x++) {
    const distance = Math.hypot((x + 0.5) / glowSize * 2 - 1, (y + 0.5) / glowSize * 2 - 1);
    const offset = (y * glowSize + x) * 4;
    pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 255;
    pixels[offset + 3] = Math.round(Math.pow(Math.max(0, 1 - distance), 2.5) * 255);
  }
  const glow = new THREE.DataTexture(pixels, glowSize, glowSize, THREE.RGBAFormat);
  glow.needsUpdate = true;
  textures.add(glow);
  const count = 48;
  const fireflyPositions = new Float32Array(count * 3);
  const fireflyColors = new Float32Array(count * 3);
  const origins = [];
  for (let i = 0; i < count; i++) {
    const angle = i * 2.39996;
    const radius = 3.5 + rand(i + 350) * 1.2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    origins.push([x, -0.6 + rand(i + 420) * 3.8, z]);
    fireflyColors.set([1, 0.52 + rand(i + 500) * 0.24, 0.12], i * 3);
  }
  const fireflyGeometry = ownGeometry(new THREE.BufferGeometry());
  fireflyGeometry.setAttribute('position', new THREE.BufferAttribute(fireflyPositions, 3));
  fireflyGeometry.setAttribute('color', new THREE.BufferAttribute(fireflyColors, 3));
  const fireflyMaterial = ownMaterial(new THREE.PointsMaterial({ map: glow, size: 0.12,
    transparent: true, opacity: 0.9, vertexColors: true, blending: THREE.AdditiveBlending,
    depthWrite: false, toneMapped: false }));
  const fireflies = new THREE.Points(fireflyGeometry, fireflyMaterial);
  fireflies.frustumCulled = false;
  group.add(fireflies);

  function update(time, dt, camera) {
    if (disposed || !group.visible) return;
    if (camera) {
      camera.getWorldPosition(cameraDirection);
      group.worldToLocal(cameraDirection);
      cameraDirection.y -= 0.35;
      cameraDirection.normalize();
    }
    const blend = 1 - Math.exp(-Math.max(0, dt || 0) * 8);
    for (const leaf of leaves) {
      sway.setFromAxisAngle(axis, Math.sin(time * 0.68 + leaf.phase) * leaf.amplitude);
      leaf.mesh.quaternion.copy(leaf.base).multiply(sway);
      if (leaf.canopy) {
        const targetOpacity = camera && leaf.outward.dot(cameraDirection) > 0.65 ? 0.15 : 1;
        leaf.mesh.material.opacity += (targetOpacity - leaf.mesh.material.opacity) * blend;
        leaf.mesh.castShadow = leaf.mesh.material.opacity > 0.5;
      }
    }
    for (let i = 0; i < count; i++) {
      const origin = origins[i];
      fireflyPositions[i * 3] = origin[0] + Math.sin(time * 0.32 + i * 1.7) * 0.19;
      fireflyPositions[i * 3 + 1] = origin[1] + Math.sin(time * 0.48 + i * 2.1) * 0.16;
      fireflyPositions[i * 3 + 2] = origin[2] + Math.cos(time * 0.29 + i * 1.3) * 0.19;
      const pulse = 0.25 + Math.pow((Math.sin(time * 1.1 + i * 2.4) + 1) * 0.5, 3) * 0.75;
      fireflyColors[i * 3] = pulse;
      fireflyColors[i * 3 + 1] = pulse * (0.52 + rand(i + 500) * 0.24);
      fireflyColors[i * 3 + 2] = pulse * 0.12;
    }
    fireflyGeometry.attributes.position.needsUpdate = true;
    fireflyGeometry.attributes.color.needsUpdate = true;
  }
  update(0, 0);
  return {
    update,
    setVisible(visible) { group.visible = Boolean(visible); },
    dispose() {
      if (disposed) return;
      disposed = true;
      parent.remove(group);
      instances.forEach(instance => instance.dispose());
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      textures.forEach(texture => texture.dispose());
      group.clear();
    },
  };
}
