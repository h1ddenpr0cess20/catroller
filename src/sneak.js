import { BREAK_SPEED, createBall, placeBall, rollSpin, stepBall, turn } from 'madness-engine/physics';
import { createActors } from './actors.js';
import { createCats } from './cats.js';
import { createCritters } from './critters.js';
import { buildHouse, DEPTH } from './house.js';
import { loadLevel } from './levels.js';
import { createNav } from './nav.js';

/**
 * One level as it is played, without anything drawn or heard: the house,
 * what lives and lies about in it, the ball, and the rules — what catches
 * the ball's loose end and how much it lets out before the strand snaps,
 * what costs yarn outright, what can be picked up, and where the ball goes
 * back to after a fall. The game draws it; the tests drive it.
 */

/** The physics runs at a fixed rate, whatever the frame rate. */
export const STEP = 1 / 120;

/** What catches the strand, and how many metres it lets out before it snaps. */
export const SNAGS = Object.freeze({ paw: 2.6, trap: 1.4, nail: 1.6, stair: 0.6 });

/** How hard a cat's swat knocks the ball away, tiles a second. */
const SWAT = 3.6;

/** The yarn ball rolls a little slower than Dungeon Roller's die: it's soft, and the rooms are close. */
const ROLL = { push: 15, topSpeed: 7.5 };

/** What costs yarn outright, in metres. */
export const COST = Object.freeze({ fell: 2, soaked: 2.5, hoovered: 5 });

/** Less than this on the ball and it has come undone. */
export const LEFT = 5;

/** Floors the ball rattles over loud enough to wake a cat. */
const HARD = new Set(['wood', 'tile', 'boards', 'stone']);

/** How hard each floor drags at the ball as it rolls, per second (Madness's rolling resistance is 0.55). */
const DRAG = { wood: 0, tile: 0, boards: 0.15, stone: 0.1, carpet: 0.9, rug: 0.6 };

/**
 * A level, `index`, with the yarn ball `yarn` (`madness-engine/heroes/yarn/ball`) — which goes
 * from level to level, and with it whatever yarn it has left.
 */
export function createSneak(GFX, index, { yarn, q = [0, 0, 0, 1] }) {
  // Whatever was still caught in the last room stays there.
  if (yarn.holder) yarn.snap();
  const level = loadLevel(index).settle();
  const built = buildHouse(level);
  const nav = createNav(level);
  const killY = level.lowest - DEPTH - 2;
  const actors = createActors(GFX, level, built.world, { yarnMaterial: yarn.material });
  const critters = createCritters(GFX, level);
  const cats = createCats(GFX, level, nav);
  const ball = createBall({ r: yarn.radius });
  const { x, z } = level.start;
  const safe = [x + 0.5, level.heightAt(x + 0.5, z + 0.5) + ball.r, z + 0.5];
  const sneak = {
    index, level, built, world: built.world, nav, actors, critters, cats, killY, ball, yarn, q,
    time: 0, safe, explored: new Uint8Array(level.cols * level.rows),
    /** Whether any cat has seen the ball this level, and how often one has caught it. */
    seen: false, caught: 0,
    stairAt: -Infinity, lastFloor: null,
  };
  actors.place(0);
  placeBall(ball, ...safe);
  explore(sneak);
  return sneak;
}

/** The ball back on the last safe floor it rolled over; the cats settle. */
export function putBack(sneak) {
  placeBall(sneak.ball, ...sneak.safe);
  sneak.ball.r = sneak.yarn.radius;
  sneak.cats.calm(sneak.time);
}

/** Marks the tiles round the ball as seen, for the map. */
function explore(sneak) {
  const { level, ball, explored } = sneak;
  const cx = Math.floor(ball.x), cz = Math.floor(ball.z), r = 7;
  for (let j = cz - r; j <= cz + r; j++) {
    for (let i = cx - r; i <= cx + r; i++) {
      if (i < 0 || j < 0 || i >= level.cols || j >= level.rows) continue;
      if ((i - cx) ** 2 + (j - cz) ** 2 <= r * r) explored[j * level.cols + i] = 1;
    }
  }
}

/**
 * One step of everything. `push` is along the ground ([x, z]). While
 * `live`, the rules apply and the cats can see the ball; while `moving` is
 * false, the ball stays where it is.
 *
 * Returns what happened: `impact`, how hard the ball hit anything;
 * `outcome` — null, 'exit', or how the ball was lost ('fell', 'soaked',
 * 'hoovered'); `caught` — the cat that just caught it; `noticed` — cats that
 * have just seen it; `scared` — critters that just bolted; `snag` — what
 * just caught the strand ('paw', 'trap', 'nail', 'stair'); `snapped` — how
 * many metres just went when the strand broke; `rewound` — wound all the way
 * back on; `picked` — whatever it picked up; `loud` — how much noise it is
 * making.
 */
export function stepSneak(sneak, push, dt = STEP, { live = true, moving = true, quiet = false } = {}) {
  const { ball, level, yarn, q } = sneak;
  sneak.time += dt;
  const time = sneak.time;
  sneak.actors.place(time, dt);
  const out = { impact: 0, outcome: null, caught: null, noticed: [], scared: [], snag: null, snapped: null, piece: null, rewound: false, picked: [], loud: 0 };

  const cx = Math.floor(ball.x), cz = Math.floor(ball.z);
  const cell = level.cell(cx, cz);
  const floorH = level.heightAt(ball.x, ball.z);
  const low = floorH !== null && ball.y - ball.r - floorH < 0.25;
  const speed = Math.hypot(ball.vx, ball.vz);
  const hard = cell && HARD.has(cell.floor) && !cell.rug;
  out.loud = live && ball.grounded && low ? Math.max(0, speed - 2.5) * (hard ? 0.6 : 0.15) : 0;
  // `quiet`: nothing sees or hears the ball (for the autopilot, finding its way).
  const seen = live && moving && !quiet ? {
    x: ball.x, y: ball.y, z: ball.z, r: ball.r, speed,
    hidden: Boolean(cell?.under && low), loud: out.loud, caught: Boolean(yarn.holder?.cat),
  } : null;

  out.scared = sneak.critters.step(dt, time, seen);
  const minds = sneak.cats.step(dt, time, { ball: seen, critters: sneak.critters.critters, toys: sneak.actors.toys });
  out.noticed = minds.noticed;
  if (out.noticed.length) sneak.seen = true;
  if (!moving) return out;

  // The ball: pushed, rolled, dragged by the floor, and turned as it rolls.
  const result = stepBall(ball, sneak.world, push[0], push[1], dt, ROLL);
  if (ball.grounded && !ball.on) {
    const drag = DRAG[cell?.rug ? 'rug' : cell?.floor] ?? 0;
    const k = Math.max(0, 1 - drag * dt);
    ball.vx *= k; ball.vz *= k;
  }
  if (ball.grounded) turn(q, rollSpin(ball), dt);
  const strand = yarn.step(ball, dt);
  ball.r = strand.radius;
  if (strand.snapped) { out.snapped = strand.snapped; out.piece = strand.piece; sneak.actors.drop(strand.piece); }
  out.rewound = strand.rewound;
  out.impact = result.impact;
  if (!live) return out;

  if (ball.y < sneak.killY) { out.outcome = 'fell'; return out; }
  const onFloor = ball.grounded && !ball.on && cell && low;
  if (onFloor && cell.kind === 'water') { out.outcome = 'soaked'; return out; }
  for (const v of sneak.actors.vacuums) {
    if (Math.hypot(v.x - ball.x, v.z - ball.z) < v.radius + ball.r * 0.8 && Math.abs(v.y - (ball.y - ball.r)) < 0.6) { out.outcome = 'hoovered'; return out; }
  }

  // Caught by a cat: a swat sends the ball off, and the loose end is under its paw.
  const snag = (what, holder) => {
    if (yarn.holder) return false;
    if (!yarn.snag(ball, q, { kind: what, snap: SNAGS[what], letGo: false, ...holder })) return false;
    out.snag = what;
    return true;
  };
  if (minds.caught) {
    const cat = minds.caught;
    sneak.caught++;
    out.caught = cat;
    const dx = ball.x - cat.x, dz = ball.z - cat.z, d = Math.hypot(dx, dz) || 1;
    ball.vx = (dx / d) * SWAT; ball.vz = (dz / d) * SWAT;
    ball.vy = 3;
    ball.grounded = false;
    snag('paw', { cat });
  }
  // Once the cat has had its fun the strand is free of it, and can be wound back on.
  if (yarn.holder?.cat && yarn.holder.cat.mode !== 'play' && yarn.holder.cat.mode !== 'swat') yarn.holder.letGo = true;

  for (const t of sneak.actors.traps) {
    if (t.sprung || !low) continue;
    if (Math.hypot(t.x - ball.x, t.z - ball.z) < 0.42) {
      sneak.actors.spring(t, time);
      snag('trap', { trap: t });
      out.snapTrap = t;
    }
  }
  for (const n of sneak.actors.nails) {
    if (!low || time - n.last < 3) continue;
    if (Math.hypot(n.x - ball.x, n.z - ball.z) < 0.4) {
      n.last = time;
      snag('nail', { nail: n });
    }
  }
  // Down a step onto a stair: the loose end catches on the nosing behind, and a little unwinds.
  const here = cell ? Math.max(...cell.h) : null;
  if (cell?.stair && sneak.lastFloor !== null && here !== null && sneak.lastFloor - here > 0.3 && time - sneak.stairAt > 2.5) {
    sneak.stairAt = time;
    snag('stair', {});
  }
  sneak.lastFloor = here;
  if (result.landed && result.impact > BREAK_SPEED) out.thud = true;

  for (const p of sneak.actors.pickups) {
    if (p.taken) continue;
    if (Math.hypot(p.x - ball.x, p.z - ball.z) < 0.55 && Math.abs(ball.y - ball.r - p.y) < 0.8) {
      p.taken = true;
      if (p.kind === 'skein') {
        if (yarn.holder) {
          const piece = yarn.snap();
          if (piece) sneak.actors.drop(piece);
        }
        p.wound = yarn.windOn(p.amount);
        ball.r = yarn.radius;
      }
      out.picked.push(p);
    }
  }

  if (ball.grounded && !ball.on && cell) {
    if (cell.kind === 'exit') out.outcome = 'exit';
    else if (level.isSafe(cx, cz) && !cell.under) sneak.safe = [cx + 0.5, cell.h[0] + ball.r, cz + 0.5];
  }
  explore(sneak);
  return out;
}
