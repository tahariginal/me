"use client";

import { useEffect } from "react";

/**
 * One observer for every `[data-reveal]` element on the page.
 * Masked elements are fully clipped (zero intersection area), so their parent
 * is observed instead.
 */
export default function Reveal() {
  useEffect(() => {
    const targets = new Map<Element, HTMLElement[]>();
    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
      const t = el.dataset.reveal === "mask" && el.parentElement ? el.parentElement : el;
      targets.set(t, [...(targets.get(t) ?? []), el]);
    });
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          targets.get(e.target)?.forEach((el) => el.classList.add("is-in"));
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    targets.forEach((_, t) => io.observe(t));
    return () => io.disconnect();
  }, []);
  return null;
}
