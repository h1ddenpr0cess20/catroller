import { partBounds } from './furniture.js';
import { createWaterMaterial } from './water.js';

/**
 * The house as it is drawn: floors of boards, carpet, tiles and flagstones,
 * papered walls with a skirting board, the furniture, rugs, lamps, the water
 * and the doorway out. Every texture is painted on a canvas at startup;
 * under node (the tests) there is no canvas and everything goes without.
 */

const textures = new Map();

/** A seeded random source, so the house is painted the same every time. */
function random(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function texture(GFX, c, { srgb = true, repeat = null } = {}) {
  const t = new GFX.CanvasTexture(c);
  if (srgb) t.colorSpace = GFX.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = GFX.RepeatWrapping;
  if (repeat) t.repeat.set(...repeat);
  return t;
}

const cached = (key, make) => {
  if (typeof document === 'undefined') return { map: null, bump: null };
  if (!textures.has(key)) textures.set(key, make());
  return textures.get(key);
};

const shade = (v) => `rgb(${v},${v},${v})`;

/**
 * Floorboards, two tiles square: long boards a little over a third of a
 * tile wide, their ends staggered, each its own shade, with the grain
 * running along them and the odd knot.
 */
export function woodTexture(GFX, { boards = 5, rough = false, seed = 3 } = {}) {
  return cached(`wood-${boards}-${rough}`, () => {
    const size = 512;
    const rnd = random(seed);
    const paint = (bump) => {
      const [c, ctx] = canvas(size);
      ctx.fillStyle = bump ? '#000' : '#2a1e16';
      ctx.fillRect(0, 0, size, size);
      const bw = size / boards;
      for (let b = 0; b < boards; b++) {
        let y = -rnd() * size;
        while (y < size) {
          const len = size * (0.45 + rnd() * 0.7);
          const tone = bump ? 220 : Math.round(200 + rnd() * 50);
          ctx.fillStyle = shade(tone);
          ctx.fillRect(b * bw + 1.5, y + 1.5, bw - 3, len - 3);
          // The grain: fine wavy lines along the board.
          ctx.strokeStyle = bump ? 'rgba(0,0,0,0.25)' : 'rgba(80,50,30,0.22)';
          ctx.lineWidth = 1;
          for (let g = 0; g < 9; g++) {
            const gx = b * bw + 4 + rnd() * (bw - 8);
            ctx.beginPath();
            for (let k = 0; k <= 12; k++) {
              const py = y + (k / 12) * len;
              const px = gx + Math.sin(k * 0.9 + g) * (1.5 + rnd() * 1.5);
              if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
            }
            ctx.stroke();
          }
          if (rnd() < (rough ? 0.6 : 0.25)) {
            const kx = b * bw + bw * (0.3 + rnd() * 0.4), ky = y + len * rnd();
            ctx.fillStyle = bump ? 'rgba(0,0,0,0.5)' : 'rgba(70,40,20,0.55)';
            ctx.beginPath();
            ctx.ellipse(kx, ky, 3 + rnd() * 3, 6 + rnd() * 6, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          if (rough) {
            // Nail heads at the board ends.
            ctx.fillStyle = bump ? '#fff' : '#3a3632';
            for (const nx of [0.25, 0.75]) { ctx.beginPath(); ctx.arc(b * bw + bw * nx, y + 8, 2.5, 0, Math.PI * 2); ctx.fill(); }
          }
          y += len;
        }
      }
      return c;
    };
    return {
      map: texture(GFX, paint(false), { repeat: [0.5, 0.5] }),
      bump: texture(GFX, paint(true), { srgb: false, repeat: [0.5, 0.5] }),
    };
  });
}

/** Carpet: a dense pile, every fibre a shade off, a tile square. */
export function carpetTexture(GFX) {
  return cached('carpet', () => {
    const size = 256;
    const rnd = random(17);
    const paint = (bump) => {
      const [c, ctx] = canvas(size);
      ctx.fillStyle = bump ? '#808080' : '#d8d8d8';
      ctx.fillRect(0, 0, size, size);
      for (let k = 0; k < 9000; k++) {
        const v = Math.round((bump ? 128 : 215) + (rnd() - 0.5) * (bump ? 200 : 70));
        ctx.fillStyle = shade(Math.max(0, Math.min(255, v)));
        const x = rnd() * size, y = rnd() * size;
        ctx.fillRect(x, y, 1.5, 1.5);
      }
      return c;
    };
    return { map: texture(GFX, paint(false), { repeat: [1, 1] }), bump: texture(GFX, paint(true), { srgb: false }) };
  });
}

/** Tiles: four to a tile of floor, glazed, with grout between; every other one a shade darker. */
export function tileTexture(GFX) {
  return cached('tile', () => {
    const size = 256, n = 4, s = size / n;
    const paint = (bump) => {
      const [c, ctx] = canvas(size);
      ctx.fillStyle = bump ? '#000' : '#8a8478';
      ctx.fillRect(0, 0, size, size);
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const dark = (i + j) % 2;
          ctx.fillStyle = bump ? '#fff' : dark ? '#b8b4ac' : '#f6f4ee';
          ctx.beginPath();
          ctx.roundRect(i * s + 2, j * s + 2, s - 4, s - 4, 3);
          ctx.fill();
        }
      }
      return c;
    };
    return { map: texture(GFX, paint(false)), bump: texture(GFX, paint(true), { srgb: false }) };
  });
}

/** Flagstones for the cellar: slabs of uneven size, worn at the edges, speckled. */
export function stoneTexture(GFX) {
  return cached('stone', () => {
    const size = 256;
    const rnd = random(11);
    const slabs = [[0, 0, 0.56, 0.47], [0.56, 0, 0.44, 0.62], [0, 0.47, 0.42, 0.53], [0.42, 0.62, 0.58, 0.38], [0.42, 0.47, 0.14, 0.15]];
    const speckle = Array.from({ length: 900 }, () => [rnd() * size, rnd() * size, rnd(), rnd() * 1.6 + 0.4]);
    const paint = (face, edge, joint, dots) => {
      const [c, ctx] = canvas(size);
      ctx.fillStyle = joint;
      ctx.fillRect(0, 0, size, size);
      for (const [sx, sy, sw, sh] of slabs) {
        for (let k = 0; k <= 8; k++) {
          ctx.fillStyle = mix(edge, face, Math.sin((k / 8) * Math.PI / 2));
          ctx.beginPath();
          ctx.roundRect(sx * size + 3 + k, sy * size + 3 + k, sw * size - 6 - k * 2, sh * size - 6 - k * 2, 10 - k);
          ctx.fill();
        }
      }
      for (const [x, y, v, r] of speckle) {
        ctx.fillStyle = dots(v);
        ctx.fillRect(x, y, r, r);
      }
      return c;
    };
    return {
      map: texture(GFX, paint('#e8e4dc', '#a9a49b', '#2a2622', (v) => (v > 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)'))),
      bump: texture(GFX, paint('#ffffff', '#707070', '#000000', (v) => (v > 0.5 ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)')), { srgb: false }),
    };
  });
}

/**
 * Wallpaper, a tile across and four tall (taller than any wall): a pattern
 * of stripes and sprigs, near white (the colour is the room's), over a
 * white skirting board along the bottom with a groove in it.
 */
export function paperTexture(GFX) {
  return cached('paper', () => {
    const w = 128, h = 512;
    const skirting = h * (0.42 / 4);
    const paint = (bump) => {
      const [c, ctx] = canvas(w, h);
      ctx.fillStyle = bump ? '#808080' : '#e8e4dc';
      ctx.fillRect(0, 0, w, h);
      if (!bump) {
        // Stripes, and a little sprig between them every so often.
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(0, 0, w * 0.18, h);
        ctx.fillRect(w * 0.5, 0, w * 0.18, h);
        ctx.fillStyle = 'rgba(90,60,50,0.16)';
        ctx.fillRect(w * 0.2, 0, 2, h);
        ctx.fillRect(w * 0.7, 0, 2, h);
        for (let y = 20; y < h - skirting; y += 64) {
          for (const x of [w * 0.345, w * 0.845]) {
            ctx.fillStyle = 'rgba(120,60,70,0.28)';
            ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(60,100,60,0.25)';
            ctx.beginPath(); ctx.ellipse(x - 6, y + 6, 5, 2.5, -0.6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(x + 6, y + 6, 5, 2.5, 0.6, 0, Math.PI * 2); ctx.fill();
          }
        }
        // A dado rail.
        ctx.fillStyle = 'rgba(255,250,240,0.9)';
        ctx.fillRect(0, h - h * (2.1 / 4), w, 5);
        ctx.fillStyle = 'rgba(60,40,30,0.25)';
        ctx.fillRect(0, h - h * (2.1 / 4) + 5, w, 2);
      }
      // The skirting board at the bottom.
      ctx.fillStyle = bump ? '#ffffff' : '#fbf8f0';
      ctx.fillRect(0, h - skirting, w, skirting);
      ctx.fillStyle = bump ? '#606060' : 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, h - skirting, w, 3);
      ctx.fillRect(0, h - skirting * 0.55, w, 2);
      return c;
    };
    return {
      map: texture(GFX, paint(false), { repeat: [1, 0.25] }),
      bump: texture(GFX, paint(true), { srgb: false, repeat: [1, 0.25] }),
    };
  });
}

/** Fabric: a fine weave. */
function fabricTexture(GFX) {
  return cached('fabric', () => {
    const size = 128;
    const [c, ctx] = canvas(size);
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < size; i += 2) {
      ctx.fillStyle = i % 4 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)';
      ctx.fillRect(i, 0, 1, size);
      ctx.fillRect(0, i, size, 1);
    }
    return { map: texture(GFX, c, { repeat: [3, 3] }), bump: null };
  });
}

/** Wood grain for the furniture. */
function grainTexture(GFX) {
  return cached('grain', () => {
    const size = 256;
    const rnd = random(23);
    const [c, ctx] = canvas(size);
    ctx.fillStyle = '#d8d0c4';
    ctx.fillRect(0, 0, size, size);
    for (let g = 0; g < 70; g++) {
      const y0 = rnd() * size;
      ctx.strokeStyle = `rgba(90,60,40,${0.08 + rnd() * 0.12})`;
      ctx.lineWidth = 1 + rnd() * 2;
      ctx.beginPath();
      for (let x = 0; x <= size; x += 16) {
        const y = y0 + Math.sin(x * 0.03 + g) * 4;
        if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    return { map: texture(GFX, c), bump: null };
  });
}

/** Book spines along a shelf. */
function booksTexture(GFX) {
  return cached('books', () => {
    const [c, ctx] = canvas(256, 64);
    const rnd = random(5);
    const colours = ['#7a2a2a', '#2a4a6a', '#3a5a3a', '#8a6a2a', '#5a3a5a', '#2a2a2a', '#a85a3a'];
    let x = 0;
    while (x < 256) {
      const w = 6 + rnd() * 10, h = 40 + rnd() * 22;
      ctx.fillStyle = colours[Math.floor(rnd() * colours.length)];
      ctx.fillRect(x, 64 - h, w - 1, h);
      ctx.fillStyle = 'rgba(255,220,150,0.5)';
      ctx.fillRect(x + 1, 64 - h + 6, w - 3, 2);
      x += w;
    }
    return { map: texture(GFX, c), bump: null };
  });
}

/** Bricks, for the fireplace. */
function brickTexture(GFX) {
  return cached('brick', () => {
    const size = 256;
    const [c, ctx] = canvas(size);
    ctx.fillStyle = '#5a4a40';
    ctx.fillRect(0, 0, size, size);
    const rows = 8, bh = size / rows, bw = size / 4;
    const rnd = random(9);
    for (let r = 0; r < rows; r++) {
      for (let k = -1; k < 5; k++) {
        ctx.fillStyle = mix('#a8584a', '#7a3a30', rnd());
        ctx.fillRect(k * bw + (r % 2) * bw / 2 + 2, r * bh + 2, bw - 4, bh - 4);
      }
    }
    return { map: texture(GFX, c, { repeat: [2, 2] }), bump: null };
  });
}

function mix(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
}

/** A rug, painted: `pattern` 'persian' (a border and a medallion) or 'stripes', in `color`. */
function rugTexture(GFX, pattern, color, w, d) {
  return cached(`rug-${pattern}-${color}-${w}-${d}`, () => {
    const px = 64;
    const [c, ctx] = canvas(Math.round(w * px), Math.round(d * px));
    const W = c.width, H = c.height;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, H);
    const light = mix(color, '#f0e0c0', 0.55), dark = mix(color, '#100808', 0.45);
    if (pattern === 'persian') {
      for (const [inset, col, width] of [[6, light, 6], [16, dark, 10], [30, light, 3]]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = width;
        ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
      }
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(W / 2, H / 2, W * 0.22, H * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.ellipse(W / 2, H / 2, W * 0.12, H * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(W / 2 + Math.cos(a) * W * 0.3, H / 2 + Math.sin(a) * H * 0.38, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      for (let y = 0; y < H; y += 22) {
        ctx.fillStyle = (y / 22) % 2 ? light : dark;
        ctx.fillRect(0, y, W, 9);
      }
    }
    // Fringes at the ends, and some wear.
    ctx.fillStyle = 'rgba(240,230,210,0.9)';
    for (let x = 0; x < W; x += 4) { ctx.fillRect(x, 0, 2, 5); ctx.fillRect(x, H - 5, 2, 5); }
    const rnd = random(w * 31 + d);
    for (let k = 0; k < 2000; k++) {
      ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(rnd() * W, rnd() * H, 2, 2);
    }
    const t = new GFX.CanvasTexture(c);
    t.colorSpace = GFX.SRGBColorSpace;
    t.anisotropy = 8;
    return { map: t, bump: null };
  });
}

/** The materials of the furniture, by name; a colour (`#rrggbb`) is upholstery in that colour. */
function furnitureMaterials(GFX) {
  const grain = grainTexture(GFX).map, cloth = fabricTexture(GFX).map;
  const P = (name, o) => new GFX.MeshPhysicalMaterial({ name, roughness: 0.7, ...o });
  const made = {
    wood: P('wood', { color: new GFX.Color('#9a6a42'), map: grain, roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
    darkwood: P('darkwood', { color: new GFX.Color('#5a3a26'), map: grain, roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.25 }),
    lightwood: P('lightwood', { color: new GFX.Color('#c8a070'), map: grain, roughness: 0.5, clearcoat: 0.3 }),
    cabinet: P('cabinet', { color: new GFX.Color('#e8e2d2'), roughness: 0.5, clearcoat: 0.3 }),
    cabinetDoor: P('cabinet-door', { color: new GFX.Color('#d8d0be'), roughness: 0.5, clearcoat: 0.3 }),
    paint: P('paint', { color: new GFX.Color('#f0ebe0'), roughness: 0.55 }),
    linen: P('linen', { color: new GFX.Color('#f2eee6'), map: cloth, roughness: 0.9, sheen: 0.6, sheenColor: new GFX.Color('#ffffff') }),
    blanket: P('blanket', { color: new GFX.Color('#c86a5a'), map: cloth, roughness: 0.95, sheen: 1, sheenColor: new GFX.Color('#ffd0c0') }),
    cushion: P('cushion', { color: new GFX.Color('#c8a888'), map: cloth, roughness: 0.95, sheen: 0.8, sheenColor: new GFX.Color('#ffffff') }),
    brass: P('brass', { color: new GFX.Color('#c8a050'), roughness: 0.3, metalness: 1 }),
    metal: P('metal', { color: new GFX.Color('#8a8c90'), roughness: 0.35, metalness: 0.9 }),
    steel: P('steel', { color: new GFX.Color('#c8ccd0'), roughness: 0.25, metalness: 1 }),
    iron: P('iron', { color: new GFX.Color('#2a2828'), roughness: 0.5, metalness: 0.8 }),
    enamel: P('enamel', { color: new GFX.Color('#f6f4f0'), roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 }),
    stone: P('worktop', { color: new GFX.Color('#5a5a5e'), roughness: 0.3, clearcoat: 0.8 }),
    screen: P('screen', { color: new GFX.Color('#101418'), roughness: 0.1, clearcoat: 1, emissive: new GFX.Color('#1a2a3a'), emissiveIntensity: 0.4 }),
    piano: P('piano', { color: new GFX.Color('#14100e'), roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 }),
    keys: P('keys', { color: new GFX.Color('#f4f0e8'), roughness: 0.3, clearcoat: 0.6 }),
    brick: P('brick', { color: new GFX.Color('#ffffff'), map: brickTexture(GFX).map, roughness: 0.9 }),
    hearth: P('hearth', { color: new GFX.Color('#3a3634'), roughness: 0.8 }),
    soot: P('soot', { color: new GFX.Color('#100c0a'), roughness: 1 }),
    flame: new GFX.MeshBasicMaterial({ name: 'flame', color: new GFX.Color('#ffa040'), toneMapped: false }),
    shade: P('shade', { color: new GFX.Color('#f6e6c0'), roughness: 0.9, emissive: new GFX.Color('#ffc870'), emissiveIntensity: 1.6, side: GFX.DoubleSide }),
    terracotta: P('terracotta', { color: new GFX.Color('#b8603a'), roughness: 0.85 }),
    leaf: P('leaf', { color: new GFX.Color('#3a6a32'), roughness: 0.6, sheen: 0.5, sheenColor: new GFX.Color('#9ad08a') }),
    oven: P('oven', { color: new GFX.Color('#1a1a1c'), roughness: 0.15, clearcoat: 1 }),
    porthole: P('porthole', { color: new GFX.Color('#304048'), roughness: 0.1, clearcoat: 1, metalness: 0.3 }),
    bathwater: P('bathwater', { color: new GFX.Color('#8ac0d8'), roughness: 0.05, clearcoat: 1, emissive: new GFX.Color('#20384a'), emissiveIntensity: 0.4 }),
    wicker: P('wicker', { color: new GFX.Color('#c89a5a'), map: cloth, roughness: 0.85 }),
    cardboard: P('cardboard', { color: new GFX.Color('#c09a68'), roughness: 0.95 }),
    tape: P('tape', { color: new GFX.Color('#d8b878'), roughness: 0.4, clearcoat: 0.6 }),
    carpet: P('carpet-post', { color: new GFX.Color('#b8a890'), map: cloth, roughness: 1 }),
    sisal: P('sisal', { color: new GFX.Color('#c8aa78'), roughness: 1 }),
    coat: P('coat', { color: new GFX.Color('#4a3a5a'), map: cloth, roughness: 0.95, sheen: 0.6, sheenColor: new GFX.Color('#c0a0e0') }),
    leather: P('leather', { color: new GFX.Color('#5a3a24'), roughness: 0.5, clearcoat: 0.4 }),
    books: P('books', { color: new GFX.Color('#ffffff'), map: booksTexture(GFX).map, roughness: 0.8 }),
    kibble: P('kibble', { color: new GFX.Color('#8a5a30'), roughness: 0.9 }),
  };
  const fabrics = new Map();
  return (name) => {
    if (made[name]) return made[name];
    const colour = name && name.startsWith('#') ? name : '#8a6a5a';
    if (!fabrics.has(colour)) fabrics.set(colour, P(`fabric-${colour}`, { color: new GFX.Color(colour), map: cloth, roughness: 0.95, sheen: 1, sheenColor: new GFX.Color('#ffffff'), sheenRoughness: 0.6 }));
    return fabrics.get(colour);
  };
}

/**
 * All the furniture of a house, as few meshes as there are materials: each
 * part made, turned and put in place, then merged with the rest in its
 * material. Returns a group.
 */
export function createFurniture(GFX, house) {
  const group = new GFX.Group();
  group.name = 'furniture';
  const material = furnitureMaterials(GFX);
  const buckets = new Map();
  const add = (mat, geometry, x, y, z, { turn = 0 } = {}) => {
    if (!buckets.has(mat)) buckets.set(mat, []);
    buckets.get(mat).push({ geometry, x, y, z, turn });
  };
  for (const f of house.furniture) {
    for (const p of f.parts) {
      const mat = p.mat ?? '#8a6a5a';
      const [x0, y0, z0, x1, y1, z1] = f.onGrid(partBounds(p));
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
      if (p.box) add(mat, new GFX.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), cx, cy, cz);
      else if (p.cyl && p.axis === 'z') {
        const r = p.cyl[3];
        add(mat, new GFX.CylinderGeometry(r, r, p.cyl[4] - p.cyl[1], 24), cx, cy, cz, { turn: f.turns % 2 ? 'x' : 'z' });
      } else if (p.cyl) add(mat, new GFX.CylinderGeometry(p.cyl[3], p.cyl[3], p.cyl[4] - p.cyl[1], 20), cx, cy, cz);
      else if (p.cone) add(mat, new GFX.CylinderGeometry(p.cone[4], p.cone[3], p.cone[5] - p.cone[1], 20, 1, mat === 'shade'), cx, cy, cz);
      else if (p.ball) add(mat, new GFX.SphereGeometry(p.ball[3], 14, 10), cx, cy, cz);
    }
  }
  for (const [name, list] of buckets) {
    const mesh = new GFX.Mesh(merge(GFX, list), material(name));
    mesh.name = `furniture-${name}`;
    mesh.castShadow = name !== 'flame' && name !== 'shade';
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  // Rugs: flat on the floor, under everything else.
  for (const r of house.rugs) {
    const y = Math.max(house.heightAt(r.x + 0.5, r.z + 0.5) ?? 0, 0);
    const tex = rugTexture(GFX, r.pattern, r.color, r.w, r.d).map;
    const rug = new GFX.Mesh(new GFX.PlaneGeometry(r.w - 0.1, r.d - 0.1), new GFX.MeshPhysicalMaterial({
      name: 'rug', color: new GFX.Color(tex ? '#ffffff' : r.color), map: tex, roughness: 1, sheen: 1, sheenColor: new GFX.Color('#ffffff'), sheenRoughness: 0.7,
    }));
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(r.x + r.w / 2, y + 0.012, r.z + r.d / 2);
    rug.receiveShadow = true;
    group.add(rug);
  }
  return group;
}

/** Many geometries, each moved to (x, y, z) (and laid on its side for `turn` 'x' or 'z'), as one. */
function merge(GFX, list) {
  let count = 0, indices = 0;
  for (const { geometry } of list) {
    count += geometry.attributes.position.count;
    indices += geometry.index ? geometry.index.count : geometry.attributes.position.count;
  }
  const position = new Float32Array(count * 3), normal = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  const index = new Uint32Array(indices);
  let v = 0, k = 0;
  for (const { geometry, x, y, z, turn } of list) {
    const p = geometry.attributes.position.array, n = geometry.attributes.normal.array;
    const t = geometry.attributes.uv?.array;
    const m = geometry.attributes.position.count;
    for (let i = 0; i < m; i++) {
      let px = p[3 * i], py = p[3 * i + 1], pz = p[3 * i + 2];
      let nx = n[3 * i], ny = n[3 * i + 1], nz = n[3 * i + 2];
      if (turn === 'z') { [py, pz] = [-pz, py]; [ny, nz] = [-nz, ny]; }
      else if (turn === 'x') { [px, py] = [py, -px]; [nx, ny] = [ny, -nx]; }
      position[3 * (v + i)] = px + x; position[3 * (v + i) + 1] = py + y; position[3 * (v + i) + 2] = pz + z;
      normal[3 * (v + i)] = nx; normal[3 * (v + i) + 1] = ny; normal[3 * (v + i) + 2] = nz;
      if (t) { uv[2 * (v + i)] = t[2 * i]; uv[2 * (v + i) + 1] = t[2 * i + 1]; }
    }
    if (geometry.index) {
      const g = geometry.index.array;
      for (let i = 0; i < g.length; i++) index[k++] = g[i] + v;
    } else {
      for (let i = 0; i < m; i++) index[k++] = v + i;
    }
    v += m;
  }
  const g = new GFX.BufferGeometry();
  g.setAttribute('position', new GFX.BufferAttribute(position, 3));
  g.setAttribute('normal', new GFX.BufferAttribute(normal, 3));
  g.setAttribute('uv', new GFX.BufferAttribute(uv, 2));
  g.setIndex(new GFX.BufferAttribute(index, 1));
  g.computeBoundingSphere();
  return g;
}

/** The meshes for a built house (see `buildHouse`): floors, walls, steps, the sides and the water. */
export function createHouseMeshes(GFX, built) {
  const group = new GFX.Group();
  group.name = 'house';
  const geometry = (parts) => {
    const g = new GFX.BufferGeometry();
    g.setAttribute('position', new GFX.BufferAttribute(parts.position, 3));
    g.setAttribute('normal', new GFX.BufferAttribute(parts.normal, 3));
    g.setAttribute('color', new GFX.BufferAttribute(parts.color, 3));
    g.setAttribute('uv', new GFX.BufferAttribute(parts.uv, 2));
    g.computeBoundingSphere();
    return g;
  };
  const add = (parts, material, { shadow = true } = {}) => {
    if (!parts.position.length) return null;
    const m = new GFX.Mesh(geometry(parts), material);
    m.receiveShadow = true;
    m.castShadow = shadow;
    m.frustumCulled = false;
    group.add(m);
    return m;
  };
  const P = (o) => new GFX.MeshPhysicalMaterial({ vertexColors: true, ...o });
  const wood = woodTexture(GFX), boards = woodTexture(GFX, { boards: 3, rough: true, seed: 7 });
  const carpet = carpetTexture(GFX), tile = tileTexture(GFX), stone = stoneTexture(GFX), paper = paperTexture(GFX);
  add(built.floors.wood, P({ name: 'floorboards', map: wood.map, bumpMap: wood.bump, bumpScale: 1.6, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.3 }));
  add(built.floors.boards, P({ name: 'boards', map: boards.map, bumpMap: boards.bump, bumpScale: 2.2, roughness: 0.85 }));
  add(built.floors.carpet, P({ name: 'carpet', map: carpet.map, bumpMap: carpet.bump, bumpScale: 1.2, roughness: 1, sheen: 1, sheenColor: new GFX.Color('#ffffff'), sheenRoughness: 0.8 }));
  add(built.floors.tile, P({ name: 'tiles', map: tile.map, bumpMap: tile.bump, bumpScale: 1.4, roughness: 0.2, clearcoat: 0.9, clearcoatRoughness: 0.12 }));
  add(built.floors.stone, P({ name: 'flagstones', map: stone.map, bumpMap: stone.bump, bumpScale: 2.2, roughness: 0.85 }));
  add(built.walls, P({ name: 'wallpaper', map: paper.map, bumpMap: paper.bump, bumpScale: 1.5, roughness: 0.75 }));
  add(built.risers, P({ name: 'risers', map: wood.map, roughness: 0.5, clearcoat: 0.3 }));
  add(built.caps, P({ name: 'wall-tops', roughness: 0.9 }), { shadow: true });
  add(built.sides, P({ name: 'joists', roughness: 0.95 }));
  let water = null;
  if (built.water.position.length) {
    water = createWaterMaterial(GFX);
    const m = add(built.water, water, { shadow: false });
    if (m) m.receiveShadow = false;
  }
  return {
    group,
    update(time) {
      if (water) water.uniforms.uTime.value = time;
    },
  };
}

/** The lamps on the walls: a brass bracket and a glowing shade. Returns where every bulb in the house is. */
export function createLamps(GFX, house) {
  const group = new GFX.Group();
  group.name = 'lamps';
  const brass = new GFX.MeshPhysicalMaterial({ name: 'sconce', color: new GFX.Color('#c8a050'), roughness: 0.3, metalness: 1 });
  const shade = new GFX.MeshPhysicalMaterial({ name: 'sconce-shade', color: new GFX.Color('#f6e6c0'), emissive: new GFX.Color('#ffc870'), emissiveIntensity: 1.8, roughness: 0.9, side: GFX.DoubleSide });
  const bulbs = [];
  for (const [x, y, z] of house.lamps) {
    const g = new GFX.Group();
    g.position.set(x, y, z);
    const arm = new GFX.Mesh(new GFX.CylinderGeometry(0.04, 0.04, 0.5, 8), brass);
    arm.position.y = -0.35;
    const cup = new GFX.Mesh(new GFX.CylinderGeometry(0.22, 0.32, 0.36, 16, 1, true), shade);
    g.add(arm, cup);
    arm.castShadow = true;
    group.add(g);
    bulbs.push([x, y, z]);
  }
  for (const f of house.furniture) if (f.lamp) bulbs.push(f.lamp);
  return { group, bulbs };
}

/**
 * The doorway out: a door frame over the side the house comes in from, the
 * door standing open, a doormat with where it goes on it, and warm light
 * from the room beyond. Returns null if the level has none.
 */
export function createExit(GFX, house, { last = false } = {}) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, y = -Infinity;
  for (let z = 0; z < house.rows; z++) {
    for (let x = 0; x < house.cols; x++) {
      const c = house.cell(x, z);
      if (c?.kind !== 'exit') continue;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1);
      z0 = Math.min(z0, z); z1 = Math.max(z1, z + 1);
      y = Math.max(y, ...c.h);
    }
  }
  if (!Number.isFinite(y)) return null;
  const group = new GFX.Group();
  group.name = 'exit';
  // Which side the house comes in from: the one with the most floor next to it.
  const count = (cells) => cells.filter(([x, z]) => {
    const c = house.cell(x, z);
    return c && c.kind !== 'exit' && c.kind !== 'wall';
  }).length;
  const span = (a, b, f) => Array.from({ length: b - a }, (_, i) => f(a + i));
  const side = [
    { n: count(span(x0, x1, (x) => [x, z0 - 1])), along: 'x', at: z0 },
    { n: count(span(x0, x1, (x) => [x, z1])), along: 'x', at: z1 },
    { n: count(span(z0, z1, (z) => [x0 - 1, z])), along: 'z', at: x0 },
    { n: count(span(z0, z1, (z) => [x1, z])), along: 'z', at: x1 },
  ].sort((a, b) => b.n - a.n)[0];
  const [from, to] = side.along === 'x' ? [x0, x1] : [z0, z1];
  const width = to - from;
  const height = 4.2;
  const paint = new GFX.MeshPhysicalMaterial({ name: 'door-frame', color: new GFX.Color('#f4efe4'), roughness: 0.45, clearcoat: 0.4 });
  const place = (mesh, a, up, off = 0) => {
    if (side.along === 'x') mesh.position.set(a, up, side.at + off);
    else mesh.position.set(side.at + off, up, a);
  };
  const lintel = side.along === 'x'
    ? new GFX.Mesh(new GFX.BoxGeometry(width + 0.6, 0.35, 0.4), paint)
    : new GFX.Mesh(new GFX.BoxGeometry(0.4, 0.35, width + 0.6), paint);
  place(lintel, from + width / 2, y + height + 0.17);
  group.add(lintel);
  for (const a of [from - 0.1, to + 0.1]) {
    const post = new GFX.Mesh(new GFX.BoxGeometry(0.3, height, 0.3), paint);
    place(post, a, y + height / 2);
    group.add(post);
  }
  // The mat, with where the doorway goes.
  const mat = mattTexture(GFX, last ? 'OUT!' : house.next?.replace(/^the /i, '').toUpperCase() ?? 'ONWARD', x1 - x0, z1 - z0);
  const doormat = new GFX.Mesh(new GFX.PlaneGeometry((x1 - x0) * 0.86, (z1 - z0) * 0.86), new GFX.MeshPhysicalMaterial({
    name: 'doormat', color: new GFX.Color(mat ? '#ffffff' : '#a87a4a'), map: mat, roughness: 1, sheen: 0.6, sheenColor: new GFX.Color('#ffe0b0'),
  }));
  doormat.rotation.x = -Math.PI / 2;
  if (side.along === 'z') doormat.rotation.z = side.at === x0 ? -Math.PI / 2 : Math.PI / 2;
  else if (side.at === z1) doormat.rotation.z = Math.PI;
  doormat.position.set((x0 + x1) / 2, y + 0.015, (z0 + z1) / 2);
  doormat.receiveShadow = true;
  group.add(doormat);
  // Light from the next room, falling through.
  const glow = new GFX.Mesh(new GFX.PlaneGeometry((x1 - x0), (z1 - z0)), new GFX.MeshBasicMaterial({ name: 'door-light', color: new GFX.Color('#ffcf8a'), transparent: true, opacity: 0.18, depthWrite: false, toneMapped: false }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.set((x0 + x1) / 2, y + 0.03, (z0 + z1) / 2);
  group.add(glow);
  group.traverse((o) => { if (o.isMesh && o !== glow && o !== doormat) { o.castShadow = true; o.receiveShadow = true; } });
  return {
    group,
    at: [(x0 + x1) / 2, y, (z0 + z1) / 2],
    update(time) { glow.material.opacity = 0.14 + 0.06 * Math.sin(time * 2); },
  };
}

/** A coir doormat with a word on it. */
function mattTexture(GFX, word, w, d) {
  if (typeof document === 'undefined') return null;
  const px = 96;
  const [c, ctx] = canvas(Math.round(Math.max(w, d) * px), Math.round(Math.min(w, d) * px));
  const W = c.width, H = c.height;
  ctx.fillStyle = '#a8784a';
  ctx.fillRect(0, 0, W, H);
  const rnd = random(41);
  for (let k = 0; k < 6000; k++) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,220,160,0.12)' : 'rgba(60,30,10,0.14)';
    ctx.fillRect(rnd() * W, rnd() * H, 2, 3);
  }
  ctx.strokeStyle = '#4a2a14';
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, W - 24, H - 24);
  ctx.fillStyle = '#3a2210';
  ctx.font = `900 ${Math.round(H * 0.28)}px "Trebuchet MS", "Avenir Next", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(word, W / 2, H / 2, W - 60);
  const t = new GFX.CanvasTexture(c);
  t.colorSpace = GFX.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
