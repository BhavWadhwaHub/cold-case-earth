import { useEffect, useState } from "react";
import { BLUE, EvidenceChart, LineChart, MonthBars, ORANGE, Triangle } from "./charts.jsx";

const TABS = ["Evidence Clock", "Alibi Check", "Hidden Seasons", "Opposite Twin", "Data"];
const STAMP = { CONFIRMED: "Confirmed", SUSPECT: "Suspect", "NO CASE YET": "No case yet" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const sign = (v, d) => `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(d)}`;
const num = (v, d) => v.toFixed(d).replace("-", "−");
const pText = (p) => (p < 0.0001 ? "p < 0.0001" : `p = ${p.toFixed(4)}`);
const monthList = (ms) => ms.map((m) => MONTHS[m - 1]).join(", ");

export function Stamp({ verdict, small }) {
  return <span className={`stamp ${verdict.split(" ")[0].toLowerCase()}${small ? " small" : ""}`}>{STAMP[verdict]}</span>;
}

function Evidence({ rec, meta }) {
  const { a } = rec;
  let big, text;
  if (rec.verdict === "CONFIRMED") {
    big = rec.detected ? String(rec.detected) : "Recent";
    text = rec.detected
      ? `Starting from ${a.start}, this trend first passed the test with data up to ${rec.detected} and has passed every year since.`
      : "The trend passes today, but it has only recently settled.";
  } else if (rec.yearsNeeded === null) {
    big = "100+ years";
    text = "At the current rate and year-to-year noise, even another century of data would not settle this. In practice: no detectable trend.";
  } else if (rec.yearsNeeded === 0) {
    big = "Borderline";
    text = "The simpler test already passes, but the stricter one does not. A few more years should decide it.";
  } else {
    big = `${rec.yearsNeeded} years`;
    text = `If the rate and the noise stay as they are, this trend would become detectable around ${a.end + rec.yearsNeeded}.`;
  }
  const last = rec.projection && rec.projection[rec.projection.length - 1];
  return (
    <>
      <div className="split">
        <div className="panel stat">
          <div className="eyebrow">{rec.verdict === "CONFIRMED" ? "Detectable since" : "More data needed"}</div>
          <div className="big">{big}</div>
          <p>{text}</p>
          <p className="fine">Assumes the current rate and year-to-year noise continue.</p>
        </div>
        <div className="panel">
          <h3>How the evidence built up</h3>
          <EvidenceChart evidence={rec.evidence} start={a.start} />
        </div>
      </div>
      <div className="panel">
        <h3>If this continues</h3>
        {rec.verdict !== "CONFIRMED" && <p>Shown only for confirmed trends. Extending a trend that is not established would be guesswork.</p>}
        {rec.verdict === "CONFIRMED" && rec.turn && (
          <p className="note">This record changed direction around {rec.turn.year} (see Alibi Check), so a straight-line extension would mislead. No projection is shown.</p>
        )}
        {last && (
          <>
            <LineChart points={rec.yearly} a={a} unit={meta.unit} decimals={meta.decimals} projection={rec.projection}
              label={`${meta.name} in ${rec.place} with the trend extended to 2050`} />
            <p>
              At today's rate, {meta.name.toLowerCase()} in {rec.place} would reach about{" "}
              <strong>{num(last[1], meta.decimals)} {meta.unit}</strong> by 2050 (likely range {num(last[2], meta.decimals)} to {num(last[3], meta.decimals)}).
            </p>
            <p className="fine">This extends the measured rate. It is not a forecast: it knows nothing about future emissions, policy or physics.</p>
          </>
        )}
      </div>
    </>
  );
}

function Alibi({ rec, meta }) {
  const s = rec.triangle.summary;
  return (
    <div className="split wide-left">
      <div className="panel">
        <Triangle cells={rec.triangle.cells} unit={meta.unit} decimals={meta.decimals} />
      </div>
      <div className="panel stat">
        <div className="eyebrow">Does the verdict depend on the years?</div>
        <p>Each square is one choice of start year and end year. If a claim only holds for a few squares, it was cherry-picked.</p>
        <dl className="facts">
          <dt>Windows tested (8+ years)</dt><dd>{s.total}</dd>
          <dt>Confirmed rise</dt><dd>{s.up}</dd>
          <dt>Confirmed fall</dt><dd>{s.down}</dd>
          <dt>Nothing certain</dt><dd>{s.none}</dd>
        </dl>
        {s.up > 0 && s.down > 0 && <p className="note">Both rising and falling windows exist. Anyone can find years to support either story, so ask which years a claim uses.</p>}
        {rec.turn && (
          <p className="note">
            Turning point around <strong>{rec.turn.year}</strong>: {sign(rec.turn.before, 2)} per decade before ({rec.turn.beforeSig ? "confirmed" : "not confirmed"}), {sign(rec.turn.after, 2)} after ({rec.turn.afterSig ? "confirmed" : "not confirmed"}).
          </p>
        )}
        <p className="fine">Short windows are rarely significant. That is expected, and it is why a few years of data cannot settle a trend.</p>
      </div>
    </div>
  );
}

function Seasons({ rec, meta }) {
  const s = rec.seasons;
  return (
    <div className="panel">
      <p>A yearly average can hide opposite changes in different seasons. Each bar is the trend for one calendar month on its own.</p>
      <MonthBars months={s.months} unit={meta.unit} decimals={meta.decimals} />
      {s.hidden && <p className="note"><strong>Hidden shift found.</strong> Rising in {monthList(s.up)}; falling in {monthList(s.down)}. The yearly figure blends these together.</p>}
      {!s.hidden && s.up.length + s.down.length > 0 && <p>The change is concentrated in: <strong>{monthList([...s.up, ...s.down].sort((p, q) => p - q))}</strong>.</p>}
      {!s.hidden && s.up.length + s.down.length === 0 && <p>No single month shows a confirmed trend.</p>}
      <p className="fine">Twelve months means twelve tests, so one confirmed month can be luck. A hidden shift is flagged only when at least two confirmed months point in opposite directions.</p>
    </div>
  );
}

function Twin({ rec, meta, data, twinKey }) {
  const options = Object.values(data.records).filter((r) => r.var === rec.var && r.place !== rec.place);
  const [pick, setPick] = useState(twinKey && options.some((o) => o.key === twinKey) ? twinKey : options[0]?.key);
  useEffect(() => {
    setPick(twinKey && options.some((o) => o.key === twinKey) ? twinKey : options[0]?.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.key, twinKey]);
  if (!options.length) return <div className="panel"><p>No second stored record for this measurement.</p></div>;
  const twin = data.records[pick] || options[0];
  const all = [...rec.yearly, ...twin.yearly].map((p) => p[1]);
  const range = [Math.min(...all), Math.max(...all)];
  const opposite = rec.a.slope * twin.a.slope < 0;
  const both = rec.verdict === "CONFIRMED" && twin.verdict === "CONFIRMED";
  return (
    <>
      <div className="panel row">
        <label htmlFor="twin">Compare with</label>
        <select id="twin" value={twin.key} onChange={(e) => setPick(e.target.value)}>
          {options.map((o) => <option key={o.key} value={o.key}>{o.place}</option>)}
        </select>
        <span className={opposite && both ? "note inline" : "fine"}>
          {opposite && both && <><strong>Opposite twins.</strong> Same measurement, same method, confirmed trends in opposite directions.</>}
          {opposite && !both && "Opposite directions, but at least one of the trends is not confirmed."}
          {!opposite && "Both places are moving the same way."}
        </span>
      </div>
      <div className="split">
        {[[rec, BLUE], [twin, ORANGE]].map(([r, colour]) => (
          <div className="panel" key={r.key}>
            <div className="row between"><h3>{r.place}</h3><Stamp verdict={r.verdict} small /></div>
            <LineChart points={r.yearly} a={r.a} unit={meta.unit} decimals={meta.decimals} color={colour} yRange={range} height={300}
              label={`${meta.name} in ${r.place}, ${r.a.start} to ${r.a.end}`} />
            <p>{r.sentence}</p>
          </div>
        ))}
      </div>
      <p className="fine">Both charts share one vertical scale so the levels can be compared.</p>
    </>
  );
}

function DataTab({ rec, meta }) {
  const csv = `year,value\n${rec.yearly.map((p) => p.join(",")).join("\n")}\n`;
  const href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  return (
    <div className="split">
      <div className="panel">
        <dl className="facts wide">
          <dt>What it is</dt><dd>{meta.definition}</dd>
          <dt>Source</dt><dd>{rec.source}</dd>
          <dt>Where</dt><dd>{rec.where}</dd>
          <dt>Caution</dt><dd>{meta.caution}</dd>
          <dt>Change per decade</dt><dd>{sign(rec.a.slopeDecade, meta.decimals)} {meta.unit} (95% range {sign(rec.a.ci[0], meta.decimals)} to {sign(rec.a.ci[1], meta.decimals)})</dd>
          <dt>Robust estimate</dt><dd>{sign(rec.a.senDecade, meta.decimals)} {meta.unit} per decade</dd>
          <dt>t-test</dt><dd>{pText(rec.a.pT)}</dd>
          <dt>Mann-Kendall test</dt><dd>{pText(rec.a.pMk)}</dd>
        </dl>
        <a className="button ghost" href={href} download={`${rec.place}_${rec.var}.csv`.replace(/ /g, "_")}>Download yearly values (CSV)</a>
      </div>
      <div className="panel table-wrap">
        <table>
          <thead><tr><th>Year</th><th>{meta.name} ({meta.unit})</th></tr></thead>
          <tbody>{rec.yearly.map((p) => <tr key={p[0]}><td>{p[0]}</td><td>{num(p[1], meta.decimals)}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

export default function CaseView({ rec, data, initialTab = "Evidence Clock", twinKey }) {
  const meta = data.variables[rec.var];
  const [tab, setTab] = useState(initialTab);
  useEffect(() => setTab(initialTab), [rec.key, initialTab]);
  return (
    <>
      <section className="split wide-left">
        <div className="panel">
          <h3>{meta.name}, yearly average ({meta.unit})</h3>
          <LineChart points={rec.yearly} a={rec.a} unit={meta.unit} decimals={meta.decimals}
            label={`${meta.name} in ${rec.place}, ${rec.a.start} to ${rec.a.end}, with trend line`} />
          <p className="fine">Seasonal cycle removed. Source: {rec.source}, {rec.where}.</p>
        </div>
        <div className="panel verdict">
          <Stamp verdict={rec.verdict} />
          <p className="sentence">{rec.sentence}</p>
          <dl className="facts">
            <dt>Period</dt><dd>{rec.a.start} to {rec.a.end}</dd>
            <dt>Change per decade</dt><dd>{sign(rec.a.slopeDecade, meta.decimals)}</dd>
            <dt>Likely range</dt><dd>{sign(rec.a.ci[0], meta.decimals)} to {sign(rec.a.ci[1], meta.decimals)}</dd>
            <dt>t-test</dt><dd>{pText(rec.a.pT)}</dd>
            <dt>Mann-Kendall test</dt><dd>{pText(rec.a.pMk)}</dd>
          </dl>
          <p className="fine">{meta.definition} A confirmed trend says the change is real. It does not say what caused it.</p>
        </div>
      </section>
      <div className="tabs" role="tablist" aria-label="Ways to test the verdict">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      <section className="tab-body">
        {tab === "Evidence Clock" && <Evidence rec={rec} meta={meta} />}
        {tab === "Alibi Check" && <Alibi rec={rec} meta={meta} />}
        {tab === "Hidden Seasons" && <Seasons rec={rec} meta={meta} />}
        {tab === "Opposite Twin" && <Twin rec={rec} meta={meta} data={data} twinKey={twinKey} />}
        {tab === "Data" && <DataTab rec={rec} meta={meta} />}
      </section>
    </>
  );
}
