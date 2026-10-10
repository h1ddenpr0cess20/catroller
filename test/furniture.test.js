import assert from 'node:assert/strict';
import { test } from 'node:test';

import { House } from '../src/house.js';
import { createFurniture } from '../src/scenery.js';
import * as GFX from '../src/vendor/gfx/index.js';

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
