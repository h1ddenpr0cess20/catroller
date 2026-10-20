import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

import * as GFX from 'madness-engine/gfx';
import { createBall, MAX_LAID, TILE_METRES } from 'madness-engine/heroes/yarn/ball';
import { R_TARGET, windBall } from 'madness-engine/heroes/yarn/winding';

/** A ball on a flat floor at height 0, rolled along z from z0 a step at a time. */
function rig() {
  const yarn = createBall(GFX, () => 0);
  const b = { x: 2, y: yarn.radius, z: 2, r: yarn.radius, vx: 0, vy: 0, vz: 0 };
  const q = [0, 0, 0, 1];
  const roll = (dz, steps = 1) => {
    for (let i = 0; i < steps; i++) {
      b.vz = dz * 60;
      b.z += dz;
      const out = yarn.step(b, 1 / 60);
      b.r = out.radius;
      b.y = b.r;
      yarn.pose(b, q);
      if (out.snapped || out.rewound) return out;
    }
    return null;
  };
  return { yarn, b, q, roll };
}

describe('the ball', () => {
  let wound;
  before(() => { wound = windBall(); });

  it('is the Yarn character\'s ball: one strand, wound to the size it was aiming for', () => {
    assert.ok(wound.total > 60 && wound.total < 100, `${wound.total} m`);
    const outer = wound.rBall.slice(-200).reduce((a, v) => a + v, 0) / 200;
    assert.ok(Math.abs(outer - R_TARGET) < 0.025, `the surface at ${outer} m`);
  });

  it('is a little over a tile across in the house, a tile being 30 cm', () => {
    const { yarn } = rig();
    assert.ok(yarn.radius > 0.3 && yarn.radius < 0.42, `${yarn.radius} tiles`);
    assert.equal(yarn.root.scale.x, 1 / TILE_METRES);
  });
});

describe('the loose end caught', () => {
  it('pays the strand out along the floor as the ball rolls away, and the ball gets smaller', () => {
    const { yarn, b, q, roll } = rig();
    const r0 = yarn.radius;
    yarn.snag(b, q, { snap: 4 });
    roll(0.02, 60);
    // 60 steps of 2 cm of tile is 1.2 tiles: 36 cm of strand.
    assert.ok(Math.abs(yarn.paid - 1.2 * TILE_METRES) < 0.01, `${yarn.paid} m paid out`);
    assert.ok(yarn.laid.visible);
    // A few metres off and it rolls on a smaller ball.
    roll(0.04, 250);
    assert.ok(yarn.paid > 2.5 && yarn.radius < r0 - 0.005, `${yarn.radius} after ${yarn.paid} m`);
  });

  it('lays the strand where the ball was, and the ball sits on its end', () => {
    const { yarn, b, q, roll } = rig();
    yarn.snag(b, q, { snap: 4 });
    roll(0.02, 80);
    const geo = yarn.laid.geometry, pos = geo.attributes.position.array;
    const first = geo.drawRange.start / 48;
    // The ring nearest the ball: its middle on the floor under the ball's contact.
    let x = 0, z = 0;
    for (let j = 0; j < 8; j++) { x += pos[(first * 9 + j) * 3]; z += pos[(first * 9 + j) * 3 + 2]; }
    x /= 8; z /= 8;
    assert.ok(Math.hypot(x - b.x * TILE_METRES, z - b.z * TILE_METRES) < 0.01, `the strand ends ${Math.hypot(x - b.x * TILE_METRES, z - b.z * TILE_METRES)} m from the ball`);
  });

  it('winds back on, exactly, rolling back along it', () => {
    const { yarn, b, q, roll } = rig();
    yarn.snag(b, q, { snap: 4, letGo: true });
    roll(0.02, 50);
    const out = roll(-0.02, 60);
    assert.ok(out?.rewound, 'it was wound all the way back on');
    assert.equal(yarn.holder, null);
    assert.ok(Math.abs(yarn.metres - yarn.total) < 1e-9, 'none of it lost');
  });

  it('snaps at the holder\'s limit, and that much is gone', () => {
    const { yarn, b, q, roll } = rig();
    yarn.snag(b, q, { snap: 1.5 });
    const out = roll(0.03, 400);
    assert.ok(out?.snapped, 'it snapped');
    assert.ok(Math.abs(out.snapped - 1.5) < 0.01);
    assert.ok(Math.abs(yarn.metres - (yarn.total - out.snapped)) < 1e-6);
    assert.ok(out.piece.group.isObject3D, 'and left a piece on the floor');
    assert.ok(MAX_LAID >= 1.5);
  });

  it('leaves what snapped off lying where the ball rolled, with no straight lines off to anywhere else', () => {
    const { yarn, b, q, roll } = rig();
    // Caught twice, so the second piece would run back to the first, as well as off to the house's corner.
    for (const limit of [1.4, 0.6]) {
      const x = b.x;
      yarn.snag(b, q, { snap: limit });
      // Full speed: 7.5 tiles a second at 120 steps a second.
      const out = roll(0.0625, 400);
      assert.ok(out?.snapped, 'it snapped');
      const p = out.piece.group.children[0].geometry.attributes.position.array;
      for (let v = 0; v < p.length; v += 3) {
        assert.ok(Math.abs(p[v] - x * TILE_METRES) < 0.01, `a bit of it ${(Math.abs(p[v] - x * TILE_METRES) * 100).toFixed(1)} cm off the way the ball went`);
      }
      b.x += 3;
    }
  });

  it('snaps where it lies when the ball goes over the edge, or is put down somewhere else, and draws nothing past it', () => {
    for (const how of ['edge', 'moved']) {
      let over = false;
      const yarn = createBall(GFX, (x, z) => (over && z > 4 ? null : 0));
      const b = { x: 2, y: yarn.radius, z: 2, r: yarn.radius, vx: 0, vy: 0, vz: 0 };
      const q = [0, 0, 0, 1];
      yarn.snag(b, q, { snap: 4 });
      let out = null;
      for (let i = 0; i < 60; i++) { b.z += 0.03; out = yarn.step(b, 1 / 60); yarn.pose(b, q); }
      const laid = yarn.paid;
      assert.ok(laid > 0.4 && !out.snapped, `${laid} m laid`);
      if (how === 'edge') { over = true; b.z = 4.02; b.y -= 1; } else { b.x = 9; b.z = 9; }
      out = yarn.step(b, 1 / 60);
      assert.ok(out.snapped > 0.4, `${how}: it snapped`);
      assert.equal(yarn.holder, null);
      // What was left lies on the floor where the ball rolled, not down off the edge or across to where it went.
      const p = out.piece.group.children[0].geometry.attributes.position.array;
      for (let v = 0; v < p.length; v += 3) {
        assert.ok(p[v + 1] > -0.01 && p[v + 1] < 0.02, `${how}: a bit of it at height ${p[v + 1]} m`);
        assert.ok(Math.abs(p[v] - 2 * TILE_METRES) < 0.05 && p[v + 2] < 4.1 * TILE_METRES, `${how}: a bit of it at ${p[v]}, ${p[v + 2]} m`);
      }
    }
  });

  it('won\'t be caught twice at once, and a skein winds on only up to a whole ball', () => {
    const { yarn, b, q } = rig();
    assert.equal(yarn.windOn(5), 0, 'already a whole ball');
    yarn.set(yarn.total - 3);
    assert.ok(Math.abs(yarn.windOn(5) - 3) < 1e-9);
    assert.ok(yarn.snag(b, q, { snap: 2 }));
    assert.equal(yarn.snag(b, q, { snap: 2 }), false);
  });
});
