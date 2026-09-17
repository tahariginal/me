"use client";

import { useEffect } from "react";

/**
 * Sets `data-focus` on a case study as its beats are read (scroll) or pointed
 * at (hover/focus). Styling of the focused diagram group is pure CSS.
 */
export default function CaseFocus({ target }: { target: string }) {
  useEffect(() => {
    const el = document.getElementById(target);
    if (!el) return;
    const set = (v?: string) => {
      if (v) el.dataset.focus = v;
      else delete el.dataset.focus;
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) set((e.target as HTMLElement).dataset.beat);
      },
      { rootMargin: "-42% 0px -42% 0px" },
    );
    el.querySelectorAll<HTMLElement>("[data-beat]").forEach((b) => io.observe(b));

    const hovers = el.querySelectorAll<HTMLElement>("[data-beat-hover]");
    const enter = (ev: Event) => set((ev.currentTarget as HTMLElement).dataset.beatHover);
    const leave = () => set();
    hovers.forEach((h) => {
      h.addEventListener("pointerenter", enter);
      h.addEventListener("pointerleave", leave);
      h.addEventListener("focusin", enter);
      h.addEventListener("focusout", leave);
    });

    return () => {
      io.disconnect();
      hovers.forEach((h) => {
        h.removeEventListener("pointerenter", enter);
        h.removeEventListener("pointerleave", leave);
        h.removeEventListener("focusin", enter);
        h.removeEventListener("focusout", leave);
      });
    };
  }, [target]);

  return null;
}
