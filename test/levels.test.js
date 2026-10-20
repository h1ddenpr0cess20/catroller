import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LEVELS, loadLevel } from '../src/levels.js';
import { createNav } from '../src/nav.js';
import { drive } from './helpers/autopilot.js';

describe('the rooms', () => {
  it('are seven, from the sewing room to the front hall', () => {
    assert.equal(LEVELS.length, 7);
    assert.equal(loadLevel(0).name, 'The Sewing Room');
    assert.equal(loadLevel(LEVELS.length - 1).name, 'The Front Hall');
  });

  LEVELS.forEach((_, i) => {
    const level = loadLevel(i).settle();
    describe(`${i + 1}. ${level.name}`, () => {
      it('starts on safe ground, has a doorway out, cats, and things for them to watch', () => {
        assert.ok(level.isSafe(level.start.x, level.start.z), 'the start');
        assert.ok(level.cells.some((c) => c?.kind === 'exit'), 'the doorway');
        assert.ok(level.cats.length >= 2, 'cats');
        assert.ok(level.critters.length >= 1, 'critters');
        assert.ok(level.pickups.some((p) => p.kind === 'button'), 'buttons');
      });

      it('has every cat somewhere a cat can stand, and every critter, trap and button on the floor', () => {
        const nav = createNav(level);
        for (const c of level.cats) assert.ok(nav.standable(c.x, c.z), `a ${c.kind} at ${c.x},${c.z}`);
        for (const c of level.cats.filter((c) => c.path)) for (const [x, z] of c.path) assert.ok(nav.standable(x, z), `a ${c.kind}'s round at ${x},${z}`);
        const onFloor = (x, z) => {
          const c = level.cell(Math.floor(x), Math.floor(z));
          return c && c.kind === 'floor' && !c.block;
        };
        for (const c of level.critters) assert.ok(onFloor(c.x, c.z), `a ${c.kind} at ${c.x},${c.z}`);
        for (const p of level.pickups) assert.ok(onFloor(p.x, p.z), `a ${p.kind} at ${p.x},${p.z}`);
        for (const t of level.traps) assert.ok(onFloor(t.x, t.z), `a trap at ${t.x},${t.z}`);
        for (const h of level.holes) assert.ok(onFloor(h.x + 0.5, h.z + 0.5), `a mouse hole at ${h.x},${h.z}`);
        // A hole is in the skirting: there is wall behind it, the way it faces from.
        const behind = { '+z': [0, -1], '-z': [0, 1], '+x': [-1, 0], '-x': [1, 0] };
        for (const h of level.holes) {
          const [dx, dz] = behind[h.facing];
          assert.equal(level.cell(h.x + dx, h.z + dz)?.kind, 'wall', `a mouse hole at ${h.x},${h.z} facing ${h.facing} has no wall behind it`);
        }
      });

      it('can be rolled through, from the start to the doorway, without being lost once', () => {
        const run = drive(i);
        assert.ok(run.finished, `stuck: ${JSON.stringify(run.stuck)}`);
        assert.deepEqual(run.losses, []);
        assert.ok(run.time > 12, `${run.time.toFixed(1)} s is too short`);
      });
    });
  });
});
