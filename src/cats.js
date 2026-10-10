import { BOARD_DETAIL, CAT_DEFS, CAT_KINDS } from './models/cast/cat.js';
import { isBaked, ready } from './models/library.js';
import { createModel } from './models/model.js';

/**
 * The cats, and what goes on in their heads.
 *
 * Left to itself a cat sits, sleeps or patrols. Anything small that moves —
 * a mouse, a fly, a beetle — and it is watching that and nothing else, so
 * the ball can roll right past it. But scare the thing off and the cat looks
 * where it bolted from, and there is the ball.
 *
 * A cat that isn't busy sees the ball if it is in front of it, near enough
 * and in plain view (not behind a wall, not under the sofa). It doesn't
 * know at once: it grows suspicious (a ?), and the closer and faster the
 * ball the quicker, until it is sure (a !) and comes after it, finding its
 * way round the furniture. Lose it and it goes to where it last saw it,
 * looks about, and gives up. A sleeping cat only wakes to noise — the ball
 * rolling fast over bare boards near it — or a bump.
 *
 * Catch the ball and it pins the loose end under its paw and bats at it:
 * the ball unwinds as it gets away (`yarn/ball.js`). The strand it is left
 * with, or any bit of strand lying about, is a toy, and a toy is as good as
 * a mouse to a cat.
 */

/** How the cats move: walking about, and after the ball. Tiles a second. */
const WALK = 2.0;

/** How long a cat stops when it is sure before it runs. */
const ALERT = 0.55;

/** After a catch, how long before this cat can notice the ball again. */
const GRACE = 3.5;

/** How long a chasing cat goes on without sight of the ball before it goes to look where it last saw it. */
const LOSE = 2.2;

/** How long it looks about there. */
const SEARCH = 3.2;

/** A critter this near catches a cat's eye even while it is busy chasing. */
const DISTRACT = { idle: 4.5, chase: 2.2 };

/** Every so often the way to the ball is worked out again, seconds. */
const REPLAN = 0.25;

const smooth = (t) => t * t * (3 - 2 * t);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function createCats(GFX, house, nav) {
  const group = new GFX.Group();
  group.name = 'cats';
  const marks = createMarks(GFX);

  const cats = house.cats.map((c, i) => {
    const stats = CAT_KINDS[c.kind];
    if (!stats) throw new Error(`${house.name}: no such cat as ${c.kind}`);
    const look = createCatMesh(GFX, c.kind);
    look.group.rotation.y = c.facing ?? 0;
    group.add(look.group);
    const mark = marks.sprite();
    look.group.add(mark.sprite);
    mark.sprite.position.y = 1.7 * stats.size;
    const y = nav.ground(c.x, c.z);
    return {
      ...c, i, stats, look, mark,
      x: c.x, y, z: c.z, heading: c.facing ?? 0, vx: 0, vz: 0,
      home: [c.x, c.z], leg: 0,
      mode: c.does === 'patrol' ? 'patrol' : c.does === 'sleep' ? 'sleep' : 'sit',
      timer: 0, suspicion: 0, guard: 0, lost: 0,
      target: null, lastSeen: null, plan: null, planAt: -Infinity, planFor: null,
      moving: false, pace: 0, looked: 0, toy: null, clip: 'idle', since: 0,
    };
  });

  /** Where `cat` is going next, by the grid, toward (tx, tz). */
  function steer(cat, tx, tz, time, speed, dt, { stopAt = 0.3 } = {}) {
    const direct = Math.hypot(tx - cat.x, tz - cat.z);
    let gx = tx, gz = tz;
    // Straight there if it can see its way; else down the field of distances.
    if (direct > 1.2 && !clearPath(cat.x, cat.z, tx, tz)) {
      if (!cat.plan || time - cat.planAt > REPLAN || !cat.planFor || Math.hypot(cat.planFor[0] - tx, cat.planFor[1] - tz) > 1.5) {
        cat.plan = nav.field(tx, tz, 30);
        cat.planAt = time;
        cat.planFor = [tx, tz];
      }
      const step = nav.next(cat.plan, cat.x, cat.z);
      if (step) [gx, gz] = step;
    }
    const dx = gx - cat.x, dz = gz - cat.z, d = Math.hypot(dx, dz);
    let want = d > stopAt ? speed : 0;
    if (direct < stopAt) want = 0;
    const ux = d > 1e-6 ? dx / d : 0, uz = d > 1e-6 ? dz / d : 0;
    const k = Math.min(1, dt * 7);
    cat.vx += (ux * want - cat.vx) * k;
    cat.vz += (uz * want - cat.vz) * k;
    move(cat, dt);
    return direct;
  }

  /** Is the straight line from (ax, az) to (bx, bz) all floor a cat can walk? */
  function clearPath(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az);
    const n = Math.ceil(d / 0.3);
    let last = nav.ground(ax, az);
    for (let k = 1; k <= n; k++) {
      const x = ax + ((bx - ax) * k) / n, z = az + ((bz - az) * k) / n;
      if (!nav.standable(x, z)) return k === n;
      const h = nav.ground(x, z);
      if (Math.abs(h - last) > 1.05) return false;
      last = h;
    }
    return true;
  }

  /** Moves a cat by its velocity, sliding along what it can't walk into. */
  function move(cat, dt) {
    const nx = cat.x + cat.vx * dt, nz = cat.z + cat.vz * dt;
    const ok = (x, z) => nav.standable(x, z) && Math.abs(nav.ground(x, z) - nav.ground(cat.x, cat.z)) <= 1.05;
    if (ok(nx, nz)) { cat.x = nx; cat.z = nz; }
    else if (ok(nx, cat.z)) { cat.x = nx; cat.vz *= 0.5; }
    else if (ok(cat.x, nz)) { cat.z = nz; cat.vx *= 0.5; }
    else { cat.vx *= 0.3; cat.vz *= 0.3; }
    const speed = Math.hypot(cat.vx, cat.vz);
    cat.pace = speed;
    cat.moving = speed > 0.25;
    if (speed > 0.2) cat.heading = Math.atan2(cat.vx, cat.vz);
    const ground = nav.ground(cat.x, cat.z);
    // Up and down steps in a hop.
    cat.y += (ground - cat.y) * Math.min(1, dt * 14);
  }

  /** Stands still, turning to face `heading`. */
  function hold(cat, dt, heading = cat.heading) {
    cat.vx *= Math.max(0, 1 - dt * 10);
    cat.vz *= Math.max(0, 1 - dt * 10);
    move(cat, dt);
    cat.heading += wrap(heading - cat.heading) * Math.min(1, dt * 6);
  }

  /** Can `cat` see the ball? */
  function sees(cat, ball, { wide = false } = {}) {
    if (!ball || ball.hidden) return false;
    const dx = ball.x - cat.x, dz = ball.z - cat.z;
    const d = Math.hypot(dx, dz);
    // A small ball is harder to spot.
    const reach = cat.stats.sight * (0.65 + 0.35 * Math.min(1, ball.r / 0.36));
    if (d > reach) return false;
    if (d > 1.4 && !wide) {
      const off = Math.abs(wrap(Math.atan2(dx, dz) - cat.heading));
      if (off > cat.stats.fov / 2) return false;
    }
    const eye = cat.y + 0.85 * cat.stats.size;
    return nav.sight(cat.x, eye, cat.z, ball.x, ball.y, ball.z);
  }

  /** The nearest critter or toy in sight of `cat` within `reach`, not already run off. */
  function distraction(cat, critters, toys, reach) {
    let best = null, bestD = reach;
    for (const t of [...critters, ...toys]) {
      if (t.gone || t.fleeing || t.spent) continue;
      const d = Math.hypot(t.x - cat.x, t.z - cat.z);
      if (d >= bestD) continue;
      const eye = cat.y + 0.85 * cat.stats.size;
      if (!nav.sight(cat.x, eye, cat.z, t.x, (t.y ?? cat.y) + 0.2, t.z)) continue;
      best = t; bestD = d;
    }
    return best;
  }

  function enter(cat, mode, time) {
    cat.mode = mode;
    cat.timer = 0;
    cat.since = time;
  }

  /** Off after the ball, sure of it. */
  function alert(cat, ball, time) {
    if (cat.target) cat.target.watchers?.delete(cat);
    cat.target = null;
    cat.suspicion = 1;
    cat.lastSeen = [ball.x, ball.z];
    cat.heading = Math.atan2(ball.x - cat.x, ball.z - cat.z);
    enter(cat, 'alert', time);
  }

  /** Watching `thing` (a critter or a toy) with all its attention. */
  function watch(cat, thing, time) {
    if (cat.target) cat.target.watchers?.delete(cat);
    cat.target = thing;
    thing.watchers?.add(cat);
    cat.suspicion = 0;
    enter(cat, 'watch', time);
  }

  /** Back to whatever it does with itself. */
  function settle(cat, time) {
    if (cat.target) cat.target.watchers?.delete(cat);
    cat.target = null;
    enter(cat, 'return', time);
  }

  return {
    group, cats,

    /**
     * One step for every cat. `ball` is { x, y, z, r, speed, hidden, loud,
     * caught } or null while there's nothing to look at; `critters` and
     * `toys` are what can distract them. Returns { caught: the cat that has
     * the ball, if one just got it; noticed: cats that have just seen it }.
     */
    step(dt, time, { ball, critters = [], toys = [] }) {
      const out = { caught: null, noticed: [] };
      for (const cat of cats) {
        cat.timer += dt;
        if (cat.guard > 0) cat.guard -= dt;
        const s = cat.stats;
        const near = ball ? Math.hypot(ball.x - cat.x, ball.z - cat.z) : Infinity;
        const touching = ball && near < s.reach + ball.r && Math.abs(ball.y - cat.y - 0.4) < 1.1;
        const ready = cat.guard <= 0 && ball && !ball.caught;

        switch (cat.mode) {
          case 'sleep': {
            hold(cat, dt);
            // Woken by a bump, or by the ball rattling over bare boards close by.
            if (ready && (touching || (ball.loud > 0 && near < 1.2 + ball.loud * s.ears))) {
              cat.suspicion = touching ? 1 : 0.45;
              cat.heading = Math.atan2(ball.x - cat.x, ball.z - cat.z);
              enter(cat, 'sit', time);
            }
            break;
          }
          case 'sit':
          case 'patrol':
          case 'return': {
            if (cat.mode === 'sit') hold(cat, dt, cat.suspicion > 0.05 && ball ? Math.atan2(ball.x - cat.x, ball.z - cat.z) : cat.heading);
            else if (cat.mode === 'patrol') {
              const [px, pz] = cat.path[cat.leg % cat.path.length];
              if (steer(cat, px, pz, time, WALK, dt) < 0.4) cat.leg++;
            } else {
              const [hx, hz] = cat.path ? cat.path[cat.leg % cat.path.length] : cat.home;
              if (steer(cat, hx, hz, time, WALK, dt) < 0.4) {
                enter(cat, cat.does === 'patrol' ? 'patrol' : cat.does === 'sleep' && cat.timer > 0 ? 'sleep' : 'sit', time);
                if (cat.does !== 'patrol') cat.heading = cat.facing ?? cat.heading;
              }
            }
            const thing = distraction(cat, critters, toys, DISTRACT.idle);
            if (thing && cat.suspicion < 0.6) { watch(cat, thing, time); break; }
            if (ready && (touching || sees(cat, ball))) {
              // Closer and faster: sure sooner.
              const rate = touching ? 10 : (s.wary * (1.6 - Math.min(1.2, near / s.sight))) * (ball.speed > 3 ? 1.5 : 1);
              cat.suspicion += rate * dt;
            } else {
              cat.suspicion = Math.max(0, cat.suspicion - dt * 0.3);
            }
            if (cat.suspicion >= 1) { alert(cat, ball, time); out.noticed.push(cat); }
            break;
          }
          case 'watch': {
            const t = cat.target;
            if (!t || t.gone || t.spent) { settle(cat, time); break; }
            if (t.fleeing) {
              // It bolted — and the cat looks where it bolted from.
              if (ball && !ball.caught && Math.hypot(ball.x - t.x, ball.z - t.z) < t.scaredBy + 1.5) {
                alert(cat, ball, time);
                out.noticed.push(cat);
              } else settle(cat, time);
              break;
            }
            const d = Math.hypot(t.x - cat.x, t.z - cat.z);
            // Creeps up to a pounce's length of it, low, and stays there, tail going.
            if (d > (t.toy ? 0.6 : 1.6)) steer(cat, t.x, t.z, time, t.toy ? WALK * 1.3 : WALK * 0.45, dt, { stopAt: t.toy ? 0.6 : 1.6 });
            else hold(cat, dt, Math.atan2(t.x - cat.x, t.z - cat.z));
            if (t.toy) {
              if (d < 0.9) { cat.toy = t; cat.timer = Math.min(cat.timer, 0.01); enter(cat, 'play', time); }
              break;
            }
            // Only a bump gets through to it.
            if (ready && touching) { alert(cat, ball, time); out.noticed.push(cat); }
            break;
          }
          case 'alert': {
            hold(cat, dt, ball ? Math.atan2(ball.x - cat.x, ball.z - cat.z) : cat.heading);
            if (cat.timer > ALERT) enter(cat, 'chase', time);
            break;
          }
          case 'chase': {
            if (!ball || ball.caught) { settle(cat, time); break; }
            const seen = sees(cat, ball, { wide: true });
            if (seen) { cat.lastSeen = [ball.x, ball.z]; cat.lost = 0; } else cat.lost += dt;
            const fromHome = Math.hypot(ball.x - cat.home[0], ball.z - cat.home[1]);
            if (fromHome > cat.range + 4) { settle(cat, time); break; }
            if (cat.lost > LOSE) { enter(cat, 'search', time); break; }
            const thing = distraction(cat, critters, toys, DISTRACT.chase);
            if (thing) { watch(cat, thing, time); break; }
            const [tx, tz] = seen ? [ball.x, ball.z] : cat.lastSeen;
            // Close enough, it pounces.
            const pounce = seen && near < 2.4 ? 1.55 : 1;
            steer(cat, tx, tz, time, s.speed * pounce, dt, { stopAt: 0.05 });
            if (touching && ready) {
              out.caught = cat;
              cat.toy = null;
              enter(cat, 'swat', time);
            }
            break;
          }
          case 'swat': {
            hold(cat, dt, ball ? Math.atan2(ball.x - cat.x, ball.z - cat.z) : cat.heading);
            if (cat.timer > 0.45) enter(cat, 'play', time);
            break;
          }
          case 'play': {
            // Batting the strand about, paying no mind to anything else.
            hold(cat, dt, cat.toy ? Math.atan2(cat.toy.x - cat.x, cat.toy.z - cat.z) : cat.heading);
            cat.suspicion = 0;
            if (cat.timer > (cat.toy ? s.play * 1.4 : s.play)) {
              if (cat.toy) cat.toy.spent = true;
              cat.toy = null;
              cat.guard = GRACE;
              settle(cat, time);
            }
            break;
          }
          case 'search': {
            const [lx, lz] = cat.lastSeen ?? cat.home;
            if (steer(cat, lx, lz, time, WALK * 1.4, dt) < 0.6 || cat.timer > 4) {
              cat.looked += dt;
              cat.heading += Math.sin(time * 2.4) * dt * 2.5;
            }
            if (ready && sees(cat, ball)) { alert(cat, ball, time); out.noticed.push(cat); break; }
            if (cat.looked > SEARCH) { cat.looked = 0; cat.suspicion = 0.3; settle(cat, time); }
            break;
          }
        }
      }
      // Cats keep out of each other's way.
      for (let i = 0; i < cats.length; i++) {
        for (let j = i + 1; j < cats.length; j++) {
          const a = cats[i], b = cats[j];
          const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
          const want = (a.stats.size + b.stats.size) * 0.55;
          if (d >= want || d < 1e-6) continue;
          const push = (want - d) / 2;
          const ax = a.x - (dx / d) * push, az = a.z - (dz / d) * push;
          const bx = b.x + (dx / d) * push, bz = b.z + (dz / d) * push;
          if (nav.standable(ax, az)) { a.x = ax; a.z = az; }
          if (nav.standable(bx, bz)) { b.x = bx; b.z = bz; }
        }
      }
      return out;
    },

    /** Where the cat that has the ball pins the strand: under its front paw. */
    paw(cat) {
      const r = 0.55 * cat.stats.size;
      return [cat.x + Math.sin(cat.heading) * r, cat.z + Math.cos(cat.heading) * r];
    },

    /** Lets every cat go back to how it started (the ball was put back somewhere). */
    calm(time) {
      for (const cat of cats) {
        if (cat.mode === 'chase' || cat.mode === 'alert' || cat.mode === 'search') {
          cat.suspicion = 0;
          cat.guard = 1.5;
          settle(cat, time);
        }
      }
    },

    /** Meshes to match, once a frame; only the cats near `focus` are posed. */
    sync(dt, time, { focus = null, reach = 16 } = {}) {
      for (const cat of cats) {
        const g = cat.look.group;
        g.position.set(cat.x, cat.y, cat.z);
        let turn = wrap(cat.heading - g.rotation.y);
        g.rotation.y += turn * Math.min(1, dt * 9);
        const show = cat.mode === 'alert' || cat.mode === 'chase' ? 'sure'
          : cat.mode === 'sleep' ? 'asleep'
            : cat.mode === 'watch' || cat.mode === 'play' ? 'busy'
              : cat.mode === 'search' || cat.suspicion > 0.08 ? 'unsure' : null;
        marks.set(cat.mark, show, cat.suspicion, time);
        if (focus && Math.hypot(cat.x - focus.x, cat.z - focus.z) > reach) continue;
        const clip = {
          sleep: 'sleep', sit: 'sit', patrol: 'walk', return: 'walk', watch: cat.moving ? 'stalk' : 'crouch',
          alert: 'alert', chase: 'run', swat: 'swat', play: 'play', search: cat.moving ? 'walk' : 'look',
        }[cat.mode] ?? 'sit';
        if (clip !== cat.clip) { cat.clip = clip; cat.since = time; }
        cat.look.animate({ clip, t: time - cat.since, time: time + cat.i * 1.37, pace: cat.pace, speed: cat.mode === 'chase' ? 1 : 0.6 });
      }
    },
  };
}

/**
 * What a cat has on its mind, over its head: a ? growing as it gets
 * suspicious, a ! once it is sure, zzz asleep, and a little heart while it
 * watches something.
 */
function createMarks(GFX) {
  const make = (text, colour, size = 64) => {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    ctx.font = `900 ${size * 0.72}px "Trebuchet MS", "Avenir Next", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = size * 0.1;
    ctx.strokeStyle = 'rgba(20, 12, 10, 0.9)';
    ctx.strokeText(text, size / 2, size * 0.54);
    ctx.fillStyle = colour;
    ctx.fillText(text, size / 2, size * 0.54);
    const t = new GFX.CanvasTexture(c);
    t.colorSpace = GFX.SRGBColorSpace;
    return new GFX.SpriteMaterial({ map: t, depthTest: false, depthWrite: false, transparent: true });
  };
  const kinds = {
    unsure: make('?', '#ffd75a'),
    sure: make('!', '#ff4a3a'),
    asleep: make('z', '#bfd6ff'),
    busy: make('♥', '#ff8fb0'),
  };
  return {
    sprite() {
      const sprite = new GFX.Sprite(kinds.unsure ?? new GFX.SpriteMaterial());
      sprite.renderOrder = 10;
      sprite.visible = false;
      return { sprite, shown: null };
    },
    set(mark, what, suspicion, time) {
      const s = mark.sprite;
      if (!what || !kinds[what]) { s.visible = false; return; }
      s.visible = true;
      if (mark.shown !== what) { s.material = kinds[what]; mark.shown = what; }
      const k = what === 'unsure' ? 0.3 + 0.5 * smooth(Math.min(1, suspicion)) : what === 'sure' ? 0.85 : 0.45;
      const bob = what === 'asleep' ? Math.sin(time * 1.5) * 0.08 : what === 'sure' ? Math.abs(Math.sin(time * 9)) * 0.06 : 0;
      s.scale.set(k, k, 1);
      s.position.x = what === 'asleep' ? 0.2 : 0;
      s.position.y = s.userData.base ?? (s.userData.base = s.position.y);
      s.position.y = s.userData.base + bob;
    },
  };
}

/**
 * A cat to put in the house: `group` (on the floor, facing +z), and
 * `animate(state)`. It shows once its coat is baked (models/library.js).
 */
export function createCatMesh(GFX, kind) {
  const name = `cat-${CAT_KINDS[kind].coat}`;
  const group = new GFX.Group();
  group.name = name;
  let model = null, lines = null, head = 0;
  const attach = () => {
    model = createModel(GFX, CAT_DEFS[name], { detail: BOARD_DETAIL });
    group.add(model.group);
    lines = whiskers(GFX);
    lines.matrixAutoUpdate = false;
    model.mesh.add(lines);
    head = model.skeleton.index.get('head') * 12;
  };
  if (isBaked(name, BOARD_DETAIL)) attach();
  else if (typeof window !== 'undefined') ready(name, BOARD_DETAIL).then(attach);
  return {
    group,
    get model() { return model; },
    animate(state) {
      if (!model) return;
      model.pose(state);
      // The whiskers go where the head goes: its bone's matrix (3 × 4, by rows) as theirs (4 × 4, by columns).
      const M = model.skeleton.matrices, e = lines.matrix.elements, o = head;
      e[0] = M[o]; e[1] = M[o + 4]; e[2] = M[o + 8]; e[3] = 0;
      e[4] = M[o + 1]; e[5] = M[o + 5]; e[6] = M[o + 9]; e[7] = 0;
      e[8] = M[o + 2]; e[9] = M[o + 6]; e[10] = M[o + 10]; e[11] = 0;
      e[12] = M[o + 3]; e[13] = M[o + 7]; e[14] = M[o + 11]; e[15] = 1;
      lines.matrixWorldNeedsUpdate = true;
    },
  };
}

const whiskerShapes = new WeakMap();

/**
 * A cat's whiskers, as fine lines in the sculpt's frame: four from each
 * whisker pad, fanned and drooping, and two over each eye. One shape for
 * every cat.
 */
function whiskers(GFX) {
  if (!whiskerShapes.has(GFX)) {
    const pts = [];
    const strand = (root, dir, len, droop) => {
      const l = Math.hypot(...dir), d = dir.map((v) => v / l);
      let prev = root;
      for (let j = 1; j <= 5; j++) {
        const t = j / 5;
        const p = [root[0] + d[0] * len * t, root[1] + d[1] * len * t - droop * t * t, root[2] + d[2] * len * t];
        pts.push(...prev, ...p);
        prev = p;
      }
    };
    for (const m of [1, -1]) {
      for (let k = 0; k < 4; k++) strand([m * (0.0135 + k * 0.0012), 0.2815 - k * 0.0028, 0.2465 - k * 0.0012], [m, 0.16 - k * 0.11, 0.32 - k * 0.2], 0.058 - k * 0.004, 0.01 + k * 0.002);
      for (let k = 0; k < 2; k++) strand([m * (0.016 + k * 0.006), 0.318, 0.233 - k * 0.003], [m * 0.7, 0.8, 0.4], 0.03 - k * 0.006, 0.006);
    }
    const geometry = new GFX.BufferGeometry();
    geometry.setAttribute('position', new GFX.BufferAttribute(new Float32Array(pts), 3));
    geometry.computeBoundingSphere();
    const material = new GFX.LineBasicMaterial({ name: 'whiskers', color: new GFX.Color('#f4f0e8'), transparent: true, opacity: 0.7 });
    whiskerShapes.set(GFX, { geometry, material });
  }
  const { geometry, material } = whiskerShapes.get(GFX);
  const lines = new GFX.LineSegments(geometry, material);
  lines.name = 'whiskers';
  return lines;
}
