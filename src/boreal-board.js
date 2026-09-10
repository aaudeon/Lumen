/** Northern masonry: each passage has a different silhouette below the grid. */
export function buildBorealBoard(kit,profile,maps) {
  const {geo,box,column,mat,mesh,beam}=kit;
  const stone=mat(0x64859c,{map:maps.edge}),snow=mat(0xebf2ea),ice=mat(0x8bcfdf,{roughness:.25,metalness:.24});
  const wood=mat(0x67565a),gold=mat(0xd4bd88,{metalness:.45});
  const {structure,variant}=profile;
  for(let i=0;i<16;i++) {
    const x=(i%4-1.5)*1.34,z=(Math.floor(i/4)-1.5)*1.34;
    const h=structure==='seracs' ? .75+(i%4)*.17 : .45+((i+variant)%3)*.13;
    mesh(box,stone,x,-h/2-.08,z,1.27,h,1.27);
    if(structure==='seracs')mesh(column,ice,x,-h-.22,z,.27,.62,.29);
  }
  if(structure==='lake'||structure==='refuge') {
    for(let row=0;row<4;row++)mesh(box,ice,(row%2-.5)*.15,-.7,(row-1.5)*1.34,5.7,.2,1.3);
    for(let i=0;i<3;i++)mesh(box,snow,-1.0,-.15-i*.15,2.87+i*.23,1.1-i*.15,.13,.37);
  }
  if(structure==='needles'||structure==='seracs') {
    for(const side of [-1,1])for(let i=0;i<5;i++) {
      const shard=mesh(geo(new kit.THREE.ConeGeometry(.2,.65+i*.12,4)),ice,side*2.88,.1,-2+i*1.0);
      shard.rotation.z=-side*.15;
    }
  }
  if(structure==='refuge') {
    for(const x of [-.9,.9]) {mesh(box,wood,x,.56,-3.12,.19,1.3,.23);mesh(box,snow,x,1.24,-3.12,.27,.12,.29);}
    const roof=mesh(box,wood,0,1.31,-3.12,2.45,.16,.82);roof.rotation.z=.06;
    mesh(box,snow,0,1.42,-3.12,2.52,.08,.87).rotation.z=.06;
    mesh(box,gold,0,1.10,-2.85,.11,.27,.1);
  } else if(structure==='crown') {
    const arch=geo(new kit.THREE.TorusGeometry(.84,.12,4,16,Math.PI));
    for(const x of [-.84,.84])mesh(box,stone,x,.36,-3.1,.25,.94,.36);
    mesh(arch,ice,0,.82,-3.1);
    for(let i=0;i<7;i++)mesh(box,snow,-2.8+i*.94,-.24,-2.91,.65,.12,.49);
    mesh(box,gold,0,1.75,-3.1,.15,.26,.15).rotation.z=Math.PI/4;
  }
  // Icicles and a snow cornice overhang the edge, never a puzzle connection.
  for(let i=0;i<12;i++) {
    const side=i<6?-1:1,z=-2.55+(i%6)*1.01,x=side*2.75;
    mesh(box,snow,x,-.04,z,.25,.12,.73);
    const icicle=mesh(geo(new kit.THREE.ConeGeometry(.07,.35+(i%3)*.12,4)),ice,x,-.42,z);
    icicle.rotation.z=Math.PI;
  }
}

export function buildBorealTile(kit,solid,variant) {
  const {geo,box,mat,mesh}=kit;
  const snow=mat(0xe8f3ed),ice=mat(0x83bdd5,{roughness:.2,metalness:.2}),stone=mat(0x566d83);
  if(solid) {
    if(variant===1){mesh(box,stone,0,.22,0,.35,.43,.23);mesh(box,snow,0,.47,0,.4,.07,.28);}
    else for(let i=0;i<3;i++) {const m=mesh(geo(new kit.THREE.ConeGeometry(.12,.25+i*.09,4)),ice,(i-1)*.13,.18,(i%2)*.1);m.rotation.z=(1-i)*.18;}
  }
  for(const side of [-1,1])mesh(box,snow,side*.46,.047,-side*.45,.18,.036,.16);
}
