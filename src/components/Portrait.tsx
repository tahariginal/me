"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { createProgram, hexToRgb, isLowPower, prefersReducedMotion, uniforms } from "@/lib/gl";
import {
  binaryFragment,
  binaryVertex,
  feedbackFragment,
  outFragment,
  pointsFragment,
  pointsVertex,
  quadVertex,
} from "@/lib/portrait-shaders";
import { palette } from "@/lib/theme";

type OpKey = "source" | "depth" | "binary" | "feedback";
type Ops = Record<OpKey, boolean>;

/** `short` replaces the operator name on phones, where full TD names don't fit. */
const network: { key: OpKey | null; family: string; name: string; short: string; param: string; describe: string }[] = [
  { key: "source", family: "TOP", name: "moviefilein1", short: "movie", param: "view source", describe: "Show the source photograph" },
  { key: "depth", family: "SOP", name: "lumadepth1", short: "depth", param: "z = luma", describe: "Extrude points by brightness" },
  { key: "binary", family: "TOP", name: "binary1", short: "binary", param: "0/1 wall", describe: "Moving binary wall behind the head" },
  { key: "feedback", family: "TOP", name: "feedback1", short: "trails", param: "decay .80", describe: "Feedback trails" },
  { key: null, family: "COMP", name: "out1", short: "out", param: "instance", describe: "" },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export default function Portrait() {
  const wrap = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const hud = useRef<{ fps: HTMLSpanElement | null; pts: HTMLSpanElement | null; yaw: HTMLSpanElement | null }>({ fps: null, pts: null, yaw: null });
  // Default: the photo itself (no luma extrusion) with the binary wall, trails and out.
  const [ops, setOps] = useState<Ops>({ source: false, depth: false, binary: true, feedback: true });
  const opsRef = useRef(ops);
  const invalidate = useRef<() => void>(() => {});

  useEffect(() => {
    opsRef.current = ops;
    invalidate.current();
  }, [ops]);

  useEffect(() => {
    const el = wrap.current;
    const canvas = cvs.current;
    if (!el || !canvas) return;
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false });
    if (!gl) return;
    const pointsProg = createProgram(gl, pointsVertex, pointsFragment);
    const binaryProg = createProgram(gl, binaryVertex, binaryFragment);
    const feedbackProg = createProgram(gl, quadVertex, feedbackFragment);
    const outProg = createProgram(gl, quadVertex, outFragment);
    if (!pointsProg || !binaryProg || !feedbackProg || !outProg) return;

    const reduced = prefersReducedMotion();
    const low = isLowPower();
    const up = uniforms(gl, pointsProg, [
      "uTime", "uAspect", "uAssemble", "uDepth", "uYaw", "uPitch", "uSize", "uHover", "uVel", "uOcclude", "uMouse", "uFg", "uAccent", "uAccentLight",
    ] as const);
    const ub = uniforms(gl, binaryProg, [
      "uTime", "uAspect", "uYaw", "uPitch", "uCols", "uRows", "uSize", "uHover", "uReveal", "uMouse", "uAtlas", "uFg", "uAccent",
    ] as const);
    const uf = uniforms(gl, feedbackProg, ["uCur", "uPrev", "uDecay"] as const);
    const uo = uniforms(gl, outProg, ["uTex", "uBg", "uRes"] as const);

    gl.useProgram(pointsProg);
    gl.uniform3fv(up.uFg, hexToRgb(palette.fg));
    gl.uniform3fv(up.uAccent, hexToRgb(palette.accent));
    gl.uniform3fv(up.uAccentLight, hexToRgb(palette.accentLight));
    gl.useProgram(binaryProg);
    gl.uniform3fv(ub.uFg, hexToRgb(palette.fg));
    gl.uniform3fv(ub.uAccent, hexToRgb(palette.accent));
    gl.uniform1i(ub.uAtlas, 0);
    gl.useProgram(outProg);
    gl.uniform3fv(uo.uBg, hexToRgb(palette.bg));
    gl.uniform1i(uo.uTex, 0);
    gl.useProgram(feedbackProg);
    gl.uniform1i(uf.uCur, 0);
    gl.uniform1i(uf.uPrev, 1);

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const dataBuf = gl.createBuffer();
    const fadeBuf = gl.createBuffer();
    let count = 0;

    // ---- binary1: glyph atlas ("0" | "1") and the wall of cells -------------
    const COLS = low ? 30 : 44;
    const ROWS = Math.round(COLS * 1.2);
    const atlas = document.createElement("canvas");
    atlas.width = 128;
    atlas.height = 64;
    const actx = atlas.getContext("2d");
    const mono = getComputedStyle(document.documentElement).getPropertyValue("--font-plex").trim() || "monospace";
    if (actx) {
      actx.fillStyle = "#fff";
      actx.font = `500 44px ${mono}`;
      actx.textAlign = "center";
      actx.textBaseline = "middle";
      actx.fillText("0", 32, 34);
      actx.fillText("1", 96, 34);
    }
    const atlasTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, atlasTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const cells = new Float32Array(COLS * ROWS * 3);
    for (let r = 0, o = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++, o += 3) cells.set([c, r, Math.random()], o);
    const cellsBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cellsBuf);
    gl.bufferData(gl.ARRAY_BUFFER, cells, gl.STATIC_DRAW);

    // ---- render targets ------------------------------------------------------
    type Target = { tex: WebGLTexture; fb: WebGLFramebuffer };
    let targets: Target[] = [];
    const makeTarget = (w: number, h: number): Target => {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { tex, fb };
    };

    let dpr = 1;
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, low ? 1.5 : 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      canvas.width = w;
      canvas.height = h;
      targets.forEach((t) => {
        gl.deleteTexture(t.tex);
        gl.deleteFramebuffer(t.fb);
      });
      // [this frame, trail A, trail B]
      targets = [makeTarget(w, h), makeTarget(w, h), makeTarget(w, h)];
      gl.useProgram(outProg);
      gl.uniform2f(uo.uRes, w, h);
    };

    // ---- moviefilein + depth: sample the portrait into lit, sculpted points --
    const load = () => {
      const img = new Image();
      img.decoding = "async";
      img.src = "/img/portrait-cut.webp";
      img.onload = () => {
        const cols = low ? 118 : 172;
        const rows = Math.round(cols * 1.25);
        const off = document.createElement("canvas");
        off.width = cols;
        off.height = rows;
        const ctx = off.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, cols, rows);
        const px = ctx.getImageData(0, 0, cols, rows).data;

        const raw = (i: number) => (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;
        const lumas: number[] = [];
        for (let i = 0; i < cols * rows; i++) if (px[i * 4 + 3] > 60) lumas.push(raw(i));
        lumas.sort((a, b) => a - b);
        const lo = lumas[Math.floor(lumas.length * 0.02)] ?? 0;
        const hi = lumas[Math.floor(lumas.length * 0.98)] ?? 1;
        const norm = (i: number) => clamp01((raw(i) - lo) / (hi - lo));

        const data = new Float32Array(lumas.length * 4);
        const fades = new Float32Array(lumas.length);
        let o = 0;
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const i = y * cols + x;
            if (px[i * 4 + 3] <= 60) continue;
            const jitter = (Math.random() - 0.5) * 0.35;
            // the bust dissolves at its base and sides instead of ending in a hard crop
            const fade = (1 - smooth(0.8, 1, y / rows)) * smooth(0, 0.08, x / cols) * (1 - smooth(0.92, 1, x / cols));
            data.set([(x + 0.5 + jitter) / cols, (y + 0.5 + jitter) / rows, Math.pow(norm(i), 0.9) * (px[i * 4 + 3] / 255) * fade, Math.random()], o * 4);
            fades[o] = fade;
            o++;
          }
        }
        count = o;
        gl.bindBuffer(gl.ARRAY_BUFFER, dataBuf);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, fadeBuf);
        gl.bufferData(gl.ARRAY_BUFFER, fades, gl.STATIC_DRAW);
        if (hud.current.pts) hud.current.pts.textContent = count.toLocaleString("en-US");
        canvas.dataset.ready = "1";
        request();
      };
    };

    // ---- state -------------------------------------------------------------
    const s = { time: reduced ? 20 : 0, assemble: reduced ? 1 : 0, depth: 0, binary: 1, decay: 0.8, yaw: 0, pitch: 0, hover: 0, vel: 0, mx: 0, my: 0, tmx: 0, tmy: 0, inside: false };

    const drawQuad = (prog: WebGLProgram) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      const aPos = gl.getAttribLocation(prog, "aPos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disableVertexAttribArray(aPos);
    };

    const drawPoints = (occlude: boolean) => {
      gl.useProgram(pointsProg);
      const aData = gl.getAttribLocation(pointsProg, "aData");
      const aFade = gl.getAttribLocation(pointsProg, "aFade");
      gl.bindBuffer(gl.ARRAY_BUFFER, dataBuf);
      gl.enableVertexAttribArray(aData);
      gl.vertexAttribPointer(aData, 4, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, fadeBuf);
      gl.enableVertexAttribArray(aFade);
      gl.vertexAttribPointer(aFade, 1, gl.FLOAT, false, 0, 0);
      gl.uniform1f(up.uTime, s.time);
      gl.uniform1f(up.uAspect, canvas.width / canvas.height);
      gl.uniform1f(up.uAssemble, s.assemble);
      gl.uniform1f(up.uDepth, s.depth);
      gl.uniform1f(up.uYaw, s.yaw);
      gl.uniform1f(up.uPitch, s.pitch);
      gl.uniform1f(up.uSize, (low ? 2.7 : 2.3) * dpr * (canvas.clientWidth / 460));
      gl.uniform1f(up.uHover, s.hover);
      gl.uniform1f(up.uVel, s.vel);
      gl.uniform1f(up.uOcclude, occlude ? 1 : 0);
      gl.uniform2f(up.uMouse, s.mx, s.my);
      gl.drawArrays(gl.POINTS, 0, count);
      gl.disableVertexAttribArray(aData);
      gl.disableVertexAttribArray(aFade);
    };

    const draw = () => {
      if (!count || targets.length < 3) return;
      const [cur, src, dst] = targets;
      const aspect = canvas.width / canvas.height;
      gl.viewport(0, 0, canvas.width, canvas.height);

      gl.bindFramebuffer(gl.FRAMEBUFFER, cur.fb);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // binary1: the wall behind the head
      if (s.binary > 0.01) {
        gl.useProgram(binaryProg);
        const aCell = gl.getAttribLocation(binaryProg, "aCell");
        gl.bindBuffer(gl.ARRAY_BUFFER, cellsBuf);
        gl.enableVertexAttribArray(aCell);
        gl.vertexAttribPointer(aCell, 3, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, atlasTex);
        gl.uniform1f(ub.uTime, s.time);
        gl.uniform1f(ub.uAspect, aspect);
        gl.uniform1f(ub.uYaw, s.yaw);
        gl.uniform1f(ub.uPitch, s.pitch);
        gl.uniform1f(ub.uCols, COLS);
        gl.uniform1f(ub.uRows, ROWS);
        gl.uniform1f(ub.uSize, ((2.3 / (COLS - 1)) * (3.05 / 2.9)) / aspect * (canvas.width / 2) * 0.92);
        gl.uniform1f(ub.uHover, s.hover);
        gl.uniform1f(ub.uReveal, s.assemble * s.binary);
        gl.uniform2f(ub.uMouse, s.mx, s.my);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.drawArrays(gl.POINTS, 0, cells.length / 3);
        gl.disableVertexAttribArray(aCell);

        // silhouette pass: the head hides the wall behind it
        gl.disable(gl.BLEND);
        drawPoints(true);
      }

      // instance1: the lit, sculpted face
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      drawPoints(false);
      gl.disable(gl.BLEND);

      // feedback1: max(this frame, decayed trail)
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
      gl.useProgram(feedbackProg);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, src.tex);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, cur.tex);
      gl.uniform1f(uf.uDecay, s.decay);
      drawQuad(feedbackProg);

      // out1
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(outProg);
      gl.bindTexture(gl.TEXTURE_2D, dst.tex);
      drawQuad(outProg);

      targets = [cur, dst, src];
    };

    // ---- loop ----------------------------------------------------------------
    let raf = 0;
    let visible = false;
    let last = performance.now();
    let frames = 0;
    let fpsClock = last;

    const step = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const o = opsRef.current;

      if (reduced) {
        s.decay = 0;
        s.depth = o.depth ? 0.42 : 0;
        s.binary = o.binary ? 1 : 0;
        s.yaw = s.inside ? s.tmx * 0.5 : 0;
        s.pitch = s.inside ? s.tmy * 0.22 : 0;
        draw();
        return;
      }

      s.time += dt;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const target = smooth(0.12, 0.78, (vh - r.top) / (vh * 0.95));
      const ease = (k: number) => 1 - Math.exp(-dt * k);
      s.assemble += (target - s.assemble) * ease(3);
      if (Math.abs(target - s.assemble) < 0.004) s.assemble = target;
      s.depth += ((o.depth ? 0.42 : 0) - s.depth) * ease(4);
      s.binary += ((o.binary ? 1 : 0) - s.binary) * ease(4);
      s.decay += ((o.feedback ? 0.8 : 0) - s.decay) * ease(6);

      // idle: a slow three-quarter turn each way, so the volume reads
      const idleYaw = Math.sin(s.time * 0.27) * 0.24;
      const idlePitch = Math.sin(s.time * 0.21) * 0.07;
      s.yaw += ((s.inside ? s.tmx * 0.6 : idleYaw) - s.yaw) * ease(3.5);
      s.pitch += ((s.inside ? s.tmy * 0.28 : idlePitch) - s.pitch) * ease(3.5);
      s.mx += (s.tmx - s.mx) * ease(12);
      s.my += (s.tmy - s.my) * ease(12);
      s.hover += ((s.inside ? 1 : 0) - s.hover) * ease(5);
      s.vel *= Math.exp(-dt * 2.5);

      draw();

      frames++;
      if (now - fpsClock > 500) {
        if (hud.current.fps) hud.current.fps.textContent = String(Math.round((frames * 1000) / (now - fpsClock)));
        if (hud.current.yaw) hud.current.yaw.textContent = s.yaw.toFixed(2);
        frames = 0;
        fpsClock = now;
      }
      if (visible) raf = requestAnimationFrame(step);
    };

    function request() {
      if (raf || !count) return;
      if (!visible && !reduced) return;
      last = performance.now();
      raf = requestAnimationFrame(step);
    }
    invalidate.current = request;

    // ---- input ---------------------------------------------------------------
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1;
      const y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      if (s.inside) s.vel = Math.min(1, s.vel + Math.hypot(x - s.tmx, y - s.tmy) * 1.6);
      else {
        s.mx = x;
        s.my = y;
      }
      s.tmx = x;
      s.tmy = y;
      s.inside = true;
      if (reduced) request();
    };
    const onLeave = () => {
      s.inside = false;
      if (reduced) request();
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointercancel", onLeave);

    let requested = false;
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible && !requested) {
          requested = true;
          load();
        }
        if (visible) request();
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    const ro = new ResizeObserver(() => {
      size();
      request();
    });
    ro.observe(canvas);
    size();

    return () => {
      cancelAnimationFrame(raf);
      invalidate.current = () => {};
      io.disconnect();
      ro.disconnect();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointercancel", onLeave);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  const toggle = (key: OpKey) => setOps((o) => ({ ...o, [key]: !o[key] }));

  return (
    <div>
      <div className="border border-line p-2">
        <div ref={wrap} className="relative aspect-[4/5] w-full touch-pan-y overflow-hidden bg-bg">
          <img
            src="/img/portrait-960.webp"
            srcSet="/img/portrait-480.webp 480w, /img/portrait-960.webp 960w"
            sizes="(min-width: 768px) 40vw, 100vw"
            width={960}
            height={1200}
            loading="lazy"
            decoding="async"
            alt="Portrait of Taha Koulal, smiling, in a white t-shirt"
            className="absolute inset-0 size-full object-cover"
          />
          <canvas
            ref={cvs}
            aria-hidden="true"
            className={`absolute inset-0 size-full opacity-0 transition-opacity duration-700 ${ops.source ? "" : "data-[ready]:opacity-100"}`}
          />
          <div className="label pointer-events-none absolute inset-x-3 top-3 flex justify-between text-fg-3" aria-hidden="true">
            <span>
              out1 · <span ref={(n) => void (hud.current.pts = n)} className="tabular text-fg-2">—</span> pts
            </span>
            <span>
              <span ref={(n) => void (hud.current.fps = n)} className="tabular text-fg-2">—</span> fps
            </span>
          </div>
          <div className="label pointer-events-none absolute inset-x-3 bottom-3 flex justify-between text-fg-3" aria-hidden="true">
            <span>
              {ops.source
                ? "moviefilein1 · source"
                : [ops.depth && "lumadepth", ops.binary && "binary", ops.feedback && "feedback", "out"].filter(Boolean).join(" · ")}
            </span>
            <span>
              yaw <span ref={(n) => void (hud.current.yaw = n)} className="tabular text-fg-2">0.00</span>
            </span>
          </div>
        </div>
      </div>

      <div role="group" aria-label="Portrait network — toggle operators" className="mt-3 flex items-stretch">
        {network.map((n, i) => {
          const on = n.key ? ops[n.key] : true;
          const body = (
            <>
              <span className="flex items-center justify-between gap-1">
                <span className="label text-[0.6rem] text-fg-3">{n.family}</span>
                <span aria-hidden="true" className={`size-1.5 ${on ? "bg-accent" : "border border-fg-3"}`} />
              </span>
              <span className="label mt-1 block truncate text-[0.6rem] leading-tight tracking-normal text-fg sm:text-[0.625rem]">
                <span className="sm:hidden">{n.short}</span>
                <span className="hidden sm:inline">{n.name}</span>
              </span>
              <span className="label hidden truncate text-[0.6rem] normal-case tracking-normal text-fg-3 sm:block">{n.param}</span>
            </>
          );
          return (
            <Fragment key={n.name}>
              {i > 0 && <span aria-hidden="true" className={`relative my-auto block h-px w-2 shrink-0 sm:w-3 ${on ? "bg-accent-deep" : "bg-line-2"}`} />}
              {n.key ? (
                <button
                  type="button"
                  aria-pressed={on}
                  title={n.describe}
                  aria-label={`${n.name}: ${n.describe}`}
                  onClick={() => toggle(n.key!)}
                  className={`min-w-0 flex-1 border px-1.5 py-1.5 text-left transition-colors duration-300 hover:border-accent sm:px-2 ${
                    on ? "border-line-2 bg-fg/[0.03]" : "border-line"
                  }`}
                >
                  {body}
                </button>
              ) : (
                <div className="min-w-0 flex-1 border border-line px-1.5 py-1.5 sm:px-2">{body}</div>
              )}
            </Fragment>
          );
        })}
      </div>
      <p className="label mt-3 flex justify-between gap-4 text-fg-3" aria-hidden="true">
        <span>Plate 04 — me.jpeg, instanced</span>
        <span className="hidden sm:inline">Move to orbit · toggle operators</span>
      </p>
    </div>
  );
}
