/** Painted surfaces at scene resolution: broad material features, soft mipmapped detail. */
export function createBoardTextures(THREE) {
  const owned = [];
  const cache = new Map();
  const random = value => { const n = Math.sin(value * 127.1 + 63.7) * 43758.5453; return n - Math.floor(n); };
  function paint(kind, part, variant) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const seed = variant * 61 + (part === 'path' ? 203 : part === 'edge' ? 417 : 0);
    const line = (color, width, points) => {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round';
      ctx.beginPath(); points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.stroke();
    };
    const polygon = (color, points) => {
      ctx.fillStyle = color; ctx.beginPath(); points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath(); ctx.fill();
    };
    if (kind === 'jungle') {
      ctx.fillStyle = part === 'path' ? '#d8c7a1' : part === 'edge' ? '#777d5e' : ['#a5ac87','#afb28f','#99a17d'][variant];
      ctx.fillRect(0,0,256,256);
      // A single weathered monolith, with sediment bands instead of a brick grid.
      for (let i = 0; i < 24; i++) {
        const y = random(seed+i) * 256;
        line(i % 2 ? '#eee6be20' : '#49563c15', 2 + random(i+18)*8,
          [[0,y],[75,y+random(i+5)*12],[170,y-7],[256,y+4]]);
      }
      for (let i = 0; i < 3; i++) {
        const x = 35 + random(seed+i+21)*175;
        line('#4e60473b', 2, [[x,0],[x-8,26],[x+3,40],[x-13,64]]);
        line('#e9e4bd50', 1, [[x+2,1],[x-6,26],[x+5,40]]);
      }
      if (part !== 'path') {
        for (let i = 0; i < 34; i++) {
          const corner = i % 2, x = corner ? 246-random(i+seed)*53 : random(i+seed)*49;
          const y = corner ? 253-random(i+37)*51 : random(i+37)*48;
          ctx.fillStyle = ['#506b3a','#728845','#879953','#3d5b34'][i%4];
          ctx.beginPath(); ctx.ellipse(x,y,4+random(i+17)*11,3+random(i+49)*6,i,0,Math.PI*2); ctx.fill();
        }
        // A shallow spiral cut into the stone, visible between the path branches.
        line('#d7d5ad4d', 3, [[179,57],[204,57],[204,88],[183,88],[183,72],[195,72]]);
      } else {
        line('#f2e6c855', 3, [[5,13],[251,13]]);
        line('#8e785542', 2, [[5,246],[251,246]]);
      }
    } else if (kind === 'atlantis') {
      ctx.fillStyle = part === 'edge' ? '#417f8e' : part === 'path' ? '#dfebe1' : '#509eaa';
      ctx.fillRect(0,0,256,256);
      if (part === 'top') {
        // Turquoise tesserae, ivory border, and a circular shell medallion.
        for (let y=0;y<8;y++) for(let x=0;x<8;x++) {
          ctx.fillStyle = ['#65aeb3','#86c3c3','#4c939f','#a1d0cb'][Math.floor(random(seed+x+y*8)*4)];
          ctx.fillRect(x*32+2,y*32+2,28,28);
          line('#d4eee44d',1,[[x*32+3,y*32+29],[x*32+3,y*32+3],[x*32+29,y*32+3]]);
        }
        ctx.strokeStyle='#e5ddbb';ctx.lineWidth=7;ctx.strokeRect(11,11,234,234);
        ctx.strokeStyle='#306878';ctx.lineWidth=2;ctx.strokeRect(21,21,214,214);
        ctx.fillStyle='#d6e2d0';ctx.beginPath();ctx.arc(128,128,65,0,Math.PI*2);ctx.fill();
        for(let i=0;i<9;i++){const a=Math.PI+i*Math.PI/8;line('#508e9a',3,[[128,148],[128+Math.cos(a)*46,146+Math.sin(a)*49]]);}
        line('#b39758',3,[[81,148],[128,157],[175,148]]);
      } else {
        for(let i=0;i<7;i++) {
          const x=random(seed+i+8)*256;
          line(part === 'path' ? '#8fafb136' : '#c3e3d42b',2+random(i)*3,
            [[x,0],[x+17,53],[x-11,111],[x+23,173],[x+10,256]]);
        }
        if(part === 'edge') for(let x=8;x<256;x+=48) line('#b4d6c67a',4,[[x,48],[x+26,48],[x+26,110],[x+8,110],[x+8,83]]);
        else {line('#b8a16e',4,[[0,10],[256,10]]);line('#b8a16e',4,[[0,246],[256,246]]);}
      }
    } else if (kind === 'echoes') {
      ctx.fillStyle=part==='path'?'#d2c9ae':part==='edge'?'#708879':'#a7baaa';
      ctx.fillRect(0,0,256,256);
      for(let index=0;index<10;index++) {
        const horizontal=random(seed+index)*256;
        line('#eff1dc3b',2,[[horizontal,0],[horizontal+18,80],[horizontal-9,180],[horizontal+12,256]]);
      }
      if(part==='top') {
        ctx.strokeStyle='#4e766a';ctx.lineWidth=6;ctx.strokeRect(14,14,228,228);
        ctx.strokeStyle='#d9c792';ctx.lineWidth=2;ctx.strokeRect(23,23,210,210);
        for(const corner of [[35,35],[221,221]])line('#516e6299',3,[[corner[0]-7,corner[1]],[corner[0],corner[1]-7],[corner[0]+7,corner[1]],[corner[0],corner[1]+7],[corner[0]-7,corner[1]]]);
      }
    } else if (kind === 'boreal') {
      ctx.fillStyle=part==='path' ? '#ddd5bb' : part==='edge' ? '#557e9b' : ['#acc7d5','#c0d6dc','#93b4cc'][variant];
      ctx.fillRect(0,0,256,256);
      for(let i=0;i<14;i++) {
        const x=random(seed+i)*256,y=random(seed+i+32)*256;
        polygon(part==='path'?'#f7edd53a':'#eafdff36',[[x,y],[x+72,y-22],[x+52,y+36],[x-17,y+45]]);
      }
      if(part!=='path') {
        for(let i=0;i<6;i++) {
          const x=16+random(seed+i+80)*220;
          line('#d9f5fa83',2,[[x,0],[x-18,58],[x+13,127],[x-6,256]]);
        }
        // Wind-packed snow rims leave the playable inset readable.
        polygon('#eff7ef',[[0,0],[256,0],[256,18],[191,29],[148,15],[67,30],[0,21]]);
        polygon('#dcebea',[[0,233],[71,241],[136,230],[205,242],[256,229],[256,256],[0,256]]);
      } else {
        for(let x=22;x<256;x+=43) {line('#84745970',3,[[x,4],[x-6,20],[x+8,32]]);line('#fff4d566',2,[[x,248],[x-6,232]]);}
      }
    } else {
      ctx.fillStyle = part === 'path' ? '#aba4a2' : part === 'edge' ? '#353440' : ['#595865','#4a4a57','#69616a'][variant];
      ctx.fillRect(0,0,256,256);
      // Large cooled facets and pale mineral veins; glowing cracks are reserved for hazards.
      for(let i=0;i<15;i++) {
        const x=random(seed+i)*256,y=random(seed+i+79)*256,w=28+random(i+11)*80;
        polygon(part === 'path' ? '#e7dfd518' : i%2 ? '#c1b9bd13' : '#131b2d2b',
          [[x,y],[x+w,y-15],[x+w*.72,y+39],[x-12,y+54]]);
      }
      for(let i=0;i<5;i++) {
        const x=random(seed+i+91)*256;
        line(part === 'path' ? '#dad0c268' : '#1e233b88', 2,
          [[x,0],[x+15,53],[x-22,107],[x+4,151],[x-19,256]]);
        if(part === 'edge') line('#d09e692e',3,[[x+4,25],[x+19,55],[x-18,107]]);
      }
      if(part === 'path') for(let i=0;i<4;i++) line('#786c6655',2,[[0,32+i*64],[256,21+i*64]]);
    }
    // Small mineral flecks add material detail without a full-screen pixel filter.
    for(let i=0;i<105;i++) {
      ctx.fillStyle=i%3 ? '#fff5db13' : '#101d2b12';
      ctx.fillRect(Math.floor(random(seed+i+230)*256),Math.floor(random(seed+i+507)*256),2+random(i)*4,1+random(i+9)*2);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.name = `Lumen ${kind} ${part} ${variant}`;
    map.colorSpace=THREE.SRGBColorSpace;
    map.wrapS=map.wrapT=THREE.RepeatWrapping;
    map.magFilter=THREE.LinearFilter;
    map.minFilter=THREE.LinearMipmapLinearFilter;
    map.anisotropy=4;
    owned.push(map);
    return map;
  }
  return {
    get(kind, variant=0) {
      const key=`${kind}-${variant % 3}`;
      if(!cache.has(key)) cache.set(key, Object.fromEntries(['top','edge','path'].map(part=>[part,paint(kind,part,variant%3)])));
      return cache.get(key);
    },
    dispose(){owned.forEach(map=>map.dispose());owned.length=0;cache.clear();},
  };
}
