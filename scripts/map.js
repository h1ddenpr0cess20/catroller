/**
 * A level as text, for laying one out: `node scripts/map.js 3` (levels count
 * from 1), and `--heights` for the floor heights instead of what is where.
 *
 *   .  floor     #  wall      ~  water     E  the doorway out    S  start
 *   =  stairs    B  furniture (in the way)   u  under furniture (a hiding place)
 *   c  cat       m  mouse     f  fly        b  beetle
 *   T  mousetrap n  nail      V  vacuum     $  buttons or a tin   +  skein
 *   o  mouse hole            L  lift (where it starts)
 */

import { LEVELS, loadLevel } from '../src/levels.js';

const args = process.argv.slice(2);
const heights = args.includes('--heights');
const n = Number(args.find((a) => /^\d+$/.test(a)) ?? 1);
if (!(n >= 1 && n <= LEVELS.length)) {
  console.error(`levels are 1 to ${LEVELS.length}`);
  process.exit(1);
}
const level = loadLevel(n - 1).settle();
const grid = Array.from({ length: level.rows }, () => Array(level.cols).fill(' '));
for (let z = 0; z < level.rows; z++) {
  for (let x = 0; x < level.cols; x++) {
    const c = level.cell(x, z);
    if (!c) continue;
    if (heights) {
      grid[z][x] = c.kind === 'wall' ? '#' : String(Math.round(Math.max(...c.h)) % 10);
      continue;
    }
    grid[z][x] = { wall: '#', water: '~', exit: 'E' }[c.kind] ?? (c.block ? 'B' : c.under ? 'u' : c.stair ? '=' : '.');
  }
}
const put = (x, z, ch) => { const i = Math.floor(x), j = Math.floor(z); if (grid[j]?.[i] !== undefined) grid[j][i] = ch; };
if (!heights) {
  for (const h of level.holes) put(h.x, h.z, 'o');
  for (const l of level.lifts) put(l.x, l.z, 'L');
  for (const t of level.traps) put(t.x, t.z, 'T');
  for (const t of level.nails) put(t.x, t.z, 'n');
  for (const v of level.vacuums) put(v.path[0][0], v.path[0][1], 'V');
  for (const p of level.pickups) put(p.x, p.z, p.kind === 'skein' ? '+' : '$');
  for (const m of level.critters) put(m.x, m.z, { mouse: 'm', fly: 'f', beetle: 'b' }[m.kind]);
  for (const m of level.cats) put(m.x, m.z, 'c');
}
grid[level.start.z][level.start.x] = 'S';
console.log(`${level.name} — ${level.cols}×${level.rows}, ${level.cats.length} cats, ${level.critters.length} critters, ${level.furniture.length} pieces of furniture`);
const ruler = Array.from({ length: level.cols }, (_, x) => (x % 10 === 0 ? String((x / 10) % 10) : ' ')).join('');
console.log(`     ${ruler}`);
grid.forEach((row, z) => { const line = row.join('').replace(/\s+$/, ''); if (line) console.log(`${String(z).padStart(4)} ${line}`); });
