import Figure, { k } from "./Figure";

const modes = [
  { x: 150, agents: [104, 196] },
  { x: 330, agents: [280, 330, 380] },
  { x: 510, agents: [464, 556] },
];

const Gate = ({ y, label }: { y: number; label: string }) => (
  <g>
    <line x1={120} x2={600} y1={y} y2={y} className="edge" strokeDasharray="3 5" />
    <rect x={324} y={y - 6} width={12} height={12} transform={`rotate(45 330 ${y})`} className="node" />
    <rect x={327} y={y - 3} width={6} height={6} transform={`rotate(45 330 ${y})`} className="hot">
      <animate attributeName="opacity" values="0.25;1;0.25" dur="2.2s" repeatCount="indefinite" />
    </rect>
    <text x={120} y={y - 9}>
      {label}
    </text>
  </g>
);

export default function FactoryDiagram() {
  return (
    <Figure
      n="01"
      title="Delegation graph"
      viewBox="0 0 640 560"
      caption="CEO agent → CTO modes → build agents, gated by permissions and milestone reviews"
    >
      {/* Audit rail */}
      <g {...k("state")}>
        <line x1={28} x2={28} y1={92} y2={524} className="edge" />
        {[114, 176, 254, 330, 402, 462, 520].map((y, i) => (
          <g key={y}>
            <line x1={36} x2={250} y1={y} y2={y} className="edge" strokeDasharray="1 6" opacity={0.6} />
            <rect x={20} y={y - 1.5} width={16} height={3} className="solid">
              <animate
                attributeName="opacity"
                values="0.15;1;0.15"
                dur="3.5s"
                begin={`${i * 0.5}s`}
                repeatCount="indefinite"
              />
            </rect>
          </g>
        ))}
        <text x={28} y={546} textAnchor="start">
          Persistent state · audit log
        </text>
      </g>

      {/* Idea → CEO */}
      <g {...k("ceo")}>
        <circle cx={330} cy={30} r={4} className="solid" />
        <text x={342} y={34}>
          Incoming idea
        </text>
        <line x1={330} x2={330} y1={36} y2={92} className="edge" />
        <rect x={250} y={92} width={160} height={46} className="node" />
        <text x={330} y={113} textAnchor="middle" className="big">
          CEO agent
        </text>
        <text x={330} y={129} textAnchor="middle">
          evaluate · delegate
        </text>
      </g>

      {/* CTO modes + build agents in a sandbox */}
      <g {...k("agents")}>
        {modes.map((m, i) => (
          <g key={m.x}>
            <path d={`M330 138 C330 196 ${m.x} 196 ${m.x} 236`} className="edge" />
            <rect x={m.x - 62} y={236} width={124} height={36} className="node" />
            <text x={m.x} y={258} textAnchor="middle">
              CTO · mode {i + 1}
            </text>
            {m.agents.map((ax) => (
              <g key={ax}>
                <path d={`M${m.x} 272 L${ax} 372`} className="edge" />
                <circle cx={ax} cy={382} r={9} className="node" />
                <circle cx={ax} cy={382} r={2.5} className="solid" />
                <line x1={ax} x2={ax} y1={391} y2={462} className="edge" />
              </g>
            ))}
          </g>
        ))}
        <rect x={64} y={322} width={536} height={96} className="edge" strokeDasharray="2 4" />
        <text x={72} y={338}>
          Sandbox
        </text>
        <text x={592} y={338} textAnchor="end">
          Focused build agents
        </text>
      </g>

      {/* Gates + escalation */}
      <g {...k("gates")}>
        <Gate y={184} label="Permission gate" />
        <Gate y={462} label="Milestone review" />
        <path id="f-esc" d="M556 373 C630 300 640 140 410 112" className="edge" stroke="var(--color-accent)" strokeDasharray="3 4" />
        <text x={632} y={240} textAnchor="end" className="hot">
          SLA escalation
        </text>
        <line x1={330} x2={330} y1={462} y2={516} className="edge" />
        <rect x={322} y={516} width={16} height={16} className="solid" />
        <text x={348} y={528}>
          Milestone shipped
        </text>
      </g>

      {/* Packets */}
      <circle r={3} className="packet">
        <animateMotion dur="4.8s" repeatCount="indefinite" path="M330 36 V138 C330 196 330 196 330 236 V272 V372 V462 V516" />
      </circle>
      <circle r={3} className="packet">
        <animateMotion dur="5.2s" begin="-1.4s" repeatCount="indefinite" path="M330 138 C330 196 150 196 150 236 V272 L104 372 V462" />
      </circle>
      <circle r={3} className="packet">
        <animateMotion dur="5.6s" begin="-2.6s" repeatCount="indefinite" path="M330 138 C330 196 510 196 510 236 V272 L556 372 V462" />
      </circle>
      <circle r={3.5} className="packet hot">
        <animateMotion dur="3.4s" begin="-1s" repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;0.6;1" calcMode="linear">
          <mpath href="#f-esc" />
        </animateMotion>
      </circle>
    </Figure>
  );
}
