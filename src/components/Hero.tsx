import { person } from "@/lib/content";
import LocalTime from "./LocalTime";
import Magnetic from "./Magnetic";

const focus = ["Backend systems", "AI agents & automation", "Products from 0 → 1"];

function Letters({ word, offset = 0 }: { word: string; offset?: number }) {
  return (
    <span className="block overflow-hidden pb-[0.04em]" aria-hidden="true">
      {[...word].map((ch, i) => (
        <span key={i} className="intro-rise inline-block" style={{ "--i": i + offset } as React.CSSProperties}>
          {ch}
        </span>
      ))}
    </span>
  );
}

export default function Hero() {
  return (
    <section id="index" aria-labelledby="hero-name" className="relative flex min-h-svh flex-col pt-[var(--nav-h)]">
      {/* Top meta row */}
      <div className="wrap intro-fade order-1 grid grid-cols-2 gap-y-4 pt-6 md:grid-cols-12 md:pt-10" style={{ "--i": 2 } as React.CSSProperties}>
        <p className="label text-fg-3 md:col-span-3">
          <span className="text-accent">00</span> / Index
        </p>
        <p className="label text-fg-2 md:col-span-4">
          {person.role}
          <br />
          {person.focus}
        </p>
        <p className="label text-fg-3 md:col-span-3">
          {person.location}
          <br />
          <span className="tabular">{person.coords}</span>
        </p>
        <p className="label text-right text-fg-3 md:col-span-2">
          Local <LocalTime timeZone={person.timezone} />
          <br />
          <span className="text-fg-2">
            <span className="mr-1.5 inline-block size-1.5 animate-[blink_2.4s_steps(1)_infinite] rounded-full bg-accent align-middle" aria-hidden="true" />
            Open to work
          </span>
        </p>
      </div>

      {/* Middle: focus + statement */}
      <div className="wrap order-3 grid flex-1 grid-cols-1 content-center gap-10 pb-16 pt-10 md:order-2 md:grid-cols-12 md:py-10">
        <ul className="md:col-span-6 lg:col-span-5" aria-label="Focus">
          {focus.map((f, i) => (
            <li
              key={f}
              className="intro-fade flex items-baseline gap-4 border-t border-line py-3 last:border-b"
              style={{ "--i": 4 + i } as React.CSSProperties}
            >
              <span className="label tabular w-6 text-fg-3">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-[clamp(1.35rem,2.4vw,2.1rem)] font-normal leading-tight tracking-[-0.03em]">{f}</span>
            </li>
          ))}
        </ul>

        <div className="md:col-span-5 md:col-start-8 lg:col-span-4 lg:col-start-9">
          <p
            className="intro-fade max-w-[34ch] text-[clamp(1.05rem,1.35vw,1.25rem)] leading-[1.5] text-fg-2"
            style={{ "--i": 7 } as React.CSSProperties}
          >
            <span className="text-fg">I turn unclear ideas into working systems</span> — the services, permissions and agent
            workflows underneath, and the product people use on top.
          </p>
          <div className="intro-fade mt-8 flex flex-wrap items-center gap-x-6 gap-y-3" style={{ "--i": 8 } as React.CSSProperties}>
            <Magnetic>
              <a
                href="#work"
                className="label group inline-flex h-11 items-center gap-3 bg-fg px-5 text-bg transition-colors duration-300 hover:bg-accent-deep hover:text-white"
              >
                View selected work
                <span aria-hidden="true" className="transition-transform duration-500 group-hover:translate-y-0.5">↓</span>
              </a>
            </Magnetic>
            <a href={person.github.href} target="_blank" rel="noreferrer" className="label link-line inline-flex h-11 items-center text-fg">
              GitHub ↗
            </a>
            <a href={person.cv} download className="label link-line inline-flex h-11 items-center text-fg">
              Download CV
            </a>
          </div>
        </div>
      </div>

      {/* Name — first on mobile so identity lands in the first viewport */}
      <div className="wrap order-2 mt-10 md:order-3 md:mt-0">
        <h1 id="hero-name" className="display select-none font-semibold uppercase tracking-[-0.05em]">
          <span className="sr-only">Taha Koulal</span>
          <span className="flex flex-col whitespace-nowrap text-[22.5vw] md:flex-row md:justify-between md:text-[min(14.6vw,16rem)]">
            <Letters word="Taha" />
            <Letters word="Koulal" offset={4} />
          </span>
        </h1>
        <div
          className="intro-fade flex items-center justify-between gap-6 border-t border-line py-4"
          style={{ "--i": 10 } as React.CSSProperties}
        >
          <p className="label text-fg-3">
            <span className="text-fg-2">Scroll</span> — systems under the surface
          </p>
          <p className="label tabular hidden gap-5 text-fg-3 md:flex" aria-hidden="true">
            <span>
              x <span data-hud="x">—</span>
            </span>
            <span>
              y <span data-hud="y">—</span>
            </span>
            <span>
              v <span data-hud="v">0.00</span>
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
