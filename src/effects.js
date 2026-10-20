import { createEffects as createBits } from 'madness-engine/effects';

/**
 * Bits that fly, on the engine's (`madness-engine/effects`): a glitter for
 * buttons and skeins, a burst of buttons out of a tin, wisps of wool off the
 * ball when a cat swats it, drops of water when it goes in a spill, dust
 * when the vacuum has it. Each bit is ballistic, bounces off the floor or
 * settles on it, and shrinks away.
 */
export function createEffects(GFX, scene) {
  const bits = createBits(GFX, scene);

  const mote = new GFX.SphereGeometry(0.035, 6, 4);
  const glows = new Map();
  const glow = (colour) => {
    if (!glows.has(colour)) glows.set(colour, new GFX.MeshBasicMaterial({ name: 'glow', color: new GFX.Color(colour), toneMapped: false }));
    return glows.get(colour);
  };
  const coin = new GFX.CylinderGeometry(0.06, 0.06, 0.02, 12);
  const buttonCache = new Map();
  const buttonMats = (colour) => {
    if (!buttonCache.has(colour)) buttonCache.set(colour, new GFX.MeshPhysicalMaterial({ name: 'button', color: new GFX.Color(colour), roughness: 0.3, clearcoat: 0.8 }));
    return buttonCache.get(colour);
  };
  // Wisps of wool, and drops of water: lit like everything else, not glowing.
  const fibre = new GFX.CylinderGeometry(0.008, 0.006, 0.12, 4);
  const wool = new GFX.MeshStandardMaterial({ name: 'fluff', color: new GFX.Color('#c8281a'), roughness: 1 });
  const drop = new GFX.SphereGeometry(0.03, 8, 6);
  const water = new GFX.MeshPhysicalMaterial({ name: 'drop', color: new GFX.Color('#8ab8d0'), roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.7 });
  const grit = new GFX.BoxGeometry(0.05, 0.05, 0.05);
  const dirt = new GFX.MeshStandardMaterial({ name: 'grit', color: new GFX.Color('#8a8276'), roughness: 1 });
  const BUTTONS = ['#e8d8b0', '#2a4a8a', '#b8322a', '#2e6a3a', '#d8a020', '#7a3a8a'];

  return {
    /** The house the bits land in (anything with `heightAt`), and the bits of the last one gone. */
    setHouse(house) {
      bits.setGround(house);
      bits.clear();
    },

    sparkle(x, y, z, colour = '#ff5a7a') {
      bits.burst({ at: [x, y + 0.3, z], count: 18, mesh: () => new GFX.Mesh(mote, glow(colour)), speed: 1.2, up: 3, life: 0.7, lifeSpread: 0.5, floaty: -0.1, drag: 1.5, bounce: 0 });
    },

    dust(x, y, z) {
      bits.burst({ at: [x, y + 0.05, z], count: 14, mesh: () => new GFX.Mesh(grit, dirt), speed: 2.5, up: 2.5, life: 0.5, lifeSpread: 0.4, spin: 12, bounce: 0.3 });
    },

    /** Fluff off the ball: a cat's swat. */
    tuft(x, y, z) {
      bits.burst({ at: [x, y, z], count: 8, mesh: () => new GFX.Mesh(fibre, wool), scale: [0.7, 1.3], speed: 1.2, up: 1.6, life: 0.6, lifeSpread: 0.5, floaty: 0.25, drag: 2.5, spin: 6, bounce: 0 });
    },

    /** A splash of water. */
    splash(x, y, z) {
      bits.burst({ at: [x, y + 0.05, z], count: 26, mesh: () => new GFX.Mesh(drop, water), scale: [0.6, 1.4], speed: 2.4, up: 5, life: 0.6, lifeSpread: 0.4, bounce: 0 });
    },

    /** Buttons flying out of a tin. */
    buttons(x, y, z, n = 14) {
      bits.burst({ at: [x, y + 0.2, z], count: n, mesh: (i) => new GFX.Mesh(coin, buttonMats(BUTTONS[i % BUTTONS.length])), scale: [1.3, 1.3], speed: 2.2, up: 6, life: 1.1, lifeSpread: 0.5, spin: 14, bounce: 0.4 });
    },

    update: bits.update,
  };
}
