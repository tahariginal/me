"use client";

import { useState } from "react";
import { method, projects, strata, strengths } from "@/lib/content";

const nameOf = (ref: string) => (ref === "42" ? "42 Network (1337)" : projects.find((p) => p.n === ref)?.title ?? ref);
const hrefOf = (ref: string) => (ref === "42" ? "#experience" : `#work-${projects.find((p) => p.n === ref)?.id}`);

export default function System() {
  const [sel, setSel] = useState<{ name: string; used?: string[] } | null>(null);

  return (
    <section id="system" aria-labelledby="system-title" className="relative">
      <div className="wrap grid grid-cols-12 gap-x-5 pb-16 pt-28 md:pb-20 md:pt-40">
        <p className="label col-span-12 text-fg-3">
          <span className="text-accent">03</span> / System
        </p>
        <h2 id="system-title" data-reveal="mask" className="display col-span-12 mt-8 text-[clamp(2.6rem,6.6vw,7.5rem)]">
          The stack, in cross-section.
        </h2>
        <p data-reveal="fade" className="col-span-12 mt-8 max-w-[42ch] text-[clamp(1.1rem,1.5vw,1.35rem)] leading-[1.45] text-fg-2 md:col-span-6">
          Grouped by where each piece sits relative to the surface. Select a technology to trace it back to the work.
        </p>
      </div>

      <div className="wrap">
        <div className="grid grid-cols-12 gap-x-5">
          <div className="col-span-12 lg:col-span-9">
            {strata.map((s, i) => (
              <div key={s.id} className="relative">
                {i === 1 && (
                  <div className="label flex items-center gap-4 py-3 text-accent" aria-hidden="true">
                    <span data-reveal="line" className="block h-px flex-1 bg-accent" />
                    Surface
                    <span data-reveal="line" className="block h-px flex-1 bg-accent" />
                  </div>
                )}
                <div className={`grid grid-cols-12 gap-x-5 gap-y-4 py-8 md:py-10 ${i !== 1 ? "border-t border-line" : ""}`}>
                  <div className="col-span-12 md:col-span-4">
                    <h3 className="label text-fg">
                      <span className="tabular text-fg-3">{String(i + 1).padStart(2, "0")}</span>&nbsp;&nbsp;{s.name}
                    </h3>
                    <p className="label mt-2 text-fg-3 normal-case tracking-normal">{s.note}</p>
                  </div>
                  <ul className="col-span-12 flex flex-wrap items-baseline gap-x-1 gap-y-2 md:col-span-8">
                    {s.items.map((t, j) => {
                      const on = sel?.name === t.name;
                      const dim = sel !== null && !on;
                      return (
                        <li key={t.name} className="flex items-baseline">
                          <button
                            type="button"
                            aria-pressed={on}
                            onClick={() => setSel(t)}
                            onPointerEnter={(e) => e.pointerType === "mouse" && setSel(t)}
                            onFocus={() => setSel(t)}
                            className={`group relative text-left text-[clamp(1.45rem,2.5vw,2.35rem)] font-normal leading-[1.1] tracking-[-0.035em] transition-[color,opacity] duration-300 ${
                              on ? "text-fg" : dim ? "text-fg-3" : "text-fg"
                            }`}
                          >
                            {t.name}
                            {t.used && (
                              <sup className={`label ml-1 align-top tabular transition-colors ${on ? "text-accent" : "text-fg-3"}`}>
                                {t.used.join(" ")}
                              </sup>
                            )}
                          </button>
                          {j < s.items.length - 1 && (
                            <span className="mx-2.5 text-[clamp(1.45rem,2.5vw,2.35rem)] font-light text-fg-3/60" aria-hidden="true">
                              /
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ))}
            <p className="label border-t border-line pt-4 text-fg-3">Also — Unity · C# (VR internship, UM6P)</p>
          </div>

          {/* Trace readout */}
          <aside className="sticky bottom-3 z-20 col-span-12 mt-6 self-end lg:static lg:col-span-3 lg:mt-0 lg:self-stretch" aria-label="Technology trace">
            <div className="border border-line bg-bg p-4 lg:sticky lg:top-[calc(var(--nav-h)+1.5rem)] lg:bg-transparent" onPointerLeave={() => setSel(null)}>
              <p className="label flex justify-between text-fg-3">
                <span>Trace</span>
                <span className="tabular">{sel ? "1 selected" : "idle"}</span>
              </p>
              <div aria-live="polite" className="mt-3 min-h-[3.25rem] lg:mt-6 lg:min-h-[8.5rem]">
                {sel ? (
                  <>
                    <p className="text-xl font-medium tracking-[-0.03em] lg:text-2xl">{sel.name}</p>
                    {sel.used ? (
                      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 lg:mt-4 lg:block lg:space-y-2">
                        {sel.used.map((r) => (
                          <li key={r}>
                            <a href={hrefOf(r)} className="label link-line text-fg-2 hover:text-fg">
                              <span className="tabular text-accent">{r === "42" ? "L.03" : r}</span> {nameOf(r)}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="label mt-4 text-fg-3">Part of the toolkit — not tied to a listed project.</p>
                    )}
                  </>
                ) : (
                  <p className="label text-fg-3">Hover, tap or tab through the stack. Superscripts reference project numbers.</p>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* Method */}
        <div className="grid grid-cols-12 gap-x-5 pb-10 pt-28 md:pt-36">
          <div className="col-span-12 md:col-span-3">
            <p className="label text-fg-3">Method</p>
            <h3 data-reveal="mask" className="mt-4 text-[clamp(1.8rem,3vw,2.75rem)] font-medium leading-[0.95] tracking-[-0.035em]">
              How I approach a build.
            </h3>
          </div>
          <ol className="col-span-12 mt-10 grid gap-x-5 sm:grid-cols-2 md:col-span-9 md:mt-0 lg:grid-cols-4">
            {method.map((m, i) => (
              <li key={m.n} className="relative pb-8 pt-6" data-reveal="fade" style={{ "--d": i * 90 } as React.CSSProperties}>
                <span data-reveal="line" className="absolute inset-x-0 top-0 block h-px bg-line-2" style={{ "--d": i * 90 } as React.CSSProperties} aria-hidden="true" />
                <span className="absolute left-0 top-0 block size-1.5 -translate-y-1/2 bg-accent" aria-hidden="true" />
                <p className="label tabular text-fg-3">{m.n}</p>
                <p className="mt-6 text-[1.2rem] font-medium leading-tight tracking-[-0.02em]">{m.title}</p>
                <p className="mt-3 text-[1rem] leading-relaxed text-fg-2">{m.body}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Strengths */}
        <div className="grid grid-cols-12 gap-x-5 pb-24 pt-10 md:pb-32">
          <p className="label col-span-12 text-fg-3 md:col-span-3">Engineering strengths</p>
          <ul className="col-span-12 mt-6 grid sm:grid-cols-2 md:col-span-9 md:mt-0 lg:grid-cols-3">
            {strengths.map((s, i) => (
              <li key={s} className="flex items-baseline gap-4 border-t border-line py-4 pr-4 text-[1.05rem] text-fg">
                <span className="label tabular text-fg-3">{String(i + 1).padStart(2, "0")}</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
