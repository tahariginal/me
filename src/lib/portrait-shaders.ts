import { snoise } from "./field-shaders";

/**
 * Portrait as a TouchDesigner-style network, in shader form:
 *   moviefilein → luma to depth → noise → instance (points) ─┐
 *   binary (0/1 wall behind the head) ───────────────────────┴→ feedback → out
 *
 * Shared projection: both layers use the same yaw/pitch and focal length, so
 * the binary wall parallaxes behind the head as it turns.
 */
const project = /* glsl */ `
vec3 orbit(vec3 p, float yaw, float pitch) {
  float cy = cos(yaw);
  float sy = sin(yaw);
  p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
  float cx = cos(pitch);
  float sx = sin(pitch);
  return vec3(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx);
}
vec2 toNdc(vec3 p, float aspect) {
  return vec2(p.x / aspect, p.y) * 3.05 / (2.2 - p.z);
}`;

export const pointsVertex = /* glsl */ `
precision highp float;
attribute vec4 aData; // u, v, luma, seed
attribute float aFade; // edge fade, also gates the silhouette pass

uniform float uTime;
uniform float uAspect;
uniform float uAssemble;
uniform float uDepth;
uniform float uYaw;
uniform float uPitch;
uniform float uSize;
uniform float uHover;
uniform float uVel;
uniform float uOcclude; // 1: silhouette pass that hides the binary wall behind the head
uniform vec2 uMouse;
uniform vec3 uFg;
uniform vec3 uAccent;
uniform vec3 uAccentLight;

varying vec4 vCol;

${snoise}
${project}

void main() {
  float u = aData.x;
  float v = aData.y;
  float l = aData.z;
  float s = aData.w;
  float t = uTime;

  // luma → depth
  vec3 face = vec3((u - 0.5) * 0.8, 0.5 - v, (l - 0.45) * uDepth);

  // substrate plane the points rise from
  vec3 plane = vec3((u - 0.5) * 2.4, -0.82 + snoise(vec3(u * 3.0, v * 3.0, t * 0.1)) * 0.035, (v - 0.5) * 1.6);
  float a = clamp(uAssemble * 1.8 - s * 0.7, 0.0, 1.0);
  a = a * a * (3.0 - 2.0 * a);

  // cursor disturbance, measured where the point would land without noise
  vec2 d = toNdc(orbit(mix(plane, face, a), uYaw, uPitch), uAspect) - uMouse;
  d.x *= uAspect;
  float fall = exp(-dot(d, d) / 0.03) * uHover;

  vec3 q = vec3(face.xy * 3.2, t * 0.14);
  face += vec3(snoise(q), snoise(q + 17.1), snoise(q + 31.7)) * ((0.0025 + 0.005 * (1.0 - l)) + fall * (0.05 + uVel * 0.08));

  float band = floor(v * 42.0);
  float tick = floor(t * 1.2);
  float glitch = step(0.982, fract(sin(band * 12.9898 + tick * 78.233) * 43758.5453));
  face.x += glitch * 0.028 * sign(sin(band * 3.1 + tick));

  vec3 p = orbit(mix(plane, face, a), uYaw, uPitch);
  vec2 ndc = toNdc(p, uAspect) + (d / max(length(d), 1e-4)) * fall * 0.012 * vec2(1.0 / uAspect, 1.0);
  gl_Position = vec4(ndc, 0.0, 1.0);
  gl_PointSize = uSize * (2.2 / (2.2 - p.z));

  if (uOcclude > 0.5) {
    gl_PointSize *= aFade > 0.35 && a > 0.5 ? 1.45 : 0.0;
    vCol = vec4(0.0);
    return;
  }

  float lum = mix(0.55, l, a);
  gl_PointSize *= 0.18 + lum * 0.95;

  vec3 col = mix(uFg, uAccent, clamp(fall * (0.35 + uVel * 2.5), 0.0, 1.0));

  // a handful of points stay lit in blue — nodes in the network the face is built from
  float node = step(0.994, s) * a;
  col = mix(col, uAccentLight, node * 0.85);
  gl_PointSize *= 1.0 + node * 0.6;

  vCol = vec4(col, (0.08 + lum * 0.92) * mix(0.3, 1.0, a));
}`;

export const pointsFragment = /* glsl */ `
precision mediump float;
varying vec4 vCol;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.25, 0.05, dot(c, c));
  gl_FragColor = vec4(vCol.rgb * vCol.a * a, 1.0);
}`;

/**
 * binary1: a wall of 0/1 glyphs set behind the head. Columns drift down at
 * their own pace, bright streams run through them, bits flip — faster near
 * the cursor, which also warms them to blue.
 */
export const binaryVertex = /* glsl */ `
precision highp float;
attribute vec3 aCell; // column, row, seed

uniform float uTime;
uniform float uAspect;
uniform float uYaw;
uniform float uPitch;
uniform float uCols;
uniform float uRows;
uniform float uSize;
uniform float uHover;
uniform float uReveal;
uniform vec2 uMouse;

varying float vGlyph;
varying float vAlpha;
varying float vBlue;

float hash(float n) { return fract(sin(n) * 43758.5453123); }
${project}

void main() {
  float col = aCell.x;
  float row = aCell.y;
  float s = aCell.z;
  float cs = hash(col * 12.9898 + 3.1);

  float y = mod(row + uTime * (0.25 + cs * 0.6), uRows);
  vec3 p = vec3((col / (uCols - 1.0) - 0.5) * 2.3, (0.5 - y / uRows) * 2.7, -0.7);
  // lift the wall slightly behind the head as it turns, for parallax
  vec2 ndc = toNdc(orbit(p, uYaw * 0.8, uPitch * 0.8), uAspect);
  gl_Position = vec4(ndc, 0.0, 1.0);
  gl_PointSize = uSize;

  float head = mod(uTime * (4.0 + cs * 9.0) + cs * 211.0, uRows * 1.7);
  float dist = head - y;
  float tail = dist >= 0.0 && dist < 16.0 ? 1.0 - dist / 16.0 : 0.0;
  float isHead = 1.0 - step(0.6, abs(dist));

  vec2 dm = ndc - uMouse;
  dm.x *= uAspect;
  float near = exp(-dot(dm, dm) / 0.05) * uHover;

  float rate = 0.8 + s * 2.0 + near * 14.0;
  vGlyph = step(0.5, hash(col * 7.13 + row * 13.37 + floor(uTime * rate + s * 10.0)));

  float edge = smoothstep(1.02, 0.7, abs(ndc.x)) * smoothstep(1.02, 0.75, abs(ndc.y));
  vAlpha = (0.06 + tail * tail * 0.32 + isHead * 0.5 + near * 0.35) * edge * uReveal;
  vBlue = clamp(isHead * step(0.62, cs) + step(0.988, hash(s * 91.7 + floor(uTime * 0.7))) + near * 0.8, 0.0, 1.0);
}`;

export const binaryFragment = /* glsl */ `
precision mediump float;
uniform sampler2D uAtlas;
uniform vec3 uFg;
uniform vec3 uAccent;
varying float vGlyph;
varying float vAlpha;
varying float vBlue;
void main() {
  float a = texture2D(uAtlas, vec2((gl_PointCoord.x + vGlyph) * 0.5, gl_PointCoord.y)).a * vAlpha;
  gl_FragColor = vec4(mix(uFg, uAccent, vBlue) * a, 1.0);
}`;

export const quadVertex = /* glsl */ `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

/** feedback TOP: keep the brighter of this frame and the decaying, drifting past. */
export const feedbackFragment = /* glsl */ `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uCur;
uniform sampler2D uPrev;
uniform float uDecay;
void main() {
  vec3 cur = texture2D(uCur, vUv).rgb;
  vec2 uv = (vUv - 0.5) * 0.996 + 0.5 - vec2(0.0, 0.0016);
  vec3 prev = max(texture2D(uPrev, uv).rgb * uDecay - 2.0 / 255.0, 0.0);
  gl_FragColor = vec4(max(cur, prev), 1.0);
}`;

/** out TOP: soft tone-map onto the page ground, with a faint scanline. */
export const outFragment = /* glsl */ `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec3 uBg;
uniform vec2 uRes;
void main() {
  vec3 c = texture2D(uTex, vUv).rgb;
  c = 1.0 - exp(-c * 1.6);
  float scan = 0.94 + 0.06 * sin(vUv.y * uRes.y * 1.5708);
  gl_FragColor = vec4(uBg + c * scan, 1.0);
}`;
