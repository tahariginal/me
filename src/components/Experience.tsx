import { layers } from "@/lib/content";
import VrVisit from "./VrVisit";

/* Deeper layers carry a denser point texture — the same lattice idea as the field. */
const texture = [
  undefined,
  "radial-gradient(rgb(236 231 223 / 0.07) 1px, transparent 1.2px) 0 0 / 22px 22px",
  "radial-gradient(rgb(236 231 223 / 0.09) 1px, transparent 1.2px) 0 0 / 11px 11px",
];

export default function Experience() {
  return (
    <section id="experience" aria-labelledby="experience-title" className="relative">
      <div className="wrap grid grid-cols-12 gap-x-5 pb-16 pt-28 md:pb-24 md:pt-40">
        <p className="label col-span-12 text-fg-3">
          <span className="text-accent">02</span> / Experience
        </p>
        <h2 id="experience-title" data-reveal="mask" className="display col-span-12 mt-8 text-[clamp(2.6rem,6.6vw,7.5rem)]">
          From the surface down.
        </h2>
        <p data-reveal="fade" className="col-span-12 mt-8 max-w-[40ch] text-[clamp(1.1rem,1.5vw,1.35rem)] leading-[1.45] text-fg-2 md:col-span-5">
          Production work on top. The interactive and systems foundations it stands on, underneath.
        </p>
      </div>

      <ol className="relative isolate">
        {layers.map((l, i) => (
          <li key={l.name} className="relative">
            {texture[i] && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 -bottom-24 top-0 -z-10"
                style={{
                  background: texture[i],
                  maskImage: "linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%)",
                }}
              />
            )}
            <span data-reveal="line" aria-hidden="true" className="absolute inset-x-0 top-0 block h-px bg-line-2" />
            <div className="wrap grid grid-cols-12 gap-x-5 gap-y-6 py-12 md:py-20">
              <div className="col-span-12 flex items-start justify-between md:col-span-3 md:flex-col md:justify-start md:gap-6">
                <p className="label text-fg-3">
                  <span className="tabular text-accent">L.{String(i + 1).padStart(2, "0")}</span> — {l.depth}
                </p>
                <p className="label tabular text-fg-3" aria-hidden="true">
                  z = {i === 0 ? "0" : `−${i}`}
                </p>
              </div>
              <div className="col-span-12 md:col-span-4" data-reveal="fade">
                <h3 className="text-[clamp(1.9rem,3.4vw,3.25rem)] font-medium leading-[0.95] tracking-[-0.035em]">{l.name}</h3>
                <p className="mt-4 text-[1.05rem] text-fg">{l.role}</p>
                <p className="label mt-1.5 text-fg-3">{l.where}</p>
              </div>
              <div className="col-span-12 md:col-span-5" data-reveal="fade" style={{ "--d": 100 } as React.CSSProperties}>
                {l.body.map((b) => (
                  <p key={b} className="mb-4 max-w-[52ch] text-[1.05rem] leading-relaxed text-fg-2 last:mb-0">
                    {b}
                  </p>
                ))}
                <ul className="label mt-6 flex flex-wrap gap-x-2 gap-y-1 text-fg-2" aria-label="Keywords">
                  {l.tags.map((t, j) => (
                    <li key={t}>
                      {j > 0 && <span className="mr-2 text-fg-3" aria-hidden="true">/</span>}
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              {l.visual === "vr" && (
                <div className="col-span-12 mt-6 md:col-span-10 md:col-start-2 md:mt-12" data-reveal="fade">
                  <VrVisit />
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
