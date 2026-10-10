import { CAT_HEIGHT, placed } from './furniture.js';
import { World } from './physics.js';

/**
 * A floor of the house is a grid of tiles, as a Dungeon Roller dungeon is:
 * each tile has its own four corner heights, so one structure gives level
 * floors, ramps, steps and stairs, with a wall down to whatever is next to
 * it. Where there is no tile there is the dark — a stairwell, a gap in the
 * attic boards — and the ball falls into it.
 *
 * On top of that a house has walls (tiles raised well above the floor beside
 * them: the rooms are cut away like a doll's house, tall at the back and low
 * at the front so they never hide the ball), floors of wood, carpet, tile,
 * boards or stone, water where something has spilled, a doorway out, the
 * furniture, and everything that lives or lies about: cats, mice, bugs, the
 * vacuum, mousetraps, nails, buttons and skeins.
 *
 * A tile is 30 cm. x runs down-right across the screen and z down-left; the
 * camera looks from high x and z, so a level starts at the back and works
 * its way to the front.
 */

/** How far the sides of a floor reach down into the dark below it. */
export const DEPTH = 6;

/** Walls on the back sides of a room and on the front, above the floor. */
export const WALL = Object.freeze({ back: 3.2, front: 0.6 });

/** What floors are made of: each drawn with its own texture (`scenery.js`). */
export const FLOORS = ['wood', 'carpet', 'tile', 'boards', 'stone'];

/** Corner order: (x, z), (x + 1, z), (x, z + 1), (x + 1, z + 1). */
const H00 = 0, H10 = 1, H01 = 2, H11 = 3;

export class House {
  constructor({ name, depth = 1, cols, rows, palette, intro = '', next = '' }) {
    this.name = name;
    /** Which level it is: 1 for the first. */
    this.depth = depth;
    this.intro = intro;
    /** Where the doorway out leads, for its sign. */
    this.next = next;
    this.cols = cols;
    this.rows = rows;
    this.palette = palette;
    this.cells = new Array(cols * rows).fill(null);
    /** Tiles kept empty — gaps a lift crosses — that no wall is put into. */
    this.open = new Set();
    this.start = { x: 0, z: 0 };
    this.cats = [];
    this.critters = [];
    this.traps = [];
    this.nails = [];
    this.vacuums = [];
    this.lifts = [];
    this.lamps = [];
    this.pickups = [];
    this.furniture = [];
    this.rugs = [];
    this.holes = [];
  }

  cell(x, z) {
    if (x < 0 || z < 0 || x >= this.cols || z >= this.rows) return null;
    return this.cells[z * this.cols + x];
  }

  _check(i, j) {
    if (i < 0 || j < 0 || i >= this.cols || j >= this.rows) throw new Error(`${this.name}: tile ${i},${j} is off the grid`);
  }

  /** Tiles over the rectangle, each corner at `height(X, Z)` (grid coordinates). Floors go over anything. */
  surface(x, z, w, d, height, { floor = 'wood', color = 0, paper = 0, kind = 'floor' } = {}) {
    for (let j = z; j < z + d; j++) {
      for (let i = x; i < x + w; i++) {
        this._check(i, j);
        this.cells[j * this.cols + i] = {
          h: [height(i, j), height(i + 1, j), height(i, j + 1), height(i + 1, j + 1)],
          floor, color, paper, kind,
        };
      }
    }
    return this;
  }

  flat(x, z, w, d, h, opts) {
    return this.surface(x, z, w, d, () => h, opts);
  }

  /** A ramp: `from` along its first edge, `to` along its last, running along `axis`. */
  slope(x, z, w, d, from, to, axis, opts) {
    const along = axis === 'x' ? (X) => (X - x) / w : (X, Z) => (Z - z) / d;
    return this.surface(x, z, w, d, (X, Z) => from + (to - from) * along(X, Z), opts);
  }

  /** A banked channel down, like a laundry chute: level across the middle third. */
  chute(x, z, w, d, from, to, axis, { bank = 0.9, ...opts } = {}) {
    const along = axis === 'x' ? (X) => (X - x) / w : (X, Z) => (Z - z) / d;
    const across = axis === 'x' ? (X, Z) => (Z - z) / d : (X) => (X - x) / w;
    return this.surface(x, z, w, d, (X, Z) => from + (to - from) * along(X, Z) + banked(across(X, Z), bank), opts);
  }

  /**
   * Water, level at `h`: a spill, a puddle, a bath run over. Roll into it
   * and the ball is soaked. With `fill`, only into tiles with nothing in
   * them yet.
   */
  water(x, z, w, d, h, { fill = false, paper = 0 } = {}) {
    for (let j = z; j < z + d; j++) {
      for (let i = x; i < x + w; i++) {
        this._check(i, j);
        if (fill && this.cell(i, j)) continue;
        this.flat(i, j, 1, 1, h, { kind: 'water', floor: 'tile', paper });
      }
    }
    return this;
  }

  /** The doorway out, to the next room. */
  exit(x, z, w, d, h, { paper = 0 } = {}) {
    return this.flat(x, z, w, d, h, { kind: 'exit', floor: 'wood', paper });
  }

  /**
   * Wall over the rectangle, its top at `top`. A wall never goes over floor,
   * and where two walls meet the lower one stands, so a wall that is one
   * room's back wall and another's front never hides the ball in either.
   */
  wall(x, z, w, d, top) {
    for (let j = z; j < z + d; j++) {
      for (let i = x; i < x + w; i++) {
        this._check(i, j);
        const c = this.cells[j * this.cols + i];
        if ((c && c.kind !== 'wall') || this.open.has(j * this.cols + i)) continue;
        const h = c ? Math.min(c.h[0], top) : top;
        this.cells[j * this.cols + i] = { h: [h, h, h, h], kind: 'wall', floor: 'wood', color: 0, paper: 0 };
      }
    }
    return this;
  }

  /**
   * Walls round the rectangle, one tile thick and just outside it, on the
   * `sides` named — x0 and z0 at the back, x1 and z1 at the front — each
   * standing `back` or `front` above the floor beside it. Floors laid after
   * cut doorways through them.
   */
  enclose(x, z, w, d, { sides = 'x0 z0 x1 z1', back = WALL.back, front = WALL.front } = {}) {
    const on = new Set(sides.split(/\s+/));
    const floorBeside = (i, j) => {
      const c = this.cell(Math.max(x, Math.min(x + w - 1, i)), Math.max(z, Math.min(z + d - 1, j)));
      return c && c.kind !== 'wall' ? Math.max(...c.h) : null;
    };
    const put = (i, j, rise) => {
      if (i < 0 || j < 0 || i >= this.cols || j >= this.rows) return;
      const h = floorBeside(i, j);
      if (h !== null) this.wall(i, j, 1, 1, h + rise);
    };
    // A corner only where both its sides are walled, as high as the lower of them.
    const rise = (a, b) => (on.has(a) && on.has(b) ? Math.min(a[1] === '0' ? back : front, b[1] === '0' ? back : front) : Infinity);
    if (on.has('z0')) for (let i = x; i < x + w; i++) put(i, z - 1, back);
    if (on.has('z1')) for (let i = x; i < x + w; i++) put(i, z + d, front);
    if (on.has('x0')) for (let j = z; j < z + d; j++) put(x - 1, j, back);
    if (on.has('x1')) for (let j = z; j < z + d; j++) put(x + w, j, front);
    for (const [i, j, a, b] of [[x - 1, z - 1, 'x0', 'z0'], [x + w, z - 1, 'x1', 'z0'], [x - 1, z + d, 'x0', 'z1'], [x + w, z + d, 'x1', 'z1']]) {
      const r = rise(a, b);
      if (Number.isFinite(r)) put(i, j, r);
    }
    return this;
  }

  /** Walls along the named sides of a piece (dig.js), wherever nothing has been laid against them since. */
  seal(p, sides) {
    return this.enclose(p.x, p.z, p.w, p.d, { sides });
  }

  /** A floor with walls round it: a room, or a hallway if it is narrow. */
  room(x, z, w, d, h, { floor = 'wood', color = 0, paper = 0, ...walls } = {}) {
    this.flat(x, z, w, d, h, { floor, color, paper });
    return this.enclose(x, z, w, d, walls);
  }

  clear(x, z, w, d) {
    for (let j = z; j < z + d; j++) for (let i = x; i < x + w; i++) this.cells[j * this.cols + i] = null;
    return this;
  }

  /** Clears the tiles and keeps them clear of walls dug round them later: a gap, or a lift's way. */
  gap(x, z, w, d) {
    this.clear(x, z, w, d);
    for (let j = z; j < z + d; j++) for (let i = x; i < x + w; i++) this.open.add(j * this.cols + i);
    return this;
  }

  /** A piece of furniture (furniture.js): its back left tile at (x, z), standing on the floor there. */
  put(kind, x, z, opts = {}) {
    const c = this.cell(x, z);
    if (!c || c.kind === 'wall') throw new Error(`${this.name}: a ${kind} at ${x},${z} isn't on the floor`);
    const y = Math.max(...c.h);
    this.furniture.push(placed(kind, x, z, { y, ...opts }));
    return this;
  }

  /** A rug, `pattern` one of scenery.js's, over the tiles (it doesn't change the floor under it). */
  rug(x, z, w, d, { pattern = 'persian', color = '#8a2a2a' } = {}) {
    this.rugs.push({ x, z, w, d, pattern, color });
    this._mark(x, z, w, d, 'rug');
    return this;
  }

  /**
   * A cat (cats.js): `kind` its coat and nature. It stays within `range` of
   * where it starts; `does` is what it does with itself when nothing is
   * going on — 'sit', 'sleep', or 'patrol' round `path` (tile centres).
   */
  cat(kind, x, z, { does = 'sit', path = null, range = 9, facing = 0 } = {}) {
    this.cats.push({ kind, x: x + 0.5, z: z + 0.5, does, range, facing, path: path && path.map(([px, pz]) => [px + 0.5, pz + 0.5]) });
    return this;
  }

  /**
   * A mouse or a bug: something for a cat to watch. A mouse nibbles where
   * it is or runs round `path`, and bolts for `hole` when the ball comes
   * near; a fly buzzes round `path` in the air; a beetle crawls round it.
   */
  critter(kind, x, z, { path = null, hole = null } = {}) {
    this.critters.push({ kind, x: x + 0.5, z: z + 0.5, path: path && path.map(([px, pz]) => [px + 0.5, pz + 0.5]), hole: hole && [hole[0] + 0.5, hole[1] + 0.5] });
    return this;
  }

  /** A mouse hole in the skirting at (x, z), facing the way the room is. */
  hole(x, z, facing = '+z') {
    this.holes.push({ x, z, facing });
    return this;
  }

  /** A mousetrap, set, at (x, z). Roll over it and it snaps on the strand. */
  trap(x, z) {
    this.traps.push({ x: x + 0.5, z: z + 0.5 });
    return this;
  }

  /** A nail standing up out of the boards at (x, z): it catches the strand. */
  nail(x, z) {
    this.nails.push({ x: x + 0.5, z: z + 0.5 });
    this._mark(x, z, 1, 1, 'nail');
    return this;
  }

  /** The robot vacuum, going round `path` (tile centres) at `speed` tiles a second. */
  vacuum(path, { speed = 1.6 } = {}) {
    this.vacuums.push({ path: path.map(([px, pz]) => [px + 0.5, pz + 0.5]), speed });
    return this;
  }

  /** A platform with its top at `h`, gliding out by `to` and back every `period` seconds. */
  lift(x, z, w, d, h, { to, period = 6, phase = 0, pause = 0.26, look = 'board' }) {
    this.lifts.push({ x, z, w, d, h, to, period, phase, pause, look });
    return this;
  }

  /** A light: a lamp on the back wall at (x, z), a little under its top; or, on a floor tile, `up` above it. */
  lamp(x, z, up = 2.6) {
    const c = this.cell(x, z);
    const y = !c ? up : c.kind === 'wall' ? Math.min(...c.h) - 0.7 : Math.max(...c.h) + up;
    this.lamps.push([x + 0.5, y, z + 0.5]);
    return this;
  }

  button(x, z, amount = 1) {
    this.pickups.push({ kind: 'button', x: x + 0.5, z: z + 0.5, amount });
    return this;
  }

  /** A tin of buttons. */
  tin(x, z, amount = 25) {
    this.pickups.push({ kind: 'tin', x: x + 0.5, z: z + 0.5, amount });
    return this;
  }

  /** A skein of red wool: wound onto the ball, `amount` metres. */
  skein(x, z, amount = 8) {
    this.pickups.push({ kind: 'skein', x: x + 0.5, z: z + 0.5, amount });
    return this;
  }

  _mark(x, z, w, d, what) {
    for (let j = z; j < z + d; j++) {
      for (let i = x; i < x + w; i++) {
        const c = this.cell(i, j);
        if (c) c[what] = true;
      }
    }
  }

  /** The height of the floor under (x, z), or null over the dark. */
  heightAt(x, z) {
    const i = Math.floor(x), j = Math.floor(z);
    const c = this.cell(i, j);
    if (!c) return null;
    const u = x - i, w = z - j, h = c.h;
    if (u + w <= 1) return h[H00] + (h[H10] - h[H00]) * u + (h[H01] - h[H00]) * w;
    return h[H11] + (h[H01] - h[H11]) * (1 - u) + (h[H10] - h[H11]) * (1 - w);
  }

  /**
   * Works out, from the furniture, which tiles a cat can't walk on (`block`:
   * something stands right on the floor there) and which it can't get under
   * (`under`: low enough to hide the ball). Called once the level is laid out.
   */
  settle() {
    for (const f of this.furniture) {
      for (const [x0, y0, z0, x1, y1, z1] of f.solids) {
        for (let j = Math.floor(z0 + 0.15); j < Math.ceil(z1 - 0.15); j++) {
          for (let i = Math.floor(x0 + 0.15); i < Math.ceil(x1 - 0.15); i++) {
            const c = this.cell(i, j);
            if (!c) continue;
            const floor = Math.max(...c.h);
            // Thin legs don't fill a tile.
            if ((x1 - x0) < 0.4 && (z1 - z0) < 0.4) continue;
            if (y0 - floor < 0.2) c.block = true;
            else if (y0 - floor < CAT_HEIGHT && y1 - floor > 0) c.under = true;
            // How high what stands here reaches, for what it hides from a cat's eye.
            if (y0 - floor < 0.2) c.top = Math.max(c.top ?? 0, y1);
          }
        }
      }
    }
    for (const c of this.cells) if (c?.block) c.under = false;
    return this;
  }

  /**
   * Somewhere to put the ball back after it is lost: a plain level floor,
   * with nothing round it that drops away and no furniture on it.
   */
  isSafe(x, z) {
    const c = this.cell(x, z);
    if (!c || c.kind !== 'floor' || !isFlat(c) || c.block || c.nail || c.stair) return false;
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const n = this.cell(x + i, z + j);
        if (!n) return false;
        if (n.kind === 'wall' && Math.min(...n.h) >= c.h[0] + 0.3) continue;
        if (n.block) continue;
        if (n.kind === 'water' || !isFlat(n) || Math.abs(n.h[0] - c.h[0]) > 1e-6) return false;
      }
    }
    return true;
  }

  get lowest() {
    let low = Infinity;
    for (const c of this.cells) if (c) low = Math.min(low, ...c.h);
    return low;
  }

  get highest() {
    let high = -Infinity;
    for (const c of this.cells) if (c) high = Math.max(high, ...c.h);
    return high;
  }
}

const isFlat = (c) => c.h.every((v) => Math.abs(v - c.h[0]) < 1e-6);

/** How far up the bank is `u` of the way across a chute: nothing over the middle third, `bank` at the edges. */
function banked(u, bank) {
  const k = Math.max(0, Math.abs(2 * u - 1) * 1.5 - 0.5);
  return bank * Math.min(k * k, 1.8);
}

/** sRGB hex to linear RGB — vertex colours are linear. */
export function linearRGB(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
}

/** A little per-tile variety: the same for the same tile every time. */
export function grain(x, z) {
  let h = (x * 374761393 + z * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * The light baked into the floors and walls: the house at night, a warm
 * pool round every lamp, a glow at the doorway out. The lamps nearest the
 * ball also get real lights when it is drawn (`stage.js`).
 */
export function bakeLight(house) {
  const lamps = [...house.lamps, ...house.furniture.filter((f) => f.lamp).map((f) => f.lamp)];
  const ambient = house.palette.ambient ?? [0.62, 0.56, 0.52];
  const exits = [];
  for (let z = 0; z < house.rows; z++) {
    for (let x = 0; x < house.cols; x++) {
      const c = house.cell(x, z);
      if (c?.kind === 'exit') exits.push([x + 0.5, c.h[0] + 0.8, z + 0.5]);
    }
  }
  const glow = (sources, x, y, z, reach, colour, out) => {
    for (const [sx, sy, sz] of sources) {
      const dx = x - sx, dz = z - sz;
      if (Math.abs(dx) > reach || Math.abs(dz) > reach) continue;
      const d = Math.hypot(dx, (y - sy) * 0.6, dz);
      if (d >= reach) continue;
      const k = (1 - d / reach) ** 2;
      out[0] += colour[0] * k; out[1] += colour[1] * k; out[2] += colour[2] * k;
    }
  };
  return (x, y, z) => {
    const out = [...ambient];
    glow(lamps, x, y, z, 8, [0.85, 0.6, 0.32], out);
    glow(exits, x, y, z, 4, [0.6, 0.45, 0.25], out);
    return out.map((v) => Math.min(1.7, v));
  };
}

/** The faces of a box as triangles, outward. */
function boxTriangles(world, [x0, y0, z0, x1, y1, z1]) {
  const q = (a, b, c, d) => { world.addTriangle(...a, ...b, ...c); world.addTriangle(...a, ...c, ...d); };
  const p = (x, y, z) => [x, y, z];
  q(p(x0, y1, z0), p(x0, y1, z1), p(x1, y1, z1), p(x1, y1, z0)); // top
  q(p(x0, y0, z0), p(x1, y0, z0), p(x1, y0, z1), p(x0, y0, z1)); // bottom
  q(p(x0, y0, z0), p(x0, y1, z0), p(x1, y1, z0), p(x1, y0, z0)); // −z
  q(p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1)); // +z
  q(p(x0, y0, z0), p(x0, y0, z1), p(x0, y1, z1), p(x0, y1, z0)); // −x
  q(p(x1, y0, z0), p(x1, y1, z0), p(x1, y1, z1), p(x1, y0, z1)); // +x
}

/**
 * Everything drawn and everything collided with, from the tiles: the floors
 * (a mesh for each of wood, carpet, tile, boards and stone), the tops of the
 * walls (cut away, as a doll's house's are), the walls themselves (papered,
 * with a skirting board), the steps between floors, the sides down into the
 * dark, the water, and a World holding all of it, and the furniture, as
 * triangles for the physics.
 */
export function buildHouse(house) {
  const world = new World({ cols: house.cols, rows: house.rows });
  const part = () => ({ position: [], normal: [], color: [], uv: [] });
  const floors = Object.fromEntries(FLOORS.map((f) => [f, part()]));
  const caps = part(), walls = part(), risers = part(), sides = part(), water = part();
  const palette = house.palette;
  const tint = (f, i) => {
    const list = palette.floors?.[f] ?? ['#c8b8a0'];
    return linearRGB(list[((i % list.length) + list.length) % list.length]);
  };
  const papers = (palette.papers ?? ['#d8c8a8']).map(linearRGB);
  const capColour = linearRGB(palette.cap ?? '#3a302a');
  const riserColour = linearRGB(palette.riser ?? '#e8e0d0');
  const sideColour = linearRGB(palette.side ?? '#5a4636');
  const light = bakeLight(house);

  const normalOf = (a, b, c) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    return [nx / l, ny / l, nz / l];
  };
  const lit = (base, p) => {
    const l = light(p[0], p[1], p[2]);
    return [base[0] * l[0], base[1] * l[1], base[2] * l[2]];
  };
  const face = (out, a, b, c, normal, colours, uvs) => {
    out.position.push(...a, ...b, ...c);
    for (let k = 0; k < 3; k++) out.normal.push(...normal);
    out.color.push(...colours[0], ...colours[1], ...colours[2]);
    out.uv.push(...uvs[0], ...uvs[1], ...uvs[2]);
  };

  /**
   * One upright face: the polygon between the bottom line and the top along
   * the edge p0 → p1, facing `out`. `base` is the height its texture starts
   * from (the floor it stands on), `colour(y)` its colour by height.
   */
  const upright = (into, p0, p1, poly, out, colour, base) => {
    const at = (t, y) => [p0[0] + (p1[0] - p0[0]) * t, y, p0[1] + (p1[1] - p0[1]) * t];
    const pts = poly.map(([t, y]) => at(t, y));
    const along = (p) => (Math.abs(p1[0] - p0[0]) > 0 ? p[0] : p[2]);
    for (let k = 1; k < pts.length - 1; k++) {
      let a = pts[0], b = pts[k], c = pts[k + 1];
      let n = normalOf(a, b, c);
      if (n[0] * out[0] + n[2] * out[2] < 0) { [b, c] = [c, b]; n = normalOf(a, b, c); }
      world.addTriangle(...a, ...b, ...c);
      if (into) face(into, a, b, c, n, [a, b, c].map((p) => lit(colour(p[1]), p)), [a, b, c].map((p) => [along(p), p[1] - base]));
    }
  };

  for (let z = 0; z < house.rows; z++) {
    for (let x = 0; x < house.cols; x++) {
      const c = house.cell(x, z);
      if (!c) continue;
      const [h00, h10, h01, h11] = c.h;
      const A = [x, h00, z], B = [x + 1, h10, z], C = [x, h01, z + 1], D = [x + 1, h11, z + 1];
      let out, base;
      if (c.kind === 'water') { out = water; base = [1, 1, 1]; }
      else if (c.kind === 'wall') { out = caps; base = capColour; }
      else { out = floors[c.floor] ?? floors.wood; base = tint(c.floor, c.color); }
      const vary = c.kind === 'wall' || c.kind === 'water' ? 1 : 0.9 + 0.16 * grain(x, z);
      const col = base.map((v) => v * vary);
      const shade = (p) => (c.kind === 'water' || c.kind === 'wall' ? col : lit(col, p));
      const uv = (p) => [p[0], p[2]];
      face(out, A, C, B, normalOf(A, C, B), [shade(A), shade(C), shade(B)], [uv(A), uv(C), uv(B)]);
      face(out, B, C, D, normalOf(B, C, D), [shade(B), shade(C), shade(D)], [uv(B), uv(C), uv(D)]);
      world.addTriangle(...A, ...C, ...B);
      world.addTriangle(...B, ...C, ...D);

      // The sides: down to the next tile, or into the dark.
      const low = Math.min(...c.h) - DEPTH;
      const edges = [
        [[x, z], [x + 1, z], h00, h10, house.cell(x, z - 1), (n) => [n.h[H01], n.h[H11]], [0, 0, -1]],
        [[x, z + 1], [x + 1, z + 1], h01, h11, house.cell(x, z + 1), (n) => [n.h[H00], n.h[H10]], [0, 0, 1]],
        [[x, z], [x, z + 1], h00, h01, house.cell(x - 1, z), (n) => [n.h[H10], n.h[H11]], [-1, 0, 0]],
        [[x + 1, z], [x + 1, z + 1], h10, h11, house.cell(x + 1, z), (n) => [n.h[H00], n.h[H01]], [1, 0, 0]],
      ];
      for (const [p0, p1, a0, a1, n, theirs, outward] of edges) {
        const [b0, b1] = n ? theirs(n) : [low, low];
        const d0 = a0 - b0, d1 = a1 - b1;
        if (d0 <= 1e-6 && d1 <= 1e-6) continue;
        // Papered where a wall faces a room; a riser where a floor steps down to another; the dark's edge otherwise.
        let into, colour, from = Math.min(b0, b1);
        if (!n) {
          into = sides;
          const top = Math.max(a0, a1);
          colour = (y) => {
            const k = Math.max(0, Math.min(1, 1 - (top - y) / DEPTH));
            return sideColour.map((v) => v * (0.08 + 0.92 * k * k));
          };
        } else if (c.kind === 'wall' && n.kind !== 'wall') {
          into = walls;
          const paper = papers[((n.paper ?? 0) % papers.length + papers.length) % papers.length];
          colour = () => paper;
        } else if (c.kind === 'wall') {
          into = caps;
          colour = () => capColour;
        } else {
          into = risers;
          colour = () => riserColour;
          from = Math.min(b0, b1);
        }
        const poly = d0 >= -1e-6 && d1 >= -1e-6
          ? [[0, b0], [1, b1], [1, a1], [0, a0]]
          : (() => {
            // The two edges cross: this tile is higher on one side of the crossing only.
            const t = d0 / (d0 - d1);
            const ym = a0 + (a1 - a0) * t;
            return d0 > 0 ? [[0, b0], [t, ym], [0, a0]] : [[1, b1], [1, a1], [t, ym]];
          })();
        upright(into, p0, p1, poly, outward, colour, from);
      }
    }
  }

  for (const f of house.furniture) for (const b of f.solids) boxTriangles(world, b);

  world.finish();
  const typed = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, new Float32Array(v)]));
  return {
    floors: Object.fromEntries(Object.entries(floors).map(([k, v]) => [k, typed(v)])),
    caps: typed(caps), walls: typed(walls), risers: typed(risers), sides: typed(sides), water: typed(water), world,
  };
}
