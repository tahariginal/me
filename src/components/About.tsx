import { languages, person } from "@/lib/content";
import Portrait from "./Portrait";

export default function About() {
  return (
    <section id="about" aria-labelledby="about-title" className="relative overflow-x-clip">
      <div className="wrap grid grid-cols-12 gap-x-5 gap-y-12 py-28 md:py-40">
        <div className="col-span-12 md:col-span-5 lg:col-span-5">
          <Portrait />
        </div>

        <div className="col-span-12 flex flex-col md:col-span-7 md:col-start-6 lg:col-span-6 lg:col-start-7">
          <p className="label text-fg-3">
            <span className="text-accent">04</span> / About
          </p>
          <h2 id="about-title" data-reveal="mask" className="display mt-8 text-[clamp(2.5rem,5.6vw,6rem)]">
            I like turning unclear ideas into working systems.
          </h2>
          <div className="mt-10 grid gap-x-5 gap-y-6 lg:grid-cols-7">
            <div className="space-y-5 text-[clamp(1.05rem,1.3vw,1.2rem)] leading-relaxed text-fg-2 lg:col-span-4" data-reveal="fade">
              <p>
                I came to software from two directions: <span className="text-fg">systems</span> — C, Unix and networking at
                1337 — and <span className="text-fg">interactive work</span>, building a VR virtual visit at UM6P.
              </p>
              <p>
                Now I work where those meet. Access control, workflows, real-time state and agents underneath; flows and
                interfaces on top. I use AI to move faster, with review gates so judgment stays in the loop.
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
