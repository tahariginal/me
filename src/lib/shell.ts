/**
 * A small but faithful model of the Minishell command line: tokenizer with quote
 * handling, $ expansion, pipelines, redirections, heredocs and the builtins the
 * 42 subject asks for. Pure — data in, lines out, no DOM.
 *
 * Deliberately mandatory-scope only: `&&`, `||`, `;` and subshells are rejected
 * with a syntax error, exactly like the shell this models.
 */

import { person, projects, strengths, strata } from "./content";

export type Tone = "in" | "out" | "err" | "dim" | "accent";
export type Line = { text: string; tone: Tone };

const line = (text: string, tone: Tone = "out"): Line => ({ text, tone });

/* ------------------------------------------------------------------ files */

type FileNode = { type: "file"; content: string };
type DirNode = { type: "dir"; children: Record<string, Node> };
type Node = FileNode | DirNode;

const file = (content: string): FileNode => ({ type: "file", content });

/** String children are sugar for files. */
const dir = (children: Record<string, Node | string> = {}): DirNode => ({
  type: "dir",
  children: Object.fromEntries(Object.entries(children).map(([n, c]) => [n, typeof c === "string" ? file(c) : c])),
});

function projectDoc(p: (typeof projects)[number]) {
  return [
    `# ${p.title} — ${p.kind}`,
    "",
    p.lede,
    "",
    `role   ${p.role}`,
    ...(p.stack.length ? [`stack  ${p.stack.join(", ")}`] : []),
    ...(p.live ? [`live   ${p.live.href}`] : []),
    ...(p.org ? [`at     ${p.org}`] : []),
    "",
    ...p.beats.flatMap((b) => [
      `## ${b.label}`,
      ...(b.body ? [b.body] : []),
      ...(b.points ?? []).map((pt) => `- ${pt}`),
      "",
    ]),
  ].join("\n");
}

function buildFs(): DirNode {
  const docs: Record<string, Node> = {};
  for (const p of projects) docs[`${p.n}-${p.id}.md`] = file(projectDoc(p));

  return dir({
    home: dir({
      taha: dir({
        "about.txt": [
          `${person.name} — ${person.role}`,
          person.focus,
          "",
          "Sonic is my nickname: I learn fast, adapt quickly,",
          "and ship quickly on a strong engineering foundation.",
          "",
          `location  ${person.location} (${person.coords})`,
          `email     ${person.email}`,
          `github    ${person.github.href}`,
          "",
          person.availability + ".",
        ].join("\n"),
        "skills.txt": [
          ...strata.flatMap((s) => [`[${s.name}]`, s.items.map((i) => i.name).join(", "), ""]),
          "[strengths]",
          ...strengths.map((s) => `- ${s}`),
        ].join("\n"),
        projects: dir(docs),
        ".shellrc": ["export PS1=minishell", "export EDITOR=vim", "# read with: cat ~/.shellrc"].join("\n"),
      }),
    }),
    tmp: dir(),
    etc: dir({
      motd: "Minishell — a POSIX-ish shell written in C for 42.\nThis is a browser model of it. Type `help`.",
    }),
  });
}

/* ------------------------------------------------------------------ paths */

function resolve(cwd: string, home: string, p: string) {
  let path = p;
  if (path === "~" || path.startsWith("~/")) path = home + path.slice(1);
  const abs = path.startsWith("/") ? path : `${cwd}/${path}`;
  const out: string[] = [];
  for (const part of abs.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return "/" + out.join("/");
}

function walk(root: DirNode, path: string): Node | null {
  let node: Node = root;
  for (const part of path.split("/").filter(Boolean)) {
    if (node.type !== "dir") return null;
    const next: Node | undefined = node.children[part];
    if (!next) return null;
    node = next;
  }
  return node;
}

function parentOf(path: string) {
  const i = path.lastIndexOf("/");
  return { dir: i <= 0 ? "/" : path.slice(0, i), base: path.slice(i + 1) };
}

/* -------------------------------------------------------------- tokenizer */

type Seg = { text: string; quote: "none" | "single" | "double" };
type Word = Seg[];
type Op = "|" | "<" | ">" | ">>" | "<<";
type Token = { kind: "word"; word: Word } | { kind: "op"; op: Op };

class ShellError extends Error {}

const syntax = (near: string) => new ShellError(`minishell: syntax error near unexpected token \`${near}'`);

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let word: Word = [];
  let plain = "";

  const flushPlain = () => {
    if (plain) word.push({ text: plain, quote: "none" });
    plain = "";
  };
  const flushWord = () => {
    flushPlain();
    if (word.length) tokens.push({ kind: "word", word });
    word = [];
  };

  for (let i = 0; i < input.length; i++) {
    const c = input[i];

    if (c === " " || c === "\t") {
      flushWord();
      continue;
    }

    if (c === "'" || c === '"') {
      const end = input.indexOf(c, i + 1);
      if (end === -1) throw new ShellError("minishell: unexpected EOF while looking for matching quote");
      flushPlain();
      word.push({ text: input.slice(i + 1, end), quote: c === "'" ? "single" : "double" });
      i = end;
      continue;
    }

    if (c === "&") throw syntax(input[i + 1] === "&" ? "&&" : "&");
    if (c === ";") throw syntax(";");
    if (c === "(" || c === ")") throw syntax(c);

    if (c === "|") {
      if (input[i + 1] === "|") throw syntax("||");
      flushWord();
      tokens.push({ kind: "op", op: "|" });
      continue;
    }

    if (c === "<" || c === ">") {
      flushWord();
      const double = input[i + 1] === c;
      tokens.push({ kind: "op", op: (double ? c + c : c) as Op });
      if (double) i++;
      continue;
    }

    plain += c;
  }

  flushWord();
  return tokens;
}

/* ----------------------------------------------------------------- parser */

type Redir = { op: Exclude<Op, "|">; target: Word };
type Command = { words: Word[]; redirs: Redir[] };

function parse(tokens: Token[]): Command[] {
  const commands: Command[] = [];
  let current: Command = { words: [], redirs: [] };
  const empty = (c: Command) => !c.words.length && !c.redirs.length;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind === "word") {
      current.words.push(t.word);
      continue;
    }
    if (t.op === "|") {
      if (empty(current)) throw syntax("|");
      commands.push(current);
      current = { words: [], redirs: [] };
      continue;
    }
    const next = tokens[i + 1];
    if (!next || next.kind !== "word") throw syntax(next && next.kind === "op" ? next.op : "newline");
    current.redirs.push({ op: t.op, target: next.word });
    i++;
  }

  if (empty(current)) {
    if (!commands.length) return [];
    throw syntax("newline");
  }
  commands.push(current);
  return commands;
}

/* -------------------------------------------------------------- expansion */

function expandSeg(text: string, env: Record<string, string>, status: number) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "$") {
      out += text[i];
      continue;
    }
    const rest = text.slice(i + 1);
    if (rest.startsWith("?")) {
      out += String(status);
      i++;
      continue;
    }
    const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest)?.[0];
    if (!name) {
      out += "$";
      continue;
    }
    out += env[name] ?? "";
    i += name.length;
  }
  return out;
}

/** Bash-like: a word that expands to nothing disappears unless it was quoted. */
function expandWord(word: Word, env: Record<string, string>, status: number, home: string): string | null {
  let out = "";
  let quoted = false;
  word.forEach((seg, i) => {
    if (seg.quote === "single") {
      quoted = true;
      out += seg.text;
      return;
    }
    if (seg.quote === "double") quoted = true;
    let text = expandSeg(seg.text, env, status);
    if (i === 0 && seg.quote === "none" && (text === "~" || text.startsWith("~/"))) text = home + text.slice(1);
    out += text;
  });
  return out === "" && !quoted ? null : out;
}

/* --------------------------------------------------------------- commands */

type Ctx = { shell: Shell };
type Result = { out: string; err: string; code: number };
type Builtin = (ctx: Ctx, argv: string[], stdin: string) => Result;

const ok = (out = ""): Result => ({ out, err: "", code: 0 });
const fail = (err: string, code = 1): Result => ({ out: "", err, code });

const lines = (s: string) => (s === "" ? [] : s.replace(/\n$/, "").split("\n"));

/** Shared body of `head` and `tail`: -n N over a file argument or stdin. */
function slice(shell: Shell, argv: string[], stdin: string, mode: "head" | "tail"): Result {
  const i = argv.indexOf("-n");
  const n = i !== -1 ? Number(argv[i + 1]) || 10 : 10;
  const rest = argv.slice(1).filter((a, j) => a !== "-n" && argv[j] !== "-n");
  let source = stdin;
  if (rest.length) {
    const node = walk(shell.fs, resolve(shell.cwd, shell.env.HOME, rest[0]));
    if (!node) return fail(`minishell: ${mode}: ${rest[0]}: No such file or directory`);
    if (node.type === "dir") return fail(`minishell: ${mode}: ${rest[0]}: Is a directory`);
    source = node.content;
  }
  const all = lines(source);
  const picked = mode === "head" ? all.slice(0, n) : all.slice(-n);
  return ok(picked.length ? picked.join("\n") + "\n" : "");
}

const BUILTINS = ["echo", "cd", "pwd", "export", "unset", "env", "exit"] as const;

const commands: Record<string, Builtin> = {
  echo(_ctx, argv, _stdin) {
    let args = argv.slice(1);
    let newline = true;
    while (args[0] && /^-n+$/.test(args[0])) {
      newline = false;
      args = args.slice(1);
    }
    return ok(args.join(" ") + (newline ? "\n" : ""));
  },

  cd({ shell }, argv) {
    const target = argv[1] ?? shell.env.HOME;
    const path = target === "-" ? shell.env.OLDPWD || shell.cwd : resolve(shell.cwd, shell.env.HOME, target);
    const node = walk(shell.fs, path);
    if (!node) return fail(`minishell: cd: ${target}: No such file or directory`);
    if (node.type !== "dir") return fail(`minishell: cd: ${target}: Not a directory`);
    shell.env.OLDPWD = shell.cwd;
    shell.cwd = path;
    shell.env.PWD = path;
    return ok(target === "-" ? path + "\n" : "");
  },

  pwd({ shell }) {
    return ok(shell.cwd + "\n");
  },

  export({ shell }, argv) {
    if (argv.length === 1) {
      const all = Object.keys(shell.env)
        .sort()
        .map((k) => `declare -x ${k}="${shell.env[k]}"`);
      return ok(all.join("\n") + "\n");
    }
    for (const arg of argv.slice(1)) {
      const eq = arg.indexOf("=");
      const name = eq === -1 ? arg : arg.slice(0, eq);
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))
        return fail(`minishell: export: \`${arg}': not a valid identifier`);
      if (eq !== -1) shell.env[name] = arg.slice(eq + 1);
      else shell.env[name] ??= "";
    }
    return ok();
  },

  unset({ shell }, argv) {
    for (const name of argv.slice(1)) delete shell.env[name];
    return ok();
  },

  env({ shell }) {
    return ok(
      Object.entries(shell.env)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n") + "\n",
    );
  },

  exit(_ctx, argv) {
    const code = argv[1] ? Number(argv[1]) : 0;
    if (argv[1] && Number.isNaN(code)) return fail(`minishell: exit: ${argv[1]}: numeric argument required`, 2);
    return { out: "", err: "", code: code & 255 };
  },

  ls({ shell }, argv) {
    const flags = argv.slice(1).filter((a) => a.startsWith("-"));
    const rest = argv.slice(1).filter((a) => !a.startsWith("-"));
    const all = flags.some((f) => f.includes("a"));
    const long = flags.some((f) => f.includes("l"));
    const target = rest[0] ?? ".";
    const path = resolve(shell.cwd, shell.env.HOME, target);
    const node = walk(shell.fs, path);
    if (!node) return fail(`minishell: ls: ${target}: No such file or directory`, 2);
    if (node.type === "file") return ok(target + "\n");

    const names = Object.keys(node.children)
      .filter((n) => all || !n.startsWith("."))
      .sort();
    if (!long) return ok(names.length ? names.map((n) => (node.children[n].type === "dir" ? n + "/" : n)).join("  ") + "\n" : "");

    const rows = names.map((n) => {
      const child = node.children[n];
      const size = child.type === "file" ? child.content.length : 4096;
      const mode = child.type === "dir" ? "drwxr-xr-x" : "-rw-r--r--";
      return `${mode}  taha  ${String(size).padStart(5)}  ${n}${child.type === "dir" ? "/" : ""}`;
    });
    return ok(rows.join("\n") + "\n");
  },

  cat({ shell }, argv, stdin) {
    if (argv.length === 1) return ok(stdin);
    let out = "";
    for (const arg of argv.slice(1)) {
      const node = walk(shell.fs, resolve(shell.cwd, shell.env.HOME, arg));
      if (!node) return fail(`minishell: cat: ${arg}: No such file or directory`);
      if (node.type === "dir") return fail(`minishell: cat: ${arg}: Is a directory`);
      out += node.content.endsWith("\n") ? node.content : node.content + "\n";
    }
    return ok(out);
  },

  grep({ shell }, argv, stdin) {
    const insensitive = argv.includes("-i");
    const args = argv.slice(1).filter((a) => a !== "-i");
    const pattern = args[0];
    if (!pattern) return fail("usage: grep PATTERN [FILE...]");
    const files = args.slice(1);

    const sources: { name: string; content: string }[] = [];
    for (const f of files) {
      const node = walk(shell.fs, resolve(shell.cwd, shell.env.HOME, f));
      if (!node) return fail(`minishell: grep: ${f}: No such file or directory`, 2);
      if (node.type === "dir") return fail(`minishell: grep: ${f}: Is a directory`, 2);
      sources.push({ name: f, content: node.content });
    }
    if (!files.length) sources.push({ name: "", content: stdin });

    const needle = insensitive ? pattern.toLowerCase() : pattern;
    const hits: string[] = [];
    for (const src of sources) {
      for (const l of lines(src.content)) {
        if (!(insensitive ? l.toLowerCase() : l).includes(needle)) continue;
        hits.push(files.length > 1 ? `${src.name}:${l}` : l);
      }
    }
    return { out: hits.length ? hits.join("\n") + "\n" : "", err: "", code: hits.length ? 0 : 1 };
  },

  wc(_ctx, argv, stdin) {
    const l = lines(stdin).length;
    const w = stdin.split(/\s+/).filter(Boolean).length;
    const c = stdin.length;
    if (argv.includes("-l")) return ok(`${l}\n`);
    if (argv.includes("-w")) return ok(`${w}\n`);
    if (argv.includes("-c")) return ok(`${c}\n`);
    return ok(`${l} ${w} ${c}\n`);
  },

  head({ shell }, argv, stdin) {
    return slice(shell, argv, stdin, "head");
  },

  tail({ shell }, argv, stdin) {
    return slice(shell, argv, stdin, "tail");
  },

  whoami({ shell }) {
    return ok(shell.env.USER + "\n");
  },

  uname(_ctx, argv) {
    return ok(argv.includes("-a") ? "Minishell 1.0 x86_64 GNU/Linux (42 Network)\n" : "Minishell\n");
  },

  date() {
    return ok(new Date().toString() + "\n");
  },

  which({ shell }, argv) {
    const name = argv[1];
    if (!name) return fail("usage: which COMMAND");
    if ((BUILTINS as readonly string[]).includes(name)) return ok(`${name}: shell builtin\n`);
    if (commands[name]) return ok(`/usr/bin/${name}\n`);
    return fail(`which: no ${name} in (/usr/bin:/bin)`);
  },

  history({ shell }) {
    return ok(shell.history.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join("\n") + "\n");
  },

  help() {
    return ok(
      [
        "builtins     echo  cd  pwd  export  unset  env  exit",
        "extras       ls  cat  grep  wc  head  tail  whoami  uname  date  which  history  help  clear",
        "operators    |   <   >   >>   <<   'quotes'   \"quotes\"   $VAR   $?",
        "keys         Tab complete · ↑ ↓ history · Ctrl-C cancel · Ctrl-L clear · Ctrl-D exit",
        "",
        "try          cat about.txt · ls -l projects · cat projects/*.md is NOT supported (no globbing)",
        "             grep supabase projects/03-vamo.md · cat about.txt | wc -l · echo \"$USER at $PWD\"",
        "             echo hi > /tmp/note && cat /tmp/note  ← rejected: && is out of scope, like the real shell",
      ].join("\n") + "\n",
    );
  },

  clear() {
    return ok();
  },
};

/* ------------------------------------------------------------------ shell */

export type RunResult = { lines: Line[]; clear?: boolean; exited?: boolean; pending?: string };

export class Shell {
  fs: DirNode;
  cwd: string;
  env: Record<string, string>;
  status = 0;
  history: string[] = [];
  /** Set while a heredoc is collecting body lines. */
  private heredoc: { delimiter: string; expand: boolean; body: string[]; input: string } | null = null;

  constructor() {
    this.fs = buildFs();
    this.cwd = "/home/taha";
    this.env = {
      USER: "taha",
      HOME: "/home/taha",
      PWD: "/home/taha",
      OLDPWD: "",
      SHELL: "/bin/minishell",
      PATH: "/usr/bin:/bin",
      TERM: "xterm-256color",
    };
  }

  prompt() {
    const short = this.cwd === this.env.HOME ? "~" : this.cwd.replace(this.env.HOME, "~");
    return `minishell:${short}$`;
  }

  /** True while the shell is waiting for heredoc body lines (prompt becomes `>`). */
  get waiting() {
    return this.heredoc !== null;
  }

  cancel() {
    this.heredoc = null;
    this.status = 130;
  }

  run(input: string): RunResult {
    if (this.heredoc) return this.feedHeredoc(input);
    if (input.trim()) this.history.push(input);
    return this.execute(input, "");
  }

  private feedHeredoc(input: string): RunResult {
    const doc = this.heredoc!;
    if (input === doc.delimiter) {
      const body = doc.body.map((l) => (doc.expand ? expandSeg(l, this.env, this.status) : l));
      const source = doc.input;
      this.heredoc = null;
      return this.execute(source, body.length ? body.join("\n") + "\n" : "");
    }
    doc.body.push(input);
    return { lines: [], pending: ">" };
  }

  private execute(input: string, heredocBody: string): RunResult {
    let pipeline: Command[];
    try {
      pipeline = parse(tokenize(input));
    } catch (e) {
      this.status = 2;
      return { lines: [line((e as Error).message, "err")] };
    }
    if (!pipeline.length) return { lines: [] };

    // A heredoc still waiting for its body suspends the whole pipeline.
    if (!heredocBody) {
      for (const cmd of pipeline) {
        const doc = cmd.redirs.find((r) => r.op === "<<");
        if (!doc) continue;
        const quoted = doc.target.some((s) => s.quote !== "none");
        const delimiter = doc.target.map((s) => s.text).join("");
        this.heredoc = { delimiter, expand: !quoted, body: [], input };
        return { lines: [], pending: ">" };
      }
    }

    const out: Line[] = [];
    let stdin = "";
    let clear = false;
    let exited = false;

    for (let i = 0; i < pipeline.length; i++) {
      const cmd = pipeline[i];
      const argv: string[] = [];
      for (const word of cmd.words) {
        const value = expandWord(word, this.env, this.status, this.env.HOME);
        if (value !== null) argv.push(value);
      }

      // Input redirections: the last one wins, as in a real shell.
      let redirError: string | null = null;
      for (const r of cmd.redirs) {
        if (r.op === "<<") {
          stdin = heredocBody;
          continue;
        }
        if (r.op !== "<") continue;
        const name = expandWord(r.target, this.env, this.status, this.env.HOME) ?? "";
        const node = walk(this.fs, resolve(this.cwd, this.env.HOME, name));
        if (!node || node.type !== "file") {
          redirError = `minishell: ${name}: No such file or directory`;
          break;
        }
        stdin = node.content;
      }
      if (redirError) {
        out.push(line(redirError, "err"));
        this.status = 1;
        return { lines: out };
      }

      if (!argv.length) {
        stdin = "";
        continue;
      }

      const run = commands[argv[0]];
      let result: Result;
      if (!run) result = fail(`minishell: ${argv[0]}: command not found`, 127);
      else result = run({ shell: this }, argv, stdin);

      if (argv[0] === "clear" && result.code === 0) clear = true;
      if (argv[0] === "exit" && result.code !== 2) exited = true;

      // Output redirections consume stdout before the pipe sees it.
      const writes = cmd.redirs.filter((r) => r.op === ">" || r.op === ">>");
      for (const w of writes) {
        const name = expandWord(w.target, this.env, this.status, this.env.HOME) ?? "";
        const path = resolve(this.cwd, this.env.HOME, name);
        const { dir: parentPath, base } = parentOf(path);
        const parent = walk(this.fs, parentPath);
        if (!parent || parent.type !== "dir" || !base) {
          result = fail(`minishell: ${name}: No such file or directory`);
          break;
        }
        const existing = parent.children[base];
        if (existing && existing.type === "dir") {
          result = fail(`minishell: ${name}: Is a directory`);
          break;
        }
        const previous = w.op === ">>" && existing ? (existing as FileNode).content : "";
        parent.children[base] = file(previous + result.out);
        result = { ...result, out: "" };
      }

      if (result.err) out.push(line(result.err, "err"));
      const last = i === pipeline.length - 1;
      if (last) {
        for (const l of lines(result.out)) out.push(line(l));
        this.status = result.code;
      } else {
        stdin = result.out;
        if (result.code !== 0) this.status = result.code;
      }
    }

    return { lines: out, clear, exited };
  }

  /** Tab completion over command names and the paths under the cursor. */
  complete(input: string): { value: string; hints: string[] } {
    const parts = input.split(/\s+/);
    const fragment = parts[parts.length - 1] ?? "";
    const head = input.slice(0, input.length - fragment.length);
    const isCommand = parts.filter(Boolean).length <= 1 && !input.endsWith(" ");

    let pool: string[];
    let prefix = fragment;

    if (isCommand) {
      pool = Object.keys(commands).sort();
    } else {
      const slash = fragment.lastIndexOf("/");
      const base = slash === -1 ? "" : fragment.slice(0, slash + 1);
      prefix = slash === -1 ? fragment : fragment.slice(slash + 1);
      const node = walk(this.fs, resolve(this.cwd, this.env.HOME, base || "."));
      if (!node || node.type !== "dir") return { value: input, hints: [] };
      pool = Object.keys(node.children)
        .filter((n) => !n.startsWith(".") || prefix.startsWith("."))
        .sort()
        .map((n) => base + n + (node.children[n].type === "dir" ? "/" : ""));
      prefix = base + prefix;
    }

    const matches = pool.filter((c) => c.startsWith(prefix));
    if (!matches.length) return { value: input, hints: [] };
    if (matches.length === 1) {
      const done = matches[0];
      return { value: head + done + (done.endsWith("/") ? "" : " "), hints: [] };
    }

    // Extend to the longest common prefix, then show the candidates.
    let common = matches[0];
    for (const m of matches) {
      while (!m.startsWith(common)) common = common.slice(0, -1);
    }
    return { value: head + common, hints: matches };
  }
}
