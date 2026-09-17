import Figure, { k } from "./Figure";

const inputs = ["Wardrobe items", "Weather", "Skin tone", "Body shape", "Colour compatibility", "Preferences"];
const IY = (i: number) => 40 + i * 44;
const C = { x: 360, y: 150 };

export default function FitDiagram() {
  return (
    <Figure
      n="05"
      title="Recommendation model"
      viewBox="0 0 640 320"
      caption="Six signals merge into one context, which resolves into a complete look — reusing what is already owned"
    >
      <g {...k("inputs")}>
        {inputs.map((name, i) => (
          <g key={name}>
            <text x={24} y={IY(i) + 4} fill={i === 0 ? "var(--color-fg)" : undefined}>
              {name}
            </text>
            <circle cx={200} cy={IY(i)} r={4} className={i === 0 ? "solid" : "node"} />
            <path id={`fit-in-${i}`} d={`M204 ${IY(i)} C280 ${IY(i)} 280 ${C.y} ${C.x - 36} ${C.y}`} className="edge" />
            <circle r={2.5} className="packet">
              <animateMotion dur="2.8s" begin={`-${i * 0.45}s`} repeatCount="indefinite">
                <mpath href={`#fit-in-${i}`} />
              </animateMotion>
            </circle>
          </g>
        ))}
      </g>

      <g {...k("output")}>
        <circle cx={C.x} cy={C.y} r={36} className="node" />
        <circle cx={C.x} cy={C.y} r={36} fill="none" stroke="var(--color-fg)" strokeDasharray="2 4">
          <animateTransform attributeName="transform" type="rotate" from={`0 ${C.x} ${C.y}`} to={`360 ${C.x} ${C.y}`} dur="14s" repeatCount="indefinite" />
        </circle>
        <circle cx={C.x} cy={C.y} r={5} className="solid" />
        <text x={C.x} y={C.y + 58} textAnchor="middle" fill="var(--color-fg)">
          Context
        </text>
        <line x1={C.x + 36} x2={470} y1={C.y} y2={C.y} className="edge" />
        <line x1={C.x + 36} x2={470} y1={C.y} y2={C.y} className="flow" />
        <rect x={470} y={70} width={146} height={160} className="node" />
        <text x={478} y={88}>
          Complete look
        </text>
        {[0, 1, 2].map((i) => (
          <rect key={i} x={486} y={104 + i * 40} width={114} height={30} className="ghost" stroke="var(--color-fg-2)">
            <animate attributeName="fill" values="rgb(236 231 223 / 0.04);rgb(37 99 235 / 0.5);rgb(236 231 223 / 0.04)" dur="4.2s" begin={`-${(2 - i) * 0.35}s`} repeatCount="indefinite" />
          </rect>
        ))}
        <path id="fit-reuse" d="M543 230 C543 300 200 310 200 40" className="edge" strokeDasharray="2 5" />
        <text x={380} y={300} textAnchor="middle" className="hot">
          Reuse, not purchase
        </text>
      </g>
    </Figure>
  );
}
