/**
 * Shapes for the furniture and the props, made here rather than out of
 * plain boxes and cylinders: boxes with their edges rounded over, plump
 * cushions (superellipsoids), anything turned on a lathe (legs, lamps,
 * pots, bowls), tubes swept along a path, leaves, and rows of books.
 *
 * A shape is plain arrays — { p: positions, n: normals, uv, i: indices,
 * c: colours (or none) } — in tiles, with texture coordinates in tiles too,
 * so cloth and grain come out the same size on everything. `moved` turns
 * and moves one; the furniture (scenery.js) puts them in place and merges
 * them, a mesh to a material.
 */

const TAU = Math.PI * 2;

/** An empty shape to add to. */
function blank() {
  return { p: [], n: [], uv: [], i: [], c: null };
}

/** The rotation matrix (rows) for Euler angles x, then y, then z. */
export function rotation([rx = 0, ry = 0, rz = 0] = []) {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  return [
    [cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx],
    [sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx],
    [-sy, cy * sx, cy * cx],
  ];
}

/** `g` turned by `rot` (Euler angles) about its origin, then moved to `at`. */
export function moved(g, at = [0, 0, 0], rot = null) {
  const R = rot ? rotation(rot) : null;
  const p = new Array(g.p.length), n = new Array(g.n.length);
  for (let v = 0; v < g.p.length; v += 3) {
    let x = g.p[v], y = g.p[v + 1], z = g.p[v + 2];
    let a = g.n[v], b = g.n[v + 1], c = g.n[v + 2];
    if (R) {
      [x, y, z] = [R[0][0] * x + R[0][1] * y + R[0][2] * z, R[1][0] * x + R[1][1] * y + R[1][2] * z, R[2][0] * x + R[2][1] * y + R[2][2] * z];
      [a, b, c] = [R[0][0] * a + R[0][1] * b + R[0][2] * c, R[1][0] * a + R[1][1] * b + R[1][2] * c, R[2][0] * a + R[2][1] * b + R[2][2] * c];
    }
    p[v] = x + at[0]; p[v + 1] = y + at[1]; p[v + 2] = z + at[2];
    n[v] = a; n[v + 1] = b; n[v + 2] = c;
  }
  return { p, n, uv: g.uv, i: g.i, c: g.c };
}

/** Shapes as one. */
export function joined(list) {
  const out = blank();
  const coloured = list.some((g) => g.c);
  if (coloured) out.c = [];
  for (const g of list) {
    const base = out.p.length / 3;
    out.p.push(...g.p); out.n.push(...g.n); out.uv.push(...g.uv);
    for (const k of g.i) out.i.push(k + base);
    if (coloured) {
      if (g.c) out.c.push(...g.c);
      else for (let v = 0; v < g.p.length / 3; v++) out.c.push(1, 1, 1);
    }
  }
  return out;
}

/** Every vertex of `g` coloured `rgb` (0–1 each). */
export function tinted(g, rgb) {
  const c = [];
  for (let v = 0; v < g.p.length / 3; v++) c.push(rgb[0], rgb[1], rgb[2]);
  return { ...g, c };
}

/**
 * A box `w` × `h` × `d`, centred on the origin, its edges and corners
 * rounded over by `r`, `seg` steps to each round. Texture runs along x on
 * the top and the front, along z on the sides.
 */
export function roundedBox(w, h, d, r = 0.04, seg = 3) {
  const H = [w / 2, h / 2, d / 2];
  r = Math.max(0, Math.min(r, H[0], H[1], H[2]));
  const inner = H.map((v) => v - r);
  /** Where the grid lines go along an axis of half-size `h`: close together round the edges. */
  const lines = (h) => {
    const out = [];
    const steps = r > 0 ? seg : 0;
    for (let k = 0; k <= steps; k++) out.push(-h + r * (1 - Math.cos((k / Math.max(1, steps)) * Math.PI / 2)));
    if (h - r > 1e-6) for (let k = steps; k >= 0; k--) out.push(h - r * (1 - Math.cos((k / Math.max(1, steps)) * Math.PI / 2)));
    return out.filter((v, i, a) => i === 0 || Math.abs(v - a[i - 1]) > 1e-7);
  };
  const L = H.map(lines);
  const g = blank();
  // Each face: the axis it faces along, which way, and the two axes across it (texture u, v).
  const faces = [[1, 1, 0, 2], [1, -1, 0, 2], [2, 1, 0, 1], [2, -1, 0, 1], [0, 1, 2, 1], [0, -1, 2, 1]];
  for (const [a, s, u, v] of faces) {
    const base = g.p.length / 3;
    const U = L[u], V = L[v];
    for (const y of V) {
      for (const x of U) {
        const q = [0, 0, 0];
        q[a] = s * H[a]; q[u] = x; q[v] = y;
        const c = q.map((t, k) => Math.max(-inner[k], Math.min(inner[k], t)));
        let nrm = [q[0] - c[0], q[1] - c[1], q[2] - c[2]];
        const l = Math.hypot(...nrm);
        if (l < 1e-9) { nrm = [0, 0, 0]; nrm[a] = s; } else nrm = nrm.map((t) => t / l);
        g.p.push(c[0] + nrm[0] * r, c[1] + nrm[1] * r, c[2] + nrm[2] * r);
        g.n.push(...nrm);
        g.uv.push(x + H[u], y + H[v]);
      }
    }
    // Which way round the quads go, so they face out.
    const du = [0, 0, 0], dv = [0, 0, 0];
    du[u] = 1; dv[v] = 1;
    const cross = [du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]];
    const flip = cross[a] * s < 0;
    const nu = U.length;
    for (let j = 0; j < V.length - 1; j++) {
      for (let k = 0; k < nu - 1; k++) {
        const p00 = base + j * nu + k, p10 = p00 + 1, p01 = p00 + nu, p11 = p01 + 1;
        if (flip) g.i.push(p00, p01, p10, p10, p01, p11);
        else g.i.push(p00, p10, p01, p10, p11, p01);
      }
    }
  }
  return g;
}

const spow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);

/**
 * A cushion: a superellipsoid `w` × `h` × `d` centred on the origin — `up`
 * how round it is top to bottom (1 a ball, small a slab with crisp edges),
 * `round` how round in plan.
 */
export function cushion(w, h, d, { up = 0.5, round = 0.3, seg = [28, 14] } = {}) {
  const a = w / 2, b = h / 2, c = d / 2;
  const [su, sv] = seg;
  const g = blank();
  for (let j = 0; j <= sv; j++) {
    const eta = -Math.PI / 2 + (j / sv) * Math.PI;
    const ce = Math.cos(eta), se = Math.sin(eta);
    for (let k = 0; k <= su; k++) {
      const om = -Math.PI + (k / su) * TAU;
      const co = Math.cos(om), so = Math.sin(om);
      const x = a * spow(ce, up) * spow(co, round), y = b * spow(se, up), z = c * spow(ce, up) * spow(so, round);
      let nx = spow(ce, 2 - up) * spow(co, 2 - round) / a, ny = spow(se, 2 - up) / b, nz = spow(ce, 2 - up) * spow(so, 2 - round) / c;
      const l = Math.hypot(nx, ny, nz) || 1;
      if (j === 0 || j === sv) { nx = 0; ny = j === 0 ? -1 : 1; nz = 0; } else { nx /= l; ny /= l; nz /= l; }
      g.p.push(x, y, z); g.n.push(nx, ny, nz);
      g.uv.push((k / su) * (w + d) * 2, (j / sv) * (h + Math.min(w, d)));
    }
  }
  for (let j = 0; j < sv; j++) {
    for (let k = 0; k < su; k++) {
      const p00 = j * (su + 1) + k, p10 = p00 + 1, p01 = p00 + su + 1, p11 = p01 + 1;
      g.i.push(p00, p01, p10, p10, p01, p11);
    }
  }
  return g;
}

/**
 * Turned on a lathe about the y axis: `profile` is [[radius, y], ...] from
 * the bottom up. A point given twice makes a crisp edge there.
 */
export function lathe(profile, seg = 24) {
  const g = blank();
  const m = profile.length;
  // Each point's normal in the profile: square to the line through it (a doubled point keeps both sides apart).
  const norms = profile.map((pt, j) => {
    const prev = profile[j - 1], next = profile[j + 1];
    const same = (q) => q && Math.abs(q[0] - pt[0]) < 1e-9 && Math.abs(q[1] - pt[1]) < 1e-9;
    const before = prev && !same(prev) ? prev : null, after = next && !same(next) ? next : null;
    let dr, dy;
    if (same(next)) { dr = pt[0] - (before ?? pt)[0]; dy = pt[1] - (before ?? pt)[1]; }
    else if (same(prev)) { dr = (after ?? pt)[0] - pt[0]; dy = (after ?? pt)[1] - pt[1]; }
    else { dr = (after ?? pt)[0] - (before ?? pt)[0]; dy = (after ?? pt)[1] - (before ?? pt)[1]; }
    const l = Math.hypot(dr, dy) || 1;
    return [dy / l, -dr / l];
  });
  let along = 0;
  const vs = profile.map((pt, j) => (j ? (along += Math.hypot(pt[0] - profile[j - 1][0], pt[1] - profile[j - 1][1])) : 0));
  const rMax = Math.max(...profile.map((q) => q[0]));
  for (let k = 0; k <= seg; k++) {
    const t = (k / seg) * TAU, s = Math.sin(t), c = Math.cos(t);
    for (let j = 0; j < m; j++) {
      const [r, y] = profile[j], [nr, ny] = norms[j];
      g.p.push(r * s, y, r * c);
      g.n.push(nr * s, ny, nr * c);
      g.uv.push((k / seg) * TAU * rMax, vs[j]);
    }
  }
  for (let k = 0; k < seg; k++) {
    for (let j = 0; j < m - 1; j++) {
      const a = k * m + j, b = (k + 1) * m + j;
      g.i.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return g;
}

/** A ball of radius r. */
export function ball(r, seg = 20) {
  const profile = [];
  const n = Math.max(6, Math.round(seg / 2));
  for (let j = 0; j <= n; j++) {
    const a = -Math.PI / 2 + (j / n) * Math.PI;
    profile.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  profile[0][0] = 0; profile[n][0] = 0;
  return lathe(profile, seg);
}

/** A tube of radius `r` along `points`, `radial` sides round; its ends capped if `caps`. */
export function tube(points, r, { radial = 10, caps = true } = {}) {
  const g = blank();
  const m = points.length;
  const T = points.map((p, k) => {
    const a = points[Math.max(0, k - 1)], b = points[Math.min(m - 1, k + 1)];
    const t = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const l = Math.hypot(...t) || 1;
    return t.map((v) => v / l);
  });
  // A frame carried along without twisting.
  let N = Math.abs(T[0][1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const frames = [];
  for (let k = 0; k < m; k++) {
    const t = T[k];
    const d = N[0] * t[0] + N[1] * t[1] + N[2] * t[2];
    N = [N[0] - d * t[0], N[1] - d * t[1], N[2] - d * t[2]];
    const l = Math.hypot(...N) || 1;
    N = N.map((v) => v / l);
    const B = [t[1] * N[2] - t[2] * N[1], t[2] * N[0] - t[0] * N[2], t[0] * N[1] - t[1] * N[0]];
    frames.push([N, B]);
  }
  let along = 0;
  for (let k = 0; k < m; k++) {
    if (k) along += Math.hypot(points[k][0] - points[k - 1][0], points[k][1] - points[k - 1][1], points[k][2] - points[k - 1][2]);
    const [N2, B] = frames[k];
    const rk = Array.isArray(r) ? r[k] : r;
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * TAU, c = Math.cos(a), s = Math.sin(a);
      const nx = N2[0] * c + B[0] * s, ny = N2[1] * c + B[1] * s, nz = N2[2] * c + B[2] * s;
      g.p.push(points[k][0] + nx * rk, points[k][1] + ny * rk, points[k][2] + nz * rk);
      g.n.push(nx, ny, nz);
      g.uv.push((j / radial) * TAU * rk, along);
    }
  }
  const per = radial + 1;
  for (let k = 0; k < m - 1; k++) {
    for (let j = 0; j < radial; j++) {
      const a = k * per + j, b = a + per;
      g.i.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  if (caps) {
    for (const [k, sgn] of [[0, -1], [m - 1, 1]]) {
      const centre = g.p.length / 3;
      const t = T[k];
      g.p.push(...points[k]); g.n.push(t[0] * sgn, t[1] * sgn, t[2] * sgn); g.uv.push(0, 0);
      const ring = g.p.length / 3;
      const rk = Array.isArray(r) ? r[k] : r;
      const [N2, B] = frames[k];
      for (let j = 0; j <= radial; j++) {
        const a = (j / radial) * TAU, c = Math.cos(a), s = Math.sin(a);
        g.p.push(points[k][0] + (N2[0] * c + B[0] * s) * rk, points[k][1] + (N2[1] * c + B[1] * s) * rk, points[k][2] + (N2[2] * c + B[2] * s) * rk);
        g.n.push(t[0] * sgn, t[1] * sgn, t[2] * sgn); g.uv.push(c * rk, s * rk);
      }
      for (let j = 0; j < radial; j++) {
        if (sgn > 0) g.i.push(centre, ring + j, ring + j + 1);
        else g.i.push(centre, ring + j + 1, ring + j);
      }
    }
  }
  return g;
}

/** A ring: a tube of radius r round a circle of radius R, in the x–z plane. */
export function ring(R, r, { seg = 32, radial = 10 } = {}) {
  const pts = [];
  for (let k = 0; k <= seg; k++) {
    const a = (k / seg) * TAU;
    pts.push([Math.cos(a) * R, 0, Math.sin(a) * R]);
  }
  return tube(pts, r, { radial, caps: false });
}

/**
 * A leaf from the origin out along +z, `len` long and `wide` across: folded
 * a little along its midrib, curving down toward its tip by `droop`.
 * Two-sided: the material should show both faces.
 */
export function leaf(len, wide, { droop = 0.35, fold = 0.25, steps = 8 } = {}) {
  const g = blank();
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const half = wide * 0.5 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.75);
    const z = t * len * (1 - droop * 0.3 * t), y = -droop * len * t * t;
    // Down the edges by the fold, so the midrib stands up.
    for (const side of [-1, 0, 1]) {
      g.p.push(side * half, y + (side ? -fold * half : 0), z);
      const nx = side ? -side * fold : 0;
      const ny = 1;
      const nz = 2 * droop * t;
      const l = Math.hypot(nx, ny, nz);
      g.n.push(nx / l, ny / l, nz / l);
      g.uv.push((side + 1) * 0.5 * wide, t * len);
    }
  }
  for (let k = 0; k < steps; k++) {
    for (let s = 0; s < 2; s++) {
      const a = k * 3 + s, b = a + 3;
      g.i.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return g;
}

/**
 * A row of books standing on a shelf from x0 to x1, their spines facing +z
 * at z1, as tall as up to `h` and as deep as `d`; a few leaning, a gap now
 * and then. Coloured by vertex (the material should be white).
 */
export function books(x0, x1, y, z1, h, d, seed = 1) {
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const colours = [[0.42, 0.12, 0.1], [0.12, 0.22, 0.36], [0.18, 0.3, 0.18], [0.5, 0.36, 0.14], [0.3, 0.18, 0.3], [0.12, 0.1, 0.1], [0.62, 0.3, 0.16], [0.72, 0.66, 0.5], [0.2, 0.32, 0.34]];
  const list = [];
  let x = x0 + 0.03;
  while (x < x1 - 0.12) {
    const w = 0.07 + rnd() * 0.11, bh = h * (0.68 + rnd() * 0.3), bd = d * (0.75 + rnd() * 0.22);
    if (x + w > x1 - 0.03) break;
    if (rnd() < 0.06) { x += 0.15 + rnd() * 0.2; continue; }
    const c = colours[Math.floor(rnd() * colours.length)].map((v) => v * (0.8 + rnd() * 0.4));
    const lean = rnd() < 0.08 ? (rnd() - 0.5) * 0.5 : 0;
    const book = tinted(roundedBox(w, bh, bd, 0.015, 1), c);
    list.push(moved(book, [x + w / 2 + Math.sin(lean) * bh * 0.5, y + bh / 2 * Math.cos(lean), z1 - bd / 2], [0, 0, -lean]));
    x += w + 0.005;
  }
  return joined(list);
}

/**
 * A rounded rectangle in plan (a superellipse, half-sizes `a` along x and
 * `b` along z, `n` how square: 2 an ellipse, higher squarer), with a
 * profile swept round it: [[out, y], ...] from the bottom up, `out` how far
 * outside the curve (negative inside). A bath, a basin, a bowl.
 */
export function swept(profile, a, b, n = 4, seg = 48) {
  const g = blank();
  const m = profile.length;
  const plan = [];
  for (let k = 0; k <= seg; k++) {
    const t = (k / seg) * TAU, c = Math.cos(t), s = Math.sin(t);
    const x = a * spow(c, 2 / n), z = b * spow(s, 2 / n);
    // Outward, from the curve's gradient.
    let nx = spow(x / a, n - 1) / a, nz = spow(z / b, n - 1) / b;
    const l = Math.hypot(nx, nz) || 1;
    nx /= l; nz /= l;
    plan.push([x, z, nx, nz]);
  }
  const norms = profile.map((pt, j) => {
    const prev = profile[Math.max(0, j - 1)], next = profile[Math.min(m - 1, j + 1)];
    const dr = next[0] - prev[0], dy = next[1] - prev[1];
    const l = Math.hypot(dr, dy) || 1;
    return [dy / l, -dr / l];
  });
  let along = 0;
  const vs = profile.map((pt, j) => (j ? (along += Math.hypot(pt[0] - profile[j - 1][0], pt[1] - profile[j - 1][1])) : 0));
  let round = 0;
  for (let k = 0; k <= seg; k++) {
    const [x, z, nx, nz] = plan[k];
    if (k) round += Math.hypot(x - plan[k - 1][0], z - plan[k - 1][1]);
    for (let j = 0; j < m; j++) {
      const [o, y] = profile[j], [nr, ny] = norms[j];
      g.p.push(x + nx * o, y, z + nz * o);
      g.n.push(nx * nr, ny, nz * nr);
      g.uv.push(round, vs[j]);
    }
  }
  for (let k = 0; k < seg; k++) {
    for (let j = 0; j < m - 1; j++) {
      const p = k * m + j, q = (k + 1) * m + j;
      g.i.push(p, p + 1, q, q, p + 1, q + 1);
    }
  }
  return g;
}

/** A flat rounded rectangle (as `swept`'s plan, `inset` in from it) at height y, facing up (or down). */
export function slab(a, b, n = 4, y = 0, { inset = 0, down = false, seg = 48 } = {}) {
  const g = blank();
  g.p.push(0, y, 0); g.n.push(0, down ? -1 : 1, 0); g.uv.push(0, 0);
  for (let k = 0; k <= seg; k++) {
    const t = (k / seg) * TAU, c = Math.cos(t), s = Math.sin(t);
    const x = (a - inset) * spow(c, 2 / n), z = (b - inset) * spow(s, 2 / n);
    g.p.push(x, y, z); g.n.push(0, down ? -1 : 1, 0); g.uv.push(x, z);
  }
  for (let k = 1; k <= seg; k++) {
    if (down) g.i.push(0, k, k + 1);
    else g.i.push(0, k + 1, k);
  }
  return g;
}

/** A shape as a mesh's geometry, for the engine (`GFX`). */
export function geometry(GFX, g) {
  const out = new GFX.BufferGeometry();
  out.setAttribute('position', new GFX.BufferAttribute(new Float32Array(g.p), 3));
  out.setAttribute('normal', new GFX.BufferAttribute(new Float32Array(g.n), 3));
  out.setAttribute('uv', new GFX.BufferAttribute(new Float32Array(g.uv), 2));
  if (g.c) out.setAttribute('color', new GFX.BufferAttribute(new Float32Array(g.c), 3));
  out.setIndex(new GFX.BufferAttribute(g.p.length / 3 > 65535 ? new Uint32Array(g.i) : new Uint16Array(g.i), 1));
  out.computeBoundingSphere();
  return out;
}

/** A coil of wire: `turns` round the x axis, radius R, along x from −len/2 to len/2. */
export function coil(R, r, len, turns, { steps = 12 } = {}) {
  const pts = [];
  const n = Math.round(turns * steps);
  for (let k = 0; k <= n; k++) {
    const a = (k / steps) * TAU;
    pts.push([-len / 2 + (k / n) * len, Math.sin(a) * R, Math.cos(a) * R]);
  }
  return tube(pts, r, { radial: 6, caps: true });
}
