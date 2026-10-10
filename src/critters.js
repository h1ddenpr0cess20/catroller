import mouseDef from './models/cast/mouse.js';
import { isBaked, ready } from './models/library.js';
import { createModel } from './models/model.js';

/**
 * Mice and bugs: harmless to the ball, and the best friends it has, because
 * a cat that has seen one is watching it and nothing else. A mouse nibbles
 * at a crumb or runs its rounds, and bolts for its hole when the ball comes
 * near; a fly buzzes round and round in the air and is off out of it; a
 * beetle trundles about and scuttles away. Whatever was watching it then
 * looks where it bolted from (`cats.js`).
 */

export const CRITTERS = Object.freeze({
  mouse: { name: 'Mouse', speed: 2.2, flee: 6.5, scare: 1.6, fly: false },
  fly: { name: 'Fly', speed: 1.4, flee: 5, scare: 1.2, fly: true },
  beetle: { name: 'Beetle', speed: 0.55, flee: 3, scare: 1.3, fly: false },
});

/** How high a fly buzzes. */
const FLIGHT = 1.5;

/** The mice in the house are meshed at a quarter of a close-up's grid. */
const DETAIL = 0.5;

/** Where along a closed loop of points something is, `distance` round it. */
export function alongLoop(points, distance) {
  const legs = points.map((p, i) => {
    const q = points[(i + 1) % points.length];
    return { p, q, length: Math.hypot(q[0] - p[0], q[1] - p[1]) };
  });
  const total = legs.reduce((sum, l) => sum + l.length, 0) || 1;
  let d = ((distance % total) + total) % total;
  for (const leg of legs) {
    if (d <= leg.length) {
      const t = leg.length ? d / leg.length : 0;
      return [leg.p[0] + (leg.q[0] - leg.p[0]) * t, leg.p[1] + (leg.q[1] - leg.p[1]) * t];
    }
    d -= leg.length;
  }
  return points[0];
}

export function createCritters(GFX, house) {
  const group = new GFX.Group();
  group.name = 'critters';
  const mats = {
    shell: new GFX.MeshPhysicalMaterial({ name: 'beetle', color: new GFX.Color('#1c2a1c'), roughness: 0.25, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1, iridescence: 0.6 }),
    legs: new GFX.MeshStandardMaterial({ name: 'bug-legs', color: new GFX.Color('#141010'), roughness: 0.6 }),
    fly: new GFX.MeshPhysicalMaterial({ name: 'fly', color: new GFX.Color('#20242a'), roughness: 0.4, clearcoat: 0.6 }),
    eyes: new GFX.MeshPhysicalMaterial({ name: 'fly-eyes', color: new GFX.Color('#7a1a12'), roughness: 0.3, clearcoat: 1 }),
    wing: new GFX.MeshPhysicalMaterial({ name: 'wing', color: new GFX.Color('#d8e4f0'), roughness: 0.2, transparent: true, opacity: 0.45, side: GFX.DoubleSide, iridescence: 1 }),
    crumb: new GFX.MeshStandardMaterial({ name: 'crumb', color: new GFX.Color('#e6c070'), roughness: 0.9 }),
    hole: new GFX.MeshBasicMaterial({ name: 'mouse-hole', color: new GFX.Color('#0a0605') }),
  };

  const build = {
    mouse() {
      const g = new GFX.Group();
      const body = new GFX.Group();
      g.add(body);
      let model = null;
      const attach = () => { model = createModel(GFX, mouseDef, { detail: DETAIL }); body.add(model.group); };
      if (isBaked('mouse', DETAIL)) attach();
      else if (typeof window !== 'undefined') ready('mouse', DETAIL).then(attach);
      return { group: g, body, animate: (t, moving, speed) => model?.pose({ clip: moving ? 'walk' : 'idle', t, time: t, speed }) };
    },
    beetle() {
      const g = new GFX.Group();
      const body = new GFX.Group();
      g.add(body);
      const shell = new GFX.Mesh(new GFX.SphereGeometry(0.1, 16, 10), mats.shell);
      shell.scale.set(0.8, 0.55, 1.15);
      shell.position.y = 0.06;
      const head = new GFX.Mesh(new GFX.SphereGeometry(0.045, 10, 8), mats.legs);
      head.position.set(0, 0.045, 0.12);
      body.add(shell, head);
      const legs = [];
      for (const side of [-1, 1]) {
        for (const k of [-1, 0, 1]) {
          const leg = new GFX.Mesh(new GFX.CylinderGeometry(0.008, 0.006, 0.12, 5), mats.legs);
          leg.rotation.z = side * 1.1;
          leg.position.set(side * 0.08, 0.035, k * 0.05);
          body.add(leg);
          legs.push({ leg, side, k });
        }
      }
      for (const side of [-1, 1]) {
        const feeler = new GFX.Mesh(new GFX.CylinderGeometry(0.004, 0.003, 0.1, 4), mats.legs);
        feeler.rotation.set(1.1, side * 0.4, 0);
        feeler.position.set(side * 0.02, 0.07, 0.17);
        body.add(feeler);
      }
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      return {
        group: g, body,
        animate(t, moving, speed) {
          for (const { leg, side, k } of legs) leg.rotation.x = moving ? Math.sin(t * 22 * speed + k * 2 + side) * 0.5 : 0;
        },
      };
    },
    fly() {
      const g = new GFX.Group();
      const body = new GFX.Group();
      g.add(body);
      const thorax = new GFX.Mesh(new GFX.SphereGeometry(0.045, 10, 8), mats.fly);
      const belly = new GFX.Mesh(new GFX.SphereGeometry(0.05, 10, 8), mats.fly);
      belly.scale.set(0.8, 0.75, 1.2);
      belly.position.z = -0.06;
      const eyes = [-1, 1].map((s) => {
        const e = new GFX.Mesh(new GFX.SphereGeometry(0.026, 8, 6), mats.eyes);
        e.position.set(s * 0.025, 0.012, 0.045);
        return e;
      });
      const wings = [-1, 1].map((s) => {
        const w = new GFX.Mesh(new GFX.PlaneGeometry(0.11, 0.05), mats.wing);
        w.position.set(s * 0.055, 0.035, -0.02);
        w.rotation.x = -Math.PI / 2;
        return w;
      });
      body.add(thorax, belly, ...eyes, ...wings);
      body.scale.setScalar(1.2);
      thorax.castShadow = belly.castShadow = true;
      return {
        group: g, body,
        animate(t) {
          const flap = Math.sin(t * 90) * 0.7;
          wings[0].rotation.z = -flap; wings[1].rotation.z = flap;
        },
      };
    },
  };

  // A crumb for each mouse that nibbles in one place.
  const crumbs = new GFX.Group();
  group.add(crumbs);

  const critters = house.critters.map((c, i) => {
    const kind = CRITTERS[c.kind];
    if (!kind) throw new Error(`${house.name}: no such critter as ${c.kind}`);
    const look = build[c.kind]();
    group.add(look.group);
    const ground = house.heightAt(c.x, c.z) ?? 0;
    if (c.kind === 'mouse' && !c.path) {
      const crumb = new GFX.Mesh(new GFX.IcosahedronGeometry(0.06, 0), mats.crumb);
      crumb.position.set(c.x, ground + 0.03, c.z + 0.18);
      crumb.castShadow = true;
      crumbs.add(crumb);
    }
    return {
      ...c, i, stats: kind, look,
      x: c.x, z: c.z, y: ground + (kind.fly ? FLIGHT : 0), ground,
      heading: 0, travelled: i * 1.7, moving: false,
      fleeing: false, gone: false, scaredBy: 0, fleeTime: 0, away: null,
      watchers: new Set(),
    };
  });

  // The mouse holes in the skirting boards: dark arches.
  for (const h of house.holes) {
    const ground = house.heightAt(h.x + 0.5, h.z + 0.5) ?? 0;
    const arch = new GFX.Mesh(new GFX.CircleGeometry(0.16, 16, 0, Math.PI), mats.hole);
    const [dx, dz] = { '+z': [0, -0.49], '-z': [0, 0.49], '+x': [-0.49, 0], '-x': [0.49, 0] }[h.facing] ?? [0, 0];
    arch.position.set(h.x + 0.5 + dx, ground + 0.001, h.z + 0.5 + dz);
    arch.rotation.y = { '+z': 0, '-z': Math.PI, '+x': Math.PI / 2, '-x': -Math.PI / 2 }[h.facing] ?? 0;
    group.add(arch);
  }

  /** The nearest mouse hole to (x, z), as a point just inside it. */
  const holeNear = (x, z) => {
    let best = null, bestD = Infinity;
    for (const h of house.holes) {
      const d = Math.hypot(h.x + 0.5 - x, h.z + 0.5 - z);
      if (d < bestD) { bestD = d; best = [h.x + 0.5, h.z + 0.5]; }
    }
    return bestD < 14 ? best : null;
  };

  return {
    group, critters,

    /**
     * One step. `ball` is { x, y, z, speed } or null. Returns the critters
     * that took fright this step.
     */
    step(dt, time, ball) {
      const scared = [];
      for (const c of critters) {
        if (c.gone) continue;
        const k = c.stats;
        if (c.fleeing) {
          c.fleeTime += dt;
          const [tx, tz] = c.away;
          const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz);
          if (d > 0.05) {
            const step = Math.min(d, k.flee * dt);
            c.x += (dx / d) * step; c.z += (dz / d) * step;
            c.heading = Math.atan2(dx, dz);
          }
          if (k.fly) c.y += dt * 2.5;
          else c.y = house.heightAt(c.x, c.z) ?? c.y;
          c.moving = true;
          if (d < 0.1 || c.fleeTime > 2.5) c.gone = true;
          continue;
        }
        // Going about its business.
        if (c.path) {
          c.travelled += k.speed * dt;
          const [x, z] = alongLoop(c.path, c.travelled);
          const [nx, nz] = alongLoop(c.path, c.travelled + 0.05);
          if (Math.hypot(nx - x, nz - z) > 1e-6) c.heading = Math.atan2(nx - x, nz - z);
          c.x = x; c.z = z;
          c.moving = true;
        } else if (k.fly) {
          // Buzzing round its spot.
          const a = time * 2.1 + c.i;
          c.x = c.x0 ?? (c.x0 = c.x);
          c.x = c.x0 + Math.cos(a) * 0.7 + Math.sin(a * 2.7) * 0.15;
          c.z = (c.z0 ?? (c.z0 = c.z)) + Math.sin(a) * 0.7;
          c.heading = a + Math.PI / 2;
          c.moving = true;
        } else {
          c.moving = false;
          c.heading = 0;
        }
        const ground = house.heightAt(c.x, c.z) ?? c.ground;
        c.y = k.fly ? ground + FLIGHT + Math.sin(time * 5 + c.i) * 0.12 : ground;
        if (!ball) continue;
        // Too near: off.
        const d = Math.hypot(ball.x - c.x, ball.z - c.z);
        const reach = k.scare * (ball.speed > 4 ? 1.45 : 1) * (k.fly ? 1 : 1);
        if (d < reach && Math.abs(ball.y - c.y) < (k.fly ? 2.2 : 1.2)) {
          c.fleeing = true;
          c.scaredBy = d;
          const hole = c.kind === 'mouse' ? holeNear(c.x, c.z) : null;
          if (hole) c.away = hole;
          else {
            const ax = c.x - ball.x, az = c.z - ball.z, l = Math.hypot(ax, az) || 1;
            c.away = [c.x + (ax / l) * 6, c.z + (az / l) * 6];
          }
          scared.push(c);
        }
      }
      return scared;
    },

    sync(dt, time) {
      for (const c of critters) {
        const g = c.look.group;
        g.visible = !c.gone;
        if (c.gone) continue;
        g.position.set(c.x, c.y, c.z);
        let turn = Math.atan2(Math.sin(c.heading - g.rotation.y), Math.cos(c.heading - g.rotation.y));
        g.rotation.y += turn * Math.min(1, dt * 12);
        c.look.animate(time + c.i, c.moving, c.fleeing ? 1 : 0.6);
      }
    },
  };
}
