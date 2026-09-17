import type { ComponentType } from "react";
import type { Project } from "@/lib/content";
import CaseFocus from "./CaseFocus";
import LivePreview from "./LivePreview";
import DproDiagram from "./DproDiagram";
import FactoryDiagram from "./FactoryDiagram";
import FitDiagram from "./FitDiagram";
import TranscendenceDiagram from "./TranscendenceDiagram";
import VamoDiagram from "./VamoDiagram";

const diagrams: Record<string, ComponentType> = {
  factory: FactoryDiagram,
  dpro: DproDiagram,
  vamo: VamoDiagram,
  transcendence: TranscendenceDiagram,
  fit: FitDiagram,
};

const total = "05";

/**
 * Focus styling per case study. `CaseFocus` sets `data-focus` on the article;
 * these rules dim everything else in the diagram and in the reading column.
 */
function focusCss(p: Project) {
  const id = `#work-${p.id}`;
  const keys = p.beats.map((b) => b.focus);
  return [
    `${id}[data-focus] .dg [data-k]{opacity:.4}`,
    `${id}[data-focus] [data-beat]{opacity:.6}`,
    ...keys.map((key) =>
      [
        `${id}[data-focus="${key}"] .dg [data-k="${key}"]{opacity:1}`,
        `${id}[data-focus="${key}"] .dg [data-k="${key}"] .node{stroke:var(--color-fg)}`,
        `${id}[data-focus="${key}"] .dg [data-k="${key}"] text{fill:var(--color-fg)}`,
        `${id}[data-focus="${key}"] .dg [data-k="${key}"] .edge{stroke:var(--color-fg-2)}`,
        `${id}[data-focus="${key}"] [data-beat="${key}"]{opacity:1}`,
      ].join(""),
    ),
  ].join("");
}

function Meta({ p }: { p: Project }) {
  return (
    <dl className="grid grid-cols-[5.5rem_1fr] gap-x-4 gap-y-3 border-t border-line pt-4">
      <dt className="label pt-0.5 text-fg-3">Role</dt>
      <dd className="text-[0.95rem] leading-[1.4] text-fg">{p.role}</dd>
      <dt className="label pt-0.5 text-fg-3">Stack</dt>
      <dd className="label pt-0.5 leading-relaxed text-fg-2">{p.stack.join(" · ")}</dd>
      {p.live && (
        <>
          <dt className="label pt-0.5 text-fg-3">Live</dt>
          <dd className="label pt-0.5">
            <a href={p.live.href} target="_blank" rel="noreferrer" className="link-line text-accent-light">
              {p.live.label} ↗
            </a>
          </dd>
        </>
      )}
      {(p.org || p.status) && (
        <>
          <dt className="label pt-0.5 text-fg-3">{p.org ? "At" : "Status"}</dt>
          <dd className="label pt-0.5 text-fg-2">{p.org ?? p.status}</dd>
        </>
      )}
    </dl>
  );
}

function Label({ p, i, text }: { p: Project; i: number; text: string }) {
  return (
    <p className="label text-fg-3">
      <span className="tabular text-accent">
        {p.n}.{i + 1}
      </span>{" "}
      — {text}
    </p>
  );
}

export default function ProjectCase({ project: p, flip }: { project: Project; flip: boolean }) {
  const Diagram = diagrams[p.id];
  const articleProps = {
    id: `work-${p.id}`,
    "data-project": p.n,
    "data-title": p.title,
    "aria-labelledby": `t-${p.id}`,
    className: "relative border-t border-line",
  };
  const style = <style dangerouslySetInnerHTML={{ __html: focusCss(p) }} />;

  if (p.scale === "minor") {
    return (
      <article {...articleProps}>
        {style}
        <div className="wrap grid grid-cols-12 gap-x-5 gap-y-10 py-20 md:py-28">
          <header className="col-span-12 flex flex-col gap-6 md:col-span-4">
            <p className="label text-fg-3">
              <span className="tabular text-accent">{p.n}</span> / {total} — {p.kind}
            </p>
            <h3 id={`t-${p.id}`} data-reveal="mask" className="display text-[clamp(4rem,9vw,9rem)]">
              {p.title}
            </h3>
            <p data-reveal="fade" className="text-[clamp(1.1rem,1.5vw,1.35rem)] leading-[1.45] text-fg-2">
              {p.lede}
            </p>
            <Meta p={p} />
          </header>
          <div className="col-span-12 md:col-span-8 md:col-start-5">
            <div className="aspect-[640/400] w-full">
              <Diagram />
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {p.beats.map((b, i) => (
                <div key={b.label} data-beat-hover={b.focus} className="border-t border-line pt-4">
                  <Label p={p} i={i} text={b.label} />
                  <p className="mt-3 text-[1.05rem] leading-[1.5] text-fg">{b.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <CaseFocus target={articleProps.id} />
      </article>
    );
  }

  const titleSize = `min(12.5vw, ${((100 / p.title.length) * 1.55).toFixed(2)}vw)`;

  return (
    <article {...articleProps}>
      {style}
      <header className="wrap grid grid-cols-12 gap-x-5 pb-12 pt-10 md:pb-20 md:pt-14">
        <p className="label col-span-12 flex justify-between gap-4 text-fg-3">
          <span>
            <span className="tabular text-accent">{p.n}</span> / {total} — {p.kind}
          </span>
          {p.org && <span className="hidden sm:inline">{p.org}</span>}
        </p>
        <h3 id={`t-${p.id}`} data-reveal="mask" className="display col-span-12 mt-8 md:mt-12" style={{ fontSize: `max(2rem, ${titleSize})` }}>
          {p.title}
        </h3>
        <p
          data-reveal="fade"
          className="col-span-12 mt-8 max-w-[38ch] text-[clamp(1.2rem,1.9vw,1.75rem)] leading-[1.35] tracking-[-0.015em] text-fg-2 md:col-span-6 md:mt-10"
        >
          {p.lede}
        </p>
        <div data-reveal="fade" className="col-span-12 mt-8 md:col-span-4 md:col-start-9 md:mt-10" style={{ "--d": 120 } as React.CSSProperties}>
          <Meta p={p} />
        </div>
      </header>

      <div className="wrap pb-10 md:grid md:grid-cols-12 md:gap-x-5 md:pb-24">
        {/* `contents` on mobile lets the figure stick across the whole case study. */}
        <div className={`contents md:block md:col-span-7 ${flip ? "md:order-2 md:col-start-6" : ""}`}>
          <div className="sticky top-[var(--nav-h)] z-10 -mx-[var(--gutter)] h-[48svh] bg-bg px-[var(--gutter)] pb-3 pt-2 md:top-[calc(var(--nav-h)+1.5rem)] md:mx-0 md:h-[calc(100svh-var(--nav-h)-3rem)] md:bg-transparent md:p-0">
            <Diagram />
          </div>
        </div>

        <div className={`md:col-span-4 ${flip ? "md:order-1 md:col-start-1" : "md:col-start-9"}`}>
          {p.beats.map((b, i) => (
            <div
              key={b.label}
              data-beat={b.focus}
              className="flex min-h-[46svh] flex-col justify-center py-10 transition-opacity duration-700 md:min-h-[78svh]"
            >
              <Label p={p} i={i} text={b.label} />
              {b.body && <p className="mt-5 text-[clamp(1.3rem,1.85vw,1.7rem)] leading-[1.35] tracking-[-0.02em]">{b.body}</p>}
              {b.points && (
                <ol className="mt-5">
                  {b.points.map((pt, j) => (
                    <li key={j} className="grid grid-cols-[2.25rem_1fr] border-t border-line py-4 text-[1.05rem] leading-[1.5] text-fg">
                      <span className="label tabular pt-1 text-fg-3">{String(j + 1).padStart(2, "0")}</span>
                      {pt}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      </div>
      {p.live && <LivePreview project={p} />}
      <CaseFocus target={articleProps.id} />
    </article>
  );
}
