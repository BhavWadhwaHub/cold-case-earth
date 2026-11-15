"""Run the statistics on every stored record and write web/public/data/cases.json.

The web app only displays these results; all the maths happens here, in the
same Python functions the Streamlit app uses.

Run from the repository root:  python scripts/build_data.py
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import cases  # noqa: E402
import detective as d  # noqa: E402
from wording import sentence  # noqa: E402

PLACES = {  # key -> (display name, latitude, longitude) for the globe
    "vancouver": ("Vancouver", 49.28, -123.12),
    "inuvik": ("Inuvik", 68.36, -133.72),
    "phoenix": ("Phoenix", 33.45, -112.07),
    "la": ("Los Angeles", 34.05, -118.24),
    "delhi": ("Delhi", 28.61, 77.21),
    "beijing": ("Beijing", 39.90, 116.40),
    "dhaka": ("Dhaka", 23.81, 90.41),
    "bc": ("Southwest British Columbia", 49.9, -122.9),
}


def r(x, n=5):
    return None if x is None else round(float(x), n)


def build_record(key):
    monthly, rec = cases.load_record(key)
    s = d.yearly(monthly, rec["min_months"])
    a = d.analyse(s)
    case = dict(place=rec["place"], var=rec["var"], meta=cases.VARIABLES[rec["var"]],
                a=a, verdict=d.verdict(a))
    tri = d.trend_triangle(s)
    seasons, flag = d.hidden_seasons(monthly)
    turn = d.turning_point(s)
    confirmed = case["verdict"] == "CONFIRMED"
    proj = d.projection(s, a) if confirmed and not turn else None
    return dict(
        key=key, placeKey=key.split(":")[0], place=rec["place"], var=rec["var"],
        source=rec["source"], where=rec["where"],
        yearly=[[int(y), r(v)] for y, v in s.items()],
        a=dict(n=a["n"], start=a["start"], end=a["end"], slope=r(a["slope"], 7),
               intercept=r(a["intercept"], 4), slopeDecade=r(a["slope_decade"]),
               ci=[r(a["ci_decade"][0]), r(a["ci_decade"][1])],
               senDecade=r(a["sen_decade"]), pT=r(a["p_t"], 6), pMk=r(a["p_mk"], 6)),
        verdict=case["verdict"], sentence=sentence(case),
        detected=d.first_detected(s) if confirmed else None,
        yearsNeeded=None if confirmed else d.years_needed(a),
        evidence=[[int(e), r(p, 6)] for e, p in d.evidence_path(s).itertuples(index=False)],
        triangle=dict(
            cells=[[int(t.start), int(t.end), r(t.slope_decade), r(t.p, 5)]
                   for t in tri.itertuples()],
            summary=d.triangle_summary(tri)),
        seasons=dict(
            months=[[int(m.month), r(m.slope_decade), r(m.p, 5), bool(m.significant)]
                    for m in seasons.itertuples()],
            hidden=bool(flag["hidden"]), up=flag["up"], down=flag["down"]),
        turn=None if not turn else dict(
            year=turn["year"], before=r(turn["before_decade"]), beforeSig=turn["before_sig"],
            after=r(turn["after_decade"]), afterSig=turn["after_sig"]),
        projection=None if proj is None else [
            [int(p.year), r(p.mid), r(p.low), r(p.high)] for p in proj.itertuples()],
    )


def main():
    out = dict(
        generated=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        variables=cases.VARIABLES,
        places={k: dict(name=n, lat=lat, lon=lon) for k, (n, lat, lon) in PLACES.items()},
        records={k: build_record(k) for k in cases.RECORDS},
        cases=cases.CASES,
    )
    path = ROOT / "web" / "public" / "data" / "cases.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print(f"wrote {path} ({path.stat().st_size / 1024:.0f} KB, {len(out['records'])} records)")


if __name__ == "__main__":
    main()
