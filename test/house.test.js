import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildHouse, House, WALL } from '../src/house.js';

const make = (cols = 16, rows = 16) => new House({ name: 't', cols, rows, palette: {} });
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;

test('heights: on the corners, and in between on a slope', () => {
  const c = make();
  c.slope(2, 2, 4, 2, 8, 4, 'x');
  assert.ok(near(c.heightAt(2, 3), 8));
  assert.ok(near(c.heightAt(4, 2.5), 6));
  assert.equal(c.heightAt(1.5, 3), null);
});

test('walls go round a room, tall at the back and low at the front, and never over floor', () => {
  const c = make();
  c.flat(5, 1, 1, 3, 4);
  c.room(2, 2, 4, 4, 4);
  assert.equal(c.cell(1, 3).kind, 'wall');
  assert.ok(near(c.cell(1, 3).h[0], 4 + WALL.back));
  assert.ok(near(c.cell(6, 3).h[0], 4 + WALL.front));
  assert.equal(c.cell(5, 1).kind, 'floor', 'the way in is left open');
});

test('water goes only where nothing is laid yet, with `fill`', () => {
  const c = make();
  c.flat(4, 4, 1, 1, 3);
  c.water(2, 2, 5, 5, 2, { fill: true });
  assert.equal(c.cell(4, 4).kind, 'floor');
  assert.equal(c.cell(3, 3).kind, 'water');
});

test('furniture: under a sofa is somewhere to hide, a table is somewhere a cat can walk, a bookcase is in the way', () => {
  const c = make(24, 24);
  c.room(1, 1, 20, 20, 0);
  c.put('sofa', 2, 2).put('table', 10, 2).put('bookshelf', 2, 10);
  c.settle();
  assert.ok(c.cell(4, 3).under && !c.cell(4, 3).block, 'under the sofa');
  assert.ok(!c.cell(12, 3).under && !c.cell(12, 3).block, 'under the table');
  assert.ok(c.cell(3, 10).block, 'the bookcase');
  assert.throws(() => c.put('chair', 0, 0), /isn't on the floor/);
});

test('safe ground: level floor away from edges, water, stairs and furniture', () => {
  const c = make();
  c.room(2, 2, 6, 6, 0);
  assert.ok(c.isSafe(2, 2));
  c.water(5, 5, 1, 1, 0);
  assert.ok(!c.isSafe(4, 4), 'next to water');
  c.clear(7, 2, 1, 1);
  assert.ok(!c.isSafe(6, 2), 'next to a hole');
});

test('the built house: floors by what they are made of, papered walls, the water over its own floor, and the furniture solid', () => {
  const c = make(24, 24);
  c.room(1, 1, 10, 10, 0, { floor: 'wood' });
  c.flat(11, 3, 4, 4, 0, { floor: 'carpet' });
  c.water(4, 4, 2, 2, 0);
  c.put('bookshelf', 2, 6);
  const built = buildHouse(c.settle());
  assert.ok(built.floors.wood.position.length > 0);
  assert.ok(built.floors.carpet.position.length > 0);
  // The floor goes on under the spill, so the water can fray into a puddle over it.
  assert.equal(built.floors.tile.position.length, 4 * 2 * 9, 'the tiles under the spill');
  assert.ok(built.walls.position.length > 0, 'wallpaper');
  assert.equal(built.water.position.length, 4 * 2 * 9, 'two triangles a tile of water');
  // Something solid where the bookcase is: a ball dropped onto it rests on its top.
  let top = -Infinity;
  built.world.near(3, 6.5, 0.3, (i) => { const t = built.world.triangles; for (let k = 0; k < 3; k++) top = Math.max(top, t[i * 9 + k * 3 + 1]); });
  assert.ok(top > 4, `the bookcase stands ${top} high`);
});
