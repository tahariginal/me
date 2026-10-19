"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Shell, type Line } from "@/lib/shell";

/** The pipeline stages, highlighted one by one as the case study is read. */
const stages = [
  { k: "lex", label: "lex" },
  { k: "parse", label: "parse" },
  { k: "exec", label: "exec" },
  { k: "signals", label: "signals" },
];

const tone: Record<Line["tone"], string> = {
  in: "text-fg-2",
  out: "text-fg",
  err: "text-fg-3",
  dim: "text-fg-3",
  accent: "text-accent-light",
};

const intro = (prompt: string): Line[] => [
  { text: "minishell 1.0 · 42 network", tone: "accent" as const },
  { text: "Same grammar and builtins as the shell in C, modelled in the browser.", tone: "dim" as const },
  { text: "Type `help`, or `ls` to read this site as files.", tone: "dim" as const },
  { text: "", tone: "out" as const },
  { text: `${prompt} cat about.txt`, tone: "in" as const },
];

/** The opening frame is the output of a real command, so the demo starts mid-session. */
function boot() {
  const sh = new Shell();
  return { sh, lines: [...intro(sh.prompt()), ...sh.run("cat about.txt").lines] };
}

export default function MinishellTerminal() {
  // Computed once, during render, so the first frame is in the prerendered HTML.
  const [initial] = useState(boot);
  const shell = useRef(initial.sh);

  const [out, setOut] = useState<Line[]>(initial.lines);
  const [value, setValue] = useState("");
  const [prompt, setPrompt] = useState(initial.sh.prompt());
  const [dead, setDead] = useState(false);
  const [active, setActive] = useState(false);

  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const cursor = useRef(-1);
  const draft = useRef("");

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [out, value]);

  const push = useCallback((next: Line[]) => setOut((prev) => [...prev, ...next].slice(-400)), []);

  const submit = useCallback(() => {
    const sh = shell.current;
    const text = value;
    setValue("");
    cursor.current = -1;
    draft.current = "";

    if (dead) {
      const fresh = new Shell();
      shell.current = fresh;
      setDead(false);
      setPrompt(fresh.prompt());
      setOut(intro(fresh.prompt()).slice(0, -1));
      return;
    }

    push([{ text: `${prompt} ${text}`, tone: "in" }]);
    const result = sh.run(text);

    if (result.clear) setOut([]);
    else push(result.lines);

    if (result.exited) {
      push([
        { text: "exit", tone: "dim" },
        { text: "[minishell exited — press Enter to start a new session]", tone: "dim" },
      ]);
      setDead(true);
      setPrompt("");
      return;
    }
    setPrompt(result.pending ?? sh.prompt());
  }, [dead, prompt, push, value]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const sh = shell.current;

    if (e.key === "Enter") {
      e.preventDefault();
      submit();
      return;
    }

    if (e.ctrlKey && (e.key === "c" || e.key === "C")) {
      e.preventDefault();
      push([{ text: `${prompt} ${value}^C`, tone: "in" }]);
      sh.cancel();
      setValue("");
      setPrompt(sh.prompt());
      return;
    }

    if (e.ctrlKey && (e.key === "l" || e.key === "L")) {
      e.preventDefault();
      setOut([]);
      return;
    }

    if (e.ctrlKey && (e.key === "d" || e.key === "D") && !value && !dead) {
      e.preventDefault();
      push([{ text: `${prompt} exit`, tone: "in" }, { text: "[minishell exited — press Enter to start a new session]", tone: "dim" }]);
      setDead(true);
      setPrompt("");
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const { value: completed, hints } = sh.complete(value);
      setValue(completed);
      if (hints.length) push([{ text: `${prompt} ${value}`, tone: "in" }, { text: hints.join("  "), tone: "dim" }]);
      return;
    }

    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const history = sh.history;
      if (!history.length) return;
      e.preventDefault();
      if (cursor.current === -1) draft.current = value;
      const next =
        e.key === "ArrowUp"
          ? Math.min(cursor.current + 1, history.length - 1)
          : cursor.current - 1;
      cursor.current = Math.max(next, -1);
      setValue(cursor.current === -1 ? draft.current : history[history.length - 1 - cursor.current]);
    }
  };

  return (
    <figure className="dg relative flex h-full flex-col border border-line bg-bg/70">
      <div className="label flex items-center justify-between gap-4 border-b border-line px-3 py-2.5 text-fg-3">
        <span>
          Fig. <span className="tabular text-fg-2">06</span> — Minishell, running
        </span>
        <span className="hidden items-center gap-2 sm:flex">
          <span className="size-1.5 animate-[blink_1.6s_steps(1)_infinite] bg-accent" aria-hidden="true" />
          Interactive
        </span>
      </div>

      <ol className="label flex shrink-0 border-b border-line text-fg-3" aria-hidden="true">
        {stages.map((s, i) => (
          <li key={s.k} data-k={s.k} className="flex items-center gap-2 px-3 py-2">
            {i > 0 && <span className="text-fg-3">→</span>}
            <span>{s.label}</span>
          </li>
        ))}
      </ol>

      <div className="shrink-0 border-b border-line px-3 py-3 font-mono">
        <img
          src="/img/sonic-terminal.png"
          alt="White hedgehog pixel art — Sonic, my nickname"
          width={856}
          height={803}
          loading="lazy"
          decoding="async"
          className="h-28 w-auto select-none object-contain [image-rendering:pixelated] sm:h-32"
        />
        <p className="mt-2 text-[0.72rem] text-fg sm:text-[0.8rem]">Sonic — learn fast. Build solid. Ship fast.</p>
      </div>

      <div
        ref={scroller}
        onClick={() => input.current?.focus()}
        className="relative min-h-0 flex-1 cursor-text overflow-y-auto overscroll-contain px-3 py-3 font-mono text-[0.72rem] leading-[1.55] sm:text-[0.8rem]"
      >
        <div role="log" aria-live="polite" aria-label="Minishell output">
          {out.map((l, i) => (
            <p key={i} className={`whitespace-pre-wrap break-words ${tone[l.tone]}`}>
              {l.text || " "}
            </p>
          ))}
        </div>

        <div className="flex items-baseline gap-2">
          {prompt && <span className="shrink-0 text-accent">{prompt}</span>}
          <label htmlFor="minishell-input" className="sr-only">
            Minishell command
          </label>
          <input
            id="minishell-input"
            ref={input}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setActive(true)}
            onBlur={() => setActive(false)}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            placeholder={dead ? "press Enter" : active ? "" : "click and type — try: ls projects"}
            className="min-w-0 flex-1 bg-transparent text-fg caret-accent outline-none placeholder:text-fg-3"
          />
        </div>
      </div>

      <figcaption className="label hidden border-t border-line px-3 py-2.5 text-fg-3 sm:block">
        Tab completes · ↑ ↓ history · Ctrl-C cancels · Ctrl-D exits
      </figcaption>
    </figure>
  );
}
