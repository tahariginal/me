import type { Project } from "@/lib/content";

/** A slim link row to a project's live product, opened in a new tab. */
export default function LivePreview({ project: p }: { project: Project }) {
  const live = p.live;
  if (!live) return null;

  return (
    <div className="wrap pb-20 md:pb-28">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-line pt-6">
        <p className="label flex items-center gap-3 text-fg-3">
          <span className="tabular text-accent">
            {p.n}.{p.beats.length + 1}
          </span>
          — Live
          <span className="normal-case tracking-normal text-fg-2">{live.label}</span>
        </p>
        <a
          href={live.href}
          target="_blank"
          rel="noreferrer"
          className="label btn-line inline-flex h-11 items-center gap-3 border border-line-2 px-5 text-fg transition-colors duration-300 hover:text-accent-light"
        >
          Visit landing page <span aria-hidden="true">↗</span>
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </div>
  );
}
