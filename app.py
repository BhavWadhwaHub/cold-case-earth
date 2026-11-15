"""Cold Case: Earth — a fact-checker for climate trends.

Run with:  streamlit run app.py
"""
import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

import cases
import detective as d
import loaders
from wording import num, sentence

st.set_page_config(page_title="Cold Case: Earth", layout="wide")

# Colours: one blue for the record, orange for a second record, a blue-to-red
# scale with a grey middle for "falling / no change / rising".
BLUE, BLUE_SOFT, ORANGE, INK_SOFT = "#2a78d6", "#9ec5f4", "#eb6834", "#8a8984"
DIVERGING = [[0.0, "#184f95"], [0.25, "#6da7ec"], [0.5, "#f0efec"],
             [0.75, "#e98b8a"], [1.0, "#b02a2a"]]
MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
STAMP = {"CONFIRMED": ("#184f95", "Confirmed"),
         "SUSPECT": ("#a86400", "Suspect"),
         "NO CASE YET": ("#52514e", "No case yet")}
TABS = ["Evidence Clock", "Alibi Check", "Hidden Seasons", "Opposite Twin", "Data"]


# ------------------------------------------------------------------ building
@st.cache_data(show_spinner=False)
def stored(key):
    monthly, rec = cases.load_record(key)
    return monthly, rec


@st.cache_data(show_spinner="Asking NASA POWER for this location...", ttl=86400)
def live(lat, lon):
    return loaders.fetch_power_live(round(lat, 2), round(lon, 2))


def make_case(monthly, place, var, source, where, min_months=12):
    """Bundle a record with everything computed from it."""
    s = d.yearly(monthly, min_months)
    a = d.analyse(s)
    return dict(place=place, var=var, meta=cases.VARIABLES[var], source=source,
                where=where, monthly=monthly, s=s, a=a, verdict=d.verdict(a),
                turn=d.turning_point(s))


def stored_case(key):
    monthly, rec = stored(key)
    return make_case(monthly, rec["place"], rec["var"], rec["source"],
                     rec["where"], rec["min_months"])


def stamp(c):
    colour, label = STAMP[c["verdict"]]
    st.markdown(
        f"<div style='border:3px solid {colour};border-radius:6px;padding:10px 14px;"
        f"display:inline-block;transform:rotate(-2deg);margin:6px 0 12px 0'>"
        f"<span style='color:{colour};font-weight:800;letter-spacing:2px;"
        f"font-size:1.25rem;text-transform:uppercase'>{label}</span></div>",
        unsafe_allow_html=True)


# -------------------------------------------------------------------- charts
def base_layout(fig, ytitle, height=380):
    fig.update_layout(height=height, margin=dict(l=10, r=10, t=30, b=10),
                      hovermode="x unified", yaxis_title=ytitle,
                      legend=dict(orientation="h", y=1.12, x=0))
    return fig


def record_chart(c, colour=BLUE, project=False, yrange=None, height=380):
    s, a = c["s"], c["a"]
    x = s.index.values
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=x, y=s.values, mode="lines+markers", name="Yearly value",
                             line=dict(color=colour, width=2), marker=dict(size=7)))
    fig.add_trace(go.Scatter(x=x, y=a["intercept"] + a["slope"] * x, mode="lines",
                             name="Trend", line=dict(color=INK_SOFT, width=2, dash="dash")))
    if project:
        p = d.projection(s, a)
        fig.add_trace(go.Scatter(x=p["year"], y=p["high"], mode="lines", showlegend=False,
                                 line=dict(width=0), hoverinfo="skip"))
        fig.add_trace(go.Scatter(x=p["year"], y=p["low"], mode="lines", fill="tonexty",
                                 name="If this continues (95% range)",
                                 line=dict(width=0), fillcolor="rgba(138,137,132,0.25)"))
        fig.add_trace(go.Scatter(x=p["year"], y=p["mid"], mode="lines", showlegend=False,
                                 line=dict(color=INK_SOFT, width=2, dash="dot"),
                                 name="Extended trend"))
    if yrange:
        fig.update_yaxes(range=yrange)
    return base_layout(fig, f"{c['meta']['name']} ({c['meta']['unit']})", height)


# ---------------------------------------------------------------------- tabs
def tab_evidence(c, key):
    a, s = c["a"], c["s"]
    left, right = st.columns([1, 2])
    with left:
        if c["verdict"] == "CONFIRMED":
            det = d.first_detected(s)
            if det:
                st.metric("Detectable since", str(det))
                st.write(f"Starting from {a['start']}, this trend first passed the "
                         f"test with data up to **{det}** and has passed every year since.")
            else:
                st.write("The trend passes today, but it has only recently settled.")
        else:
            need = d.years_needed(a)
            if need is None:
                st.metric("More data needed", "100+ years")
                st.write("At the current rate and year-to-year noise, even another "
                         "century of data would not settle this. In practice: "
                         "**no detectable trend**.")
            elif need == 0:
                st.metric("More data needed", "Borderline")
                st.write("The simpler test already passes, but the stricter one does "
                         "not. A few more years should decide it.")
            else:
                st.metric("More data needed", f"about {need} years")
                st.write(f"If the rate and the noise stay as they are, this trend "
                         f"would become detectable around **{a['end'] + need}**.")
        st.caption("Assumes the current rate and year-to-year noise continue.")
    with right:
        path = d.evidence_path(s)
        fig = go.Figure()
        fig.add_trace(go.Scatter(x=path["end"], y=path["p"], mode="lines+markers",
                                 name="Chance this is a fluke",
                                 line=dict(color=BLUE, width=2), marker=dict(size=7)))
        fig.add_hline(y=d.ALPHA, line=dict(color=INK_SOFT, dash="dash"))
        fig.add_annotation(x=0, xref="paper", xanchor="left", y=np.log10(d.ALPHA),
                           yref="y", yshift=10, showarrow=False,
                           text="Below this line: unlikely to be chance (5%)")
        fig.update_yaxes(type="log", dtick=1)
        fig.update_xaxes(title=f"Using data from {a['start']} up to this year")
        st.plotly_chart(base_layout(fig, "p-value (log scale)", 330), key=f"{key}_ev")

    st.divider()
    st.subheader("If this continues")
    if c["verdict"] != "CONFIRMED":
        st.write("Shown only for confirmed trends. Extending a trend that is not "
                 "established would be guesswork.")
    elif c["turn"]:
        st.warning(f"This record changed direction around {c['turn']['year']} "
                   "(see Alibi Check), so a straight-line extension would mislead. "
                   "No projection is shown.")
    else:
        p = d.projection(s, a).iloc[-1]
        st.plotly_chart(record_chart(c, project=True), key=f"{key}_proj")
        st.write(f"At today's rate, {c['meta']['name'].lower()} in {c['place']} would "
                 f"reach about **{num(p['mid'], c)} {c['meta']['unit']}** by 2050 "
                 f"(likely range {num(p['low'], c)} to {num(p['high'], c)}).")
        st.caption("This extends the measured rate. It is not a forecast: it knows "
                   "nothing about future emissions, policy or physics.")


def tab_alibi(c, key):
    tri = d.trend_triangle(c["s"])
    summ = d.triangle_summary(tri)
    st.write("Each square is one choice of start year and end year. Colour shows "
             "the trend for that window; grey squares are windows where no trend "
             "can be confirmed. If a claim only holds for a few squares, it was "
             "cherry-picked.")
    years = sorted(set(tri["start"]) | set(tri["end"]))
    grid = pd.DataFrame(np.nan, index=years, columns=years)
    grey = pd.DataFrame(np.nan, index=years, columns=years)
    text = pd.DataFrame("", index=years, columns=years)
    for r in tri.itertuples():
        if r.p < d.ALPHA:
            grid.loc[r.start, r.end] = r.slope_decade
        else:
            grey.loc[r.start, r.end] = 0
        text.loc[r.start, r.end] = (
            f"{r.start} to {r.end}<br>{r.slope_decade:+.3g} {c['meta']['unit']} per decade"
            f"<br>{'significant' if r.p < d.ALPHA else 'not significant'} (p={r.p:.3f})")
    lim = float(np.nanmax(np.abs(tri["slope_decade"])))
    fig = go.Figure()
    fig.add_trace(go.Heatmap(z=grey.values, x=years, y=years, text=text.values,
                             hoverinfo="text", showscale=False, xgap=1, ygap=1,
                             colorscale=[[0, "#d6d5d0"], [1, "#d6d5d0"]]))
    fig.add_trace(go.Heatmap(z=grid.values, x=years, y=years, text=text.values,
                             hoverinfo="text", colorscale=DIVERGING, zmid=0,
                             zmin=-lim, zmax=lim, xgap=1, ygap=1,
                             colorbar=dict(title=f"{c['meta']['unit']}<br>per decade")))
    fig.update_layout(height=460, margin=dict(l=10, r=10, t=10, b=10),
                      xaxis_title="End year", yaxis_title="Start year",
                      yaxis_autorange="reversed")
    st.plotly_chart(fig, key=f"{key}_tri")
    st.write(f"Of **{summ['total']}** windows of 8 years or more: "
             f"**{summ['up']}** show a confirmed rise, **{summ['down']}** a confirmed "
             f"fall, and **{summ['none']}** show nothing certain.")
    if summ["up"] and summ["down"]:
        st.warning("Both rising and falling windows exist. Anyone can find years "
                   "to support either story, so ask which years a claim uses.")
    st.caption("Short windows are rarely significant; that is expected, and it is "
               "why a few years of data cannot settle a trend.")
    if c["turn"]:
        t = c["turn"]
        st.info(f"Turning point detected around **{t['year']}**: "
                f"{t['before_decade']:+.2f} per decade before "
                f"({'confirmed' if t['before_sig'] else 'not confirmed'}), "
                f"{t['after_decade']:+.2f} per decade after "
                f"({'confirmed' if t['after_sig'] else 'not confirmed'}).")


def tab_seasons(c, key):
    table, flag = d.hidden_seasons(c["monthly"])
    st.write("A yearly average can hide opposite changes in different seasons. "
             "Each bar is the trend for one calendar month on its own.")
    if table.empty:
        st.write("Not enough years of data for a month-by-month test.")
        return
    labels = [MONTH_NAMES[m - 1] for m in table["month"]]
    fig = go.Figure()
    for sig, colour, name in [(True, BLUE, "Confirmed for this month"),
                              (False, BLUE_SOFT, "Not confirmed")]:
        part = table[table["significant"] == sig]
        fig.add_trace(go.Bar(
            x=[MONTH_NAMES[m - 1] for m in part["month"]], y=part["slope_decade"],
            name=name, marker_color=colour,
            text=["confirmed" if sig else "" for _ in part["month"]],
            textposition="outside"))
    fig.update_xaxes(categoryorder="array", categoryarray=labels)
    fig.add_hline(y=0, line=dict(color=INK_SOFT, width=1))
    st.plotly_chart(base_layout(fig, f"Change per decade ({c['meta']['unit']})", 360),
                    key=f"{key}_hs")
    names = lambda ms: ", ".join(MONTH_NAMES[m - 1] for m in ms)
    if flag["hidden"]:
        st.success(f"**Hidden shift found.** Rising in {names(flag['up'])}; falling in "
                   f"{names(flag['down'])}. The yearly figure blends these together.")
    elif flag["up"] or flag["down"]:
        st.write(f"The change is concentrated in: **{names(flag['up'] + flag['down'])}**.")
    else:
        st.write("No single month shows a confirmed trend.")
    st.caption("Twelve months means twelve tests, so one confirmed month can be luck. "
               "A hidden shift is flagged only when at least two confirmed months "
               "point in opposite directions.")


def tab_twin(c, key, default_twin=None):
    same = {k: r for k, r in cases.RECORDS.items()
            if r["var"] == c["var"] and r["place"] != c["place"]}
    if not same:
        st.write("No second stored record for this variable. Stored comparisons "
                 "exist for temperature, precipitation, soil wetness and nitrogen dioxide.")
        return
    keys = list(same)
    idx = keys.index(default_twin) if default_twin in keys else 0
    pick = st.selectbox("Compare with", keys, index=idx, key=f"{key}_twin",
                        format_func=lambda k: same[k]["place"])
    t = stored_case(pick)
    lo = min(c["s"].min(), t["s"].min())
    hi = max(c["s"].max(), t["s"].max())
    pad = (hi - lo) * 0.08
    cols = st.columns(2)
    for col, case, colour, tag in [(cols[0], c, BLUE, "a"), (cols[1], t, ORANGE, "b")]:
        with col:
            st.markdown(f"**{case['place']}**")
            stamp(case)
            st.plotly_chart(record_chart(case, colour, yrange=[lo - pad, hi + pad],
                                         height=320), key=f"{key}_tw{tag}")
            st.write(sentence(case))
    opposite = c["a"]["slope"] * t["a"]["slope"] < 0
    both = c["verdict"] == t["verdict"] == "CONFIRMED"
    if opposite and both:
        st.success("**Opposite twins.** Same variable, same method, confirmed trends "
                   "in opposite directions.")
    elif opposite:
        st.info("The two places point in opposite directions, but at least one of "
                "the trends is not confirmed.")
    else:
        st.write("Both places are moving the same way.")
    st.caption("Both charts share one vertical scale so the levels can be compared.")


def tab_data(c, key):
    m = c["meta"]
    st.markdown(f"**What it is:** {m['definition']}  \n**Source:** {c['source']}  \n"
                f"**Where:** {c['where']}  \n**Caution:** {m['caution']}")
    a = c["a"]
    st.markdown(
        f"**Numbers behind the verdict:** change per decade {num(a['slope_decade'], c, True)} "
        f"{m['unit']} (95% range {num(a['ci_decade'][0], c, True)} to "
        f"{num(a['ci_decade'][1], c, True)}); robust estimate "
        f"{num(a['sen_decade'], c, True)}; t-test p = {a['p_t']:.4f}; "
        f"Mann-Kendall p = {a['p_mk']:.4f}; {a['n']} years.")
    out = c["s"].rename("value").reset_index()
    st.dataframe(out, hide_index=True, height=240)
    st.download_button("Download yearly values (CSV)", out.to_csv(index=False),
                       file_name=f"{c['place']}_{c['var']}.csv".replace(" ", "_"),
                       mime="text/csv", key=f"{key}_dl")


def show_case(c, key, open_tab="Evidence Clock", twin=None):
    left, right = st.columns([2, 1])
    with left:
        st.plotly_chart(record_chart(c), key=f"{key}_main")
    with right:
        stamp(c)
        st.markdown(f"#### {sentence(c)}")
        st.caption(f"{c['meta']['definition']} Source: {c['source']}.")
    tabs = st.tabs(TABS, default=open_tab, key=f"{key}_tabs")
    with tabs[0]:
        tab_evidence(c, key)
    with tabs[1]:
        tab_alibi(c, key)
    with tabs[2]:
        tab_seasons(c, key)
    with tabs[3]:
        tab_twin(c, key, twin)
    with tabs[4]:
        tab_data(c, key)


# --------------------------------------------------------------------- pages
def page_demo():
    titles = [c["title"] for c in cases.CASES]
    pick = st.sidebar.radio("Case files", titles)
    case = cases.CASES[titles.index(pick)]
    st.header(case["title"])
    st.markdown(f"**The question:** {case['question']}")
    st.caption(case["note"])
    show_case(stored_case(case["primary"]), f"demo_{case['id']}",
              open_tab=case["tab"], twin=case["twin"])


def claim_ruling(c, direction):
    up = c["a"]["slope"] > 0
    if c["verdict"] == "CONFIRMED":
        return ("TRUE", "#184f95") if up == (direction > 0) else ("FALSE", "#b02a2a")
    return ("UNPROVEN", "#52514e")


def page_claim():
    st.header("Check a claim")
    st.write("Type a claim about how a place is changing. The app works out the "
             "place, the measurement and the direction, then checks it against NASA data.")
    examples = ["Phoenix is getting drier", "Beijing is more polluted",
                "Vancouver is getting wetter", "Dhaka's air is getting worse",
                "Toronto is getting hotter"]
    if "claim" not in st.session_state:
        st.session_state["claim"] = examples[0]
    cols = st.columns(len(examples))
    for col, ex in zip(cols, examples):
        if col.button(ex, key=f"ex_{ex}"):
            st.session_state["claim"] = ex
    text = st.text_input("Your claim", key="claim")
    if not text.strip():
        return
    got = cases.parse_claim(text)
    if got["family"] is None:
        st.warning("I could not find a direction in that. Try words like warmer, "
                   "cooler, wetter, drier, cleaner or more polluted.")
        return
    if got["place"] is None and got["live_city"] is None:
        st.warning("I do not recognise that place. Stored places: Vancouver, Inuvik, "
                   "Phoenix, Los Angeles, Delhi, Beijing, Dhaka. Live lookups: "
                   + ", ".join(sorted(n.title() for n in cases.LIVE_CITIES)) + ".")
        return
    c = None
    if got["place"]:
        rec_key = cases.record_for(got["place"], got["family"])
        if rec_key is None:
            st.warning("There is no stored record of that kind for that place. Air "
                       "pollution is stored for Los Angeles, Delhi, Beijing and Dhaka; "
                       "temperature, precipitation and soil for Vancouver, Inuvik and Phoenix.")
            return
        c = stored_case(rec_key)
    else:
        if got["family"] == "air":
            st.warning("Air pollution is only available for the four stored cities.")
            return
        var = {"temp": "T2M", "rain": "PRECTOTCORR", "soil": "GWETROOT"}[got["family"]]
        lat, lon = cases.LIVE_CITIES[got["live_city"]]
        try:
            c = make_case(live(lat, lon)[var], got["live_city"].title(), var,
                          "NASA POWER (MERRA-2), live request", f"{lat}, {lon}")
        except Exception as err:  # network trouble should not crash the page
            st.error(f"Could not reach NASA POWER just now ({type(err).__name__}). "
                     "Try a stored place or try again shortly.")
            return
    ruling, colour = claim_ruling(c, got["direction"])
    st.markdown(f"<div style='font-size:2rem;font-weight:800;color:{colour};"
                f"letter-spacing:3px'>{ruling}</div>", unsafe_allow_html=True)
    st.markdown(f"**Checked against:** {c['meta']['name'].lower()} in {c['place']}. "
                f"{sentence(c)}")
    _, flag = d.hidden_seasons(c["monthly"])
    if ruling == "UNPROVEN" and flag["hidden"]:
        st.info("The yearly figure is flat, but individual months are moving in "
                "opposite directions. Open the Hidden Seasons tab.")
    if c["turn"]:
        st.info(f"This record changed direction around {c['turn']['year']}. "
                "Open the Alibi Check tab.")
    st.divider()
    show_case(c, "claim", open_tab="Hidden Seasons" if flag["hidden"] else "Evidence Clock")


def page_own():
    st.header("Open your own case")
    mode = st.radio("Where?", ["A stored record", "Any location (live from NASA POWER)"],
                    horizontal=True)
    if mode == "A stored record":
        key = st.selectbox(
            "Record", list(cases.RECORDS),
            format_func=lambda k: f"{cases.RECORDS[k]['place']} — "
                                  f"{cases.VARIABLES[cases.RECORDS[k]['var']]['name']}")
        show_case(stored_case(key), f"own_{key}")
        return
    c1, c2, c3 = st.columns(3)
    lat = c1.number_input("Latitude", -90.0, 90.0, 43.65, step=0.5)
    lon = c2.number_input("Longitude", -180.0, 180.0, -79.38, step=0.5)
    var = c3.selectbox("Measurement", ["T2M", "PRECTOTCORR", "GWETROOT"],
                       format_func=lambda v: cases.VARIABLES[v]["name"])
    st.caption(cases.VARIABLES[var]["definition"])
    if st.button("Open the case", type="primary"):
        st.session_state["live_open"] = (lat, lon, var)
    if "live_open" not in st.session_state:
        return
    lat, lon, var = st.session_state["live_open"]
    try:
        data = live(lat, lon)
    except Exception as err:
        st.error(f"Could not reach NASA POWER just now ({type(err).__name__}). "
                 "Try a stored record or try again shortly.")
        return
    c = make_case(data[var], f"{lat:.2f}, {lon:.2f}", var,
                  "NASA POWER (MERRA-2), live request", f"{lat:.2f}, {lon:.2f}")
    show_case(c, "live")


def page_about():
    st.header("How it works")
    st.markdown("""
**Cold Case: Earth is a fact-checker for climate trends.** Pick a place and a
measurement; it tells you whether the change is real, how strong the evidence
is, and whether the claim survives scrutiny.

**The verdict.** The seasonal cycle is removed, the record is averaged to one
value per year, and a straight line is fitted. Two tests then ask whether the
slope could be chance: a t-test and a Mann-Kendall test corrected for
year-to-year persistence. *Confirmed* needs both below 5%. *Suspect* means a
hint from either. Otherwise there is *no case yet*.

**Evidence Clock.** When the trend first became detectable, or how many more
years of data it needs.

**Alibi Check.** The trend for every choice of start and end year, to expose
cherry-picking and turning points.

**Hidden Seasons.** Month-by-month trends, to find opposite seasonal changes
that cancel in the yearly average.

**Opposite Twin.** The same measurement in a second place.

**Limits.** Temperature, precipitation and soil wetness come from NASA POWER,
which serves MERRA-2 model-based estimates for grid cells about 50 km across;
these are more reliable for temperature than for precipitation or soil.
Nitrogen dioxide comes from the OMI satellite instrument and misses cloudy
days. Only straight-line trends are tested. A confirmed trend says nothing
about its cause. "Years needed" and "if this continues" assume today's rate
and noise carry on.

**Prior work.** Start-and-end-year trend diagrams were introduced by Liebmann
and co-authors (2010) and appear in the Moyhu temperature trend viewer;
"time of emergence" is an established research idea. This tool brings those
checks together for any place and several NASA variables, in plain language.

**Data.** NASA POWER / MERRA-2; NASA Giovanni with OMI OMNO2d v004, GPM IMERG
v07 and GLDAS Noah v2.1.
""")


st.sidebar.title("Cold Case: Earth")
st.sidebar.caption("A fact-checker for climate trends")
PAGES = {"Case files": page_demo, "Check a claim": page_claim,
         "Open your own case": page_own, "How it works": page_about}
choice = st.sidebar.radio("Go to", list(PAGES), label_visibility="collapsed")
st.sidebar.divider()
PAGES[choice]()
