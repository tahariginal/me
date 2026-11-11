/**
 * Portfolio facts come from the CV and Taha's direct project clarifications.
 * Keep claims grounded in that experience; do not invent metrics or outcomes.
 */

export const person = {
  name: "Taha Koulal",
  role: "Applied AI Engineer",
  focus: "Agentic systems & product development",
  email: "tkoulal.tech@gmail.com",
  github: { label: "github.com/tahariginal", href: "https://github.com/tahariginal" },
  cv: "/cv/taha-koulal-cv.pdf",
  location: "Marrakech, Morocco",
  coords: "31.6295° N, 7.9811° W",
  timezone: "Africa/Casablanca",
  availability: "Available for full-time and early-stage product opportunities",
};

export const sections = [
  { id: "index", n: "00", label: "Index" },
  { id: "work", n: "01", label: "Work" },
  { id: "experience", n: "02", label: "Experience" },
  { id: "system", n: "03", label: "System" },
  { id: "about", n: "04", label: "About" },
  { id: "contact", n: "05", label: "Contact" },
] as const;

export type SectionId = (typeof sections)[number]["id"];

export type Beat = {
  /** Diagram group highlighted while this beat is being read. */
  focus: string;
  label: string;
  body?: string;
  points?: string[];
};

export type Project = {
  id: string;
  n: string;
  title: string;
  kind: string;
  org?: string;
  status?: string;
  stack: string[];
  lede: string;
  beats: Beat[];
  role: string;
  scale: "major" | "minor";
  /** A live product visitors can open in a new tab. `cta` is the button text (default: "Visit landing page"). */
  live?: { href: string; label: string; cta?: string };
};

export const projects: Project[] = [
  {
    id: "factory",
    n: "01",
    title: "Factory",
    kind: "Multi-agent AI project factory",
    stack: ["Claude Code", "MCP", "Agent orchestration"],
    lede: "An agent-based delivery system where ideas are evaluated, delegated and built by small, specialised teams of AI agents.",
    scale: "major",
    role: "Architecture and system design",
    beats: [
      {
        focus: "ceo",
        label: "Context",
        body: "A CEO agent evaluates incoming ideas, then delegates execution to specialised CTO modes that coordinate focused build agents.",
      },
      {
        focus: "gates",
        label: "Problem",
        body: "Letting agents execute projects takes more than prompts. Without clear authority, permissions and accountability, execution stops being predictable.",
      },
      {
        focus: "agents",
        label: "What I built",
        points: [
          "The delegation model: CEO agent → CTO modes → focused build agents.",
          "Permission gates, milestone reviews and SLA-based blocker escalation.",
          "Persistent state, audit logs and sandboxed execution.",
        ],
      },
      {
        focus: "state",
        label: "System",
        body: "Small, specialised agent teams with explicit responsibilities, persistent state and review gates to keep execution traceable and accountable.",
      },
    ],
  },
  {
    id: "mobile-factory",
    n: "02",
    title: "Mobile_factory",
    kind: "Autonomous AI app factory",
    status: "In development",
    stack: ["Claude Agent SDK", "Node.js", "TypeScript", "React", "Vite", "Server-Sent Events", "Oracle Cloud VM", "Vercel"],
    lede: "A crew of AI agents that finds, validates and builds mobile apps around the clock, while I watch and steer them live from my phone.",
    scale: "major",
    role: "Designed and built — agent runtime, factory board, access control, dashboard and hosting",
    live: {
      href: "https://sonic-station.vercel.app/",
      label: "sonic-station.vercel.app",
      cta: "Open dashboard",
    },
    beats: [
      {
        focus: "remote",
        label: "Context",
        body: "Claude Code runs headless on a cloud VM, 24/7. A dashboard on Vercel lets me follow and steer the agents from any phone or laptop.",
      },
      {
        focus: "gate",
        label: "Problem",
        body: "Agents that work alone need real freedom, but some calls still belong to a human. And the work has to keep going when no browser is open.",
      },
      {
        focus: "crew",
        label: "What I built",
        points: [
          "A factory board: a boss agent, Sonic, turns goals into projects and assigns tasks to five specialists: Scout, Strategist, App builder, Backend, and Release & QA.",
          "Each agent loads only its own skills and keeps its own notebook. Each task is its own Claude Code job, so it survives restarts and can resume its session.",
          "A permission policy: agents have full access to their machine, the server's keys stay out of reach, and anything that spends money goes to me for approval, with a deadline.",
          "A Scout that collects App Store charts every five hours without using Claude, then rates up to three ideas, each claim with a source and a date.",
        ],
      },
      {
        focus: "stream",
        label: "System",
        body: "Every agent action becomes one typed event, streamed to the dashboard over Server-Sent Events. A dropped connection gets back exactly what it missed.",
      },
      {
        focus: "access",
        label: "Access",
        points: [
          "No email or password. A browser is paired once with a one-time code from the server, then opened with an 8-digit PIN.",
          "Two wrong PINs lock PIN entry on the server until a single-use emailed link is confirmed. The lock never stops running agents.",
          "The browser never sees a token or a key: only HttpOnly, SameSite=Strict cookies, served through the dashboard's own origin.",
        ],
      },
    ],
  },
  {
    id: "dpro",
    n: "03",
    title: "Phova-edge",
    kind: "Business operations & technical AI platform",
    org: "PHOVA Technology",
    stack: ["Next.js", "FastAPI", "PostgreSQL", "LangChain", "ChromaDB", "scikit-learn"],
    lede: "A platform that digitises PHOVA's departmental workflows and brings technical document extraction, knowledge retrieval and pump recommendations into the same system.",
    scale: "major",
    role: "Software engineering intern — workflow analysis, system design and implementation",
    beats: [
      {
        focus: "pipeline",
        label: "Context",
        body: "I analysed how PHOVA's departments work, including their responsibilities, information needs and handoffs, to translate day-to-day operations into a digital system.",
      },
      {
        focus: "roles",
        label: "Problem",
        body: "Digitising operations means understanding the work before designing the software: who owns each step, what information they need and how the next department takes over.",
      },
      {
        focus: "rules",
        label: "What I built",
        points: [
          "Mapped departmental workflows and translated business requirements into Phova-edge's structure and interfaces.",
          "Built authentication and user administration with JWT access tokens, refresh cookies and role-based permissions.",
          "Implemented core opportunity management and a role-gated state machine with 12 statuses and 18 transitions, alongside notifications, activity history and departmental SLA tracking.",
          "Built the UI/UX design system and most frontend pages; implemented KPI computation, with dashboard charts still planned.",
        ],
      },
      {
        focus: "screens",
        label: "System",
        body: "A monorepo with a Next.js App Router frontend and a Python FastAPI backend. Domain modules separate routers, business services and repositories, using async SQLAlchemy with PostgreSQL and Alembic migrations. Docker and Docker Compose run the application services.",
      },
      {
        focus: "screens",
        label: "Technical AI — documents to structured data",
        points: [
          "Built processing paths for PDF, Excel and Word documents using PyPDF2, pdfplumber, Docling, pandas, openpyxl and python-docx; scanned pages use pdf2image, Poppler and configurable vision providers.",
          "Extracted pump tags, flow, head, fluid properties and component materials into structured JSON, normalising French and English terminology through a custom technical dictionary.",
          "Used EasyOCR and OpenCV to locate extracted values on page images for review and highlighting.",
        ],
      },
      {
        focus: "rules",
        label: "Retrieval & recommendations",
        points: [
          "Built RAG retrieval with LangChain, ChromaDB and Sentence Transformers (all-MiniLM-L6-v2) to support extraction and material/foundry recommendations.",
          "Implemented Random Forest classifiers for pump types and references with scikit-learn, pandas and NumPy, with SHAP and language models for prediction explanations. Joblib stores models, encoders and feature definitions.",
          "Added custom Python hydraulic checks and configurable provider routing with fallback rules for Groq, Gemini and optional DeepSeek. Active providers and models depend on deployment configuration.",
          "Built document chat using a Groq text model and custom prompts, passing up to 14,000 characters directly as context; this chat path is separate from retrieval.",
        ],
      },
    ],
  },
  {
    id: "vamo",
    n: "04",
    title: "Vamo",
    kind: "Football identity mobile product",
    stack: ["React Native", "Supabase", "Row-level security"],
    lede: "A mobile product that gives football players a persistent identity across matches, teams and tournaments — including a Football Passport.",
    scale: "major",
    role: "Designed and built — product structure, core flows, data access",
    live: {
      href: "https://vamo-l.vercel.app/",
      label: "vamo-l.vercel.app",
    },
    beats: [
      {
        focus: "player",
        label: "Context",
        body: "Players, teams, matches and tournaments form a dense web of relationships. Vamo turns it into a persistent profile history.",
      },
      {
        focus: "privacy",
        label: "Problem",
        body: "The network has to be discoverable, while personal data stays visible only to the right people.",
      },
      {
        focus: "flows",
        label: "What I built",
        points: [
          "Product structure and core flows from zero: discovery, match and tournament creation, attendance, profile history.",
          "Persistent player identities, teams, tournaments and the Football Passport.",
          "Privacy-aware Supabase RLS, including teammate-only phone visibility and secure player-data access.",
        ],
      },
      {
        focus: "graph",
        label: "System",
        body: "React Native client on Supabase. Row-level security policies decide who can read which player data.",
      },
    ],
  },
  {
    id: "transcendence",
    n: "05",
    title: "Transcendence",
    kind: "Real-time multiplayer platform",
    stack: ["React", "TypeScript", "WebSockets"],
    lede: "A multiplayer Pong platform with authentication, live messaging and synchronised game state.",
    scale: "major",
    role: "Auth, live messaging, real-time game state and session behaviour",
    beats: [
      {
        focus: "clients",
        label: "Context",
        body: "Game state, chat and user interactions change at the same time, for many players, across many games.",
      },
      {
        focus: "sync",
        label: "Problem",
        body: "Every client has to agree on what is happening — the ball, the score, the conversation — while events keep arriving.",
      },
      {
        focus: "events",
        label: "What I built",
        points: [
          "Authentication, live messaging and synchronised game state.",
          "Real-time frontend state and game-session behaviour supporting more than 20 concurrent games.",
          "Event-driven communication to keep multiplayer state, chat and interactions in sync.",
        ],
      },
    ],
  },
  {
    id: "fit",
    n: "06",
    title: "FIT",
    kind: "AI wardrobe and outfit app",
    status: "Product concept",
    stack: ["React Native", "Recommendation system"],
    lede: "Catalogue the clothes you already own once. Get a complete, context-aware look each day — instead of another purchase.",
    scale: "minor",
    role: "Product concept and recommendation structure",
    beats: [
      {
        focus: "inputs",
        label: "Signals",
        body: "Wardrobe items, weather, skin tone, body shape, colour compatibility and personal preferences.",
      },
      {
        focus: "output",
        label: "Output",
        body: "Daily outfit recommendations built from wardrobe reuse rather than unnecessary purchases.",
      },
    ],
  },
  {
    id: "minishell",
    n: "07",
    title: "Minishell",
    kind: "Unix shell written in C",
    org: "42 Network (1337)",
    stack: ["C", "Unix processes", "Signals"],
    lede: "A working shell: it parses a line the way bash does, then runs it with fork, pipe, dup2 and execve — without leaking a descriptor.",
    scale: "major",
    role: "Parsing, execution and signal handling",
    beats: [
      {
        focus: "lex",
        label: "Context",
        body: "Everything a shell receives is one flat string. Before anything can run, it has to become tokens — words, operators, and quoted spans that mean themselves.",
      },
      {
        focus: "parse",
        label: "Problem",
        body: "Quotes, variable expansion, pipes and redirections all act on the same line, and the order they are resolved in decides what actually runs.",
      },
      {
        focus: "exec",
        label: "What I built",
        points: [
          "A tokeniser that respects single and double quotes, then a parser that turns the line into a pipeline of commands with their redirections.",
          "Expansion of $VAR and $? after tokenising, never inside single quotes.",
          "Execution with fork, pipe, dup2 and execve, PATH resolution, and heredocs — with builtins run in the parent when they change its state.",
          "The builtins the subject asks for: echo -n, cd, pwd, export, unset, env, exit.",
        ],
      },
      {
        focus: "signals",
        label: "System",
        body: "Interactive signal handling: Ctrl-C returns a fresh prompt and status 130, Ctrl-D ends the session, and every descriptor opened for a redirection is closed. The figure is that shell, modelled in the browser — type into it.",
      },
    ],
  },
  // Public descriptions deliberately omit client names, stacks and deliverables.
  {
    id: "confidential-01", n: "08", title: "Confidential project 01",
    kind: "Confidential work", status: "NDA", stack: [],
    lede: "Worked on a project covered by a non-disclosure agreement. Client identity, technical details and deliverables are confidential.",
    role: "Details confidential", scale: "minor", beats: [],
  },
  {
    id: "confidential-02", n: "09", title: "Confidential project 02",
    kind: "Confidential work", status: "NDA", stack: [],
    lede: "Worked on a second project covered by a non-disclosure agreement. Client identity, technical details and deliverables are confidential.",
    role: "Details confidential", scale: "minor", beats: [],
  },
];

export type Layer = {
  depth: string;
  name: string;
  where: string;
  role: string;
  body: string[];
  tags: string[];
  /** Optional interactive figure rendered with the layer. */
  visual?: "vr";
};

/** Ordered from the surface down: product work sits on top of its foundations. */
export const layers: Layer[] = [
  {
    depth: "Surface",
    name: "PHOVA Technology",
    where: "Production",
    role: "Software Engineering Intern",
    body: [
      "Built Phova-edge to digitise business operations, starting by analysing how sales, engineering, sourcing and management work and hand information between departments.",
      "Owned authentication, user administration, core opportunity workflows, notifications and UI/UX across Next.js and a layered FastAPI/SQLAlchemy backend on PostgreSQL. Also implemented KPI computation, with dashboard charts planned.",
      "Built technical AI workflows for document extraction, RAG retrieval and pump/material recommendations, combining configurable language and vision providers with Random Forest predictions, SHAP explanations and hydraulic calculations.",
    ],
    tags: ["Business process analysis", "System design", "Workflow digitisation", "RAG", "Document AI"],
  },
  {
    depth: "Interactive",
    name: "UM6P — IDC Morocco",
    where: "VR / Interactive Technologies",
    role: "VR Development Intern",
    body: [
      "Developed an immersive virtual-visit experience from prototype to functional delivery, including interactive 3D environments and navigation.",
    ],
    tags: ["Unity", "C#", "3D navigation"],
    visual: "vr",
  },
  {
    depth: "Foundation",
    name: "42 Network (1337)",
    where: "Software Engineering",
    role: "Common Core — in progress",
    body: [
      "Validated ft_irc, Minishell, Philosophers, ft_printf, Libft and 10+ projects — systems programming from the ground up.",
    ],
    tags: ["ft_irc", "Minishell", "Philosophers", "ft_printf", "Libft"],
  },
];

export type Tech = { name: string; used?: string[] };
export type Stratum = { id: string; name: string; note: string; items: Tech[] };

/** `used` references project numbers above, or "42" for the 1337 curriculum. */
export const strata: Stratum[] = [
  {
    id: "product",
    name: "Product engineering",
    note: "Above the surface — what people touch",
    items: [
      { name: "TypeScript", used: ["02", "05"] },
      { name: "JavaScript" },
      { name: "React", used: ["02", "05"] },
      { name: "React Native", used: ["04", "06"] },
      { name: "Next.js", used: ["03"] },
      { name: "Real-time systems", used: ["05"] },
    ],
  },
  {
    id: "backend",
    name: "Backend & systems",
    note: "Under the surface — state, data, transport",
    items: [
      { name: "C", used: ["42", "07"] },
      { name: "C++", used: ["42"] },
      { name: "Unix / Linux", used: ["42", "07"] },
      { name: "Processes & signals", used: ["07"] },
      { name: "TCP/IP", used: ["42"] },
      { name: "Python", used: ["03"] },
      { name: "FastAPI", used: ["03"] },
      { name: "SQLAlchemy", used: ["03"] },
      { name: "REST APIs", used: ["03"] },
      { name: "WebSockets", used: ["05"] },
      { name: "PostgreSQL", used: ["03"] },
      { name: "JWT authentication", used: ["03"] },
      { name: "Workflow state machines", used: ["03"] },
      { name: "Supabase", used: ["04"] },
      { name: "Docker / Compose", used: ["03"] },
    ],
  },
  {
    id: "ai",
    name: "Applied AI & agent systems",
    note: "Agents, document understanding, retrieval and prediction",
    items: [
      { name: "LLM agents", used: ["01", "02"] },
      { name: "Agent orchestration", used: ["01", "02"] },
      { name: "RAG", used: ["03"] },
      { name: "LangChain", used: ["03"] },
      { name: "ChromaDB", used: ["03"] },
      { name: "Sentence Transformers", used: ["03"] },
      { name: "Document AI / OCR", used: ["03"] },
      { name: "scikit-learn", used: ["03"] },
      { name: "Random Forest", used: ["03"] },
      { name: "SHAP", used: ["03"] },
      { name: "Coding agents", used: ["02"] },
      { name: "Claude API" },
      { name: "MCP", used: ["01", "02"] },
      { name: "Prompt engineering" },
      { name: "n8n" },
      { name: "Tool integration" },
    ],
  },
];

export const strengths = [
  "Business process analysis & digitisation",
  "Agent systems & tool integration",
  "System design for scalability & reliability",
  "Product delivery with coding agents",
  "Rapid learning & adaptation",
  "RBAC, data boundaries & review gates",
];

/** Engineering approach, from understanding operations to delivery. */
export const method = [
  { n: "i", title: "Understand the business", body: "Learn how teams work, map their responsibilities and handoffs, and identify what slows them down." },
  { n: "ii", title: "Design for growth", body: "Turn operational needs into clear workflows, data models and system boundaries, planning for scale and maintainability." },
  {
    n: "iii",
    title: "Engineer for reliability",
    body: "Choose algorithms and workflow logic for the problem, with clear permissions, failure handling and checks at critical boundaries.",
  },
  {
    n: "iv",
    title: "Build, check, adapt",
    body: "Build agent systems and use coding agents to deliver products. Learn the tools each problem needs, verify results and refine with user feedback.",
  },
];

export const languages = [
  { name: "Arabic", level: "Native" },
  { name: "English", level: "Professional" },
  { name: "French", level: "Intermediate" },
];
