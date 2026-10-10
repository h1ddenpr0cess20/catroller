/**
 * The furniture: what stands about the house, made of parts — boxes,
 * cylinders and turnings, cushions, tubes, books, leaves, each a material
 * (shapes.js makes them) — in tiles, on a footprint of whole tiles
 * that it fills from its back left corner (low x, low z), facing +z.
 *
 * What matters to the game is what each part does: a part marked `solid`
 * is something to roll into (it goes into the physics as a box); the space
 * under a sofa, a bed or a dresser is too low for a cat to get into but
 * high enough for the ball to roll under (`hide`), so a ball under one
 * can't be seen; a table is high enough for a cat to walk under. Lamps
 * light the room (`lamp`, where the bulb is).
 *
 * A tile is 30 cm: the ball is a little under a tile and a quarter across,
 * a cat stands a tile high and is about a tile and a half long.
 */

/** Under anything lower than this a cat can't get, and the ball can't be seen. */
export const CAT_HEIGHT = 1.15;

/** The clearance under a sofa, a bed or a dresser: room for the ball (0.73 across), none for a cat. */
const LOW = 0.86;

/** A box (solid: something to roll into, unless `solid: false`), its edges rounded over by `round`. */
const box = (x0, y0, z0, x1, y1, z1, mat, o = {}) => ({ box: [x0, y0, z0, x1, y1, z1], mat, solid: true, ...o });
/** A box that is only for looking at. */
const deco = (x0, y0, z0, x1, y1, z1, mat, o = {}) => box(x0, y0, z0, x1, y1, z1, mat, { solid: false, ...o });
/** An upright cylinder, or turned to `profile` ([[r, y], ...] up from y0). */
const cyl = (x, y0, z, r, y1, mat, o = {}) => ({ cyl: [x, y0, z, r, y1], mat, solid: true, ...o });
/** A cushion filling the box (a superellipsoid: `up` how round top to bottom, `round` in plan), turned by `rot`. */
const pad = (x0, y0, z0, x1, y1, z1, mat, o = {}) => ({ pad: [x0, y0, z0, x1, y1, z1], mat, solid: false, ...o });
/** Something turned on a lathe standing at (x, y, z): `profile` [[r, dy], ...]. */
const turned = (x, y, z, profile, mat, o = {}) => ({ turned: [x, y, z], profile, mat, solid: false, ...o });
/** A tube of radius r along points. */
const pipe = (points, r, mat, o = {}) => ({ tube: points, r, mat, solid: false, ...o });
/** A knob, a ball, a fruit. */
const knob = (x, y, z, r, mat = 'brass', o = {}) => ({ ball: [x, y, z, r], mat, solid: false, ...o });
/** Hollow, rounded-rectangle things (`swept` in shapes.js), centred at (x, y, z). */
const bowl = (x, y, z, a, b, n, profile, mat, o = {}) => ({ swept: [x, y, z], a, b, n, profile, mat, solid: false, ...o });
/** A flat rounded rectangle at (x, y, z): water in a bath, food in a bowl. */
const sheet = (x, y, z, a, b, n, mat, o = {}) => ({ slab: [x, y, z], a, b, n, mat, solid: false, ...o });

/** Turnings for legs, h tall and r at their widest, from the floor up. */
const LEG = {
  taper: (h, r) => [[0, 0], [r * 0.55, 0], [r * 0.6, 0.03], [r * 0.95, h * 0.9], [r, h * 0.92], [r, h], [0, h]],
  turned: (h, r) => [[0, 0], [r * 0.7, 0], [r * 0.78, 0.05], [r * 0.6, h * 0.14], [r * 0.95, h * 0.3], [r * 0.62, h * 0.45], [r * 0.55, h * 0.6],
    [r * 0.9, h * 0.72], [r, h * 0.76], [r, h], [0, h]],
  bun: (h, r) => [[0, 0], [r * 0.7, 0], [r, h * 0.45], [r * 0.85, h * 0.85], [r * 0.9, h], [0, h]],
};
const legs = (w, d, h, mat, inset = 0.25, r = 0.09, style = 'taper') => [[inset, inset], [w - inset, inset], [inset, d - inset], [w - inset, d - inset]]
  .map(([x, z]) => cyl(x, 0, z, r, h, mat, { profile: LEG[style](h, r) }));

/** A bedpost, with a ball on top. */
const POST = (h, r) => [[0, 0], [r * 0.8, 0], [r, 0.1], [r * 0.85, h * 0.3], [r * 0.6, h * 0.5], [r * 0.7, h * 0.85], [r * 0.5, h * 0.9],
  [r * 0.9, h * 0.94], [r * 0.6, h], [0, h]];
/** A mug, a cup. */
const MUG = [[0, 0], [0.13, 0], [0.14, 0.02], [0.15, 0.28], [0.13, 0.28], [0.12, 0.05], [0, 0.05]];
/** A china vase. */
const VASE = [[0, 0], [0.18, 0], [0.22, 0.06], [0.28, 0.3], [0.24, 0.55], [0.12, 0.72], [0.1, 0.82], [0.14, 0.9], [0.12, 0.9], [0.08, 0.8], [0, 0.8]];
/** A lamp's base: a fat china jar with a brass collar. */
const LAMP_JAR = [[0, 0], [0.16, 0], [0.18, 0.04], [0.27, 0.22], [0.26, 0.42], [0.14, 0.58], [0.07, 0.62], [0.07, 0.66], [0, 0.66]];
/** A flowerpot with a rolled rim, filled with earth near the top. */
const POT = [[0, 0], [0.46, 0], [0.48, 0.04], [0.6, 1.22], [0.6, 1.22], [0.7, 1.25], [0.72, 1.33], [0.7, 1.45], [0.62, 1.45], [0.6, 1.38], [0.58, 1.33], [0, 1.33]];

/**
 * Every kind of furniture: `size` [w, d] in tiles, `parts`, and `lamp` if it
 * gives light ([x, y, z] in its own frame). A part's `mat` is one of the
 * materials in `scenery.js` (the colour of fabric and paint comes from the
 * piece, as `colors`). Only the solid parts matter to the game; the rest
 * are for looking at, and stay inside the solid ones' bounds or above
 * where the ball can reach.
 */
export const FURNITURE = {
  sofa: {
    size: [6, 3],
    parts: (c) => [
      ...legs(6, 3, LOW, 'darkwood', 0.35, 0.09),
      box(0.1, LOW, 0.15, 5.9, 1.35, 2.9, c.fabric, { round: 0.14 }),
      box(0.1, LOW, 0.15, 5.9, 2.95, 0.95, c.fabric, { round: 0.3 }),
      box(0.1, LOW, 0.15, 0.75, 2.05, 2.95, c.fabric, { round: 0.2 }),
      box(5.25, LOW, 0.15, 5.9, 2.05, 2.95, c.fabric, { round: 0.2 }),
      // Rolled arms.
      pad(0.04, 1.72, 0.2, 0.84, 2.24, 3.0, c.fabric, { up: 0.95, round: 0.3 }),
      pad(5.16, 1.72, 0.2, 5.96, 2.24, 3.0, c.fabric, { up: 0.95, round: 0.3 }),
      // Seat cushions, and back cushions leaning back.
      ...[0, 1, 2].map((k) => pad(0.77 + k * 1.49, 1.28, 0.9, 0.77 + k * 1.49 + 1.47, 1.8, 2.96, c.cushion, { up: 0.4, round: 0.18 })),
      ...[0, 1, 2].map((k) => pad(0.8 + k * 1.48, 1.62, 0.8, 0.8 + k * 1.48 + 1.44, 2.88, 1.36, c.cushion, { up: 0.45, round: 0.28, rot: [-0.14, 0, 0] })),
      // Scatter cushions in the corners.
      pad(0.85, 1.72, 1.2, 1.9, 2.72, 1.52, 'pillow', { up: 0.55, round: 0.55, rot: [-0.32, 0.25, 0.22] }),
      pad(4.1, 1.72, 1.2, 5.15, 2.72, 1.52, 'pillow', { up: 0.55, round: 0.55, rot: [-0.32, -0.25, -0.22] }),
    ],
  },
  armchair: {
    size: [3, 3],
    parts: (c) => [
      ...legs(3, 3, LOW, 'darkwood', 0.3, 0.09),
      box(0.1, LOW, 0.15, 2.9, 1.35, 2.9, c.fabric, { round: 0.14 }),
      box(0.1, LOW, 0.15, 2.9, 3.0, 0.9, c.fabric, { round: 0.32 }),
      box(0.1, LOW, 0.15, 0.65, 2.1, 2.95, c.fabric, { round: 0.2 }),
      box(2.35, LOW, 0.15, 2.9, 2.1, 2.95, c.fabric, { round: 0.2 }),
      pad(0.04, 1.78, 0.2, 0.74, 2.28, 3.0, c.fabric, { up: 0.95, round: 0.3 }),
      pad(2.26, 1.78, 0.2, 2.96, 2.28, 3.0, c.fabric, { up: 0.95, round: 0.3 }),
      pad(0.66, 1.28, 0.84, 2.34, 1.82, 2.96, c.cushion, { up: 0.4, round: 0.2 }),
      pad(0.7, 1.65, 0.72, 2.3, 2.92, 1.3, c.cushion, { up: 0.45, round: 0.3, rot: [-0.14, 0, 0] }),
    ],
  },
  bed: {
    size: [6, 8],
    parts: (c) => [
      ...legs(6, 8, LOW, 'wood', 0.3, 0.12, 'bun'),
      box(0, LOW, 0, 6, 1.4, 8, 'wood', { round: 0.06 }),
      // The mattress, the duvet turned down over it, and the pillows.
      pad(0.12, 1.3, 0.3, 5.88, 2.1, 7.95, 'linen', { up: 0.28, round: 0.12 }),
      pad(0.02, 1.76, 3.1, 5.98, 2.3, 8.05, c.fabric, { up: 0.32, round: 0.1 }),
      pad(0.02, 2.0, 2.8, 5.98, 2.44, 3.5, 'linen', { up: 0.8, round: 0.12 }),
      pad(0.55, 2.0, 0.5, 2.85, 2.62, 2.05, 'linen', { up: 0.6, round: 0.4, rot: [0.12, 0, 0] }),
      pad(3.15, 2.0, 0.5, 5.45, 2.62, 2.05, 'linen', { up: 0.6, round: 0.4, rot: [0.12, 0, 0] }),
      // The headboard: a frame with panels, and posts at its corners.
      box(0, 0, 0, 6, 3.8, 0.35, 'wood', { round: 0.06 }),
      deco(-0.06, 3.65, -0.06, 6.06, 3.95, 0.43, 'wood', { round: 0.08 }),
      ...[0, 1, 2].map((k) => deco(0.45 + k * 1.75, 2.4, 0.3, 0.45 + k * 1.75 + 1.4, 3.45, 0.42, 'lightwood', { round: 0.08 })),
      cyl(0.18, 0, 0.18, 0.2, 4.4, 'wood', { solid: false, profile: POST(4.4, 0.2) }),
      cyl(5.82, 0, 0.18, 0.2, 4.4, 'wood', { solid: false, profile: POST(4.4, 0.2) }),
    ],
  },
  dresser: {
    size: [4, 2],
    parts: () => [
      ...legs(4, 2, LOW, 'wood', 0.25, 0.1, 'taper'),
      box(0.05, LOW, 0.05, 3.95, 3.3, 1.95, 'wood', { round: 0.05 }),
      deco(-0.04, 3.22, -0.02, 4.04, 3.42, 2.06, 'wood', { round: 0.06 }),
      ...[0, 1, 2].map((k) => deco(0.22, LOW + 0.14 + k * 0.8, 1.9, 3.78, LOW + 0.86 + k * 0.8, 2.02, 'lightwood', { round: 0.05 })),
      ...[0, 1, 2].flatMap((k) => [1.15, 2.85].map((x) => knob(x, LOW + 0.5 + k * 0.8, 2.08, 0.075))),
      // On top: a little box for trinkets, and a vase.
      deco(0.45, 3.42, 0.7, 1.25, 3.66, 1.3, 'leather', { round: 0.05 }),
      turned(3.05, 3.42, 1.0, VASE, 'china'),
    ],
  },
  wardrobe: {
    size: [4, 2],
    parts: () => [
      box(0, 0, 0, 4, 6.4, 2, 'wood', { round: 0.05 }),
      deco(-0.08, 0, -0.04, 4.08, 0.35, 2.08, 'darkwood', { round: 0.04 }),
      deco(-0.12, 6.2, -0.06, 4.12, 6.55, 2.12, 'darkwood', { round: 0.07 }),
      ...[0, 1].flatMap((k) => [
        deco(0.1 + k * 1.92, 0.48, 1.96, 1.98 + k * 1.92, 6.08, 2.04, 'wood', { round: 0.04 }),
        deco(0.32 + k * 1.92, 3.55, 2.0, 1.76 + k * 1.92, 5.82, 2.09, 'lightwood', { round: 0.07 }),
        deco(0.32 + k * 1.92, 0.72, 2.0, 1.76 + k * 1.92, 3.3, 2.09, 'lightwood', { round: 0.07 }),
      ]),
      knob(1.8, 3.42, 2.12, 0.08), knob(2.2, 3.42, 2.12, 0.08),
      // A hatbox up on top.
      turned(1.2, 6.55, 1.0, [[0, 0], [0.55, 0], [0.56, 0.02], [0.56, 0.5], [0.6, 0.52], [0.6, 0.62], [0, 0.62]], 'hatbox'),
    ],
  },
  bookshelf: {
    size: [4, 1],
    parts: () => [
      box(0, 0, 0, 4, 5.2, 1.1, 'darkwood', { draw: false }),
      deco(0.05, 0, 0, 3.95, 5.2, 0.08, 'darkwood', { round: 0.01 }),
      deco(0, 0, 0, 0.12, 5.2, 1.12, 'darkwood', { round: 0.03 }),
      deco(3.88, 0, 0, 4, 5.2, 1.12, 'darkwood', { round: 0.03 }),
      deco(-0.05, 5.08, -0.02, 4.05, 5.3, 1.18, 'darkwood', { round: 0.05 }),
      deco(0.1, 0, 0.02, 3.9, 0.38, 1.12, 'darkwood', { round: 0.02 }),
      ...[0, 1, 2, 3].map((k) => deco(0.1, 0.38 + k * 1.2, 0.06, 3.9, 0.46 + k * 1.2, 1.1, 'darkwood', { round: 0.02 })),
      ...[0, 1, 2, 3].map((k) => ({ books: [0.14, 0.46 + k * 1.2, 0.1, 3.86, 0.46 + k * 1.2 + 1.0, 1.06], seed: k * 7 + 3, mat: 'books', solid: false })),
    ],
  },
  coffeeTable: {
    size: [4, 3],
    parts: () => [
      ...legs(4, 3, 1.4, 'darkwood', 0.3, 0.1, 'taper'),
      box(0, 1.4, 0.2, 4, 1.58, 2.8, 'wood', { round: 0.06 }),
      deco(0.2, 1.24, 0.35, 3.8, 1.42, 2.65, 'darkwood', { round: 0.03 }),
      // A mug, and a book left open face down.
      turned(2.95, 1.58, 1.15, MUG, 'china'),
      pipe([[3.09, 1.66, 1.15], [3.16, 1.7, 1.15], [3.17, 1.78, 1.15], [3.1, 1.81, 1.15]], 0.018, 'china'),
      deco(0.6, 1.58, 1.45, 1.7, 1.66, 2.15, 'bookcover', { round: 0.02, rot: [0, -0.3, 0] }),
      deco(0.62, 1.66, 1.47, 1.68, 1.69, 2.13, 'paper', { round: 0.01, rot: [0, -0.3, 0] }),
    ],
  },
  table: {
    size: [6, 4],
    parts: () => [
      ...legs(6, 4, 2.45, 'wood', 0.35, 0.12, 'turned'),
      box(0, 2.45, 0, 6, 2.62, 4, 'wood', { round: 0.05 }),
      deco(0.25, 2.2, 0.25, 5.75, 2.47, 3.75, 'wood', { round: 0.03 }),
      deco(0.5, 2.62, 1.35, 5.5, 2.635, 2.65, 'runner', { round: 0.005 }),
      // A bowl of fruit.
      turned(3, 2.635, 2, [[0, 0], [0.22, 0], [0.24, 0.03], [0.2, 0.06], [0.5, 0.3], [0.52, 0.32], [0.48, 0.32], [0.18, 0.1], [0, 0.1]], 'china'),
      knob(2.86, 2.86, 1.9, 0.14, 'fruit', { tint: [0.55, 0.06, 0.04] }),
      knob(3.13, 2.86, 2.05, 0.14, 'fruit', { tint: [0.45, 0.6, 0.1] }),
      knob(2.95, 2.88, 2.18, 0.13, 'fruit', { tint: [0.85, 0.42, 0.04] }),
      knob(3.03, 3.08, 2.0, 0.13, 'fruit', { tint: [0.6, 0.08, 0.05] }),
    ],
  },
  chair: {
    size: [2, 2],
    parts: () => [
      ...legs(1.7, 1.7, 1.45, 'wood', 0.2, 0.07, 'taper').map((p) => ({ ...p, cyl: [p.cyl[0] + 0.15, p.cyl[1], p.cyl[2] + 0.15, p.cyl[3], p.cyl[4]] })),
      box(0.15, 1.45, 0.15, 1.85, 1.58, 1.85, 'wood', { round: 0.04 }),
      box(0.15, 1.58, 0.15, 1.85, 3.3, 0.3, 'wood', { draw: false }),
      // The back: two uprights, a top rail, and spindles between.
      cyl(0.3, 1.58, 0.22, 0.07, 3.4, 'wood', { solid: false, profile: [[0.06, 0], [0.065, 1.4], [0.07, 1.82], [0, 1.82]] }),
      cyl(1.7, 1.58, 0.22, 0.07, 3.4, 'wood', { solid: false, profile: [[0.06, 0], [0.065, 1.4], [0.07, 1.82], [0, 1.82]] }),
      deco(0.22, 3.0, 0.14, 1.78, 3.36, 0.3, 'wood', { round: 0.07 }),
      ...[0.66, 1.0, 1.34].map((x) => cyl(x, 1.58, 0.22, 0.035, 3.02, 'wood', { solid: false, profile: [[0.03, 0], [0.04, 0.7], [0.03, 1.44], [0, 1.44]] })),
      pad(0.24, 1.55, 0.3, 1.76, 1.71, 1.78, 'seatpad', { up: 0.4, round: 0.25 }),
    ],
  },
  sideTable: {
    size: [2, 2],
    lamp: [1, 3.3, 1],
    parts: () => [
      ...legs(2, 2, 1.9, 'darkwood', 0.25, 0.07, 'taper'),
      box(0, 1.9, 0, 2, 2.04, 2, 'darkwood', { round: 0.04 }),
      deco(0.15, 1.72, 0.15, 1.85, 1.92, 1.85, 'darkwood', { round: 0.02 }),
      knob(1, 1.82, 1.88, 0.045),
      turned(1, 2.04, 1, LAMP_JAR, 'china'),
      cyl(1, 2.68, 1, 0.025, 3.05, 'brass', { solid: false }),
      { cone: [1, 2.85, 1, 0.62, 0.38, 3.5], mat: 'shade', solid: false },
    ],
  },
  floorLamp: {
    size: [1, 1],
    lamp: [0.5, 5.2, 0.5],
    parts: () => [
      cyl(0.5, 0, 0.5, 0.42, 0.12, 'brass', { profile: [[0, 0], [0.4, 0], [0.42, 0.03], [0.36, 0.08], [0.1, 0.12], [0, 0.12]] }),
      cyl(0.5, 0, 0.5, 0.05, 5.0, 'brass', { profile: [[0.05, 0], [0.04, 0.3], [0.035, 4.75], [0.06, 4.78], [0.06, 4.85], [0.03, 4.88], [0.03, 5.0], [0, 5.0]] }),
      { cone: [0.5, 4.75, 0.5, 0.75, 0.45, 5.65], mat: 'shade', solid: false },
    ],
  },
  plant: {
    size: [2, 2],
    parts: () => [
      cyl(1, 0, 1, 0.68, 1.45, 'terracotta', { profile: POT }),
      { slab: [1, 1.36, 1], a: 0.57, b: 0.57, n: 2, mat: 'soil', solid: false },
      { leaves: [1, 1.36, 1], count: 30, len: 1.25, wide: 0.42, seed: 3, mat: 'leaf', solid: false },
    ],
  },
  tvStand: {
    size: [5, 2],
    parts: () => [
      box(0, 0, 0, 5, 1.6, 1.6, 'darkwood', { draw: false }),
      deco(0.02, 0.18, 0.02, 4.98, 1.6, 1.6, 'darkwood', { round: 0.05 }),
      ...[[0.3, 0.3], [4.7, 0.3], [0.3, 1.3], [4.7, 1.3]].map(([x, z]) => cyl(x, 0, z, 0.1, 0.2, 'darkwood', { solid: false, profile: LEG.bun(0.2, 0.1) })),
      ...[0, 1].flatMap((k) => [
        deco(0.15 + k * 2.4, 0.3, 1.56, 2.45 + k * 2.4, 1.48, 1.64, 'wood', { round: 0.04 }),
        knob(2.2 + k * 0.6, 0.9, 1.68, 0.05),
      ]),
      // The television: a thin screen in a dark case, on a foot.
      box(0.4, 1.6, 0.5, 4.6, 4.2, 0.65, 'tvcase', { round: 0.05 }),
      deco(0.5, 1.72, 0.6, 4.5, 4.08, 0.67, 'screen', { round: 0.02 }),
      deco(2.0, 1.6, 0.35, 3.0, 1.66, 0.95, 'tvcase', { round: 0.03 }),
    ],
  },
  piano: {
    size: [5, 2],
    parts: () => [
      box(0, 0, 0, 5, 4.2, 1.2, 'piano', { round: 0.05 }),
      deco(-0.06, 4.1, -0.04, 5.06, 4.3, 1.3, 'piano', { round: 0.06 }),
      box(0, 2.4, 1.2, 5, 2.6, 1.9, 'piano', { round: 0.04 }),
      deco(0.15, 2.66, 1.12, 4.85, 3.12, 1.26, 'piano', { round: 0.03 }),
      // The keys: whites, and blacks in twos and threes.
      ...Array.from({ length: 31 }, (_, k) => deco(0.22 + k * 0.1471 + 0.004, 2.6, 1.3, 0.22 + (k + 1) * 0.1471 - 0.004, 2.7, 1.88, 'keys', { round: 0.012, seg: 1 })),
      ...Array.from({ length: 30 }, (_, k) => k).filter((k) => [0, 1, 3, 4, 5].includes(k % 7))
        .map((k) => deco(0.22 + (k + 1) * 0.1471 - 0.045, 2.7, 1.3, 0.22 + (k + 1) * 0.1471 + 0.045, 2.79, 1.66, 'piano', { round: 0.012, seg: 1 })),
      // The music desk, with music on it; the legs; the pedals.
      deco(1.15, 3.18, 1.0, 3.85, 3.78, 1.12, 'piano', { round: 0.02, rot: [0.18, 0, 0] }),
      deco(1.55, 3.24, 1.1, 2.48, 3.72, 1.13, 'paper', { round: 0.004, rot: [0.18, 0, 0] }),
      deco(2.52, 3.24, 1.1, 3.45, 3.72, 1.13, 'paper', { round: 0.004, rot: [0.18, 0, 0] }),
      box(0.3, 0, 1.2, 0.5, 2.4, 1.8, 'piano', { round: 0.05 }),
      box(4.5, 0, 1.2, 4.7, 2.4, 1.8, 'piano', { round: 0.05 }),
      ...[2.25, 2.5, 2.75].map((x) => deco(x - 0.06, 0.2, 1.15, x + 0.06, 0.26, 1.5, 'brass', { round: 0.02 })),
      // Candlesticks.
      ...[0.5, 4.5].map((x) => turned(x, 4.3, 0.7, [[0, 0], [0.16, 0], [0.16, 0.03], [0.05, 0.08], [0.04, 0.45], [0.09, 0.5], [0, 0.5]], 'brass')),
      ...[0.5, 4.5].map((x) => cyl(x, 4.8, 0.7, 0.045, 5.25, 'candle', { solid: false })),
    ],
  },
  fireplace: {
    size: [5, 2],
    lamp: [2.5, 0.8, 1.6],
    parts: () => [
      // The chimney breast: brick, with the firebox let into it.
      box(0, 0, 0, 5, 4.4, 1.0, 'brick', { draw: false }),
      deco(0, 0, 0, 5, 4.4, 0.5, 'brick', { round: 0.02 }),
      deco(0, 0, 0.45, 1.16, 4.4, 1.0, 'brick', { round: 0.02 }),
      deco(3.84, 0, 0.45, 5, 4.4, 1.0, 'brick', { round: 0.02 }),
      deco(1.1, 2.5, 0.45, 3.9, 4.4, 1.0, 'brick', { round: 0.02 }),
      deco(1.12, 0.1, 0.5, 3.88, 2.55, 0.56, 'soot'),
      deco(1.12, 0.1, 0.5, 1.2, 2.55, 1.0, 'soot'),
      deco(3.8, 0.1, 0.5, 3.88, 2.55, 1.0, 'soot'),
      deco(1.12, 2.45, 0.5, 3.88, 2.55, 1.0, 'soot'),
      deco(1.12, 0.05, 0.5, 3.88, 0.14, 1.0, 'ash', { round: 0.01 }),
      // The surround: pillars either side, the lintel, and the mantel over it.
      box(-0.15, 0, 0.9, 1.15, 3.9, 1.15, 'paint', { round: 0.04 }),
      box(3.85, 0, 0.9, 5.15, 3.9, 1.15, 'paint', { round: 0.04 }),
      deco(1.1, 2.55, 0.9, 3.9, 3.9, 1.12, 'paint', { round: 0.04 }),
      deco(-0.1, 3.82, 0.95, 5.1, 4.02, 1.28, 'paint', { round: 0.05 }),
      box(-0.25, 4.0, 0, 5.25, 4.3, 1.45, 'paint', { round: 0.06 }),
      box(1.0, 0, 1.0, 4.0, 0.14, 2.0, 'hearth', { round: 0.03 }),
      // The grate, two logs, and the fire.
      ...[0.62, 0.92].map((z) => pipe([[1.55, 0.42, z], [3.45, 0.42, z]], 0.035, 'iron')),
      ...[1.6, 3.4].map((x) => pipe([[x, 0.14, 0.95], [x, 0.42, 0.95], [x, 0.6, 0.98]], 0.04, 'iron')),
      pipe([[1.75, 0.58, 0.72], [3.25, 0.62, 0.86]], 0.13, 'log'),
      pipe([[1.95, 0.75, 0.88], [3.1, 0.7, 0.66]], 0.11, 'log'),
      ...[[2.5, 0.78, 0.2, 1.05], [2.15, 0.82, 0.15, 0.75], [2.85, 0.76, 0.16, 0.85], [1.9, 0.72, 0.11, 0.5], [3.12, 0.74, 0.12, 0.55], [2.32, 0.66, 0.12, 0.62]].flatMap(([x, z, r, h]) => [
        { flame: [x, 0.62, z], r, h, mat: 'flame', solid: false },
        { flame: [x, 0.62, z + 0.04], r: r * 0.55, h: h * 0.62, mat: 'flamecore', solid: false },
      ]),
      // On the mantel: a clock and a pair of candlesticks.
      deco(2.15, 4.3, 0.6, 2.85, 4.95, 0.95, 'darkwood', { round: 0.12 }),
      turned(2.5, 4.62, 0.95, [[0, 0], [0.24, 0], [0.24, 0.02], [0, 0.03]], 'clockface', { rot: [Math.PI / 2, 0, 0] }),
      ...[0.6, 4.4].map((x) => turned(x, 4.3, 0.75, [[0, 0], [0.15, 0], [0.15, 0.03], [0.05, 0.08], [0.04, 0.4], [0.08, 0.45], [0, 0.45]], 'brass')),
      ...[0.6, 4.4].map((x) => cyl(x, 4.75, 0.75, 0.04, 5.15, 'candle', { solid: false })),
    ],
  },
  counter: {
    size: [4, 2],
    parts: () => [
      box(0, 0.25, 0, 4, 2.9, 1.95, 'cabinet', { round: 0.02 }),
      box(0.15, 0, 0, 3.85, 0.25, 1.75, 'darkwood'),
      box(-0.02, 2.9, 0, 4.02, 3.05, 2.08, 'stone', { round: 0.03 }),
      ...[0, 1].flatMap((k) => [
        deco(0.1 + k * 2, 0.35, 1.92, 1.9 + k * 2, 2.82, 2.0, 'cabinetDoor', { round: 0.03 }),
        deco(0.32 + k * 2, 0.58, 1.97, 1.68 + k * 2, 2.58, 2.03, 'cabinetDoor', { round: 0.06 }),
        pipe([[k ? 2.3 : 1.7, 1.95, 2.0], [k ? 2.3 : 1.7, 1.95, 2.1], [k ? 2.3 : 1.7, 2.55, 2.1], [k ? 2.3 : 1.7, 2.55, 2.0]], 0.025, 'steel'),
      ]),
      // Jars along the back.
      ...[[0.5, 0.42, 0.55], [1.0, 0.36, 0.45], [1.45, 0.3, 0.4]].flatMap(([x, r, h]) => [
        turned(x, 3.05, 0.5, [[0, 0], [r * 0.5, 0], [r * 0.5, h], [r * 0.38, h + 0.04], [0, h + 0.04]], 'glass'),
        turned(x, 3.05 + h, 0.5, [[0, 0], [r * 0.4, 0], [r * 0.4, 0.08], [0, 0.1]], 'lightwood'),
      ]),
    ],
  },
  stove: {
    size: [3, 2],
    parts: () => [
      box(0, 0, 0, 3, 2.95, 2, 'enamel', { round: 0.06 }),
      deco(0.05, 2.95, 0.05, 2.95, 3.0, 1.95, 'iron', { round: 0.02 }),
      deco(0.2, 0.35, 1.97, 2.8, 2.15, 2.05, 'enamel', { round: 0.05 }),
      deco(0.55, 0.75, 2.02, 2.45, 1.75, 2.07, 'oven', { round: 0.04 }),
      pipe([[0.4, 2.05, 2.06], [0.4, 2.05, 2.16], [2.6, 2.05, 2.16], [2.6, 2.05, 2.06]], 0.03, 'steel'),
      ...[0.5, 1.1, 1.9, 2.5].map((x) => turned(x, 2.6, 2.0, [[0, 0], [0.09, 0], [0.09, 0.05], [0.07, 0.1], [0, 0.11]], 'iron', { rot: [Math.PI / 2, 0, 0] })),
      ...[[0.8, 0.6], [2.2, 0.6], [0.8, 1.4], [2.2, 1.4]].flatMap(([x, z]) => [
        { ring: [x, 3.04, z], R: 0.3, r: 0.035, mat: 'iron', solid: false },
        { ring: [x, 3.03, z], R: 0.16, r: 0.03, mat: 'iron', solid: false },
      ]),
      // A saucepan on the back.
      turned(2.2, 3.06, 0.6, [[0, 0], [0.3, 0], [0.32, 0.02], [0.32, 0.38], [0.3, 0.38], [0.29, 0.06], [0, 0.06]], 'steel'),
      pipe([[2.5, 3.38, 0.6], [3.05, 3.42, 0.6]], 0.035, 'darkwood'),
    ],
  },
  fridge: {
    size: [3, 2],
    parts: () => [
      box(0, 0, 0, 3, 6.4, 2.2, 'enamel', { round: 0.18 }),
      deco(0.06, 4.3, 2.17, 2.94, 4.34, 2.22, 'iron', { round: 0.01 }),
      pipe([[2.6, 2.4, 2.15], [2.6, 2.4, 2.3], [2.6, 4.0, 2.3], [2.6, 4.0, 2.15]], 0.045, 'steel'),
      pipe([[2.6, 4.6, 2.15], [2.6, 4.6, 2.3], [2.6, 5.5, 2.3], [2.6, 5.5, 2.15]], 0.045, 'steel'),
      // Magnets, and a drawing held up by them.
      deco(0.6, 4.7, 2.18, 1.6, 5.9, 2.22, 'drawing', { round: 0.005 }),
      ...[[0.7, 5.8], [1.5, 5.8], [1.0, 3.3], [0.5, 2.6]].map(([x, y], k) => knob(x, y, 2.21, 0.06, 'plastic', { tint: [[0.8, 0.2, 0.1], [0.1, 0.4, 0.8], [0.9, 0.7, 0.1], [0.2, 0.6, 0.3]][k] })),
    ],
  },
  sink: {
    size: [4, 2],
    parts: () => [
      box(0, 0.25, 0, 4, 2.9, 1.95, 'cabinet', { round: 0.02 }),
      box(0.15, 0, 0, 3.85, 0.25, 1.75, 'darkwood'),
      box(-0.02, 2.9, 0, 4.02, 3.05, 2.08, 'stone', { round: 0.03 }),
      ...[0, 1].flatMap((k) => [
        deco(0.1 + k * 2, 0.35, 1.92, 1.9 + k * 2, 2.82, 2.0, 'cabinetDoor', { round: 0.03 }),
        deco(0.32 + k * 2, 0.58, 1.97, 1.68 + k * 2, 2.58, 2.03, 'cabinetDoor', { round: 0.06 }),
        pipe([[k ? 2.3 : 1.7, 1.95, 2.0], [k ? 2.3 : 1.7, 1.95, 2.1], [k ? 2.3 : 1.7, 2.55, 2.1], [k ? 2.3 : 1.7, 2.55, 2.0]], 0.025, 'steel'),
      ]),
      // The basin: a steel rim, and dark down in it; the tap over it.
      sheet(2, 3.055, 1.0, 1.05, 0.62, 5, 'steel'),
      sheet(2, 3.065, 1.0, 0.92, 0.5, 5, 'basin'),
      pipe([[2, 3.05, 0.22], [2, 3.75, 0.22], [2, 3.92, 0.32], [2, 3.85, 0.6], [2, 3.7, 0.64]], 0.05, 'steel'),
      ...[1.65, 2.35].map((x) => turned(x, 3.05, 0.25, [[0, 0], [0.06, 0], [0.05, 0.16], [0.1, 0.18], [0.1, 0.22], [0, 0.24]], 'steel')),
    ],
  },
  bathtub: {
    size: [7, 3],
    parts: () => [
      box(0, 0.3, 0, 7, 2.0, 3, 'enamel', { draw: false }),
      // A roll-top bath on claw feet: the wall swept round, the water in it.
      bowl(3.5, 0.3, 1.5, 3.3, 1.3, 4, [[-0.9, 0.0], [-0.4, 0.0], [-0.1, 0.12], [0.06, 0.6], [0.12, 1.55], [0.18, 1.62], [0.2, 1.7], [0.14, 1.76], [0.05, 1.74], [-0.02, 1.66], [-0.1, 1.2], [-0.3, 0.45], [-0.8, 0.3]], 'enamel'),
      sheet(3.5, 0.6, 1.5, 2.5, 0.55, 4, 'enamel'),
      sheet(3.5, 1.45, 1.5, 3.02, 1.04, 4, 'bathwater'),
      ...[[0.7, 0.45], [6.3, 0.45], [0.7, 2.55], [6.3, 2.55]].map(([x, z]) => turned(x, 0, z, [[0, 0], [0.2, 0], [0.22, 0.05], [0.12, 0.15], [0.1, 0.32], [0.16, 0.42], [0, 0.42]], 'brass')),
      pipe([[0.45, 1.8, 1.25], [0.45, 2.15, 1.25], [0.62, 2.28, 1.25], [0.75, 2.1, 1.25]], 0.05, 'brass'),
      pipe([[0.45, 1.8, 1.75], [0.45, 2.1, 1.75]], 0.05, 'brass'),
    ],
  },
  toilet: {
    size: [2, 3],
    parts: () => [
      // A low-level cistern on the wall, its lid and its handle, and the flush pipe down into the back of the pan.
      box(0.25, 1.85, 0.02, 1.75, 3.25, 0.6, 'enamel', { round: 0.1 }),
      deco(0.2, 3.2, 0.02, 1.8, 3.32, 0.66, 'enamel', { round: 0.05 }),
      knob(0.42, 3.02, 0.62, 0.05, 'steel'),
      pipe([[0.42, 3.02, 0.62], [0.42, 3.02, 0.7], [0.72, 2.97, 0.7]], 0.022, 'steel'),
      pipe([[1, 1.9, 0.3], [1, 1.55, 0.3], [1, 1.32, 0.45], [1, 1.22, 0.7], [1, 1.2, 0.92]], 0.07, 'steel'),
      cyl(1, 0, 1.6, 0.45, 1.2, 'enamel', { draw: false }),
      cyl(1, 1.2, 1.7, 0.75, 1.5, 'enamel', { draw: false }),
      // The pan: out from its foot to the rim, then in over it and down inside to the water.
      bowl(1, 0, 1.65, 0.38, 0.55, 2.3, [[0.04, 0], [0.04, 0.1], [-0.04, 0.3], [0.08, 0.9], [0.32, 1.32], [0.32, 1.38], [0.26, 1.4], [0.18, 1.3],
        [0.1, 1.2], [-0.02, 1.02], [-0.12, 0.86], [-0.16, 0.7]], 'enamel'),
      sheet(1, 0.88, 1.65, 0.29, 0.46, 2.3, 'bathwater'),
      // The seat on its hinges, and the lid up, resting back against the cistern.
      bowl(1, 1.4, 1.7, 0.6, 0.8, 2.3, [[-0.18, 0], [0, 0], [0.03, 0.04], [0, 0.08], [-0.18, 0.08], [-0.22, 0.04], [-0.18, 0]], 'seat'),
      knob(0.62, 1.47, 0.92, 0.055, 'steel'), knob(1.38, 1.47, 0.92, 0.055, 'steel'),
      pad(0.39, 2.28, -0.01, 1.61, 2.36, 1.61, 'seat', { up: 0.3, round: 0.6, rot: [1.41, 0, 0] }),
    ],
  },
  basin: {
    size: [2, 2],
    parts: () => [
      cyl(1, 0, 1, 0.28, 2.6, 'enamel', { profile: [[0, 0], [0.36, 0], [0.36, 0.06], [0.24, 0.3], [0.2, 1.6], [0.26, 2.3], [0.42, 2.6], [0, 2.6]] }),
      box(0.05, 2.6, 0.2, 1.95, 3.0, 1.8, 'enamel', { draw: false }),
      bowl(1, 2.55, 1.05, 0.68, 0.58, 2.6, [[-0.5, 0], [-0.1, 0.05], [0.12, 0.3], [0.14, 0.42], [0.08, 0.46], [0.0, 0.42], [-0.3, 0.2], [-0.5, 0.15]], 'enamel'),
      pipe([[1, 2.98, 0.32], [1, 3.35, 0.32], [1, 3.42, 0.5], [1, 3.3, 0.62]], 0.045, 'steel'),
    ],
  },
  washer: {
    size: [2, 2],
    parts: () => [
      box(0.05, 0, 0.05, 1.95, 2.9, 1.95, 'enamel', { round: 0.1 }),
      deco(0.12, 2.45, 1.9, 1.88, 2.82, 1.99, 'enamel', { round: 0.03 }),
      deco(0.22, 2.53, 1.95, 0.8, 2.72, 2.0, 'plastic', { round: 0.02, tint: [0.75, 0.75, 0.78] }),
      turned(1.5, 2.62, 1.98, [[0, 0], [0.1, 0], [0.1, 0.05], [0.07, 0.09], [0, 0.1]], 'plastic', { rot: [Math.PI / 2, 0, 0], tint: [0.3, 0.3, 0.32] }),
      { ring: [1, 1.35, 1.97], R: 0.6, r: 0.07, mat: 'steel', rot: [Math.PI / 2, 0, 0], solid: false },
      turned(1, 1.35, 1.92, [[0, 0], [0.56, 0], [0.5, 0.07], [0, 0.09]], 'porthole', { rot: [Math.PI / 2, 0, 0] }),
    ],
  },
  basket: {
    size: [2, 2],
    parts: () => [
      cyl(1, 0, 1, 0.85, 1.7, 'wicker', { profile: [[0, 0], [0.7, 0], [0.75, 0.06], [0.88, 1.55], [0.94, 1.6], [0.94, 1.72], [0.84, 1.72], [0.8, 1.6], [0.7, 1.2], [0, 1.2]] }),
      // Balls of wool in it, and needles stuck through one.
      knob(0.75, 1.42, 0.85, 0.42, 'wool', { tint: [0.25, 0.42, 0.62] }),
      knob(1.3, 1.4, 1.05, 0.38, 'wool', { tint: [0.86, 0.8, 0.66] }),
      knob(0.9, 1.45, 1.38, 0.36, 'wool', { tint: [0.38, 0.55, 0.32] }),
      pipe([[0.4, 1.3, 0.6], [1.35, 2.4, 1.1]], 0.025, 'needle'),
      pipe([[0.55, 1.25, 1.05], [1.0, 2.5, 0.55]], 0.025, 'needle'),
      knob(1.35, 2.4, 1.1, 0.05, 'needle'), knob(1.0, 2.5, 0.55, 0.05, 'needle'),
    ],
  },
  box: {
    size: [2, 2],
    parts: (c) => {
      const h = c.h ?? 1.8;
      return [
        box(0.05, 0, 0.05, 1.95, h, 1.95, 'cardboard', { round: 0.03 }),
        deco(0.06, h - 0.004, 0.98, 1.94, h + 0.003, 1.02, 'shadowline', { round: 0.001 }),
        deco(0.62, h - 0.01, 0.03, 1.38, h + 0.012, 1.97, 'tape', { round: 0.005 }),
        deco(0.62, h - 0.4, 1.94, 1.38, h + 0.01, 1.972, 'tape', { round: 0.005 }),
        deco(0.62, h - 0.4, 0.028, 1.38, h + 0.01, 0.06, 'tape', { round: 0.005 }),
      ];
    },
  },
  bigBox: {
    size: [3, 3],
    parts: (c) => {
      const h = c.h ?? 2.6;
      return [
        box(0.05, 0, 0.05, 2.95, h, 2.95, 'cardboard', { round: 0.04 }),
        deco(0.06, h - 0.004, 1.48, 2.94, h + 0.003, 1.52, 'shadowline', { round: 0.001 }),
        deco(1.08, h - 0.01, 0.03, 1.92, h + 0.012, 2.97, 'tape', { round: 0.005 }),
        deco(1.08, h - 0.45, 2.94, 1.92, h + 0.01, 2.972, 'tape', { round: 0.005 }),
        deco(1.08, h - 0.45, 0.028, 1.92, h + 0.01, 0.06, 'tape', { round: 0.005 }),
      ];
    },
  },
  trunk: {
    size: [4, 2],
    parts: () => [
      box(0, 0, 0, 4, 2.0, 2.2, 'darkwood', { draw: false }),
      deco(0, 0, 0, 4, 1.45, 2.2, 'darkwood', { round: 0.06 }),
      pad(0, 1.0, 0, 4, 2.02, 2.2, 'darkwood', { up: 0.55, round: 0.12, clip: 1.42 }),
      deco(-0.03, 1.38, -0.03, 4.03, 1.52, 2.23, 'brass', { round: 0.03 }),
      ...[0.7, 3.3].map((x) => deco(x - 0.14, 0.02, -0.03, x + 0.14, 1.98, 2.23, 'leather', { round: 0.04 })),
      deco(1.85, 1.15, 2.2, 2.15, 1.5, 2.26, 'brass', { round: 0.03 }),
    ],
  },
  catTree: {
    size: [2, 2],
    parts: () => [
      box(0, 0, 0, 2, 0.3, 2, 'carpet', { round: 0.08 }),
      cyl(1, 0.3, 1, 0.22, 4.4, 'sisal'),
      box(-0.2, 2.2, -0.2, 2.2, 2.4, 2.2, 'carpet', { solid: false, round: 0.09 }),
      box(0, 4.4, 0, 2, 4.6, 2, 'carpet', { solid: false, round: 0.09 }),
      // A bed on top, and a toy on a string from the middle shelf.
      bowl(1, 4.6, 1, 0.78, 0.78, 2, [[-0.6, 0], [0.0, 0.0], [0.08, 0.15], [0.06, 0.32], [-0.04, 0.36], [-0.12, 0.28], [-0.2, 0.1], [-0.6, 0.08]], 'carpet'),
      pipe([[1.9, 2.2, 1.9], [1.92, 1.35, 1.92]], 0.012, 'string'),
      knob(1.92, 1.27, 1.92, 0.11, 'wool', { tint: [0.9, 0.2, 0.5] }),
    ],
  },
  coatStand: {
    size: [1, 1],
    parts: () => [
      cyl(0.5, 0, 0.5, 0.4, 0.1, 'darkwood', { profile: [[0, 0], [0.38, 0], [0.4, 0.04], [0.3, 0.1], [0.08, 0.14], [0, 0.14]] }),
      cyl(0.5, 0, 0.5, 0.07, 6.0, 'darkwood', { profile: [[0.07, 0], [0.05, 0.4], [0.045, 5.6], [0.07, 5.7], [0.09, 5.85], [0.05, 6.0], [0, 6.05]] }),
      ...[0, 1, 2, 3].map((k) => {
        const a = (k / 4) * Math.PI * 2 + 0.4;
        return pipe([[0.5, 5.35, 0.5], [0.5 + Math.cos(a) * 0.25, 5.55, 0.5 + Math.sin(a) * 0.25], [0.5 + Math.cos(a) * 0.32, 5.75, 0.5 + Math.sin(a) * 0.32]], 0.025, 'brass');
      }),
      // A coat, a scarf, and a hat on top.
      pad(0.05, 3.0, 0.15, 0.95, 5.55, 0.95, 'coat', { up: 0.75, round: 0.6 }),
      pad(0.25, 4.95, 0.3, 0.75, 5.5, 0.75, 'coat', { up: 0.8, round: 0.8 }),
      pipe([[0.32, 5.4, 0.85], [0.6, 5.45, 0.95], [0.85, 5.1, 0.78], [0.9, 4.3, 0.72]], 0.08, 'wool', { tint: [0.7, 0.16, 0.12] }),
      turned(0.5, 5.95, 0.5, [[0, 0], [0.42, 0], [0.42, 0.04], [0.26, 0.06], [0.24, 0.4], [0.18, 0.44], [0, 0.45]], 'hat'),
    ],
  },
  shoeRack: {
    size: [3, 1],
    parts: () => [
      box(0, 0, 0, 3, 1.4, 1, 'darkwood', { draw: false }),
      deco(0, 0, 0, 0.12, 1.4, 1, 'darkwood', { round: 0.03 }),
      deco(2.88, 0, 0, 3, 1.4, 1, 'darkwood', { round: 0.03 }),
      ...[0.15, 0.75, 1.3].flatMap((y) => [0.15, 0.4, 0.65, 0.88].map((z) => deco(0.1, y, z - 0.08, 2.9, y + 0.07, z + 0.08, 'darkwood', { round: 0.025 }))),
      // Shoes on it: a pair of brogues, a pair of boots.
      ...[0.45, 0.95].flatMap((x) => [
        pad(x - 0.17, 1.33, 0.12, x + 0.17, 1.62, 0.92, 'leather', { up: 0.5, round: 0.5 }),
        deco(x - 0.15, 1.36, 0.12, x + 0.15, 1.52, 0.32, 'leather', { round: 0.07 }),
      ]),
      ...[1.75, 2.35].flatMap((x) => [
        pad(x - 0.2, 1.33, 0.1, x + 0.2, 1.65, 0.95, 'boot', { up: 0.5, round: 0.5 }),
        cyl(x, 1.4, 0.32, 0.18, 2.6, 'boot', { solid: false, profile: [[0.17, 0], [0.18, 1.0], [0.2, 1.2], [0.15, 1.2], [0, 1.0]] }),
      ]),
      ...[0.4, 0.95].map((x) => pad(x - 0.17, 0.75, 0.12, x + 0.17, 1.02, 0.92, 'plastic', { up: 0.5, round: 0.5, tint: [0.9, 0.85, 0.8] })),
    ],
  },
  catBed: {
    size: [2, 2],
    parts: () => [
      { ring: [1, 0.22, 1], R: 0.72, r: 0.22, mat: 'cushion', solid: false },
      pad(0.3, 0, 0.3, 1.7, 0.3, 1.7, 'cushion', { up: 0.5, round: 1 }),
      pad(0.45, 0.2, 0.5, 1.5, 0.38, 1.45, 'blanket', { up: 0.4, round: 0.8, rot: [0, 0.4, 0.08] }),
    ],
  },
  bowls: {
    size: [2, 1],
    parts: () => [
      ...[0.55, 1.45].map((x) => turned(x, 0, 0.5, [[0, 0], [0.26, 0], [0.3, 0.03], [0.36, 0.2], [0.33, 0.22], [0.26, 0.08], [0, 0.08]], 'china')),
      sheet(1.45, 0.16, 0.5, 0.29, 0.29, 2, 'bathwater'),
      ...[[0.48, 0.45], [0.6, 0.55], [0.55, 0.4], [0.62, 0.45], [0.5, 0.58], [0.43, 0.52], [0.56, 0.5]].map(([x, z], k) => knob(x, 0.13 + (k % 3) * 0.025, z, 0.045, 'kibble')),
    ],
  },
};

/** A part's bounds in its piece's own frame: [x0, y0, z0, x1, y1, z1]. */
export function partBounds(p) {
  if (p.box) return p.box;
  if (p.cyl) {
    const [x, y0, z, r, y1] = p.cyl;
    if (p.axis === 'z') return [x - r, p.y - r, z, x + r, p.y + r, z + (y1 - y0)];
    return [x - r, y0, z - r, x + r, y1, z + r];
  }
  if (p.cone) {
    const [x, y0, z, r0, r1, y1] = p.cone;
    const r = Math.max(r0, r1);
    return [x - r, y0, z - r, x + r, y1, z + r];
  }
  const [x, y, z, r] = p.ball;
  return [x - r, y - r, z - r, x + r, y + r, z + r];
}

/** Turns a piece's own (x, z) onto the grid: `turns` quarter turns, its footprint `w` × `d` at (X, Z). */
export function place(x, z, w, d, turns, X, Z) {
  switch (((turns % 4) + 4) % 4) {
    case 1: return [X + d - z, Z + x];
    case 2: return [X + w - x, Z + d - z];
    case 3: return [X + z, Z + w - x];
    default: return [X + x, Z + z];
  }
}

/** Which way a piece faces, as the quarter turns that take +z to it. */
export const FACING = { '+z': 0, '-x': 1, '-z': 2, '+x': 3 };

/**
 * One placed piece: its kind, where (the back left tile of its footprint as
 * it stands), how it is turned, and its parts' bounds on the grid —
 * `solids` (what the ball rolls into) and `under` (the tiles a cat can't get
 * under) — and where its lamp is, if it has one. `y` is the floor under it.
 */
export function placed(kind, x, z, { facing = '+z', y = 0, ...colors } = {}) {
  const def = FURNITURE[kind];
  if (!def) throw new Error(`no such furniture as ${kind}`);
  const turns = FACING[facing] ?? 0;
  const [w, d] = def.size;
  const parts = def.parts({ fabric: '#6a5a7a', cushion: 'cushion', ...colors });
  const onGrid = (b) => {
    const [ax, az] = place(b[0], b[2], w, d, turns, x, z);
    const [bx, bz] = place(b[3], b[5], w, d, turns, x, z);
    return [Math.min(ax, bx), b[1] + y, Math.min(az, bz), Math.max(ax, bx), b[4] + y, Math.max(az, bz)];
  };
  const solids = parts.filter((p) => p.solid).map((p) => onGrid(partBounds(p)));
  const lamp = def.lamp ? (() => {
    const [lx, lz] = place(def.lamp[0], def.lamp[2], w, d, turns, x, z);
    return [lx, def.lamp[1] + y, lz];
  })() : null;
  const [fw, fd] = turns % 2 ? [d, w] : [w, d];
  return { kind, x, z, y, w: fw, d: fd, turns, facing, colors, parts, solids, lamp, onGrid, size: [w, d] };
}
