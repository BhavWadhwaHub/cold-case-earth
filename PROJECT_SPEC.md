# Cold Case: Earth — Project Spec v2

NASA Space Apps 2026, challenge **Be An Earth System Trend Detective!**
Solo build. Updated after the data was collected and tested.

**Status:** nine datasets downloaded and checked, statistics code run on all of them, repository created. The app itself is not built yet.

---

## 1. The idea

Cold Case: Earth is a web app where anyone opens a "case" on a place and an Earth variable and gets a verdict: is it changing, by how much, and is the change statistically real. It then lets the user test that verdict three ways: when the evidence became strong enough, whether the verdict survives a different choice of years, and whether the same variable is doing the opposite somewhere else.

## 2. What is and is not new

A search for prior work found that the individual ideas already exist. The project page must say so; judges who know the field will respect an accurate claim more than an inflated one.

| Feature here | Prior work found | What differs |
|---|---|---|
| **Alibi Check** (trend for every start and end year) | Liebmann et al. 2010 (Bulletin of the American Meteorological Society) introduced these diagrams; the Moyhu "Temperature trend viewer" is an interactive version | Those cover global temperature indices only. Ours works for any location and any variable, including air pollution and soil moisture. |
| **Evidence Clock** | "Time of emergence" is an established research concept; a University of Washington tool maps it for the Pacific Northwest using climate model projections | Ours is computed from the observed record, for any point, and answers a simpler question: how many more years of data until this trend is detectable. |
| Trend plus significance for a location | Climate Wizard, NOAA Climate at a Glance, KNMI Climate Explorer, Giovanni | Those are built for analysts. Ours is a guided case with a plain-language verdict. |
| **Opposite Twin** | No direct equivalent found in a short search | Side-by-side verdicts for two places. |

**The accurate claim:** Cold Case: Earth is not a new statistical method. It combines three known robustness checks into one beginner-facing tool that works on any place and several kinds of NASA variables, and it presents the result as a verdict a student can read. The search was brief, so word the claim as "we did not find" and not "nobody has built."

### Features added after testing on the data

| Feature | What it does | Novelty |
|---|---|---|
| **Hidden Seasons** | When the yearly verdict is weak or flat, tests each calendar month separately and reports opposite trends that cancel in the annual average | Seasonal trend tests are standard in research; the automatic "your flat trend is hiding two opposite ones" check in a public tool was not searched for and may be uncommon |
| **Claim Checker** | The user types a claim such as "Phoenix is getting drier"; the app identifies place, variable and direction and answers TRUE, FALSE or UNPROVEN | Not searched; keyword matching, no language model |
| **If This Continues** | Extends a confirmed trend to 2050 with a widening uncertainty band, labelled as an extension of today's rate and not a forecast | Standard regression prediction interval |
| **Turning-point detector** | Finds the year where a record changes direction (Beijing, 2011) by comparing one straight line with two | Standard piecewise regression |

Machine-learning forecasts were considered and rejected: each record has 21 to 45 yearly values, too few to train on, and Beijing shows how an extrapolating model would have been wrong.

**One further feature that would add real novelty (stretch goal):** *Find My Twin*. Precompute trends for about 40 cities and let the app search them for the place where the chosen variable is moving most strongly in the opposite direction. No tool found in the search does this.

## 3. Audience

High school and college students and curious members of the public, as named in the challenge statement. Plain language throughout; every scientific term gets a one-line definition where it appears.

## 4. User flow

1. **Open a case**: choose a demo case, or click the map and pick a variable.
2. **See the evidence**: yearly values with a trend line and uncertainty band.
3. **Read the verdict**: a stamp and one plain sentence.
4. **Test the verdict**: Evidence Clock and Alibi Check tabs.
5. **Find the twin**: add a second place and compare.
6. **Close the case**: download the data and a short case summary.

| Stamp | Rule | Example from our data |
|---|---|---|
| CONFIRMED | Both tests give p < 0.05 | "Inuvik is warming by 0.46 °C per decade. Very unlikely to be chance." |
| SUSPECT | Either test gives p between 0.05 and 0.20, or the two tests disagree | "Inuvik may be getting wetter, but about 17 more years of data are needed to be sure." |
| NO CASE YET | Otherwise | "Vancouver's precipitation shows no direction over 45 years." |

## 5. Screens

### 5.1 Case desk

```
+--------------------------------------------------------------+
|  COLD CASE: EARTH             [Demo cases v]   [How it works] |
+---------------------------+----------------------------------+
|  1. WHERE?                |   2. WHAT ARE YOU CURIOUS ABOUT? |
|  [ world map, click to    |   ( ) Heat    ( ) Rain   ( ) Soil|
|    drop a pin ]           |   Variable: [Air temperature v]  |
|  Lat 49.28  Lon -123.12   |   "Average air temperature 2 m   |
|                           |    above the ground."            |
|                           |          [ OPEN THE CASE ]       |
+---------------------------+----------------------------------+
```

### 5.2 Case file

```
+--------------------------------------------------------------+
|  CASE: Inuvik, air temperature, 1981-2025                    |
+----------------------------------------------+---------------+
|  [ line chart: yearly values, trend line,    |  [CONFIRMED]  |
|    shaded 95% band ]                         |  +0.46 C per  |
|                                              |  decade       |
|  [x] Remove seasonal cycle   Years [====|==] |  "Very        |
|                                              |  unlikely to  |
|                                              |  be chance."  |
+----------------------------------------------+---------------+
|  Tabs: [Evidence Clock] [Alibi Check] [Opposite Twin] [Data] |
+--------------------------------------------------------------+
```

### 5.3 Tabs

- **Evidence Clock**: a timeline marking the first year the trend became significant and stayed so; or, if it has not, a countdown of the extra years needed. Always shows the assumption: "if the rate and year-to-year noise stay as they are."
- **Alibi Check**: triangle heatmap of trend by start year and end year; cells that are not significant are greyed out. One sentence underneath, such as "The verdict holds in 83 of 105 windows."
- **Hidden Seasons**: twelve bars, one per calendar month, showing each month's trend; significant months are marked. Flags a hidden shift only when at least two significant months have opposite signs, because testing twelve months invites chance results.
- **Opposite Twin**: second location, two charts on shared axes, two stamps.
- **Data**: source, units, limitations, raw table, CSV download.

## 6. Data in hand

All files are in `data/` (the two marked * are downloaded but not yet committed).

| File | Source | Variable | Place | Period | Step |
|---|---|---|---|---|---|
| `power_vancouver.csv` | NASA POWER (MERRA-2) | Temperature, precipitation, root-zone soil wetness | 49.28, -123.12 | 1981–2025 | Monthly |
| `power_inuvik.csv` | NASA POWER | same | 68.36, -133.72 | 1981–2025 | Monthly |
| `power_phoenix.csv` | NASA POWER | same | 33.45, -112.07 | 1981–2025 | Monthly |
| `gio_no2_la.csv` | Giovanni, OMI OMNO2d v004 | Tropospheric NO2 | Los Angeles box | 2005–2025 | Daily |
| `gio_no2_delhi.csv` | same | same | Delhi box | 2005–2025 | Daily |
| `gio_no2_beijing.csv` * | same | same | Beijing box | 2005–2025 | Daily |
| `gio_no2_dhaka.csv` * | same | same | Dhaka box (two grid cells) | 2005–2025 | Daily |
| `gio_precip_bc.csv` | Giovanni, GPM IMERG v07 | Precipitation | Southwest BC box | 2001–Sep 2025 | Monthly |
| `gio_soil_bc.csv` | Giovanni, GLDAS Noah v2.1 | Soil moisture, top 10 cm | Southwest BC box | 2001–2025 | Monthly |

### 6.1 File formats (confirmed from the real files)

**NASA POWER CSV**
- Header block ends with the line `-END HEADER-`; the table follows.
- Wide layout: one row per parameter and year, columns `JAN` to `DEC` plus `ANN`.
- Missing value: `-999`.
- Units: temperature °C, precipitation mm/day, soil wetness as a 0-to-1 fraction.
- Each point represents a grid cell of 0.5° by 0.625°.

**Giovanni CSV**
- Eight metadata lines, then a header row `time, <variable name>`.
- Monthly files use timestamps like `2001-01-01 00:00:00`; daily files use `2005-01-01`.
- Missing value differs per file (`-9999`, `-9999.9`, or `-1.267651e+30`); treat anything below -1000 as missing.
- IMERG precipitation is in mm/hr; multiply by 24 for mm/day.
- The NO2 files have gaps on 24% to 38% of days (cloud screening). Every month still has at least five valid days.

### 6.2 Pipeline

```
demo case (CSV in repo)      or      map click (live POWER request)
            \                              /
             v                            v
        load + clean: drop missing values
                     |
     daily data only: average to months (need >= 5 valid days)
                     |
     remove seasonal cycle: subtract each calendar month's mean
                     |
     yearly means (need 12 months; 10 for NO2)
                     |
   +-----------------+------------------+------------------+
   v                 v                  v                  v
 trend + two     all-window         detection year     second place
 tests           trends             or years needed
   |                 |                  |                  |
 verdict         Alibi Check        Evidence Clock     Opposite Twin
```

### 6.3 Live mode

Request the same CSV format the demo files use, so one parser handles both:

```
https://power.larc.nasa.gov/api/temporal/monthly/point
  ?parameters=T2M,PRECTOTCORR,GWETROOT&community=AG
  &latitude=<lat>&longitude=<lon>&start=1981&end=2025&format=CSV
```

This URL pattern produced the three files in the repository. Calling it from Python has not been tested yet.

## 7. Demo cases (from the real analysis)

| # | Case | Finding | Feature it shows |
|---|---|---|---|
| 1 | **The Arctic is warming** — Inuvik temperature | +0.46 °C per decade, 1981–2025, confirmed | Basic verdict |
| 2 | **Two cities, opposite air** — Los Angeles and Dhaka NO2 | Los Angeles down about 57% (−3.3 per decade); Dhaka roughly doubled (+2.1 per decade); both confirmed | Opposite Twin |
| 3 | **Same warming, opposite water** — Phoenix and Inuvik | Both warm at about +0.47 °C per decade; Phoenix precipitation falls (confirmed) while Inuvik soil wetness rises (confirmed) | Opposite Twin; the challenge's central point |
| 4 | **The hidden turn** — Beijing NO2 | Flat until a 2011 peak, then steeply down; 83 of 105 windows show a significant fall, 22 show nothing, none show a rise | Alibi Check |
| 5 | **Not enough evidence** — Inuvik precipitation; BC soil moisture | Both look like trends; about 17 and 19 more years needed | Evidence Clock |
| 6 | **Home case** — Vancouver | Temperature +0.21 °C per decade, confirmed; precipitation shows no trend at all | Local relevance |

| 7 | **The shifting seasons** — Vancouver precipitation | Yearly verdict is "no case", but February is significantly drier (−0.73 mm/day per decade) and September significantly wetter (+0.57) | Hidden Seasons |

Also found: Inuvik's warming is concentrated in October and November (+1.1 and +1.6 °C per decade) with almost none in June.

NO2 values are in units of 10¹⁵ molecules/cm². Delhi came out flat over 20 years and is kept as a contrast city, not a headline case.

### Full results table

| Dataset | Period | Change per decade | t-test p | Mann-Kendall p | Verdict |
|---|---|---|---|---|---|
| Phoenix temperature | 1981–2025 | +0.47 °C | <0.001 | <0.001 | Confirmed |
| Inuvik temperature | 1981–2025 | +0.46 °C | <0.001 | <0.001 | Confirmed |
| Vancouver temperature | 1981–2025 | +0.21 °C | 0.007 | 0.013 | Confirmed |
| Phoenix precipitation | 1981–2025 | −0.082 mm/day | 0.004 | 0.008 | Confirmed |
| Inuvik precipitation | 1981–2025 | +0.024 mm/day | 0.22 | 0.14 | Suspect |
| Vancouver precipitation | 1981–2025 | −0.008 mm/day | 0.93 | 0.96 | No case |
| Inuvik soil wetness | 1981–2025 | +0.015 | 0.001 | 0.025 | Confirmed |
| Phoenix soil wetness | 1981–2025 | −0.005 | 0.033 | 0.098 | Suspect (tests disagree) |
| Vancouver soil wetness | 1981–2025 | 0.000 | 0.96 | 0.91 | No case |
| Los Angeles NO2 | 2005–2025 | −3.3 | <0.001 | <0.001 | Confirmed |
| Beijing NO2 | 2005–2025 | −3.6 | <0.001 | <0.001 | Confirmed |
| Dhaka NO2 | 2005–2025 | +2.1 | <0.001 | 0.003 | Confirmed |
| Delhi NO2 | 2005–2025 | −0.1 | 0.54 | 0.98 | No case |
| BC soil moisture | 2001–2025 | −0.20 kg/m² | 0.39 | 0.20 | Suspect |
| BC precipitation | 2001–2024 | +0.005 mm/day | 0.96 | 0.64 | No case |

## 8. Statistics

| Step | Method | Call |
|---|---|---|
| Rate of change | Least-squares slope with 95% confidence interval | `scipy.stats.linregress` |
| Robust rate | Theil-Sen slope | `scipy.stats.theilslopes` |
| Significance 1 | t-test on the slope | p-value from `linregress` |
| Significance 2 | Mann-Kendall with autocorrelation correction | `pymannkendall.hamed_rao_modification_test` |
| Alibi Check | Slope and p-value for every window of 8+ years | loop |
| Evidence Clock | Years until `|slope| / SE` passes the critical t value, where `SE = s / sqrt(n(n²−1)/12)` | custom |

### 8.1 Code that has been run on the real files

```python
import io
import numpy as np, pandas as pd
from scipy import stats
import pymannkendall as mk

MON = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"]

def load_power(path_or_text, is_text=False):
    """NASA POWER monthly CSV -> {code: DataFrame(year, month, value)}"""
    text = path_or_text if is_text else open(path_or_text).read()
    body = text.split("-END HEADER-")[1]
    df = pd.read_csv(io.StringIO(body.strip()))
    out = {}
    for code, g in df.groupby("PARAMETER"):
        m = g.melt(id_vars=["YEAR"], value_vars=MON, var_name="mon", value_name="value")
        m["month"] = m["mon"].map({k: i + 1 for i, k in enumerate(MON)})
        m = m[m.value != -999].rename(columns={"YEAR": "year"})
        out[code] = m[["year", "month", "value"]]
    return out

def load_giovanni(path, daily=False, scale=1.0):
    """Giovanni area-averaged time series -> DataFrame(year, month, value)"""
    df = pd.read_csv(path, skiprows=8, names=["time", "value"], header=0)
    df["time"] = pd.to_datetime(df["time"])
    df = df[df.value > -1e3]
    df["value"] *= scale
    df["year"], df["month"] = df.time.dt.year, df.time.dt.month
    if daily:
        g = df.groupby(["year", "month"])["value"].agg(["mean", "count"]).reset_index()
        g = g[g["count"] >= 5].rename(columns={"mean": "value"})
        return g[["year", "month", "value"]]
    return df[["year", "month", "value"]]

def yearly(df, min_months=12):
    """Remove the seasonal cycle and return yearly mean anomalies."""
    df = df.assign(anom=df.value - df.groupby("month")["value"].transform("mean"))
    n = df.groupby("year")["anom"].count()
    return df.groupby("year")["anom"].mean()[n >= min_months]

def analyse(s):
    x, y = s.index.values.astype(float), s.values
    o = stats.linregress(x, y)
    tcrit = stats.t.ppf(0.975, len(x) - 2)
    return dict(
        slope=o.slope, slope_decade=o.slope * 10,
        ci_decade=(10 * (o.slope - tcrit * o.stderr), 10 * (o.slope + tcrit * o.stderr)),
        p_t=o.pvalue, p_mk=mk.hamed_rao_modification_test(y).p,
        sen_decade=stats.theilslopes(y, x)[0] * 10,
        resid_sd=np.std(y - (o.intercept + o.slope * x), ddof=2), n=len(x))

def verdict(a):
    if a["p_t"] < 0.05 and a["p_mk"] < 0.05:
        return "CONFIRMED"
    if min(a["p_t"], a["p_mk"]) < 0.20:
        return "SUSPECT"
    return "NO CASE YET"

def years_needed(a, alpha=0.05, max_n=400):
    for n in range(max(a["n"], 5), max_n + 1):
        se = a["resid_sd"] / np.sqrt(n * (n**2 - 1) / 12)
        if abs(a["slope"]) / se >= stats.t.ppf(1 - alpha / 2, n - 2):
            return n - a["n"]
    return None

def trend_triangle(s, min_len=8):
    out, years = [], s.index.values
    for i, a in enumerate(years):
        for b in years[i + min_len - 1:]:
            w = s.loc[a:b]
            r = stats.linregress(w.index.values.astype(float), w.values)
            out.append((a, b, r.slope * 10, r.pvalue))
    return pd.DataFrame(out, columns=["start", "end", "slope_decade", "p"])
```

Usage notes: pass `scale=24` for the IMERG file, `scale=1e-15` and `daily=True` with `min_months=10` for NO2 files.

### 8.2 Display rules learned from the data

- If `years_needed` returns more than about 100, show "no detectable trend" instead of a number (Vancouver precipitation returns 318).
- If the t-test passes and Mann-Kendall does not, the stamp is SUSPECT and the text says the two tests disagree (Phoenix soil wetness).
- If the recent years bend away from the line, say so in the case text (Dhaka levels off after about 2018).

## 9. Framework

| Layer | Choice | Why |
|---|---|---|
| App | **Streamlit** | One Python codebase for data, statistics, and interface |
| Charts | **Plotly** | Interactive lines and heatmaps |
| Map | **Folium** with `streamlit-folium` | Returns the clicked coordinates |
| Statistics | `scipy`, `pymannkendall`, `pandas`, `numpy` | Section 8 |
| Caching | `st.cache_data` | Demo cases load instantly |
| Hosting | **Streamlit Community Cloud** from the public GitHub repository | Free link for judges |

```
cold-case-earth/
  app.py              # layout and navigation
  loaders.py          # load_power, load_giovanni, fetch_power_live
  detective.py        # yearly, analyse, verdict, years_needed, trend_triangle
  cases.py            # the demo cases: files, labels, plain-language text
  variables.py        # names, units, one-line definitions
  data/               # the CSV files
  requirements.txt
  README.md
  PROJECT_SPEC.md
```

## 10. Build order

| Block | Hours | Outcome | State |
|---|---|---|---|
| 1 | — | Data collected and checked | Done |
| 2 | — | Statistics verified on real data | Done |
| 3 | 2 | `loaders.py`, `detective.py`, `cases.py`; app shows one demo case with chart and stamp | Next |
| 4 | 1 | All six demo cases selectable | |
| 5 | 2 | Evidence Clock tab | |
| 6 | 2 | Alibi Check tab | |
| 7 | 1 | Opposite Twin tab | |
| 7b | 1 | Hidden Seasons tab; If This Continues band; turning-point note | |
| 7c | 1 | Claim Checker front door | |
| 8 | 1.5 | Live mode: map click and POWER request | |
| 9 | 1 | Definitions, source credits, limitations on every screen; deploy | |
| 10 | 2 | Demo video or slides; project page | |

If time runs short, drop in this order: Find My Twin, live mode, Opposite Twin as a tab (cases 2 and 3 can be shown as fixed pairs). Keep the Evidence Clock and Alibi Check.

## 11. Limitations to state in the app and the write-up

- POWER values are model-based estimates (reanalysis) for one grid cell, not direct measurements. They are more reliable for temperature than for precipitation or soil wetness.
- The Dhaka box covers two grid cells; the Giovanni boxes are small city samples.
- NO2 daily data is cloud-screened and has gaps; monthly means are built from the valid days.
- "Years needed" assumes the present rate and noise continue and ignores autocorrelation.
- Only straight-line trends are tested. Beijing and Dhaka show that real records can bend.
- A significant trend does not identify its cause.

## 12. Judging criteria

| Criterion | Evidence |
|---|---|
| Influence | Anyone can check a claim about their own town; cases span climate and air quality |
| Creativity | Case-file framing; three robustness checks in one beginner tool; prior work acknowledged |
| Validity | Two tests, autocorrelation correction, confidence intervals, stated limitations, results reproducible from files in the repository |
| Relevance | All four objectives in the statement met, using named sources: MERRA-2, GPM, GLDAS, OMI |
| Presentation | Six cases with plain verdicts; video follows one case from question to verdict |

## 13. Submission checklist

Confirm each against the official Project Submission Guide.

- [ ] Submitted under this challenge before the deadline
- [ ] Public repository linked; live app link works in a private window
- [ ] Demo in the required format and length
- [ ] Sources credited: NASA POWER and MERRA-2, Giovanni, OMI, GPM IMERG, GLDAS
- [ ] Prior work cited: Liebmann et al. 2010, the Moyhu trend viewer, time-of-emergence tools
- [ ] AI assistance declared where the form asks
- [ ] Limitations section included
