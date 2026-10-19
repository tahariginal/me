import { projects } from "@/lib/content";
import ProjectCase from "./ProjectCase";

export default function Work() {
  let majorIndex = 0;
  return (
    <section id="work" aria-labelledby="work-title" className="relative">
      <div className="wrap head-gap grid grid-cols-12 gap-x-5 pt-[var(--space-block)]">
        <p className="label col-span-12 text-fg-3">
          <span className="text-accent">01</span> / Selected work
        </p>
        <h2 id="work-title" data-reveal="mask" className="display stack-title col-span-12 text-[length:var(--type-h2)]">
          Read from the system up.
        </h2>
        <p data-reveal="fade" className="stack-title col-span-12 max-w-[40ch] text-[length:var(--type-lede)] leading-[1.45] text-fg-2 md:col-span-5">
          Six public projects and two confidential engagements. Explore the systems behind the work, or try the interactive Minishell.
        </p>

        <ol className="stack-block col-span-12 md:col-span-7 md:col-start-6 md:mt-0 md:self-end">
          {projects.map((p, i) => (
            <li key={p.id} data-reveal="fade" className="border-t border-line last:border-b" style={{ "--d": i * 70 } as React.CSSProperties}>
              <a
                href={`#work-${p.id}`}
                className="group grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 py-4 transition-colors duration-300 hover:text-fg sm:grid-cols-[3rem_1fr_1fr_auto]"
              >
                <span className="label tabular text-fg-3 transition-colors group-hover:text-accent">{p.n}</span>
                <span className="text-[1.35rem] font-medium leading-none tracking-[-0.03em] transition-colors duration-300 group-hover:text-accent-light">
                  {p.title}
                  {p.status === "NDA" && <span className="label ml-3 inline-block border border-accent/40 px-2 py-1 align-middle text-accent-light">NDA</span>}
                </span>
                <span className="label hidden text-fg-3 sm:block">
                  {p.status === "NDA" ? p.kind : p.status ?? p.kind}
                  {p.live && (
                    <span className="ml-3 whitespace-nowrap text-accent">
                      <span className="mr-1.5 inline-block size-1.5 rounded-full bg-accent align-middle" aria-hidden="true" />
                      Live
                    </span>
                  )}
                </span>
                <span aria-hidden="true" className="label text-fg-3 transition-transform duration-500 group-hover:translate-y-0.5 group-hover:text-fg">
                  ↓
                </span>
              </a>
            </li>
          ))}
        </ol>
      </div>

      {projects.map((p) => (
        <ProjectCase key={p.id} project={p} flip={p.scale === "major" && majorIndex++ % 2 === 1} />
      ))}

    </section>
  );
}
