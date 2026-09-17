import type { ReactNode } from "react";
import Playback from "./Playback";

type Props = {
  n: string;
  title: string;
  caption: string;
  viewBox: string;
  children: ReactNode;
};

/** Frame for a project diagram. Rendered on the server; only playback control ships JS. */
export default function Figure({ n, title, caption, viewBox, children }: Props) {
  return (
    <figure className="relative flex h-full flex-col border border-line bg-bg/70">
      <div className="label flex items-center justify-between gap-4 border-b border-line px-3 py-2.5 text-fg-3">
        <span>
          Fig. <span className="tabular text-fg-2">{n}</span> — {title}
        </span>
        <span className="hidden items-center gap-2 sm:flex" aria-hidden="true">
          <span className="size-1.5 animate-[blink_1.6s_steps(1)_infinite] bg-accent" />
          Live model
        </span>
      </div>
      <div className="relative min-h-0 flex-1 p-1.5 sm:p-5">
        <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" className="dg size-full overflow-visible" role="img" aria-label={caption}>
          {children}
        </svg>
      </div>
      <figcaption className="label hidden border-t border-line px-3 py-2.5 text-fg-3 sm:block">{caption}</figcaption>
      <Playback />
    </figure>
  );
}

/** Marks a diagram group that can be brought into focus by a reading beat. */
export const k = (key: string) => ({ "data-k": key });
