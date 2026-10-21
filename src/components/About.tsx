import { languages, person } from "@/lib/content";
import Portrait from "./Portrait";

export default function About() {
  return (
    <section id="about" aria-labelledby="about-title" className="relative overflow-x-clip">
      <div className="wrap section-y grid grid-cols-12 gap-x-5 gap-y-[var(--space-block)]">
        <div className="col-span-12 md:col-span-5 lg:col-span-5">
          <Portrait />
        </div>

        <div className="col-span-12 flex flex-col md:col-span-7 md:col-start-6 lg:col-span-6 lg:col-start-7">
          <p className="label text-fg-3">
            <span className="text-accent">04</span> / About
          </p>
          <h2 id="about-title" data-reveal="mask" className="display stack-title text-[length:var(--type-h2-sm)]">
            Understand the work. Build the system.
          </h2>
          <div className="stack-block grid gap-x-5 gap-y-6 lg:grid-cols-7">
            <div className="space-y-5 text-[length:var(--type-lede)] leading-[1.55] text-fg-2 lg:col-span-4" data-reveal="fade">
              <p>
                I build <span className="text-fg">agentic AI systems</span> and use coding agents to turn ideas into working
                products. I am <span className="text-fg">effective &amp; efficient</span> in how I work. I learn unfamiliar
                tools and domains quickly, starting with the problem and the people doing the work.
              </p>
              <p>
                At PHOVA, I analysed how departments operate and built <span className="text-fg">Phova-edge</span> to
                digitise their workflows. That means translating business needs into system design, planning for growth
                and reliability, and making everyday tasks simpler.
              </p>
              <p>
                My foundation is C, Unix and networking at 1337, alongside interactive development at UM6P. I bring that
                engineering perspective to AI: clear permissions, deliberate technical choices and review of what agents produce.
              </p>
            </div>
            <dl className="grid content-start gap-y-4 lg:col-span-3 lg:col-start-5" data-reveal="fade" style={{ "--d": 120 } as React.CSSProperties}>
              {[
                ["Based in", person.location],
                ["Studying", "42 Network (1337)"],
                ["Languages", languages.map((l) => `${l.name} — ${l.level}`).join("\n")],
                ["Open to", "Full-time & early-stage product roles"],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[6.5rem_1fr] border-t border-line pt-3">
                  <dt className="label pt-0.5 text-fg-3">{k}</dt>
                  <dd className="whitespace-pre-line text-[0.98rem] leading-[1.4] text-fg">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
