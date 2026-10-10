/**
 * How the cats find their way about a floor of the house: which tiles a
 * cat can stand on, a field of distances to wherever it is going over them
 * (worked out afresh as the target moves, but only so far out), and what a
 * cat can see from where it is — walls and anything tall in the way hide
 * the ball, and so does being under the sofa.
 */

/** A cat steps up or down this much between tiles, and no more: a stair, not a ledge. */
export const CAT_STEP = 1.05;

const SQRT2 = Math.SQRT2;
const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, SQRT2], [1, -1, SQRT2], [-1, 1, SQRT2], [-1, -1, SQRT2]];

export function createNav(house) {
  const { cols, rows } = house;
  const n = cols * rows;
  const walk = new Uint8Array(n);
  const floor = new Float32Array(n);
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      const c = house.cell(x, z);
      const i = z * cols + x;
      if (!c) continue;
      floor[i] = (c.h[0] + c.h[1] + c.h[2] + c.h[3]) / 4;
      const flat = Math.max(...c.h) - Math.min(...c.h) < 0.7;
      walk[i] = (c.kind === 'floor' || c.kind === 'exit') && !c.block && !c.under && flat ? 1 : 0;
    }
  }
  const at = (x, z) => (x < 0 || z < 0 || x >= cols || z >= rows ? -1 : z * cols + x);
  const can = (i) => i >= 0 && walk[i] === 1;
  const passes = (i, j) => can(i) && can(j) && Math.abs(floor[i] - floor[j]) <= CAT_STEP;

  /** Distances (in tiles, by cat) from every tile within `reach` of (tx, tz) to it; Infinity where it can't be reached. */
  function field(tx, tz, reach = 22) {
    const dist = new Float32Array(n).fill(Infinity);
    let start = at(Math.floor(tx), Math.floor(tz));
    if (!can(start)) {
      // Under the sofa, say: from the nearest tile a cat can stand on.
      let best = -1, bestD = Infinity;
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          const i = at(Math.floor(tx) + dx, Math.floor(tz) + dz);
          if (!can(i)) continue;
          const d = Math.hypot(dx, dz);
          if (d < bestD) { bestD = d; best = i; }
        }
      }
      start = best;
      if (start < 0) return dist;
    }
    // Dijkstra over the grid, on a binary heap of [distance, tile].
    dist[start] = 0;
    const heap = new Heap();
    heap.push(0, start);
    while (heap.size) {
      const [d0, i] = heap.pop();
      if (d0 > dist[i] || d0 > reach) continue;
      const x = i % cols, z = (i - x) / cols;
      for (const [dx, dz, cost] of DIRS) {
        const j = at(x + dx, z + dz);
        if (!passes(i, j)) continue;
        // No cutting a corner round a wall or a chair.
        if (dx && dz && (!passes(i, at(x + dx, z)) || !passes(i, at(x, z + dz)))) continue;
        const d = d0 + cost;
        if (d < dist[j]) { dist[j] = d; heap.push(dist[j], j); }
      }
    }
    return dist;
  }

  /** Where to head next, from (x, z), down `dist` toward its target: a tile centre, or null if there's no way. */
  function next(dist, x, z) {
    const cx = Math.floor(x), cz = Math.floor(z);
    const here = at(cx, cz);
    let best = here >= 0 ? dist[here] : Infinity, to = null;
    for (const [dx, dz] of DIRS) {
      const j = at(cx + dx, cz + dz);
      if (j < 0 || !(dist[j] < best)) continue;
      if (here >= 0 && !passes(here, j)) continue;
      if (dx && dz && here >= 0 && (!passes(here, at(cx + dx, cz)) || !passes(here, at(cx, cz + dz)))) continue;
      best = dist[j];
      to = [cx + dx + 0.5, cz + dz + 0.5];
    }
    return to;
  }

  /**
   * Whether an eye at (ax, ay, az) can see a point at (bx, by, bz): nothing
   * in the way that stands higher than the line between them.
   */
  function sight(ax, ay, az, bx, by, bz) {
    const d = Math.hypot(bx - ax, bz - az);
    const steps = Math.ceil(d / 0.25);
    for (let k = 1; k < steps; k++) {
      const t = k / steps;
      const x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = ay + (by - ay) * t;
      const c = house.cell(Math.floor(x), Math.floor(z));
      if (!c) continue;
      if (c.kind === 'wall' && Math.min(...c.h) > y) return false;
      if (c.top !== undefined && c.top > y) return false;
      const f = Math.max(...c.h);
      if (f > y + 0.05) return false;
    }
    return true;
  }

  /** Whether (x, z) is somewhere a cat can stand. */
  const standable = (x, z) => can(at(Math.floor(x), Math.floor(z)));

  /** The height of the floor a cat stands on at (x, z). */
  const ground = (x, z) => house.heightAt(x, z) ?? 0;

  return { field, next, sight, standable, ground, walk, cols, rows };
}

/** A binary min-heap of (key, value) pairs. */
class Heap {
  constructor() { this.keys = []; this.values = []; }
  get size() { return this.keys.length; }
  push(k, v) {
    const { keys, values } = this;
    let i = keys.length;
    keys.push(k); values.push(v);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (keys[p] <= k) break;
      keys[i] = keys[p]; values[i] = values[p];
      i = p;
    }
    keys[i] = k; values[i] = v;
  }
  pop() {
    const { keys, values } = this;
    const top = [keys[0], values[0]];
    const k = keys.pop(), v = values.pop();
    if (keys.length) {
      let i = 0;
      const n = keys.length;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i, mk = k;
        if (l < n && keys[l] < mk) { m = l; mk = keys[l]; }
        if (r < n && keys[r] < mk) { m = r; }
        if (m === i) break;
        keys[i] = keys[m]; values[i] = values[m];
        i = m;
      }
      keys[i] = k; values[i] = v;
    }
    return top;
  }
}
