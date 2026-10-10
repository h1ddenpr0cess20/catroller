import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as GFX from '../src/vendor/gfx/index.js';
import { createCats } from '../src/cats.js';
import { createCritters } from '../src/critters.js';
import { House } from '../src/house.js';
import { createNav } from '../src/nav.js';

const DT = 1 / 60;

/** A room with whatever `set(house)` puts in it, and a ball to roll about. */
function scene(set) {
  const house = new House({ name: 't', cols: 30, rows: 20, palette: {} });
  house.room(1, 1, 26, 16, 0, { floor: 'carpet' });
  set(house);
  house.settle();
  const nav = createNav(house);
  const critters = createCritters(GFX, house);
  const cats = createCats(GFX, house, nav);
  const ball = { x: 3.5, y: 0.36, z: 3.5, r: 0.36, speed: 0, hidden: false, loud: 0, caught: false };
  let time = 0;
  const run = (seconds, move = () => {}) => {
    const out = { noticed: [], caught: null, scared: [] };
    for (let t = 0; t < seconds; t += DT) {
      time += DT;
      move(ball, time);
      out.scared.push(...critters.step(DT, time, ball));
      const minds = cats.step(DT, time, { ball, critters: critters.critters });
      out.noticed.push(...minds.noticed);
      out.caught ??= minds.caught;
    }
    return out;
  };
  return { house, cats: cats.cats, critters: critters.critters, ball, run };
}

describe('the cats', () => {
  it('watching a mouse, a cat doesn\'t see the ball go by — till the mouse is scared off, and then it does', () => {
    const s = scene((h) => { h.cat('ginger', 10, 8, { facing: Math.PI / 2 }); h.critter('mouse', 13, 8); });
    const cat = s.cats[0];
    s.run(0.5);
    assert.equal(cat.mode, 'watch');
    // Past, in plain view, but not near the mouse.
    Object.assign(s.ball, { x: 12.5, z: 12.5 });
    let out = s.run(3, (b) => { b.x += 0.02; b.speed = 1.2; });
    assert.equal(out.noticed.length, 0, 'it never looked up');
    // Then right up to the mouse.
    Object.assign(s.ball, { x: 16.5, z: 8.5 });
    out = s.run(1.5, (b) => { b.x = Math.max(14.6, b.x - 0.03); });
    assert.ok(out.scared.length === 1 && s.critters[0].fleeing, 'the mouse bolted');
    assert.ok(out.noticed.includes(cat), 'and the cat saw the ball');
  });

  it('a cat with nothing to watch sees the ball in front of it, given a moment, but not behind it', () => {
    const s = scene((h) => h.cat('grey', 12, 8, { facing: Math.PI / 2 }));
    const cat = s.cats[0];
    Object.assign(s.ball, { x: 8.5, z: 8.5 });
    s.run(3);
    assert.equal(cat.mode, 'sit', 'behind it: nothing');
    Object.assign(s.ball, { x: 17.5, z: 8.5 });
    const out = s.run(3);
    assert.ok(out.noticed.includes(cat));
  });

  it('under the sofa, the ball can\'t be seen', () => {
    const s = scene((h) => { h.cat('siamese', 12, 12, { facing: Math.PI }); h.put('sofa', 9, 2); });
    Object.assign(s.ball, { x: 12, z: 3.5, hidden: true });
    const out = s.run(4);
    assert.equal(out.noticed.length, 0);
  });

  it('asleep, a cat sleeps through the ball creeping by, but not rattling past', () => {
    const s = scene((h) => h.cat('black', 12, 8, { does: 'sleep' }));
    const cat = s.cats[0];
    Object.assign(s.ball, { x: 9.5, z: 9.8 });
    s.run(2, (b) => { b.x += 0.02; b.loud = 0; });
    assert.equal(cat.mode, 'sleep');
    s.run(1, (b) => { b.loud = 3; });
    assert.notEqual(cat.mode, 'sleep');
  });

  it('a cat that is sure comes after the ball and catches it', () => {
    const s = scene((h) => h.cat('ginger', 6, 8, { facing: Math.PI / 2, range: 20 }));
    const cat = s.cats[0];
    Object.assign(s.ball, { x: 13.5, z: 8.5 });
    const out = s.run(8);
    assert.ok(out.noticed.includes(cat), 'it saw the ball');
    assert.equal(out.caught, cat);
  });

  it('lose a cat for long enough and it goes back to where it was', () => {
    const s = scene((h) => h.cat('grey', 6, 8, { facing: Math.PI / 2, range: 6 }));
    const cat = s.cats[0];
    Object.assign(s.ball, { x: 11.5, z: 8.5 });
    s.run(1.5);
    assert.ok(['alert', 'chase'].includes(cat.mode));
    // The ball gets right away.
    s.run(8, (b) => { b.x = 25.5; b.hidden = true; });
    s.run(10, (b) => { b.x = 25.5; b.hidden = true; });
    assert.ok(Math.hypot(cat.x - 6.5, cat.z - 8.5) < 1, 'home again');
  });
});
