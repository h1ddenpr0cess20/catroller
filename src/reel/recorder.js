import { createAudio } from '../audio.js';
import { createGame } from '../game.js';
import { createHud } from '../hud.js';
import { BOARD_DETAIL } from '../models/cast/cat.js';
import { CAST } from '../models/cast/index.js';
import { preload, ready } from '../models/library.js';
import { PROPS } from '../models/props/index.js';
import { createStage } from '../stage.js';
import { createStorage } from '../storage.js';
import * as GFX from '../vendor/gfx/index.js';
import { createPilot } from '../../test/helpers/autopilot.js';
import { createRecorder } from './core.js';

/**
 * Catroller, for the reels (reel.html; the filming is core.js): the game built
 * as main.js builds it, with nobody's hands on it and the autopilot rolling
 * the yarn from room to room. The cats see it as they would a player's: the
 * autopilot finds its way, it doesn't hide.
 */

createRecorder({
  async ready() {
    // Every model, not just what a room waits for: a prop baked mid-film would pop in.
    const jobs = [
      ...Object.keys(PROPS).map((n) => [n, 1]),
      ...Object.keys(CAST).map((n) => [n, n.startsWith('cat-') ? BOARD_DETAIL : 0.5]),
    ];
    preload(jobs);
    await Promise.all(jobs.map(([n, d]) => ready(n, d)));
  },

  createAudio,
  quiet: ['rolling', 'tension'],

  async build({ audio }) {
    const hud = createHud(document.body, { onStart() {} });
    hud.muted(false);
    const input = {
      stick: () => ({ x: 0, y: 0 }),
      view: () => ({ turn: 0, tilt: 0, zoom: 1 }),
      take: () => [],
      get pointing() { return false; },
    };
    const stage = await createStage(document.getElementById('view'));
    const game = createGame({ stage, hud, input, audio, storage: createStorage() });
    return { game, stage, GFX };
  },

  start: (game, level) => game.startRun(level),
  pilot: (game) => createPilot(game.debug.sneak),
  attach: (game, pilot) => { game.debug.pilot = pilot; },
  ball: (game) => game.debug.ball,
  name: (game) => game.debug.sneak.level.name,
  state: (game) => game.state,
  phase: (game) => ({ play: 'live', clear: 'end', won: 'end', over: 'end' })[game.state] ?? 'wait',
  music: (audio, m) => audio.startMusic(...m.args),

  card: {
    logo: '<h1>Catroller</h1><p class="tag">roll quietly</p>',
    url: 'catroller.vercel.app',
  },
  theme: {
    display: '"Cooper Black", "Cooper Std", "Bookman Old Style", "Recoleta", Georgia, serif',
    body: '"Avenir Next", "Nunito", "Trebuchet MS", "Segoe UI", system-ui, sans-serif',
    accent: '#ec3013',
    'accent-dark': '#7a2412',
    'accent-2': '#ffc870',
    cool: '#ff8a6a',
    dim: '#b0a294',
  },
});
