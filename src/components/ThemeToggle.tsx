"use client";

import { useEffect, useState } from "react";

type Preference = "system" | "light" | "dark";
const modes: Preference[] = ["system", "light", "dark"];

export default function ThemeToggle() {
  const [preference, setPreference] = useState<Preference>("system");

  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const root = document.documentElement;
    const apply = (mode: Preference) => {
      root.dataset.themePreference = mode;
      const resolved = mode === "system" ? (media.matches ? "dark" : "light") : mode;
      root.dataset.theme = resolved;
      document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
        meta.content = resolved === "dark" ? "#0c0c0b" : "#f5f3ee";
      });
      setPreference(mode);
    };
    const read = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem("portfolio-theme"); } catch {}
      apply(saved === "light" || saved === "dark" ? saved : "system");
    };
    const onSystem = () => {
      if (root.dataset.themePreference === "system") apply("system");
    };
    const onChange = () => apply(root.dataset.themePreference as Preference);
    const onStorage = (event: StorageEvent) => {
      if (event.key === "portfolio-theme" || event.key === null) read();
    };
    read();
    media.addEventListener("change", onSystem);
    window.addEventListener("theme:change", onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onSystem);
      window.removeEventListener("theme:change", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const next = modes[(modes.indexOf(preference) + 1) % modes.length];
  return (
    <button
      type="button"
      className="label inline-flex h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center gap-2.5 border-l border-line-2 pl-3 text-fg-2 transition-colors hover:text-accent sm:pl-4"
      aria-label={`Theme: ${preference}. Switch to ${next} theme`}
      title={`Theme: ${preference} · Switch to ${next}`}
      onClick={() => {
        try {
          if (next === "system") localStorage.removeItem("portfolio-theme");
          else localStorage.setItem("portfolio-theme", next);
        } catch {}
        document.documentElement.dataset.themePreference = next;
        window.dispatchEvent(new Event("theme:change"));
      }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {preference === "system" ? <><rect x="3" y="4" width="18" height="13" rx="1.5" /><path d="M8 21h8M12 17v4" /></> : preference === "light" ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></> : <path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z" />}
      </svg>
      <span className="hidden w-[6ch] text-left lg:inline" aria-hidden="true">{preference}</span>
    </button>
  );
}
