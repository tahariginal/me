"use client";

import { useState } from "react";
import { person } from "@/lib/content";
import LocalTime from "./LocalTime";
import Magnetic from "./Magnetic";

export default function Contact() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(person.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${person.email}`;
    }
  };

  return (
    <section id="contact" aria-labelledby="contact-title" className="relative flex min-h-svh flex-col">
      <div className="wrap grid flex-1 grid-cols-12 content-center gap-x-5 pb-16 pt-28">
        <p className="label col-span-12 flex flex-wrap justify-between gap-4 text-fg-3">
          <span>
            <span className="text-accent">05</span> / Contact
          </span>
          <span className="text-fg-2">
            <span className="mr-2 inline-block size-1.5 animate-[blink_2.4s_steps(1)_infinite] rounded-full bg-accent align-middle" aria-hidden="true" />
            {person.availability}
          </span>
        </p>

        <h2 id="contact-title" data-reveal="mask" className="display col-span-12 mt-14 text-[clamp(2.4rem,6.2vw,7rem)] md:col-span-11">
          Have something unclear? <br className="hidden sm:block" />
          Let&apos;s make it work.
        </h2>

        <div className="col-span-12 mt-14 border-t border-line pt-6 md:mt-20">
          <p className="label text-fg-3">Write to</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
            <a
              href={`mailto:${person.email}`}
              className="group relative break-all text-[clamp(1.9rem,6.2vw,6.25rem)] font-medium leading-[0.95] tracking-[-0.045em]"
            >
              <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_2px] bg-[position:0_100%] bg-no-repeat transition-[background-size,color] duration-700 ease-[var(--ease-out-expo)] group-hover:bg-[length:100%_2px] group-hover:text-accent">
                {person.email}
              </span>
            </a>
            <Magnetic>
              <button
                type="button"
                onClick={copy}
                className="label btn-line inline-flex h-11 items-center gap-3 border border-line-2 px-5 text-fg transition-colors duration-300 hover:text-accent-light"
              >
                {copied ? "Copied ✓" : "Copy address"}
              </button>
            </Magnetic>
          </div>
          <span className="sr-only" aria-live="polite">
            {copied ? "Email address copied" : ""}
          </span>
        </div>

        <ul className="col-span-12 mt-12 grid gap-y-6 border-t border-line pt-6 sm:grid-cols-2 md:grid-cols-4">
          <li>
            <p className="label text-fg-3">Code</p>
            <a href={person.github.href} target="_blank" rel="noreferrer" className="label link-line mt-2 inline-block text-fg">
              {person.github.label} ↗
            </a>
          </li>
          <li>
            <p className="label text-fg-3">CV</p>
            <a href={person.cv} download className="label link-line mt-2 inline-block text-fg">
              Download CV (PDF) ↓
            </a>
          </li>
          <li>
            <p className="label text-fg-3">Based in</p>
            <p className="label mt-2 text-fg">{person.location}</p>
          </li>
          <li>
            <p className="label text-fg-3">Local time</p>
            <p className="label mt-2 text-fg">
              <LocalTime timeZone={person.timezone} />
            </p>
          </li>
        </ul>
      </div>

      <footer className="wrap label flex flex-wrap items-center justify-between gap-4 border-t border-line py-5 text-fg-3">
        <span>© 2026 Taha Koulal</span>
        <span className="hidden md:inline">Built with Next.js and hand-written WebGL</span>
        <a href="#index" className="link-line text-fg-2">
          Back to surface ↑
        </a>
      </footer>
    </section>
  );
}
