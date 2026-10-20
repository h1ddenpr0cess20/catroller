/**
 * The screen, on the madness engine's stage (`madness-engine/stage`):
 * WebGPU where the browser has it and WebGL 2 where it does not, physically
 * based shading and shadows, and a perspective camera that starts at the
 * isometric corner, a little nearer than the arcade's, and can be turned,
 * tilted and zoomed round the ball (`views/close`).
 *
 * The lighting is a house at night: a warm wash from the rooms, a soft key
 * light from high up for the shadows, and real lights at the few lamps
 * nearest the ball.
 * Every other lamp is baked into the floors and walls (`house.js`). What the
 * glossy things reflect is a lamplit room (`textures/rooms/house`), and
 * outside is the night (`textures/skies/night`).
 */

import { createStage as createScreen } from 'madness-engine/stage';
import { paintRoom } from 'madness-engine/textures/rooms/house';
import { paintSky } from 'madness-engine/textures/skies/night';
import { createView } from 'madness-engine/views/close';

/** How far back the camera sits at zoom 1, and its lens. */
export const LENS = Object.freeze({ distance: 13, fov: 36 });

/** The house's light: a warm wash from the rooms and a soft key; how bright each is changes from room to room (`setLight`). */
export const LIGHTS = Object.freeze({
  hemisphere: { sky: '#ffe2c4', ground: '#3a2a22', intensity: 0.75 },
  key: { color: '#fff0dc', intensity: 1.15 },
  fill: null,
});

/** How many lamps near the ball get a real light. The count is fixed, so the shaders never change. */
const LAMP_LIGHTS = 4;

export async function createStage(host) {
  const stage = await createScreen(host, {
    lens: LENS,
    view: createView(),
    sky: paintSky(),
    backdrop: '#0d1024',
    room: paintRoom(),
    lights: LIGHTS,
    label: 'catroller',
  });
  const { GFX, scene, hemi, key } = stage;

  // The lamps nearest the ball.
  const lampLights = Array.from({ length: LAMP_LIGHTS }, () => {
    const light = new GFX.PointLight(0xffc27a, 0, 8, 1.6);
    scene.add(light);
    return light;
  });
  let lamps = [];

  Object.assign(stage, {
    /** Where the ball is, for the lamps; set every frame. */
    ball: new GFX.Vector3(),
    time: 0,
    /** The lamps of the level being played, as [x, y, z] bulbs. */
    setLamps(list) { lamps = list.map((at) => ({ at })); },
    /** How bright the house is: lower in the cellar. */
    setLight({ sky = LIGHTS.hemisphere.intensity, key: k = LIGHTS.key.intensity } = {}) {
      hemi.intensity = sky;
      key.intensity = k;
    },
  });

  /** The camera and the key light, as the engine points them, and the nearest lamps lit; once a frame. */
  const look = stage.look;
  stage.look = () => {
    look();
    // The nearest lamps get the real lights. There are only so many, so the furthest of them dims to nothing as
    // the next lamp out comes as near: when the two change places, the light goes over at no brightness at all,
    // and nothing flickers.
    const near = lamps
      .map((t) => ({ t, d: Math.hypot(t.at[0] - stage.ball.x, t.at[2] - stage.ball.z) }))
      .sort((a, b) => a.d - b.d);
    const next = near[LAMP_LIGHTS]?.d ?? Infinity;
    lampLights.forEach((light, i) => {
      const n = near[i];
      if (!n) { light.intensity = 0; return; }
      light.position.set(...n.t.at);
      const reach = Math.max(0, Math.min(1, (18 - n.d) / 6));
      const handover = Math.max(0, Math.min(1, (next - n.d) / 3));
      light.intensity = 9 * reach * handover;
    });
  };
  return stage;
}
