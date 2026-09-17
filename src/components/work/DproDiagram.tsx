import Figure, { k } from "./Figure";

const stages = [
  ["Sales"],
  ["Technical", "evaluation"],
  ["Costing"],
  ["Sourcing"],
  ["Delivery"],
];
const roles = ["Sales", "Engineering", "Sourcing", "Management"];
const SX = (i: number) => 64 + i * 128;
const RX = (i: number) => 110 + i * 140;
const DUR = "10s";

/** keyTimes for stage i being "held" by the record (moves take the gaps). */
const holdTimes = (i: number) => {
  const a = i * 0.2;
  const b = Math.min(1, a + 0.1 + (i === 4 ? 0.1 : 0));
  return { values: "0.12;0.12;1;1;0.12;0.12", keyTimes: `0;${a};${a + 0.001};${b - 0.001};${b};1` };
};

export default function DproDiagram() {
  return (
    <Figure
      n="02"
      title="Opportunity lifecycle"
      viewBox="0 0 640 560"
      caption="One record, five stages, four responsibilities — access and notifications follow the work"
    >
      {/* Stages + record */}
      <g {...k("pipeline")}>
        {stages.map((name, i) => (
          <g key={i}>
            <text x={SX(i)} y={30} textAnchor="middle" className="tabular">
              S.{String(i + 1).padStart(2, "0")}
            </text>
            {name.map((line, j) => (
              <text key={line} x={SX(i)} y={52 + j * 13} textAnchor="middle" fill="var(--color-fg)">
                {line}
              </text>
            ))}
            {i > 0 && <line x1={SX(i) - 64} x2={SX(i) - 64} y1={20} y2={236} className="edge" strokeDasharray="1 4" />}
            <rect x={SX(i) - 15} y={135} width={30} height={30} className="node" />
            <rect x={SX(i) - 6} y={144} width={12} height={12} className="solid">
              <animate attributeName="opacity" dur={DUR} repeatCount="indefinite" {...holdTimes(i)} />
            </rect>
          </g>
        ))}
        <line x1={24} x2={616} y1={150} y2={150} className="edge" />
        <g>
          <rect x={-24} y={-40} width={48} height={20} fill="var(--color-bg)" stroke="var(--color-accent)" strokeWidth={1} />
          <line x1={-17} x2={10} y1={-33} y2={-33} stroke="var(--color-accent)" />
          <line x1={-17} x2={2} y1={-27} y2={-27} stroke="var(--color-accent)" opacity={0.6} />
          <line x1={0} x2={0} y1={-20} y2={-15} stroke="var(--color-accent)" />
          <animateMotion
            dur={DUR}
            repeatCount="indefinite"
            path="M64 150 H576"
            calcMode="linear"
            keyTimes="0;0.1;0.2;0.3;0.4;0.5;0.6;0.7;0.8;1"
            keyPoints="0;0;0.25;0.25;0.5;0.5;0.75;0.75;1;1"
          />
        </g>
        <text x={24} y={110}>
          Opportunity
        </text>
      </g>

      {/* Workflow rules between stages */}
      <g {...k("rules")}>
        {[1, 2, 3, 4].map((i) => (
          <g key={i}>
            <rect x={SX(i) - 64 - 5} y={145} width={10} height={10} transform={`rotate(45 ${SX(i) - 64} 150)`} className="node" />
            <rect x={SX(i) - 64 - 2} y={148} width={4} height={4} transform={`rotate(45 ${SX(i) - 64} 150)`} className="hot" />
          </g>
        ))}
        <text x={128} y={190} textAnchor="middle">
          Workflow rules
        </text>
      </g>

      {/* Notifications bus + roles (RBAC) */}
      <g {...k("roles")}>
        {stages.map((_, i) => (
          <line key={i} x1={SX(i)} x2={SX(i)} y1={165} y2={256} className="edge" strokeDasharray="1 4" />
        ))}
        <line x1={24} x2={616} y1={256} y2={256} className="edge" />
        <line x1={24} x2={616} y1={256} y2={256} className="flow" />
        <text x={24} y={246}>
          Notifications
        </text>
        {roles.map((r, i) => (
          <g key={r}>
            <line x1={RX(i)} x2={RX(i)} y1={256} y2={296} className="edge" />
            <circle cx={RX(i)} cy={310} r={14} className="node" />
            <path d={`M${RX(i) - 4} 312 h8 v6 h-8 z M${RX(i) - 2.5} 312 v-3 a2.5 2.5 0 0 1 5 0 v3`} className="edge" stroke="var(--color-fg-2)" />
            <text x={RX(i)} y={342} textAnchor="middle" fill="var(--color-fg)">
              {r}
            </text>
          </g>
        ))}
        <text x={616} y={372} textAnchor="end">
          Role-based access
        </text>
        {[0, 1, 2, 3].map((i) => (
          <circle key={i} r={2.5} className="packet">
            <animateMotion dur="3.2s" begin={`-${i * 0.8}s`} repeatCount="indefinite" path={`M24 256 H${RX(i)} V296`} />
          </circle>
        ))}
      </g>

      {/* Screen simplification */}
      <g {...k("screens")}>
        <line x1={24} x2={616} y1={392} y2={392} className="edge" strokeDasharray="1 4" />
        <text x={24} y={418}>
          Before — multi-step screen
        </text>
        {[
          [150, 0],
          [96, 1],
          [150, 2],
          [118, 0],
          [96, 3],
        ].map(([w, dup], i) => (
          <g key={i}>
            <rect x={24} y={432 + i * 20} width={w} height={10} className={dup === 2 || dup === 3 ? "ghost" : "ghost"} stroke="var(--color-line-2)" />
            {(dup === 2 || dup === 3) && (
              <rect x={24} y={432 + i * 20} width={w} height={10} fill="var(--color-accent)" opacity={0.5}>
                <animate attributeName="opacity" values="0.55;0.1;0.55" dur="2.6s" repeatCount="indefinite" />
              </rect>
            )}
          </g>
        ))}
        <path d="M234 482 H330" className="edge" markerEnd="url(#dp-arrow)" />
        <path d="M234 482 H330" className="flow" />
        <defs>
          <marker id="dp-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M0 0 L8 4 L0 8" fill="none" stroke="var(--color-fg-2)" />
          </marker>
        </defs>
        <text x={360} y={418}>
          After — aligned to responsibility
        </text>
        {[
          [170, "Sales"],
          [130, "Engineering"],
          [150, "Sourcing"],
        ].map(([w, owner], i) => (
          <g key={owner}>
            <rect x={360} y={436 + i * 28} width={w as number} height={12} className="ghost" stroke="var(--color-fg-2)" />
            <text x={616} y={446 + i * 28} textAnchor="end">
              {owner}
            </text>
          </g>
        ))}
      </g>
    </Figure>
  );
}
