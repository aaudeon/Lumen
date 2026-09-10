/** Snowy peaks and aurora curtains, kept outside the playable square. */
export function buildBorealEnvironment(THREE, parent) {
  const group=new THREE.Group();group.name='boreal-environment';parent.add(group);
  const geometries=new Set(),materials=new Set(),animate=[];
  const geo=value=>(geometries.add(value),value);
  const mat=value=>(materials.add(value),value);
  const stone=mat(new THREE.MeshStandardMaterial({color:0x547992,roughness:.82,flatShading:true}));
  const snow=mat(new THREE.MeshStandardMaterial({color:0xe9f5f5,roughness:.86,flatShading:true}));
  const ice=mat(new THREE.MeshStandardMaterial({color:0x7ccfdd,metalness:.2,roughness:.18,emissive:0x265b79,emissiveIntensity:.24,flatShading:true}));
  const peak=geo(new THREE.ConeGeometry(1,1,4)),box=geo(new THREE.BoxGeometry(1,1,1));
  function mesh(shape,surface,position,scale){const m=new THREE.Mesh(shape,surface);m.position.set(...position);m.scale.set(...scale);m.castShadow=m.receiveShadow=true;group.add(m);return m;}
  // A range beyond the northern edge, with snow caps and blue glacial faces.
  for(let i=0;i<7;i++) {
    const x=-4.8+i*1.6,h=1.3+(i%3)*.53,z=-4.35-(i%2)*.35;
    mesh(peak,stone,[x,h/2-.9,z],[.95,h,1.0]).rotation.y=Math.PI/4;
    mesh(peak,snow,[x,h*.81-.9,z],[.42,h*.4,.44]).rotation.y=Math.PI/4;
    mesh(box,ice,[x+.17,-.85,z+.64],[.5,.25,.65]);
  }
  for(let side of [-1,1]) for(let i=0;i<4;i++) {
    const shard=mesh(peak,ice,[side*(3.55+(i%2)*.3),-.37,-1.8+i*1.3],[.29,.9+(i%3)*.27,.34]);
    shard.rotation.z=-side*.16;
    mesh(box,snow,[side*3.55,-.76,-1.8+i*1.3],[.75,.12,.66]);
  }
  const lake=mat(new THREE.MeshStandardMaterial({color:0x214861,roughness:.23,metalness:.45,transparent:true,opacity:.7}));
  mesh(geo(new THREE.CylinderGeometry(4.3,4.6,.06,12)),lake,[0,-1.62,0],[1,1,1]);
  // A northern-light ribbon is translucent and never crosses the tile silhouettes.
  const curtain=mat(new THREE.ShaderMaterial({
    uniforms:{time:{value:0}},transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    vertexShader:`uniform float time;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.z+=sin(p.x*.8+time*.24)*.35;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`uniform float time;varying vec2 vUv;void main(){float wave=sin(vUv.x*11.+time*.24)*.1;float h=vUv.y-wave;
      float veil=smoothstep(.02,.25,h)*(1.-smoothstep(.3,.94,h));float rays=.62+.38*sin(vUv.x*175.+sin(vUv.x*24.+time*.3));
      vec3 color=mix(vec3(.14,.8,.62),vec3(.47,.25,.8),smoothstep(.16,.7,h));
      gl_FragColor=vec4(color,veil*rays*.3*sin(vUv.x*3.14159));}`,
  }));
  mesh(geo(new THREE.PlaneGeometry(11,2.8,48,1)),curtain,[0,2.5,-5.2],[1,1,1]).castShadow=false;
  animate.push(t=>{curtain.uniforms.time.value=t;});
  const count=100,positions=new Float32Array(count*3);
  const flakes=geo(new THREE.BufferGeometry());flakes.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const snowMaterial=mat(new THREE.PointsMaterial({color:0xe2f4ff,size:.035,transparent:true,opacity:.7,depthWrite:false}));
  const snowfall=new THREE.Points(flakes,snowMaterial);snowfall.frustumCulled=false;group.add(snowfall);
  animate.push(t=>{for(let i=0;i<count;i++) {
    positions[i*3]=((i*.731+t*.07)%9)-4.5;
    positions[i*3+1]=3.8-((t*(.22+(i%4)*.035)+i*.313)%5.1);
    positions[i*3+2]=((i*1.317)%8.5)-4.25;
  }flakes.attributes.position.needsUpdate=true;});
  const light=new THREE.PointLight(0x80f4d4,3.5,11,2);light.position.set(0,2,-4);group.add(light);
  let disposed=false;
  return {group,animate,dispose(){if(disposed)return;disposed=true;group.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());group.clear();}};
}
