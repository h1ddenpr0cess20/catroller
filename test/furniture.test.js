import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FURNITURE, placed } from '../src/furniture.js';
import { House } from '../src/house.js';
import { LEVELS, loadLevel } from '../src/levels.js';
import { createFurniture } from '../src/scenery.js';
import { cushion } from '../src/shapes.js';
import * as GFX from 'madness-engine/gfx';

/** A bathroom with only a toilet in it, at (4, 2) against the back wall, and its meshes. */
function bathroom() {
  const house = new House({ name: 't', cols: 12, rows: 12, palette: {} });
  house.room(2, 2, 6, 6, 0, { floor: 'tile' });
  house.put('toilet', 4, 2);
  house.settle();
  const group = createFurniture(GFX, house);
  group.updateMatrixWorld(true);
  return { house, group };
}

test('the toilet: looking down into the pan, there is water in it, not the floor', () => {
  const { group } = bathroom();
  const ray = new GFX.Raycaster();
  // Down through the middle of the seat: the pan's middle is a tile in from its left and 1.65 out from the wall.
  for (let dx = -0.15; dx <= 0.15; dx += 0.05) {
    for (let dz = -0.3; dz <= 0.3; dz += 0.05) {
      ray.set(new GFX.Vector3(5 + dx, 4, 2 + 1.65 + dz), new GFX.Vector3(0, -1, 0));
      const hit = ray.intersectObject(group, true)[0];
      assert.equal(hit?.object.name, 'furniture-bathwater', `down at ${dx.toFixed(2)}, ${dz.toFixed(2)}: ${hit ? `${hit.object.name} at ${hit.point.y.toFixed(2)}` : 'nothing'}`);
    }
  }
});

test('the toilet: its cistern is on the wall, not hanging in the air in front of it', () => {
  const { house } = bathroom();
  const toilet = house.furniture.find((f) => f.kind === 'toilet');
  const cistern = toilet.solids.reduce((a, b) => (b[4] > a[4] ? b : a));
  assert.ok(cistern[2] - 2 < 0.05, `its back ${(cistern[2] - 2).toFixed(2)} off the wall`);
});

test('every piece in every room stands on its floor, out of the walls and clear of the others', () => {
  for (let i = 0; i < LEVELS.length; i++) {
    const level = loadLevel(i).settle();
    const taken = new Map();
    for (const f of level.furniture) {
      const at = `${level.name}: the ${f.kind} at ${f.x},${f.z}`;
      for (let z = f.z; z < f.z + f.d; z++) {
        for (let x = f.x; x < f.x + f.w; x++) {
          const c = level.cell(x, z);
          assert.ok(c && c.kind !== 'wall', `${at} has tile ${x},${z} ${c ? 'in a wall' : 'over the dark'}`);
          const other = taken.get(`${x},${z}`);
          // A chair pushed in under a table is the only thing that shares a tile.
          assert.ok(!other || [f.kind, other.kind].sort().join() === 'chair,table', `${at} shares tile ${x},${z} with the ${other?.kind}`);
          taken.set(`${x},${z}`, f);
        }
      }
      // And all of it, not just its footprint: no more than a leaf's brush into a wall, nothing out over the dark.
      const group = createFurniture(GFX, { furniture: [f], rugs: [] });
      for (const mesh of group.children) {
        const p = mesh.geometry.attributes.position;
        for (let v = 0; v < p.count; v++) {
          const x = p.getX(v), y = p.getY(v), z = p.getZ(v);
          const c = level.cell(Math.floor(x), Math.floor(z));
          assert.ok(c, `${at}: its ${mesh.name} out over the dark at ${x.toFixed(2)}, ${z.toFixed(2)}`);
          if (c.kind !== 'wall' || y > Math.min(...c.h)) continue;
          const u = x - Math.floor(x), w = z - Math.floor(z);
          assert.ok(Math.min(u, 1 - u, w, 1 - w) < 0.1, `${at}: its ${mesh.name} into a wall at ${x.toFixed(2)}, ${z.toFixed(2)}`);
        }
      }
    }
  }
});

test('a cushion is closed all round, however square it is: no crack down its seam, no hole at the top', () => {
  for (const up of [0.1, 0.32, 1]) {
    for (const round of [0.1, 0.12, 0.3, 1]) {
      const g = cushion(6, 0.5, 5, { up, round, seg: [28, 14] });
      const row = 29;
      for (let j = 0; j <= 14; j++) {
        const a = j * row * 3, b = (j * row + 28) * 3;
        const gap = Math.hypot(g.p[a] - g.p[b], g.p[a + 1] - g.p[b + 1], g.p[a + 2] - g.p[b + 2]);
        assert.ok(gap < 1e-9, `up ${up}, round ${round}: the seam ${gap.toFixed(4)} apart on row ${j}`);
      }
      for (const j of [0, 14]) {
        for (let k = 0; k <= 28; k++) {
          const v = (j * row + k) * 3;
          assert.ok(Math.hypot(g.p[v], g.p[v + 2]) < 1e-9, `up ${up}, round ${round}: a hole at the ${j ? 'top' : 'bottom'}`);
        }
      }
    }
  }
});

test('looking down into anything with a bowl to it — a bath, a basin, the pan, a cat\'s bed — you see its bottom, not through it', () => {
  const ray = new GFX.Raycaster();
  for (const kind of Object.keys(FURNITURE)) {
    const f = placed(kind, 0, 0);
    const group = createFurniture(GFX, { furniture: [f], rugs: [] });
    group.updateMatrixWorld(true);
    for (const p of f.parts.filter((p) => p.swept)) {
      const [out, y] = p.profile[p.profile.length - 1];
      // Only what has an inside going down to a floor of its own.
      if (out >= 0 || y <= 0) continue;
      const [x, y0, z] = p.swept;
      ray.set(new GFX.Vector3(x, 20, z), new GFX.Vector3(0, -1, 0));
      const hit = ray.intersectObject(group, true)[0];
      assert.ok(hit && hit.point.y > y0 + y - 0.01, `the ${kind}: down through it to ${hit ? `${hit.object.name} at ${hit.point.y.toFixed(2)}` : 'nothing'}, under its bottom at ${(y0 + y).toFixed(2)}`);
    }
  }
});
