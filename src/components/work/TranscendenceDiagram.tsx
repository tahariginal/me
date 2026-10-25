import Figure, { k } from "./Figure";

const L = { a: 100, s: 320, b: 540 };
const events: { y: number; from: keyof typeof L; to: keyof typeof L; label: string; hot?: boolean }[] = [
  { y: 296, from: "a", to: "s", label: "auth" },
  { y: 330, from: "s", to: "a", label: "session" },
  { y: 364, from: "a", to: "s", label: "input" },
  { y: 364, from: "s", to: "b", label: "game state", hot: true },
  { y: 404, from: "b", to: "s", label: "chat" },
  { y: 404, from: "s", to: "a", label: "chat" },
  { y: 444, from: "s", to: "a", label: "sync", hot: true },
  { y: 444, from: "s", to: "b", label: "sync", hot: true },
];

export default function TranscendenceDiagram() {
  const ball = "M92 104 L320 62 L548 132 L320 180 L92 104";
  return (
    <Figure
      n="04"
      title="Event stream"
      viewBox="0 0 640 560"
      caption="Game state, chat and auth as events between clients over WebSockets"
    >
      {/* Court: the net is the server */}
      <g {...k("sync")}>
        <rect x={60} y={40} width={520} height={164} className="edge" />
        <line x1={320} x2={320} y1={40} y2={204} className="edge" strokeDasharray="4 6" />
        <rect x={76} y={86} width={4} height={36} className="solid">
          <animateMotion dur="3.2s" repeatCount="indefinite" path="M0 0 L0 30 L0 36 L0 0" keyTimes="0;0.4;0.6;1" keyPoints="0;0.45;0.5;1" calcMode="linear" />
        </rect>
        <rect x={560} y={96} width={4} height={36} className="solid">
          <animateMotion dur="3.2s" repeatCount="indefinite" path="M0 -30 L0 18 L0 -30" keyTimes="0;0.5;1" keyPoints="0;0.5;1" calcMode="linear" />
        </rect>
        <circle r={5} className="packet hot">
          <animateMotion dur="3.2s" repeatCount="indefinite" path={ball} />
        </circle>
        <text x={60} y={28}>
          Client A
        </text>
        <text x={320} y={28} textAnchor="middle" fill="var(--color-fg)">
          Server
        </text>
        <text x={580} y={28} textAnchor="end">
          Client B
        </text>
      </g>

      {/* Lifelines */}
      <g {...k("clients")}>
        {(Object.keys(L) as (keyof typeof L)[]).map((key) => (
          <g key={key}>
            <rect x={L[key] - 56} y={236} width={112} height={30} className="node" />
            <text x={L[key]} y={255} textAnchor="middle" fill="var(--color-fg)">
              {key === "s" ? "WebSocket srv" : `Client ${key.toUpperCase()}`}
            </text>
            <line x1={L[key]} x2={L[key]} y1={266} y2={470} className="edge" strokeDasharray="2 4" />
          </g>
        ))}
      </g>

      {/* Events */}
      <g {...k("events")}>
        {events.map((e, i) => {
          const x1 = L[e.from];
          const x2 = L[e.to];
          const dir = Math.sign(x2 - x1);
          return (
            <g key={i}>
              <line x1={x1} x2={x2 - dir * 4} y1={e.y} y2={e.y} className="edge" />
              <path d={`M${x2 - dir * 8} ${e.y - 4} L${x2 - dir * 2} ${e.y} L${x2 - dir * 8} ${e.y + 4}`} className="edge" />
              <text x={(x1 + x2) / 2} y={e.y - 7} textAnchor="middle" className={e.hot ? "hot" : undefined}>
                {e.label}
              </text>
              <circle r={2.5} className={e.hot ? "packet hot" : "packet"}>
                <animateMotion dur="2.4s" begin={`-${(i * 0.3).toFixed(1)}s`} repeatCount="indefinite" path={`M${x1} ${e.y} H${x2}`} />
              </circle>
            </g>
          );
        })}
        <text x={24} y={508}>
          20+ concurrent games
        </text>
        {Array.from({ length: 24 }, (_, i) => (
          <rect key={i} x={24 + i * 24.5} y={520} width={14} height={14} className="ghost" stroke="var(--color-line-2)">
            <animate attributeName="fill" values="rgb(236 231 223 / 0.06);rgb(236 231 223 / 0.7);rgb(236 231 223 / 0.06)" dur={`${1.6 + (i % 5) * 0.35}s`} begin={`-${(i * 0.37) % 2}s`} repeatCount="indefinite" />
          </rect>
        ))}
      </g>
    </Figure>
  );
}
