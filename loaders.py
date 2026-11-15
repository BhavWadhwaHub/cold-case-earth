"""Read NASA POWER and Giovanni files into one common shape.

Every loader returns a DataFrame with columns: year, month, value.
"""
import io

import pandas as pd
import requests

MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN",
          "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
POWER_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point"
POWER_CODES = "T2M,PRECTOTCORR,GWETROOT"


def parse_power(text):
    """NASA POWER monthly CSV text -> {parameter code: DataFrame}."""
    body = text.split("-END HEADER-")[1].strip()
    wide = pd.read_csv(io.StringIO(body))
    out = {}
    for code, g in wide.groupby("PARAMETER"):
        long = g.melt(id_vars=["YEAR"], value_vars=MONTHS,
                      var_name="mon", value_name="value")
        long["month"] = long["mon"].map({m: i + 1 for i, m in enumerate(MONTHS)})
        long = long[long["value"] != -999].rename(columns={"YEAR": "year"})
        out[code] = long[["year", "month", "value"]].reset_index(drop=True)
    return out


def load_power(path):
    with open(path) as f:
        return parse_power(f.read())


def fetch_power_live(lat, lon, start=1981, end=2025, timeout=60):
    """Ask NASA POWER for one location. Returns {code: DataFrame}."""
    r = requests.get(POWER_URL, timeout=timeout, params=dict(
        parameters=POWER_CODES, community="AG", latitude=lat, longitude=lon,
        start=start, end=end, format="CSV"))
    r.raise_for_status()
    return parse_power(r.text)


def load_giovanni(path, daily=False, scale=1.0, min_days=5):
    """Giovanni area-averaged time series CSV -> DataFrame.

    Daily files are averaged to months; a month needs `min_days` valid days.
    Any value below -1000 is a missing-data marker.
    """
    df = pd.read_csv(path, skiprows=8, names=["time", "value"], header=0)
    df["time"] = pd.to_datetime(df["time"])
    df = df[df["value"] > -1e3].copy()
    df["value"] = df["value"] * scale
    df["year"] = df["time"].dt.year
    df["month"] = df["time"].dt.month
    if daily:
        g = df.groupby(["year", "month"])["value"].agg(["mean", "count"]).reset_index()
        g = g[g["count"] >= min_days].rename(columns={"mean": "value"})
        return g[["year", "month", "value"]].reset_index(drop=True)
    return df[["year", "month", "value"]].reset_index(drop=True)
