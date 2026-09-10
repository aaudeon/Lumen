/** Six authored silhouette families, reused by the live rig and catalogue photographs. */
export function buildFantasy(tools, root, slot, palette, flameOf) {
  const {THREE,geo,box,mat,glow,part}=tools;
  const theme=palette.theme;
  const main=mat(palette.primary),trim=mat(palette.secondary,{metalness:.22,roughness:.55}),shine=glow(palette.accent);
  const orb=geo(new THREE.SphereGeometry(1,12,8));
  const cone=geo(new THREE.ConeGeometry(1,1,8));
  const ring=(r,t=.013)=>geo(new THREE.TorusGeometry(r,t,6,32));
  const cylinder=(r,h)=>geo(new THREE.CylinderGeometry(r,r,h,12));
  const p=(g,m,x,y,z,sx=1,sy=sx,sz=sx,parent=root)=>part(parent,g,m,[x,y,z],[sx,sy,sz]);
  function polygon(points,depth=.018) {
    const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
    return geo(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false}));
  }
  function star(radius=.08) {
    return polygon(Array.from({length:10},(_,i)=>{const a=Math.PI/2+i*Math.PI/5,r=i%2?radius*.43:radius;return[Math.cos(a)*r,Math.sin(a)*r];}));
  }
  function cog(radius=.1) {
    return polygon(Array.from({length:32},(_,i)=>{const a=i*Math.PI/16,r=i%4<2?radius:radius*.79;return[Math.cos(a)*r,Math.sin(a)*r];}));
  }
  function heart() {return polygon([[-.08,.035],[-.08,.08],[-.025,.08],[0,.055],[.025,.08],[.08,.08],[.08,.035],[.06,0],[0,-.065],[-.06,0]]);}
  function membrane(side,dragon=false) {
    const shape=polygon(dragon?[[0,.2],[side*.36,.31],[side*.5,.12],[side*.37,.03],[side*.32,-.13],[side*.19,-.06],[0,-.18]]:
      [[0,.18],[side*.29,.35],[side*.48,.28],[side*.47,.10],[side*.22,-.08],[side*.36,-.19],[side*.18,-.25],[0,-.15]],.022);
    const wing=p(shape,trim,side*.035,.005,-.288);wing.name='cape-panel';
    p(box,main,side*.13,.01,-.304,.07,.43,.026).rotation.z=-side*.38;
    p(star(.026),shine,side*.26,.16,-.313);
    return wing;
  }

  if(slot==='hat') {
    const band=p(ring(.18,.025),trim,0,.157,0);band.rotation.x=Math.PI/2;
    if(theme==='faerie') {
      p(orb,main,0,.18,0,.17,.07,.15);
      p(cone,shine,0,.32,.015,.065,.26,.065).rotation.x=.12;
      for(let i=0;i<4;i++)p(ring(.044-i*.009,.004),trim,0,.29+i*.035,.018).rotation.x=Math.PI/2;
      for(const s of [-1,1]) {p(cone,trim,s*.13,.25,0,.055,.17,.045).rotation.z=-s*.24;p(star(.035),main,s*.135,.17,.135);}
    } else if(theme==='astral') {
      p(box,main,0,.18,0,.32,.045,.28);
      const moon=geo(new THREE.TorusGeometry(.11,.025,6,24,Math.PI*1.45));
      p(moon,shine,0,.34,.02).rotation.z=-.75;
      for(const s of [-1,1])p(star(.045),trim,s*.17,.25,.02);
    } else if(theme==='dragon') {
      p(orb,main,0,.175,0,.18,.085,.16);
      for(const s of [-1,1]) {
        p(cone,trim,s*.18,.28,-.04,.065,.23,.075).rotation.z=-s*.48;
        p(cone,shine,s*.245,.40,-.065,.028,.13,.035).rotation.z=-s*.12;
      }
      p(cone,shine,0,.25,.10,.055,.11,.06);
    } else if(theme==='clockwork') {
      p(orb,main,0,.16,-.015,.18,.14,.16);
      for(const s of [-1,1]) {p(ring(.067,.016),trim,s*.084,.12,.172);p(cylinder(.052,.013),shine,s*.084,.12,.17).rotation.x=Math.PI/2;}
      p(box,trim,-.18,.28,-.025,.018,.19,.018);p(orb,shine,-.18,.38,-.025,.035);
    } else if(theme==='corsair') {
      p(orb,main,0,.20,0,.18,.09,.16);
      const brim=polygon([[-.29,.13],[-.21,.28],[0,.18],[.21,.28],[.29,.13],[0,.10]],.12);
      p(brim,main,0,0,.02);p(star(.04),shine,0,.18,.15);
      for(const s of [-1,1])p(box,trim,s*.21,.22,.03,.022,.15,.15).rotation.z=-s*.7;
    } else {
      p(orb,main,0,.17,-.015,.18,.085,.16);
      for(const s of [-1,1]) {p(cone,trim,s*.155,.28,.01,.077,.16,.05);p(box,trim,s*.194,.06,0,.062,.14,.17);p(box,shine,s*.229,.06,.005,.016,.08,.10);}
    }
    return time=>{root.rotation.z=Math.sin(time*1.1)*.018;};
  }
  if(slot==='cape') {
    // Panels start behind the bedroll; the yoke rides above it.
    p(box,trim,0,.267,-.08,.38,.034,.33);
    if(theme==='faerie'||theme==='dragon') {
      const wings=[membrane(-1,theme==='dragon'),membrane(1,theme==='dragon')];
      return t=>wings.forEach((wing,i)=>{wing.rotation.y=Math.sin(t*3.2)*.08*(i?1:-1);});
    }
    if(theme==='clockwork') {
      for(const s of [-1,1]) {
        const panel=p(polygon([[0,.19],[s*.43,.15],[s*.46,-.17],[s*.22,-.23],[0,-.06]],.025),main,s*.025,0,-.3);panel.name='cape-panel';
        for(let i=0;i<3;i++)p(box,trim,s*(.14+i*.10),-.01,-.32,.035,.26,.024).rotation.z=-s*.17;
      }
      p(cog(.083),shine,0,.035,-.34);
    } else if(theme==='astral') {
      for(let i=0;i<3;i++) {const panel=p(polygon([[-.06,.23],[.07,.20],[.06,-.18],[-.04,-.23-i*.012],[-.065,-.11]],.026),i%2?trim:main,(i-1)*.115,0,-.275);panel.name='cape-panel';p(star(.033),shine,(i-1)*.115,.1,-.31);}
    } else if(theme==='corsair') {
      const panel=p(polygon([[-.23,.23],[.23,.23],[.21,-.24],[0,-.14],[-.21,-.24]],.03),main,0,0,-.29);panel.name='cape-panel';
      p(star(.082),shine,0,.05,-.31);
      for(const s of [-1,1])p(box,trim,0,-.065,-.315,.20,.018,.015).rotation.z=s*.5;
    } else {
      for(const s of [-1,1]) {
        const panel=p(polygon([[-.08,.23],[.08,.23],[.11,-.2],[.015,-.25],[-.075,-.18]],.024),s<0?main:trim,s*.11,0,-.30);panel.name='cape-panel';
        p(box,shine,s*.11,-.13,-.32,.115,.045,.018);
      }
    }
    return t=>{root.rotation.x=Math.sin(t*2.3)*.025;};
  }
  if(slot==='light') {
    root.position.set(.075,0,.04);
    p(box,main,0,.04,0,.034,.27,.034);p(box,trim,0,.015,0,.048,.062,.048);
    let tip;
    if(theme==='faerie')tip=p(star(.105),trim,0,.265,0);
    else if(theme==='astral') {p(orb,trim,0,.26,0,.067);tip=p(ring(.112,.012),main,0,.26,0);p(ring(.10,.012),shine,0,.26,0).rotation.y=Math.PI/2;}
    else if(theme==='dragon') {p(box,trim,0,.20,0,.15,.06,.12);for(const s of [-1,1])p(cone,main,s*.07,.265,0,.032,.10,.037).rotation.z=-s*.35;}
    else if(theme==='clockwork') {for(let i=0;i<4;i++)p(ring(.065,.012),trim,0,.15+i*.029,0).rotation.x=Math.PI/2;tip=p(orb,shine,0,.285,0,.058);}
    else if(theme==='corsair') {p(cylinder(.073,.14),trim,0,.245,0);p(cylinder(.027,.075),main,0,.34,0);tip=p(ring(.08),shine,0,.25,0);}
    else tip=p(heart(),trim,0,.26,0,1.18);
    const flame=flameOf(tools,palette,.4);flame.group.position.set(0,.245,.025);root.add(flame.group);
    return {flame,lightAt:[0,.3,0],animate:t=>{if(tip)tip.rotation.y=Math.sin(t*.8)*.3;}};
  }
  if(slot==='trail') {
    const shapes={faerie:orb,astral:star(),dragon:cone,clockwork:cog(),corsair:orb,arcade:box};
    const pieces=Array.from({length:18},(_,i)=>{const mesh=p(shapes[theme],[main,trim,shine][i%3],0,0,0,.025);mesh.visible=false;mesh.castShadow=false;return {mesh,born:-10};});
    let cursor=0;
    return (t,context={})=>{
      if(context.footfall)for(let i=0;i<3;i++) {
        const piece=pieces[cursor++%pieces.length];piece.born=t;piece.mesh.visible=true;
        piece.mesh.position.copy(context.position||new THREE.Vector3());
        piece.mesh.position.x+=(i-1)*.08;piece.mesh.position.y+=.018;piece.mesh.rotation.x=-Math.PI/2;
      }
      for(const piece of pieces) {const age=t-piece.born;piece.mesh.visible=age<1.15;if(piece.mesh.visible){const size=(theme==='astral'||theme==='clockwork' ? .42 : .035)*(1-age/1.15);piece.mesh.scale.set(size,size,theme==='faerie'?size*.5:size);piece.mesh.position.z-=context.showcase ? .002 : 0;}}
    };
  }
  if(slot==='aura') {
    const orbit=new THREE.Group();root.add(orbit);
    p(ring(.37,.008),main,0,.018,0).rotation.x=-Math.PI/2;
    if(theme==='astral')for(const side of [-1,1])p(ring(.37,.006),side<0?trim:shine,0,.065,0).rotation.set(-Math.PI/2+side*.14,0,side*.25);
    const teeth=[],count=theme==='clockwork'?3:8;
    for(let i=0;i<count;i++) {
      const a=i*Math.PI*2/count,x=Math.cos(a)*.42,z=Math.sin(a)*.42,m=i%2?trim:shine;
      if(theme==='faerie'){p(cylinder(.013,.046),main,x,.035,z,1,1,1,orbit);p(orb,m,x,.064,z,.038,.016,.038,orbit);}
      else if(theme==='dragon')p(cone,m,x,.054,z,.025,.09,.025,orbit).rotation.z=Math.sin(a)*.25;
      else if(theme==='clockwork'){const wheel=p(cog(.075),m,x,.03,z,1,1,1,orbit);wheel.rotation.x=-Math.PI/2;teeth.push(wheel);}
      else if(theme==='astral')p(star(.035),m,x,.035,z,1,1,1,orbit).rotation.x=-Math.PI/2;
      else if(theme==='corsair')p(orb,m,x,.03,z,.055,.014,.025,orbit).rotation.y=-a;
      else p(box,m,x,.04,z,.04,.04,.04,orbit);
    }
    return t=>{orbit.rotation.y=t*.23;teeth.forEach((wheel,i)=>wheel.rotation.z=t*(i+1)*.4);};
  }
  if(slot==='portal') {
    const circle=p(ring(.56,.019),main,0,.65,0);
    if(theme==='clockwork'){
      p(ring(.56,.046),trim,0,.65,-.014);p(ring(.5,.018),shine,0,.65,.025);
      for(let i=0;i<14;i++){const a=i*Math.PI/7;p(box,trim,Math.cos(a)*.61,.65+Math.sin(a)*.61,0,.06,.095,.04).rotation.z=a-Math.PI/2;}
    }
    else {
      for(let i=0;i<12;i++) {
        const a=i*Math.PI/6,x=Math.cos(a)*.57,y=.65+Math.sin(a)*.57;
        if(theme==='faerie'){for(let petal=0;petal<3;petal++)p(orb,trim,x,y,0,.057,.019,.015).rotation.z=petal*Math.PI/3;p(orb,shine,x,y,.02,.023);}
        else if(theme==='astral')p(star(.048),i%2?trim:shine,x,y,.01);
        else if(theme==='dragon'){p(cone,trim,x,y,0,.035,.15,.04).rotation.z=a-Math.PI/2;p(orb,shine,x,y,.031,.019);}
        else if(theme==='corsair'){p(box,trim,x*1.05,y+(y-.65)*.05,0,.035,.19,.035).rotation.z=a-Math.PI/2;p(orb,shine,x,y,.02,.022);}
        else {p(box,trim,x,y,0,.093,.093,.045);p(box,shine,x,y,.026,.036,.036,.017);}
      }
      if(theme==='arcade')p(heart(),shine,0,1.29,.02,1.2);
    }
    if(theme==='clockwork') {
      const wheel=new THREE.Group();wheel.position.y=.65;
      for(const child of [...root.children]){child.position.y-=.65;wheel.add(child);}
      root.add(wheel);return t=>{wheel.rotation.z=t*.12;};
    }
    return t=>{circle.rotation.z=t*.12;};
  }
  throw new Error(`Unsupported cosmetic slot ${slot}`);
}
