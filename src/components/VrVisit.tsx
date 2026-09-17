"use client";

import { useEffect, useRef, useState } from "react";
import { palette, rgba } from "@/lib/theme";
import { drawEye, project, type Eye, type FrameState } from "@/lib/vr-render";
import { buildScene, EYE, roomAt, rooms, waypoints } from "@/lib/vr-scene";

/*
 * A stereo model of a virtual visit: wireframe rooms, exhibits, signage, a
 * controller, teleport with a comfort blink, gaze dwell with world-space info
 * panels, and a live plan view. It illustrates the kind of experience described
 * in the CV — it is not a capture of the delivered Unity project.
 */

const scene = buildScene();
const IPD = 0.12; // exaggerated so the parallax reads at this size
const heading = (from: { x: number; z: number }, to: { x: number; z: number }) => Math.atan2(-(to.x - from.x), -(to.z - from.z));
const PLAN = 10; // plan units per metre

type View = "stereo" | "mono";

export default function VrVisit() {
  const wrap = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const player = useRef<SVGGElement>(null);
  const tele = useRef<Record<"room" | "pos" | "head" | "frame", HTMLSpanElement | null>>({ room: null, pos: null, head: null, frame: null });
  const api = useRef({ teleportTo: (_i: number) => {}, next: () => {}, setView: (_v: View) => {}, setGuides: (_g: boolean) => {} });
  const [wp, setWp] = useState(0);
  const [view, setView] = useState<View>("stereo");
  const [guides, setGuides] = useState(true);

  useEffect(() => api.current.setView(view), [view]);
  useEffect(() => api.current.setGuides(guides), [guides]);

  useEffect(() => {
    const el = wrap.current;
    const canvas = cvs.current;
    if (!el || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const font = getComputedStyle(document.documentElement).getPropertyValue("--font-plex").trim() || "monospace";

    const cam = { x: waypoints[0].x, z: waypoints[0].z, y: EYE, yaw: heading(waypoints[0], waypoints[1]), pitch: 0 };
    const look = { base: cam.yaw, manualYaw: 0, manualPitch: 0, hover: false, nx: 0, ny: 0 };
    const drag = { active: false, moved: false, startX: 0, startYaw: 0 };
    const tp = { current: 0, target: 1, phase: "idle" as "idle" | "aim" | "out" | "in", t: 0, idle: 0, lastInput: -1e9 };
    const state = { view: "stereo" as View, guides: true, dwell: 0, dwellIndex: -1, gazeWp: -1, time: 0, frameMs: 16 };
    let Wc = 0;
    let Hc = 0;
    let dpr = 1;

    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      Wc = canvas.clientWidth;
      Hc = canvas.clientHeight;
      canvas.width = Math.round(Wc * dpr);
      canvas.height = Math.round(Hc * dpr);
    };

    const eyes = (): Eye[] => {
      const { right: r } = { right: [Math.cos(cam.yaw), 0, -Math.sin(cam.yaw)] };
      if (state.view === "mono") return [{ ox: 0, oz: 0, cx: Wc / 2, cy: Hc / 2, scale: Hc * 0.66, x0: 0, w: Wc, h: Hc }];
      const gap = Math.max(6, Wc * 0.012);
      const w = (Wc - gap) / 2;
      const scale = Math.min(w, Hc) * 0.62;
      return [
        { ox: -r[0] * IPD * 0.5, oz: -r[2] * IPD * 0.5, cx: w / 2, cy: Hc / 2, scale, x0: 0, w, h: Hc },
        { ox: r[0] * IPD * 0.5, oz: r[2] * IPD * 0.5, cx: w + gap + w / 2, cy: Hc / 2, scale, x0: w + gap, w, h: Hc },
      ];
    };

    const render = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, Wc, Hc);
      const frame: FrameState = {
        cam,
        time: state.time,
        current: tp.current,
        next: tp.target,
        aim: tp.phase === "aim" ? Math.min(1, tp.t / 0.6) : -1,
        dwell: state.dwell,
        dwellIndex: state.dwellIndex,
        guides: state.guides,
        gaze: state.gazeWp,
        font,
      };
      for (const e of eyes()) drawEye(ctx, e, frame, scene);
      if (tp.phase === "out" || tp.phase === "in") {
        const a = tp.phase === "out" ? Math.min(1, tp.t / 0.14) : 1 - Math.min(1, tp.t / 0.26);
        ctx.fillStyle = rgba(palette.bg, a);
        ctx.fillRect(0, 0, Wc, Hc);
      }
      updatePlan();
    };

    // ---- plan view + telemetry (DOM, no React updates per frame) ------------
    let teleTick = 0;
    const updatePlan = () => {
      const deg = (Math.atan2(-Math.sin(cam.yaw), Math.cos(cam.yaw)) * 180) / Math.PI;
      player.current?.setAttribute("transform", `translate(${(-cam.z * PLAN).toFixed(1)} ${(cam.x * PLAN).toFixed(1)}) rotate(${(deg - 90).toFixed(1)})`);
      if (teleTick++ % 6 !== 0) return;
      const t = tele.current;
      const room = rooms[roomAt(cam.z)];
      if (t.room) t.room.textContent = `${room.code} · ${room.name}`;
      if (t.pos) t.pos.textContent = `${cam.x.toFixed(1)}, ${cam.z.toFixed(1)}`;
      if (t.head) t.head.textContent = `${Math.round(((((-cam.yaw * 180) / Math.PI) % 360) + 360) % 360)}° / ${Math.round((cam.pitch * 180) / Math.PI)}°`;
      if (t.frame) t.frame.textContent = reduced ? "—" : `${state.frameMs.toFixed(1)} ms`;
    };

    // ---- teleport ---------------------------------------------------------
    const arrive = () => {
      tp.current = tp.target;
      const here = waypoints[tp.current];
      cam.x = here.x;
      cam.z = here.z;
      look.base = heading(here, waypoints[(tp.current + 1) % waypoints.length]);
      look.manualYaw = 0;
      cam.yaw = look.base;
      tp.target = (tp.current + 1) % waypoints.length;
      setWp(tp.current);
    };
    const teleportTo = (i: number) => {
      if (tp.phase !== "idle" || i === tp.current) return;
      tp.target = i;
      tp.lastInput = performance.now();
      if (reduced) {
        arrive();
        render();
        return;
      }
      tp.phase = "aim";
      tp.t = 0;
    };
    api.current = {
      teleportTo,
      next: () => teleportTo((tp.current + 1) % waypoints.length),
      setView: (v) => {
        state.view = v;
        render();
      },
      setGuides: (g) => {
        state.guides = g;
        render();
      },
    };

    const updateDwell = (dt: number) => {
      const fx = -Math.sin(cam.yaw) * Math.cos(cam.pitch);
      const fy = Math.sin(cam.pitch);
      const fz = -Math.cos(cam.yaw) * Math.cos(cam.pitch);
      let hit = -1;
      scene.exhibits.forEach((ex, i) => {
        const dx = ex.pos[0] - cam.x;
        const dy = ex.pos[1] - EYE;
        const dz = ex.pos[2] - cam.z;
        const len = Math.hypot(dx, dy, dz);
        if (len < 9 && (dx * fx + dy * fy + dz * fz) / len > Math.cos(0.12)) hit = i;
      });
      if (hit >= 0 && hit === state.dwellIndex) state.dwell = Math.min(1.3, state.dwell + dt / 1.1);
      else if (hit >= 0 && state.dwell < 0.05) {
        state.dwellIndex = hit;
        state.dwell = dt;
      } else state.dwell = Math.max(0, state.dwell - dt * 2);
    };

    // ---- loop ------------------------------------------------------------------
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      state.frameMs += ((now - last) - state.frameMs) * 0.1;
      last = now;
      state.time += dt;

      const idle = !look.hover && !drag.active;
      const touring = idle && now - tp.lastInput > 8000;
      // attention: while touring, the head turns to an exhibit near the route and holds it
      let attention: { yaw: number; pitch: number } | null = null;
      if (touring) {
        for (const ex of scene.exhibits) {
          const dx = ex.pos[0] - cam.x;
          const dz = ex.pos[2] - cam.z;
          const d = Math.hypot(dx, dz);
          const yaw = Math.atan2(-dx, -dz);
          const off = Math.atan2(Math.sin(yaw - look.base), Math.cos(yaw - look.base));
          if (d < 8 && Math.abs(off) < 0.9) attention = { yaw: look.base + off, pitch: Math.atan2(ex.pos[1] - EYE, d) };
        }
      }
      const sway = idle && !attention ? Math.sin(state.time * 0.35) * 0.45 : 0;
      const hoverYaw = look.hover && !drag.active ? -look.nx * 0.95 : 0;
      const targetYaw = attention ? attention.yaw : look.base + look.manualYaw + sway + hoverYaw;
      const targetPitch = attention
        ? attention.pitch
        : look.hover
          ? look.ny * 0.4
          : look.manualPitch + Math.sin(state.time * 0.23) * 0.08 - 0.04;
      const k = 1 - Math.exp(-dt * (drag.active ? 12 : 3));
      cam.yaw += (targetYaw - cam.yaw) * k;
      cam.pitch += (targetPitch - cam.pitch) * (1 - Math.exp(-dt * 3));
      cam.y = EYE + Math.sin(state.time * 1.1) * 0.012; // a little breathing, so it feels worn
      updateDwell(dt);

      // which waypoint the reticle rests on — looking at one and clicking jumps there
      const gf: [number, number] = [-Math.sin(cam.yaw), -Math.cos(cam.yaw)];
      state.gazeWp = -1;
      waypoints.forEach((w, i) => {
        if (i === tp.current) return;
        const dx = w.x - cam.x;
        const dz = w.z - cam.z;
        const len = Math.hypot(dx, dz) || 1;
        if ((dx * gf[0] + dz * gf[1]) / len > Math.cos(0.13) && cam.pitch < 0.05) state.gazeWp = i;
      });

      tp.t += dt;
      if (tp.phase === "idle") {
        // auto-tour, paused for a while after any direct input
        if (!look.hover && now - tp.lastInput > 8000 && (tp.idle += dt) > (attention ? 5.2 : 4)) {
          tp.idle = 0;
          teleportTo((tp.current + 1) % waypoints.length);
        }
      } else if (tp.phase === "aim" && tp.t > 0.9) {
        tp.phase = "out";
        tp.t = 0;
      } else if (tp.phase === "out" && tp.t > 0.14) {
        arrive();
        tp.phase = "in";
        tp.t = 0;
      } else if (tp.phase === "in" && tp.t > 0.26) {
        tp.phase = "idle";
        tp.t = 0;
        tp.idle = 0;
      }
      render();
    };
    const start = () => {
      if (raf || reduced) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    // ---- input ----------------------------------------------------------------
    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
    };
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      if (drag.active) {
        const dx = e.clientX - drag.startX;
        if (Math.abs(dx) > 4) drag.moved = true;
        look.manualYaw = drag.startYaw - (dx / p.w) * 2.4;
        tp.lastInput = performance.now();
      } else if (e.pointerType === "mouse") {
        const half = state.view === "mono" ? p.w : p.w / 2;
        look.nx = Math.max(-1, Math.min(1, ((p.x % half) / half) * 2 - 1));
        look.ny = Math.max(-1, Math.min(1, -((p.y / p.h) * 2 - 1)));
        look.hover = true;
      }
      if (reduced) {
        cam.yaw = look.base + look.manualYaw - (look.hover ? look.nx * 0.95 : 0);
        cam.pitch = look.hover ? look.ny * 0.4 : 0;
        render();
      }
    };
    const onDown = (e: PointerEvent) => {
      drag.active = true;
      drag.moved = false;
      drag.startX = e.clientX;
      drag.startYaw = look.manualYaw;
      if (e.pointerType !== "mouse") look.hover = false;
    };
    const onUp = (e: PointerEvent) => {
      if (!drag.active) return;
      drag.active = false;
      if (drag.moved) return;
      // a click on a waypoint ring jumps there; anywhere else advances the tour
      const p = local(e);
      let best = -1;
      let bestD = 36;
      for (const eye of eyes()) {
        if (p.x < eye.x0 || p.x > eye.x0 + eye.w) continue;
        waypoints.forEach((w, i) => {
          const s = project([w.x, 0, w.z], cam, eye);
          if (!s) return;
          const d = Math.hypot(s[0] - p.x, s[1] - p.y);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
      }
      teleportTo(best >= 0 ? best : state.gazeWp >= 0 ? state.gazeWp : (tp.current + 1) % waypoints.length);
    };
    const onLeave = () => {
      look.hover = false;
      drag.active = false;
    };
    const onKey = (e: KeyboardEvent) => {
      const handled = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " "].includes(e.key) || /^[1-4]$/.test(e.key);
      if (!handled) return;
      e.preventDefault();
      tp.lastInput = performance.now();
      if (e.key === "ArrowLeft") look.manualYaw += 0.25;
      if (e.key === "ArrowRight") look.manualYaw -= 0.25;
      if (e.key === "ArrowUp") look.manualPitch = Math.min(0.5, look.manualPitch + 0.1);
      if (e.key === "ArrowDown") look.manualPitch = Math.max(-0.5, look.manualPitch - 0.1);
      if (e.key === "Enter" || e.key === " ") teleportTo((tp.current + 1) % waypoints.length);
      if (/^[1-4]$/.test(e.key)) teleportTo(Number(e.key) - 1);
      if (reduced) {
        cam.yaw = look.base + look.manualYaw;
        cam.pitch = look.manualPitch;
        render();
      }
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("keydown", onKey);

    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { rootMargin: "100px 0px" });
    io.observe(el);
    const ro = new ResizeObserver(() => {
      size();
      render();
    });
    ro.observe(canvas);
    size();
    render();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("keydown", onKey);
    };
  }, []);

  const toggle = "label h-7 border px-2 transition-colors duration-300";
  return (
    <figure className="border border-line bg-bg/70">
      <div className="label flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-3 py-2 text-fg-3">
        <span>
          Fig. <span className="tabular text-fg-2">L.02</span> — Virtual visit, {view} model
        </span>
        <span className="flex items-center gap-1.5" role="group" aria-label="View options">
          {(["stereo", "mono"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`${toggle} ${view === v ? "border-accent/60 text-fg" : "border-line text-fg-3 hover:text-fg"}`}
            >
              {v}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={guides}
            onClick={() => setGuides((g) => !g)}
            className={`${toggle} ml-1.5 ${guides ? "border-accent/60 text-fg" : "border-line text-fg-3 hover:text-fg"}`}
          >
            Guides
          </button>
        </span>
      </div>

      <div
        ref={wrap}
        tabIndex={0}
        role="group"
        aria-label="Virtual visit viewer. Drag or use the arrow keys to look around, press Enter to teleport, or 1 to 4 to jump to a waypoint."
        className="relative p-2 outline-none focus-visible:ring-1 focus-visible:ring-accent sm:p-3"
      >
        <canvas
          ref={cvs}
          className="block aspect-[16/10] w-full cursor-crosshair touch-pan-y sm:aspect-[2.4/1]"
          role="img"
          aria-label="Headset view of a wireframe virtual visit: three connected rooms with rotating exhibits, signage, a controller, teleport waypoints and a gaze reticle."
        />
        {view === "stereo" && (
          <>
            <span className="label pointer-events-none absolute left-5 top-5 text-fg-3 sm:left-7 sm:top-6" aria-hidden="true">
              L
            </span>
            <span className="label pointer-events-none absolute right-5 top-5 text-fg-3 sm:right-7 sm:top-6" aria-hidden="true">
              R
            </span>
          </>
        )}
      </div>

      <div className="grid gap-x-6 gap-y-3 border-t border-line px-3 py-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
        {/* plan view: forward runs left → right */}
        <svg viewBox={`-6 ${-4 * PLAN} ${26 * PLAN} ${8 * PLAN}`} className="h-16 w-full max-w-md" aria-label="Plan of the visit">
          {rooms.map((r) => (
            <g key={r.code}>
              <rect x={-r.z0 * PLAN} y={-3.5 * PLAN} width={(r.z0 - r.z1) * PLAN} height={7 * PLAN} fill="none" stroke="var(--color-line-2)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <text x={-r.z0 * PLAN + 4} y={-2.6 * PLAN} className="fill-fg-3 font-mono text-[9px] uppercase">
                {r.code}
              </text>
            </g>
          ))}
          <line x1={0} x2={24 * PLAN} y1={0} y2={0} stroke="var(--color-line)" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
          {waypoints.map((w, i) => (
            <g
              key={i}
              role="button"
              tabIndex={0}
              aria-label={`Teleport to waypoint ${i + 1}`}
              aria-current={i === wp ? "location" : undefined}
              onClick={() => api.current.teleportTo(i)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), api.current.teleportTo(i))}
              className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-accent"
            >
              <circle cx={-w.z * PLAN} cy={w.x * PLAN} r={7} fill={i === wp ? "var(--color-accent)" : "var(--color-bg)"} stroke={i === wp ? "var(--color-accent)" : "var(--color-fg-3)"} vectorEffect="non-scaling-stroke" />
              <circle cx={-w.z * PLAN} cy={w.x * PLAN} r={16} fill="transparent" />
            </g>
          ))}
          <g ref={player} className="pointer-events-none">
            <path d="M0 0 L22 -11 A 25 25 0 0 1 22 11 Z" fill="var(--color-accent-glow)" stroke="var(--color-accent)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <circle r={3} fill="var(--color-fg)" />
          </g>
        </svg>

        <dl className="label grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-fg-3 sm:grid-cols-[auto_auto_auto_auto]">
          <dt>Room</dt>
          <dd className="text-fg-2">
            <span ref={(n) => void (tele.current.room = n)}>A · Entrance</span>
          </dd>
          <dt>Pos</dt>
          <dd className="tabular text-fg-2">
            <span ref={(n) => void (tele.current.pos = n)}>0.0, -4.5</span>
          </dd>
          <dt>Head</dt>
          <dd className="tabular text-fg-2">
            <span ref={(n) => void (tele.current.head = n)}>—</span>
          </dd>
          <dt>Frame</dt>
          <dd className="tabular text-fg-2">
            <span ref={(n) => void (tele.current.frame = n)}>—</span>
          </dd>
        </dl>

        <div className="flex items-center justify-between gap-4 md:justify-end">
          <p className="label text-fg-3" aria-live="polite">
            Waypoint <span className="tabular text-accent">{String(wp + 1).padStart(2, "0")}</span> / {String(waypoints.length).padStart(2, "0")}
          </p>
          <button
            type="button"
            onClick={() => api.current.next()}
            className="label btn-line inline-flex h-9 items-center gap-2 border border-line-2 px-3 text-fg transition-colors duration-300 hover:text-accent-light"
          >
            Teleport <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
      <figcaption className="label border-t border-line px-3 py-2 text-fg-3">
        Model, not a capture · drag or arrow keys to look · click a ring or press 1–4 to jump · gaze at ◇ to open info
      </figcaption>
    </figure>
  );
}
