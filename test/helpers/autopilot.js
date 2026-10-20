/**
 * An autopilot for the rooms, as Dungeon Roller has one for its dungeons.
 * It plans its own way through — tile by tile, over floor the ball can roll
 * onto, down steps it can survive, round the furniture and the water, wide
 * of the mousetraps and the nails — then rolls the ball along the plan
 * with the same push the controls give, keeping out of the vacuum's way. The cats are
 * left out of it (nothing sees the ball): what it shows is that every room
 * can be rolled through from the basket to the doorway.
 */

import * as GFX from 'madness-engine/gfx';
import { createBall } from 'madness-engine/heroes/yarn/ball';
import { FALL_LIMIT } from 'madness-engine/physics';
import { createSneak, putBack, STEP, stepSneak } from '../../src/sneak.js';

/** The furthest it will drop: well short of a drop that hurts. */
export const DROP = FALL_LIMIT * 0.6;

const NEIGHBOURS = [
  [0, -1, (c) => [c.h[0], c.h[1]], (n) => [n.h[2], n.h[3]]],
  [0, 1, (c) => [c.h[2], c.h[3]], (n) => [n.h[0], n.h[1]]],
  [-1, 0, (c) => [c.h[0], c.h[2]], (n) => [n.h[1], n.h[3]]],
  [1, 0, (c) => [c.h[1], c.h[3]], (n) => [n.h[0], n.h[2]]],
];

/** Tiles to keep off: anything standing in them (even a table leg), traps and nails. */
function hazards(sneak) {
  const { level } = sneak;
  const bad = new Set();
  const key = (x, z) => z * level.cols + x;
  const mark = (x0, z0, x1, z1) => {
    for (let z = Math.floor(z0); z <= Math.floor(z1); z++) for (let x = Math.floor(x0); x <= Math.floor(x1); x++) bad.add(key(x, z));
  };
  for (const f of level.furniture) for (const [x0, y0, z0, x1, , z1] of f.solids) if (y0 - f.y < 0.85) mark(x0 + 0.04, z0 + 0.04, x1 - 0.04, z1 - 0.04);
  for (const t of sneak.actors.traps) mark(t.x - 0.45, t.z - 0.45, t.x + 0.45, t.z + 0.45);
  for (const n of sneak.actors.nails) mark(n.x - 0.45, n.z - 0.45, n.x + 0.45, n.z + 0.45);
  return bad;
}

/** The ways from tile to tile: a step to a neighbour that isn't higher at the shared edge and isn't too far down. */
export function graph(sneak) {
  const { level } = sneak;
  const bad = hazards(sneak);
  const key = (x, z) => z * level.cols + x;
  const ok = (c, x, z) => c && (c.kind === 'floor' || c.kind === 'exit') && !c.block && !bad.has(key(x, z));
  const steps = new Map();
  for (let z = 0; z < level.rows; z++) {
    for (let x = 0; x < level.cols; x++) {
      const c = level.cell(x, z);
      if (!ok(c, x, z)) continue;
      const out = [];
      for (const [dx, dz, mine, theirs] of NEIGHBOURS) {
        const n = level.cell(x + dx, z + dz);
        if (!ok(n, x + dx, z + dz)) continue;
        const [a0, a1] = mine(c), [b0, b1] = theirs(n);
        const up = Math.max(b0 - a0, b1 - a1);
        const down = Math.max(a0 - b0, a1 - b1);
        if (up < 0.01 && down < DROP) out.push({ x: x + dx, z: z + dz });
      }
      steps.set(key(x, z), out);
    }
  }
  return { key, steps };
}

/** The shortest way from tile `from` to tile `to` (breadth first, a little against hugging walls): a list of tiles, or null. */
export function plan(sneak, net, from, to) {
  const { level } = sneak;
  const start = net.key(...from), goal = net.key(...to);
  const cost = new Map([[start, 0]]);
  const came = new Map();
  const queue = [[0, start, from]];
  const near = (x, z) => {
    let w = 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = level.cell(x + dx, z + dz);
      if (!n || n.kind === 'wall' || n.kind === 'water' || n.block) w++;
    }
    return w;
  };
  while (queue.length) {
    queue.sort((a, b) => a[0] - b[0]);
    const [c, k, [x, z]] = queue.shift();
    if (k === goal) break;
    if (c > cost.get(k)) continue;
    for (const n of net.steps.get(k) ?? []) {
      const nk = net.key(n.x, n.z);
      const nc = c + 1 + near(n.x, n.z) * 0.6;
      if (nc < (cost.get(nk) ?? Infinity)) {
        cost.set(nk, nc);
        came.set(nk, [x, z]);
        queue.push([nc, nk, [n.x, n.z]]);
      }
    }
  }
  if (!cost.has(goal)) return null;
  const path = [];
  let at = to;
  while (net.key(...at) !== start) {
    path.unshift(at);
    at = came.get(net.key(...at));
  }
  return path;
}

/**
 * Rolls level `index` to the doorway. Returns whether it got there, how
 * long it took, every way the ball was lost, and how much yarn it has left.
 */
export function drive(index, { limit = 600, sample = null, quiet = true } = {}) {
  let sneak = null;
  const yarn = createBall(GFX, (x, z) => sneak?.level.heightAt(x, z) ?? null);
  sneak = createSneak(GFX, index, { yarn });
  const { level, ball: b } = sneak;
  const net = graph(sneak);
  const losses = [], snags = [];
  const exits = [];
  for (let z = 0; z < level.rows; z++) for (let x = 0; x < level.cols; x++) if (level.cell(x, z)?.kind === 'exit') exits.push([x, z]);
  const goal = exits[Math.floor(exits.length / 2)];
  const here = () => [Math.floor(b.x), Math.floor(b.z)];
  let route = plan(sneak, net, here(), goal);
  if (!route) return { finished: false, time: 0, losses, snags, stuck: 'no way to the doorway' };
  let wp = 0, t = 0, still = 0, down = 0;
  while (t < limit) {
    t += STEP;
    if (down > 0) {
      down -= STEP;
      stepSneak(sneak, [0, 0], STEP, { live: false, moving: false });
      if (down <= 0) { putBack(sneak); route = plan(sneak, net, here(), goal) ?? []; wp = 0; }
      continue;
    }
    if (wp >= route.length) {
      route = plan(sneak, net, here(), goal);
      wp = 0;
      if (!route || !route.length) return { finished: false, time: t, losses, snags, stuck: { at: here() } };
    }
    const [tx, tz] = route[wp].map((v) => v + 0.5);
    const dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz);
    if (d < 0.5) { wp++; continue; }
    // Slower where the floor drops away beside it.
    const cell = level.cell(...route[wp]);
    const edgy = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ex, ez]) => !level.cell(route[wp][0] + ex, route[wp][1] + ez));
    const speed = cell?.stair ? 2.4 : edgy ? 2.6 : 3.4;
    let vx = (dx / d) * speed, vz = (dz / d) * speed;
    // The vacuum coming: get out of its way and wait.
    for (const v of sneak.actors.vacuums) {
      const ax = b.x - v.x, az = b.z - v.z, av = Math.hypot(ax, az);
      if (av < 2.2) { vx = (ax / av) * 3; vz = (az / av) * 3; }
    }
    let px = (vx - b.vx) * 0.9, pz = (vz - b.vz) * 0.9;
    const l = Math.hypot(px, pz);
    if (l > 1) { px /= l; pz /= l; }
    const out = stepSneak(sneak, [px, pz], STEP, { quiet });
    if (out.noticed.length) snags.push(`noticed by ${out.noticed.map((c) => c.kind)} at ${t.toFixed(1)}`);
    if (out.caught) snags.push(`caught by ${out.caught.kind} at ${t.toFixed(1)}`);
    sample?.(sneak);
    if (Math.hypot(b.vx, b.vz) < 0.05) still += STEP; else still = 0;
    if (still > 15) return { finished: false, time: t, losses, snags, stuck: { at: here(), wp, of: route.length } };
    if (out.snag) snags.push(out.snag);
    if (out.outcome === 'exit') return { finished: true, time: t, losses, snags, yarn: yarn.metres, sneak };
    if (out.outcome) {
      losses.push({ how: out.outcome, at: [b.x.toFixed(1), b.y.toFixed(1), b.z.toFixed(1)], wp, time: t.toFixed(1) });
      down = 1.5;
    }
  }
  return { finished: false, time: t, losses, snags, stuck: 'out of time' };
}
