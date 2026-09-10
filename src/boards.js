import { buildBorealBoard, buildBorealTile } from './boreal-board.js';
/** Physical proportions and architectural identities; puzzle connectivity remains orthogonal. */
const profiles = {
  banquise: ['boreal','Terrasses du lac miroir','lake',1.18,.94,0],
  aiguilles: ['boreal','Défilé des aiguilles','needles',.93,1.18,1],
  refuge: ['boreal','Parvis des veilleurs','refuge',1.12,1.03,2],
  seracs: ['boreal','Crevasse des séracs','seracs',.98,1.16,3],
  aurore: ['boreal','Couronne des aurores','crown',1.19,1.08,4],
  aube: ['jungle','Cour des racines','terrace',1,1,0],
  jardins: ['jungle','Jardins en terrasses','terrace',1.18,.91,1],
  brumes: ['jungle','Ruines des lianes','roots',.93,1.14,2],
  canopee: ['jungle','Temple suspendu','temple',1.1,1.04,3],
  relais: ['jungle','Passage des géants','roots',.92,1.2,4],
  lagon: ['atlantis','Parvis de nacre','rotunda',1.19,.93,0],
  marees: ['atlantis','Aqueduc des marées','aqueduct',1.22,.89,1],
  corail: ['atlantis','Jardin de corail','reef',.94,1.12,2],
  abysses: ['atlantis','Terrasses des archives','aqueduct',1.09,1.1,3],
  trident: ['atlantis','Rotonde du trident','rotunda',1.17,1.05,4],
  cendres: ['volcano','Îlot de basalte','basalt',1.03,.93,0],
  braises: ['volcano','Éperon des braises','chasm',.89,1.18,1],
  obsidienne: ['volcano','Aiguilles d’obsidienne','needles',.98,1.12,2],
  forge: ['volcano','Enclume des anciens','forge',1.2,.94,3],
  caldera: ['volcano','Couronne de la caldeira','caldera',1.14,1.13,4],
  gardiens: ['jungle','Mare des gardiens','roots',1.06,.97,0],
  sentinelle: ['jungle','Ronde des lianes','terrace',.95,1.16,1],
  sceaux: ['jungle','Sanctuaire scellé','temple',1.13,.96,2],
  contrepoids: ['jungle','Salle du contrepoids','temple',1.02,1.08,3],
  vigie: ['jungle','Poste de la vigie','roots',1.16,1.02,4],
  reflux: ['atlantis','Bassin du reflux','reef',1.11,.95,1],
  estran: ['atlantis','Terrasses de l’estran','aqueduct',.96,1.15,3],
  fissures: ['volcano','Faille naissante','chasm',1.05,.98,2],
  sacrifice: ['volcano','Pont sacrifié','needles',1.09,1.09,4],
};
export function getBoardProfile(id) {
  const [biome,name,structure,sx,sz,variant] = profiles[id] || profiles.aube;
  return { id:id in profiles ? id : 'aube',biome,name,structure,sx,sz,variant };
}

function workshop(THREE, parent) {
  const root=new THREE.Group();parent?.add(root);
  const geometries=new Set(),materials=new Set(),animations=[];
  const geo=g=>{geometries.add(g);return g;};
  const box=geo(new THREE.BoxGeometry(1,1,1));
  const rock=geo(new THREE.DodecahedronGeometry(1,0));
  const column=geo(new THREE.CylinderGeometry(1,1,1,6));
  const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.88,...extra});materials.add(m);return m;};
  function mesh(shape,surface,x,y,z,sx=1,sy=1,sz=1) {
    const item=new THREE.Mesh(shape,surface);item.position.set(x,y,z);item.scale.set(sx,sy,sz);
    item.castShadow=item.receiveShadow=true;root.add(item);return item;
  }
  function beam(surface,from,to,r=.045) {
    const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),delta=b.clone().sub(a);
    const item=mesh(column,surface,...a.add(b).multiplyScalar(.5).toArray(),r,delta.length(),r);
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return item;
  }
  let disposed=false;
  return {THREE,root,geo,box,rock,column,mat,mesh,beam,animations,
    update(time){animations.forEach(update=>update(time));},
    dispose(){if(disposed)return;disposed=true;root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.clear();},
  };
}

export function createBoardStructure({THREE,world,textures}) {
  let current=null;
  return {
    setProfile(profile) {
      current?.dispose();
      const kit=workshop(THREE,world);current=kit;
      const {root,geo,box,rock,column,mat,mesh,beam,animations}=kit;
      root.name=`architecture-${profile.id}`;
      root.scale.set(profile.sx,1,profile.sz);
      const {biome,variant,structure}=profile;
      const maps=textures.get(biome,variant);
      const stone=mat(biome==='jungle'?0xaab592:biome==='atlantis'?0xc8e4e0:0x777581,{map:maps.edge});
      const top=mat(0xffffff,{map:maps.top});
      const trim=mat(biome==='jungle'?0xc9b686:biome==='atlantis'?0xe5d3a2:0x9b7770,{metalness:.15});
      const dark=mat(biome==='jungle'?0x4d5c35:biome==='atlantis'?0x254e68:0x272735);
      const accent=mat(biome==='jungle'?0x688446:biome==='atlantis'?0x64cdd4:0xdc8245,
        {emissive:biome==='volcano'?0x8a250b:0x10352c,emissiveIntensity:.18});

      if(biome==='boreal') {
        buildBorealBoard(kit,profile,maps);
      } else if(biome==='jungle') {
        // Offset retaining walls and hanging roots replace the perfectly square plinth.
        for(let row=0;row<4;row++) {
          const z=(row-1.5)*1.34,overhang=(row+variant)%3*.15;
          mesh(box,stone,(row%2?1:-1)*.09,-.22,z,5.52+overhang,.38,1.32);
          mesh(box,dark,-.11,-.59,z,5.19,.34,1.2);
          for(let side of [-1,1]) {
            const boulder=mesh(rock,stone,side*(2.63+overhang*.3),-.63,z,.45,.5+(row%2)*.23,.51);
            boulder.rotation.set(.12*row,row*.7,.15*side);
          }
        }
        for(let i=0;i<7;i++) {
          const x=-2.42+i*.8,y=-.65-(i%3)*.25;
          mesh(rock,dark,x,y,Math.sin(i*4.7)*1.9,.73,.6,.77);
          const z=i%2?2.72:-2.73;
          beam(dark,[x,.04,z],[x+.12,-.62,z+.09],.08);
          beam(accent,[x+.12,-.62,z+.09],[x-.18,-1.29-(i%3)*.12,z+.17],.037);
        }
        // Small outdoor steps, separate from the playable surface.
        for(let i=0;i<3;i++) mesh(box,stone,-.5+i*.04,-.23-i*.19,2.84+i*.2,1.14-i*.16,.2,.34);
        for(let i=0;i<5;i++) {
          const x=-2.4+i*1.17,z=-2.91-(i%2)*.14;
          mesh(box,top,x,-.03,z,.85,.13,.55);
          for(let j=0;j<3;j++) {
            const leaf=mesh(rock,accent,x+(j-1)*.2,.06+j*.028,z,.2,.10,.29);leaf.rotation.y=i+j;
          }
        }
        if(structure==='temple' || structure==='roots') {
          const h=structure==='temple'?1.45:.83;
          for(const x of [-1.1,1.1]) {
            mesh(box,stone,x,h/2-.1,-3.13,.36,h,.38);
            mesh(box,trim,x,h-.04,-3.13,.58,.15,.62);
          }
          if(structure==='temple') {mesh(box,stone,0,h+.06,-3.13,2.88,.26,.59);mesh(box,trim,0,h+.25,-3.13,2.42,.12,.46);}
          else beam(dark,[-1.15,.53,-3.14],[1.21,.86,-3.2],.16);
        }
      } else if(biome==='atlantis') {
        // Circular masonry beneath four terraces: a sunken rotunda rather than an island of bricks.
        const disk=geo(new THREE.CylinderGeometry(3.08,3.25,.28,48));
        mesh(disk,stone,0,-.45,0,1,1,1);
        mesh(geo(new THREE.CylinderGeometry(3.2,3.2,.06,48)),trim,0,-.29,0);
        for(let row=0;row<4;row++) {
          mesh(box,stone,0,-.14,(row-1.5)*1.34,5.43,.3,1.3);
          mesh(box,trim,0,-.12,(row-1.5)*1.34+.64,5.57,.05,.035);
        }
        // A ring of broken outer stairs and tiled balconies leaves the silhouette open.
        for(let i=0;i<10;i++) {
          const angle=i*Math.PI/5+(variant%2)*.11;
          const radius=3.02+(i%2)*.13;
          if(Math.abs(Math.cos(angle))>.9 && Math.abs(Math.sin(angle))<.4)continue;
          const landing=mesh(box,top,Math.cos(angle)*radius,-.28-(i%3)*.13,Math.sin(angle)*radius,.95,.19,.65);
          landing.rotation.y=-angle+Math.PI/2;
        }
        const arch=geo(new THREE.TorusGeometry(.57,.115,6,20,Math.PI));
        const count=structure==='aqueduct'?3:2;
        for(let i=0;i<count;i++) {
          const x=-1.42+i*1.35,z=-3.19,h=structure==='aqueduct'?.92:.67;
          for(let side of [-1,1]) mesh(column,stone,x+side*.57,h/2-.12,z,.13,h,.13);
          mesh(arch,trim,x,h-.12,z);
          if(structure==='aqueduct') mesh(box,top,x,h+.53,z,1.42,.18,.5);
        }
        // Falling water at terrace edges, animated by material opacity.
        const water=mat(0x5adddd,{transparent:true,opacity:.28,depthWrite:false,emissive:0x168596,emissiveIntensity:.35,side:THREE.DoubleSide});
        for(let i=0;i<4;i++) {
          const x=i%2?2.77:-2.77,z=-1.1+Math.floor(i/2)*2.1;
          mesh(box,water,x,-.85,z,.035,1.25,.36+(i%2)*.14).castShadow=false;
        }
        animations.push(t=>{water.opacity=.25+Math.sin(t*1.3)*.065;});
        const coral=mat(variant%2?0xdf9a91:0xca82b1);
        for(let i=0;i<(structure==='reef'?12:6);i++) {
          const a=i*2.4,r=3.17;
          for(let j=0;j<3;j++) beam(coral,[Math.cos(a)*r,-.43,Math.sin(a)*r],
            [Math.cos(a)*r+Math.sin(j*2.4)*.16,.01+j*.13,Math.sin(a)*r+Math.cos(j*2.4)*.15],.04);
        }
      } else {
        // Each cell rests on a different basalt column; there is no continuous square base.
        const hex=geo(new THREE.CylinderGeometry(.78,.7,1,6));
        for(let i=0;i<16;i++) {
          const height=.71+((i*7+variant)%5)*.15;
          const pillar=mesh(hex,i%3?stone:dark,(i%4-1.5)*1.34,-height/2-.055,(Math.floor(i/4)-1.5)*1.34,1,height,1);
          pillar.rotation.y=Math.PI/6;
          if(i%3===0) mesh(hex,accent,pillar.position.x,-height*.68,pillar.position.z,1.013,.036,1.013);
        }
        const glow=mat(0xffae69,{emissive:0xf65a18,emissiveIntensity:1.8,toneMapped:false});
        for(let i=0;i<9;i++) {
          const a=i*2.4+variant*.3,r=2.87+(i%2)*.19,h=.3+(i%3)*.19;
          const peak=mesh(geo(new THREE.ConeGeometry(.28,h,5)),dark,Math.cos(a)*r,-.03+h/2,Math.sin(a)*r);peak.rotation.z=Math.sin(a)*.18;
          mesh(rock,glow,Math.cos(a)*r,-.42,Math.sin(a)*r,.055,.13,.06);
        }
        if(structure==='forge') {
          for(const x of [-2.86,2.86]) for(let i=0;i<7;i++) {
            const link=mesh(geo(new THREE.TorusGeometry(.075,.023,5,10)),trim,x,-.18-i*.13,-1.09);link.rotation.y=i%2?Math.PI/2:0;
          }
          mesh(box,dark,0,.26,-3.13,1.75,.36,.7);
          mesh(box,trim,0,.5,-3.13,2.21,.15,.91);
          mesh(box,glow,0,.31,-2.76,1.32,.13,.02);
        }
        if(structure==='chasm' || structure==='needles') {
          for(const side of [-1,1]) for(let i=0;i<4;i++) {
            const h=.6+i*.17;
            const shard=mesh(geo(new THREE.ConeGeometry(.33,h,4)),stone,side*(2.84+i*.075),h/2-.27,-1.4+i*.87);
            shard.rotation.z=-side*.16;
          }
        }
        if(structure==='caldera') {
          for(let i=0;i<15;i++) {
            const a=i*Math.PI*2/15,r=3.29,h=.28+(i%3)*.13;
            mesh(column,i%3?dark:stone,Math.cos(a)*r,-.31,Math.sin(a)*r,.24,h,.24);
          }
        }
        // Restrained fumaroles sit outside the grid and drift upwards.
        const smoke=mat(0xc2b2ad,{transparent:true,opacity:.13,depthWrite:false});
        for(let i=0;i<5;i++) {
          const puff=mesh(rock,smoke,-2.91+(i%2)*5.85,.22,-1.52+(i%3)*1.13,.13,.15,.13);
          puff.castShadow=puff.receiveShadow=false;
          animations.push(t=>{const p=(t*.21+i*.23)%1;puff.position.y=.1+p*1.1;puff.scale.setScalar(.06+p*.16);});
        }
      }
    },
    update(time){current?.update(time);},
    dispose(){current?.dispose();current=null;},
  };
}

/** Small props travel with their tile; the central path and its four connections stay clear. */
export function createTileScenery({THREE,tile,profile}) {
  const kit=workshop(THREE);
  const {root,geo,box,rock,column,mat,mesh,beam}=kit;
  root.name='tile-details';
  const seed=[...tile.id].reduce((n,c)=>n+c.charCodeAt(0),0),v=seed%3;
  const solid=tile.ports.length===0;
  const {biome}=profile;
  if(tile.hazard) return kit;
  if(biome==='boreal') {buildBorealTile(kit,solid,v);return kit;}
  if(biome==='jungle') {
    const leaf=mat(v===0?0x809943:0x4f773d),stone=mat(0x8a9d73),earth=mat(0x5e6138);
    // Three different ruins, so a row of blank stones never reads as a row of faces.
    if(solid && v===0) {
      // A cairn left by earlier travellers; no two stones sit square to the next.
      let height=.06;
      [[.36,.15,.33],[.29,.13,.26],[.19,.11,.18]].forEach(([w,h,d],i)=>{
        mesh(box,stone,i%2?.04:-.035,height+h/2,i*.012,w,h,d).rotation.y=.24+i*.5;
        height+=h;
      });
      mesh(rock,leaf,-.09,height+.02,-.05,.12,.05,.1);
    } else if(solid && v===1) {
      // A carved stele, its grooves worn vertical by the rain.
      mesh(box,stone,0,.22,0,.3,.44,.17);
      mesh(box,stone,.015,.46,0,.24,.07,.14);
      for(const x of [-.08,0,.08]) mesh(box,earth,x,.24,.088,.025,.3,.015);
      mesh(rock,leaf,-.11,.5,-.03,.11,.05,.09);
    } else if(solid) {
      // A boulder the forest has nearly finished swallowing.
      mesh(rock,stone,0,.16,0,.37,.3,.35).rotation.set(.28,.9,.19);
      for(let i=0;i<3;i++) {
        mesh(rock,leaf,Math.cos(i*2.1)*.15,.25+(i%2)*.04,Math.sin(i*2.1)*.14,.15,.06,.13).rotation.y=i*1.7;
      }
    }
    for(let i=0;i<3;i++) {
      const x=v===1?-.45:.45,z=-.43+i*.025;
      const frond=mesh(rock,leaf,x+(i-1)*.055,.07+i*.015,z,.065,.033,.16);
      frond.rotation.y=(i-1)*.7+v;
    }
  } else if(biome==='atlantis') {
    const ivory=mat(0xf1dcb7),coral=mat(v?0xce8fb5:0xe4b583),blue=mat(0x6dacc0);
    if(solid && v!==1) {
      mesh(column,ivory,0,.19,0,.16,.24,.16);
      const capital=mesh(box,blue,.015,.335,0,.37,.07,.33);capital.rotation.y=.12;
    } else if(solid) {
      for(let i=0;i<4;i++)beam(coral,[0,.04,0],[Math.cos(i*2.4)*.21,.19+i*.045,Math.sin(i*2.4)*.18],.035);
    }
    const shell=mesh(geo(new THREE.SphereGeometry(1,8,6,0,Math.PI)),ivory,-.44,.064,.43,.095,.06,.065);shell.rotation.x=-Math.PI/2;
    mesh(rock,blue,.45,.068,-.45,.046,.035,.048);
  } else {
    const dark=mat(v?0x33374b:0x555065,{metalness:.25,roughness:.42}),metal=mat(0xaa8265);
    if(solid) for(let i=0;i<3;i++) {
      const shard=mesh(geo(new THREE.ConeGeometry(.105,.28+i*.085,4)),dark,(i-1)*.12,.2+i*.023,(i%2)*.08);
      shard.rotation.z=(i-1)*.22;
    }
    for(const sign of [-1,1]) {
      const rivet=mesh(box,metal,sign*.47,.064,-sign*.47,.105,.03,.105);rivet.rotation.y=Math.PI/4;
    }
  }
  return kit;
}
