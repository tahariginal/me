"use client";

import { useEffect, useRef } from "react";

/** Runs the parent figure's SMIL animations only while it is on screen. */
export default function Playback() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const svg = ref.current?.closest("figure")?.querySelector("svg");
    if (!svg) return;
    svg.pauseAnimations();
    svg.classList.add("dg-paused");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      svg.setCurrentTime(1.2);
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) svg.unpauseAnimations();
      else svg.pauseAnimations();
      svg.classList.toggle("dg-paused", !e.isIntersecting);
    });
    io.observe(svg);
    return () => io.disconnect();
  }, []);

  return <span ref={ref} hidden />;
}
