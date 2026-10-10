import { fbm, noise, rgb, rotation } from '../sdf.js';
import { mix, smooth } from '../skins.js';

/**
 * The cats: one sculpt — a cat standing, facing +z, feet on y = 0, about a
 * tile and a half nose to rump and a tile to the top of its head — in six
 * coats, each its own bake. Long legs, a deep chest, a tail held up with a
 * crook at its tip, big ears, and eyes that catch the light.
 *
 * Each kind is also a nature: how fast it runs, how far it sees and how
 * wide, how wary it is, how keen its ears, how long it plays.
 */

/** Sculpted at a third of the size it stands in the house. */
const SCALE = 3;

/** The coats and natures. */
export const CAT_KINDS = {
  ginger: { name: 'Marmalade', coat: 'ginger', speed: 5.0, sight: 7.5, fov: 2.4, wary: 1.0, ears: 1.0, play: 4.5, size: 1, reach: 0.62 },
  black: { name: 'Soot', coat: 'black', speed: 5.6, sight: 8.5, fov: 2.2, wary: 1.1, ears: 1.2, play: 3.5, size: 1, reach: 0.62 },
  grey: { name: 'Smoke', coat: 'grey', speed: 4.4, sight: 6.5, fov: 2.4, wary: 0.8, ears: 0.8, play: 5, size: 1, reach: 0.62 },
  calico: { name: 'Patches', coat: 'calico', speed: 5.0, sight: 7, fov: 2.4, wary: 0.9, ears: 1.0, play: 6.5, size: 0.95, reach: 0.6 },
  siamese: { name: 'Duchess', coat: 'siamese', speed: 5.4, sight: 9.5, fov: 2.6, wary: 1.35, ears: 1.3, play: 3.5, size: 0.95, reach: 0.6 },
  tom: { name: 'Big Tom', coat: 'tom', speed: 4.6, sight: 9, fov: 2.5, wary: 1.2, ears: 1.1, play: 3.0, size: 1.35, reach: 0.9 },
};

// ——————————————————————————————————————— coats

const C = (hex) => rgb(hex);
const lerp3 = (a, b, t) => mix(a, b, Math.max(0, Math.min(1, t)));

/** Lighter underneath: the belly, the chest, the chin and the insides of the legs. */
const belly = (p, n, over, under, edge = 0.1) => lerp3(under, over, smooth(-0.55, edge, n[1] + (p[2] > 0.2 ? -0.3 : 0)));

/** Fine grain along the way the fur lies: back along z on the body. */
const hairs = (p, k = 0.18) => 1 + (noise(p[0] * 260, p[1] * 260, p[2] * 60) - 0.5) * 2 * k;

/** Tabby stripes: round the body and the legs and the tail, broken up, with an M on the brow. */
function stripes(p, period = 0.042) {
  const wob = (fbm(p[0] * 14, p[1] * 14, p[2] * 14, 2) - 0.5) * 0.06;
  let s;
  if (p[2] < -0.17) s = (p[1] + p[2] * 0.4) / period; // the tail: rings
  else if (p[1] < 0.15) s = p[1] / (period * 0.8); // the legs: bars
  else s = p[2] / period + Math.abs(p[0]) * 4; // the body: round it, swept back down the sides
  const f = Math.abs(((s + wob / period) % 1 + 1) % 1 - 0.5) * 2;
  return smooth(0.55, 0.85, f);
}

/** How far toward the tips — the face, the ears, the paws, the tail — for Siamese points. */
function points(p) {
  const face = smooth(0.2, 0.27, p[2]) * smooth(0.25, 0.3, p[1] + (p[2] - 0.22) * 0.5);
  const ears = smooth(0.34, 0.37, p[1]);
  const paws = smooth(0.07, 0.03, p[1]);
  const tail = smooth(-0.2, -0.27, p[2]) * smooth(0.18, 0.22, p[1]);
  return Math.max(face, ears, paws, tail);
}

const COATS = {
  ginger: (p, n) => {
    const over = lerp3(C('#e2903e'), C('#a8521c'), stripes(p));
    return belly(p, n, over, C('#f4d2a4')).map((v) => v * hairs(p));
  },
  black: (p) => C('#151215').map((v) => v * (0.85 + 0.3 * noise(p[0] * 40, p[1] * 40, p[2] * 40)) * hairs(p, 0.25)),
  grey: (p, n) => belly(p, n, C('#7d828c'), C('#a7abb2')).map((v) => v * (0.9 + 0.2 * fbm(p[0] * 20, p[1] * 20, p[2] * 20, 2)) * hairs(p)),
  calico: (p, n) => {
    const a = fbm(p[0] * 9 + 3, p[1] * 9, p[2] * 9, 3), b = fbm(p[0] * 8, p[1] * 8 + 7, p[2] * 8, 3);
    const white = C('#f2ece2');
    let c = a > 0.56 ? C('#d8822e') : b > 0.6 ? C('#2a2220') : white;
    // White underneath and on the paws, whatever the patches.
    if (n[1] < -0.35 || p[1] < 0.06 || (p[2] > 0.25 && p[1] < 0.3)) c = white;
    return c.map((v) => v * hairs(p));
  },
  siamese: (p, n) => {
    const body = belly(p, n, C('#e8d8bc'), C('#f4ead8'));
    return lerp3(body, C('#4a3426'), points(p)).map((v) => v * hairs(p, 0.12));
  },
  tom: (p, n) => {
    const over = lerp3(C('#8a7660'), C('#3e3428'), stripes(p, 0.05));
    const c = belly(p, n, over, C('#ece4d6'), -0.1);
    // A white bib.
    const bib = smooth(0.06, 0.02, Math.hypot(p[0] * 1.4, p[1] - 0.2, p[2] - 0.15) - 0.04);
    return lerp3(c, C('#f0ebe2'), bib).map((v) => v * hairs(p, 0.22));
  },
};

/** The eye colour for each coat. */
const EYES = { ginger: '#c8e05a', black: '#f2c43a', grey: '#e8a63a', calico: '#7ac86a', siamese: '#5aa8f0', tom: '#e8b030' };

const side = (s) => (s > 0 ? 'L' : 'R');

/** The cat, sculpted in `coat`. */
function catDef(coat) {
  const fur = COATS[coat];
  const pink = coat === 'black' ? '#3a2a2c' : '#d9928e';
  return {
    name: `cat-${coat}`,
    scale: SCALE * (coat === 'tom' ? 1.35 : coat === 'calico' || coat === 'siamese' ? 0.95 : 1),
    cell: 0.0042,
    cells: { eyes: 0.0018, pupils: 0.0011, ears: 0.0024, nose: 0.0016 },
    budget: 40000,
    bones: [
      ['root', null, [0, 0, 0]],
      ['body', 'root', [0, 0.2, -0.1]],
      ['chest', 'body', [0, 0.21, 0.06]],
      ['neck', 'chest', [0, 0.25, 0.13]],
      ['head', 'neck', [0, 0.3, 0.19]],
      ['jaw', 'head', [0, 0.285, 0.235]],
      ['earL', 'head', [0.04, 0.35, 0.2]],
      ['earR', 'head', [-0.04, 0.35, 0.2]],
      ['fl1L', 'chest', [0.05, 0.19, 0.11]],
      ['fl2L', 'fl1L', [0.05, 0.095, 0.12]],
      ['fl1R', 'chest', [-0.05, 0.19, 0.11]],
      ['fl2R', 'fl1R', [-0.05, 0.095, 0.12]],
      ['hl1L', 'body', [0.055, 0.19, -0.13]],
      ['hl2L', 'hl1L', [0.06, 0.105, -0.08]],
      ['hl3L', 'hl2L', [0.06, 0.055, -0.155]],
      ['hl1R', 'body', [-0.055, 0.19, -0.13]],
      ['hl2R', 'hl1R', [-0.06, 0.105, -0.08]],
      ['hl3R', 'hl2R', [-0.06, 0.055, -0.155]],
      ['tail1', 'body', [0, 0.21, -0.18]],
      ['tail2', 'tail1', [0, 0.245, -0.235]],
      ['tail3', 'tail2', [0, 0.3, -0.27]],
      ['tail4', 'tail3', [0, 0.36, -0.285]],
      ['tail5', 'tail4', [0, 0.41, -0.27]],
    ],
    materials: {
      fur: { roughness: 0.85, sheen: 1, sheenColor: coat === 'black' ? '#6a6070' : '#fff0e0', sheenRoughness: 0.5 },
      skin: { roughness: 0.5, clearcoat: 0.2 },
      nose: { roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 },
      eye: { roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03, emissive: EYES[coat], emissiveIntensity: 0.55 },
      whisker: { roughness: 0.4, clearcoat: 0.5 },
      pupil: { roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 },
    },
    sculpt(s) {
      // Fur all over: the surface raised in soft locks lying back along the body.
      const F = { color: fur, mat: 'fur', locks: [0.0105, 0.0014, 2, 2.6] };
      const FL = { ...F, locks: [0.008, 0.0012, 1, 2.2] };
      const FH = { ...F, locks: [0.0075, 0.0011, 2, 2.0] };

      // The body: a deep chest, a tucked waist, round haunches, a dip behind the shoulders.
      s.ellipsoid([0, 0.207, -0.035], [0.066, 0.072, 0.15], { ...F, bone: 'body', k: 0.035 });
      s.ellipsoid([0, 0.205, 0.07], [0.064, 0.086, 0.085], { ...F, bone: 'chest', k: 0.05 });
      s.ellipsoid([0, 0.162, 0.015], [0.052, 0.04, 0.1], { ...F, bone: 'body', k: 0.05 });
      s.mirror((m) => {
        // Shoulder blades, and the haunches.
        s.ellipsoid([m * 0.04, 0.245, 0.085], [0.03, 0.04, 0.05], { ...F, bone: 'chest', k: 0.035, rot: [0.3, 0, 0] });
        s.ellipsoid([m * 0.043, 0.205, -0.125], [0.04, 0.066, 0.068], { ...F, bone: `hl1${side(m)}`, k: 0.04 });
      });
      // A ruff of fur down the front of the chest.
      s.ellipsoid([0, 0.19, 0.135], [0.045, 0.06, 0.03], { ...F, bone: 'chest', k: 0.04, rot: [-0.4, 0, 0] });
      // The neck, up and forward.
      s.limb([0, 0.235, 0.11], [0, 0.29, 0.18], 0.05, 0.043, { ...F, bone: 'neck', k: 0.04 });

      // The head: broad across the cheeks, a flattish brow, a short muzzle.
      s.ellipsoid([0, 0.314, 0.204], [0.052, 0.05, 0.05], { ...FH, bone: 'head', k: 0.03 });
      s.mirror((m) => {
        // Full cheeks, swept back into a ruff.
        s.ellipsoid([m * 0.029, 0.291, 0.222], [0.029, 0.026, 0.03], { ...FH, bone: 'head', k: 0.025, rot: [0, m * 0.35, 0] });
        s.ellipsoid([m * 0.042, 0.288, 0.2], [0.018, 0.026, 0.026], { ...FH, bone: 'head', k: 0.02 });
        // The whisker pads, either side of the nose.
        s.ellipsoid([m * 0.0125, 0.285, 0.258], [0.0145, 0.0125, 0.012], { ...FH, bone: 'head', k: 0.008 });
      });
      s.ellipsoid([0, 0.295, 0.246], [0.024, 0.02, 0.02], { ...FH, bone: 'head', k: 0.015 });
      // The bridge of the nose, and the nose leather: a small pink triangle.
      s.limb([0, 0.318, 0.245], [0, 0.302, 0.262], 0.0105, 0.0085, { ...FH, bone: 'head', k: 0.012 });
      s.part('nose', () => {
        s.ellipsoid([0, 0.299, 0.2675], [0.0078, 0.0052, 0.0045], { color: pink, mat: 'nose', bone: 'head', k: 0.003, rot: [0.5, 0, 0] });
        s.mirror((m) => s.sphere([m * 0.0035, 0.2975, 0.2715], 0.0018, { op: 'sub', k: 0.001 }));
      });
      // The mouth: a little chin under the pads, and the line between.
      s.ellipsoid([0, 0.273, 0.247], [0.0145, 0.0085, 0.0135], { ...FH, bone: 'jaw', k: 0.01 });
      // The brow over each eye.
      s.mirror((m) => s.ellipsoid([m * 0.022, 0.326, 0.24], [0.019, 0.0085, 0.012], { ...FH, bone: 'head', k: 0.014, rot: [0, 0, m * -0.25] }));

      // Eyes: big and almond-shaped, set a little apart, rimmed dark; the iris glowing, a slit of a pupil.
      s.mirror((m) => {
        const c = [m * 0.0235, 0.3105, 0.2445], dir = [m * 0.36, 0.06, 0.93];
        const l = Math.hypot(...dir), d = dir.map((v) => v / l);
        const at = (t) => c.map((v, i) => v + d[i] * t);
        const rot = [-Math.asin(d[1]), Math.atan2(d[0], d[2]), m * 0.32];
        s.ellipsoid(at(0.004), [0.0145, 0.0105, 0.01], { op: 'sub', k: 0.004, rot });
        s.part('eyes', () => s.ellipsoid(c, [0.0135, 0.0105, 0.0105], { color: EYES[coat], mat: 'eye', bone: 'head', k: 0, rot }));
        s.part('pupils', () => s.ellipsoid(at(0.0098), [0.0019, 0.0078, 0.0016], { color: '#050404', mat: 'pupil', bone: 'head', k: 0, rot }));
      });

      // Ears: tall, wide at the base, pointed, cupped forward, pink inside with tufts of fur.
      s.part('ears', () => s.mirror((m) => {
        const b = `ear${side(m)}`;
        const rot = [-0.12, m * 0.28, m * -0.32];
        const R = rotation(rot);
        const tip = [m * 0.047, 0.396, 0.196];
        s.cone(tip, 0.031, 0.062, { ...FH, bone: b, k: 0.005, rot });
        const f = [R[0][2], R[1][2], R[2][2]];
        const cup = [tip[0] + f[0] * 0.012, tip[1] - 0.036 + f[1] * 0.012, tip[2] + f[2] * 0.012];
        s.ellipsoid(cup, [0.021, 0.034, 0.0085], { op: 'sub', k: 0.005, rot });
        s.paint((p) => Math.hypot(p[0] - cup[0], (p[1] - cup[1]) * 0.55, p[2] - cup[2]) - 0.021, pink, 0.005);
        for (let k = 0; k < 3; k++) {
          const a = [cup[0] - m * 0.004 * k, cup[1] - 0.012 + k * 0.006, cup[2] - 0.002];
          s.flake(a, [a[0] - m * 0.006, a[1] + 0.014, a[2] + 0.008], [0, 0, 1], 0.0022, 0.0006, 0.45, { color: '#f2eae0', mat: 'fur', bone: b, k: 0.002 });
        }
      }));

      // Front legs: muscular at the top, slim below, a neat round paw with toes.
      s.mirror((m) => {
        const b = side(m);
        s.limb([m * 0.047, 0.205, 0.098], [m * 0.046, 0.1, 0.118], 0.03, 0.019, { ...FL, bone: `fl1${b}`, k: 0.03 });
        s.limb([m * 0.046, 0.1, 0.118], [m * 0.044, 0.026, 0.126], 0.0175, 0.0145, { ...FL, bone: `fl2${b}`, k: 0.012 });
        s.ellipsoid([m * 0.044, 0.0135, 0.137], [0.0185, 0.0125, 0.022], { ...FL, bone: `fl2${b}`, k: 0.01 });
        for (const t of [-1.5, -0.5, 0.5, 1.5]) s.sphere([m * 0.044 + t * 0.0082, 0.0095, 0.153 - Math.abs(t) * 0.0035], 0.0072, { ...FL, bone: `fl2${b}`, k: 0.004 });
      });
      // Hind legs: a big thigh, the long shin back to the hock, the foot down to the paw.
      s.mirror((m) => {
        const b = side(m);
        s.limb([m * 0.05, 0.185, -0.12], [m * 0.056, 0.105, -0.078], 0.037, 0.023, { ...FL, bone: `hl1${b}`, k: 0.03 });
        s.limb([m * 0.056, 0.105, -0.078], [m * 0.057, 0.056, -0.155], 0.02, 0.0145, { ...FL, bone: `hl2${b}`, k: 0.012 });
        s.limb([m * 0.057, 0.056, -0.155], [m * 0.054, 0.016, -0.124], 0.0145, 0.0135, { ...FL, bone: `hl3${b}`, k: 0.01 });
        s.ellipsoid([m * 0.054, 0.0125, -0.11], [0.017, 0.0115, 0.022], { ...FL, bone: `hl3${b}`, k: 0.01 });
        for (const t of [-1.5, -0.5, 0.5, 1.5]) s.sphere([m * 0.054 + t * 0.0076, 0.009, -0.095 - Math.abs(t) * 0.003], 0.0066, { ...FL, bone: `hl3${b}`, k: 0.004 });
      });

      // The tail: up from the rump, thick with fur, a crook at the tip.
      s.chain(
        [[0, 0.21, -0.17], [0, 0.245, -0.235], [0, 0.3, -0.27], [0, 0.36, -0.285], [0, 0.41, -0.27], [0, 0.436, -0.232]],
        [0.021, 0.02, 0.019, 0.018, 0.017, 0.013],
        { ...F, locks: [0.009, 0.0022, 1, 2.6], bones: ['tail1', 'tail2', 'tail3', 'tail4', 'tail5'], k: 0.012 },
      );

      // Tufts: a ruff at the cheeks, fluff at the chest.
      s.mirror((m) => s.tufts({
        count: 9, center: [m * 0.05, 0.285, 0.205], spread: 0.06, seed: m > 0 ? 3 : 7, length: 0.016, r: 0.0042, flat: 0.5, mat: 'fur',
        color: (t, p) => fur(p, [m, 0, 0]), aim: (p, n) => [n[0] * 0.8 + m * 0.3, n[1] * 0.4 - 0.5, n[2] * 0.4 - 0.6],
        keep: (p) => Math.abs(p[0]) > 0.035 && p[1] < 0.305,
      }));
      s.tufts({
        count: 10, center: [0, 0.19, 0.16], spread: 0.08, seed: 11, length: 0.018, r: 0.005, flat: 0.5, mat: 'fur',
        color: (t, p) => fur(p, [0, -0.6, 0.8]), aim: (p, n) => [n[0], n[1] - 0.8, n[2] * 0.6],
        keep: (p, n) => n[2] > 0.3 && p[1] < 0.24,
      });
      s.grown();

      if (coat === 'tom') {
        // An old fighter: a nick out of one ear.
        s.sphere([0.064, 0.378, 0.19], 0.011, { op: 'sub', k: 0.002 });
      }
    },

    /**
     * clip: 'sit', 'sleep' (curled), 'walk', 'run' (a gallop), 'stalk' (low
     * and slow), 'crouch' (low, still, all eyes), 'alert' (up tall),
     * 'swat' (a paw up and down, over 0.45 s), 'play' (batting, both
     * paws), 'look' (standing, looking about). `pace` is how fast it really
     * goes, tiles a second.
     */
    animate(k, { clip = 'sit', t = 0, time = 0, seed = 0, speed = 1, pace = 0 }) {
      const T = time + seed;
      const sway = (amp, f, ph = 0) => amp * Math.sin(T * f + ph);
      const legs = (front, hind) => {
        for (const [b, a] of front) k.turn(b, a, 0, 0);
        for (const [b, a] of hind) k.turn(b, a, 0, 0);
      };
      // Always: breathing, and a tail that is never quite still.
      k.scale('chest', 1, 1 + sway(0.02, 2.6), 1);
      const tailWave = (amp, f) => { for (let i = 1; i <= 5; i++) k.turn(`tail${i}`, 0, sway(amp, f, -i * 0.7), 0); };

      if (clip === 'sit') {
        // Haunches down, chest up, front legs straight.
        k.turn('body', -0.7, 0, 0);
        k.move('root', 0, -0.062, -0.02);
        k.turn('chest', 0.12, 0, 0);
        k.turn('neck', 0.32, 0, 0);
        k.turn('head', 0.18 + sway(0.05, 0.7), sway(0.3, 0.45), 0);
        legs([['fl1L', 0.48], ['fl1R', 0.48]], [['hl1L', -0.35], ['hl1R', -0.35], ['hl2L', 0.55], ['hl2R', 0.55], ['hl3L', 0.35], ['hl3R', 0.35]]);
        k.scale('fl1L', 1, 1.18, 1); k.scale('fl1R', 1, 1.18, 1);
        k.turn('tail1', 1.0, 0.5, 0); k.turn('tail2', 0.5, 0.6, 0); k.turn('tail3', 0.2, 0.5, 0);
        tailWave(0.08, 1.2);
        const blink = Math.max(0, Math.sin(T * 0.9) * Math.sin(T * 3.1) - 0.85) * 4;
        k.turn('earL', 0, blink * 0.3, -blink * 0.2);
      } else if (clip === 'sleep') {
        // Curled up: down on the floor, head on its paws, tail round.
        k.move('root', 0, -0.13, 0);
        k.turn('root', 0, 0, 0.25);
        k.turn('neck', 0.5, 0.6, 0);
        k.turn('head', 0.3 + sway(0.02, 1.2), 0.5, 0.3);
        legs([['fl1L', -1.2], ['fl1R', -1.2], ['fl2L', 1.8], ['fl2R', 1.8]], [['hl1L', 0.9], ['hl1R', 0.9], ['hl2L', 0.5], ['hl2R', 0.5]]);
        for (let i = 1; i <= 5; i++) k.turn(`tail${i}`, i === 1 ? 1.2 : 0.1, 0.55, 0);
        k.scale('body', 1, 1 + sway(0.03, 1.4), 1);
      } else if (clip === 'walk' || clip === 'stalk' || clip === 'look') {
        const low = clip === 'stalk' ? 1 : 0;
        const rate = clip === 'look' ? 0 : 9 * Math.max(0.5, Math.min(1.6, pace / 2.0));
        const ph = T * rate;
        const g = Math.sin(ph), g2 = Math.sin(ph + Math.PI);
        k.move('root', 0, -0.05 * low + Math.abs(Math.sin(ph)) * 0.006, 0);
        k.turn('body', 0.05 * low, sway(0.04, rate / 2), 0);
        k.turn('neck', -0.1 * low + 0.1, 0, 0);
        k.turn('head', 0.15 * low, clip === 'look' ? Math.sin(T * 1.7) * 0.7 : 0, 0);
        const amp = clip === 'look' ? 0 : 0.42;
        legs([['fl1L', g * amp - 0.3 * low], ['fl1R', g2 * amp - 0.3 * low], ['fl2L', Math.max(0, -g) * 0.6 + 0.5 * low], ['fl2R', Math.max(0, -g2) * 0.6 + 0.5 * low]],
          [['hl1L', -g2 * amp + 0.3 * low], ['hl1R', -g * amp + 0.3 * low], ['hl2L', Math.max(0, g2) * 0.4 - 0.3 * low], ['hl2R', Math.max(0, g) * 0.4 - 0.3 * low]]);
        k.turn('tail1', low ? 1.3 : 0.25, 0, 0);
        k.turn('tail2', low ? 0.3 : 0.1, 0, 0);
        tailWave(low ? 0.04 : 0.1, low ? 9 : 3);
      } else if (clip === 'run') {
        // A gallop: front pair and back pair together, the spine flexing.
        const ph = T * 15;
        const g = Math.sin(ph);
        k.move('root', 0, Math.max(0, Math.sin(ph + 0.6)) * 0.03 - 0.01, 0);
        k.turn('body', g * 0.12, 0, 0);
        k.turn('chest', -g * 0.18, 0, 0);
        k.turn('neck', 0.25 + g * 0.08, 0, 0);
        k.turn('head', -0.1, 0, 0);
        legs([['fl1L', -g * 0.85], ['fl1R', -g * 0.75], ['fl2L', Math.max(0, g) * 0.9], ['fl2R', Math.max(0, g) * 0.8]],
          [['hl1L', g * 0.8], ['hl1R', g * 0.7], ['hl2L', -Math.max(0, -g) * 0.5], ['hl2R', -Math.max(0, -g) * 0.45]]);
        k.turn('tail1', 1.35, 0, 0); k.turn('tail2', -0.3 + g * 0.2, 0, 0); k.turn('tail3', -0.4, 0, 0);
      } else if (clip === 'crouch') {
        // Low, eyes front, haunches up, wiggling to pounce; the tail-tip twitching.
        const wiggle = Math.max(0, Math.sin(T * 0.8)) * sway(0.06, 16);
        k.move('root', wiggle * 0.2, -0.07, 0);
        k.turn('body', 0.15, wiggle, 0);
        k.turn('chest', -0.25, 0, 0);
        k.turn('neck', -0.15, 0, 0);
        k.turn('head', 0.25, sway(0.08, 2.5), 0);
        legs([['fl1L', -0.5], ['fl1R', -0.5], ['fl2L', 1.0], ['fl2R', 1.0]], [['hl1L', 0.6], ['hl1R', 0.6], ['hl2L', -0.6], ['hl2R', -0.6]]);
        k.turn('tail1', 1.55, 0, 0); k.turn('tail2', -0.2, 0, 0);
        k.turn('tail4', 0, sway(0.6, 11), 0); k.turn('tail5', 0, sway(0.9, 11, -0.6), 0);
        k.turn('earL', 0.2, 0, 0); k.turn('earR', 0.2, 0, 0);
      } else if (clip === 'alert') {
        // Up tall, ears pricked, tail up and fluffed.
        const up = smooth(0, 0.2, t);
        k.move('root', 0, 0.02 * up, 0);
        k.turn('neck', -0.25 * up, 0, 0);
        k.turn('head', -0.1 * up, 0, 0);
        k.turn('tail1', 0.2, 0, 0);
        for (let i = 1; i <= 5; i++) k.scale(`tail${i}`, 1 + 0.5 * up, 1 + 0.5 * up, 1);
        k.turn('earL', -0.3 * up, 0, 0); k.turn('earR', -0.3 * up, 0, 0);
      } else if (clip === 'swat') {
        // Up on its haunches a little, a front paw up, and down on the ball.
        const up = smooth(0, 0.18, t), down = smooth(0.18, 0.3, t);
        k.turn('body', -0.3 * up, 0, 0);
        k.turn('neck', 0.25 * down, 0, 0);
        k.turn('fl1R', -1.5 * up + 1.6 * down, 0, 0);
        k.turn('fl2R', 0.9 * up - 0.8 * down, 0, 0);
        k.turn('fl1L', 0.2, 0, 0);
        k.turn('earL', -0.4, 0, 0); k.turn('earR', -0.4, 0, 0);
        tailWave(0.3, 8);
      } else if (clip === 'play') {
        // Down on its front, batting at the strand with one paw and the other.
        k.move('root', 0, -0.06, 0);
        k.turn('body', 0.18, 0, 0);
        k.turn('chest', -0.3, 0, 0);
        k.turn('neck', -0.05, 0, 0);
        k.turn('head', 0.45, sway(0.25, 3), 0);
        const a = Math.max(0, Math.sin(T * 7)), b = Math.max(0, Math.sin(T * 7 + Math.PI));
        legs([['fl1L', -0.6 - a * 0.9], ['fl1R', -0.6 - b * 0.9], ['fl2L', 0.9 - a * 0.5], ['fl2R', 0.9 - b * 0.5]], [['hl1L', 0.45], ['hl1R', 0.45], ['hl2L', -0.4], ['hl2R', -0.4]]);
        k.turn('tail1', 1.3, 0, 0);
        tailWave(0.35, 5);
      }
      void speed;
    },
  };
}

/** Every coat's sculpt, by name (`cat-ginger`...), for the library to bake. */
export const CAT_DEFS = Object.fromEntries(Object.keys(COATS).map((c) => [`cat-${c}`, catDef(c)]));

/** How finely the cats in the house are meshed: half the grid of a close-up. */
export const BOARD_DETAIL = 0.75;
