import { createAudio as createSound, NOTE } from 'madness-engine/audio';
import { createScore, themeFor } from 'madness-engine/music/score';

/**
 * Every sound, made on the spot with Web Audio — no samples — on the
 * engine's sound (`madness-engine/audio`). The rolling is a soft brushed
 * rumble, louder on bare boards than on carpet; the ball bumps softly (it's
 * wool); cats meow and hiss, mice squeak, flies buzz off; a mousetrap snaps,
 * the strand twangs when it's caught and plucks when it breaks. The music is
 * a score of its own (`madness-engine/music/score`).
 *
 * Nothing can play until the page has had a click or a key (browsers
 * insist), so `wake()` is called on the first one.
 */

export function createAudio() {
  let roll = null, score = null;
  const audio = createSound({
    storageKey: 'catroller.muted',
    volume: { music: 0.55, sfx: 0.9 },
    // The roll: noise through a band and a low-pass, silent until the ball moves.
    onWake: (a) => { roll = a.loop({ filters: [{ type: 'bandpass', freq: 200, q: 0.7 }, { type: 'lowpass', freq: 700 }] }); },
  });
  const { burst, tone, now } = audio;

  /** A voice: a buzzy source through two formant filters, the pitch following `pitches` (Hz at each fraction of `length`). */
  function voice({ at = 0, pitches, length, formants = [[900, 6], [1600, 8]], gain = 0.2, breath = 0.04 }) {
    const { ctx, sfx } = audio;
    if (!ctx) return;
    const t = now() + at;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    pitches.forEach((p, i) => {
      const at2 = t + (i / (pitches.length - 1)) * length;
      if (i === 0) o.frequency.setValueAtTime(p, at2); else o.frequency.exponentialRampToValueAtTime(p, at2);
    });
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.04);
    g.gain.setValueAtTime(gain, t + length * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    for (const [freq, q] of formants) {
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(freq * 0.7, t);
      f.frequency.exponentialRampToValueAtTime(freq, t + length * 0.4);
      f.frequency.exponentialRampToValueAtTime(freq * 0.8, t + length);
      f.Q.value = q;
      o.connect(f).connect(g);
    }
    g.connect(sfx);
    o.start(t);
    o.stop(t + length + 0.05);
    if (breath) burst({ at, length: length * 0.8, type: 'bandpass', freq: 2500, q: 1, gain: breath });
  }

  return {
    wake: audio.wake,

    get muted() { return audio.muted; },

    toggleMute: audio.toggleMute,

    /** The hush of wool rolling, every frame: speed in tiles a second, whether it's on anything, and whether that's bare floor. */
    rolling(speed, grounded, hard = true) {
      if (!roll) return;
      const level = grounded ? Math.min(hard ? 0.2 : 0.09, speed * (hard ? 0.022 : 0.011)) : 0;
      const [band, low] = roll.filters;
      roll.gain.gain.setTargetAtTime(level, now(), 0.05);
      band.frequency.setTargetAtTime((hard ? 160 : 110) + speed * (hard ? 40 : 20), now(), 0.08);
      low.frequency.setTargetAtTime(hard ? 900 : 450, now(), 0.1);
    },

    /** The ball landing or bumping into something, as hard as `speed`: a soft, woolly thump. */
    bump(speed) {
      const k = Math.min(1, speed / 12);
      if (k < 0.08) return;
      tone({ freq: 120, to: 60, length: 0.12, gain: 0.3 * k });
      burst({ length: 0.07, freq: 500, gain: 0.25 * k });
    },

    /** A cat has seen the ball. */
    notice() {
      voice({ pitches: [520, 760, 640], length: 0.5, gain: 0.16, formants: [[1100, 7], [2300, 9]] });
      tone({ at: 0.02, freq: NOTE(84), length: 0.18, type: 'square', gain: 0.05 });
      tone({ at: 0.1, freq: NOTE(91), length: 0.25, type: 'square', gain: 0.05 });
    },

    /** A cat has a sneaking suspicion. */
    hmm() {
      voice({ pitches: [300, 340, 290], length: 0.35, gain: 0.07, formants: [[700, 6], [1300, 8]], breath: 0.01 });
    },

    /** Caught: a hiss and a swat. */
    swat() {
      burst({ length: 0.45, type: 'highpass', freq: 3500, gain: 0.35 });
      burst({ at: 0.32, length: 0.08, freq: 700, gain: 0.4 });
      tone({ at: 0.32, freq: 180, to: 80, length: 0.12, gain: 0.25 });
    },

    /** A happy cat, with a toy. */
    purr() {
      const { ctx, sfx } = audio;
      if (!ctx) return;
      const t = now();
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 26;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 180;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      o.connect(f).connect(g).connect(sfx);
      o.start(t);
      o.stop(t + 1.7);
    },

    /** A mouse off out of it. */
    squeak() {
      tone({ freq: 2600, to: 3600, length: 0.07, type: 'sine', gain: 0.12 });
      tone({ at: 0.09, freq: 2900, to: 4200, length: 0.06, type: 'sine', gain: 0.1 });
      for (let i = 0; i < 6; i++) burst({ at: 0.05 + i * 0.05, length: 0.02, type: 'highpass', freq: 5000, gain: 0.05 });
    },

    /** A fly off out of it. */
    buzz() {
      tone({ freq: 190, to: 260, length: 0.5, type: 'sawtooth', gain: 0.05, vibrato: 18 });
    },

    /** The loose end caught: a twang. */
    snag(what) {
      if (what === 'trap') {
        burst({ length: 0.04, type: 'highpass', freq: 2500, gain: 0.6 });
        tone({ freq: 1800, to: 900, length: 0.12, type: 'square', gain: 0.12 });
        tone({ at: 0.02, freq: 90, to: 50, length: 0.15, gain: 0.3 });
      }
      tone({ at: 0.03, freq: what === 'stair' ? 330 : 220, to: what === 'stair' ? 300 : 180, length: 0.5, type: 'triangle', gain: 0.12, vibrato: 6 });
    },

    /** The strand breaking. */
    snapped() {
      burst({ length: 0.05, type: 'bandpass', freq: 1800, q: 3, gain: 0.5 });
      tone({ freq: 520, to: 260, length: 0.25, type: 'triangle', gain: 0.14 });
    },

    /** Wound all the way back on. */
    rewound() {
      [72, 76, 79].forEach((n, i) => tone({ at: i * 0.06, freq: NOTE(n), length: 0.2, type: 'triangle', gain: 0.1 }));
    },

    button(n = 1) {
      for (let i = 0; i < Math.min(n, 4); i++) tone({ at: i * 0.05, freq: NOTE(90 + (i % 2) * 5), length: 0.09, type: 'triangle', gain: 0.1 });
      burst({ length: 0.03, type: 'highpass', freq: 6000, gain: 0.08 });
    },

    tin() {
      for (let i = 0; i < 10; i++) burst({ at: i * 0.035, length: 0.04, type: 'bandpass', freq: 3000 + Math.random() * 3000, q: 4, gain: 0.25 });
      [84, 88, 91, 96].forEach((n, i) => tone({ at: 0.35 + i * 0.07, freq: NOTE(n), length: 0.25, type: 'triangle', gain: 0.1 }));
    },

    skein() {
      for (let i = 0; i < 8; i++) tone({ at: i * 0.05, freq: 300 + i * 90, to: 360 + i * 110, length: 0.08, gain: 0.08 });
      tone({ at: 0.4, freq: NOTE(79), length: 0.5, type: 'triangle', gain: 0.12 });
    },

    splash() {
      burst({ length: 0.6, type: 'bandpass', freq: 1200, sweep: 400, q: 0.8, gain: 0.5 });
      for (let i = 0; i < 5; i++) tone({ at: 0.1 + i * 0.07, freq: 600 + Math.random() * 600, to: 1400, length: 0.06, gain: 0.06 });
    },

    hoover() {
      tone({ freq: 140, to: 900, length: 0.8, type: 'sawtooth', gain: 0.12 });
      burst({ length: 0.9, type: 'bandpass', freq: 800, sweep: 3000, q: 1, gain: 0.35 });
    },

    fall() {
      tone({ freq: 700, to: 110, length: 1.1, type: 'triangle', gain: 0.18 });
    },

    start() {
      [67, 72, 76, 79].forEach((n, i) => tone({ at: i * 0.11, freq: NOTE(n), length: 0.22, type: 'triangle', gain: 0.12 }));
    },

    goal() {
      [72, 76, 79, 84, 79, 84].forEach((n, i) => tone({ at: i * 0.1, freq: NOTE(n), length: i === 5 ? 0.6 : 0.15, type: 'triangle', gain: 0.13 }));
      voice({ at: 0.4, pitches: [600, 900, 700], length: 0.45, gain: 0.08 });
    },

    over() {
      [72, 69, 65, 60].forEach((n, i) => tone({ at: i * 0.3, freq: NOTE(n), length: 0.4, type: 'triangle', gain: 0.12 }));
    },

    /** The music for room `depth`. */
    startMusic(depth = 1) {
      if (!audio.ctx) return;
      score ??= createScore(audio.ctx, audio.music, audio.noise);
      if (score.playing) return;
      score.start(themeFor(depth));
    },

    /** How hard the cats are after the ball, 0 to 1, for the music. */
    tension(k) { score?.tension(k); },

    stopMusic() {
      score?.stop();
    },
  };
}
