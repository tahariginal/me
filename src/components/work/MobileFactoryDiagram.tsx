import Figure, { k } from "./Figure";

const S = { x: 320, y: 242 }; // Sonic's outlet
const WY = 318;
const workers = [
  { x: 88, name: "Scout" },
  { x: 204, name: "Strategist" },
  { x: 320, name: "App builder" },
  { x: 436, name: "Backend" },
  { x: 552, name: "Release · QA" },
];
const SC = workers[0].x; // the Scout runs on a clock
const RX = 620; // the approval line runs up the right edge
const L = { x: 153, y: 62 }; // ring lock: one point per PIN digit
const GY = 400; // permission policy
const BY = 468; // event bus

const task = (x: number) => `M${S.x} ${S.y} C${S.x} 285 ${x} 265 ${x} ${WY - 11}`;

export default function MobileFactoryDiagram() {
  return (
    <Figure
      n="02"
      title="Factory floor"
      viewBox="0 0 640 560"
      caption="A boss agent delegates to five specialists on an always-on VM — one policy gate, one approval inbox, one live event stream"
    >
      {/* You → dashboard → the VM */}
      <g {...k("remote")}>
        <text x={24} y={28}>
          You
        </text>
        <rect x={40} y={40} width={26} height={44} rx={4} className="node" />
        <line x1={49} x2={57} y1={77} y2={77} stroke="var(--color-fg-2)" />
        <line x1={66} x2={L.x - 18} y1={L.y} y2={L.y} className="edge" />
        <line x1={L.x + 18} x2={240} y1={L.y} y2={L.y} className="edge" />
        <rect x={240} y={38} width={160} height={48} className="node" />
        <text x={320} y={60} textAnchor="middle" className="big">
          Dashboard
        </text>
        <text x={320} y={76} textAnchor="middle">
          Vercel · React
        </text>
        <line x1={320} x2={320} y1={86} y2={196} className="edge" />
        <line x1={320} x2={320} y1={86} y2={196} className="flow" />
        <text x={332} y={124}>
          /v1 · HTTPS
        </text>
        <rect x={12} y={150} width={620} height={332} className="edge" strokeDasharray="2 4" />
        <text x={604} y={176} textAnchor="end">
          Oracle VM · always on
        </text>
      </g>

      {/* Ring lock: pair once, then an 8-digit PIN */}
      <g {...k("access")}>
        <text x={L.x} y={28} textAnchor="middle">
          PIN · 8 digits
        </text>
        <circle cx={L.x} cy={L.y} r={18} className="node" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
          const cx = L.x + Math.cos(a) * 18;
          const cy = L.y + Math.sin(a) * 18;
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={2.5} className="node" />
              <circle cx={cx} cy={cy} r={2.5} className="hot" opacity={0}>
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.8;1" dur="4s" begin={`${i * 0.25}s`} repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}
        <circle cx={L.x} cy={L.y} r={3.5} className="solid" />
        <text x={L.x} y={104} textAnchor="middle" className="hot">
          2 misses · locked
        </text>
      </g>

      {/* Sonic plans, five specialists build; every settled task calls him back */}
      <g {...k("crew")}>
        <rect x={240} y={196} width={160} height={46} className="node" />
        <text x={320} y={216} textAnchor="middle" className="big">
          Sonic
        </text>
        <text x={320} y={232} textAnchor="middle">
          plans · assigns
        </text>
        {workers.map((w, i) => (
          <g key={w.name}>
            <path id={`mf-t${i}`} d={task(w.x)} className="edge" />
            <circle cx={w.x} cy={WY} r={11} className="node" />
            <circle cx={w.x} cy={WY} r={3} className="solid" />
            <text x={w.x} y={350} textAnchor="middle" fill={i === 0 ? "var(--color-fg)" : undefined}>
              {w.name}
            </text>
            <circle r={2.5} className="packet">
              <animateMotion dur="3.6s" begin={`-${i * 0.7}s`} repeatCount="indefinite">
                <mpath href={`#mf-t${i}`} />
              </animateMotion>
            </circle>
          </g>
        ))}
        <circle cx={SC} cy={WY} r={18} fill="none" stroke="var(--color-fg-2)" strokeDasharray="2 5">
          <animateTransform attributeName="transform" type="rotate" from={`0 ${SC} ${WY}`} to={`360 ${SC} ${WY}`} dur="12s" repeatCount="indefinite" />
        </circle>
        <text x={SC} y={368} textAnchor="middle">
          every 5 h
        </text>
        <path id="mf-back" d={`M${SC} ${WY - 11} C${SC} 250 170 219 240 219`} className="edge" strokeDasharray="2 4" />
        <text x={40} y={214}>
          Settled → Sonic
        </text>
        <circle r={2.5} className="packet">
          <animateMotion dur="3.2s" begin="-1.2s" repeatCount="indefinite">
            <mpath href="#mf-back" />
          </animateMotion>
        </circle>
      </g>

      {/* Every tool call meets the policy: allow, never, or ask you */}
      <g {...k("gate")}>
        {workers.map((w, i) => (
          <g key={w.x}>
            <line x1={w.x} x2={w.x} y1={376} y2={GY} className="edge" />
            <circle r={2} className="packet">
              <animateMotion dur="1.8s" begin={`-${i * 0.35}s`} repeatCount="indefinite" path={`M${w.x} 376 V${GY}`} />
            </circle>
          </g>
        ))}
        <line x1={40} x2={600} y1={GY} y2={GY} className="edge" strokeDasharray="3 5" />
        <rect x={314} y={GY - 6} width={12} height={12} transform={`rotate(45 320 ${GY})`} className="node" />
        <rect x={317} y={GY - 3} width={6} height={6} transform={`rotate(45 320 ${GY})`} className="hot">
          <animate attributeName="opacity" values="0.25;1;0.25" dur="2.2s" repeatCount="indefinite" />
        </rect>
        <text x={320} y={422} textAnchor="middle" fill="var(--color-fg)">
          Permission policy
        </text>
        <text x={40} y={446}>
          Auto · full access
        </text>
        <text x={320} y={446} textAnchor="middle">
          Keys · never
        </text>
        <text x={600} y={446} textAnchor="end" className="hot">
          Money → asks you
        </text>
        <path id="mf-ask" d={`M600 ${GY} H${RX} V74 H400`} className="edge" stroke="var(--color-accent)" strokeDasharray="3 4" />
        <rect x={397} y={71} width={6} height={6} className="hot" />
        <text x={600} y={40} textAnchor="end" className="hot">
          Approval inbox
        </text>
        <text x={600} y={56} textAnchor="end">
          No answer → deny
        </text>
        <circle r={3.5} className="packet hot">
          <animateMotion dur="4s" begin="-1s" repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;0.7;1" calcMode="linear">
            <mpath href="#mf-ask" />
          </animateMotion>
        </circle>
      </g>

      {/* One typed event per action, streamed live and replayed after a drop */}
      <g {...k("stream")}>
        <path id="mf-ev" d={`M600 ${BY} H28 V200 C28 130 272 140 272 86`} className="edge" />
        <path d={`M600 ${BY} H28 V200 C28 130 272 140 272 86`} className="flow" />
        {[0, 1, 2].map((i) => (
          <circle key={i} r={2.5} className="packet">
            <animateMotion dur="6s" begin={`-${i * 2}s`} repeatCount="indefinite">
              <mpath href="#mf-ev" />
            </animateMotion>
          </circle>
        ))}
        <text x={28} y={510}>
          Every action → one typed event · SSE
        </text>
        <text x={28} y={528}>
          A dropped link replays what it missed
        </text>
      </g>
    </Figure>
  );
}
