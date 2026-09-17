"use client";

import { useEffect, useRef, useState } from "react";

/** Fixed project index shown while reading the work section (desktop). */
export default function WorkHud({ count }: { count: number }) {
  const [current, setCurrent] = useState<{ n: string; title: string } | null>(null);
  const [visible, setVisible] = useState(false);
  const bar = useRef<HTMLSpanElement>(null);
  const activeEl = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const section = document.getElementById("work");
    const articles = document.querySelectorAll<HTMLElement>("[data-project]");
    if (!section) return;

    const sectionIo = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "-50% 0px -50% 0px" });
    sectionIo.observe(section);

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          if (activeEl.current !== el) {
            activeEl.current = el;
            setCurrent({ n: el.dataset.project ?? "", title: el.dataset.title ?? "" });
            window.dispatchEvent(new Event("field:pulse"));
          }
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    articles.forEach((a) => io.observe(a));

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = activeEl.current;
        if (!el || !bar.current) return;
        const r = el.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (window.innerHeight * 0.5 - r.top) / r.height));
        bar.current.style.transform = `scaleX(${p.toFixed(4)})`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      sectionIo.disconnect();
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`label pointer-events-none fixed left-[calc(var(--gutter)+13rem)] top-0 z-[55] hidden h-[var(--nav-h)] w-64 flex-col justify-center transition-[opacity,transform] duration-700 ease-[var(--ease-out-expo)] xl:flex ${
        visible && current ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3 text-fg-3">
        <span>Selected work</span>
        <span className="tabular">
          <span className="text-accent">{current?.n ?? "01"}</span> / {String(count).padStart(2, "0")}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-3">
        <span className="relative block h-px flex-1 bg-line">
          <span ref={bar} className="absolute inset-0 origin-left scale-x-0 bg-accent" />
        </span>
        <span className="text-fg">{current?.title}</span>
      </div>
    </div>
  );
}
