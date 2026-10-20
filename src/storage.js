import { saveSlot } from 'madness-engine/storage';

/**
 * What the game remembers between visits: the most buttons a run has come
 * out with, and the furthest room reached (any room up to it can be
 * started from the title). Browser storage can be missing or refuse, so
 * the engine's slot guards every touch of it and the game plays the same
 * without it.
 */

const KEY = 'catroller.v1';

export function createStorage(store = globalThis.localStorage) {
  const slot = saveSlot(KEY, store);
  const raw = slot.read();
  let saved = {
    best: Number.isFinite(raw?.best) ? raw.best : 0,
    reached: Number.isInteger(raw?.reached) ? raw.reached : 0,
  };

  const save = () => {
    slot.write(saved);
    return { ...saved };
  };

  return {
    load: () => ({ ...saved }),
    reached(index) {
      saved = { ...saved, reached: Math.max(saved.reached, index) };
      return save();
    },
    record(score) {
      saved = { ...saved, best: Math.max(saved.best, score), last: score };
      return save();
    },
  };
}
