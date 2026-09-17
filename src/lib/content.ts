/**
 * Every fact on the site lives here and is sourced from taha_titiz_cv.pdf.
 * Copy is rephrased for the web, but no company, metric, technology or
 * outcome appears here that the CV does not support.
 */

export const person = {
  name: "Taha Koulal",
  role: "Software engineer",
  focus: "Backend, AI & product engineering",
  email: "tkoulal.21@gmail.com",
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
  /** A live product visitors can open in a new tab. */
  live?: { href: string; label: string };
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
        body: "Small, specialised agent teams instead of one general agent — modelled for reliability, accountability and deterministic project execution.",
      },
    ],
  },
  {
    id: "dpro",
    n: "02",
    title: "DPRO",
    kind: "Business opportunity platform",
    org: "PHOVA Technology",
    stack: ["Next.js", "Supabase", "RBAC"],
    lede: "A production platform that carries each business opportunity through sales, technical evaluation, costing, sourcing and delivery.",
    scale: "major",
    role: "Software engineering intern — contributor to a production codebase",
    beats: [
      {
        focus: "pipeline",
        label: "Context",
        body: "Opportunities move between sales, engineering, sourcing and management. Each team owns a different part of the same record.",
      },
      {
        focus: "roles",
        label: "Problem",
        body: "Permissions, notifications and screens have to follow how the work actually moves between people — not duplicate it.",
      },
      {
        focus: "rules",
        label: "What I built",
        points: [
          "Built and improved RBAC, notifications and workflow rules.",
          "Opportunity management and complex technical interfaces, shaped with business stakeholders.",
          "Simplified multi-step technical screens by removing duplicated information and aligning them with real operational responsibilities.",
        ],
      },
      {
        focus: "screens",
        label: "System",
        body: "Next.js and Supabase, with access control and workflow rules mapped to operational responsibilities.",
      },
    ],
  },
  {
    id: "vamo",
    n: "03",
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
    n: "04",
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
    n: "05",
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
      "Delivered backend and product features inside an existing codebase, translating operational requirements from sales, engineering, sourcing and management into usable workflows.",
      "Worked across backend behaviour, access control, notifications, workflows and product UX, coordinating feedback with non-technical stakeholders.",
    ],
    tags: ["Backend", "Access control", "Workflows", "Product UX"],
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
      { name: "TypeScript", used: ["04"] },
      { name: "JavaScript" },
      { name: "React", used: ["04"] },
      { name: "React Native", used: ["03", "05"] },
      { name: "Next.js", used: ["02"] },
      { name: "Real-time systems", used: ["04"] },
    ],
  },
  {
    id: "backend",
    name: "Backend & systems",
    note: "Under the surface — state, data, transport",
    items: [
      { name: "C", used: ["42"] },
      { name: "C++", used: ["42"] },
      { name: "Unix / Linux", used: ["42"] },
      { name: "TCP/IP", used: ["42"] },
      { name: "REST APIs" },
      { name: "WebSockets", used: ["04"] },
      { name: "PostgreSQL" },
      { name: "Supabase", used: ["02", "03"] },
    ],
  },
  {
    id: "ai",
    name: "AI & automation",
    note: "Orchestration — agents that act on the system",
    items: [
      { name: "LLM agents", used: ["01"] },
      { name: "Claude API" },
      { name: "MCP", used: ["01"] },
      { name: "Prompt engineering" },
      { name: "n8n" },
      { name: "Tool integration" },
    ],
  },
];

export const strengths = [
  "0-to-1 product development",
  "Architecture and technical scoping",
  "RBAC, security and data boundaries",
  "Workflow and systems design",
  "Cross-functional collaboration",
  "AI-assisted delivery with review gates",
];

/** The CV's engineering approach, split into its four moves. */
export const method = [
  { n: "i", title: "Start with the workflow", body: "Begin from the user and the business workflow, not the stack." },
  { n: "ii", title: "Make ambiguity explicit", body: "Translate unclear needs into explicit priorities." },
  {
    n: "iii",
    title: "Secure the foundations",
    body: "Clear permissions, data boundaries, auditability and review gates.",
  },
  {
    n: "iv",
    title: "Accelerate with AI",
    body: "Use AI to move faster while engineering judgment and product quality stay central.",
  },
];

export const languages = [
  { name: "Arabic", level: "Native" },
  { name: "English", level: "Professional" },
  { name: "French", level: "Intermediate" },
];
