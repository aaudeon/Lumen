/** One temporary renderer photographs only the visible page, then releases its context. */
import * as THREE from 'three';
import { buildGear } from './gear.js';
import { createExplorer } from './explorer.js';
import { DEFAULT_LOOK, resolveLook } from './cosmetics.js';
const images=new Map();
export function photographItems(items) {
  const missing=items.filter(item=>!images.has(item.id));
  if(!missing.length)return Object.fromEntries(items.map(item=>[item.id,images.get(item.id)]));
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
  renderer.setSize(192,144);renderer.setPixelRatio(1);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,192/144,.01,30);
  scene.add(new THREE.HemisphereLight(0xe0eaf2,0x474152,2));
  const key=new THREE.DirectionalLight(0xffe7c6,3);key.position.set(-2,3,4);scene.add(key);
  try {
    for(const item of missing) {
      if(!Object.keys(item.palette).length){images.set(item.id,null);continue;}
      const look=resolveLook({...DEFAULT_LOOK,[item.slot]:item.id});
      const piece=item.slot==='coat'?createExplorer({THREE,style:{...DEFAULT_LOOK,coat:item.id}}):buildGear({THREE,slot:item.slot,palette:look[item.slot]});
      try {
        scene.add(piece.root);
        if(item.slot==='trail')piece.animate?.(1,{footfall:true,position:new THREE.Vector3()});
        else {piece.animate?.(1);piece.update?.(1,.016,{moving:false});}
        const bounds=new THREE.Box3().setFromObject(piece.root),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
        const span=Math.max(size.y,size.x/camera.aspect,size.z,.12);
        camera.position.copy(center).add(new THREE.Vector3(item.slot==='cape'?-.25:.24,.15,item.slot==='cape'?-1:1).normalize().multiplyScalar(span*2.35));
        if(item.slot==='aura'||item.slot==='trail')camera.position.copy(center).add(new THREE.Vector3(.15,span*1.9,span*1.1));
        camera.lookAt(center);renderer.render(scene,camera);
        images.set(item.id,renderer.domElement.toDataURL('image/png'));
      } finally {piece.dispose();}
    }
  } finally {renderer.dispose();renderer.forceContextLoss();}
  return Object.fromEntries(items.map(item=>[item.id,images.get(item.id)]));
}
