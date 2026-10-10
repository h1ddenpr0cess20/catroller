import { LEVELS } from './levels.js';
import { CAT_KINDS } from './models/cast/cat.js';

/**
 * Everything on screen that isn't the 3D view: the room, the buttons and the
 * yarn left along the top; the cats of the room down the side, each with
 * what's on its mind; a map of what has been seen; the big messages in the
 * middle; the title screen.
 */

const NAMES = LEVELS.map((level) => level().name);

/** The colour each coat shows as, in the list of cats. */
const COATS = { ginger: '#e2903e', black: '#262028', grey: '#8a8e96', calico: 'conic-gradient(#f2ece2 0 40%, #d8822e 0 70%, #2a2220 0)', siamese: 'radial-gradient(#e8d8bc 45%, #4a3426 50%)', tom: '#7a6a56' };

/** What a cat's mood looks like. */
const MOODS = { sure: '!', unsure: '?', asleep: 'z', busy: '♥', calm: '·' };

export function createHud(root, { onStart }) {
  const $ = (id) => root.querySelector(`#${id}`);
  const top = $('top');
  const levelEl = $('level');
  const scoreEl = $('score');
  const metresEl = $('metres');
  const meterEl = top.querySelector('.meter i');
  const yarnEl = top.querySelector('.yarn');
  const bannerEl = $('banner');
  const titleEl = $('title');
  const levelsEl = $('levels');
  const bestEl = $('best');
  const pauseEl = $('pause');
  const muteEl = $('mute');
  const catsEl = $('cats');
  const mapEl = $('map');
  const ctx = mapEl.getContext('2d');
  let shown = false;
  let mapEvery = 0;
  let mapScale = 2;
  let catRows = [];
  let lastMetres = null;

  muteEl.addEventListener('click', (e) => {
    e.stopPropagation();
    muteEl.dispatchEvent(new CustomEvent('mute', { bubbles: true }));
  });

  /** The map: every tile seen so far, the ball, the cats near it and the doorway once found. */
  function drawMap(sneak) {
    const { level, explored, ball } = sneak;
    const s = mapScale;
    ctx.clearRect(0, 0, mapEl.width, mapEl.height);
    for (let z = 0; z < level.rows; z++) {
      for (let x = 0; x < level.cols; x++) {
        if (!explored[z * level.cols + x]) continue;
        const c = level.cell(x, z);
        if (!c) continue;
        ctx.fillStyle = c.kind === 'wall' ? '#4a3e3a' : c.kind === 'water' ? '#5aa8d0' : c.kind === 'exit' ? '#ffc870'
          : c.block ? '#6a5848' : c.under ? '#8a7060' : c.stair ? '#b89a7a' : '#c8b49a';
        ctx.fillRect(x * s, z * s, s, s);
      }
    }
    for (const p of sneak.actors.pickups) {
      if (p.taken || !explored[Math.floor(p.z) * level.cols + Math.floor(p.x)]) continue;
      ctx.fillStyle = p.kind === 'skein' ? '#ff6a4a' : '#ffe08a';
      ctx.fillRect(p.x * s - s / 2, p.z * s - s / 2, s, s);
    }
    for (const m of sneak.critters.critters) {
      if (m.gone || Math.hypot(m.x - ball.x, m.z - ball.z) > 10) continue;
      ctx.fillStyle = '#a8f0a0';
      ctx.fillRect(m.x * s - s / 2, m.z * s - s / 2, s, s);
    }
    for (const c of sneak.cats.cats) {
      if (Math.hypot(c.x - ball.x, c.z - ball.z) > 12) continue;
      ctx.fillStyle = c.mode === 'chase' || c.mode === 'alert' ? '#ff4a3a' : c.mode === 'sleep' ? '#8aa8e0' : '#ffb070';
      ctx.beginPath();
      ctx.arc(c.x * s, c.z * s, s * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ff3a1a';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(ball.x * s, ball.z * s, s * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  return {
    get bannerShown() { return shown; },

    title(saved) {
      titleEl.hidden = false;
      top.hidden = true;
      catsEl.hidden = true;
      mapEl.hidden = true;
      bannerEl.hidden = true;
      shown = false;
      levelsEl.replaceChildren(...LEVELS.map((_, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'room';
        b.disabled = i > saved.reached;
        b.innerHTML = `<span class="numeral">${i + 1}</span><span class="name">${NAMES[i]}</span>`;
        b.title = b.disabled ? 'Reach this room to start from it' : `Start from ${NAMES[i]}`;
        b.addEventListener('click', (e) => { e.stopPropagation(); onStart(i); });
        b.addEventListener('pointerdown', (e) => e.stopPropagation());
        return b;
      }));
      bestEl.textContent = saved.best > 0
        ? `best ${saved.best} buttons${saved.last != null ? ` · last ${saved.last}` : ''}`
        : '';
    },

    play() {
      titleEl.hidden = true;
      top.hidden = false;
      catsEl.hidden = false;
      mapEl.hidden = false;
    },

    level(level) {
      levelEl.innerHTML = `<span class="label">room ${level.depth} of ${LEVELS.length}</span>${level.name}`;
    },

    score(n, pop = false) {
      scoreEl.textContent = String(n);
      if (pop) {
        scoreEl.classList.remove('pop');
        void scoreEl.offsetWidth;
        scoreEl.classList.add('pop');
      }
    },

    /** The yarn on the ball, out of a whole ball's worth. */
    yarn(metres, total, low) {
      meterEl.style.width = `${Math.max(0, Math.min(100, (100 * metres) / total))}%`;
      metresEl.textContent = `${metres.toFixed(1)} m`;
      yarnEl.classList.toggle('low', metres < low * 2.2);
      if (lastMetres !== null && metres < lastMetres - 0.05) {
        metresEl.classList.remove('out');
        void metresEl.offsetWidth;
        metresEl.classList.add('out');
      }
      lastMetres = metres;
    },

    /** The cats of the room, for the list down the side. */
    cats(cats) {
      catRows = cats.map((c) => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="coat" style="--coat:${COATS[CAT_KINDS[c.kind].coat]}"></span><span class="name">${CAT_KINDS[c.kind].name}</span><span class="mood"></span>`;
        return { li, mood: li.querySelector('.mood'), cat: c, was: null };
      });
      catsEl.replaceChildren(...catRows.map((r) => r.li));
    },

    /** A new level: a map canvas to fit it. */
    map(sneak) {
      const { cols, rows } = sneak.level;
      mapScale = Math.max(1, Math.floor(180 / Math.max(cols, rows)));
      mapEl.width = cols * mapScale;
      mapEl.height = rows * mapScale;
      drawMap(sneak);
    },

    tick(dt, sneak) {
      for (const r of catRows) {
        const c = r.cat;
        const mood = c.mode === 'alert' || c.mode === 'chase' ? 'sure'
          : c.mode === 'sleep' ? 'asleep'
            : c.mode === 'watch' || c.mode === 'play' || c.mode === 'swat' ? 'busy'
              : c.mode === 'search' || c.suspicion > 0.08 ? 'unsure' : 'calm';
        if (mood !== r.was) {
          r.was = mood;
          r.li.dataset.mood = mood;
          r.mood.textContent = MOODS[mood];
        }
      }
      mapEvery -= dt;
      if (mapEvery > 0 || mapEl.hidden) return;
      mapEvery = 0.15;
      drawMap(sneak);
    },

    banner(text, size = 'normal', sub = '') {
      shown = text != null;
      bannerEl.hidden = !shown;
      if (!shown) return;
      bannerEl.textContent = text;
      if (sub) {
        const small = document.createElement('small');
        small.textContent = sub;
        bannerEl.appendChild(small);
      }
      bannerEl.className = size;
      void bannerEl.offsetWidth;
      bannerEl.classList.add('pop');
    },

    paused(on) { pauseEl.hidden = !on; },

    muted(on) {
      muteEl.setAttribute('aria-pressed', String(on));
      muteEl.textContent = on ? 'sound off' : 'sound on';
    },
  };
}
