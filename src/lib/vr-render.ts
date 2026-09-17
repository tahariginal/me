import { palette, rgba } from "./theme";
import { EYE, shapes, waypoints, type Seg, type V3, type buildScene } from "./vr-scene";

export type Scene = ReturnType<typeof buildScene>;
export type Cam = { x: number; z: number; y: number; yaw: number; pitch: number };
export type Eye = { ox: number; oz: number; cx: number; cy: number; scale: number; x0: number; w: number; h: number };
export type FrameState = {
  cam: Cam;
  time: number;
  current: number;
  next: number;
  /** teleport arc progress 0..1, or -1 when not aiming */
  aim: number;
  dwell: number;
  dwellIndex: number;
  guides: boolean;
  /** waypoint currently under the reticle, or -1 */
  gaze: number;
  font: string;
};

const BARREL = 0.2;
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const fog = (d: number) => Math.max(0, Math.min(1, 1.25 - d / 16));

export const basis = (cam: Cam) => ({
  forward: [-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw)] as V3,
  right: [Math.cos(cam.yaw), 0, -Math.sin(cam.yaw)] as V3,
});

/** World → lens pixels, with barrel pre-distortion. Returns [x, y, depth] or null behind the eye. */
export function project(p: V3, cam: Cam, e: Eye): [number, number, number] | null {
  const { forward: f, right: r } = basis(cam);
  const dx = p[0] - (cam.x + e.ox);
  const dy = p[1] - cam.y;
  const dz = p[2] - (cam.z + e.oz);
  const xc = dx * r[0] + dz * r[2];
  const zf = dx * f[0] + dz * f[2];
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  const yc = dy * cp - zf * sp;
  const zc = dy * sp + zf * cp;
  if (zc < 0.08) return null;
  let sx = (xc / zc) * 1.15;
  let sy = (yc / zc) * 1.15;
  const k = 1 / (1 + BARREL * (sx * sx + sy * sy));
  sx *= k;
  sy *= k;
  return [e.cx + sx * e.scale, e.cy - sy * e.scale, zc];
}

/** Where the right-hand controller sits, and where it points. */
export function controller(cam: Cam, side = 1) {
  const { forward: f, right: r } = basis(cam);
  const base: V3 = [cam.x + r[0] * side * 0.16 + f[0] * 0.42, cam.y - 0.26, cam.z + r[2] * side * 0.16 + f[2] * 0.42];
  const tilt = cam.pitch - 0.18;
  const dir: V3 = [f[0] * Math.cos(tilt), Math.sin(tilt), f[2] * Math.cos(tilt)];
  const tip: V3 = [base[0] + dir[0] * 0.14, base[1] + dir[1] * 0.14, base[2] + dir[2] * 0.14];
  return { base, tip, dir, right: r };
}

export function drawEye(ctx: CanvasRenderingContext2D, e: Eye, f: FrameState, scene: Scene) {
  const { cam, time } = f;
  const dist = (p: V3) => Math.hypot(p[0] - cam.x, p[2] - cam.z);
  const polyline = (pts: V3[]) => {
    let pen = false;
    for (const p of pts) {
      const s = project(p, cam, e);
      if (!s) {
        pen = false;
        continue;
      }
      if (pen) ctx.lineTo(s[0], s[1]);
      else ctx.moveTo(s[0], s[1]);
      pen = true;
    }
  };
  const strokeSegs = (segs: Seg[], alpha: number, color: string = palette.fg) => {
    for (const [a, b] of segs) {
      const al = fog(Math.min(dist(a), dist(b))) * alpha;
      if (al <= 0.02) continue;
      const n = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) > 2 ? 14 : 4;
      const pts: V3[] = [];
      for (let i = 0; i <= n; i++) pts.push(lerp3(a, b, i / n));
      ctx.strokeStyle = rgba(color, al);
      ctx.beginPath();
      polyline(pts);
      ctx.stroke();
    }
  };
  const label = (p: V3, text: string, size: number, color: string, align: CanvasTextAlign = "center") => {
    const s = project(p, cam, e);
    if (!s) return null;
    const px = Math.max(7, Math.min(13, (size * e.scale) / s[2]));
    ctx.font = `${px.toFixed(1)}px ${f.font}`;
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.fillText(text.toUpperCase(), s[0], s[1]);
    return s;
  };

  const r = Math.min(e.w, e.h) * 0.2;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(e.x0, 0, e.w, e.h, r);
  ctx.clip();
  ctx.fillStyle = palette.bg;
  ctx.fillRect(e.x0, 0, e.w, e.h);
  ctx.lineWidth = 1;

  // floor grid
  for (const p of scene.floor) {
    const a = fog(dist(p));
    if (a <= 0.02) continue;
    const s = project(p, cam, e);
    if (!s) continue;
    ctx.fillStyle = rgba(palette.fg, a * 0.42);
    ctx.fillRect(s[0] - 0.75, s[1] - 0.75, 1.5, 1.5);
  }

  strokeSegs(scene.tiles, 0.12);
  strokeSegs(scene.lights, 0.18);
  strokeSegs(scene.segs, 0.7);

  // play-area outline, the way a headset marks safe space
  ctx.setLineDash([5, 7]);
  strokeSegs(scene.boundary, 0.42, palette.accentDeep);
  ctx.setLineDash([]);

  // signage over each doorway
  for (const sign of scene.signs) {
    const a = fog(dist(sign.pos));
    if (a > 0.1) label(sign.pos, sign.text, 0.1, rgba(palette.fg, a * 0.55));
  }

  // route guides: chevrons flowing from the current waypoint towards the next
  if (f.guides && f.aim < 0) {
    const from = waypoints[f.current];
    const to = waypoints[f.next];
    const len = Math.hypot(to.x - from.x, to.z - from.z) || 1;
    const d: [number, number] = [(to.x - from.x) / len, (to.z - from.z) / len];
    for (let k = 0; k < 6; k++) {
      const t = ((k + time * 0.9) % 6) / 6;
      const cx = from.x + (to.x - from.x) * (0.12 + t * 0.76);
      const cz = from.z + (to.z - from.z) * (0.12 + t * 0.76);
      const tip: V3 = [cx + d[0] * 0.14, 0.01, cz + d[1] * 0.14];
      const left: V3 = [cx - d[1] * 0.16, 0.01, cz + d[0] * 0.16];
      const right: V3 = [cx + d[1] * 0.16, 0.01, cz - d[0] * 0.16];
      ctx.strokeStyle = rgba(palette.accent, Math.sin(Math.PI * t) * 0.75 * fog(Math.hypot(cx - cam.x, cz - cam.z)));
      ctx.beginPath();
      polyline([left, tip, right]);
      ctx.stroke();
    }
  }

  // waypoints
  waypoints.forEach((w, i) => {
    if (i === f.current) return;
    const target = i === f.next;
    const rad = target ? 0.34 + Math.sin(time * 4) * 0.04 : 0.28;
    const ring: V3[] = [];
    for (let j = 0; j <= 28; j++) {
      const a = (j / 28) * Math.PI * 2;
      ring.push([w.x + Math.cos(a) * rad, 0.01, w.z + Math.sin(a) * rad]);
    }
    const a = fog(Math.hypot(w.x - cam.x, w.z - cam.z));
    const gazed = f.gaze === i;
    ctx.lineWidth = gazed ? 2 : 1;
    ctx.strokeStyle = gazed ? palette.accentLight : target ? palette.accent : rgba(palette.fg, a * 0.5);
    ctx.beginPath();
    polyline(ring);
    ctx.stroke();
    ctx.lineWidth = 1;
    if (gazed) label([w.x, 0.3, w.z], "teleport", 0.1, palette.accentLight);
    else if (f.guides && a > 0.15) label([w.x, 0.02, w.z + rad + 0.25], String(i + 1).padStart(2, "0"), 0.09, target ? palette.accent : rgba(palette.fg, a * 0.6));
  });

  // exhibits: slowly turning wireframes above their pedestals, with a hotspot marker
  scene.exhibits.forEach((ex, i) => {
    const a = fog(dist(ex.pos));
    if (a <= 0.05) return;
    const focused = f.dwellIndex === i && f.dwell > 0.02;
    const bob = Math.sin(time * 1.2 + i * 2) * 0.03;
    const ry = time * 0.5 + i;
    const rx = 0.45;
    const place = (v: V3): V3 => {
      const x1 = v[0] * Math.cos(ry) + v[2] * Math.sin(ry);
      const z1 = -v[0] * Math.sin(ry) + v[2] * Math.cos(ry);
      const y2 = v[1] * Math.cos(rx) - z1 * Math.sin(rx);
      const z2 = v[1] * Math.sin(rx) + z1 * Math.cos(rx);
      return [ex.pos[0] + x1 * 0.22, ex.pos[1] + bob + y2 * 0.22, ex.pos[2] + z2 * 0.22];
    };
    ctx.strokeStyle = focused ? rgba(palette.accentLight, 0.95) : rgba(palette.fg, a * 0.85);
    ctx.beginPath();
    for (const [p, q] of shapes[ex.kind]) polyline([place(p), place(q)]);
    ctx.stroke();

    const m = project([ex.pos[0], ex.pos[1] + 0.42 + bob, ex.pos[2]], cam, e);
    if (m) {
      const z = 4;
      ctx.strokeStyle = rgba(palette.accentLight, 0.9 * a);
      ctx.beginPath();
      ctx.moveTo(m[0], m[1] - z);
      ctx.lineTo(m[0] + z, m[1]);
      ctx.lineTo(m[0], m[1] + z);
      ctx.lineTo(m[0] - z, m[1]);
      ctx.closePath();
      ctx.stroke();
    }

    // world-space info panel once the gaze has dwelled long enough
    if (f.dwellIndex === i && f.dwell >= 1) {
      const open = Math.min(1, (f.dwell - 1) * 5);
      const { right } = basis(cam);
      const c: V3 = [ex.pos[0], ex.pos[1] + 0.85, ex.pos[2]];
      const hw = 0.55 * open;
      const hh = 0.22;
      const corner = (sx: number, sy: number): V3 => [c[0] + right[0] * hw * sx, c[1] + hh * sy, c[2] + right[2] * hw * sx];
      const pts = [corner(-1, 1), corner(1, 1), corner(1, -1), corner(-1, -1)].map((p) => project(p, cam, e));
      if (pts.every(Boolean)) {
        ctx.beginPath();
        pts.forEach((p, k) => (k ? ctx.lineTo(p![0], p![1]) : ctx.moveTo(p![0], p![1])));
        ctx.closePath();
        ctx.fillStyle = rgba(palette.bg, 0.88);
        ctx.fill();
        ctx.strokeStyle = rgba(palette.accent, 0.9);
        ctx.stroke();
        if (open > 0.9) {
          label(corner(-0.86, 0.3), ex.title, 0.1, palette.fg, "left");
          ex.lines.forEach((line, k) => label(corner(-0.86, -0.15 - k * 0.42), line, 0.075, rgba(palette.fg, 0.6), "left"));
        }
      }
    }
  });

  // the left hand holds a controller too, without a ray
  const left = controller(cam, -1);
  const lb: V3 = [left.base[0] - left.dir[0] * 0.06, left.base[1] - left.dir[1] * 0.06, left.base[2] - left.dir[2] * 0.06];
  const lside = (p: V3, s: number): V3 => [p[0] + left.right[0] * 0.018 * s, p[1], p[2] + left.right[2] * 0.018 * s];
  ctx.strokeStyle = rgba(palette.fg, 0.5);
  ctx.beginPath();
  polyline([lside(lb, -1), lside(left.tip, -1), lside(left.tip, 1), lside(lb, 1), lside(lb, -1)]);
  ctx.stroke();

  // right controller, with a pointer ray or the teleport arc
  const ctl = controller(cam);
  const back: V3 = [ctl.base[0] - ctl.dir[0] * 0.06, ctl.base[1] - ctl.dir[1] * 0.06, ctl.base[2] - ctl.dir[2] * 0.06];
  const side = (p: V3, s: number): V3 => [p[0] + ctl.right[0] * 0.018 * s, p[1], p[2] + ctl.right[2] * 0.018 * s];
  ctx.strokeStyle = rgba(palette.fg, 0.75);
  ctx.beginPath();
  polyline([side(back, -1), side(ctl.tip, -1), side(ctl.tip, 1), side(back, 1), side(back, -1)]);
  const ring: V3[] = [];
  for (let j = 0; j <= 16; j++) {
    const a = (j / 16) * Math.PI * 2;
    ring.push([ctl.tip[0] + ctl.right[0] * Math.cos(a) * 0.045, ctl.tip[1] + Math.sin(a) * 0.045, ctl.tip[2] + ctl.right[2] * Math.cos(a) * 0.045]);
  }
  polyline(ring);
  ctx.stroke();

  if (f.aim >= 0) {
    const to = waypoints[f.next];
    ctx.fillStyle = palette.accentLight;
    for (let i = 0; i <= 30 * f.aim; i++) {
      const t = i / 30;
      const p = lerp3(ctl.tip, [to.x, 0, to.z], t);
      p[1] += Math.sin(Math.PI * t) * 1.1;
      const s = project(p, cam, e);
      if (s) ctx.fillRect(s[0] - 1, s[1] - 1, 2, 2);
    }
  } else {
    const reach = ctl.dir[1] < -0.02 ? Math.min(6, -ctl.tip[1] / ctl.dir[1]) : 6;
    const end: V3 = [ctl.tip[0] + ctl.dir[0] * reach, ctl.tip[1] + ctl.dir[1] * reach, ctl.tip[2] + ctl.dir[2] * reach];
    ctx.strokeStyle = rgba(palette.accentLight, 0.35);
    ctx.beginPath();
    polyline([ctl.tip, lerp3(ctl.tip, end, 0.5), end]);
    ctx.stroke();
    const s = project(end, cam, e);
    if (s) {
      ctx.fillStyle = rgba(palette.accentLight, 0.8);
      ctx.fillRect(s[0] - 1.5, s[1] - 1.5, 3, 3);
    }
  }

  // gaze reticle and dwell progress
  ctx.strokeStyle = rgba(palette.fg, 0.85);
  ctx.beginPath();
  ctx.arc(e.cx, e.cy, 5, 0, Math.PI * 2);
  ctx.stroke();
  if (f.dwell > 0.02) {
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(e.cx, e.cy, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, f.dwell));
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  // lens vignette and rim
  const g = ctx.createRadialGradient(e.cx, e.cy, Math.min(e.w, e.h) * 0.25, e.cx, e.cy, Math.max(e.w, e.h) * 0.62);
  g.addColorStop(0, rgba(palette.bg, 0));
  g.addColorStop(1, rgba(palette.bg, 0.92));
  ctx.fillStyle = g;
  ctx.fillRect(e.x0, 0, e.w, e.h);
  ctx.restore();
  ctx.strokeStyle = rgba(palette.fg, 0.18);
  ctx.beginPath();
  ctx.roundRect(e.x0 + 0.5, 0.5, e.w - 1, e.h - 1, r);
  ctx.stroke();
}
