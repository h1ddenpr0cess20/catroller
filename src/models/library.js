import { BOARD_DETAIL } from 'madness-engine/characters/cat';
import { createBakeLibrary } from 'madness-engine/models/bake';
import { CAST } from './cast.js';

/**
 * The models, baked in the background as the page starts: a few workers
 * share out the work, and each mesh is handed over as it is done. Until
 * then whoever wants one waits (`ready`) or carries on without it. Nothing
 * in the house is sculpted to be picked up (the buttons, tins and skeins are
 * built), so it is only the creatures, at the detail the board wants them.
 */
export const { isBaked, readyAll, ready, preload } = createBakeLibrary({
  sculpted: CAST,
  spawn: () => new Worker(new URL('./bake.worker.js', import.meta.url), { type: 'module' }),
  jobs: () => Object.keys(CAST).map((n) => [n, n.startsWith('cat-') ? BOARD_DETAIL : 0.5]),
  label: 'catroller',
});
