import { BOARD_DETAIL } from 'madness-engine/characters/cat';
import { createBall } from 'madness-engine/heroes/yarn/ball';
import { toGround } from 'madness-engine/view';
import { createEffects } from './effects.js';
import { LEVELS } from './levels.js';
import { CAST } from './models/cast.js';
import { readyAll } from './models/library.js';
import { createExit, createFurniture, createHouseMeshes, createLamps } from './scenery.js';
import { COST, createSneak, LEFT, putBack, STEP, stepSneak } from './sneak.js';

/**
 * The game: the rooms one after another, down through the house, with one
 * ball of yarn. What's on the ball is what's left: a cat that catches it
 * pins the loose end and the ball unwinds as it gets away; a mousetrap, a
 * nail or the nosing of a stair does the same; the strand snaps if it pays
 * out too far, and that yarn is gone. Roll back along it before it does and
 * it winds back on. Run out of yarn and it's over. Buttons are the score.
 */

/** Buttons for every room cleared, by how far through the house it was; more if no cat ever saw the ball, or caught it. */
export const BONUS = Object.freeze({ clear: 10, unseen: 25, untouched: 15 });

const BANNERS = {
  fell: 'DOWN IN THE DARK!',
  soaked: 'SOAKED!',
  hoovered: 'HOOVERED!',
};

const SNAG_BANNERS = {
  paw: ['CAUGHT!', 'it has your end — get away, or roll back to wind it in'],
  trap: ['SNAP!', 'the mousetrap has your end'],
  nail: ['SNAGGED!', 'caught on a nail'],
};

/** How close the camera comes for the title, and how fast it circles. */
const TITLE_ZOOM = 0.55;
const TITLE_TURN = 0.12;

export function createGame({ stage, hud, input, audio, storage }) {
  const { GFX, scene, view } = stage;
  const effects = createEffects(GFX, scene);
  // The ball goes from room to room; the floor under it is whichever room it is in.
  let sneak = null;
  const floor = (x, z) => sneak?.level.heightAt(x, z) ?? null;
  const yarn = createBall(GFX, floor);
  scene.add(yarn.root);
  const q = [0, 0, 0, 1];

  let group = null;
  let decor = [];
  let state = 'title';  // title · ready · play · lost · clear · over · won
  let paused = false;
  let timer = 0;
  let accumulator = 0;
  let lostHow = null;
  let buttons = 0;
  let playZoom = 1;
  let saved = storage.load();
  let baking = false;
  let tension = 0;
  const squash = { p: 0, v: 0 };

  function setLevel(index) {
    if (group) scene.remove(group);
    sneak = createSneak(GFX, index, { yarn, q });
    group = new GFX.Group();
    const house = createHouseMeshes(GFX, sneak.built);
    const furniture = createFurniture(GFX, sneak.level);
    const lamps = createLamps(GFX, sneak.level);
    const exit = createExit(GFX, sneak.level, { last: index === LEVELS.length - 1 });
    group.add(house.group, furniture, lamps.group, sneak.actors.group, sneak.critters.group, sneak.cats.group);
    if (exit) group.add(exit.group);
    decor = [house, exit].filter(Boolean);
    stage.setLamps(lamps.bulbs);
    stage.setLight(sneak.level.palette.light);
    scene.add(group);
    effects.setHouse(sneak.level);
    accumulator = 0;
    const b = sneak.ball;
    stage.target.set(b.x, b.y, b.z);
    hud.map(sneak);
    hud.cats(sneak.cats.cats);
    yarn.pose(b, q);
    warmUp();
    // The cats and mice are sculpted in the background: the room waits till they're all in.
    const here = sneak;
    baking = true;
    const jobs = [...new Set([...sneak.level.cats.map((c) => `cat-${catCoat(c.kind)}`), ...sneak.level.critters.filter((c) => c.kind === 'mouse').map(() => 'mouse')])]
      .filter((n) => CAST[n]).map((n) => [n, n.startsWith('cat-') ? BOARD_DETAIL : 0.5]);
    readyAll(jobs).then(() => {
      if (sneak !== here) return;
      baking = false;
      warmUp();
    });
  }

  /** Draws the whole room once, nothing culled, so every shader it needs is compiled now (behind the banner). */
  function warmUp() {
    const off = [];
    group.traverse((o) => {
      if ((o.isMesh || o.isSprite) && o.frustumCulled) {
        o.frustumCulled = false;
        off.push(o);
      }
    });
    try {
      stage.look();
      stage.render();
    } finally {
      for (const o of off) o.frustumCulled = true;
    }
  }

  function enter(next) {
    state = next;
    timer = 0;
  }

  function showYarn() {
    hud.yarn(yarn.metres - yarn.paid, yarn.total, LEFT);
  }

  function showTitle() {
    if (state !== 'title') playZoom = view.aim.zoom;
    yarn.set(yarn.total);
    setLevel(0);
    enter('title');
    paused = false;
    hud.paused(false);
    view.aim.zoom = TITLE_ZOOM;
    audio.stopMusic();
    hud.title(saved);
  }

  function startRun(index) {
    buttons = 0;
    yarn.set(yarn.total);
    beginLevel(index);
  }

  function beginLevel(index) {
    if (yarn.holder) yarn.snap();
    setLevel(index);
    saved = storage.reached(index);
    if (state === 'title') view.aim.zoom = playZoom;
    enter('ready');
    hud.play();
    hud.banner(`${sneak.level.name.toUpperCase()}`, 'big', sneak.level.intro);
    hud.level(sneak.level);
    hud.score(buttons);
    showYarn();
    audio.wake();
    audio.start();
    audio.startMusic(sneak.level.depth);
  }

  /** Yarn gone outright (a fall, a soaking, the vacuum): whatever is paid out goes too. */
  function spend(metres) {
    const piece = yarn.snap();
    if (piece) sneak.actors.drop(piece);
    yarn.set(yarn.metres - metres);
    sneak.ball.r = yarn.radius;
    showYarn();
  }

  function lose(how) {
    const b = sneak.ball;
    lostHow = how;
    enter('lost');
    spend(COST[how]);
    hud.banner(`${BANNERS[how]}\n−${COST[how].toFixed(1)} m`);
    if (how === 'soaked') { effects.splash(b.x, b.y - b.r, b.z); audio.splash(); }
    else if (how === 'hoovered') { effects.dust(b.x, b.y - b.r, b.z); audio.hoover(); yarn.root.visible = false; }
    else audio.fall();
  }

  function finish() {
    const b = sneak.ball;
    const last = sneak.index === LEVELS.length - 1;
    enter(last ? 'won' : 'clear');
    if (yarn.holder) {
      const piece = yarn.snap();
      if (piece) sneak.actors.drop(piece);
    }
    const parts = [`+${BONUS.clear * sneak.level.depth} for the room`];
    let bonus = BONUS.clear * sneak.level.depth;
    if (!sneak.seen) { bonus += BONUS.unseen; parts.push(`+${BONUS.unseen} unseen`); }
    if (!sneak.caught) { bonus += BONUS.untouched; parts.push(`+${BONUS.untouched} uncaught`); }
    buttons += bonus;
    hud.score(buttons, true);
    effects.sparkle(b.x, b.y, b.z, '#ffd27a');
    audio.stopMusic();
    audio.goal();
    if (last) {
      hud.banner(`OUT THROUGH THE CAT FLAP!\n${buttons} BUTTONS`, 'big', `${yarn.metres.toFixed(1)} m of yarn left`);
      saved = storage.record(buttons);
    } else {
      hud.banner(`${sneak.level.name.toUpperCase()}\nDONE`, 'big', parts.join(' · '));
    }
  }

  function gameOver() {
    enter('over');
    hud.banner(`UNRAVELLED\n${buttons} BUTTONS`, 'big', 'there\'s not enough yarn left to roll');
    audio.stopMusic();
    audio.over();
    saved = storage.record(buttons);
  }

  function physics(push) {
    const live = state === 'play';
    const moving = yarn.root.visible && !(state === 'lost' && lostHow !== 'fell');
    const out = stepSneak(sneak, push, STEP, { live, moving });
    const b = sneak.ball;
    if (out.impact > 2.5) {
      audio.bump(out.impact);
      squash.v += Math.min(5, out.impact * 0.4);
    }
    if (out.noticed.length) audio.notice();
    for (const c of out.scared) {
      if (c.kind === 'mouse') audio.squeak(); else audio.buzz();
      if (c.watchers.size) hud.banner('EEK!', 'normal', 'you scared it off — and the cat saw');
    }
    if (out.caught) {
      audio.swat();
      effects.tuft(b.x, b.y, b.z);
    }
    if (out.snag) {
      audio.snag(out.snag);
      const words = SNAG_BANNERS[out.snag];
      if (words) hud.banner(words[0], 'normal', words[1]);
    }
    if (out.snapped) {
      audio.snapped();
      hud.banner(`SNAPPED!\n−${out.snapped.toFixed(1)} m`);
    }
    if (out.rewound) { audio.rewound(); hud.banner('WOUND BACK ON'); }
    for (const p of out.picked) {
      if (p.kind === 'button') {
        buttons += p.amount;
        hud.score(buttons, true);
        audio.button(p.amount);
        effects.sparkle(p.x, p.y, p.z, '#ffe08a');
      } else if (p.kind === 'tin') {
        buttons += p.amount;
        hud.score(buttons, true);
        audio.tin();
        effects.buttons(p.x, p.y, p.z, 16);
        hud.banner(`A TIN OF BUTTONS!\n+${p.amount}`);
      } else if (p.kind === 'skein') {
        audio.skein();
        effects.sparkle(p.x, p.y + 0.3, p.z, '#ff7a5a');
        hud.banner(p.wound > 0.05 ? `A SKEIN!\n+${p.wound.toFixed(1)} m wound on` : 'A SKEIN!', 'normal', p.wound > 0.05 ? '' : 'the ball is as big as it gets');
      }
    }
    showYarn();
    if (yarn.metres - yarn.paid < LEFT && state === 'play') return gameOver();
    if (out.outcome === 'exit') finish();
    else if (out.outcome) lose(out.outcome);
  }

  function update(dt, presses) {
    const stick = input.stick();
    const look = input.view(dt);
    view.turn(look.turn, look.tilt);
    view.zoomBy(look.zoom);
    if (state === 'title') view.aim.yaw += TITLE_TURN * dt;
    else playZoom = view.aim.zoom;
    view.step(dt);
    stage.time += dt;

    for (const p of presses) {
      if (p === 'mute') hud.muted(audio.toggleMute());
      if (p === 'home') {
        view.reset();
        if (state === 'title') view.aim.zoom = TITLE_ZOOM;
      }
      if (p === 'pause' && (state === 'play' || state === 'ready' || state === 'lost')) {
        paused = !paused;
        hud.paused(paused);
        if (paused) audio.stopMusic(); else audio.startMusic(sneak.level.depth);
      }
      if ((p === 'start' || p === 'tap') && (state === 'over' || state === 'won') && timer > 1.2) showTitle();
      else if (p === 'start' && state === 'title') startRun(0);
    }
    if (paused) {
      audio.rolling(0, false);
      return;
    }

    timer += dt;
    const push = state === 'play' ? toGround(stick, view.yaw) : [0, 0];
    accumulator = Math.min(accumulator + dt, STEP * 12);
    while (accumulator >= STEP) {
      accumulator -= STEP;
      if (state === 'title') { stepSneak(sneak, [0, 0], STEP, { live: false, moving: false }); continue; }
      physics(push);
      if (state === 'over') break;
    }

    const b = sneak.ball;
    switch (state) {
      case 'ready':
        if (timer > 1.8 && !baking) {
          enter('play');
          hud.banner(null);
        }
        break;
      case 'play':
        if (timer > 2.2 && hud.bannerShown) hud.banner(null);
        break;
      case 'lost':
        if (timer > 1.6) {
          putBack(sneak);
          yarn.root.visible = true;
          hud.banner(null);
          if (yarn.metres < LEFT) gameOver(); else enter('play');
        }
        break;
      case 'clear':
        if (timer > 3.6) beginLevel(sneak.index + 1);
        break;
      case 'over':
      case 'won':
        if (timer > 12) showTitle();
        break;
    }

    // The ball, squashed a little when it lands (it's wool).
    squash.v += (-squash.p * 160 - squash.v * 10) * dt;
    squash.p += squash.v * dt;
    yarn.pose(b, q);
    const s = squash.p * 0.035;
    yarn.ball.scale.set(1 + s * 0.4, 1 - s * 0.7, 1 + s * 0.4);
    if (state === 'title') {
      yarn.ball.position.y += Math.sin(stage.time * 1.3) * 0.004;
    }

    // How much the cats are after it, for the music.
    const chasing = sneak.cats.cats.some((c) => c.mode === 'chase' || c.mode === 'alert');
    tension += ((chasing ? 1 : 0) - tension) * Math.min(1, dt * 3);
    audio.tension(tension);

    sneak.actors.sync(dt, stage.time);
    sneak.critters.sync(dt, stage.time);
    sneak.cats.sync(dt, stage.time, { focus: b });
    for (const d of decor) d.update(stage.time);
    effects.update(dt);
    const cell = sneak.level.cell(Math.floor(b.x), Math.floor(b.z));
    audio.rolling(state === 'play' && b.grounded ? Math.hypot(b.vx, b.vz) : 0, b.grounded, !(cell?.floor === 'carpet' || cell?.rug));
    if (state !== 'title') hud.tick(dt, sneak);
    stage.ball.set(b.x, b.y, b.z);

    const target = stage.target;
    if (debug.look) {
      target.set(...debug.look.at);
      view.zoom = view.aim.zoom = debug.look.zoom;
      return;
    }
    const ty = Math.max(b.y, sneak.level.lowest - 1);
    const k = 1 - Math.exp(-(state === 'title' ? 2 : 5) * dt);
    target.x += (b.x - target.x) * k;
    target.y += (ty - target.y) * k;
    target.z += (b.z - target.z) * k;
  }

  /** For tests and the console: the level, the ball, the yarn and a camera override (`look`). */
  const debug = {
    stage, look: null, yarn,
    get sneak() { return sneak; },
    get ball() { return sneak.ball; },
    get state() { return state; },
    /** Straight to level `index`, for looking round. */
    level(index) { startRun(index); },
  };

  showTitle();

  return {
    update,
    startRun,
    get state() { return state; },
    get paused() { return paused; },
    /** Where the ball is on the screen, in CSS pixels, for the pointer controls. */
    dieOnScreen(rect) {
      const b = sneak.ball;
      const v = new GFX.Vector3(b.x, b.y, b.z).project(stage.camera);
      return { x: rect.left + (v.x + 1) / 2 * rect.width, y: rect.top + (1 - v.y) / 2 * rect.height };
    },
    debug,
  };
}

/** The coat of a kind of cat, for which bake it needs. */
function catCoat(kind) {
  return { ginger: 'ginger', black: 'black', grey: 'grey', calico: 'calico', siamese: 'siamese', tom: 'tom' }[kind] ?? kind;
}
