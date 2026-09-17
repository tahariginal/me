import Figure, { k } from "./Figure";

const P = { x: 320, y: 262 };
const teams = [
  { id: "t1", x: 170, y: 150, mates: [ [84, 96], [214, 58] ] },
  { id: "t2", x: 470, y: 150, mates: [ [426, 58], [560, 96] ] },
];
const matches = [
  { x: 118, y: 330, team: 0 },
  { x: 226, y: 414, team: 0 },
  { x: 414, y: 414, team: 1 },
  { x: 522, y: 330, team: 1 },
];
const T = { x: 320, y: 494 };
const opponents = [ [52, 428], [588, 428] ];

export default function VamoDiagram() {
  return (
    <Figure
      n="03"
      title="Identity graph"
      viewBox="0 0 640 560"
      caption="A player at the centre of teams, matches and tournaments — phone numbers visible to teammates only"
    >
      {/* Relationships */}
      <g {...k("graph")}>
        {teams.map((t) => (
          <g key={t.id}>
            <line x1={P.x} y1={P.y} x2={t.x} y2={t.y} className="edge" />
            {t.mates.map(([x, y]) => (
              <line key={x} x1={t.x} y1={t.y} x2={x} y2={y} className="edge" />
            ))}
          </g>
        ))}
        {matches.map((m, i) => (
          <line key={i} x1={teams[m.team].x} y1={teams[m.team].y} x2={m.x} y2={m.y} className="edge" />
        ))}
        {[matches[1], matches[2]].map((m, i) => (
          <line key={i} x1={m.x} y1={m.y} x2={T.x} y2={T.y} className="edge" />
        ))}
        <line x1={opponents[0][0]} y1={opponents[0][1]} x2={matches[0].x} y2={matches[0].y} className="edge" />
        <line x1={opponents[1][0]} y1={opponents[1][1]} x2={matches[3].x} y2={matches[3].y} className="edge" />
        {teams.map((t, i) => (
          <g key={t.id}>
            <rect x={t.x - 12} y={t.y - 12} width={24} height={24} className="node" />
            <text x={t.x} y={t.y - 20} textAnchor="middle" fill="var(--color-fg)">
              Team {i + 1}
            </text>
            {t.mates.map(([x, y]) => (
              <circle key={x} cx={x} cy={y} r={6} className="node" />
            ))}
          </g>
        ))}
        {opponents.map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r={6} className="node" />
        ))}
      </g>

      {/* Product flows: matches, tournaments, attendance */}
      <g {...k("flows")}>
        {matches.map((m, i) => (
          <g key={i}>
            <line x1={P.x} y1={P.y} x2={m.x} y2={m.y} className="edge" strokeDasharray="2 4" />
            <circle cx={m.x} cy={m.y} r={9} className="node" />
            <path d={`M${m.x - 3.5} ${m.y} h7 M${m.x} ${m.y - 3.5} v7`} stroke="var(--color-fg-2)" />
          </g>
        ))}
        <text x={matches[0].x} y={matches[0].y + 26} textAnchor="middle">
          Match
        </text>
        <text x={matches[3].x} y={matches[3].y + 26} textAnchor="middle">
          Attendance
        </text>
        <rect x={T.x - 11} y={T.y - 11} width={22} height={22} transform={`rotate(45 ${T.x} ${T.y})`} className="node" />
        <rect x={T.x - 4} y={T.y - 4} width={8} height={8} transform={`rotate(45 ${T.x} ${T.y})`} className="solid" />
        <text x={T.x} y={T.y + 34} textAnchor="middle" fill="var(--color-fg)">
          Tournament
        </text>
        {matches.map((m, i) => (
          <circle key={i} r={2.5} className="packet">
            <animateMotion dur="3s" begin={`-${i * 0.75}s`} repeatCount="indefinite" path={`M${m.x} ${m.y} L${P.x} ${P.y}`} />
          </circle>
        ))}
      </g>

      {/* Privacy: RLS decides who sees the phone number */}
      <g {...k("privacy")}>
        {teams.flatMap((t) =>
          t.mates.map(([x, y]) => (
            <path key={`${x}-${y}`} d={`M${P.x} ${P.y} L${x} ${y}`} stroke="var(--color-accent)" strokeWidth={1} strokeDasharray="1 5" fill="none" opacity={0.8} />
          )),
        )}
        {opponents.map(([x, y]) => {
          const mx = (P.x + x) / 2;
          const my = (P.y + y) / 2;
          return (
            <g key={x}>
              <path d={`M${P.x} ${P.y} L${mx} ${my}`} className="edge" strokeDasharray="1 5" />
              <path d={`M${mx - 5} ${my - 5} l10 10 m0 -10 l-10 10`} stroke="var(--color-fg-2)" />
            </g>
          );
        })}
        <text x={24} y={220}>
          Phone · teammates only
        </text>
        <text x={616} y={220} textAnchor="end" className="hot">
          RLS policy
        </text>
      </g>

      {/* Player + Football Passport */}
      <g {...k("player")}>
        <circle cx={P.x} cy={P.y} r={58} className="edge" strokeDasharray="2 6">
          <animateTransform attributeName="transform" type="rotate" from={`0 ${P.x} ${P.y}`} to={`360 ${P.x} ${P.y}`} dur="40s" repeatCount="indefinite" />
        </circle>
        <circle cx={P.x} cy={P.y} r={22} className="node" />
        <circle cx={P.x} cy={P.y} r={22} fill="none" stroke="var(--color-fg)">
          <animate attributeName="r" values="22;58" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx={P.x} cy={P.y} r={6} className="solid" />
        <text x={P.x} y={P.y + 80} textAnchor="middle" className="big">
          Player
        </text>
        <text x={P.x} y={P.y - 70} textAnchor="middle">
          Football Passport
        </text>
      </g>
    </Figure>
  );
}
