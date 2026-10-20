/**
 * The yarn ball on its own (yarn.html), in the Yarn character's studio: to
 * look at while working on it. Not part of the game.
 *
 *   (default)     Carol's ball on Carol's route, `s` metres along (?s=0.3)
 *   ?snag=1       the game's ball, caught at the start and rolled out along an S
 *   ?free=1       the game's ball rolling free
 */

import * as GFX from 'madness-engine/gfx';
import { createBall, TILE_METRES } from 'madness-engine/heroes/yarn/ball';
import { createYarn } from 'madness-engine/heroes/yarn/model';
import { rollSpin, turn } from 'madness-engine/physics';
import { createRenderer } from 'madness-engine/stage';

const params = new URLSearchParams(location.search);
const host = document.getElementById('view');
const renderer = await createRenderer(params.get('renderer') ?? 'webgl');
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = GFX.PCFShadowMap;
host.appendChild(renderer.domElement);
document.body.style.background = '#f3f2f2';

// The character's studio, as Carol lights it.
const scene = new GFX.Scene();
const camera = new GFX.PerspectiveCamera(45, 1, 0.01, 50);
scene.add(new GFX.HemisphereLight(0xffffff, 0xd8d2c4, 0.45));
const key = new GFX.DirectionalLight(0xffffff, 1.2);
key.position.set(2.4, 3.4, 3.2);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.bias = -0.0002;
key.shadow.normalBias = 0.0012;
Object.assign(key.shadow.camera, { left: -0.9, right: 0.9, top: 0.9, bottom: -0.9, near: 0.5, far: 20 });
key.shadow.camera.updateProjectionMatrix();
scene.add(key, key.target);
const fill = new GFX.DirectionalLight(0xfff4e6, 0.3);
fill.position.set(-5, 3, -4);
scene.add(fill, fill.target);
const ground = new GFX.Mesh(new GFX.PlaneGeometry(200, 200), new GFX.ShadowMaterial({ opacity: 0.18 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const game = params.has('snag') || params.has('free');
let tick = () => {};
const target = new GFX.Vector3(0, 0.09, 0);

if (!game) {
  const yarn = createYarn(GFX);
  scene.add(yarn.root);
  yarn.pose(Number(params.get('s') ?? 0));
  target.set(yarn.ball.position.x, 0.09, yarn.ball.position.z);
} else {
  // The game's ball, here in metres: the root back at metre scale, the ball's tiles turned to metres.
  const yarn = createBall(GFX, () => 0);
  yarn.root.scale.setScalar(1);
  scene.add(yarn.root);
  const T = TILE_METRES;
  const b = { x: 0, y: 0, z: 0, r: yarn.radius, vx: 0, vy: 0, vz: 0, nx: 0, ny: 1, nz: 0 };
  const q = [0, 0, 0, 1];
  const w = [0, 0, 0];
  const at = (u) => [(-0.45 + 0.9 * u) / T, (0.12 * Math.sin(u * Math.PI * 2)) / T];
  const snag = params.has('snag');
  let u = 0;
  const go = (dt) => {
    const [x, z] = at(u);
    b.vx = (x - b.x) / dt; b.vz = (z - b.z) / dt;
    b.x = x; b.z = z;
    b.r = yarn.radius;
    b.y = b.r;
    turn(q, rollSpin(b, w), dt);
    yarn.step(b, dt);
    yarn.pose(b, q);
  };
  [b.x, b.z] = at(0);
  if (snag) yarn.snag(b, q, { snap: 4 });
  const upTo = Number(params.get('u') ?? 0.6);
  for (let k = 1; k <= 300 * upTo; k++) { u = k / 300; go(1 / 60); }
  tick = (dt) => {
    if (!params.has('play')) return;
    u = Math.min(1, u + dt * 0.08);
    go(dt);
  };
  target.set(b.x * T, 0.09, b.z * T);
}

let last = performance.now();
let frames = 0;
renderer.setAnimationLoop((now) => {
  // ?still=1: a few frames and stop, for screenshots on a slow renderer.
  if (params.has('still') && ++frames > 3) { renderer.setAnimationLoop(null); return; }
  const dt = Math.min(0.05, (now - last) / 1000) || 1 / 60;
  last = now;
  tick(dt);
  const w = host.clientWidth || 1, h = host.clientHeight || 1;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  const half = Math.tan((camera.fov * Math.PI) / 360);
  const aspect = Math.max(camera.aspect || 1.6, 0.45);
  const distance = Math.max(0.75, 0.2 / (half * aspect)) * Number(params.get('dist') ?? 1);
  camera.position.copy(target).addScaledVector(new GFX.Vector3(1, 0.9, 1.25).normalize(), distance);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
});
globalThis.ready = true;
