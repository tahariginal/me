"use client";

import { useEffect, useRef } from "react";
import { energy } from "@/lib/energy";
import { fieldFragment, fieldVertex } from "@/lib/field-shaders";
import { createProgram, hexToRgb, isLowPower, prefersReducedMotion, uniforms } from "@/lib/gl";
import { palette } from "@/lib/theme";

type State = {
  pitch: number;
  camY: number;
  dist: number;
  amp: number;
  freq: number;
  flatten: number;
  alpha: number;
  /** blob resting place (viewport fraction), radius (fraction of the short side), intensity */
  bx: number;
  by: number;
  br: number;
  bi: number;
};
type Keyframe = { id: string; from: State; to?: Partial<State> };

const base: State = {
  pitch: 0.36, camY: -0.2, dist: 2.5, amp: 0.34, freq: 0.85, flatten: 0, alpha: 0.62,
  bx: 0.72, by: 0.5, br: 0.27, bi: 1,
};

/**
 * One camera move per section. `to` values are reached by the end of the
 * section, so long sections travel (the manifesto dives through the surface).
 */
const keyframes: Keyframe[] = [
  { id: "index", from: base, to: { pitch: 0.28, camY: -0.1 } },
  {
    id: "surface",
    from: { ...base, pitch: 0.2, camY: 0, amp: 0.26, alpha: 0.8, bx: 0.5, by: 0.5, br: 0.3, bi: 0.7 },
    to: { pitch: -0.2, camY: 0 },
  },
  {
    id: "work",
    from: { ...base, pitch: -0.34, camY: 0.62, dist: 2.9, amp: 0.3, freq: 1.05, alpha: 0.32, bx: 0.3, by: 0.56, br: 0.28, bi: 0.55 },
    to: { pitch: -0.5, camY: 0.5 },
  },
  {
    id: "experience",
    from: { ...base, pitch: -0.72, camY: 0.1, dist: 3.1, amp: 0.22, freq: 1.4, alpha: 0.3, bx: 0.74, by: 0.46, br: 0.24, bi: 0.45 },
  },
  {
    id: "system",
    from: { ...base, pitch: 1.18, camY: 0.1, dist: 3.3, amp: 0.1, freq: 1.7, flatten: 0.55, alpha: 0.26, bx: 0.62, by: 0.5, br: 0.26, bi: 0.4 },
  },
  { id: "about", from: { ...base, pitch: 0.16, camY: -0.52, dist: 2.7, amp: 0.2, alpha: 0.34, bx: 0.28, by: 0.5, br: 0.3, bi: 0.85 } },
  { id: "contact", from: { ...base, pitch: 0.46, camY: -0.12, dist: 2.2, amp: 0.4, alpha: 0.66, bx: 0.5, by: 0.62, br: 0.36, bi: 0.95 } },
];

const KEYS = ["pitch", "camY", "dist", "amp", "freq", "flatten", "alpha", "bx", "by", "br", "bi"] as const;
const U = [
  "uTime", "uAspect", "uPitch", "uCamY", "uDist", "uFocal", "uAmp", "uFreq", "uFlatten",
  "uDrift", "uPulse", "uVel", "uSize", "uAlpha", "uSpan", "uMouse", "uFg", "uAccent",
  "uAccentLight", "uKind", "uClock", "uBlob", "uBlobR", "uBlobI",
] as const;

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Lattice with every other row/column first, so drawing only `coarse` points still yields an even grid. */
function buildLattice(cols: number, rows: number) {
  const coarse = Math.ceil(cols / 2) * Math.ceil(rows / 2);
  const total = cols * rows;
  const data = new Float32Array(total * 3);
  let c = 0;
  let f = coarse;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const o = (i % 2 === 0 && j % 2 === 0 ? c++ : f++) * 3;
      data[o] = (i / (cols - 1)) * 2 - 1;
      data[o + 1] = (j / (rows - 1)) * 2 - 1;
      data[o + 2] = Math.random();
    }
  }
  return { data, coarse, total };
}

/**
 * A sparse constellation of lattice positions joined by short links. Links are
 * subdivided so they ride the displaced surface; `t` runs 0 → 1 along each one
 * so the fragment shader can send a pulse of light across it.
 */
function buildNetwork(cols: number, rows: number, count: number) {
  const nodes: [number, number, number][] = [];
  for (let guard = 0; nodes.length < count && guard < count * 30; guard++) {
    const x = (Math.floor(Math.random() * cols) / (cols - 1)) * 2 - 1;
    const z = (Math.floor(Math.random() * rows) / (rows - 1)) * 2 - 1;
    if (Math.abs(x) > 0.82 || Math.abs(z) > 0.78) continue;
    if (nodes.some(([nx, nz]) => Math.hypot((nx - x) * 1.3, nz - z) < 0.09)) continue;
    nodes.push([x, z, Math.random()]);
  }

  const SEG = 8;
  const seen = new Set<string>();
  const links: number[] = [];
  nodes.forEach(([x, z], a) => {
    nodes
      .map(([nx, nz], b) => ({ b, d: Math.hypot((nx - x) * 1.3, nz - z) }))
      .filter((n) => n.b !== a && n.d < 0.32)
      .sort((p, q) => p.d - q.d)
      .slice(0, 2)
      .forEach(({ b }) => {
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (seen.has(key)) return;
        seen.add(key);
        const [bx, bz] = nodes[b];
        const phase = Math.random();
        for (let k = 0; k < SEG; k++) {
          for (const t of [k / SEG, (k + 1) / SEG]) links.push(x + (bx - x) * t, z + (bz - z) * t, phase, t);
        }
      });
  });

  return { nodes: new Float32Array(nodes.flat()), nodeCount: nodes.length, links: new Float32Array(links), linkVerts: links.length / 4 };
}

export default function Field() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let dispose: (() => void) | undefined;
    const boot = () => {
      dispose = start(canvas);
    };
    // The field is atmosphere, not content: start it once the page has settled.
    const ric = "requestIdleCallback" in window;
    const id = ric ? window.requestIdleCallback(boot, { timeout: 1200 }) : window.setTimeout(boot, 300);
    return () => {
      if (ric) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
      dispose?.();
    };
  }, []);

  return (
    <>
      <canvas
        ref={ref}
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-lvh w-full opacity-0 transition-opacity duration-[1600ms] data-[ready]:opacity-100"
      />
      <canvas id="atmosphere" aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[1] h-lvh w-full" />
    </>
  );
}

function start(canvas: HTMLCanvasElement): (() => void) | undefined {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
  });
  if (!gl) return;
  const prog = createProgram(gl, fieldVertex, fieldFragment);
  if (!prog) return;

  const reduced = prefersReducedMotion();
  const low = isLowPower();
  const lattice = low ? buildLattice(124, 86) : buildLattice(250, 170);
  let drawCount = lattice.total;
  let dprCap = low ? 1.5 : 1.75;
  const minFrame = low ? 1000 / 32 : 0;

  const network = low ? buildNetwork(124, 86, 34) : buildNetwork(250, 170, 64);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, lattice.data, gl.STATIC_DRAW);
  const nodesBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nodesBuf);
  gl.bufferData(gl.ARRAY_BUFFER, network.nodes, gl.STATIC_DRAW);
  const linksBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, linksBuf);
  gl.bufferData(gl.ARRAY_BUFFER, network.links, gl.STATIC_DRAW);

  gl.useProgram(prog);
  const aP = gl.getAttribLocation(prog, "aP");
  const aT = gl.getAttribLocation(prog, "aT");
  gl.enableVertexAttribArray(aP);
  const u = uniforms(gl, prog, U);

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.clearColor(12 / 255, 12 / 255, 11 / 255, 1);
  gl.uniform3fv(u.uFg, hexToRgb(palette.fg));
  gl.uniform3fv(u.uAccent, hexToRgb(palette.accent));
  gl.uniform3fv(u.uAccentLight, hexToRgb(palette.accentLight));

  // Atmosphere: a tiny Canvas 2D (1/8 of the viewport) stretched by CSS over the
  // lattice. The haze is soft by nature, so the compositor's upscale is the blur.
  const atmos = document.getElementById("atmosphere") as HTMLCanvasElement | null;
  const actx = atmos?.getContext("2d") ?? null;
  const SCALE = low ? 10 : 8;
  const rgb = (hex: string) => hexToRgb(hex).map((c) => Math.round(c * 255)).join(",");
  const deep = rgb(palette.accentDeep);
  const bright = rgb(palette.accent);

  // ---- geometry ---------------------------------------------------------
  let W = 0;
  let H = 0;
  let dpr = 1;

  type Box = { top: number; bottom: number; kf: Keyframe };
  let boxes: Box[] = [];
  const measure = () => {
    const y = window.scrollY;
    boxes = keyframes.flatMap((kf) => {
      const el = document.getElementById(kf.id);
      if (!el) return [];
      const r = el.getBoundingClientRect();
      return [{ top: r.top + y, bottom: r.bottom + y, kf }];
    });
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (atmos) {
      atmos.width = Math.max(8, Math.ceil(W / SCALE));
      atmos.height = Math.max(8, Math.ceil(H / SCALE));
    }
    measure();
  };

  // ---- input ------------------------------------------------------------
  const mouse = { x: 9, y: 9, tx: 9, ty: 9, vel: 0 };
  let lastMove = 0;
  const onPointer = (e: PointerEvent | Touch) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -((e.clientY / window.innerHeight) * 2 - 1);
    if (mouse.tx < 5) {
      mouse.vel = Math.min(1, mouse.vel + Math.hypot(nx - mouse.tx, ny - mouse.ty) * 2.2);
    } else {
      mouse.x = nx;
      mouse.y = ny;
    }
    mouse.tx = nx;
    mouse.ty = ny;
    energy.px = e.clientX;
    energy.py = e.clientY;
    lastMove = performance.now();
  };
  const onPointerMove = (e: PointerEvent) => e.pointerType === "mouse" && onPointer(e);
  const onTouch = (e: TouchEvent) => e.touches[0] && onPointer(e.touches[0]);
  const onLeave = () => {
    mouse.tx = 9;
    mouse.ty = 9;
  };

  let scrollY = window.scrollY;
  let lastScroll = scrollY;
  let drift = 0;
  let driftVel = 0;
  const onScroll = () => {
    scrollY = window.scrollY;
  };

  let pulse = 0;
  const onPulse = () => {
    pulse = 1;
  };

  // ---- blob: a soft body with inertia, a trail, and hover attraction -----
  const blob = { x: -1, y: -1, vx: 0, vy: 0, r: 0, stretch: 0, i: 0 };
  const trail: [number, number][] = [
    [0, 0],
    [0, 0],
    [0, 0],
  ];
  let hoverEl: Element | null = null;
  let hoverAmt = 0;
  const onOver = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    hoverEl = (e.target as Element).closest?.("a, button, [data-energy]") ?? null;
  };
  const tracker = document.getElementById("blob-tracker");
  const trackerLabel = tracker?.querySelector<HTMLElement>("[data-blob-label]") ?? null;

  const stepBlob = (dt: number, now: number, ds: number) => {
    const s = Math.min(W, H);
    const anchorX = cur.bx * W + Math.sin(time * 0.13) * s * 0.04;
    const anchorY = cur.by * H + Math.cos(time * 0.11) * s * 0.03;
    const active = mouse.tx < 5 && now - lastMove < 2600;
    let tx = active ? energy.px : anchorX;
    let ty = active ? energy.py : anchorY;
    if (hoverEl && active) {
      const r = hoverEl.getBoundingClientRect();
      tx += (r.left + r.width / 2 - tx) * 0.35;
      ty += (r.top + r.height / 2 - ty) * 0.35;
    }
    hoverAmt += ((hoverEl && active ? 1 : 0) - hoverAmt) * (1 - Math.exp(-dt * 6));

    if (blob.x < 0) {
      blob.x = tx;
      blob.y = ty;
      trail.forEach((p) => ((p[0] = tx), (p[1] = ty)));
    }
    // Under-damped spring: follows with lag and a little elastic overshoot.
    blob.vx += ((tx - blob.x) * 26 - blob.vx * 8.5) * dt;
    blob.vy += ((ty - blob.y) * 26 - blob.vy * 8.5) * dt;
    blob.y -= ds * 0.3; // scrolling drags the field, the spring brings it back
    blob.x += blob.vx * dt;
    blob.y += blob.vy * dt;

    const speed = Math.hypot(blob.vx, blob.vy);
    blob.stretch += (Math.min(0.9, speed / 1400) - blob.stretch) * (1 - Math.exp(-dt * 5));
    [9, 5.5, 3.5].forEach((rate, i) => {
      const src = i === 0 ? [blob.x, blob.y] : trail[i - 1];
      const f = 1 - Math.exp(-dt * rate);
      trail[i][0] += (src[0] - trail[i][0]) * f;
      trail[i][1] += (src[1] - trail[i][1]) * f;
    });

    const rTarget = cur.br * s * (low ? 0.8 : 1) * (1 + hoverAmt * 0.18 + pulse * 0.25) * (1 - blob.stretch * 0.15);
    blob.r += (rTarget - blob.r) * (1 - Math.exp(-dt * 3));
    blob.i += (cur.bi * (low ? 0.75 : 1) - blob.i) * (1 - Math.exp(-dt * 1.5));

    energy.x = blob.x;
    energy.y = blob.y;
    energy.vx = blob.vx;
    energy.vy = blob.vy;
    energy.r = blob.r;
    energy.intensity = blob.i;
    energy.hover = hoverAmt;
    energy.pointer = active;
    energy.live = true;

    if (tracker) {
      const box = 28; // a small reticle on the field's centre, not the field's extent
      tracker.style.transform = `translate3d(${(blob.x - box / 2).toFixed(1)}px, ${(blob.y - box / 2).toFixed(1)}px, 0)`;
      tracker.style.width = tracker.style.height = `${box.toFixed(1)}px`;
      tracker.style.opacity = active ? String(0.35 + hoverAmt * 0.4) : "0";
    }
  };

  // ---- state ------------------------------------------------------------
  const cur: State = { ...base };
  const target: State = { ...base };
  let activeId = "index";

  /** Blend every section's camera by how much of it straddles the viewport centre. */
  const resolveTarget = () => {
    const vh = H || window.innerHeight;
    const c = scrollY + vh * 0.5;
    const T = vh * 0.45;
    const acc: State = { pitch: 0, camY: 0, dist: 0, amp: 0, freq: 0, flatten: 0, alpha: 0, bx: 0, by: 0, br: 0, bi: 0 };
    let sum = 0;
    let best = 0;
    for (const b of boxes) {
      const inside = smooth(b.top - T, b.top + T, c) * (1 - smooth(b.bottom - T, b.bottom + T, c));
      const weight = b === boxes[0] ? Math.max(inside, 1 - smooth(b.bottom - T, b.bottom + T, c)) : inside;
      if (weight <= 0.0001) continue;
      const p = Math.min(1, Math.max(0, (c - b.top) / Math.max(1, b.bottom - b.top)));
      for (const k of KEYS) {
        const to = b.kf.to?.[k];
        acc[k] += (to === undefined ? b.kf.from[k] : b.kf.from[k] + (to - b.kf.from[k]) * p) * weight;
      }
      sum += weight;
      if (weight > best) {
        best = weight;
        if (best > 0.5 && activeId !== b.kf.id) {
          activeId = b.kf.id;
          pulse = Math.max(pulse, 0.85);
        }
      }
    }
    if (sum > 0) for (const k of KEYS) target[k] = acc[k] / sum;
  };

  // ---- render -----------------------------------------------------------
  /** The blob as layered radial light: a stretched main body and its trail, with a faint rim. */
  const paintAtmosphere = (t: number) => {
    if (!actx || !atmos) return;
    actx.setTransform(1, 0, 0, 1, 0, 0);
    actx.clearRect(0, 0, atmos.width, atmos.height);
    if (blob.i < 0.01 || blob.r < 1) return;
    actx.globalCompositeOperation = "lighter";
    const angle = Math.atan2(blob.vy, blob.vx);
    const bodies: [number, number, number, number][] = [
      [blob.x, blob.y, blob.r * (1 + Math.sin(t * 0.6) * 0.05), 1],
      [trail[0][0], trail[0][1], blob.r * 0.62, 0.5],
      [trail[1][0], trail[1][1], blob.r * 0.44, 0.32],
      [trail[2][0], trail[2][1], blob.r * 0.3, 0.2],
    ];
    bodies.forEach(([x, y, r, weight], i) => {
      const R = (r * 2.2) / SCALE;
      const a = blob.i * weight;
      actx.setTransform(1, 0, 0, 1, x / SCALE, y / SCALE);
      if (i === 0) {
        actx.rotate(angle);
        actx.scale(1 + blob.stretch, 1 / (1 + blob.stretch * 0.45));
      }
      const g = actx.createRadialGradient(0, 0, 0, 0, 0, R);
      g.addColorStop(0, `rgba(${bright},${(0.075 * a).toFixed(3)})`);
      g.addColorStop(0.3, `rgba(${deep},${(0.06 * a).toFixed(3)})`);
      g.addColorStop(0.43, `rgba(${bright},${(0.04 * a).toFixed(3)})`);
      g.addColorStop(0.52, `rgba(${deep},${(0.028 * a).toFixed(3)})`);
      g.addColorStop(1, `rgba(${deep},0)`);
      actx.fillStyle = g;
      actx.beginPath();
      actx.arc(0, 0, R, 0, Math.PI * 2);
      actx.fill();
    });
  };

  const hud = {
    x: document.querySelector<HTMLElement>('[data-hud="x"]'),
    y: document.querySelector<HTMLElement>('[data-hud="y"]'),
    v: document.querySelector<HTMLElement>('[data-hud="v"]'),
  };
  let hudTick = 0;

  const draw = (t: number) => {
    const aspect = W / Math.max(1, H);
    const coarse = drawCount < lattice.total;
    gl.clear(gl.COLOR_BUFFER_BIT);
    paintAtmosphere(t);

    gl.uniform2f(u.uBlob, (blob.x / Math.max(1, W)) * 2 - 1, -((blob.y / Math.max(1, H)) * 2 - 1));
    gl.uniform1f(u.uBlobR, (blob.r / Math.max(1, H)) * 2);
    gl.uniform1f(u.uBlobI, blob.i * 0.8);
    gl.uniform1f(u.uTime, t);
    gl.uniform1f(u.uAspect, aspect);
    gl.uniform1f(u.uFocal, aspect < 1 ? 1.35 : 1.75);
    gl.uniform2f(u.uSpan, aspect < 1 ? 1.9 : 2.9, 2.2);
    gl.uniform1f(u.uPitch, cur.pitch);
    gl.uniform1f(u.uCamY, cur.camY);
    gl.uniform1f(u.uDist, cur.dist);
    gl.uniform1f(u.uAmp, cur.amp);
    gl.uniform1f(u.uFreq, cur.freq);
    gl.uniform1f(u.uFlatten, cur.flatten);
    gl.uniform1f(u.uAlpha, cur.alpha * (coarse ? 1.35 : 1));
    gl.uniform1f(u.uDrift, drift);
    gl.uniform1f(u.uPulse, pulse);
    gl.uniform1f(u.uVel, mouse.vel);
    gl.uniform2f(u.uMouse, mouse.x, mouse.y);
    gl.uniform1f(u.uSize, (coarse || low ? 2.2 : 1.7) * dpr);
    gl.uniform1f(u.uClock, t);

    // lattice: neutral points
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 0, 0);
    gl.disableVertexAttribArray(aT);
    gl.vertexAttrib1f(aT, 0);
    gl.uniform1f(u.uKind, 0);
    gl.drawArrays(gl.POINTS, 0, drawCount);

    // links: thin blue connections with travelling pulses
    if (network.linkVerts) {
      gl.bindBuffer(gl.ARRAY_BUFFER, linksBuf);
      gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(aT);
      gl.vertexAttribPointer(aT, 1, gl.FLOAT, false, 16, 12);
      gl.uniform1f(u.uKind, 2);
      gl.drawArrays(gl.LINES, 0, network.linkVerts);
      gl.disableVertexAttribArray(aT);
    }

    // nodes: the selected points the links connect
    gl.bindBuffer(gl.ARRAY_BUFFER, nodesBuf);
    gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 0, 0);
    gl.uniform1f(u.uKind, 1);
    gl.drawArrays(gl.POINTS, 0, network.nodeCount);
  };

  let raf = 0;
  let last = performance.now();
  let time = 12;
  const samples: number[] = [];

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (now - last < minFrame) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // Adaptive quality: if the first seconds run slow, draw the coarse lattice.
    if (samples.length < 90) {
      samples.push(dt);
      if (samples.length === 90) {
        const avg = samples.slice(20).reduce((a, b) => a + b, 0) / 70;
        if (avg > (low ? 0.04 : 0.024)) {
          drawCount = lattice.coarse;
          dprCap = 1;
          resize();
        }
      }
    }

    time += dt;
    resolveTarget();
    const k = 1 - Math.exp(-dt * 4.2);
    for (const key of KEYS) cur[key] += (target[key] - cur[key]) * k;

    const ds = scrollY - lastScroll;
    lastScroll = scrollY;
    driftVel += (ds * 0.0009 - driftVel) * 0.2;
    drift += driftVel;

    const mk = 1 - Math.exp(-dt * 9);
    const away = mouse.tx > 5;
    mouse.x += ((away ? 9 : mouse.tx) - mouse.x) * mk * (away ? 0.25 : 1);
    mouse.y += ((away ? 9 : mouse.ty) - mouse.y) * mk * (away ? 0.25 : 1);
    mouse.vel *= Math.exp(-dt * 2.4);
    if (low && now - lastMove > 900) onLeave();
    pulse = Math.max(0, pulse - dt * 0.55);
    stepBlob(dt, now, ds);

    draw(time);

    if (++hudTick % 6 === 0 && hud.x && hud.y && hud.v) {
      hud.x.textContent = away ? "—" : mouse.x.toFixed(3);
      hud.y.textContent = away ? "—" : mouse.y.toFixed(3);
      hud.v.textContent = mouse.vel.toFixed(2);
    }
    if (hudTick % 6 === 0 && trackerLabel) {
      trackerLabel.textContent = `${(blob.x / W).toFixed(2)} / ${(blob.y / H).toFixed(2)}`;
    }
  };

  const ro = new ResizeObserver(measure);
  ro.observe(document.body);
  window.addEventListener("resize", resize);
  resize();
  canvas.dataset.ready = "1";

  if (reduced) {
    // No autonomous motion: one still frame per scroll position.
    const still = () => {
      scrollY = window.scrollY;
      resolveTarget();
      Object.assign(cur, target);
      // the atmosphere rests at its section anchor, without following anything
      blob.x = cur.bx * W;
      blob.y = cur.by * H;
      blob.r = cur.br * Math.min(W, H);
      blob.i = cur.bi * 0.8;
      Object.assign(energy, { x: blob.x, y: blob.y, r: blob.r, intensity: blob.i, live: true });
      draw(time);
    };
    still();
    window.addEventListener("scroll", still, { passive: true });
    window.addEventListener("resize", still);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", still);
      window.removeEventListener("resize", still);
      window.removeEventListener("resize", resize);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }

  const onVisibility = () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("pointerover", onOver, { passive: true });
  window.addEventListener("touchmove", onTouch, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("field:pulse", onPulse);
  document.addEventListener("visibilitychange", onVisibility);
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerover", onOver);
    window.removeEventListener("touchmove", onTouch);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("field:pulse", onPulse);
    document.removeEventListener("visibilitychange", onVisibility);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
}
