/**
 * Bakes models the way the game does and says what came out: how many
 * vertices and triangles, per material, and how long it took.
 *
 *   node scripts/bake.js            every creature in the house, close-up and board detail
 *   node scripts/bake.js rat 1      one model of the engine's library at one detail
 */
import { CHARACTERS } from 'madness-engine/characters';
import { bake } from 'madness-engine/models/model';
import { PROPS } from 'madness-engine/props';
import { CAST } from '../src/models/cast.js';

const [name, detail] = process.argv.slice(2);
const names = name ? [name] : Object.keys(CAST);
const details = detail ? [Number(detail)] : [1, 0.5];
for (const n of names) {
  // Anything else in the engine's library can be baked too, by name.
  const def = CAST[n] ?? CHARACTERS[n] ?? PROPS[n];
  for (const d of details) {
    const t0 = performance.now();
    const m = bake(def, { detail: d });
    const mats = Object.keys(def.materials);
    const groups = m.groups.map((g) => `${mats[g.materialIndex]} ${g.count / 3}`).join(', ');
    console.log(`${n} @${d}: ${m.count} vertices, ${m.index.length / 3} triangles (${groups}) in ${Math.round(performance.now() - t0)} ms`);
  }
}
