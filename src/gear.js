/** Swappable equipment meshes for the explorer: hats, capes, and light sources.
 *
 * Every builder owns its geometries and materials and hands back the hooks the
 * rig animates — a flame group, a point light, and any embers that drift.
 */

function kit(THREE) {
  const geometries = new Set();
  const materials = new Set();
  const geo = value => { geometries.add(value); return value; };
  const box = geo(new THREE.BoxGeometry(1, 1, 1));
  const mat = (color, extra = {}) => {
    const value = new THREE.MeshStandardMaterial({ color, roughness: .88, ...extra });
    materials.add(value);
    return value;
  };
  const glow = color => mat(color, { emissive: color, emissiveIntensity: 1.6, toneMapped: false });
  function part(parent, shape, surface, position, scale = [1, 1, 1]) {
    const item = new THREE.Mesh(shape, surface);
    item.position.set(...position);
    item.scale.set(...scale);
    item.castShadow = item.receiveShadow = true;
    parent.add(item);
    return item;
  }
  return { THREE, geo, box, mat, glow, part, geometries, materials };
}

/** The three-layer voxel flame every light source carries, sized to its holder. */
function flameOf(tools, palette, scale = 1) {
  const { THREE, box, mat, part } = tools;
  const group = new THREE.Group();
  const outer = mat(palette.outer, { emissive: palette.outerGlow, emissiveIntensity: 2.1, toneMapped: false });
  const mid = mat(palette.mid, { emissive: palette.midGlow, emissiveIntensity: 2.7, toneMapped: false });
  const core = mat(palette.core, { emissive: palette.coreGlow, emissiveIntensity: 3, toneMapped: false });
  part(group, box, outer, [0, .046 * scale, 0], [.108 * scale, .127 * scale, .102 * scale]);
  part(group, box, mid, [.01 * scale, .105 * scale, .008 * scale], [.075 * scale, .153 * scale, .078 * scale]);
  part(group, box, core, [-.008 * scale, .055 * scale, .053 * scale], [.035 * scale, .094 * scale, .024 * scale]);
  const embers = [
    { mesh: part(group, box, mid, [.025 * scale, .206 * scale, 0], [.018, .025, .018]), drift: .22, span: .11, sway: .028 },
    { mesh: part(group, box, outer, [-.015 * scale, .255 * scale, .01 * scale], [.012, .018, .012]), drift: .18, span: .15, sway: 0 },
  ];
  group.traverse(object => { if (object.isMesh) object.castShadow = object.receiveShadow = false; });
  return { group, embers };
}

const HATS = {
  feutre(tools, root, palette) {
    const { box, mat, part } = tools;
    const felt = mat(palette.felt);
    const band = mat(palette.band);
    const pin = mat(palette.pin, { metalness: .3, roughness: .5 });
    part(root, box, felt, [0, .15, .025], [.51, .038, .414]);
    part(root, box, felt, [-.247, .161, .019], [.056, .032, .36]).rotation.z = -.1;
    part(root, box, felt, [.247, .161, .019], [.056, .032, .36]).rotation.z = .1;
    part(root, box, felt, [0, .219, -.005], [.351, .125, .291]);
    part(root, box, band, [0, .183, -.005], [.36, .047, .301]);
    part(root, box, felt, [0, .286, -.018], [.29, .029, .248]);
    part(root, box, band, [0, .302, -.032], [.08, .009, .158]);
    part(root, box, pin, [-.18, .185, .035], [.014, .035, .06]);
  },
  paille(tools, root, palette) {
    const { THREE, box, geo, mat, part } = tools;
    const straw = mat(palette.straw, { roughness: .97 });
    const dark = mat(palette.dark, { roughness: .97 });
    const cord = mat(palette.cord);
    // A wide woven disc, a low dome, and a hem the brambles have frayed.
    part(root, geo(new THREE.CylinderGeometry(.30, .34, .026, 14)), straw, [0, .152, .012]);
    part(root, geo(new THREE.SphereGeometry(.175, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2)), straw, [0, .148, 0], [1, .92, 1]);
    part(root, box, cord, [0, .186, 0], [.33, .028, .29]);
    for (let i = 0; i < 9; i++) {
      const angle = i * (Math.PI * 2 / 9);
      const tuft = part(root, box, dark, [Math.cos(angle) * .32, .146, Math.sin(angle) * .32 + .012], [.085, .016, .085]);
      tuft.rotation.y = -angle;
    }
  },
  nacre(tools, root, palette) {
    const { THREE, box, geo, mat, part } = tools;
    const shell = mat(palette.shell, { metalness: .35, roughness: .18 });
    const fin = mat(palette.fin, { metalness: .3, roughness: .25 });
    const gold = mat(palette.gold, { metalness: .6, roughness: .3 });
    // A polished dome, a raised crest, and two cheek plates.
    part(root, geo(new THREE.SphereGeometry(.195, 14, 9, 0, Math.PI * 2, 0, Math.PI * .58)), shell, [0, .012, 0], [1.02, 1.15, 1.02]);
    part(root, geo(new THREE.ConeGeometry(.055, .28, 4)), fin, [0, .215, -.015]).rotation.x = .16;
    part(root, geo(new THREE.TorusGeometry(.185, .017, 6, 22)), gold, [0, .05, 0]).rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) {
      const cheek = part(root, box, shell, [side * .175, -.02, .015], [.045, .155, .19]);
      cheek.rotation.z = side * .16;
      part(root, box, fin, [side * .188, .05, .015], [.03, .04, .13]);
    }
  },
  obsidienne(tools, root, palette) {
    const { THREE, box, geo, mat, glow, part } = tools;
    const glass = mat(palette.glass, { metalness: .4, roughness: .32, flatShading: true });
    const edge = mat(palette.edge, { metalness: .5, roughness: .4, flatShading: true });
    const ember = glow(palette.ember);
    // Angular plates closed at the back, open over the face, lit along the brow.
    part(root, box, glass, [0, .13, -.07], [.44, .27, .34]);
    part(root, box, edge, [0, .275, -.075], [.38, .05, .3]);
    for (const side of [-1, 1]) {
      const plate = part(root, box, glass, [side * .2, .01, .015], [.06, .32, .33]);
      plate.rotation.z = side * .09;
    }
    part(root, geo(new THREE.ConeGeometry(.13, .24, 4)), glass, [0, .3, -.09]).rotation.y = Math.PI / 4;
    part(root, box, ember, [0, .07, .165], [.31, .022, .026]);
    part(root, box, edge, [0, .13, .17], [.34, .1, .03]);
  },
};

const CAPES = {
  aucune() {},
  mousse(tools, root, palette) {
    const { box, mat, part } = tools;
    const cloth = mat(palette.cloth, { roughness: .96 });
    const shade = mat(palette.shade, { roughness: .96 });
    const cord = mat(palette.cord);
    // The yoke rides over the bedroll; the panel falls clear behind it.
    part(root, box, cord, [0, .265, -.075], [.36, .042, .32]);
    part(root, box, cloth, [0, .09, -.252], [.38, .40, .03]);
    part(root, box, shade, [0, -.115, -.256], [.34, .09, .026]);
    // A hem the brambles have torn into uneven tongues, clear of the boots.
    for (let i = 0; i < 4; i++) {
      part(root, box, shade, [(i - 1.5) * .095, -.185 - (i % 2) * .025, -.258], [.082, .1 + (i % 2) * .05, .022]);
    }
  },
  corail(tools, root, palette) {
    const { THREE, box, geo, mat, part } = tools;
    const cloth = mat(palette.cloth, { roughness: .7 });
    const coral = mat(palette.coral, { roughness: .55 });
    const clasp = mat(palette.clasp, { metalness: .55, roughness: .3 });
    // Short at the back, with reef branches climbing both shoulders.
    part(root, box, cloth, [0, .245, -.09], [.42, .05, .34]);
    part(root, box, cloth, [0, .13, -.244], [.44, .24, .034]);
    part(root, box, cloth, [0, -.01, -.248], [.36, .09, .028]);
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      const branch = part(root, box, coral, [side * (.155 + i * .022), .26 + i * .046, -.05 + i * .028],
        [.028, .1 - i * .012, .028]);
      branch.rotation.z = side * (.22 + i * .2);
      branch.rotation.x = -i * .16;
    }
    part(root, geo(new THREE.TorusGeometry(.048, .014, 5, 14)), clasp, [0, .268, .1]).rotation.x = Math.PI / 2;
  },
  braise(tools, root, palette) {
    const { box, mat, glow, part } = tools;
    const cloth = mat(palette.cloth, { roughness: .93 });
    const trim = mat(palette.trim, { metalness: .3, roughness: .5 });
    const ember = glow(palette.ember);
    part(root, box, trim, [0, .268, -.075], [.37, .046, .33]);
    part(root, box, cloth, [0, .05, -.25], [.42, .49, .034]);
    part(root, box, trim, [0, -.185, -.254], [.42, .05, .028]);
    // Embers sit proud of the outer face, so they read from behind. Their pulse
    // multiplies the size they were built at: setScalar would blow them up to
    // unit cubes and swallow the explorer whole.
    const sparks = [];
    for (let i = 0; i < 6; i++) {
      const spark = part(root, box, ember, [(i % 3 - 1) * .12, .01 + (i > 2 ? .16 : -.08), -.272], [.034, .034, .018]);
      sparks.push({ mesh: spark, size: spark.scale.clone() });
    }
    return time => {
      ember.emissiveIntensity = 1.1 + Math.sin(time * 2.4) * .5;
      for (const [i, spark] of sparks.entries()) {
        spark.mesh.scale.copy(spark.size).multiplyScalar(.9 + Math.sin(time * 3 + i) * .22);
      }
    };
  },
};

const LIGHTS = {
  torche(tools, root, palette) {
    const { box, mat, part } = tools;
    root.position.set(.075, 0, .035);
    part(root, box, mat(palette.wood), [0, .08, 0], [.046, .3, .046]);
    part(root, box, mat(palette.wrap), [0, .006, 0], [.058, .075, .058]);
    part(root, box, mat(palette.metal, { metalness: .3, roughness: .5 }), [0, .226, 0], [.084, .068, .084]);
    const flame = flameOf(tools, palette);
    flame.group.position.y = .278;
    root.add(flame.group);
    return { flame, lightAt: [0, .365, .04] };
  },
  lanterne(tools, root, palette) {
    const { THREE, box, geo, mat, part } = tools;
    const brass = mat(palette.metal, { metalness: .62, roughness: .34 });
    const iron = mat(palette.wood, { metalness: .4, roughness: .55 });
    const glass = mat(palette.glass, { transparent: true, opacity: .3, roughness: .1, metalness: .2 });
    root.position.set(.082, -.015, .04);
    // A caged lamp that hangs under the fist rather than standing above it.
    part(root, geo(new THREE.TorusGeometry(.042, .011, 6, 14)), brass, [0, .125, 0]).rotation.y = Math.PI / 2;
    part(root, box, brass, [0, .062, 0], [.022, .12, .022]);
    part(root, box, mat(palette.wrap, { roughness: .95 }), [0, .052, 0], [.036, .045, .036]);
    part(root, box, brass, [0, -.012, 0], [.135, .026, .135]);
    part(root, box, iron, [0, -.208, 0], [.15, .03, .15]);
    for (const [x, z] of [[-.056, -.056], [.056, -.056], [-.056, .056], [.056, .056]]) {
      part(root, box, brass, [x, -.11, z], [.017, .195, .017]);
    }
    const pane = part(root, box, glass, [0, -.11, 0], [.104, .18, .104]);
    pane.castShadow = false;
    const flame = flameOf(tools, palette, .78);
    flame.group.position.y = -.185;
    root.add(flame.group);
    return { flame, lightAt: [0, -.1, 0] };
  },
  cristal(tools, root, palette) {
    const { THREE, box, geo, mat, part } = tools;
    root.position.set(.075, 0, .035);
    part(root, box, mat(palette.wood), [0, .05, 0], [.04, .24, .04]);
    part(root, box, mat(palette.wrap), [0, .01, 0], [.052, .07, .052]);
    part(root, geo(new THREE.TorusGeometry(.05, .012, 5, 14)), mat(palette.metal, { metalness: .55, roughness: .3 }),
      [0, .175, 0]).rotation.x = Math.PI / 2;
    // The stone floats clear of the staff, escorted by two chips of itself.
    const core = mat(palette.core, { emissive: palette.coreGlow, emissiveIntensity: 2.4, toneMapped: false });
    const shard = mat(palette.mid, { emissive: palette.midGlow, emissiveIntensity: 2, toneMapped: false });
    const flameGroup = new THREE.Group();
    flameGroup.position.y = .285;
    root.add(flameGroup);
    const halo = mat(palette.outer, { emissive: palette.outerGlow, emissiveIntensity: 1.4,
      transparent: true, opacity: .34, toneMapped: false });
    part(flameGroup, geo(new THREE.OctahedronGeometry(.082)), core, [0, 0, 0]).castShadow = false;
    part(flameGroup, geo(new THREE.OctahedronGeometry(.125)), halo, [0, 0, 0]).castShadow = false;
    const embers = [-1, 1].map((side, i) => ({
      mesh: part(flameGroup, geo(new THREE.TetrahedronGeometry(.032)), shard, [side * .09, .02 + i * .03, 0]),
      drift: .3 + i * .1, span: .07, sway: .05,
    }));
    embers.forEach(ember => { ember.mesh.castShadow = false; });
    return { flame: { group: flameGroup, embers }, lightAt: [0, .3, .02] };
  },
  brasero(tools, root, palette) {
    const { THREE, box, geo, mat, part } = tools;
    const iron = mat(palette.wood, { metalness: .45, roughness: .55 });
    const brass = mat(palette.metal, { metalness: .6, roughness: .35 });
    root.position.set(.08, -.01, .04);
    part(root, box, brass, [0, .05, 0], [.024, .1, .024]);
    part(root, geo(new THREE.TorusGeometry(.035, .01, 5, 12)), brass, [0, .11, 0]).rotation.y = Math.PI / 2;
    for (const [x, z] of [[-.062, .012], [.055, -.04], [.012, .062]]) {
      const chain = part(root, box, brass, [x, -.075, z], [.013, .16, .013]);
      chain.rotation.set(z * .5, 0, -x * .5);
    }
    part(root, geo(new THREE.CylinderGeometry(.095, .055, .085, 8)), iron, [0, -.185, 0]);
    part(root, geo(new THREE.TorusGeometry(.094, .013, 5, 16)), brass, [0, -.148, 0]).rotation.x = Math.PI / 2;
    // Coals heaped in the bowl, under the flame.
    const coal = mat(palette.wrap, { roughness: 1, flatShading: true });
    for (let i = 0; i < 4; i++) {
      part(root, box, coal, [Math.cos(i * 1.6) * .038, -.152, Math.sin(i * 1.6) * .038], [.045, .03, .045])
        .rotation.y = i * .8;
    }
    const flame = flameOf(tools, palette, .95);
    flame.group.position.y = -.155;
    root.add(flame.group);
    return { flame, lightAt: [0, -.09, 0] };
  },
};

const BUILDERS = { hat: HATS, cape: CAPES, light: LIGHTS };

/** Build one piece of equipment. `look[slot]` carries the chosen id and palette. */
export function buildGear({ THREE, slot, palette }) {
  const tools = kit(THREE);
  const root = new THREE.Group();
  root.name = `gear-${slot}-${palette?.id || 'default'}`;
  const build = BUILDERS[slot]?.[palette?.id];
  const outcome = build ? build(tools, root, palette) : undefined;
  const animate = typeof outcome === 'function' ? outcome : null;
  const fitted = outcome && typeof outcome === 'object' ? outcome : {};
  let light = null;
  if (fitted.lightAt) {
    light = new THREE.PointLight(palette.light, 2.4, 3.1, 1.8);
    light.position.set(...fitted.lightAt);
    light.castShadow = false;
    root.add(light);
  }
  return {
    root, light, animate,
    flame: fitted.flame?.group || null,
    embers: fitted.flame?.embers || [],
    dispose() {
      root.removeFromParent();
      tools.geometries.forEach(value => value.dispose());
      tools.materials.forEach(value => value.dispose());
      root.clear();
    },
  };
}
