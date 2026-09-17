"use client";

import { useEffect, useRef, type RefObject } from "react";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

type Progress = {
  /** Progress across the element's scrollable (sticky) distance. */
  pinned: number;
  /** Progress from the element's top entering to its bottom leaving. */
  pass: number;
  reduced: boolean;
};

/** Calls `onProgress` on animation frames while the element is on screen, only when it has moved. */
export function useScrollProgress(ref: RefObject<HTMLElement | null>, onProgress: (p: Progress) => void) {
  // Callbacks are expected to write to refs/DOM only, so the first one is kept.
  const cb = useRef(onProgress);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cb.current({ pinned: 1, pass: 0.5, reduced: true });
      return;
    }

    let raf = 0;
    let lastKey = "";
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const vh = window.innerHeight;
      const rect = el.getBoundingClientRect();
      const key = `${rect.top.toFixed(1)}|${vh}`;
      if (key === lastKey) return;
      lastKey = key;
      cb.current({
        pinned: clamp01(-rect.top / Math.max(1, rect.height - vh)),
        pass: clamp01((vh - rect.top) / (rect.height + vh)),
        reduced: false,
      });
    };

    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf);
      lastKey = "";
      // Run one frame either way so the final state is applied when leaving.
      raf = requestAnimationFrame(e.isIntersecting ? tick : () => (tick(), cancelAnimationFrame(raf)));
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [ref]);
}

export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
export const ease = (t: number) => 1 - Math.pow(1 - t, 3);
