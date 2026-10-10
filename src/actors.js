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

  // Mousetraps: a little board, a copper spring, a steel bar across, a bit of cheese on the plate.
  const traps = house.traps.map((t, i) => {
    const y = house.heightAt(t.x, t.z) ?? 0;
    const g = new GFX.Group();
    g.position.set(t.x, y, t.z);
    g.rotation.y = (i * 1.3) % 1.2 - 0.6;
    const base = new GFX.Mesh(new GFX.BoxGeometry(0.34, 0.04, 0.6), mats.wood);
    base.position.y = 0.02;
    const spring = new GFX.Mesh(new GFX.TorusGeometry(0.05, 0.012, 6, 14), mats.copper);
    spring.position.set(0, 0.06, 0.02);
    spring.rotation.y = Math.PI / 2;
    const plate = new GFX.Mesh(new GFX.BoxGeometry(0.1, 0.012, 0.12), mats.steel);
    plate.position.set(0, 0.05, 0.16);
    const cheese = new GFX.Mesh(new GFX.ConeGeometry(0.05, 0.05, 3), mats.cheese);
    cheese.position.set(0, 0.08, 0.17);
    // The bar, on a hinge at the middle: back over the board when set, over on the plate when it has gone off.
    const hinge = new GFX.Group();
    hinge.position.set(0, 0.05, 0.02);
    const bar = new GFX.Mesh(new GFX.BoxGeometry(0.3, 0.015, 0.015), mats.steel);
    bar.position.z = -0.22;
    const arms = [-1, 1].map((s) => {
      const a = new GFX.Mesh(new GFX.BoxGeometry(0.015, 0.015, 0.22), mats.steel);
      a.position.set(s * 0.15, 0, -0.11);
      return a;
    });
    hinge.add(bar, ...arms);
    g.add(base, spring, plate, cheese, hinge);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    group.add(g);
    return { ...t, y, mesh: g, hinge, sprung: false, sprungAt: 0 };
  });

  // Nails: a head and a bit of shank, standing proud of the boards.
  const nails = house.nails.map((n, i) => {
    const y = house.heightAt(n.x, n.z) ?? 0;
    const g = new GFX.Group();
    g.position.set(n.x + ((i * 0.37) % 0.3) - 0.15, y, n.z + ((i * 0.61) % 0.3) - 0.15);
    const shank = new GFX.Mesh(new GFX.CylinderGeometry(0.018, 0.02, 0.16, 6), mats.nail);
    shank.position.y = 0.08;
    shank.rotation.z = 0.25;
    const head = new GFX.Mesh(new GFX.CylinderGeometry(0.045, 0.045, 0.012, 10), mats.nail);
    head.position.set(-0.02, 0.16, 0);
    head.rotation.z = 0.25;
    g.add(shank, head);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    group.add(g);
    return { ...n, y, mesh: g, x: g.position.x, z: g.position.z, last: -Infinity };
  });

  // The robot vacuum: a disc with a bumper and a light, humming its rounds.
  const vacuums = house.vacuums.map((v, i) => {
    const g = new GFX.Group();
    const body = new GFX.Mesh(new GFX.CylinderGeometry(0.55, 0.57, 0.24, 28), mats.vacuum);
    body.position.y = 0.16;
    const rim = new GFX.Mesh(new GFX.CylinderGeometry(0.58, 0.58, 0.1, 28, 1, true, -1.2, 2.4), mats.rim);
    rim.position.y = 0.12;
    rim.material.side = GFX.DoubleSide;
    const led = new GFX.Mesh(new GFX.SphereGeometry(0.035, 8, 6), mats.led);
    led.position.set(0, 0.29, 0.3);
    const brush = new GFX.Mesh(new GFX.CylinderGeometry(0.16, 0.16, 0.02, 3), mats.rim);
    brush.position.set(0.38, 0.03, 0.32);
    g.add(body, rim, led, brush);
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
      const can = new GFX.Mesh(new GFX.CylinderGeometry(0.3, 0.3, 0.24, 28), mats.tin);
      can.position.y = 0.12;
      const lid = new GFX.Mesh(new GFX.CylinderGeometry(0.315, 0.315, 0.06, 28), mats.tinLid);
      lid.position.set(0.22, 0.04, 0.24);
      lid.rotation.z = 0.25;
      spin.add(can, lid);
      for (let k = 0; k < 7; k++) {
        const r = 0.07;
        const b = new GFX.Mesh(new GFX.CylinderGeometry(r, r, 0.03, 14), buttonMats[(k + i) % buttonMats.length]);
        b.position.set(Math.cos(k * 2.3) * 0.15, 0.25 + (k % 2) * 0.02, Math.sin(k * 2.3) * 0.15);
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
 * A skein of the same red wool as the ball: a hank of strand wound round
 * and round in a long loop and given a twist, the way a skein is sold.
 * Made with the ball's own tube (`yarn/model.js`), in metres.
 */
export function skeinMesh(GFX, material, seed = 0) {
  const turns = 9, per = 90, n = turns * per;
  const C = new Float32Array(n * 3), T = new Float32Array(n * 3), NR = new Float32Array(n * 3), A = new Float32Array(n);
  const L = 0.07, W = 0.022;
  for (let i = 0; i < n; i++) {
    const a = (i / per) * Math.PI * 2;
    const k = i / n;
    // A long loop, twisted on itself once along its length, each turn a little to one side.
    const along = Math.cos(a) * L;
    const twist = (along / L) * Math.PI * 0.5;
    const across = Math.sin(a) * W + (k - 0.5) * 0.012;
    C[3 * i] = along;
    C[3 * i + 1] = Math.cos(twist) * across * 0.5 + 0.02;
    C[3 * i + 2] = Math.sin(twist) * across + Math.sin(i * 0.37 + seed) * 0.002;
    A[i] = i * 0.002;
  }
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
    let tx = C[3 * b] - C[3 * a], ty = C[3 * b + 1] - C[3 * a + 1], tz = C[3 * b + 2] - C[3 * a + 2];
    const l = Math.hypot(tx, ty, tz) || 1;
    tx /= l; ty /= l; tz /= l;
    T[3 * i] = tx; T[3 * i + 1] = ty; T[3 * i + 2] = tz;
    let ux = 0 - ty * 0, uy = 1, uz = 0;
    const d = ux * tx + uy * ty + uz * tz;
    ux -= d * tx; uy -= d * ty; uz -= d * tz;
    const ul = Math.hypot(ux, uy, uz) || 1;
    NR[3 * i] = ux / ul; NR[3 * i + 1] = uy / ul; NR[3 * i + 2] = uz / ul;
  }
  const geo = buildTube(GFX, n, C, T, NR, A, null, null, (i, x, y, z, nx, ny) => 0.55 + 0.45 * Math.max(0, ny));
  const mesh = new GFX.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.name = 'skein';
  const g = new GFX.Group();
  g.scale.setScalar(1 / TILE_METRES * 1.6);
  g.add(mesh);
  void YR;
  return g;
}
