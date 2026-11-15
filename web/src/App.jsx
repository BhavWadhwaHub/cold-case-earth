import { useCallback, useEffect, useMemo, useState } from "react";
import CaseView, { Stamp } from "./CaseView.jsx";
import Globe from "./Globe.jsx";
import { EXAMPLES, checkClaim } from "./claim.js";

function useRoute() {
  const read = () => decodeURIComponent(window.location.hash.replace(/^#\/?/, ""));
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => { setRoute(read()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}
const go = (path) => { window.location.hash = `/${path}`; };

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="6" fill="#5BB8FF" />
      <ellipse cx="16" cy="16" rx="14" ry="5.5" fill="none" stroke="#F2B544" strokeWidth="1.5" transform="rotate(-24 16 16)" />
      <circle cx="28" cy="10.6" r="2" fill="#F2B544" />
    </svg>
  );
}

function Nav({ route }) {
  const links = [["", "Case files"], ["claim", "Check a claim"], ["records", "All records"], ["about", "How it works"]];
  const active = (p) => (p === "" ? route === "" || route.startsWith("case/") : route.startsWith(p));
  return (
    <header className="nav">
      <a className="brand" href="#/"><Logo /><span>COLD CASE: EARTH</span></a>
      <nav aria-label="Main">
        {links.map(([p, label]) => (
          <a key={p} href={`#/${p}`} className={active(p) ? "active" : ""} aria-current={active(p) ? "page" : undefined}>{label}</a>
        ))}
      </nav>
    </header>
  );
}

function headline(c, data) {
  const r = data.records[c.primary];
  const meta = data.variables[r.var];
  const t = c.twin && data.records[c.twin];
  if (c.id === "air") return ["Opposite", `${r.place} falls, ${t.place} rises`];
  if (c.id === "water") return ["Opposite", `${r.place} wetter, ${t.place} drier`];
  if (c.id === "beijing") return [`Turned in ${r.turn.year}`, `${r.triangle.summary.down} of ${r.triangle.summary.total} windows fall`];
  if (c.id === "seasons") return ["Hidden shift", "months move in opposite directions"];
  if (r.verdict === "CONFIRMED") return [`${r.a.slopeDecade > 0 ? "+" : "−"}${Math.abs(r.a.slopeDecade).toFixed(2)} ${meta.unit}`, "per decade"];
  if (r.yearsNeeded) return [`${r.yearsNeeded} more years`, "of data needed"];
  return ["No trend", "in the yearly figure"];
}

function Home({ data }) {
  const [text, setText] = useState(EXAMPLES[0]);
  const submit = (e) => { e.preventDefault(); go(`claim/${encodeURIComponent(text)}`); };
  const pickPlace = useCallback((key) => {
    const first = Object.keys(data.records).find((k) => k.startsWith(`${key}:`));
    if (first) go(`record/${first}`);
  }, [data]);
  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <div className="eyebrow accent">A fact-checker for climate trends</div>
          <h1>Is it really changing?</h1>
          <p className="lede">Pick a place and a measurement. Get a verdict backed by decades of NASA data: confirmed, suspect, or no case yet.</p>
          <form onSubmit={submit} className="claim-form">
            <label htmlFor="claim" className="eyebrow">Check a claim</label>
            <div className="row">
              <input id="claim" type="text" value={text} onChange={(e) => setText(e.target.value)} />
              <button type="submit" className="button">Check it</button>
            </div>
            <div className="chips">
              {EXAMPLES.slice(1, 4).map((ex) => (
                <button key={ex} type="button" className="chip" onClick={() => go(`claim/${encodeURIComponent(ex)}`)}>{ex}</button>
              ))}
            </div>
          </form>
        </div>
        <Globe places={data.places} onPick={pickPlace} />
      </section>
      <section className="cases">
        <div className="row between">
          <h2>Open case files</h2>
          <span className="mono muted">{data.cases.length} cases, {Object.keys(data.records).length} records, 1981 to 2025</span>
        </div>
        <div className="cards">
          {data.cases.map((c, i) => {
            const r = data.records[c.primary];
            const [big, small] = headline(c, data);
            return (
              <a key={c.id} className="card" href={`#/case/${c.id}`}>
                <div className="row between">
                  <span className="mono muted">CASE {String(i + 1).padStart(2, "0")} / {r.place.toUpperCase()}</span>
                  <Stamp verdict={r.verdict} small />
                </div>
                <div className="card-title">{c.title}</div>
                <div className="card-q">{c.question}</div>
                <div className="card-num">{big} <span>{small}</span></div>
              </a>
            );
          })}
        </div>
      </section>
    </>
  );
}

function CasePage({ data, id }) {
  const c = data.cases.find((x) => x.id === id);
  if (!c) return <Missing />;
  const rec = data.records[c.primary];
  const n = data.cases.indexOf(c) + 1;
  return (
    <>
      <section className="page-head">
        <div className="eyebrow accent">Case {String(n).padStart(2, "0")} / {rec.place} / {rec.where}</div>
        <h1 className="h-case">{c.title}</h1>
        <p className="lede">The question: {c.question}</p>
        <p className="fine">{c.note}</p>
      </section>
      <CaseView rec={rec} data={data} initialTab={c.tab} twinKey={c.twin} />
    </>
  );
}

function RecordPage({ data, recKey }) {
  const rec = data.records[recKey];
  if (!rec) return <Missing />;
  const siblings = Object.values(data.records).filter((r) => r.placeKey === rec.placeKey);
  return (
    <>
      <section className="page-head">
        <div className="eyebrow accent">Record / {rec.where}</div>
        <h1 className="h-case">{rec.place}</h1>
        <div className="chips" role="group" aria-label="Measurement">
          {siblings.map((s) => (
            <a key={s.key} href={`#/record/${s.key}`} className={`chip${s.key === rec.key ? " on" : ""}`} aria-current={s.key === rec.key ? "true" : undefined}>
              {data.variables[s.var].name}
            </a>
          ))}
        </div>
      </section>
      <CaseView rec={rec} data={data} />
    </>
  );
}

function ClaimPage({ data, initial }) {
  const [text, setText] = useState(initial || EXAMPLES[0]);
  const [asked, setAsked] = useState(initial || EXAMPLES[0]);
  useEffect(() => { if (initial) { setText(initial); setAsked(initial); } }, [initial]);
  const result = useMemo(() => checkClaim(asked, data.records), [asked, data]);
  const rec = result.key && data.records[result.key];
  const submit = (e) => { e.preventDefault(); go(`claim/${encodeURIComponent(text)}`); setAsked(text); };
  return (
    <>
      <section className="page-head">
        <div className="eyebrow accent">Check a claim</div>
        <h1 className="h-case">Type a claim. Get a ruling.</h1>
        <p className="lede">The app works out the place, the measurement and the direction, then checks it against NASA data.</p>
        <form onSubmit={submit} className="claim-form wide">
          <label htmlFor="claim2" className="eyebrow">Your claim</label>
          <div className="row">
            <input id="claim2" type="text" value={text} onChange={(e) => setText(e.target.value)} />
            <button type="submit" className="button">Check it</button>
          </div>
          <div className="chips">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" className="chip" onClick={() => go(`claim/${encodeURIComponent(ex)}`)}>{ex}</button>
            ))}
          </div>
        </form>
      </section>
      {result.problem && <div className="panel"><p className="note">{result.problem}</p></div>}
      {rec && (
        <>
          <div className="panel ruling-box">
            <div className={`ruling ${result.ruling.toLowerCase()}`}>{result.ruling}</div>
            <div>
              <p className="sentence">“{asked}”</p>
              <p>Checked against {data.variables[rec.var].name.toLowerCase()} in {rec.place}. {rec.sentence}</p>
              {result.ruling === "UNPROVEN" && rec.seasons.hidden && <p className="note">The yearly figure is flat, but individual months are moving in opposite directions. Open the Hidden Seasons tab.</p>}
              {rec.turn && <p className="note">This record changed direction around {rec.turn.year}. Open the Alibi Check tab.</p>}
            </div>
          </div>
          <CaseView rec={rec} data={data} initialTab={rec.seasons.hidden ? "Hidden Seasons" : rec.turn ? "Alibi Check" : "Evidence Clock"} />
        </>
      )}
    </>
  );
}

function Records({ data }) {
  return (
    <>
      <section className="page-head">
        <div className="eyebrow accent">All records</div>
        <h1 className="h-case">Every record, every verdict</h1>
        <p className="lede">Fifteen records across eight places and six measurements. Open any one to test its verdict.</p>
      </section>
      <div className="panel table-wrap tall">
        <table>
          <thead><tr><th>Place</th><th>Measurement</th><th>Period</th><th>Change per decade</th><th>Verdict</th></tr></thead>
          <tbody>
            {Object.values(data.records).map((r) => {
              const m = data.variables[r.var];
              return (
                <tr key={r.key}>
                  <td><a href={`#/record/${r.key}`}>{r.place}</a></td>
                  <td>{m.name}</td>
                  <td>{r.a.start} to {r.a.end}</td>
                  <td className="mono">{r.a.slopeDecade > 0 ? "+" : "−"}{Math.abs(r.a.slopeDecade).toFixed(m.decimals)} {m.unit}</td>
                  <td><Stamp verdict={r.verdict} small /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function About({ data }) {
  return (
    <section className="prose">
      <div className="eyebrow accent">How it works</div>
      <h1 className="h-case">A fact-checker for climate trends</h1>
      <p className="lede">Pick a place and a measurement. The app tells you whether the change is real, how strong the evidence is, and whether the claim survives scrutiny.</p>
      <h2>The verdict</h2>
      <p>The seasonal cycle is removed, the record is averaged to one value per year, and a straight line is fitted. Two tests then ask whether the slope could be chance: a t-test, and a Mann-Kendall test corrected for year-to-year persistence. <strong>Confirmed</strong> needs both below 5%. <strong>Suspect</strong> means a hint from either. Otherwise there is <strong>no case yet</strong>.</p>
      <h2>Testing the verdict</h2>
      <ul>
        <li><strong>Evidence Clock:</strong> when the trend first became detectable, or how many more years of data it needs.</li>
        <li><strong>Alibi Check:</strong> the trend for every choice of start and end year, to expose cherry-picking and turning points.</li>
        <li><strong>Hidden Seasons:</strong> month-by-month trends, to find opposite seasonal changes that cancel in the yearly average.</li>
        <li><strong>Opposite Twin:</strong> the same measurement in a second place.</li>
      </ul>
      <h2>Limits</h2>
      <ul>
        <li>Temperature, precipitation and soil wetness come from NASA POWER, which serves MERRA-2 model-based estimates for grid cells about 50 km across. These are more reliable for temperature than for precipitation or soil.</li>
        <li>Nitrogen dioxide comes from the OMI satellite instrument and misses cloudy days.</li>
        <li>Only straight-line trends are tested, and a confirmed trend says nothing about its cause.</li>
        <li>"Years needed" and "if this continues" assume today's rate and noise carry on.</li>
      </ul>
      <h2>Prior work</h2>
      <p>Start-and-end-year trend diagrams were introduced by Liebmann and co-authors (2010) and appear in the Moyhu temperature trend viewer. "Time of emergence" is an established research idea. This tool brings those checks together for several NASA variables, in plain language.</p>
      <h2>Data</h2>
      <p>NASA POWER / MERRA-2; NASA Giovanni with OMI OMNO2d v004, GPM IMERG v07 and GLDAS Noah v2.1. Every number on this site was computed by the Python code in the project repository. Results generated {data.generated}.</p>
    </section>
  );
}

const Missing = () => <div className="panel"><p>That page does not exist. <a href="#/">Back to the case files.</a></p></div>;

export default function App() {
  const route = useRoute();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/cases.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  let page = null;
  if (data) {
    if (route === "") page = <Home data={data} />;
    else if (route.startsWith("case/")) page = <CasePage data={data} id={route.slice(5)} />;
    else if (route.startsWith("record/")) page = <RecordPage data={data} recKey={route.slice(7)} />;
    else if (route.startsWith("claim")) page = <ClaimPage data={data} initial={route.slice(6)} />;
    else if (route === "records") page = <Records data={data} />;
    else if (route === "about") page = <About data={data} />;
    else page = <Missing />;
  }
  return (
    <div className="shell">
      <Nav route={route} />
      <main>
        {error && <div className="panel"><p className="note">Could not load the case data ({error}).</p></div>}
        {!data && !error && <p className="muted">Opening the case files…</p>}
        {page}
      </main>
      <footer>
        <span>Data: NASA POWER / MERRA-2, and NASA Giovanni with OMI, GPM IMERG and GLDAS.</span>
        <span>Built for the NASA Space Apps Challenge 2026.</span>
      </footer>
    </div>
  );
}
