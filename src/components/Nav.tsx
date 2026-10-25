"use client";

import { useEffect, useRef, useState } from "react";
import { sections, type SectionId } from "@/lib/content";

export default function Nav() {
  const [active, setActive] = useState<SectionId>("index");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id as SectionId);
      },
      { rootMargin: "-48% 0px -51% 0px" },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    document.documentElement.style.overflow = "hidden";
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuBtn.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = sections.find((s) => s.id === active) ?? sections[0];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-700 ${
        scrolled && !open ? "border-b border-line bg-bg" : "border-b border-transparent"
      }`}
    >
      <a
        href="#work"
        className="label sr-only z-[60] bg-fg px-3 py-2 text-bg focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to work
      </a>
      <nav aria-label="Primary" className="wrap flex h-[var(--nav-h)] items-center justify-between">
        <a href="#index" className="label flex items-center gap-3 text-fg" onClick={() => setOpen(false)}>
          <span className="inline-block size-1.5 bg-accent" aria-hidden="true" />
          Taha Koulal
          <span className="hidden text-fg-3 sm:inline">/ 2026</span>
        </a>

        <ul className="hidden items-center gap-7 md:flex">
          {sections.map((s) => {
            const on = s.id === active;
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  aria-current={on ? "location" : undefined}
                  className={`label group relative flex items-center gap-2 py-2 transition-colors duration-300 ${
                    on ? "text-fg" : "text-fg-3 hover:text-fg"
                  }`}
                >
                  <span className={`tabular transition-colors ${on ? "text-accent" : ""}`}>{s.n}</span>
                  <span className="link-line">{s.label}</span>
                  <span
                    aria-hidden="true"
                    className={`absolute -bottom-px left-0 h-px bg-accent transition-[width] duration-700 ease-[var(--ease-out-expo)] ${
                      on ? "w-full" : "w-0"
                    }`}
                  />
                </a>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-4 md:hidden">
          <span className="label tabular text-fg-3" aria-hidden="true">
            <span className="text-accent">{current.n}</span> {current.label}
          </span>
          <button
            ref={menuBtn}
            type="button"
            className="label -mr-2 flex h-11 items-center gap-2 px-2 text-fg"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Close" : "Menu"}
            <span aria-hidden="true" className="relative block h-2 w-4">
              <span className={`absolute left-0 h-px w-4 bg-fg transition-transform duration-500 ${open ? "top-1 rotate-45" : "top-0"}`} />
              <span className={`absolute left-0 h-px w-4 bg-fg transition-transform duration-500 ${open ? "top-1 -rotate-45" : "top-2"}`} />
            </span>
          </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        hidden={!open}
        className="fixed inset-x-0 bottom-0 top-[var(--nav-h)] z-40 overflow-y-auto bg-bg md:hidden"
      >
        <ul className="wrap flex min-h-full flex-col justify-end gap-1 pb-10 pt-8">
          {sections.map((s, i) => (
            <li key={s.id} className="border-t border-line">
              <a
                ref={i === 0 ? firstLink : undefined}
                href={`#${s.id}`}
                onClick={() => setOpen(false)}
                aria-current={s.id === active ? "location" : undefined}
                className="flex items-baseline justify-between py-3"
              >
                <span className="display text-[13vw] leading-none">{s.label}</span>
                <span className={`label tabular ${s.id === active ? "text-accent" : "text-fg-3"}`}>{s.n}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
