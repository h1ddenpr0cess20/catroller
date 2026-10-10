import { place } from './furniture.js';
import { ball, books, cushion, geometry, joined, lathe, leaf, moved, ring, roundedBox, slab, swept, tinted, tube } from './shapes.js';
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
    return { map: texture(GFX, c, { repeat: [0.42, 0.62] }), bump: null };
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

/** Rope wound round a scratching post. */
function sisalTexture(GFX) {
  return cached('sisal', () => {
    const size = 128;
    const [c, ctx] = canvas(size);
    const rnd = random(31);
    ctx.fillStyle = '#b89a68';
    ctx.fillRect(0, 0, size, size);
    const turns = 8, step = size / turns;
    for (let k = 0; k < turns; k++) {
      const y = k * step;
      const g = ctx.createLinearGradient(0, y, 0, y + step);
      g.addColorStop(0, '#7a6440'); g.addColorStop(0.25, '#d8bc88'); g.addColorStop(0.6, '#c4a674'); g.addColorStop(1, '#6a5434');
      ctx.fillStyle = g;
      ctx.fillRect(0, y, size, step);
      // The fibres, twisted along the rope.
      for (let f = 0; f < 40; f++) {
        ctx.strokeStyle = `rgba(${rnd() < 0.5 ? '255,236,190' : '90,70,40'},${0.15 + rnd() * 0.2})`;
        ctx.lineWidth = 1;
        const x0 = rnd() * size;
        ctx.beginPath();
        ctx.moveTo(x0, y + 1);
        ctx.lineTo(x0 + step * 0.8, y + step - 1);
        ctx.stroke();
      }
    }
    return { map: texture(GFX, c, { repeat: [3, 3.4] }), bump: null };
  });
}

/** Wicker: canes woven over and under. */
function wickerTexture(GFX) {
  return cached('wicker', () => {
    const size = 128;
    const [c, ctx] = canvas(size);
    ctx.fillStyle = '#6a4a26';
    ctx.fillRect(0, 0, size, size);
    const n = 8, s = size / n;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const across = (i + j) % 2 === 0;
        const g = across ? ctx.createLinearGradient(0, j * s, 0, (j + 1) * s) : ctx.createLinearGradient(i * s, 0, (i + 1) * s, 0);
        g.addColorStop(0, '#8a6232'); g.addColorStop(0.5, '#e0b878'); g.addColorStop(1, '#8a6232');
        ctx.fillStyle = g;
        ctx.fillRect(i * s + 1, j * s + 1, s - 2, s - 2);
      }
    }
    return { map: texture(GFX, c, { repeat: [3, 3] }), bump: null };
  });
}

/** A child's drawing of a cat, for the fridge door. */
function drawingTexture(GFX) {
  return cached('drawing', () => {
    const [c, ctx] = canvas(128, 160);
    ctx.fillStyle = '#fbf8f0';
    ctx.fillRect(0, 0, 128, 160);
    ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.strokeStyle = '#e8862a';
    ctx.beginPath(); ctx.ellipse(64, 100, 34, 26, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(64, 58, 22, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(46, 46); ctx.lineTo(44, 26); ctx.lineTo(58, 38); ctx.moveTo(70, 38); ctx.lineTo(84, 26); ctx.lineTo(82, 46); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(98, 104); ctx.quadraticCurveTo(122, 90, 112, 60); ctx.stroke();
    ctx.fillStyle = '#2a8a3a';
    ctx.beginPath(); ctx.arc(56, 56, 3, 0, Math.PI * 2); ctx.arc(72, 56, 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d02a2a';
    ctx.beginPath(); ctx.arc(30, 140, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#3a5ad0'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(10, 12); ctx.lineTo(118, 12); ctx.stroke();
    const t = texture(GFX, c);
    t.wrapS = t.wrapT = GFX.ClampToEdgeWrapping;
    return { map: t, bump: null };
  });
}

/** The face of the clock on the mantel. */
function clockTexture(GFX) {
  return cached('clock', () => {
    const [c, ctx] = canvas(128);
    ctx.fillStyle = '#f4ecd8';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#2a2420';
    ctx.translate(64, 64);
    for (let k = 0; k < 12; k++) {
      ctx.save(); ctx.rotate((k / 12) * Math.PI * 2); ctx.fillRect(-2, -58, 4, k % 3 ? 8 : 14); ctx.restore();
    }
    ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.strokeStyle = '#2a2420';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(18, -26); ctx.moveTo(0, 0); ctx.lineTo(-6, 42); ctx.stroke();
    const t = texture(GFX, c);
    t.wrapS = t.wrapT = GFX.ClampToEdgeWrapping;
    return { map: t, bump: null };
  });
}

/** The materials of the furniture, by name; a colour (`#rrggbb`) is upholstery in that colour. */
function furnitureMaterials(GFX) {
  const grain = grainTexture(GFX).map, cloth = fabricTexture(GFX).map;
  const P = (name, o) => new GFX.MeshPhysicalMaterial({ name, roughness: 0.7, vertexColors: true, ...o });
  const col = (hex) => new GFX.Color(hex);
  const made = {
    wood: P('wood', { color: col('#9a6a42'), map: grain, roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
    darkwood: P('darkwood', { color: col('#5a3a26'), map: grain, roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.25 }),
    lightwood: P('lightwood', { color: col('#c8a070'), map: grain, roughness: 0.5, clearcoat: 0.3 }),
    cabinet: P('cabinet', { color: col('#e8e2d2'), roughness: 0.5, clearcoat: 0.3 }),
    cabinetDoor: P('cabinet-door', { color: col('#ded6c4'), roughness: 0.45, clearcoat: 0.4 }),
    paint: P('paint', { color: col('#f0ebe0'), roughness: 0.55 }),
    linen: P('linen', { color: col('#f2eee6'), map: cloth, roughness: 0.9, sheen: 0.6, sheenColor: col('#ffffff') }),
    blanket: P('blanket', { color: col('#c86a5a'), map: cloth, roughness: 0.95, sheen: 1, sheenColor: col('#ffd0c0') }),
    cushion: P('cushion', { color: col('#c8a888'), map: cloth, roughness: 0.95, sheen: 0.8, sheenColor: col('#ffffff') }),
    pillow: P('pillow', { color: col('#c89a3a'), map: cloth, roughness: 0.95, sheen: 1, sheenColor: col('#fff0c0') }),
    seatpad: P('seatpad', { color: col('#8a3a3a'), map: cloth, roughness: 0.95, sheen: 0.8, sheenColor: col('#ffc0c0') }),
    runner: P('runner', { color: col('#a8423a'), map: cloth, roughness: 0.95, sheen: 0.6, sheenColor: col('#ffd0c0') }),
    wool: P('wool', { color: col('#ffffff'), map: cloth, roughness: 1, sheen: 1, sheenColor: col('#ffffff'), sheenRoughness: 0.5 }),
    coat: P('coat', { color: col('#3a3448'), map: cloth, roughness: 0.95, sheen: 0.6, sheenColor: col('#a090c0') }),
    hat: P('hat', { color: col('#2a2624'), roughness: 0.9, sheen: 0.5, sheenColor: col('#8a8078') }),
    brass: P('brass', { color: col('#c8a050'), roughness: 0.3, metalness: 1 }),
    metal: P('metal', { color: col('#8a8c90'), roughness: 0.35, metalness: 0.9 }),
    steel: P('steel', { color: col('#c8ccd0'), roughness: 0.22, metalness: 1 }),
    iron: P('iron', { color: col('#2a2828'), roughness: 0.5, metalness: 0.8 }),
    basin: P('basin', { color: col('#5a5e62'), roughness: 0.25, metalness: 0.9 }),
    enamel: P('enamel', { color: col('#f6f4f0'), roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 }),
    china: P('china', { color: col('#eef2f6'), roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 }),
    seat: P('seat', { color: col('#faf8f4'), roughness: 0.25, clearcoat: 0.8 }),
    plastic: P('plastic', { color: col('#ffffff'), roughness: 0.35, clearcoat: 0.6 }),
    fruit: P('fruit', { color: col('#ffffff'), roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    glass: P('glass', { color: col('#c8dce0'), roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.55 }),
    stone: P('worktop', { color: col('#4e5054'), roughness: 0.25, clearcoat: 0.9 }),
    screen: P('screen', { color: col('#0c1014'), roughness: 0.08, clearcoat: 1, emissive: col('#1a2a3a'), emissiveIntensity: 0.5, vertexColors: false }),
    tvcase: P('tvcase', { color: col('#18181a'), roughness: 0.35, clearcoat: 0.6 }),
    piano: P('piano', { color: col('#14100e'), roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04 }),
    keys: P('keys', { color: col('#f6f2e8'), roughness: 0.3, clearcoat: 0.7 }),
    paper: P('paper', { color: col('#f6f2e6'), roughness: 0.9 }),
    drawing: P('drawing', { color: col('#ffffff'), map: drawingTexture(GFX).map, roughness: 0.9 }),
    clockface: P('clockface', { color: col('#ffffff'), map: clockTexture(GFX).map, roughness: 0.4, clearcoat: 0.8 }),
    bookcover: P('bookcover', { color: col('#2a4a6a'), map: cloth, roughness: 0.7 }),
    candle: P('candle', { color: col('#f6eedc'), roughness: 0.5, emissive: col('#ffcc88'), emissiveIntensity: 0.15 }),
    brick: P('brick', { color: col('#ffffff'), map: brickTexture(GFX).map, roughness: 0.9 }),
    hearth: P('hearth', { color: col('#3a3634'), roughness: 0.8 }),
    soot: P('soot', { color: col('#100c0a'), roughness: 1 }),
    ash: P('ash', { color: col('#4a4440'), roughness: 1, emissive: col('#ff5a10'), emissiveIntensity: 0.12 }),
    log: P('log', { color: col('#4a3020'), map: grain, roughness: 0.95 }),
    flame: new GFX.MeshBasicMaterial({ name: 'flame', color: col('#ff7a1a'), toneMapped: false, transparent: true, opacity: 0.85 }),
    flamecore: new GFX.MeshBasicMaterial({ name: 'flamecore', color: col('#ffe08a'), toneMapped: false }),
    shade: P('shade', { color: col('#f6e6c0'), roughness: 0.9, emissive: col('#ffc870'), emissiveIntensity: 1.6, side: GFX.DoubleSide, vertexColors: false }),
    terracotta: P('terracotta', { color: col('#b8603a'), roughness: 0.85 }),
    soil: P('soil', { color: col('#3a2618'), roughness: 1 }),
    leaf: P('leaf', { color: col('#3a6a32'), roughness: 0.55, sheen: 0.5, sheenColor: col('#9ad08a'), side: GFX.DoubleSide }),
    oven: P('oven', { color: col('#141416'), roughness: 0.08, clearcoat: 1 }),
    porthole: P('porthole', { color: col('#304048'), roughness: 0.05, clearcoat: 1, metalness: 0.3 }),
    bathwater: P('bathwater', { color: col('#7ab0c8'), roughness: 0.05, clearcoat: 1 }),
    wicker: P('wicker', { color: col('#ffffff'), map: wickerTexture(GFX).map, roughness: 0.85 }),
    needle: P('needle', { color: col('#d8b070'), roughness: 0.4, clearcoat: 0.6 }),
    string: P('string', { color: col('#e8e0d0'), roughness: 0.9 }),
    cardboard: P('cardboard', { color: col('#c09a68'), roughness: 0.95 }),
    shadowline: P('shadowline', { color: col('#5a4228'), roughness: 1 }),
    tape: P('tape', { color: col('#d8b878'), roughness: 0.35, clearcoat: 0.7 }),
    carpet: P('carpet-post', { color: col('#b8a890'), map: cloth, roughness: 1, sheen: 0.6, sheenColor: col('#ffffff') }),
    sisal: P('sisal', { color: col('#ffffff'), map: sisalTexture(GFX).map, roughness: 1 }),
    leather: P('leather', { color: col('#5a3a24'), roughness: 0.45, clearcoat: 0.5 }),
    boot: P('boot', { color: col('#2a1e18'), roughness: 0.4, clearcoat: 0.6 }),
    hatbox: P('hatbox', { color: col('#c8a0a8'), roughness: 0.8 }),
    books: P('books', { color: col('#ffffff'), map: cloth, roughness: 0.75 }),
    kibble: P('kibble', { color: col('#8a5a30'), roughness: 0.9 }),
  };
  const fabrics = new Map();
  return (name) => {
    if (made[name]) return made[name];
    const colour = name && name.startsWith('#') ? name : '#8a6a5a';
    if (!fabrics.has(colour)) fabrics.set(colour, P(`fabric-${colour}`, { color: col(colour), map: cloth, roughness: 0.95, sheen: 1, sheenColor: col('#ffffff'), sheenRoughness: 0.6 }));
    return fabrics.get(colour);
  };
}

/** No shading baked into these: they give light, or are lit from inside. */
const UNSHADED = new Set(['flame', 'flamecore', 'shade', 'screen']);

/** A plant's leaves: `count` of them round a centre, up and out and drooping, on a few stems. */
function plantLeaves({ count = 24, len = 1.2, wide = 0.4, seed = 1 }) {
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const list = [];
  for (let k = 0; k < count; k++) {
    const turn = k * 2.399963 + rnd() * 0.4;
    const up = 0.35 + (1 - k / count) * 0.75 + rnd() * 0.2;
    const l = len * (0.65 + rnd() * 0.45), w = wide * (0.75 + rnd() * 0.4);
    const rise = (k / count) * len * 0.35 + rnd() * 0.1;
    list.push(moved(leaf(l, w, { droop: 0.25 + rnd() * 0.25, fold: 0.3 }), [Math.cos(turn) * 0.05, rise, Math.sin(turn) * 0.05], [-up, Math.PI / 2 - turn, 0]));
  }
  return joined(list);
}

/** A part as a shape in its piece's own frame, or null if it isn't drawn. */
function partShape(p) {
  let g = null;
  if (p.box) {
    const [x0, y0, z0, x1, y1, z1] = p.box;
    const r = p.round ?? 0.025;
    g = moved(roundedBox(x1 - x0, y1 - y0, z1 - z0, r, p.seg ?? (r > 0.05 ? 3 : 2)), [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], p.rot);
  } else if (p.cyl) {
    const [x, y0, z, r, y1] = p.cyl, h = y1 - y0;
    const b = Math.min(0.015, r * 0.2, h * 0.2);
    const profile = p.profile ?? [[0, 0], [r - b, 0], [r, b], [r, h - b], [r - b, h], [0, h]];
    const rMax = Math.max(...profile.map((q) => q[0]));
    g = moved(lathe(profile, rMax > 0.3 ? 32 : rMax > 0.1 ? 20 : 12), [x, y0, z], p.rot);
  } else if (p.cone) {
    const [x, y0, z, r0, r1, y1] = p.cone, h = y1 - y0;
    const profile = p.mat === 'shade'
      ? [[r0, 0], [r0 * 0.98, 0.05], [(r0 + r1) / 2 + 0.03, h / 2], [r1 * 1.02, h - 0.05], [r1, h]]
      : [[0, 0], [r0, 0], [r0 * 0.75, h * 0.35], [r0 * 0.35, h * 0.75], [r1, h]];
    g = moved(lathe(profile, 28), [x, y0, z]);
  } else if (p.flame) {
    const { r, h } = p;
    g = moved(lathe([[0, 0], [r * 0.55, h * 0.04], [r * 0.95, h * 0.18], [r, h * 0.3], [r * 0.75, h * 0.52], [r * 0.38, h * 0.78], [r * 0.12, h * 0.93], [0, h]], 14), p.flame);
  } else if (p.ball) {
    const [x, y, z, r] = p.ball;
    g = moved(ball(r, r > 0.2 ? 22 : 12), [x, y, z]);
  } else if (p.pad) {
    const [x0, y0, z0, x1, y1, z1] = p.pad;
    g = moved(cushion(x1 - x0, y1 - y0, z1 - z0, { up: p.up, round: p.round }), [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], p.rot);
    if (p.clip !== undefined) for (let v = 1; v < g.p.length; v += 3) g.p[v] = Math.max(g.p[v], p.clip);
  } else if (p.turned) {
    const rMax = Math.max(...p.profile.map((q) => q[0]));
    g = moved(lathe(p.profile, rMax > 0.3 ? 32 : 18), p.turned, p.rot);
  } else if (p.tube) {
    g = tube(p.tube, p.r, { radial: p.r > 0.08 ? 14 : 8 });
  } else if (p.ring) {
    g = moved(ring(p.R, p.r, { radial: 10 }), p.ring, p.rot);
  } else if (p.books) {
    const [x0, y0, z0, x1, y1, z1] = p.books;
    g = books(x0, x1, y0, z1, y1 - y0, z1 - z0, p.seed);
  } else if (p.leaves) {
    g = moved(plantLeaves(p), p.leaves);
  } else if (p.swept) {
    g = moved(swept(p.profile, p.a, p.b, p.n, 56), p.swept);
  } else if (p.slab) {
    g = moved(slab(p.a, p.b, p.n, 0, { seg: 48 }), p.slab);
  }
  if (g && p.tint) g = tinted(g, p.tint);
  return g;
}

/** A shape in piece `f`'s frame put on the grid: turned and moved there, and shaded darker low down and underneath. */
function onGrid(g, f, shaded) {
  const [w, d] = f.size;
  const p = new Array(g.p.length), n = new Array(g.n.length), c = new Array(g.p.length);
  for (let v = 0; v < g.p.length; v += 3) {
    const [x, z] = place(g.p[v], g.p[v + 2], w, d, f.turns, f.x, f.z);
    p[v] = x; p[v + 1] = g.p[v + 1] + f.y; p[v + 2] = z;
    const nx = g.n[v], ny = g.n[v + 1], nz = g.n[v + 2];
    const t = ((f.turns % 4) + 4) % 4;
    const [a, b] = t === 1 ? [-nz, nx] : t === 2 ? [-nx, -nz] : t === 3 ? [nz, -nx] : [nx, nz];
    n[v] = a; n[v + 1] = ny; n[v + 2] = b;
    // Darker near the floor, where the light can't get in, and on the undersides of things.
    const h = g.p[v + 1];
    const s = Math.min(1, Math.max(0, h / 0.9));
    let k = shaded ? (0.6 + 0.4 * s * s * (3 - 2 * s)) * (1 - 0.32 * Math.max(0, -ny)) : 1;
    if (g.c) k = [g.c[v] * k, g.c[v + 1] * k, g.c[v + 2] * k];
    else k = [k, k, k];
    c[v] = k[0]; c[v + 1] = k[1]; c[v + 2] = k[2];
  }
  return { p, n, uv: g.uv, i: g.i, c };
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
  for (const f of house.furniture) {
    for (const part of f.parts) {
      if (part.draw === false) continue;
      const g = partShape(part);
      if (!g) continue;
      const mat = part.mat ?? '#8a6a5a';
      if (!buckets.has(mat)) buckets.set(mat, []);
      buckets.get(mat).push(onGrid(g, f, !UNSHADED.has(mat)));
    }
  }
  for (const [name, list] of buckets) {
    const all = joined(list);
    const geometry = new GFX.BufferGeometry();
    geometry.setAttribute('position', new GFX.BufferAttribute(new Float32Array(all.p), 3));
    geometry.setAttribute('normal', new GFX.BufferAttribute(new Float32Array(all.n), 3));
    geometry.setAttribute('uv', new GFX.BufferAttribute(new Float32Array(all.uv), 2));
    geometry.setAttribute('color', new GFX.BufferAttribute(new Float32Array(all.c), 3));
    geometry.setIndex(new GFX.BufferAttribute(all.p.length / 3 > 65535 ? new Uint32Array(all.i) : new Uint16Array(all.i), 1));
    geometry.computeBoundingSphere();
    const mesh = new GFX.Mesh(geometry, material(name));
    mesh.name = `furniture-${name}`;
    mesh.castShadow = !UNSHADED.has(name);
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
  // Brass with some colour of its own: up on a wall all it would reflect is the dark, and all metal it looks black.
  const brass = new GFX.MeshPhysicalMaterial({ name: 'sconce', color: new GFX.Color('#c8a050'), roughness: 0.35, metalness: 0.7 });
  const shade = new GFX.MeshPhysicalMaterial({ name: 'sconce-shade', color: new GFX.Color('#f6e6c0'), emissive: new GFX.Color('#ffc870'), emissiveIntensity: 1.8, roughness: 0.9, side: GFX.DoubleSide });
  const bulbs = [];
  // A brass wall light: a plate on the wall, an arm curling out and up, a cup of a shade on it, lit from inside.
  const sconce = {
    arm: geometry(GFX, joined([
      tube([[0, -0.75, 0], [0, -0.68, 0.1], [0, -0.48, 0.2], [0, -0.28, 0.22]], 0.035, { radial: 8 }),
      // Its back to the wall and a hair off it, domed into the room: a face flat on the wallpaper would flicker with it.
      moved(lathe([[0, 0], [0.14, 0], [0.15, 0.02], [0.1, 0.05], [0, 0.05]], 18), [0, -0.75, 0.01], [Math.PI / 2, 0, 0]),
      moved(lathe([[0, 0], [0.07, 0], [0.08, 0.04], [0.05, 0.08], [0, 0.08]], 14), [0, -0.3, 0.22]),
    ])),
    shade: geometry(GFX, moved(lathe([[0.32, 0], [0.31, 0.04], [0.26, 0.2], [0.22, 0.34], [0.22, 0.36]], 24), [0, -0.3, 0.22])),
  };
  const flex = new GFX.MeshStandardMaterial({ name: 'flex', color: new GFX.Color('#2a2420'), roughness: 0.8 });
  const pendant = {
    cord: geometry(GFX, joined([
      tube([[0, 0.2, 0], [0, 2.5, 0]], 0.02, { radial: 6 }),
      moved(lathe([[0, 0], [0.09, 0], [0.09, 0.2], [0.05, 0.24], [0, 0.24]], 14), [0, 0.02, 0]),
    ])),
    shade: geometry(GFX, lathe([[0.42, -0.2], [0.4, -0.16], [0.26, 0.0], [0.1, 0.1], [0.09, 0.14]], 28)),
  };
  for (const [x, y, z] of house.lamps) {
    const g = new GFX.Group();
    // On the face of the wall toward the room, turned to face into it.
    const cx = Math.floor(x), cz = Math.floor(z);
    const into = [[0, 1], [0, -1], [1, 0], [-1, 0]].find(([dx, dz]) => {
      const n = house.cell(cx + dx, cz + dz);
      return n && n.kind !== 'wall';
    }) ?? [0, 1];
    const onWall = house.cell(cx, cz)?.kind === 'wall';
    g.position.set(x + (onWall ? into[0] * 0.5 : 0), y, z + (onWall ? into[1] * 0.5 : 0));
    if (onWall) g.rotation.y = Math.atan2(into[0], into[1]);
    // On a wall, a sconce; anywhere else, a lamp hanging on its flex from the ceiling, out of sight above.
    const arm = new GFX.Mesh(onWall ? sconce.arm : pendant.cord, onWall ? brass : flex);
    const cup = new GFX.Mesh(onWall ? sconce.shade : pendant.shade, shade);
    g.add(arm, cup);
    arm.castShadow = true;
    group.add(g);
    bulbs.push(onWall ? [g.position.x + into[0] * 0.25, y - 0.15, g.position.z + into[1] * 0.25] : [x, y - 0.25, z]);
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
    ? new GFX.Mesh(geometry(GFX, roundedBox(width + 0.7, 0.4, 0.42, 0.06, 2)), paint)
    : new GFX.Mesh(geometry(GFX, roundedBox(0.42, 0.4, width + 0.7, 0.06, 2)), paint);
  place(lintel, from + width / 2, y + height + 0.17);
  group.add(lintel);
  for (const a of [from - 0.1, to + 0.1]) {
    const post = new GFX.Mesh(geometry(GFX, roundedBox(0.32, height, 0.32, 0.05, 2)), paint);
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
