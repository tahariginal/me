import Figure, { k } from "./Figure";

/* One octave, C4–C5, as the number keys play it. */
const KX = 132; // left edge of the keyboard
const KW = 47; // white key width
const KY = 40;
const KH = 84;
const BW = 26;
const BH = 50;
const blacks = [1, 2, 4, 5, 6]; // white-key boundaries that carry a black key

/* Ode to Joy, first phrase, from the melody library: number key and length in beats, at 104 BPM. */
const ode: [number, number][] = [
  [3, 1], [3, 1], [4, 1], [5, 1], [5, 1], [4, 1], [3, 1], [2, 1],
  [1, 1], [1, 1], [2, 1], [3, 1], [3, 1.5], [2, 0.5], [2, 2],
];
const SPB = 60 / 104;
const REST = 1.4;
let clock = 0;
const starts = ode.map(([, beats]) => {
  const t = clock;
  clock += beats * SPB;
  return t;
});
const DUR = clock + REST;

/** Discrete opacity track for one key: lit while its note is held, 88% of the beat. */
function track(digit: number) {
  const times = ["0"];
  const values = ["0"];
  ode.forEach(([d, beats], i) => {
    if (d !== digit) return;
    const on = starts[i] / DUR;
    const off = (starts[i] + beats * SPB * 0.88) / DUR;
    if (on === 0) values[0] = "1";
    else {
      times.push(on.toFixed(4));
      values.push("1");
    }
    times.push(off.toFixed(4));
    values.push("0");
  });
  return times.length > 1 ? { keyTimes: times.join(";"), values: values.join(";") } : null;
}

const C = { x: 220, y: 214, w: 200, h: 48 }; // controller
const P = { x: 560, y: 238 }; // player
const BUS = 300;
const listeners = [
  { x: 180, name: "Scene", sub: "Draws on change", key: "scene" },
  { x: 330, name: "Lessons", sub: "Notes · order", key: "timeline" },
  { x: 480, name: "Recorder", sub: "→ Timeline", key: "timeline" },
];
const LY = 330;
const AY = 480; // audio chain
const chain = [
  { x: 64, name: "Sample" },
  { x: 172, name: "Lowpass" },
  { x: 280, name: "Gain" },
  { x: 388, name: "Bus" },
  { x: 496, name: "Limiter" },
  { x: 592, name: "Out" },
];
/* 21 recordings, C2 to C7, one every minor third. */
const SX = 96;
const SY = 432;
const samples = Array.from({ length: 21 }, (_, i) => SX + i * 8);
const LIT = 8; // C4

export default function PianoDiagram() {
  return (
    <Figure
      n="08"
      title="Signal path"
      viewBox="0 0 640 560"
      caption="Every input holds its note in one controller — the sound fires first, then the scene, the lessons and the recorder are told"
    >
      {/* The keys: number keys 1–8 play C4–C5 */}
      <g {...k("input")}>
        <text x={24} y={28}>
          Ode to Joy · 104 BPM
        </text>
        <text x={616} y={28} textAnchor="end">
          Octave 4
        </text>
        {Array.from({ length: 8 }, (_, i) => {
          const t = track(i + 1);
          return (
            <g key={i}>
              <rect x={KX + i * KW} y={KY} width={KW} height={KH} className="node" />
              {t && (
                <rect x={KX + i * KW + 4} y={KY + BH + 4} width={KW - 8} height={KH - BH - 8} className="hot" opacity={0}>
                  <animate attributeName="opacity" calcMode="discrete" keyTimes={t.keyTimes} values={t.values} dur={`${DUR.toFixed(2)}s`} repeatCount="indefinite" />
                </rect>
              )}
              <text x={KX + i * KW + KW / 2} y={KY + KH - 10} textAnchor="middle" fill="var(--color-fg)">
                {i + 1}
              </text>
            </g>
          );
        })}
        {blacks.map((b) => (
          <g key={b}>
            <rect x={KX + b * KW - BW / 2} y={KY} width={BW} height={BH} className="node" />
            <rect x={KX + b * KW - BW / 2} y={KY} width={BW} height={BH} className="ghost" stroke="var(--color-fg-2)" />
          </g>
        ))}
        <text x={24} y={KY + KH / 2 + 4}>
          C4
        </text>
        <text x={616} y={KY + KH / 2 + 4} textAnchor="end">
          C5
        </text>
        <text x={24} y={150}>
          Shift · black keys
        </text>
        <text x={616} y={150} textAnchor="end">
          [ ] octave · Space pedal
        </text>
        {[
          { x: 280, label: "Keys", anchor: "end" as const, dx: -12 },
          { x: 360, label: "Touch", anchor: "start" as const, dx: 12 },
        ].map((e, i) => (
          <g key={e.label}>
            <line x1={e.x} x2={e.x} y1={KY + KH} y2={C.y} className="edge" />
            <text x={e.x + e.dx} y={190} textAnchor={e.anchor}>
              {e.label}
            </text>
            <circle r={2.5} className="packet">
              <animateMotion dur="1.6s" begin={`-${i * 0.7}s`} repeatCount="indefinite" path={`M${e.x} ${KY + KH} V${C.y}`} />
            </circle>
          </g>
        ))}
      </g>

      {/* One record of held notes: a note sounds while any holder holds it */}
      <g {...k("holds")}>
        <rect x={C.x} y={C.y} width={C.w} height={C.h} className="node" />
        <text x={C.x + C.w / 2} y={C.y + 20} textAnchor="middle" className="big">
          Controller
        </text>
        <text x={C.x + C.w / 2} y={C.y + 36} textAnchor="middle">
          Holds · counts
        </text>
        <text x={C.x - 16} y={C.y + 18} textAnchor="end">
          2 holders · 1 note
        </text>
        <text x={C.x - 16} y={C.y + 36} textAnchor="end" className="hot">
          Sounds once
        </text>
        <line x1={320} x2={320} y1={C.y + C.h} y2={BUS} className="edge" />
        <line x1={chain[0].x} x2={listeners[2].x} y1={BUS} y2={BUS} className="edge" />
        <text x={chain[0].x + 12} y={BUS - 8}>
          1 · Sound first
        </text>
        <text x={332} y={BUS - 8}>
          2 · Listeners
        </text>
        {listeners.map((l) => (
          <line key={l.name} x1={l.x} x2={l.x} y1={BUS} y2={LY - 11} className="edge" />
        ))}
      </g>

      {/* The sampler: a voice per note, a shared room and a limiter */}
      <g {...k("sound")}>
        <line x1={chain[0].x} x2={chain[0].x} y1={BUS} y2={AY - 11} className="edge" />
        <line x1={chain[0].x} x2={chain[0].x} y1={BUS} y2={AY - 11} className="flow" />
        <text x={SX} y={SY - 16}>
          21 recordings · C2–C7
        </text>
        {samples.map((x, i) => (
          <circle key={x} cx={x} cy={SY} r={i === LIT ? 3 : 1.5} className={i === LIT ? "hot" : "solid"} opacity={i === LIT ? 1 : 0.5} />
        ))}
        <path d={`M${samples[LIT]} ${SY + 3} C${samples[LIT]} ${SY + 30} ${chain[0].x + 30} ${AY} ${chain[0].x + 11} ${AY}`} className="edge" stroke="var(--color-accent)" />
        <path id="pn-chain" d={`M${chain[0].x + 11} ${AY} H${chain[chain.length - 1].x - 11}`} className="edge" />
        <path d={`M${chain[0].x + 11} ${AY} H${chain[chain.length - 1].x - 11}`} className="flow" />
        <path
          d={`M${chain[3].x} ${AY - 11} C${chain[3].x + 20} ${AY - 44} ${chain[4].x - 20} ${AY - 44} ${chain[4].x} ${AY - 11}`}
          className="edge"
          strokeDasharray="2 4"
        />
        <text x={(chain[3].x + chain[4].x) / 2} y={AY - 42} textAnchor="middle">
          Reverb
        </text>
        {chain.map((n) => (
          <g key={n.name}>
            <circle cx={n.x} cy={AY} r={11} className="node" />
            <circle cx={n.x} cy={AY} r={3} className="solid" />
            <text x={n.x} y={AY + 30} textAnchor="middle" fill={n.name === "Sample" ? "var(--color-fg)" : undefined}>
              {n.name}
            </text>
          </g>
        ))}
        {[0, 1].map((i) => (
          <circle key={i} r={2.5} className="packet">
            <animateMotion dur="3s" begin={`-${i * 1.5}s`} repeatCount="indefinite">
              <mpath href="#pn-chain" />
            </animateMotion>
          </circle>
        ))}
        <text x={24} y={540}>
          Web Audio · no audio library
        </text>
      </g>

      {/* The 3D instrument: it renders only while something moves */}
      <g {...k("scene")}>
        <circle cx={listeners[0].x} cy={LY} r={11} className="node" />
        <circle cx={listeners[0].x} cy={LY} r={3} className="solid" />
        <circle cx={listeners[0].x} cy={LY} r={17} fill="none" stroke="var(--color-fg-2)" strokeDasharray="2 5" opacity={0}>
          <animate attributeName="opacity" values="0;1;0;0" keyTimes="0;0.1;0.4;1" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <text x={listeners[0].x} y={LY + 26} textAnchor="middle" fill="var(--color-fg)">
          {listeners[0].name}
        </text>
        <text x={listeners[0].x} y={LY + 42} textAnchor="middle">
          {listeners[0].sub}
        </text>
      </g>

      {/* Lessons and the recorder; every take and demo becomes a timeline the player plays back */}
      <g {...k("timeline")}>
        {listeners.slice(1).map((l) => (
          <g key={l.name}>
            <circle cx={l.x} cy={LY} r={11} className="node" />
            <circle cx={l.x} cy={LY} r={3} className="solid" />
            <text x={l.x} y={LY + 26} textAnchor="middle" fill="var(--color-fg)">
              {l.name}
            </text>
            <text x={l.x} y={LY + 42} textAnchor="middle">
              {l.sub}
            </text>
          </g>
        ))}
        <path d={`M${listeners[2].x + 11} ${LY} H${P.x} V${P.y + 11}`} className="edge" strokeDasharray="2 4" />
        <circle cx={P.x} cy={P.y} r={11} className="node" />
        <circle cx={P.x} cy={P.y} r={3} className="solid" />
        <text x={P.x} y={P.y - 26} textAnchor="middle" fill="var(--color-fg)">
          Player
        </text>
        <line x1={P.x - 11} x2={C.x + C.w} y1={P.y} y2={P.y} className="edge" />
        <line x1={P.x - 11} x2={C.x + C.w} y1={P.y} y2={P.y} className="flow" />
        <text x={(P.x + C.x + C.w) / 2} y={P.y + 18} textAnchor="middle">
          Replay · demo
        </text>
        <text x={(P.x + C.x + C.w) / 2} y={P.y + 34} textAnchor="middle">
          120 ms ahead
        </text>
        <circle r={2.5} className="packet hot">
          <animateMotion dur="2.2s" repeatCount="indefinite" path={`M${P.x - 11} ${P.y} H${C.x + C.w}`} />
        </circle>
      </g>
    </Figure>
  );
}
