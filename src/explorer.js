import { paintCoat, paintSleeve, resolveLook, GEAR_SLOTS } from './cosmetics.js';
import { buildGear } from './gear.js';

/** Pixel-painted expedition character with a self-contained articulated voxel rig.
 *
 * `style` names the equipped cosmetics; the textures are repainted in place when
 * it changes, so the wardrobe never rebuilds the rig mid-expedition.
 */
export function createExplorer({ THREE, style, effectWorld=null, portalMount=null }) {
  const root = new THREE.Group();
  root.name = 'voxel-explorer';
  const rig = new THREE.Group();
  root.add(rig);
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const materials = new Set();
  const textures = new Set();
  let disposed = false;
  let stride = 0;
  let movement = 0;
  let blinkAt = null;
  let blinkUntil = 0;
  // A complete left/right gait cycle is tied to travel, never to render speed.
  const gaitLength = 1.04;
  const fullTurn = Math.PI * 2;
  const bootSole = 0.0715;

  let look = resolveLook(style);
  const repaints = [];

  const ownMaterial = material => { materials.add(material); return material; };
  function pixels(paint) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const rect = (color, x, y, width, height) => { ctx.fillStyle = color; ctx.fillRect(x, y, width, height); };
    const draw = () => paint(rect);
    draw();
    const texture = new THREE.CanvasTexture(canvas);
    repaints.push(() => { draw(); texture.needsUpdate = true; });
    texture.magFilter = texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    textures.add(texture);
    return texture;
  }
  function painted(texture, color = 0xffffff) {
    return ownMaterial(new THREE.MeshStandardMaterial({ color, map: texture, roughness: 0.94 }));
  }
  function solid(color, options = {}) {
    return ownMaterial(new THREE.MeshStandardMaterial({ color, roughness: 0.91, ...options }));
  }
  function box(parent, material, x, y, z, width, height, depth) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const skin = solid(0xd6a276);
  const hair = solid(0x483025);
  const leatherDark = solid(0x422b24);
  const brass = solid(0xbfa268, { metalness: 0.3, roughness: 0.5 });
  const shirt = solid(look.coat.shirt);

  function faceTexture(blink) {
    return pixels(rect => {
      rect('#d6a276', 0, 0, 32, 32);
      rect('#e7b789', 3, 5, 25, 21);
      rect('#bc815c', 0, 0, 3, 32); rect('#bc815c', 29, 0, 3, 32);
      rect('#583526', 0, 0, 32, 5); rect('#583526', 0, 4, 5, 6); rect('#583526', 27, 4, 5, 7);
      rect('#6c432d', 5, 4, 6, 3);
      rect('#64402f', 6, 10, 7, 2); rect('#64402f', 19, 10, 7, 2);
      if (blink) {
        rect('#423128', 7, 16, 6, 2); rect('#423128', 20, 16, 6, 2);
      } else {
        rect('#fff1d8', 6, 13, 7, 6); rect('#fff1d8', 19, 13, 7, 6);
        rect('#363028', 9, 14, 4, 5); rect('#363028', 20, 14, 4, 5);
        rect('#66877a', 10, 15, 2, 3); rect('#66877a', 21, 15, 2, 3);
        rect('#252b26', 11, 15, 2, 3); rect('#252b26', 20, 15, 2, 3);
        rect('#ffffff', 9, 14, 2, 2); rect('#ffffff', 20, 14, 2, 2);
      }
      rect('#edc297', 14, 18, 4, 4); rect('#c88d68', 15, 22, 3, 1);
      rect('#d88f75', 5, 21, 5, 2); rect('#d88f75', 23, 21, 5, 2);
      rect('#a76f50', 11, 26, 10, 1); rect('#8c5c43', 12, 27, 8, 1);
      rect('#eec69a', 12, 24, 8, 1);
      rect('#b57c58', 7, 29, 2, 1); rect('#b57c58', 23, 29, 2, 1);
    });
  }
  const faceOpen = painted(faceTexture(false));
  const faceBlink = painted(faceTexture(true));
  const jacket = painted(pixels(rect => paintCoat(rect, look.coat)));
  const sleeve = painted(pixels(rect => paintSleeve(rect, look.coat)));
  const trousers = painted(pixels(rect => {
    rect('#a49b6e', 0, 0, 32, 32);
    rect('#b5aa7b', 4, 0, 9, 32); rect('#817d58', 25, 0, 3, 32);
    rect('#8e875e', 3, 11, 11, 2); rect('#c0b487', 4, 14, 9, 1);
    rect('#8c8159', 0, 28, 32, 2);
  }));
  const bootMaterial = painted(pixels(rect => {
    rect('#51382b', 0, 0, 32, 32);
    rect('#6b4c34', 4, 3, 24, 3); rect('#332821', 0, 26, 32, 6);
    for (let i = 0; i < 3; i++) rect('#b0966a', 11, 7 + i * 5, 10, 1);
  }));

  const hips = new THREE.Group();
  hips.name = 'explorer-hips';
  hips.position.y = 0.36;
  rig.add(hips);
  box(hips, trousers, 0, -0.005, 0, 0.29, 0.105, 0.19);
  box(hips, leatherDark, 0, 0.045, 0, 0.31, 0.045, 0.205);
  box(hips, brass, 0, 0.045, 0.11, 0.052, 0.036, 0.014);
  function leg(x, side) {
    const hip = new THREE.Group(); hip.position.x = x; hips.add(hip);
    hip.name = `${side}-hip`;
    box(hip, trousers, 0, -0.075, 0, 0.12, 0.15, 0.14);
    const knee = new THREE.Group(); knee.position.y = -0.15; hip.add(knee);
    knee.name = `${side}-knee`;
    box(knee, trousers, 0, -0.07, 0, 0.115, 0.14, 0.13);
    const ankle = new THREE.Group(); ankle.position.y = -0.14; knee.add(ankle);
    ankle.name = `${side}-ankle`;
    box(ankle, bootMaterial, 0, -0.018, 0.028, 0.145, 0.102, 0.207);
    box(ankle, leatherDark, 0, -0.059, 0.032, 0.15, 0.025, 0.21);
    return { hip, knee, ankle };
  }
  const leftLeg = leg(-0.086, 'left');
  const rightLeg = leg(0.086, 'right');
  const torso = new THREE.Group(); torso.position.y = 0.40; rig.add(torso);
  box(torso, [sleeve, sleeve, sleeve, sleeve, jacket, sleeve], 0, 0.12, 0, 0.33, 0.285, 0.215);
  box(torso, shirt, -0.051, 0.258, 0.116, 0.08, 0.055, 0.03).rotation.z = -0.32;
  box(torso, shirt, 0.051, 0.258, 0.116, 0.08, 0.055, 0.03).rotation.z = 0.32;
  box(torso, skin, 0, 0.282, 0, 0.108, 0.085, 0.105);
  const backBundle = box(torso, leatherDark, 0, 0.11, -0.158, 0.23, 0.25, 0.115);
  backBundle.name = 'back-bundle';
  box(torso, sleeve, 0, 0.215, -0.16, 0.25, 0.06, 0.13);
  box(torso, brass, 0, 0.15, -0.221, 0.035, 0.058, 0.012);
  const chestStrap = box(torso, leatherDark, -0.015, 0.125, 0.123, 0.035, 0.39, 0.018);
  chestStrap.rotation.z = -0.76;
  box(torso, brass, 0.06, 0.205, 0.139, 0.045, 0.045, 0.012).rotation.z = -0.76;

  const headPivot = new THREE.Group(); headPivot.position.y = 0.76; rig.add(headPivot);
  const headMaterials = [skin, skin, hair, skin, faceOpen, hair];
  box(headPivot, headMaterials, 0, 0, 0, 0.307, 0.272, 0.268);
  box(headPivot, skin, -0.168, -0.013, 0.005, 0.044, 0.081, 0.063);
  box(headPivot, skin, 0.168, -0.013, 0.005, 0.044, 0.081, 0.063);
  const hatSlot = new THREE.Group();
  headPivot.add(hatSlot);

  function arm(x) {
    const shoulder = new THREE.Group(); shoulder.position.set(x, 0.237, 0); torso.add(shoulder);
    box(shoulder, sleeve, 0, -0.083, 0, 0.132, 0.174, 0.146);
    const elbow = new THREE.Group(); elbow.position.y = -0.164; shoulder.add(elbow);
    box(elbow, sleeve, 0, -0.064, 0, 0.117, 0.137, 0.126);
    box(elbow, shirt, 0, -0.128, 0, 0.12, 0.031, 0.128);
    const hand = new THREE.Group(); hand.position.y = -0.166; elbow.add(hand);
    box(hand, skin, 0, -0.008, 0.006, 0.1, 0.088, 0.102);
    return { shoulder, elbow, hand };
  }
  const leftArm = arm(-0.226);
  const rightArm = arm(0.226);
  const satchel = new THREE.Group(); satchel.position.set(-0.224, 0.387, 0.014); rig.add(satchel);
  box(satchel, sleeve, 0, -0.025, 0, 0.174, 0.192, 0.12);
  box(satchel, leatherDark, 0, 0.049, 0.016, 0.181, 0.055, 0.129);
  box(satchel, brass, 0, 0.005, 0.067, 0.031, 0.048, 0.012);

  const capeSlot = new THREE.Group();
  torso.add(capeSlot);
  const lightSlot = new THREE.Group();
  rightArm.hand.add(lightSlot);
  // Equipment is rebuilt on demand; the rig only keeps the mount points.
  const worn = Object.fromEntries(GEAR_SLOTS.map(slot=>[slot,null]));
  const petAnchor = new THREE.Group();
  petAnchor.name = 'explorer-pet-anchor';
  root.add(petAnchor);
  const mounts = { hat: hatSlot, cape: capeSlot, light: lightSlot,pet:petAnchor,aura:root,trail:effectWorld||root,portal:portalMount||root };
  let petLag = 0;
  const effectPosition=new THREE.Vector3();
  function fit(slot) {
    if(worn[slot]?.id===look[slot].id)return;
    worn[slot]?.dispose();
    worn[slot] = buildGear({ THREE, slot, palette: look[slot] });
    worn[slot].id=look[slot].id;
    if(slot==='portal') {
      // The ornament sits in front of the stone arch, clear of its thick pillars.
      if(portalMount){worn[slot].root.rotation.y=Math.PI/2;worn[slot].root.scale.setScalar(.78);worn[slot].root.position.set(.24,.16,0);}
      else worn[slot].root.position.z=-.55;
    }
    mounts[slot].add(worn[slot].root);
    if (slot === 'pet') {
      // Placement belongs to the rig; the creature only animates its own body.
      const spec = worn.pet?.spec || {};
      petAnchor.userData.home=spec.home || [-.62,0,-.16];
      petAnchor.userData.ground=!!spec.ground;
      petAnchor.position.set(...(spec.home || [-.62, 0, -.16]));
      petAnchor.scale.setScalar(spec.scale || 1);
    }
  }

  function placeLeg(limb, cycle) {
    const stance = cycle < 0.5;
    const portion = stance ? cycle * 2 : (cycle - 0.5) * 2;
    const reach = 0.11 * movement;
    // The stance boot stays flat at ground level. Only the returning foot rises.
    const footZ = stance ? reach * (1 - portion * 2) : -reach * Math.cos(portion * Math.PI);
    const lift = stance ? 0 : Math.sin(portion * Math.PI) ** 2 * 0.057 * movement;
    const drop = hips.position.y - bootSole - lift;
    const thigh = 0.15;
    const shin = 0.14;
    const kneeAngle = Math.acos(THREE.MathUtils.clamp(
      (drop * drop + footZ * footZ - thigh * thigh - shin * shin) / (2 * thigh * shin), -1, 1,
    ));
    const hipAngle = Math.atan2(-footZ, drop) - Math.atan2(shin * Math.sin(kneeAngle), thigh + shin * Math.cos(kneeAngle));
    limb.hip.rotation.x = hipAngle;
    limb.knee.rotation.x = kneeAngle;
    limb.ankle.rotation.x = -hipAngle - kneeAngle;
  }

  /** distance is world units travelled THIS frame; omitted distance retains timed playback.
   * A footfall reports the latest landing if an unusually large frame crosses multiple steps.
   */
  function update(time, dt, state = {}) {
    if (disposed) return { footfall: false, foot: 'left' };
    const delta = Math.min(Math.max(dt || 0, 0), 0.1);
    const active = Boolean(state.moving);
    movement += ((active ? 1 : 0) - movement) * (1 - Math.exp(-delta * 13));
    const hasDistance = state.distance !== undefined;
    const distance = Number.isFinite(state.distance) ? Math.max(0, state.distance) : 0;
    const advance = hasDistance
      ? (active ? distance * fullTurn / gaitLength : 0)
      : (active || movement > 0.02 ? delta * 9.1 : 0);
    const previousStep = Math.floor(stride / Math.PI);
    const nextStride = stride + advance;
    const nextStep = Math.floor(nextStride / Math.PI);
    const footfall = active && !state.sliding && movement > 0.1 && advance > 0 && nextStep > previousStep;
    const foot = nextStep % 2 === 0 ? 'left' : 'right';
    stride = nextStride % fullTurn;
    const phase = Math.cos(stride);
    const secondary = Math.sin(stride);
    // Bob the pelvis through the legs instead of lifting the complete rig off the floor.
    rig.position.y = 0;
    const bodyOffset = (-0.03 + Math.cos(stride * 2) * 0.008) * movement;
    hips.position.y = 0.36 + bodyOffset;
    hips.rotation.y = phase * 0.025 * movement;
    torso.position.y = 0.40 + bodyOffset;
    headPivot.position.y = 0.76 + bodyOffset * 0.75;
    satchel.position.y = 0.387 + bodyOffset;
    torso.rotation.x = 0.035 * movement;
    torso.rotation.y = phase * 0.055 * movement;
    torso.rotation.z = -phase * 0.023 * movement;
    torso.scale.y = 1 + Math.sin(time * 2) * 0.009 * (1 - movement);
    placeLeg(leftLeg, stride / fullTurn);
    placeLeg(rightLeg, (stride / fullTurn + 0.5) % 1);
    leftArm.shoulder.rotation.x = -0.075 + phase * 0.53 * movement;
    leftArm.shoulder.rotation.z = -0.08;
    leftArm.elbow.rotation.x = -0.12 - Math.max(0, -phase) * 0.23 * movement;
    rightArm.shoulder.rotation.x = -1.02 - phase * 0.11 * movement;
    rightArm.shoulder.rotation.z = 0.34;
    rightArm.elbow.rotation.x = -0.48 + phase * 0.075 * movement;
    if(state.sliding) {
      // Planted feet and a balancing arm distinguish gliding from running.
      placeLeg(leftLeg,.18);placeLeg(rightLeg,.68);
      torso.rotation.x=-.10;torso.rotation.z=Math.sin(time*3)*.028;
      leftArm.shoulder.rotation.x=-.23;leftArm.shoulder.rotation.z=-.55;
      rightArm.shoulder.rotation.z=.55;
    }
    // Whatever is equipped stays upright in the fist as the arm swings.
    lightSlot.rotation.x = -(rightArm.shoulder.rotation.x + rightArm.elbow.rotation.x) + Math.sin(time * 2.4) * 0.025;
    lightSlot.rotation.z = -rightArm.shoulder.rotation.z - 0.05 + secondary * 0.035 * movement;
    satchel.rotation.x = phase * 0.12 * movement;
    satchel.rotation.z = -0.04 + secondary * 0.065 * movement;
    headPivot.rotation.y = Math.sin(time * 0.75) * 0.035 * (1 - movement) - phase * 0.022 * movement;
    headPivot.rotation.z = -phase * 0.014 * movement;
    if (blinkAt === null) blinkAt = time + 3.4;
    if (time >= blinkAt) { blinkUntil = time + 0.13; blinkAt = time + 3.6 + Math.abs(Math.sin(time)) * 2; }
    headMaterials[4] = time < blinkUntil ? faceBlink : faceOpen;
    const flicker = Math.sin(time * 19) * 0.065 + Math.sin(time * 31.7) * 0.04;
    const flame = worn.light?.flame;
    if (flame) {
      flame.scale.set(0.78 + flicker * 0.3, 0.85 + flicker, 0.78 + flicker * 0.3);
      flame.rotation.z = Math.sin(time * 7.5) * 0.065;
      flame.rotation.y = Math.sin(time * 3.2) * 0.13;
    }
    if (worn.light?.light) worn.light.light.intensity = Math.min(2.1, 1.45 + flicker * 3);
    worn.light?.embers.forEach((ember, index) => {
      ember.mesh.position.y = 0.185 + index * 0.01 + ((time * ember.drift + index * 0.045) % ember.span);
      ember.mesh.position.x = Math.sin(time * (5 - index)) * ember.sway;
      if (index) ember.mesh.visible = Math.sin(time * 4.3) > -0.25;
    });
    worn.cape?.animate?.(time);
    worn.hat?.animate?.(time);
    worn.light?.animate?.(time);
    // A familiar trails behind when Lumen sets off, then catches up when he stops.
    const petSpec = worn.pet?.spec || {};
    petLag += (movement - petLag) * (1 - Math.exp(-delta * 3.4));
    const home = petSpec.home || [-.62, 0, -.16];
    const hover = petSpec.ground ? 0 : .34 + Math.sin(time * 1.5) * .035;
    petAnchor.position.set(
      home[0] + Math.sin(time * .7) * .035 * (1 - movement),
      home[1] + hover,
      home[2] - petLag * .34 + Math.sin(time * .9) * .02 * (1 - movement));
    petAnchor.rotation.y = Math.sin(time * .5) * .16 * (1 - movement) - petLag * .1;
    petAnchor.rotation.z = petSpec.ground ? 0 : Math.sin(time * 1.2) * .05;
    worn.pet?.animate?.(time, { moving: movement > .12, speed: movement, footfall, dt: delta, danger: state.danger, interest: state.interest, look: state.look });
    worn.aura?.animate?.(time);
    worn.portal?.animate?.(time);
    if(effectWorld){root.getWorldPosition(effectPosition);effectWorld.worldToLocal(effectPosition);}else effectPosition.set(0,0,0);
    worn.trail?.animate?.(time,{footfall,position:effectPosition,showcase:!effectWorld});
    return { footfall, foot };
  }
  function wear() {
    for (const repaint of repaints) repaint();
    shirt.color.set(look.coat.shirt);
    for (const slot of GEAR_SLOTS) fit(slot);
  }
  wear();
  update(0, 0, { moving: false, progress: 0 });
  return {
    root,
    update,
    react(kind) { if (!disposed) worn.pet?.spec?.react?.(kind); },
    /** Swap the equipped cosmetics without touching the rig or its animation. */
    setStyle(next) {
      if (disposed) return;
      look = resolveLook(next);
      wear();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const piece of Object.values(worn)) piece?.dispose();
      root.removeFromParent();
      geometry.dispose();
      materials.forEach(material => material.dispose());
      textures.forEach(texture => texture.dispose());
      root.clear();
    },
  };
}
