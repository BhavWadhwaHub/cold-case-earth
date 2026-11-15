"""The statistics behind every verdict.

Input everywhere is a monthly DataFrame (year, month, value) or the yearly
Series produced by `yearly()`.
"""
import numpy as np
import pandas as pd
import pymannkendall as mk
from scipy import stats

ALPHA = 0.05


def yearly(monthly, min_months=12):
    """Remove the seasonal cycle and return one value per year.

    Each month is compared with its own long-term average, the differences are
    averaged per year, and the overall mean is added back so the numbers stay
    in familiar units. Years with fewer than `min_months` months are dropped.
    """
    clim = monthly.groupby("month")["value"].transform("mean")
    df = monthly.assign(anom=monthly["value"] - clim)
    n = df.groupby("year")["anom"].count()
    s = df.groupby("year")["anom"].mean()[n >= min_months]
    return s + monthly.groupby("month")["value"].mean().mean()


def analyse(s):
    """Trend, uncertainty and two significance tests for a yearly Series."""
    x, y = s.index.values.astype(float), s.values.astype(float)
    o = stats.linregress(x, y)
    tcrit = stats.t.ppf(1 - ALPHA / 2, len(x) - 2)
    resid = y - (o.intercept + o.slope * x)
    return dict(
        n=len(x), start=int(x[0]), end=int(x[-1]),
        slope=o.slope, intercept=o.intercept, stderr=o.stderr,
        slope_decade=o.slope * 10,
        ci_decade=(10 * (o.slope - tcrit * o.stderr),
                   10 * (o.slope + tcrit * o.stderr)),
        p_t=o.pvalue,
        p_mk=mk.hamed_rao_modification_test(y).p,
        sen_decade=stats.theilslopes(y, x)[0] * 10,
        resid_sd=float(np.std(resid, ddof=2)),
        mean=float(y.mean()),
    )


def verdict(a):
    """CONFIRMED needs both tests; SUSPECT needs a hint from either."""
    if a["p_t"] < ALPHA and a["p_mk"] < ALPHA:
        return "CONFIRMED"
    if min(a["p_t"], a["p_mk"]) < 0.20:
        return "SUSPECT"
    return "NO CASE YET"


def years_needed(a, max_extra=100):
    """Extra years of data until the current trend would pass the t-test.

    Assumes the rate and the year-to-year noise stay as they are. Returns
    None when it would take longer than `max_extra` years.
    """
    for n in range(max(a["n"], 5), a["n"] + max_extra + 1):
        se = a["resid_sd"] / np.sqrt(n * (n ** 2 - 1) / 12)
        if abs(a["slope"]) / se >= stats.t.ppf(1 - ALPHA / 2, n - 2):
            return n - a["n"]
    return None


def first_detected(s, min_len=8):
    """First end-year after which the trend from the record's start was
    significant and stayed significant. None if it never settled."""
    years = s.index.values
    flags = []
    for end in years[min_len - 1:]:
        w = s.loc[:end]
        p = stats.linregress(w.index.values.astype(float), w.values).pvalue
        flags.append((int(end), p < ALPHA))
    detected = None
    for end, ok in reversed(flags):
        if not ok:
            break
        detected = end
    return detected


def evidence_path(s, min_len=8):
    """p-value of the trend from the record's start to each end-year."""
    rows = []
    for end in s.index.values[min_len - 1:]:
        w = s.loc[:end]
        r = stats.linregress(w.index.values.astype(float), w.values)
        rows.append((int(end), r.pvalue))
    return pd.DataFrame(rows, columns=["end", "p"])


def trend_triangle(s, min_len=8):
    """Trend and p-value for every start/end pair at least `min_len` long."""
    rows, years = [], s.index.values
    for i, a in enumerate(years):
        for b in years[i + min_len - 1:]:
            w = s.loc[a:b]
            r = stats.linregress(w.index.values.astype(float), w.values)
            rows.append((int(a), int(b), r.slope * 10, r.pvalue))
    return pd.DataFrame(rows, columns=["start", "end", "slope_decade", "p"])


def triangle_summary(tri):
    sig = tri[tri["p"] < ALPHA]
    return dict(total=len(tri),
                up=int((sig["slope_decade"] > 0).sum()),
                down=int((sig["slope_decade"] < 0).sum()),
                none=int(len(tri) - len(sig)))


def turning_point(s, min_side=5):
    """Look for a year where the record changes direction.

    Compares one straight line with two lines joined at each candidate year,
    using BIC so the extra flexibility has to earn its keep. Returns None
    unless two lines are clearly better and the slopes have opposite signs or
    only one side is significant.
    """
    x, y = s.index.values.astype(float), s.values.astype(float)
    n = len(x)
    if n < 2 * min_side + 1:
        return None

    def sse(xs, ys):
        o = stats.linregress(xs, ys)
        return float(((ys - (o.intercept + o.slope * xs)) ** 2).sum()), o

    one, _ = sse(x, y)
    bic_one = n * np.log(one / n) + 2 * np.log(n)
    best = None
    for k in range(min_side - 1, n - min_side + 1):
        a, oa = sse(x[:k + 1], y[:k + 1])
        b, ob = sse(x[k:], y[k:])
        bic = n * np.log((a + b) / n) + 5 * np.log(n)
        if best is None or bic < best[0]:
            best = (bic, int(x[k]), oa, ob)
    bic_two, year, oa, ob = best
    if bic_two > bic_one - 4:
        return None
    sig_a, sig_b = oa.pvalue < ALPHA, ob.pvalue < ALPHA
    flips = oa.slope * ob.slope < 0
    if not (flips or sig_a != sig_b):
        return None
    return dict(year=year,
                before_decade=oa.slope * 10, before_sig=bool(sig_a),
                after_decade=ob.slope * 10, after_sig=bool(sig_b))


def projection(s, a, to_year=2050):
    """Extend the fitted line with a 95% prediction band.

    This is "if the current rate continues", not a forecast.
    """
    x = s.index.values.astype(float)
    fut = np.arange(a["end"] + 1, to_year + 1, dtype=float)
    sxx = ((x - x.mean()) ** 2).sum()
    tcrit = stats.t.ppf(1 - ALPHA / 2, a["n"] - 2)
    mid = a["intercept"] + a["slope"] * fut
    half = tcrit * a["resid_sd"] * np.sqrt(1 + 1 / a["n"] + (fut - x.mean()) ** 2 / sxx)
    return pd.DataFrame(dict(year=fut.astype(int), mid=mid,
                             low=mid - half, high=mid + half))


def hidden_seasons(monthly, min_years=15):
    """Trend for each calendar month on its own.

    `hidden` is True only when at least two significant months point in
    opposite directions: with twelve tests, a single hit can be chance.
    """
    rows = []
    for m in range(1, 13):
        g = monthly[monthly["month"] == m].sort_values("year")
        if len(g) < min_years:
            continue
        o = stats.linregress(g["year"].values.astype(float), g["value"].values)
        rows.append((m, o.slope * 10, o.pvalue, o.pvalue < ALPHA))
    df = pd.DataFrame(rows, columns=["month", "slope_decade", "p", "significant"])
    sig = df[df["significant"]]
    up, down = sig[sig["slope_decade"] > 0], sig[sig["slope_decade"] < 0]
    return df, dict(hidden=len(up) > 0 and len(down) > 0,
                    up=up["month"].tolist(), down=down["month"].tolist())
