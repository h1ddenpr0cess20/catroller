/**
 * The furniture: what stands about the house, made of parts — boxes and
 * cylinders, each a material — in tiles, on a footprint of whole tiles
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

const box = (x0, y0, z0, x1, y1, z1, mat, o = {}) => ({ box: [x0, y0, z0, x1, y1, z1], mat, solid: true, ...o });
const cyl = (x, y0, z, r, y1, mat, o = {}) => ({ cyl: [x, y0, z, r, y1], mat, solid: true, ...o });
const legs = (w, d, h, mat, inset = 0.25, r = 0.09) => [
  cyl(inset, 0, inset, r, h, mat), cyl(w - inset, 0, inset, r, h, mat),
  cyl(inset, 0, d - inset, r, h, mat), cyl(w - inset, 0, d - inset, r, h, mat),
];

/**
 * Every kind of furniture: `size` [w, d] in tiles, `parts`, and `lamp` if it
 * gives light ([x, y, z] in its own frame). A part's `mat` is one of the
 * materials in `scenery.js` (the colour of fabric and paint comes from the
 * piece, as `colors`).
 */
export const FURNITURE = {
  sofa: {
    size: [6, 3],
    parts: (c) => [
      ...legs(6, 3, LOW, 'darkwood', 0.35),
      box(0.1, LOW, 0.15, 5.9, 1.35, 2.9, c.fabric),
      box(0.1, LOW, 0.15, 5.9, 2.95, 0.95, c.fabric),
      box(0.1, LOW, 0.15, 0.75, 2.05, 2.95, c.fabric),
      box(5.25, LOW, 0.15, 5.9, 2.05, 2.95, c.fabric),
      ...[0, 1, 2].map((k) => box(0.8 + k * 1.48, 1.35, 0.95, 0.8 + k * 1.48 + 1.44, 1.72, 2.88, c.cushion, { solid: false, round: 0.12 })),
      ...[0, 1, 2].map((k) => box(0.85 + k * 1.48, 1.6, 0.9, 0.8 + k * 1.48 + 1.4, 2.7, 1.3, c.cushion, { solid: false, round: 0.15 })),
    ],
  },
  armchair: {
    size: [3, 3],
    parts: (c) => [
      ...legs(3, 3, LOW, 'darkwood', 0.3),
      box(0.1, LOW, 0.15, 2.9, 1.35, 2.9, c.fabric),
      box(0.1, LOW, 0.15, 2.9, 3.0, 0.9, c.fabric),
      box(0.1, LOW, 0.15, 0.65, 2.1, 2.95, c.fabric),
      box(2.35, LOW, 0.15, 2.9, 2.1, 2.95, c.fabric),
      box(0.7, 1.35, 0.9, 2.3, 1.72, 2.88, c.cushion, { solid: false, round: 0.12 }),
    ],
  },
  bed: {
    size: [6, 8],
    parts: (c) => [
      ...legs(6, 8, LOW, 'wood', 0.3, 0.12),
      box(0, LOW, 0, 6, 1.4, 8, 'wood'),
      box(0.15, 1.4, 0.35, 5.85, 2.05, 7.9, 'linen', { round: 0.15 }),
      box(0.05, 1.85, 3, 5.95, 2.2, 7.98, c.fabric, { solid: false, round: 0.1 }),
      box(0.6, 2.05, 0.6, 2.75, 2.45, 1.9, 'linen', { solid: false, round: 0.2 }),
      box(3.25, 2.05, 0.6, 5.4, 2.45, 1.9, 'linen', { solid: false, round: 0.2 }),
      box(0, 0, 0, 6, 3.8, 0.35, 'wood'),
    ],
  },
  dresser: {
    size: [4, 2],
    parts: () => [
      ...legs(4, 2, LOW, 'wood', 0.25, 0.1),
      box(0.05, LOW, 0.05, 3.95, 3.3, 1.95, 'wood'),
      ...[0, 1, 2].map((k) => box(0.25, LOW + 0.15 + k * 0.8, 1.94, 3.75, LOW + 0.85 + k * 0.8, 2.0, 'lightwood', { solid: false })),
      ...[0, 1, 2].map((k) => cyl(2, LOW + 0.5 + k * 0.8, 2.03, 0.07, LOW + 0.56 + k * 0.8, 'brass', { solid: false })),
    ],
  },
  wardrobe: {
    size: [4, 2],
    parts: () => [box(0, 0, 0, 4, 6.4, 2, 'wood'), box(1.96, 0.3, 1.99, 2.04, 6.1, 2.02, 'darkwood', { solid: false }), cyl(1.8, 3.2, 2.05, 0.06, 3.3, 'brass', { solid: false }), cyl(2.2, 3.2, 2.05, 0.06, 3.3, 'brass', { solid: false })],
  },
  bookshelf: {
    size: [4, 1],
    parts: () => [
      box(0, 0, 0, 4, 5.2, 1.1, 'darkwood'),
      ...[0, 1, 2, 3].map((k) => box(0.15, 0.4 + k * 1.2, 0.95, 3.85, 1.4 + k * 1.2, 1.12, 'books', { solid: false })),
    ],
  },
  coffeeTable: {
    size: [4, 3],
    parts: () => [...legs(4, 3, 1.4, 'darkwood', 0.3, 0.1), box(0, 1.4, 0.2, 4, 1.58, 2.8, 'wood')],
  },
  table: {
    size: [6, 4],
    parts: () => [...legs(6, 4, 2.45, 'wood', 0.35, 0.12), box(0, 2.45, 0, 6, 2.62, 4, 'wood')],
  },
  chair: {
    size: [2, 2],
    parts: () => [
      ...legs(1.7, 1.7, 1.45, 'wood', 0.2, 0.07).map((p) => ({ ...p, cyl: [p.cyl[0] + 0.15, p.cyl[1], p.cyl[2] + 0.15, p.cyl[3], p.cyl[4]] })),
      box(0.15, 1.45, 0.15, 1.85, 1.58, 1.85, 'wood'),
      box(0.15, 1.58, 0.15, 1.85, 3.3, 0.3, 'wood'),
    ],
  },
  sideTable: {
    size: [2, 2],
    lamp: [1, 3.3, 1],
    parts: () => [
      ...legs(2, 2, 1.9, 'darkwood', 0.25, 0.07),
      box(0, 1.9, 0, 2, 2.04, 2, 'darkwood'),
      cyl(1, 2.04, 1, 0.3, 2.2, 'brass', { solid: false }),
      cyl(1, 2.2, 1, 0.06, 3.0, 'brass', { solid: false }),
      { cone: [1, 2.9, 1, 0.65, 0.4, 3.55], mat: 'shade', solid: false },
    ],
  },
  floorLamp: {
    size: [1, 1],
    lamp: [0.5, 5.2, 0.5],
    parts: () => [
      cyl(0.5, 0, 0.5, 0.42, 0.1, 'brass'),
      cyl(0.5, 0, 0.5, 0.06, 5.0, 'brass'),
      { cone: [0.5, 4.8, 0.5, 0.75, 0.45, 5.7], mat: 'shade', solid: false },
    ],
  },
  plant: {
    size: [2, 2],
    parts: () => [
      cyl(1, 0, 1, 0.6, 1.3, 'terracotta'),
      cyl(1, 1.3, 1, 0.68, 1.45, 'terracotta'),
      ...[[1, 2.3, 1, 0.75], [0.6, 2.0, 1.2, 0.5], [1.4, 2.1, 0.8, 0.55], [1.1, 2.9, 1.1, 0.5]].map(([x, y, z, r]) => ({ ball: [x, y, z, r], mat: 'leaf', solid: false })),
    ],
  },
  tvStand: {
    size: [5, 2],
    parts: () => [
      box(0, 0, 0, 5, 1.6, 1.6, 'darkwood'),
      box(0.4, 1.6, 0.5, 4.6, 4.2, 0.65, 'screen'),
      box(2.1, 1.6, 0.4, 2.9, 1.75, 0.9, 'metal', { solid: false }),
    ],
  },
  piano: {
    size: [5, 2],
    parts: () => [
      box(0, 0, 0, 5, 4.2, 1.2, 'piano'),
      box(0, 2.4, 1.2, 5, 2.6, 1.9, 'piano'),
      box(0.2, 2.6, 1.25, 4.8, 2.7, 1.85, 'keys', { solid: false }),
      box(0.3, 0, 1.2, 0.5, 2.4, 1.8, 'piano'), box(4.5, 0, 1.2, 4.7, 2.4, 1.8, 'piano'),
    ],
  },
  fireplace: {
    size: [5, 2],
    lamp: [2.5, 0.8, 1.6],
    parts: () => [
      box(0, 0, 0, 5, 4.4, 1.0, 'brick'),
      box(-0.2, 4.0, 0, 5.2, 4.3, 1.4, 'paint'),
      box(1.2, 0, 1.0, 3.8, 0.12, 1.9, 'hearth'),
      box(1.4, 0.12, 0.6, 3.6, 2.2, 1.05, 'soot', { solid: false }),
      { cone: [2.5, 0.2, 0.95, 0.5, 0.01, 1.4], mat: 'flame', solid: false },
      { cone: [2.1, 0.2, 0.9, 0.3, 0.01, 1.0], mat: 'flame', solid: false },
      { cone: [2.9, 0.2, 0.9, 0.3, 0.01, 1.05], mat: 'flame', solid: false },
    ],
  },
  counter: {
    size: [4, 2],
    parts: () => [box(0, 0.25, 0, 4, 2.9, 1.95, 'cabinet'), box(0.15, 0, 0, 3.85, 0.25, 1.75, 'darkwood'), box(0, 2.9, 0, 4, 3.05, 2.05, 'stone'),
      ...[0, 1].map((k) => box(0.12 + k * 2, 0.4, 1.94, 1.88 + k * 2, 2.75, 1.99, 'cabinetDoor', { solid: false }))],
  },
  stove: {
    size: [3, 2],
    parts: () => [box(0, 0, 0, 3, 2.95, 2, 'enamel'), box(0.2, 0.4, 1.99, 2.8, 2.2, 2.04, 'oven', { solid: false }),
      ...[[0.8, 0.6], [2.2, 0.6], [0.8, 1.4], [2.2, 1.4]].map(([x, z]) => cyl(x, 2.95, z, 0.35, 3.0, 'iron', { solid: false }))],
  },
  fridge: {
    size: [3, 2],
    parts: () => [box(0, 0, 0, 3, 6.4, 2.2, 'enamel', { round: 0.15 }), box(2.6, 2.4, 2.18, 2.72, 4.4, 2.3, 'metal', { solid: false })],
  },
  sink: {
    size: [4, 2],
    parts: () => [box(0, 0.25, 0, 4, 2.9, 1.95, 'cabinet'), box(0, 2.9, 0, 4, 3.05, 2.05, 'stone'), box(1.0, 3.0, 0.4, 3.0, 3.06, 1.6, 'steel', { solid: false }),
      cyl(2, 3.05, 0.25, 0.08, 3.9, 'steel', { solid: false })],
  },
  bathtub: {
    size: [7, 3],
    parts: () => [box(0, 0.3, 0, 7, 2.0, 3, 'enamel', { round: 0.3 }), box(0.4, 1.95, 0.4, 6.6, 2.02, 2.6, 'bathwater', { solid: false }),
      ...[[0.5, 0.5], [6.5, 0.5], [0.5, 2.5], [6.5, 2.5]].map(([x, z]) => cyl(x, 0, z, 0.2, 0.35, 'brass'))],
  },
  toilet: {
    size: [2, 3],
    parts: () => [box(0.2, 0, 0.2, 1.8, 3.0, 0.9, 'enamel', { round: 0.15 }), cyl(1, 0, 1.6, 0.45, 1.2, 'enamel'), cyl(1, 1.2, 1.7, 0.75, 1.5, 'enamel')],
  },
  basin: {
    size: [2, 2],
    parts: () => [cyl(1, 0, 1, 0.28, 2.6, 'enamel'), box(0.05, 2.6, 0.2, 1.95, 3.0, 1.8, 'enamel', { round: 0.2 })],
  },
  washer: {
    size: [2, 2],
    parts: () => [box(0.05, 0, 0.05, 1.95, 2.9, 1.95, 'enamel', { round: 0.08 }), cyl(1, 0, 1.95, 0.62, 0.04, 'porthole', { solid: false, axis: 'z', y: 1.4 })],
  },
  basket: {
    size: [2, 2],
    parts: () => [cyl(1, 0, 1, 0.85, 1.7, 'wicker'), cyl(1, 1.6, 1, 0.75, 1.95, 'linen', { solid: false })],
  },
  box: {
    size: [2, 2],
    parts: (c) => [box(0.05, 0, 0.05, 1.95, c.h ?? 1.8, 1.95, 'cardboard'), box(0.6, (c.h ?? 1.8) - 0.01, 0.04, 1.4, (c.h ?? 1.8) + 0.01, 1.96, 'tape', { solid: false })],
  },
  bigBox: {
    size: [3, 3],
    parts: (c) => [box(0.05, 0, 0.05, 2.95, c.h ?? 2.6, 2.95, 'cardboard'), box(1.1, (c.h ?? 2.6) - 0.01, 0.04, 1.9, (c.h ?? 2.6) + 0.01, 2.96, 'tape', { solid: false })],
  },
  trunk: {
    size: [4, 2],
    parts: () => [box(0, 0, 0, 4, 2.0, 2.2, 'darkwood', { round: 0.08 }), box(-0.02, 1.4, -0.02, 4.02, 1.55, 2.22, 'brass', { solid: false })],
  },
  catTree: {
    size: [2, 2],
    parts: () => [box(0, 0, 0, 2, 0.3, 2, 'carpet'), cyl(1, 0.3, 1, 0.22, 4.4, 'sisal'), box(-0.2, 2.2, -0.2, 2.2, 2.4, 2.2, 'carpet', { solid: false }), box(0, 4.4, 0, 2, 4.6, 2, 'carpet', { solid: false })],
  },
  coatStand: {
    size: [1, 1],
    parts: () => [cyl(0.5, 0, 0.5, 0.4, 0.1, 'darkwood'), cyl(0.5, 0, 0.5, 0.07, 6.0, 'darkwood'), { ball: [0.5, 4.8, 0.5, 0.55], mat: 'coat', solid: false }],
  },
  shoeRack: {
    size: [3, 1],
    parts: () => [box(0, 0, 0, 3, 1.4, 1, 'darkwood'), box(0.2, 1.4, 0.15, 1.3, 1.75, 0.95, 'leather', { solid: false, round: 0.12 }), box(1.6, 1.4, 0.15, 2.7, 1.7, 0.95, 'leather', { solid: false, round: 0.12 })],
  },
  catBed: {
    size: [2, 2],
    parts: () => [{ cyl: [1, 0, 1, 0.95, 0.4], mat: 'cushion', solid: false }, { cyl: [1, 0.4, 1, 0.75, 0.42], mat: 'blanket', solid: false }],
  },
  bowls: {
    size: [2, 1],
    parts: () => [{ cyl: [0.55, 0, 0.5, 0.35, 0.22], mat: 'enamel', solid: false }, { cyl: [1.45, 0, 0.5, 0.35, 0.22], mat: 'enamel', solid: false }, { cyl: [1.45, 0.2, 0.5, 0.28, 0.23], mat: 'bathwater', solid: false }, { ball: [0.55, 0.18, 0.5, 0.25], mat: 'kibble', solid: false }],
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
