"use client";

import { useRef } from "react";
import { ease, seg, useScrollProgress } from "@/lib/useScrollProgress";

const type = "block text-[clamp(2.9rem,9.6vw,11.5rem)]";

/**
 * The thesis of the site, pinned while the point field collapses edge-on into
 * a line. The hairline sits at the exact vertical centre, where the field's
 * surface plane projects when the camera pitch passes through zero.
 */
export default function Manifesto() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const depth = useRef<HTMLSpanElement>(null);

  useScrollProgress(root, ({ pinned, reduced }) => {
    const s = stage.current;
    if (!s) return;
    if (reduced) {
      // Static composition: everything in place, nothing fades.
      for (const v of ["--line", "--below", "--above"]) s.style.setProperty(v, "1");
      s.style.setProperty("--out", "0");
      return;
    }
    s.style.setProperty("--line", ease(seg(pinned, 0.02, 0.28)).toFixed(4));
    s.style.setProperty("--below", ease(seg(pinned, 0.14, 0.44)).toFixed(4));
    s.style.setProperty("--above", ease(seg(pinned, 0.44, 0.74)).toFixed(4));
    s.style.setProperty("--out", ease(seg(pinned, 0.88, 1)).toFixed(4));
    if (depth.current) depth.current.textContent = String(Math.round(pinned * 100)).padStart(3, "0");
  });

  return (
    <section id="surface" ref={root} aria-labelledby="surface-title" className="relative h-[260svh] md:h-[300svh]">
      <div
        ref={stage}
        className="sticky top-0 grid h-svh overflow-hidden"
        style={{ "--line": 0, "--below": 0, "--above": 0, "--out": 0 } as React.CSSProperties}
      >
        <h2
          id="surface-title"
          className="display wrap grid grid-rows-[1fr_auto_auto_auto_1fr] uppercase"
          style={{ opacity: "calc(1 - var(--out) * 0.9)" }}
        >
          {/* DOM order reads as the thesis; grid rows place products above the line. */}
          <span className="row-start-5 flex flex-col items-end overflow-hidden text-right">
            <span className={`${type} pt-[0.06em] text-fg-2`} style={{ transform: "translate3d(0, calc((1 - var(--below)) * -102%), 0)" }}>
              Systems under
              <br />
              the surface.
            </span>
          </span>
          <span className="row-start-1 flex flex-col justify-end overflow-hidden">
            <span className={`${type} pb-[0.02em]`} style={{ transform: "translate3d(0, calc((1 - var(--above)) * 102%), 0)" }}>
              Products
              <br />
              above it.
            </span>
          </span>

          <span aria-hidden="true" className="label row-start-2 flex h-9 items-end justify-end pb-2.5 text-fg-3" style={{ opacity: "var(--above)" }}>
            ↑ Interfaces · flows · people
          </span>
          <span aria-hidden="true" className="row-start-3 block h-px origin-left bg-fg" style={{ transform: "scaleX(var(--line))" }} />
          <span aria-hidden="true" className="label row-start-4 flex h-9 items-start pt-2.5 text-fg-3" style={{ opacity: "var(--below)" }}>
            ↓ Services · data · realtime · agents
          </span>
        </h2>

        <p className="wrap label absolute inset-x-0 bottom-5 flex justify-between text-fg-3" aria-hidden="true">
          <span>
            Depth <span ref={depth} className="tabular text-fg-2">000</span>
          </span>
          <span>Selected work ↓</span>
        </p>
      </div>
    </section>
  );
}
