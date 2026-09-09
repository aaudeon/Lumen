/**
 * Small painted pixel-art surfaces for the temple and jungle.
 * Every mark is an integer rectangle: no gradients, smoothing, or random noise.
 * Materials should use white / a light tint so the painted palette stays visible.
 */
export function createPixelTextures(THREE) {
  const textures = [];
  const size = 32;

  function surface(name, base, paint) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    function block(color, x, y, width, height) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, width, height);
    }
    function marks(color, rectangles) {
      for (const mark of rectangles) block(color, ...mark);
    }
    block(base, 0, 0, size, size);
    paint(block, marks);
    const texture = new THREE.CanvasTexture(canvas);
    texture.name = `Lumen pixel ${name}`;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 1;
    texture.userData.pixelArt = true;
    textures.push(texture);
    return texture;
  }

  const stone = surface('stone', '#93a18d', (block, marks) => {
    // Broad carved blocks, staggered mortar, and the pale upper stone edge.
    marks('#9fac98', [[1, 1, 14, 13], [18, 17, 13, 13]]);
    marks('#879581', [[17, 1, 14, 13], [1, 17, 15, 13]]);
    marks('#657561', [[0, 0, 32, 1], [0, 15, 32, 1], [0, 31, 32, 1],
      [16, 1, 1, 14], [0, 16, 1, 15], [17, 16, 1, 15]]);
    marks('#b5bca7', [[2, 1, 12, 1], [18, 1, 11, 1], [2, 17, 13, 1], [19, 17, 10, 1],
      [3, 4, 5, 2], [8, 5, 3, 1], [21, 20, 5, 2]]);
    marks('#7b8b77', [[2, 13, 7, 1], [9, 12, 4, 1], [20, 11, 5, 2],
      [23, 10, 5, 1], [5, 24, 5, 2], [8, 26, 5, 1], [22, 27, 6, 2]]);
    // Cracks follow a few deliberate stepped lines instead of surface noise.
    marks('#6e7e6b', [[24, 6, 6, 1], [22, 7, 3, 1], [21, 8, 2, 2],
      [1, 21, 5, 1], [5, 22, 4, 1], [8, 23, 3, 1]]);
    // Moss collects at opposing broken corners, leaving most stone readable.
    marks('#637e49', [[0, 0, 5, 3], [0, 3, 3, 5], [3, 2, 4, 2],
      [26, 28, 6, 4], [29, 24, 3, 4]]);
    marks('#839450', [[1, 1, 3, 2], [0, 5, 2, 2], [4, 2, 2, 1],
      [28, 28, 3, 2], [30, 25, 2, 2]]);
  });

  const path = surface('sandstone', '#d8c592', (block, marks) => {
    // Four worn sandstone slabs. Their chunky joins read at game distance.
    marks('#dfcf9f', [[2, 2, 13, 12], [17, 17, 13, 13]]);
    marks('#ceba86', [[17, 2, 13, 12], [2, 17, 13, 13]]);
    marks('#99855c', [[0, 0, 32, 1], [0, 0, 1, 32], [0, 31, 32, 1], [31, 0, 1, 32],
      [15, 1, 1, 30], [1, 15, 30, 1]]);
    marks('#b29d70', [[16, 2, 1, 12], [2, 16, 12, 1], [17, 16, 13, 1],
      [2, 30, 12, 1], [30, 17, 1, 12], [16, 18, 1, 12]]);
    marks('#f0dfb1', [[2, 1, 12, 1], [17, 1, 13, 1], [1, 2, 1, 11],
      [2, 17, 11, 1], [18, 17, 11, 1], [17, 18, 1, 10]]);
    marks('#c2ac77', [[5, 9, 5, 2], [8, 8, 4, 1], [21, 5, 6, 2],
      [24, 7, 3, 1], [4, 24, 3, 2], [7, 25, 4, 1], [22, 25, 5, 2]]);
    marks('#e9d6a4', [[4, 4, 5, 2], [6, 6, 3, 1], [20, 21, 5, 2],
      [23, 20, 4, 1], [3, 20, 3, 1]]);
    // Chipped slab corners and one hairline split.
    marks('#a69265', [[13, 1, 2, 2], [1, 13, 2, 2], [29, 14, 2, 1],
      [16, 28, 2, 3], [29, 29, 2, 2], [26, 10, 4, 1], [25, 11, 2, 2]]);
  });

  const moss = surface('moss', '#587347', (block, marks) => {
    // Interlocking cushions with two or three large steps per clump.
    marks('#405b37', [[0, 9, 10, 5], [3, 14, 9, 3], [13, 0, 8, 5],
      [18, 4, 7, 4], [21, 16, 11, 7], [17, 22, 12, 5], [0, 28, 12, 4]]);
    marks('#789049', [[1, 1, 8, 5], [4, 0, 6, 2], [8, 3, 5, 6],
      [13, 11, 8, 6], [11, 14, 5, 6], [2, 21, 8, 5],
      [6, 19, 5, 4], [23, 27, 8, 5], [26, 24, 6, 4]]);
    marks('#93a958', [[2, 1, 5, 2], [8, 4, 3, 2], [14, 11, 5, 2],
      [12, 15, 3, 2], [3, 21, 5, 2], [27, 25, 4, 2]]);
    marks('#698750', [[24, 0, 8, 6], [27, 6, 5, 5], [0, 16, 5, 4],
      [12, 25, 7, 7], [16, 28, 5, 4], [22, 11, 5, 3]]);
    marks('#b2bc69', [[4, 2, 2, 1], [15, 12, 2, 1], [4, 22, 2, 1], [28, 26, 2, 1]]);
  });

  const bark = surface('bark', '#8c704c', (block, marks) => {
    // Uneven vertical grain with a small angular knot on the right-hand strip.
    marks('#69543c', [[0, 0, 3, 32], [10, 0, 3, 13], [9, 13, 3, 19],
      [24, 0, 3, 10], [26, 10, 3, 15], [24, 25, 3, 7]]);
    marks('#ad8b5b', [[4, 0, 3, 12], [5, 12, 3, 14], [4, 26, 3, 6],
      [15, 0, 4, 10], [14, 10, 3, 13], [15, 23, 4, 9], [30, 0, 2, 32]]);
    marks('#b99c6a', [[4, 2, 1, 7], [5, 14, 1, 9], [15, 2, 1, 6], [15, 26, 1, 5]]);
    marks('#785d40', [[7, 3, 1, 5], [7, 21, 1, 8], [18, 1, 1, 5],
      [20, 23, 1, 9], [29, 4, 1, 7], [2, 17, 1, 8]]);
    marks('#5b4b36', [[19, 12, 5, 1], [18, 13, 1, 5], [24, 13, 1, 5],
      [19, 18, 5, 1], [20, 14, 3, 3]]);
    marks('#b09060', [[19, 13, 4, 1], [19, 14, 1, 3], [21, 19, 2, 3]]);
  });

  const leaf = surface('leaf', '#598748', (block, marks) => {
    // Opposing leaf halves and broad stepped veins, with restrained dithering.
    marks('#44713d', [[17, 0, 15, 32], [0, 27, 15, 5], [1, 24, 5, 3]]);
    marks('#6e9951', [[1, 0, 13, 8], [0, 8, 11, 6], [2, 14, 11, 8],
      [4, 22, 10, 4]]);
    marks('#8caf61', [[14, 0, 2, 32], [16, 1, 1, 30]]);
    for (const start of [4, 13, 22]) {
      for (let step = 0; step < 6; step++) {
        block('#7da357', 12 - step * 2, start - step + 3, 2, 1);
        block('#648d49', 17 + step * 2, start + step, 2, 1);
      }
    }
    marks('#517c40', [[3, 2, 2, 2], [5, 4, 2, 2], [9, 11, 2, 2],
      [7, 13, 2, 2], [2, 19, 2, 2], [4, 21, 2, 2], [10, 28, 2, 2]]);
    marks('#759a50', [[21, 3, 2, 2], [23, 5, 2, 2], [27, 13, 2, 2],
      [25, 15, 2, 2], [19, 23, 2, 2], [21, 25, 2, 2]]);
    marks('#a2bb70', [[14, 2, 1, 6], [14, 15, 1, 5], [14, 27, 1, 3]]);
  });

  const soil = surface('soil', '#877054', (block, marks) => {
    marks('#746044', [[0, 0, 11, 5], [7, 4, 10, 4], [23, 10, 9, 7],
      [18, 16, 8, 5], [0, 24, 13, 8], [12, 29, 8, 3]]);
    marks('#967e5b', [[17, 0, 11, 6], [13, 6, 9, 5], [1, 10, 10, 6],
      [4, 16, 10, 5], [22, 25, 10, 7]]);
    // Flat angular pebbles, each shadowed on its bottom/right edge.
    marks('#60553f', [[4, 4, 6, 4], [19, 10, 5, 4], [10, 20, 7, 4],
      [27, 20, 5, 3], [2, 29, 4, 3]]);
    marks('#a49a78', [[4, 4, 5, 2], [5, 3, 3, 1], [19, 10, 4, 2],
      [10, 20, 6, 2], [11, 19, 4, 1], [27, 20, 4, 1], [2, 29, 3, 1]]);
    marks('#c0b08a', [[5, 4, 2, 1], [20, 10, 2, 1], [11, 20, 3, 1]]);
    marks('#61734b', [[0, 18, 4, 3], [2, 21, 4, 2], [26, 0, 6, 3],
      [29, 3, 3, 3], [19, 26, 4, 2]]);
    marks('#82905a', [[0, 18, 3, 1], [27, 0, 4, 1], [20, 26, 2, 1]]);
  });

  let disposed = false;
  return {
    stone, moss, path, bark, leaf, soil,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const texture of textures) texture.dispose();
    },
  };
}
