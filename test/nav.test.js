import assert from 'node:assert/strict';
import { test } from 'node:test';

import { House } from '../src/house.js';
import { createNav } from '../src/nav.js';

function room() {
  const c = new House({ name: 't', cols: 24, rows: 16, palette: {} });
  c.room(1, 1, 20, 12, 0);
  // A wall down the middle, with a gap at the bottom.
  c.clear(10, 1, 1, 9).wall(10, 1, 1, 9, 3.2);
  c.put('bookshelf', 15, 3);
  c.put('table', 15, 8);
  return createNav(c.settle());
}

test('the way round: further than straight, and down the field to the target', () => {
  const nav = room();
  const field = nav.field(14.5, 2.5, 40);
  const from = [6.5, 2.5];
  const d = field[2 * nav.cols + 6];
  assert.ok(d > 8 + 6, `the way round is ${d}`);
  let at = from, steps = 0;
  while (Math.hypot(at[0] - 14.5, at[1] - 2.5) > 0.6 && steps++ < 60) at = nav.next(field, ...at);
  assert.ok(steps < 60, 'it got there');
});

test('sight: not through a wall, not through a bookcase, but under a table', () => {
  const nav = room();
  assert.equal(nav.sight(6.5, 0.9, 4.5, 13.5, 0.4, 4.5), false, 'the wall');
  assert.equal(nav.sight(13.5, 0.9, 2.2, 19.5, 0.4, 3.5), false, 'the bookcase');
  assert.equal(nav.sight(13.5, 0.9, 9.5, 19.5, 0.4, 9.5), true, 'under the table');
  assert.ok(!nav.standable(15.5, 3.5) && nav.standable(16.5, 9.5));
});
