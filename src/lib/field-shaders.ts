/* Simplex noise — Ashima Arts / Stefan Gustavson (MIT). */
export const snoise = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

/**
 * The substrate: a lattice of points in the XZ plane, displaced by noise,
 * viewed through a camera whose pitch is driven by scroll. Pitch > 0 looks
 * down on the surface, 0 collapses it into a single line, < 0 looks up at it
 * from underneath.
 */
export const fieldVertex = /* glsl */ `
precision highp float;
attribute vec3 aP;
attribute float aT; // position along a link (0 → 1); unused for points

uniform float uTime;
uniform float uAspect;
uniform float uPitch;
uniform float uCamY;
uniform float uDist;
uniform float uFocal;
uniform float uAmp;
uniform float uFreq;
uniform float uFlatten;
uniform float uDrift;
uniform float uPulse;
uniform float uVel;
uniform float uSize;
uniform float uAlpha;
uniform vec2 uSpan;
uniform vec2 uMouse;
uniform vec3 uFg;
uniform vec3 uAccent;
uniform vec3 uAccentLight;
uniform float uKind; // 0 lattice points, 1 selected nodes, 2 links between nodes
uniform vec2 uBlob; // atmospheric blob centre, NDC
uniform float uBlobR; // radius in NDC height units
uniform float uBlobI; // intensity

varying vec4 vCol;
varying vec3 vPulseCol;
varying float vKind;
varying float vT;
varying float vPhase;

${snoise}

void main() {
  vec3 p = vec3(aP.x * uSpan.x, 0.0, aP.y * uSpan.y);
  float t = uTime;

  vec2 q = p.xz * uFreq;
  float n1 = snoise(vec3(q.x, q.y + uDrift + t * 0.06, t * 0.09));
  float n2 = snoise(vec3(q.x * 2.4 + 11.0, (q.y + uDrift) * 2.4, t * 0.17));
  float h = n1 * 0.74 + n2 * 0.26;

  // Section-change pulse: a ring travelling outward from the origin.
  float rr = length(p.xz);
  float ringT = (1.0 - uPulse) * 3.2;
  h += uPulse * exp(-pow((rr - ringT) * 3.0, 2.0)) * 0.9;

  p.y = h * uAmp * (1.0 - uFlatten);

  float cp = cos(uPitch);
  float sp = sin(uPitch);
  vec3 v = vec3(p.x, p.y * cp - p.z * sp, p.y * sp + p.z * cp);
  float w = uDist - v.z;

  vec2 ndc = vec2(v.x * uFocal / uAspect, v.y * uFocal) / max(w, 0.05);
  ndc.y += uCamY;

  // Cursor: a soft lens in screen space that pushes points outward.
  vec2 d = ndc - uMouse;
  d.x *= uAspect;
  float r = length(d);
  float fall = exp(-(r * r) / 0.05);
  float ring = exp(-pow((r - 0.16 - uVel * 0.2) * 10.0, 2.0)) * uVel;
  vec2 push = (d / max(r, 1e-4)) * (fall * (0.03 + uVel * 0.1) + ring * 0.02);
  push.x /= uAspect;
  ndc += push;

  gl_Position = w < 0.15 ? vec4(4.0, 4.0, 0.0, 1.0) : vec4(ndc, 0.0, 1.0);

  float depth = clamp(1.6 / w, 0.0, 1.5);
  float edge = smoothstep(1.0, 0.7, abs(aP.x)) * smoothstep(1.0, 0.5, abs(aP.y));
  float crest = 0.45 + 0.55 * smoothstep(-0.7, 0.8, h);
  float flicker = 0.8 + 0.2 * sin(aP.z * 6.2831 + t * 0.9);

  gl_PointSize = uSize * (0.55 + depth * 0.65) * (1.0 + fall * 0.9);

  // the blob energises the lattice it passes over: brighter, slightly larger, faintly blue
  vec2 bd = ndc - uBlob;
  bd.x *= uAspect;
  float bf = exp(-dot(bd, bd) / max(uBlobR * uBlobR, 1e-4)) * uBlobI;
  gl_PointSize *= 1.0 + bf * 0.25;

  float heat = clamp(fall * (0.15 + uVel * 2.0) + ring * 1.2 + bf * 0.22, 0.0, 1.0);
  vec3 col = mix(uFg, uAccent, heat);
  float alpha = uAlpha * edge * crest * flicker * min(depth, 1.0) * (1.0 + fall * 0.8 + bf * 0.6);

  if (uKind > 0.5 && uKind < 1.5) {
    // selected nodes: a few lattice points carry the accent, breathing slowly
    col = mix(uAccent, uAccentLight, 0.5 + 0.5 * sin(t * 1.1 + aP.z * 40.0));
    alpha = min(1.0, alpha * 2.0);
    gl_PointSize *= 1.8;
  } else if (uKind > 1.5) {
    col = uAccent;
    alpha *= 0.5;
  }

  vCol = vec4(col, alpha);
  vPulseCol = uAccentLight;
  vKind = uKind;
  vT = aT;
  vPhase = fract(aP.z * 7.13);
}`;

export const fieldFragment = /* glsl */ `
precision mediump float;
uniform float uClock;
varying vec4 vCol;
varying vec3 vPulseCol;
varying float vKind;
varying float vT;
varying float vPhase;
void main() {
  if (vKind > 1.5) {
    // links: a short pulse of light travels along each connection
    float head = fract(uClock * 0.14 + vPhase);
    float pulse = smoothstep(0.09, 0.0, abs(vT - head));
    float a = vCol.a * (0.3 + pulse * 1.8);
    gl_FragColor = vec4(mix(vCol.rgb, vPulseCol, pulse) * a, 1.0);
    return;
  }
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.25, 0.04, dot(c, c));
  gl_FragColor = vec4(vCol.rgb * vCol.a * a, 1.0);
}`;
