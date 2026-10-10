import { coil, geometry, joined, lathe, moved, ring, roundedBox, tube } from './shapes.js';
import { buildTube } from './yarn/model.js';
import { YR } from './yarn/winding.js';
import { TILE_METRES } from './yarn/ball.js';
import { alongLoop } from './critters.js';

/**
 * Everything in the house that isn't a cat, a critter or the ball, and
 * either moves or can be taken: mousetraps (set, until the strand sets one
 * off), nails standing up out of the boards, the robot vacuum going its
 * rounds, platforms (a dumbwaiter, a tea trolley), and what lies about to
 * be picked up — buttons, tins of buttons, and skeins of red wool to wind
 * on. Strand pulled off the ball stays where it fell, as a cat's toy.
 */

const LIFT_THICKNESS = 0.35;

/** Where buttons lie (on the floor) and how much they float (the skeins turn in the air). */
const STILL = new Set(['button', 'tin']);

const smooth = (t) => t * t * (3 - 2 * t);
const cycleOf = (time, period, phase) => ((((time + phase) / period) % 1) + 1) % 1;

/** How far along its run a lift is, 0 to 1 and back, waiting `pause` (of a period) at each end. */
export function liftAt(time, period, phase = 0, pause = 0.18) {
  const u = cycleOf(time, period, phase);
  const run = 0.5 - pause;
  if (u < pause) return 0;
  if (u < 0.5) return smooth((u - pause) / run);
  if (u < 0.5 + pause) return 1;
  return 1 - smooth((u - 0.5 - pause) / run);
}

/** Button colours: an old tin's worth. */
const BUTTONS = ['#e8d8b0', '#2a4a8a', '#b8322a', '#2e6a3a', '#f2f2ea', '#6a3a1e', '#d8a020', '#7a3a8a'];

export function createActors(GFX, house, world, { yarnMaterial } = {}) {
  const group = new GFX.Group();
  group.name = 'actors';
  const M = (o) => new GFX.MeshStandardMaterial(o);
  const P = (o) => new GFX.MeshPhysicalMaterial(o);
  const mats = {
    wood: M({ name: 'trap-wood', color: new GFX.Color('#c8a070'), roughness: 0.8 }),
    steel: P({ name: 'steel', color: new GFX.Color('#c8ccd2'), roughness: 0.3, metalness: 1 }),
    copper: P({ name: 'copper', color: new GFX.Color('#c87850'), roughness: 0.35, metalness: 1 }),
    cheese: P({ name: 'cheese', color: new GFX.Color('#f2c84a'), roughness: 0.6, clearcoat: 0.2 }),
    nail: P({ name: 'nail', color: new GFX.Color('#8a8680'), roughness: 0.45, metalness: 0.9 }),
    vacuum: P({ name: 'vacuum', color: new GFX.Color('#2a2c30'), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 }),
    rim: P({ name: 'vacuum-rim', color: new GFX.Color('#c8ccd0'), roughness: 0.3, metalness: 0.6 }),
    led: new GFX.MeshBasicMaterial({ name: 'led', color: new GFX.Color('#4aff8a'), toneMapped: false }),
    tin: P({ name: 'tin', color: new GFX.Color('#2a5a8a'), roughness: 0.35, metalness: 0.7, clearcoat: 0.6 }),
    tinLid: P({ name: 'tin-lid', color: new GFX.Color('#c8a040'), roughness: 0.3, metalness: 0.9 }),
    board: M({ name: 'board', color: new GFX.Color('#9a7048'), roughness: 0.8 }),
    dumbwaiter: M({ name: 'dumbwaiter', color: new GFX.Color('#c8b8a0'), roughness: 0.6 }),
    rope: M({ name: 'rope', color: new GFX.Color('#8a7656'), roughness: 0.9 }),
  };
  const buttonMats = BUTTONS.map((c) => P({ name: 'button', color: new GFX.Color(c), roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 }));
  const holeMat = M({ name: 'button-hole', color: new GFX.Color('#1a1412'), roughness: 1 });

  // Mousetraps: a little board, a coiled spring, a wire bail on its hinge, a copper plate with a bit of cheese on it.
  const trapParts = {
    base: geometry(GFX, moved(roundedBox(0.34, 0.04, 0.6, 0.012, 2), [0, 0.02, 0])),
    spring: geometry(GFX, joined([-1, 1].map((sd) => moved(coil(0.034, 0.007, 0.08, 4), [sd * 0.08, 0.075, 0.02])))),
    plate: geometry(GFX, moved(roundedBox(0.09, 0.012, 0.12, 0.005, 1), [0, 0.046, 0.18])),
    cheese: geometry(GFX, moved(roundedBox(0.07, 0.045, 0.055, 0.012, 2), [0, 0.075, 0.18], [0, 0.4, 0])),
    staples: geometry(GFX, joined([-1, 1].map((sd) => tube([[sd * 0.05, 0.04, -0.2], [sd * 0.05, 0.055, -0.2], [sd * 0.12, 0.055, -0.2], [sd * 0.12, 0.04, -0.2]], 0.006, { radial: 5 })))),
    // Set: the bail back over the board, held down.
    bail: geometry(GFX, tube([[-0.12, 0.012, 0], [-0.13, 0, -0.03], [-0.14, 0, -0.24], [0.14, 0, -0.24], [0.13, 0, -0.03], [0.12, 0.012, 0]], 0.008, { radial: 6 })),
  };
  const traps = house.traps.map((t, i) => {
    const y = house.heightAt(t.x, t.z) ?? 0;
    const g = new GFX.Group();
    g.position.set(t.x, y, t.z);
    g.rotation.y = (i * 1.3) % 1.2 - 0.6;
    const base = new GFX.Mesh(trapParts.base, mats.wood);
    const spring = new GFX.Mesh(trapParts.spring, mats.steel);
    const plate = new GFX.Mesh(trapParts.plate, mats.copper);
    const cheese = new GFX.Mesh(trapParts.cheese, mats.cheese);
    const staples = new GFX.Mesh(trapParts.staples, mats.steel);
    // The bar, on a hinge at the middle: back over the board when set, over on the plate when it has gone off.
    const hinge = new GFX.Group();
    hinge.position.set(0, 0.062, 0.02);
    hinge.add(new GFX.Mesh(trapParts.bail, mats.steel));
    g.add(base, spring, plate, cheese, staples, hinge);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    group.add(g);
    return { ...t, y, mesh: g, hinge, sprung: false, sprungAt: 0 };
  });

  // Nails: a head and a bit of shank, standing proud of the boards.
  const nailShape = geometry(GFX, lathe([[0, -0.04], [0.016, -0.02], [0.02, 0.15], [0.048, 0.155], [0.05, 0.165], [0.04, 0.172], [0, 0.174]], 10));
  const nails = house.nails.map((n, i) => {
    const y = house.heightAt(n.x, n.z) ?? 0;
    const g = new GFX.Group();
    g.position.set(n.x + ((i * 0.37) % 0.3) - 0.15, y, n.z + ((i * 0.61) % 0.3) - 0.15);
    const nail = new GFX.Mesh(nailShape, mats.nail);
    nail.rotation.set(0.1 * Math.sin(i * 1.7), i * 1.1, 0.22 + 0.1 * Math.cos(i));
    g.add(nail);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    group.add(g);
    return { ...n, y, mesh: g, x: g.position.x, z: g.position.z, last: -Infinity };
  });

  // The robot vacuum: a disc with a bumper and a light, humming its rounds.
  const vacuumParts = {
    body: geometry(GFX, lathe([[0, 0.04], [0.5, 0.04], [0.55, 0.07], [0.57, 0.12], [0.57, 0.22], [0.54, 0.27], [0.5, 0.285], [0, 0.29]], 40)),
    bumper: geometry(GFX, moved(lathe([[0.575, 0.08], [0.6, 0.1], [0.6, 0.2], [0.575, 0.22]], 40), [0, 0, 0])),
    top: geometry(GFX, joined([moved(ring(0.3, 0.012, { seg: 40, radial: 6 }), [0, 0.288, 0]), moved(lathe([[0, 0], [0.08, 0], [0.085, 0.015], [0, 0.02]], 20), [0, 0.288, -0.1])])),
    brush: geometry(GFX, joined([0, 1, 2].map((k) => tube([[0, 0, 0], [Math.cos(k * 2.09) * 0.16, 0, Math.sin(k * 2.09) * 0.16]], 0.012, { radial: 5 })))),
  };
  const vacuums = house.vacuums.map((v, i) => {
    const g = new GFX.Group();
    const body = new GFX.Mesh(vacuumParts.body, mats.vacuum);
    const rim = new GFX.Mesh(vacuumParts.bumper, mats.rim);
    const top = new GFX.Mesh(vacuumParts.top, mats.rim);
    const led = new GFX.Mesh(new GFX.SphereGeometry(0.035, 10, 8), mats.led);
    led.position.set(0, 0.3, 0.32);
    const brush = new GFX.Mesh(vacuumParts.brush, mats.rim);
    brush.position.set(0.38, 0.03, 0.32);
    g.add(body, rim, top, led, brush);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    group.add(g);
    return { ...v, i, mesh: g, brush, led, travelled: 0, x: v.path[0][0], z: v.path[0][1], y: 0, heading: 0, radius: 0.57 };
  });

  // Lifts: a dumbwaiter's box, or a tea trolley's tray.
  const lifts = house.lifts.map((l) => {
    const mesh = new GFX.Mesh(new GFX.BoxGeometry(l.w, LIFT_THICKNESS, l.d), l.look === 'dumbwaiter' ? mats.dumbwaiter : mats.board);
    mesh.castShadow = mesh.receiveShadow = true;
    if (l.look === 'dumbwaiter') {
      for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const rope = new GFX.Mesh(new GFX.CylinderGeometry(0.03, 0.03, 12, 5), mats.rope);
        rope.position.set(cx * (l.w / 2 - 0.15), 6, cz * (l.d / 2 - 0.15));
        mesh.add(rope);
      }
    }
    group.add(mesh);
    const box = {
      solid: true, kind: 'lift', vx: 0, vy: 0, vz: 0,
      min: [l.x, l.h - LIFT_THICKNESS, l.z], max: [l.x + l.w, l.h, l.z + l.d],
    };
    return { ...l, box, mesh };
  });
  world.boxes = lifts.map((l) => l.box);

  const tinParts = {
    can: geometry(GFX, lathe([[0, 0.01], [0.28, 0.01], [0.3, 0.03], [0.3, 0.2], [0.29, 0.21], [0.29, 0.06], [0, 0.06]], 40)),
    rims: geometry(GFX, joined([moved(ring(0.3, 0.012, { seg: 40, radial: 6 }), [0, 0.025, 0]), moved(ring(0.296, 0.012, { seg: 40, radial: 6 }), [0, 0.205, 0])])),
    lid: geometry(GFX, lathe([[0, 0], [0.24, 0], [0.26, 0.012], [0.3, 0.014], [0.315, 0.02], [0.315, 0.06], [0.3, 0.06], [0.3, 0.025], [0, 0.025]], 40)),
  };

  // What lies about.
  const pickups = house.pickups.map((p, i) => {
    const mesh = new GFX.Group();
    const spin = new GFX.Group();
    mesh.add(spin);
    if (p.kind === 'button') {
      // A little scatter of buttons, more for more.
      const n = Math.max(1, Math.min(6, p.amount));
      for (let k = 0; k < n; k++) {
        const r = 0.07 + ((k * 7 + i) % 3) * 0.015;
        const b = new GFX.Mesh(new GFX.CylinderGeometry(r, r, 0.03, 18), buttonMats[(i * 3 + k) % buttonMats.length]);
        const a = k * 2.4 + i, d = k === 0 ? 0 : 0.12 + (k % 2) * 0.06;
        b.position.set(Math.cos(a) * d, 0.016 + (k % 3) * 0.002, Math.sin(a) * d);
        b.rotation.set(((k * 0.7) % 0.3) - 0.15, 0, ((k * 0.4) % 0.3) - 0.15);
        for (const [hx, hz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const hole = new GFX.Mesh(new GFX.CylinderGeometry(r * 0.13, r * 0.13, 0.034, 6), holeMat);
          hole.position.set(hx * r * 0.28, 0, hz * r * 0.28);
          b.add(hole);
        }
        b.castShadow = true;
        spin.add(b);
      }
    } else if (p.kind === 'tin') {
      // A round biscuit tin with a sewing box's worth of buttons in it, its lid off and leant against it.
      const can = new GFX.Mesh(tinParts.can, mats.tin);
      const rims = new GFX.Mesh(tinParts.rims, mats.tinLid);
      const lid = new GFX.Mesh(tinParts.lid, mats.tinLid);
      lid.position.set(0.34, 0.16, 0.0);
      lid.rotation.z = 1.2;
      spin.add(can, rims, lid);
      for (let k = 0; k < 7; k++) {
        const r = 0.07;
        const b = new GFX.Mesh(new GFX.CylinderGeometry(r, r, 0.03, 14), buttonMats[(k + i) % buttonMats.length]);
        b.position.set(Math.cos(k * 2.3) * 0.15, 0.17 + (k % 3) * 0.02, Math.sin(k * 2.3) * 0.15);
        b.rotation.set(Math.sin(k) * 0.4, 0, Math.cos(k) * 0.4);
        spin.add(b);
      }
      spin.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    } else if (p.kind === 'skein' && yarnMaterial) {
      spin.add(skeinMesh(GFX, yarnMaterial, i));
    }
    if (STILL.has(p.kind)) spin.rotation.y = (i * 2.399963) % (Math.PI * 2);
    const ground = house.heightAt(p.x, p.z) ?? 0;
    mesh.position.set(p.x, ground, p.z);
    group.add(mesh);
    return { ...p, y: ground, mesh, spin, taken: false };
  });

  const moveBox = (box, x, y, z, dt) => {
    if (dt > 0) {
      box.vx = (x - box.min[0]) / dt;
      box.vy = (y - box.min[1]) / dt;
      box.vz = (z - box.min[2]) / dt;
    }
    const sx = box.max[0] - box.min[0], sy = box.max[1] - box.min[1], sz = box.max[2] - box.min[2];
    box.min[0] = x; box.min[1] = y; box.min[2] = z;
    box.max[0] = x + sx; box.max[1] = y + sy; box.max[2] = z + sz;
  };

  /** Bits of strand lying about: toys. */
  const toys = [];

  return {
    group, traps, nails, vacuums, lifts, pickups, toys,

    /** Puts what moves by the clock where it is at `time`. */
    place(time, dt = 0) {
      for (const l of lifts) {
        const s = liftAt(time, l.period, l.phase, l.pause);
        moveBox(l.box, l.x + l.to[0] * s, l.h - LIFT_THICKNESS + l.to[1] * s, l.z + l.to[2] * s, dt);
      }
      for (const v of vacuums) {
        v.travelled = time * v.speed;
        const [x, z] = alongLoop(v.path, v.travelled);
        const [nx, nz] = alongLoop(v.path, v.travelled + 0.1);
        v.x = x; v.z = z;
        v.y = house.heightAt(x, z) ?? v.y;
        if (Math.hypot(nx - x, nz - z) > 1e-6) v.heading = Math.atan2(nx - x, nz - z);
      }
    },

    /** A length of strand left on the floor (from `yarn/ball.js`): drawn, and a toy for any cat that sees it. */
    drop(piece) {
      group.add(piece.group);
      const [x, , z] = piece.at;
      const mid = piece.along[Math.floor(piece.along.length / 2)] ?? [x, z];
      toys.push({ toy: true, x: mid[0], z: mid[1], y: house.heightAt(mid[0], mid[1]) ?? 0, piece, watchers: new Set(), spent: false });
    },

    /** Sets a trap off. */
    spring(trap, time) {
      trap.sprung = true;
      trap.sprungAt = time;
    },

    sync(dt, time) {
      for (const t of traps) {
        // Back over the board, set; flung over onto the plate once it goes off.
        const k = t.sprung ? Math.min(1, (time - t.sprungAt) / 0.06) : 0;
        t.hinge.rotation.x = -0.15 + k * (Math.PI - 0.3) * -1;
      }
      for (const l of lifts) {
        l.mesh.position.set((l.box.min[0] + l.box.max[0]) / 2, (l.box.min[1] + l.box.max[1]) / 2, (l.box.min[2] + l.box.max[2]) / 2);
      }
      for (const v of vacuums) {
        v.mesh.position.set(v.x, v.y, v.z);
        v.mesh.rotation.y = v.heading;
        v.brush.rotation.y = time * 18;
        v.led.visible = Math.sin(time * 3) > -0.6;
      }
      for (const [i, p] of pickups.entries()) {
        p.mesh.visible = !p.taken;
        if (p.taken || STILL.has(p.kind)) continue;
        p.spin.position.y = 0.25 + Math.sin(time * 2.4 + i) * 0.06;
        p.spin.rotation.y = time * 1.4 + i;
      }
    },
  };
}

/**
 * A skein of the same red wool as the ball, the way wool is sold: strand
 * wound criss-cross round and round into a plump oblong, the turns laid
 * one over the last, with a paper band round its middle.
 */
export function skeinMesh(GFX, material, seed = 0) {
  const turns = 54, per = 52, n = turns * per;
  // Half its length and its thickness, in metres, as the ball is.
  const a = 0.068, b = 0.04;
  const C = new Float32Array(n * 3), T = new Float32Array(n * 3), NR = new Float32Array(n * 3), A = new Float32Array(n);
  const OUT = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / per, th = t * Math.PI * 2;
    // Each turn goes end over end round the skein's length, on a plane a little askew so the turns cross,
    // swung round the length a little further every turn.
    const phi = t * 2.399963 + seed * 1.7, beta = 0.32 * Math.sin(t * 1.9 + seed);
    const nx = Math.sin(beta), ny = Math.cos(beta) * Math.cos(phi), nz = Math.cos(beta) * Math.sin(phi);
    // In the plane: the length (x, less its part along the plane's normal), and square to it.
    let e1 = [1 - nx * nx, -nx * ny, -nx * nz];
    const el = Math.hypot(...e1);
    e1 = e1.map((v) => v / el);
    const e2 = [ny * e1[2] - nz * e1[1], nz * e1[0] - nx * e1[2], nx * e1[1] - ny * e1[0]];
    const u = [Math.cos(th) * e1[0] + Math.sin(th) * e2[0], Math.cos(th) * e1[1] + Math.sin(th) * e2[1], Math.cos(th) * e1[2] + Math.sin(th) * e2[2]];
    // From the core out: each turn a little further out than the last.
    const out = t / turns, layer = 0.86 + 0.14 * out;
    const k = layer / Math.hypot(u[0] / a, u[1] / b, u[2] / b);
    C[3 * i] = u[0] * k; C[3 * i + 1] = u[1] * k; C[3 * i + 2] = u[2] * k;
    OUT[i] = out;
  }
  for (let i = 0; i < n; i++) {
    const p = Math.max(0, i - 1), q = Math.min(n - 1, i + 1);
    let tx = C[3 * q] - C[3 * p], ty = C[3 * q + 1] - C[3 * p + 1], tz = C[3 * q + 2] - C[3 * p + 2];
    const l = Math.hypot(tx, ty, tz) || 1;
    tx /= l; ty /= l; tz /= l;
    T[3 * i] = tx; T[3 * i + 1] = ty; T[3 * i + 2] = tz;
    // The ring's reference: straight out from the middle, square to the strand.
    let ux = C[3 * i] / (a * a), uy = C[3 * i + 1] / (b * b), uz = C[3 * i + 2] / (b * b);
    const d = ux * tx + uy * ty + uz * tz;
    ux -= d * tx; uy -= d * ty; uz -= d * tz;
    const ul = Math.hypot(ux, uy, uz) || 1;
    NR[3 * i] = ux / ul; NR[3 * i + 1] = uy / ul; NR[3 * i + 2] = uz / ul;
    if (i > 0) A[i] = A[i - 1] + Math.hypot(C[3 * i] - C[3 * i - 3], C[3 * i + 1] - C[3 * i - 2], C[3 * i + 2] - C[3 * i - 1]);
  }
  // The turns underneath are in the shade of the ones over them.
  const geo = buildTube(GFX, n, C, T, NR, A, null, null, (i, x, y, z, qx, qy, qz) => {
    const facing = (qx * x / (a * a) + qy * y / (b * b) + qz * z / (b * b)) / Math.hypot(x / (a * a), y / (b * b), z / (b * b));
    return (0.4 + 0.6 * Math.max(0, facing)) * (0.6 + 0.4 * OUT[i]);
  });
  const mesh = new GFX.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.name = 'skein';

  // The paper band: round its middle, over the wool.
  const profile = [];
  for (let j = 0; j <= 12; j++) {
    const x = (j / 12 - 0.5) * a * 0.7;
    profile.push(new GFX.Vector2(b * Math.sqrt(1 - (x / a) ** 2) + YR * 1.6, x));
  }
  const band = new GFX.Mesh(new GFX.LatheGeometry(profile, 48), bandMaterial(GFX));
  band.rotation.z = Math.PI / 2;
  band.castShadow = true;

  const g = new GFX.Group();
  g.add(mesh, band);
  g.rotation.set(0.25, seed * 0.7, 0.18);
  g.scale.setScalar(1 / TILE_METRES * 1.35);
  return g;
}

let bandMat = null;

/** The skein's paper band: cream, with red rules round it and a ball of wool on the label. */
function bandMaterial(GFX) {
  if (bandMat) return bandMat;
  bandMat = new GFX.MeshPhysicalMaterial({ name: 'skein-band', color: new GFX.Color('#f2e8d2'), roughness: 0.7, side: GFX.DoubleSide });
  if (typeof document === 'undefined') return bandMat;
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#f2e8d2';
  x.fillRect(0, 0, 512, 128);
  // u runs round the band, v along it.
  for (const y of [10, 108]) {
    x.fillStyle = '#b8241a';
    x.fillRect(0, y, 512, 10);
  }
  x.fillStyle = '#2a3a5a';
  x.fillRect(0, 26, 512, 4);
  x.fillRect(0, 98, 512, 4);
  for (const cx of [128, 384]) {
    // A ball of wool, and a few words.
    x.fillStyle = '#c8281c';
    x.beginPath(); x.arc(cx - 70, 64, 20, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#f2e8d2'; x.lineWidth = 2;
    for (let k = -2; k <= 2; k++) { x.beginPath(); x.arc(cx - 70 + k * 6, 64, 20 - Math.abs(k) * 2, -1, 1); x.stroke(); }
    x.fillStyle = '#2a3a5a';
    x.font = 'bold 26px Georgia, serif';
    x.textAlign = 'left';
    x.textBaseline = 'middle';
    x.fillText('PURE WOOL', cx - 40, 56);
    x.font = '16px Georgia, serif';
    x.fillText('50 g · 4 ply', cx - 40, 82);
  }
  const t = new GFX.CanvasTexture(c);
  t.colorSpace = GFX.SRGBColorSpace;
  t.wrapS = GFX.RepeatWrapping;
  bandMat.map = t;
  bandMat.needsUpdate = true;
  return bandMat;
}
