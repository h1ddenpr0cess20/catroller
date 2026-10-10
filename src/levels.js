import { digger } from './dig.js';
import { House } from './house.js';

/**
 * The levels, room by room down through the house at night: from the sewing
 * room at the top, where the ball rolls out of the knitting basket, down to
 * the front hall and the cat flap. Each starts at the back and works its way
 * toward the camera to the doorway out.
 *
 * They are laid out with `dig.js`, a piece at a time; the furniture, the
 * cats, the critters, the traps and the buttons are then put into the
 * pieces by where they are in them.
 *
 * A palette has the colours of each kind of floor, the wallpapers (`papers`,
 * picked by index for each room), the cut tops of the walls (`cap`), the
 * steps (`riser`), the sides of floors over the dark (`side`), and how much
 * light the rooms have to begin with (`ambient`).
 */

const COSY = {
  floors: {
    wood: ['#b48858', '#a77c4f', '#9b7048'], carpet: ['#8a5a6a', '#6a7a5a', '#5a6a8a'], tile: ['#e8e2d6', '#c8d4d8'],
    boards: ['#9a7a58', '#8a6a4a'], stone: ['#8a8580', '#7a7570'],
  },
  papers: ['#e6d2ae', '#c4d4bc', '#d8c0c8', '#b8c8d8', '#e8dcc8'],
  cap: '#3e322c', riser: '#e2d8c6', side: '#4a3628', ambient: [0.6, 0.54, 0.5],
};

const LANDING = {
  ...COSY,
  floors: { ...COSY.floors, carpet: ['#7a3a3a', '#6a3030'], tile: ['#f0ece4', '#2a3a5a'] },
  papers: ['#c8d8d0', '#e8e0c8', '#b8c8d8'],
};

const KITCHEN = {
  ...COSY,
  floors: { ...COSY.floors, tile: ['#e8e0d0', '#b84a3a', '#d8d0c0'] },
  papers: ['#f0e6c8', '#d0dcc8', '#e8d0b0'],
  ambient: [0.64, 0.58, 0.52],
};

const PARLOUR = {
  ...COSY,
  floors: { ...COSY.floors, carpet: ['#4a5a7a', '#5a4a6a', '#7a5a3a'], wood: ['#8a5a38', '#7a4e30'] },
  papers: ['#7a8a6a', '#a87a6a', '#c8b890', '#6a7a8a'],
  ambient: [0.56, 0.5, 0.46],
};

const CELLAR = {
  ...COSY,
  floors: { ...COSY.floors, stone: ['#7a7672', '#6a6662', '#5e5a56'], boards: ['#7a5e44', '#6a523c'] },
  papers: ['#8a8278', '#7a7268'],
  cap: '#2a2420', side: '#2e2620', ambient: [0.42, 0.4, 0.42],
};

/** A loop round the inside of piece `p`, `inset` tiles in from its sides, for something to go round. */
const loop = (p, inset = 1, from = 0, to = p.length) => {
  const lo = p.lo + inset, hi = p.lo + p.width - 1 - inset;
  const a = from + inset, b = to - 1 - inset;
  return [p.tile(a, lo), p.tile(b, lo), p.tile(b, hi), p.tile(a, hi)];
};

/**
 * 1. The sewing room, where it starts: out of the knitting basket and
 * across the room past a cat asleep on the rug, a cat watching a mouse,
 * and along the passage to the landing.
 */
function sewingRoom() {
  const c = new House({ name: 'The Sewing Room', depth: 1, cols: 80, rows: 76, palette: COSY, next: 'the Bedroom',
    intro: 'Out of the basket. Keep clear of the cats.' });
  const d = digger(c, { x: 3, z: 8, h: 30, heading: '+x', floor: 'wood', paper: 0 });
  // The sewing room: the basket by the window, a table, a chair, a dress form's worth of clutter.
  const room = d.room(14, 11);
  c.start = { x: room.x + 1, z: room.z + 5 };
  c.put('basket', room.x, room.z + 1);
  c.put('table', room.x + 4, room.z, { facing: '+z' });
  c.put('chair', room.x + 6, room.z + 4, { facing: '-z' });
  c.put('bookshelf', room.x + 10, room.z, {});
  c.put('floorLamp', room.x + 13, room.z, {});
  c.put('plant', room.x, room.z + 9);
  c.rug(room.x + 3, room.z + 6, 7, 4, { pattern: 'stripes', color: '#7a4a5a' });
  // A grey cat, asleep on the rug: roll softly.
  c.cat('grey', room.x + 6, room.z + 7, { does: 'sleep', facing: 1.2 });
  c.button(room.x + 2, room.z + 3, 2).button(room.x + 9, room.z + 4, 3).button(room.x + 12, room.z + 9, 2);
  d.hall(5, { width: 3 });
  d.turn('+z');
  // The passage: a ginger cat sat watching a mouse at its crumb. Don't go near the mouse.
  const passage = d.hall(14, { width: 4, paper: 1 });
  c.cat('ginger', ...passage.tile(5, 1), { does: 'sit', facing: Math.PI / 2 });
  c.critter('mouse', ...passage.tile(5, -1));
  c.hole(...passage.tile(3, -1), '-x');
  c.button(...passage.tile(1, 0), 2).button(...passage.tile(12, 1), 3);
  c.lamp(...passage.tile(8, 3), 2.4);
  d.turn('+x');
  // The box room: a calico going round the trunk and the boxes; hide under the dresser.
  const box = d.room(13, 10, { paper: 2 });
  c.put('trunk', ...box.tile(4, 4));
  c.put('box', ...box.tile(9, -4), { h: 2.2 });
  c.put('bigBox', ...box.tile(9, 3), { h: 2.8 });
  c.put('dresser', ...box.tile(1, -4));
  c.cat('calico', ...box.tile(2, 2), { does: 'patrol', path: [box.tile(2, 2), box.tile(11, 2), box.tile(11, -2), box.tile(2, -2)], range: 8 });
  c.skein(...box.tile(12, 4), 6);
  c.tin(...box.tile(12, -4), 20);
  c.lamp(...box.tile(6, -5), 2.6);
  d.hall(4);
  d.turn('+z');
  const last = d.hall(8, { paper: 0 });
  c.critter('fly', ...last.tile(4, 0));
  c.button(...last.tile(6, 1), 2);
  d.exit(3);
  return c;
}

/**
 * 2. The bedroom: a big bed to hide under, a cat asleep on the rug and one
 * going round the room, flies about the lamp, and a mousetrap by the
 * wardrobe.
 */
function bedroom() {
  const c = new House({ name: 'The Bedroom', depth: 2, cols: 84, rows: 84, palette: COSY, next: 'the Landing',
    intro: 'Under the bed, no cat can see you.' });
  const d = digger(c, { x: 3, z: 8, h: 30, heading: '+x', floor: 'carpet', color: 1, paper: 3 });
  const hall = d.hall(6, { floor: 'wood' });
  c.seal(hall, 'x0');
  c.start = { x: hall.x + 1, z: hall.z + 1 };
  c.button(...hall.tile(4, 0), 2);
  // The bedroom proper.
  const room = d.room(18, 16);
  c.put('bed', room.x + 6, room.z, {});
  c.put('sideTable', room.x + 3, room.z, {});
  c.put('sideTable', room.x + 13, room.z, {});
  c.put('wardrobe', room.x, room.z + 8, { facing: '+x' });
  c.put('dresser', room.x + 14, room.z + 12, { facing: '-z' });
  c.put('armchair', room.x + 1, room.z + 13, { facing: '+x' });
  c.rug(room.x + 4, room.z + 9, 9, 5, { pattern: 'persian', color: '#6a2a3a' });
  c.cat('siamese', room.x + 8, room.z + 11, { does: 'sleep', facing: 2.6 });
  c.cat('black', room.x + 4, room.z + 9, { does: 'patrol', path: [[room.x + 4, room.z + 9], [room.x + 15, room.z + 9], [room.x + 15, room.z + 4], [room.x + 4, room.z + 4]], range: 10 });
  c.critter('fly', room.x + 4, room.z + 1).critter('fly', room.x + 14, room.z + 1);
  c.trap(room.x + 2, room.z + 6);
  c.button(room.x + 8, room.z + 3, 3).button(room.x + 2, room.z + 11, 2).button(room.x + 16, room.z + 6, 3);
  c.tin(room.x + 9, room.z + 4, 25);
  d.hall(3, { floor: 'wood' });
  d.turn('+z', { width: 4, floor: 'wood' });
  // The dressing room: a run of wardrobes, a mouse running its rounds, a grey cat watching for it.
  const dress = d.hall(16, { width: 7, paper: 1, floor: 'wood' });
  c.put('wardrobe', ...dress.tile(1, -3));
  c.put('wardrobe', ...dress.tile(6, -3));
  c.put('shoeRack', ...dress.tile(11, -3));
  c.put('box', ...dress.tile(3, 2), { h: 1.6 });
  c.critter('mouse', ...dress.tile(9, 1), { path: [dress.tile(9, 1), dress.tile(14, 1), dress.tile(14, 2), dress.tile(9, 2)] });
  c.hole(...dress.tile(15, -3), '-x');
  c.cat('grey', ...dress.tile(10, -1), { does: 'sit', facing: Math.PI });
  c.trap(...dress.tile(7, 1));
  c.skein(...dress.tile(13, -2), 8);
  c.button(...dress.tile(5, 0), 2).button(...dress.tile(15, 3), 3);
  c.lamp(...dress.tile(8, 4), 2.4);
  const corner = d.turn('+x', { width: 7, floor: 'wood' });
  const out = d.hall(6, { width: 3 });
  c.seal(corner, 'x1');
  c.button(...out.tile(3, 0), 2);
  d.exit(3);
  return c;
}

/**
 * 3. The landing and the bathroom: a spill across the tiles, a beetle and a
 * cat watching it, the banister over the stairwell, and the long stairs down.
 */
function landing() {
  const c = new House({ name: 'The Landing', depth: 3, cols: 90, rows: 96, palette: LANDING, next: 'the Kitchen',
    intro: 'Mind the stairwell, and the wet floor.' });
  const d = digger(c, { x: 3, z: 8, h: 40, heading: '+x', floor: 'carpet', paper: 0 });
  const top = d.hall(8, { width: 4 });
  c.seal(top, 'x0');
  c.start = { x: top.x + 1, z: top.z + 1 };
  c.button(...top.tile(5, 0), 2);
  // The bathroom: tiles, the bath, a spill, a beetle with a cat on it.
  const bath = d.room(15, 12, { floor: 'tile', paper: 1 });
  c.put('bathtub', bath.x, bath.z, {});
  c.put('toilet', bath.x + 9, bath.z, {});
  c.put('basin', bath.x + 12, bath.z, {});
  c.water(bath.x + 3, bath.z + 4, 4, 3, 40);
  c.water(bath.x + 9, bath.z + 7, 2, 2, 40);
  c.critter('beetle', bath.x + 10, bath.z + 4, { path: [[bath.x + 10, bath.z + 4], [bath.x + 13, bath.z + 4], [bath.x + 13, bath.z + 5], [bath.x + 10, bath.z + 5]] });
  c.cat('ginger', bath.x + 12, bath.z + 8, { does: 'sit', facing: Math.PI });
  c.button(bath.x + 2, bath.z + 9, 3).button(bath.x + 7, bath.z + 10, 2);
  c.skein(bath.x + 14, bath.z + 10, 6);
  c.lamp(bath.x + 7, bath.z - 1, 2.8);
  d.hall(3, { floor: 'carpet' });
  d.turn('+z', { width: 4 });
  // The landing: a long run with the stairwell open on one side.
  const run = d.ledge(14, { width: 3 });
  c.cat('calico', ...run.tile(4, 0), { does: 'patrol', path: [run.tile(2, 0), run.tile(12, 0)], range: 9 });
  c.critter('fly', ...run.tile(8, 0));
  c.button(...run.tile(10, 1), 3);
  c.lamp(...run.tile(6, -2), 2.4);
  d.turn('-x', { width: 3 });
  // Down the stairs: a long flight, the loose end catching on the way.
  d.stairs(8, 5.6, { width: 3, floor: 'carpet', color: 0 });
  const foot = d.room(8, 8, { floor: 'wood', paper: 2 });
  c.put('coatStand', foot.x, foot.z);
  c.put('plant', foot.x + 6, foot.z);
  c.cat('black', foot.x + 3, foot.z + 5, { does: 'sit', facing: 0.4 });
  c.critter('mouse', foot.x + 1, foot.z + 6);
  c.hole(foot.x, foot.z + 7, '+x');
  c.tin(foot.x + 6, foot.z + 6, 25);
  d.turn('+z', { width: 3 });
  d.hall(5);
  d.exit(3);
  return c;
}

/**
 * 4. The kitchen: tiles, a table and chairs to weave through, a cat at its
 * bowl, mousetraps set where the mice run, and the pantry.
 */
function kitchen() {
  const c = new House({ name: 'The Kitchen', depth: 4, cols: 92, rows: 92, palette: KITCHEN, next: 'the Living Room',
    intro: 'Mousetraps snap on the strand. Mind where the mice run.' });
  const d = digger(c, { x: 3, z: 8, h: 30, heading: '+x', floor: 'wood', paper: 0 });
  const door = d.hall(5, { width: 3 });
  c.seal(door, 'x0');
  c.start = { x: door.x + 1, z: door.z + 1 };
  // The kitchen: counters along the back, the table in the middle.
  const k = d.room(20, 16, { floor: 'tile', color: 0, paper: 0 });
  c.put('counter', k.x, k.z);
  c.put('stove', k.x + 4, k.z);
  c.put('counter', k.x + 7, k.z);
  c.put('sink', k.x + 11, k.z);
  c.put('counter', k.x + 15, k.z);
  c.put('fridge', k.x + 17, k.z + 2, { facing: '-x' });
  c.put('table', k.x + 7, k.z + 7);
  for (const [x, z, f] of [[6, 7, '+x'], [6, 9, '+x'], [13, 7, '-x'], [13, 9, '-x'], [8, 5, '+z'], [10, 5, '+z'], [8, 11, '-z'], [10, 11, '-z']]) c.put('chair', k.x + x, k.z + z, { facing: f });
  c.put('bowls', k.x + 1, k.z + 13);
  c.put('plant', k.x + 18, k.z + 8);
  c.water(k.x + 11, k.z + 2, 3, 2, 30);
  c.cat('grey', k.x + 5, k.z + 3, { does: 'sleep', facing: 0.3 });
  c.cat('ginger', k.x + 2, k.z + 12, { does: 'sit', facing: Math.PI * 0.5 });
  c.cat('black', k.x + 4, k.z + 5, { does: 'patrol', path: [[k.x + 4, k.z + 5], [k.x + 16, k.z + 5], [k.x + 16, k.z + 13], [k.x + 4, k.z + 13]], range: 12 });
  c.critter('mouse', k.x + 5, k.z + 13, { path: [[k.x + 4, k.z + 14], [k.x + 7, k.z + 14], [k.x + 7, k.z + 15], [k.x + 4, k.z + 15]] });
  c.hole(k.x, k.z + 15, '+x');
  c.trap(k.x + 3, k.z + 9).trap(k.x + 15, k.z + 3).trap(k.x + 9, k.z + 14);
  c.critter('fly', k.x + 12, k.z + 4);
  c.button(k.x + 9, k.z + 8, 4).button(k.x + 2, k.z + 6, 2).button(k.x + 17, k.z + 10, 3).button(k.x + 12, k.z + 14, 2);
  c.tin(k.x + 10, k.z + 9, 25);
  c.lamp(k.x + 6, k.z - 1, 3).lamp(k.x + 14, k.z - 1, 3);
  d.hall(3, { floor: 'wood' });
  d.turn('+z', { width: 4, floor: 'boards' });
  // The pantry passage: shelves, boxes and sacks, two mice and a cat between them.
  const p = d.hall(16, { width: 6, floor: 'boards', paper: 2 });
  c.put('bookshelf', p.x, p.z + 1, { facing: '+x' });
  c.put('box', p.x, p.z + 8, { h: 2.4 });
  c.put('bigBox', p.x + 3, p.z + 12, { h: 2.2 });
  c.critter('mouse', p.x + 2, p.z + 4);
  c.critter('mouse', p.x + 1, p.z + 12, { path: [[p.x + 1, p.z + 12], [p.x + 2, p.z + 12], [p.x + 2, p.z + 14], [p.x + 1, p.z + 14]] });
  c.hole(p.x, p.z + 13, '+x').hole(p.x + 5, p.z + 3, '-x');
  c.cat('calico', p.x + 4, p.z + 9, { does: 'sit', facing: Math.PI * 1.2 });
  c.trap(p.x + 3, p.z + 7);
  c.skein(p.x + 1, p.z + 15, 8);
  c.button(p.x + 3, p.z + 2, 3).button(p.x + 5, p.z + 15, 3);
  c.lamp(p.x - 1, p.z + 8);
  const corner = d.turn('+x', { width: 6, floor: 'boards' });
  const out = d.hall(5, { width: 3, floor: 'wood' });
  c.seal(corner, 'x1');
  c.button(...out.tile(2, 0), 2);
  d.exit(3);
  return c;
}

/**
 * 5. The living room: a sofa to hide under, the fire, the piano, a Siamese
 * who misses nothing, and the robot vacuum doing its rounds.
 */
function livingRoom() {
  const c = new House({ name: 'The Living Room', depth: 5, cols: 96, rows: 96, palette: PARLOUR, next: 'the Cellar',
    intro: 'The cats hate the vacuum. So should you.' });
  const d = digger(c, { x: 3, z: 10, h: 30, heading: '+x', floor: 'wood', paper: 0 });
  const door = d.hall(5, { width: 3 });
  c.seal(door, 'x0');
  c.start = { x: door.x + 1, z: door.z + 1 };
  const r = d.room(22, 18, { floor: 'carpet', color: 0, paper: 0 });
  c.put('fireplace', r.x + 9, r.z);
  c.put('bookshelf', r.x + 1, r.z);
  c.put('bookshelf', r.x + 16, r.z);
  c.put('piano', r.x, r.z + 12, { facing: '+x' });
  c.put('sofa', r.x + 8, r.z + 12, { facing: '-z' });
  c.put('armchair', r.x + 4, r.z + 6, { facing: '+x' });
  c.put('armchair', r.x + 16, r.z + 6, { facing: '-x' });
  c.put('coffeeTable', r.x + 9, r.z + 7);
  c.put('floorLamp', r.x + 3, r.z + 11);
  c.put('floorLamp', r.x + 20, r.z + 2);
  c.put('tvStand', r.x + 17, r.z + 15, { facing: '-z' });
  c.put('plant', r.x + 20, r.z + 10);
  c.put('catTree', r.x + 4, r.z + 15);
  c.rug(r.x + 6, r.z + 4, 10, 8, { pattern: 'persian', color: '#7a2a24' });
  c.vacuum([[r.x + 7, r.z + 5], [r.x + 14, r.z + 5], [r.x + 14, r.z + 10], [r.x + 7, r.z + 10]], { speed: 1.5 });
  c.cat('siamese', r.x + 12, r.z + 3, { does: 'sit', facing: 0.2 });
  c.cat('calico', r.x + 2, r.z + 11, { does: 'sit', facing: 0.6 });
  c.critter('fly', r.x + 3, r.z + 10);
  c.cat('black', r.x + 12, r.z + 16, { does: 'sleep', facing: -1.2 });
  c.critter('beetle', r.x + 19, r.z + 13, { path: [[r.x + 19, r.z + 13], [r.x + 20, r.z + 13], [r.x + 20, r.z + 14], [r.x + 19, r.z + 14]] });
  c.cat('ginger', r.x + 17, r.z + 12, { does: 'sit', facing: 1.6 });
  c.button(r.x + 6, r.z + 2, 3).button(r.x + 14, r.z + 9, 4).button(r.x + 10, r.z + 14, 3).button(r.x + 20, r.z + 7, 2);
  c.tin(r.x + 11, r.z + 13, 30);
  c.skein(r.x + 2, r.z + 8, 8);
  d.hall(3, { floor: 'wood' });
  d.turn('+z', { width: 4, floor: 'wood' });
  // The conservatory: tiles and plants, flies everywhere, a grey cat on the prowl.
  const con = d.hall(14, { width: 9, floor: 'tile', color: 1, paper: 2 });
  for (const [a, b] of [[2, -4], [6, 3], [10, -4], [12, 2]]) c.put('plant', ...con.tile(a, b));
  c.critter('fly', ...con.tile(3, 1)).critter('fly', ...con.tile(9, -1)).critter('beetle', ...con.tile(7, -3), { path: [con.tile(5, -3), con.tile(9, -3)] });
  c.cat('grey', ...con.tile(4, 1), { does: 'patrol', path: [con.tile(1, 1), con.tile(11, 1), con.tile(11, -2), con.tile(1, -2)], range: 10 });
  c.water(...con.tile(8, 1), 2, 2, 30);
  c.button(...con.tile(5, -2), 3).button(...con.tile(11, 0), 3);
  const corner = d.turn('+x', { width: 9, floor: 'tile', color: 1 });
  const out = d.hall(5, { width: 3, floor: 'wood' });
  c.seal(corner, 'x1');
  c.button(...out.tile(2, 0), 2);
  d.exit(3);
  return c;
}

/**
 * 6. The cellar: down the steps into the dark, flagstones and old boards
 * with nails in them, boxes to slip between, a gap where the coal goes,
 * and mice — and the cats that are after them.
 */
function cellar() {
  const c = new House({ name: 'The Cellar', depth: 6, cols: 100, rows: 100, palette: { ...CELLAR, mood: { sky: 0.5, key: 0.7 } }, next: 'the Front Hall',
    intro: 'Nails in the boards. A gap in the floor. Mice everywhere.' });
  const d = digger(c, { x: 3, z: 8, h: 40, heading: '+x', floor: 'boards', paper: 0 });
  const top = d.hall(4, { width: 3 });
  c.seal(top, 'x0');
  c.start = { x: top.x + 1, z: top.z + 1 };
  d.stairs(7, 5.6, { width: 3, floor: 'boards' });
  const store = d.room(18, 14, { floor: 'stone', paper: 0 });
  const at = (a, b) => store.tile(a, b);
  // Boxes stacked along the walls, a few out in the middle to weave round.
  for (const [a, b, h, big] of [[2, -6, 1.8], [5, -6, 2.6, 1], [14, -6, 2.2, 1], [3, 4, 2.4, 1], [8, 5, 1.8], [12, 4, 2.8, 1], [16, 5, 1.6], [8, 2, 1.6], [11, -3, 1.8]]) c.put(big ? 'bigBox' : 'box', ...at(a, b), { h });
  c.put('trunk', ...at(9, -6));
  c.critter('mouse', ...at(4, -2), { path: [at(4, -2), at(9, -2), at(9, -3), at(4, -3)] });
  c.critter('mouse', ...at(15, 2));
  c.critter('mouse', ...at(1, 3));
  c.hole(...at(17, -3), '-x').hole(...at(0, 4), '+x').hole(...at(10, 7), '-z');
  c.cat('black', ...at(10, 0), { does: 'sit', facing: Math.PI });
  c.cat('grey', ...at(14, 3), { does: 'sit', facing: 0.8 });
  c.trap(...at(6, 1)).trap(...at(13, -1)).trap(...at(2, -4));
  c.button(...at(7, -3), 3).button(...at(16, 3), 4).button(...at(1, -1), 2);
  c.tin(...at(15, -3), 30);
  c.lamp(store.x + 8, store.z - 1, 2.4);
  d.hall(3, { floor: 'boards' });
  d.turn('+z', { width: 4, floor: 'boards' });
  // Old boards, nails standing up out of them.
  const boards = d.hall(10, { width: 5, floor: 'boards' });
  c.nail(...boards.tile(2, -1)).nail(...boards.tile(4, 1)).nail(...boards.tile(6, -2)).nail(...boards.tile(7, 2)).nail(...boards.tile(8, 1));
  c.critter('beetle', ...boards.tile(5, 0), { path: [boards.tile(3, 0), boards.tile(8, 0)] });
  c.cat('calico', ...boards.tile(8, -2), { does: 'sit', facing: Math.PI });
  c.button(...boards.tile(3, 2), 3);
  // Over the coal hole on a plank.
  d.bridge(6, { width: 1 });
  const laundry = d.room(12, 12, { floor: 'stone', paper: 1 });
  c.put('washer', laundry.x, laundry.z);
  c.put('washer', laundry.x + 2, laundry.z);
  c.put('basket', laundry.x + 9, laundry.z + 1);
  c.put('basket', laundry.x + 1, laundry.z + 9);
  c.water(laundry.x + 3, laundry.z + 3, 3, 2, laundry.y ?? c.cell(laundry.x, laundry.z).h[0]);
  c.critter('mouse', laundry.x + 7, laundry.z + 8);
  c.hole(laundry.x + 11, laundry.z + 8, '-x');
  c.cat('ginger', laundry.x + 6, laundry.z + 9, { does: 'sit', facing: 0.8 });
  c.skein(laundry.x + 10, laundry.z + 4, 8);
  c.button(laundry.x + 2, laundry.z + 6, 3).button(laundry.x + 9, laundry.z + 10, 3);
  c.lamp(laundry.x + 6, laundry.z - 1, 2.4);
  d.turn('+x', { width: 3, floor: 'stone' });
  d.hall(4);
  d.exit(3);
  return c;
}

/**
 * 7. The front hall, and the way out: a long runner, coats and boots,
 * Brutus by the door, and the cat flap.
 */
function frontHall() {
  const c = new House({ name: 'The Front Hall', depth: 7, cols: 100, rows: 100, palette: LANDING, next: '',
    intro: 'Past Brutus, and out through the cat flap.' });
  const d = digger(c, { x: 3, z: 10, h: 30, heading: '+x', floor: 'wood', paper: 0 });
  const back = d.hall(6, { width: 3 });
  c.seal(back, 'x0');
  c.start = { x: back.x + 1, z: back.z + 1 };
  // The hall: long, a runner down the middle, coats on the stand, the stairs going up out of it.
  const hall = d.hall(26, { width: 7, paper: 0 });
  c.seal(hall, 'x0');
  c.rug(hall.x + 2, hall.z + 2, 22, 3, { pattern: 'stripes', color: '#5a2a3a' });
  c.put('coatStand', ...hall.tile(3, -3));
  c.put('shoeRack', ...hall.tile(6, -3));
  c.put('plant', ...hall.tile(12, -3));
  c.put('sideTable', ...hall.tile(17, -3));
  c.put('coatStand', ...hall.tile(22, -3));
  c.put('trunk', ...hall.tile(9, 2));
  c.put('plant', ...hall.tile(19, 2));
  c.cat('siamese', ...hall.tile(14, -1), { does: 'patrol', path: [hall.tile(12, -1), hall.tile(21, -1)], range: 10 });
  c.critter('fly', ...hall.tile(17, -2));
  c.cat('calico', ...hall.tile(16, 1), { does: 'sit', facing: 3.6 });
  c.critter('mouse', ...hall.tile(13, 2));
  c.hole(...hall.tile(13, 3), '-z');
  c.trap(...hall.tile(11, 0)).trap(...hall.tile(20, -1));
  c.vacuum([hall.tile(18, -1), hall.tile(25, -1), hall.tile(25, 1), hall.tile(18, 1)], { speed: 1.4 });
  c.button(...hall.tile(4, 1), 3).button(...hall.tile(10, -2), 3).button(...hall.tile(14, 2), 4).button(...hall.tile(24, 2), 3);
  c.skein(...hall.tile(23, 2), 8);
  c.lamp(...hall.tile(5, -4), 2.6).lamp(...hall.tile(14, -4), 2.6).lamp(...hall.tile(23, -4), 2.6);
  d.turn('+z', { width: 7 });
  // The porch: Brutus keeps the door.
  const porch = d.hall(12, { width: 7, paper: 1 });
  c.put('shoeRack', ...porch.tile(2, 3), { facing: '+x' });
  c.put('plant', ...porch.tile(9, 3));
  c.put('basket', ...porch.tile(5, -3));
  c.cat('tom', ...porch.tile(8, -1), { does: 'sit', facing: Math.PI * 1.75, range: 8 });
  c.critter('beetle', ...porch.tile(5, 2), { path: [porch.tile(4, 2), porch.tile(6, 2)] });
  c.cat('black', ...porch.tile(3, -2), { does: 'sleep', facing: 0.4 });
  c.button(...porch.tile(6, 0), 4).button(...porch.tile(11, 1), 3);
  c.tin(...porch.tile(11, -3), 40);
  d.exit(3, 3);
  c.seal(porch, 'z1');
  return c;
}

export const LEVELS = [sewingRoom, bedroom, landing, kitchen, livingRoom, cellar, frontHall];

/** Level `index`, laid out. */
export function loadLevel(index) {
  const make = LEVELS[index];
  if (!make) throw new Error(`no level ${index}`);
  return make();
}

void loop;
