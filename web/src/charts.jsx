import { useRef, useState } from "react";

export const BLUE = "#3987e5";
export const ORANGE = "#d95926";
const AMBER = "#F2B544";
const GRID = "#1E2A40";
const AXIS = "#9AA8C0";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ---------------------------------------------------------------- helpers
function niceTicks(lo, hi, count = 4) {
  const span = hi - lo || 1;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count + 1);
  const ticks = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) ticks.push(+v.toFixed(10));
  return ticks;
}

const fmt = (v, d) => v.toFixed(d).replace("-", "−");
// Decimals needed to show a set of evenly spaced ticks without trailing zeros.
function tickDecimals(ticks) {
  if (ticks.length < 2) return 0;
  const step = Math.abs(ticks[1] - ticks[0]);
  for (let d = 0; d < 4; d += 1) if (Math.abs(step * 10 ** d - Math.round(step * 10 ** d)) < 1e-6) return d;
  return 4;
}

// Mouse position inside an SVG that is scaled to its container.
function svgPoint(ev, svg, W, H) {
  const r = svg.getBoundingClientRect();
  return { x: ((ev.clientX - r.left) / r.width) * W, y: ((ev.clientY - r.top) / r.height) * H, px: ev.clientX - r.left, py: ev.clientY - r.top, w: r.width };
}

function Tip({ tip }) {
  if (!tip) return null;
  const flip = tip.px > tip.w * 0.65;
  return (
    <div className="tip" style={{ left: tip.px, top: tip.py, transform: flip ? "translate(-105%, -110%)" : "translate(12px, -110%)" }}>
      {tip.lines.map((l, i) => (i === 0 ? <strong key={i}>{l}</strong> : <span key={i}>{l}</span>))}
    </div>
  );
}

// ------------------------------------------------------------- line chart
export function LineChart({ points, a, unit, decimals, color = BLUE, projection, yRange, label, height = 340 }) {
  const W = 880, H = height, L = 60, R = 18, T = 18, B = 36;
  const svg = useRef(null);
  const [tip, setTip] = useState(null);
  const lastYear = projection ? projection[projection.length - 1][0] : points[points.length - 1][0];
  const x0 = points[0][0];
  const values = points.map((p) => p[1]).concat(projection ? projection.flatMap((p) => [p[2], p[3]]) : []);
  let lo = yRange ? yRange[0] : Math.min(...values);
  let hi = yRange ? yRange[1] : Math.max(...values);
  const pad = (hi - lo) * 0.08 || 1;
  lo -= pad; hi += pad;
  const fx = (yr) => L + ((yr - x0) / (lastYear - x0)) * (W - L - R);
  const fy = (v) => H - B - ((v - lo) / (hi - lo)) * (H - T - B);
  const trend = (yr) => a.intercept + a.slope * yr;
  const xStep = lastYear - x0 > 50 ? 10 : 5;
  const xTicks = [];
  for (let y = Math.ceil(x0 / xStep) * xStep; y <= lastYear; y += xStep) xTicks.push(y);
  const endYear = points[points.length - 1][0];
  const yTicks = niceTicks(lo, hi), yDec = tickDecimals(yTicks);

  const onMove = (ev) => {
    const p = svgPoint(ev, svg.current, W, H);
    const yr = Math.round(x0 + ((p.x - L) / (W - L - R)) * (lastYear - x0));
    const hit = points.find((q) => q[0] === yr);
    const proj = projection && projection.find((q) => q[0] === yr);
    if (hit) setTip({ ...p, year: yr, v: hit[1], lines: [String(yr), `${fmt(hit[1], decimals)} ${unit}`, `Trend line: ${fmt(trend(yr), decimals)}`] });
    else if (proj) setTip({ ...p, year: yr, v: proj[1], lines: [`${yr} (if this continues)`, `${fmt(proj[1], decimals)} ${unit}`, `Range ${fmt(proj[2], decimals)} to ${fmt(proj[3], decimals)}`] });
    else setTip(null);
  };

  return (
    <div className="chart" onMouseLeave={() => setTip(null)}>
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onMouseMove={onMove}>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={fy(t)} y2={fy(t)} stroke={GRID} />
            <text x={L - 10} y={fy(t) + 5} textAnchor="end" className="axis">{fmt(t, yDec)}</text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t} x={fx(t)} y={H - 12} textAnchor="middle" className="axis">{t}</text>
        ))}
        {projection && (
          <>
            <polygon
              points={projection.map((p) => `${fx(p[0])},${fy(p[3])}`).concat(projection.slice().reverse().map((p) => `${fx(p[0])},${fy(p[2])}`)).join(" ")}
              fill="rgba(242,181,68,0.16)"
            />
            <polyline points={projection.map((p) => `${fx(p[0])},${fy(p[1])}`).join(" ")} fill="none" stroke={AMBER} strokeWidth="2" strokeDasharray="2 6" />
          </>
        )}
        <polyline points={points.map((p) => `${fx(p[0])},${fy(p[1])}`).join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        {points.map((p) => (
          <circle key={p[0]} cx={fx(p[0])} cy={fy(p[1])} r="3" fill={color} />
        ))}
        <line x1={fx(x0)} y1={fy(trend(x0))} x2={fx(endYear)} y2={fy(trend(endYear))} stroke={AMBER} strokeWidth="2" strokeDasharray="8 6" />
        {tip && (
          <>
            <line x1={fx(tip.year)} x2={fx(tip.year)} y1={T} y2={H - B} stroke={AXIS} strokeDasharray="3 4" />
            <circle cx={fx(tip.year)} cy={fy(tip.v)} r="6" fill={color} stroke="#070B14" strokeWidth="2" />
          </>
        )}
      </svg>
      <div className="legend">
        <span><i style={{ background: color }} />Yearly value</span>
        <span><i className="dash" />Trend</span>
        {projection && <span><i className="band" />If this continues (95% range)</span>}
      </div>
      <Tip tip={tip} />
    </div>
  );
}

// -------------------------------------------------- evidence path (p-value)
export function EvidenceChart({ evidence, start }) {
  const W = 620, H = 300, L = 64, R = 18, T = 18, B = 44;
  const svg = useRef(null);
  const [tip, setTip] = useState(null);
  const x0 = evidence[0][0], x1 = evidence[evidence.length - 1][0];
  const logs = evidence.map((e) => Math.log10(Math.max(e[1], 1e-12)));
  const lo = Math.min(Math.floor(Math.min(...logs)), -2), hi = 0;
  const fx = (yr) => L + ((yr - x0) / (x1 - x0 || 1)) * (W - L - R);
  const fy = (lg) => T + ((hi - lg) / (hi - lo)) * (H - T - B);
  const yTicks = [];
  for (let k = 0; k >= lo; k -= lo < -6 ? 2 : 1) yTicks.push(k);
  const tickLabel = (k) => (k === 0 ? "1" : k >= -3 ? String(10 ** k) : `10^${k}`);
  const thr = fy(Math.log10(0.05));
  const onMove = (ev) => {
    const p = svgPoint(ev, svg.current, W, H);
    const yr = Math.round(x0 + ((p.x - L) / (W - L - R)) * (x1 - x0));
    const hit = evidence.find((e) => e[0] === yr);
    if (hit) setTip({ ...p, year: yr, lg: Math.log10(Math.max(hit[1], 1e-12)), lines: [`Data up to ${yr}`, `Chance of a fluke: ${hit[1] < 0.0001 ? "under 0.01%" : `${(hit[1] * 100).toFixed(hit[1] < 0.01 ? 2 : 1)}%`}`, hit[1] < 0.05 ? "Passes the test" : "Does not pass yet"] });
    else setTip(null);
  };
  return (
    <div className="chart" onMouseLeave={() => setTip(null)}>
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} role="img" onMouseMove={onMove}
        aria-label={`How the chance of a fluke changed as more years of data were added, starting from ${start}`}>
        {yTicks.map((k) => (
          <g key={k}>
            <line x1={L} x2={W - R} y1={fy(k)} y2={fy(k)} stroke={GRID} />
            <text x={L - 10} y={fy(k) + 4} textAnchor="end" className="axis">{tickLabel(k)}</text>
          </g>
        ))}
        {evidence.filter((e) => e[0] % 5 === 0).map((e) => (
          <text key={e[0]} x={fx(e[0])} y={H - 22} textAnchor="middle" className="axis">{e[0]}</text>
        ))}
        <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" className="axis">Using data from {start} up to this year</text>
        <rect x={L} y={thr} width={W - L - R} height={H - B - thr} fill="rgba(242,181,68,0.08)" />
        <line x1={L} x2={W - R} y1={thr} y2={thr} stroke={AMBER} strokeDasharray="6 5" />
        <text x={L + 8} y={H - B - 8} className="axis">Shaded: unlikely to be chance (under 5%)</text>
        <polyline points={evidence.map((e, i) => `${fx(e[0])},${fy(logs[i])}`).join(" ")} fill="none" stroke={BLUE} strokeWidth="2" />
        {evidence.map((e, i) => (
          <circle key={e[0]} cx={fx(e[0])} cy={fy(logs[i])} r="3" fill={BLUE} />
        ))}
        {tip && <circle cx={fx(tip.year)} cy={fy(tip.lg)} r="6" fill={BLUE} stroke="#070B14" strokeWidth="2" />}
      </svg>
      <Tip tip={tip} />
    </div>
  );
}

// ------------------------------------------------------- trend triangle
function mix(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(",")})`;
}
const NEUTRAL = "#3A3F4B", COOL = "#4F9BF5", WARM = "#F0625F", NOSIG = "#1C2740";

export function Triangle({ cells, unit, decimals }) {
  const svg = useRef(null);
  const [tip, setTip] = useState(null);
  const years = [...new Set(cells.flatMap((c) => [c[0], c[1]]))].sort((p, q) => p - q);
  const n = years.length, L = 56, T = 12, S = 560 / n, W = L + 560 + 12, H = T + 560 + 40;
  const idx = Object.fromEntries(years.map((y, i) => [y, i]));
  const max = Math.max(...cells.map((c) => Math.abs(c[2])));
  const colour = (c) => {
    if (c[3] >= 0.05) return NOSIG;
    const t = 0.3 + 0.7 * (Math.abs(c[2]) / max);
    return mix(NEUTRAL, c[2] > 0 ? WARM : COOL, t);
  };
  const step = n > 30 ? 10 : 5;
  const ticks = years.filter((y) => y % step === 0);
  const onMove = (ev) => {
    const p = svgPoint(ev, svg.current, W, H);
    const ex = years[Math.floor((p.x - L) / S)], st = years[Math.floor((p.y - T) / S)];
    const c = cells.find((q) => q[0] === st && q[1] === ex);
    if (c) setTip({ ...p, c, lines: [`${c[0]} to ${c[1]}`, `${c[2] > 0 ? "+" : "−"}${Math.abs(c[2]).toFixed(decimals)} ${unit} per decade`, c[3] < 0.05 ? "Confirmed for this window" : "Nothing certain in this window"] });
    else setTip(null);
  };
  return (
    <div className="chart triangle" onMouseLeave={() => setTip(null)}>
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} role="img" onMouseMove={onMove}
        aria-label="Grid of trends for every start year and end year. Coloured squares are confirmed trends; dark squares are windows where nothing is certain.">
        {cells.map((c) => (
          <rect key={`${c[0]}-${c[1]}`} x={L + idx[c[1]] * S + 0.5} y={T + idx[c[0]] * S + 0.5} width={Math.max(S - 1, 1)} height={Math.max(S - 1, 1)} fill={colour(c)} />
        ))}
        {tip && <rect x={L + idx[tip.c[1]] * S} y={T + idx[tip.c[0]] * S} width={S} height={S} fill="none" stroke="#FFFFFF" strokeWidth="2" />}
        {ticks.map((y) => (
          <g key={y}>
            <text x={L - 8} y={T + idx[y] * S + S / 2 + 4} textAnchor="end" className="axis">{y}</text>
            <text x={L + idx[y] * S + S / 2} y={T + 560 + 18} textAnchor="middle" className="axis">{y}</text>
          </g>
        ))}
        <text x={L + 280} y={H - 4} textAnchor="middle" className="axis">End year</text>
        <text x={14} y={T + 280} textAnchor="middle" className="axis" transform={`rotate(-90 14 ${T + 280})`}>Start year</text>
      </svg>
      <div className="legend">
        <span><i style={{ background: COOL }} />Confirmed fall</span>
        <span><i style={{ background: WARM }} />Confirmed rise</span>
        <span><i style={{ background: NOSIG, outline: "1px solid #2B3A57" }} />Nothing certain</span>
        <span className="muted">Stronger colour = faster change</span>
      </div>
      <Tip tip={tip} />
    </div>
  );
}

// ---------------------------------------------------------- month bars
export function MonthBars({ months, unit, decimals }) {
  const W = 880, H = 300, L = 60, R = 18, T = 26, B = 36;
  const [tip, setTip] = useState(null);
  const svg = useRef(null);
  const vals = months.map((m) => m[1]);
  let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
  const pad = (hi - lo) * 0.14 || 1;
  lo -= pad; hi += pad;
  const band = (W - L - R) / 12;
  const fy = (v) => H - B - ((v - lo) / (hi - lo)) * (H - T - B);
  const yTicks = niceTicks(lo, hi), yDec = tickDecimals(yTicks);
  return (
    <div className="chart" onMouseLeave={() => setTip(null)}>
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Trend for each calendar month, with confirmed months marked">
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={fy(t)} y2={fy(t)} stroke={GRID} />
            <text x={L - 10} y={fy(t) + 5} textAnchor="end" className="axis">{fmt(t, yDec)}</text>
          </g>
        ))}
        <line x1={L} x2={W - R} y1={fy(0)} y2={fy(0)} stroke={AXIS} />
        {months.map((m) => {
          const x = L + (m[0] - 1) * band + band * 0.2, w = band * 0.6;
          const y = Math.min(fy(m[1]), fy(0)), h = Math.max(Math.abs(fy(m[1]) - fy(0)), 1);
          return (
            <g key={m[0]}
              onMouseMove={(ev) => setTip({ ...svgPoint(ev, svg.current, W, H), lines: [MONTHS[m[0] - 1], `${m[1] > 0 ? "+" : "−"}${Math.abs(m[1]).toFixed(decimals)} ${unit} per decade`, m[3] ? "Confirmed for this month" : "Not confirmed"] })}>
              <rect x={L + (m[0] - 1) * band} y={T} width={band} height={H - T - B} fill="transparent" />
              <rect x={x} y={y} width={w} height={h} rx="3" fill={BLUE} opacity={m[3] ? 1 : 0.35} />
              {m[3] && <text x={x + w / 2} y={m[1] > 0 ? y - 7 : y + h + 15} textAnchor="middle" className="axis" fill="#FFFFFF">confirmed</text>}
              <text x={x + w / 2} y={H - 12} textAnchor="middle" className="axis">{MONTHS[m[0] - 1]}</text>
            </g>
          );
        })}
      </svg>
      <div className="legend">
        <span><i style={{ background: BLUE }} />Confirmed for this month</span>
        <span><i style={{ background: BLUE, opacity: 0.35 }} />Not confirmed</span>
      </div>
      <Tip tip={tip} />
    </div>
  );
}
