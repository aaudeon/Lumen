/** Cubic volumes with a single chamfer, matching the explorer's painted blocks. */
export function blockGeometry(THREE, width, height, depth, bevel = .10) {
  const x=width/2-bevel, y=height/2-bevel;
  const outline=new THREE.Shape();
  outline.moveTo(-x,-y);outline.lineTo(x,-y);outline.lineTo(x,y);outline.lineTo(-x,y);outline.closePath();
  const shape=new THREE.ExtrudeGeometry(outline,{depth:depth-2*bevel,bevelEnabled:true,bevelSegments:1,bevelSize:bevel,bevelThickness:bevel,steps:1,curveSegments:1});
  shape.translate(0,0,-(depth-2*bevel)/2);
  return shape;
}

/** A stepped shell. The same dimensions as a dome, but built from square layers. */
export function shellGeometry(THREE, unitBox, open=.55) {
  const bottom=Math.cos(Math.PI*open),positions=[],normals=[],indices=[];
  const source=unitBox.getAttribute('position'),normal=unitBox.getAttribute('normal');
  for(let tier=0;tier<4;tier++) {
    const lo=bottom+(1-bottom)*tier/4,hi=bottom+(1-bottom)*(tier+1)/4;
    const radius=Math.sqrt(1-Math.max(0,lo)**2),base=positions.length/3;
    for(let i=0;i<source.count;i++) {
      positions.push(source.getX(i)*2*radius,source.getY(i)*(hi-lo)+(hi+lo)/2,source.getZ(i)*2*radius);
      normals.push(normal.getX(i),normal.getY(i),normal.getZ(i));
    }
    for(const index of unitBox.index.array)indices.push(base+index);
  }
  const shape=new THREE.BufferGeometry();
  shape.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  shape.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));shape.setIndex(indices);
  return shape;
}
