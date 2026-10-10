import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as GFX from '../src/vendor/gfx/index.js';
import { CAST } from '../src/models/cast/index.js';
import { BOARD_DETAIL } from '../src/models/cast/cat.js';
import { bake, createModel } from '../src/models/model.js';

const CLIPS = { cat: ['sit', 'sleep', 'walk', 'run', 'stalk', 'crouch', 'alert', 'swat', 'play', 'look'], mouse: ['idle', 'walk'] };

for (const [name, def] of Object.entries(CAST)) {
  const isCat = name.startsWith('cat-');
  // One coat is enough to check the cat's poses; every coat is checked for its bake.
  test(`${name}: bakes for the house within budget, every vertex weighted to real bones${isCat && name !== 'cat-ginger' ? '' : ', and every clip poses it'}`, () => {
    const detail = isCat ? BOARD_DETAIL : 0.5;
    const m = bake(def, { detail });
    assert.ok(m.count > 500 && m.count < (def.budget ?? 9000), `${m.count} vertices`);
    for (let v = 0; v < m.count; v += 7) {
      let w = 0;
      for (let i = 0; i < 4; i++) {
        w += m.skinWeight[v * 4 + i];
        assert.ok(m.skinIndex[v * 4 + i] < def.bones.length);
      }
      assert.ok(Math.abs(w - 1) < 1e-4, `vertex ${v} weighs ${w}`);
    }
    if (isCat && name !== 'cat-ginger') return;
    const model = createModel(GFX, def, { detail });
    const position = model.mesh.geometry.attributes.position.array;
    for (const clip of CLIPS[isCat ? 'cat' : 'mouse']) {
      for (const t of [0, 0.3, 1.2]) {
        model.pose({ clip, t, time: t, seed: 0, speed: 1, pace: 3 });
        for (let i = 0; i < position.length; i += 5) assert.ok(Number.isFinite(position[i]), `${clip} at ${t}`);
      }
    }
  });
}
