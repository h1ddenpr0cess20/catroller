import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LEVELS, loadLevel } from '../src/levels.js';
import { createLamps } from '../src/scenery.js';
import * as GFX from '../src/vendor/gfx/index.js';

test('a wall light is on the face of its wall, and nothing on it lies flat on the wallpaper to flicker with it', () => {
  let sconces = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    const level = loadLevel(i).settle();
    const { group } = createLamps(GFX, level);
    group.updateMatrixWorld(true);
    for (const lamp of group.children) {
      const into = new GFX.Vector3(0, 0, 1).applyQuaternion(lamp.quaternion);
      const at = lamp.position;
      const wallBehind = level.cell(Math.floor(at.x - into.x * 0.01), Math.floor(at.z - into.z * 0.01))?.kind === 'wall';
      if (!wallBehind) continue;
      sconces++;
      assert.notEqual(level.cell(Math.floor(at.x + into.x * 0.01), Math.floor(at.z + into.z * 0.01))?.kind, 'wall', `${level.name}: a light at ${at.x}, ${at.z} faces the room`);
      for (const mesh of lamp.children) {
        const p = mesh.geometry.attributes.position, n = mesh.geometry.attributes.normal;
        const v = new GFX.Vector3(), m = new GFX.Vector3();
        for (let k = 0; k < p.count; k++) {
          v.fromBufferAttribute(p, k).applyMatrix4(mesh.matrixWorld).sub(at);
          m.fromBufferAttribute(n, k).applyQuaternion(lamp.quaternion);
          const out = v.dot(into), facing = m.dot(into);
          assert.ok(!(Math.abs(out) < 0.004 && facing > 0.5), `${level.name}: the ${mesh.material.name} has a face toward the room ${out.toFixed(4)} off the wall`);
        }
      }
    }
  }
  assert.ok(sconces >= 8, `${sconces} wall lights`);
});
