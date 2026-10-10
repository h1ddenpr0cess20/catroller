/**
 * Spilt water, as a shader of its own (GLSL for WebGL 2, WGSL for WebGPU,
 * the same picture from each), on the same plan as Dungeon Roller's lava: a
 * shallow pool over the tiles, rippling, catching the lamplight in glints
 * that slide over it, with now and then a drip landing in it and a ring
 * going out. It lights itself.
 */

const GLSL_VERTEX = `varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const GLSL_FRAGMENT = `uniform float uTime;
varying vec3 vWorld;
float hash1(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec2 hash2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash1(i), hash1(i + vec2(1.0, 0.0)), u.x), mix(hash1(i + vec2(0.0, 1.0)), hash1(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main() {
  float t = uTime;
  vec2 p = vWorld.xz;
  // Two sets of ripples crossing, and a slow swell under them.
  float a = vnoise(p * 2.2 + vec2(t * 0.35, t * 0.22));
  float b = vnoise(p * 3.1 - vec2(t * 0.28, -t * 0.31));
  float swell = vnoise(p * 0.6 + t * 0.05);
  float h = a * 0.6 + b * 0.4;
  vec3 deep = vec3(0.18, 0.36, 0.48), shallow = vec3(0.52, 0.72, 0.82);
  vec3 col = mix(deep, shallow, 0.35 + 0.4 * swell + 0.25 * h);
  // Glints of the lamps: where the ripples crest.
  float glint = smoothstep(0.78, 0.92, h);
  col += vec3(1.0, 0.92, 0.75) * glint * 0.55;
  // A drip now and then: a ring going out.
  vec2 cell = floor(p * 0.7);
  float pick = hash1(cell);
  if (pick > 0.55) {
    vec2 at = (cell + 0.2 + 0.6 * hash2(cell + 3.0)) / 0.7;
    float phase = fract(t * (0.25 + pick * 0.2) + pick * 7.0);
    float r = phase * 0.6, d = length(p - at);
    float ring = (1.0 - smoothstep(0.0, 0.04, abs(d - r))) * (1.0 - phase);
    col += vec3(0.8, 0.9, 1.0) * ring * 0.5;
  }
  gl_FragColor = vec4(col, 1.0);
}`;

const WGSL = `struct Varyings { @builtin(position) position: vec4f, @location(0) world: vec3f };
@vertex fn vs(@location(0) position: vec3f) -> Varyings {
  var out: Varyings;
  let world = object.modelMatrix * vec4f(position, 1.0);
  out.world = world.xyz;
  out.position = object.projectionMatrix * object.viewMatrix * world;
  return out;
}
fn hash1(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(12.9898, 78.233))) * 43758.5453); }
fn hash2(p: vec2f) -> vec2f { return fract(sin(vec2f(dot(p, vec2f(127.1, 311.7)), dot(p, vec2f(269.5, 183.3)))) * 43758.5453); }
fn vnoise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash1(i), hash1(i + vec2f(1.0, 0.0)), u.x), mix(hash1(i + vec2f(0.0, 1.0)), hash1(i + vec2f(1.0, 1.0)), u.x), u.y);
}
@fragment fn fs(in: Varyings) -> @location(0) vec4f {
  let t = material.uTime;
  let p = in.world.xz;
  let a = vnoise(p * 2.2 + vec2f(t * 0.35, t * 0.22));
  let b = vnoise(p * 3.1 - vec2f(t * 0.28, -t * 0.31));
  let swell = vnoise(p * 0.6 + t * 0.05);
  let h = a * 0.6 + b * 0.4;
  let deep = vec3f(0.18, 0.36, 0.48);
  let shallow = vec3f(0.52, 0.72, 0.82);
  var col = mix(deep, shallow, 0.35 + 0.4 * swell + 0.25 * h);
  let glint = smoothstep(0.78, 0.92, h);
  col += vec3f(1.0, 0.92, 0.75) * glint * 0.55;
  let cell = floor(p * 0.7);
  let pick = hash1(cell);
  if (pick > 0.55) {
    let at = (cell + 0.2 + 0.6 * hash2(cell + 3.0)) / 0.7;
    let phase = fract(t * (0.25 + pick * 0.2) + pick * 7.0);
    let r = phase * 0.6;
    let d = length(p - at);
    let ring = (1.0 - smoothstep(0.0, 0.04, abs(d - r))) * (1.0 - phase);
    col += vec3f(0.8, 0.9, 1.0) * ring * 0.5;
  }
  return vec4f(col, 1.0);
}`;

/** The water's material; set `uniforms.uTime.value` each frame to keep it moving. */
export function createWaterMaterial(GFX) {
  return new GFX.ShaderMaterial({
    name: 'water',
    uniforms: { uTime: { value: 0 } },
    glsl: { vertex: GLSL_VERTEX, fragment: GLSL_FRAGMENT },
    wgsl: WGSL,
  });
}
