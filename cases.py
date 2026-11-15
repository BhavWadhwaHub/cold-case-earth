"""What the app knows about: variables, stored records, demo cases, cities."""
from pathlib import Path

import loaders

DATA = Path(__file__).parent / "data"

# ---------------------------------------------------------------- variables
VARIABLES = {
    "T2M": dict(
        name="Air temperature", unit="°C", decimals=2,
        definition="Average air temperature 2 metres above the ground.",
        caution="Model-based estimate (MERRA-2 reanalysis) for one grid cell "
                "of about 50 km. Reliable for temperature."),
    "PRECTOTCORR": dict(
        name="Rain and snowfall", unit="mm/day", decimals=3,
        definition="Average precipitation per day, rain and melted snow together.",
        caution="Model-based estimate (MERRA-2). Less reliable for precipitation "
                "than for temperature; treat as indicative."),
    "GWETROOT": dict(
        name="Root-zone soil wetness", unit="on a 0-to-1 scale", decimals=3,
        definition="How wet the soil is where plant roots grow: 0 is bone dry, "
                   "1 is saturated.",
        caution="Model-based estimate (MERRA-2). Less reliable than temperature."),
    "NO2": dict(
        name="Nitrogen dioxide (air pollution)", unit="×10¹⁵ molecules/cm²", decimals=2,
        definition="A gas from traffic, power plants and industry, measured from "
                   "space as the amount in the lower atmosphere above the city.",
        caution="Satellite measurement (OMI). Cloudy days are missing, so monthly "
                "averages use the clear days only."),
    "IMERG": dict(
        name="Rain and snowfall (satellite)", unit="mm/day", decimals=3,
        definition="Precipitation estimated from satellites and rain gauges.",
        caution="Satellite and gauge blend (GPM IMERG), averaged over a region."),
    "SOIL10": dict(
        name="Topsoil moisture", unit="kg/m²", decimals=2,
        definition="Water held in the top 10 cm of soil.",
        caution="Land-model estimate (GLDAS Noah), averaged over a region."),
}

# ------------------------------------------------------------ stored records
# key -> how to load it and how to describe it
RECORDS = {}


def _power(place_key, place_name, lat, lon):
    for code in ("T2M", "PRECTOTCORR", "GWETROOT"):
        RECORDS[f"{place_key}:{code}"] = dict(
            place=place_name, var=code, kind="power",
            file=f"power_{place_key}.csv", min_months=12,
            source="NASA POWER (MERRA-2)", where=f"{lat}, {lon}")


_power("vancouver", "Vancouver", 49.28, -123.12)
_power("inuvik", "Inuvik", 68.36, -133.72)
_power("phoenix", "Phoenix", 33.45, -112.07)

for _key, _name, _box in [
        ("la", "Los Angeles", "-118.7, 33.6, -117.6, 34.4"),
        ("delhi", "Delhi", "76.8, 28.3, 77.6, 28.9"),
        ("beijing", "Beijing", "116.0, 39.6, 116.8, 40.2"),
        ("dhaka", "Dhaka", "90.2, 23.6, 90.6, 24.0 (two grid cells)")]:
    RECORDS[f"{_key}:NO2"] = dict(
        place=_name, var="NO2", kind="giovanni", file=f"gio_no2_{_key}.csv",
        daily=True, scale=1e-15, min_months=10,
        source="NASA Giovanni, OMI OMNO2d v004", where=f"box {_box}")

RECORDS["bc:IMERG"] = dict(
    place="Southwest British Columbia", var="IMERG", kind="giovanni",
    file="gio_precip_bc.csv", daily=False, scale=24.0, min_months=12,
    source="NASA Giovanni, GPM IMERG v07", where="box -125, 48.5, -121, 51")
RECORDS["bc:SOIL10"] = dict(
    place="Southwest British Columbia", var="SOIL10", kind="giovanni",
    file="gio_soil_bc.csv", daily=False, scale=1.0, min_months=12,
    source="NASA Giovanni, GLDAS Noah v2.1", where="box -125, 48.5, -121, 51")


def load_record(key):
    """Return (monthly DataFrame, record description) for a stored record."""
    rec = RECORDS[key]
    path = DATA / rec["file"]
    if rec["kind"] == "power":
        monthly = loaders.load_power(path)[rec["var"]]
    else:
        monthly = loaders.load_giovanni(path, daily=rec["daily"], scale=rec["scale"])
    return monthly, rec


# ---------------------------------------------------------------- demo cases
CASES = [
    dict(id="arctic", title="The Arctic is warming",
         question="Is Inuvik, in Canada's Arctic, really getting warmer?",
         primary="inuvik:T2M", twin=None, tab="Evidence Clock",
         note="A clear case. Open Hidden Seasons to see which months carry "
              "the warming."),
    dict(id="air", title="Two cities, opposite air",
         question="Did air pollution go the same way in Los Angeles and Dhaka?",
         primary="la:NO2", twin="dhaka:NO2", tab="Opposite Twin",
         note="Same gas, same satellite, opposite directions."),
    dict(id="water", title="Same warming, opposite water",
         question="Inuvik and Phoenix are warming at the same rate. Is their "
                  "soil changing the same way?",
         primary="inuvik:GWETROOT", twin="phoenix:GWETROOT", tab="Opposite Twin",
         note="The challenge's central point: one driver, opposite local results. "
              "Phoenix's drying is not yet confirmed, and the app says so."),
    dict(id="beijing", title="The hidden turn",
         question="Is Beijing's air pollution rising or falling?",
         primary="beijing:NO2", twin=None, tab="Alibi Check",
         note="The answer depends on which years you look at."),
    dict(id="wait", title="Not enough evidence",
         question="Is Inuvik getting more rain and snow?",
         primary="inuvik:PRECTOTCORR", twin=None, tab="Evidence Clock",
         note="It looks like a trend. The Evidence Clock says how long until "
              "we can be sure."),
    dict(id="home", title="Home case: Vancouver",
         question="Is Vancouver warming?",
         primary="vancouver:T2M", twin=None, tab="Evidence Clock",
         note="A local case, with a slower rate than the Arctic."),
    dict(id="seasons", title="The shifting seasons",
         question="Is Vancouver's rainfall changing?",
         primary="vancouver:PRECTOTCORR", twin=None, tab="Hidden Seasons",
         note="The yearly answer is no. The monthly answer is more interesting."),
]

# ------------------------------------------------------------- claim checker
# Places with stored data, and the names people might type for them.
PLACE_ALIASES = {
    "vancouver": "vancouver", "inuvik": "inuvik", "phoenix": "phoenix",
    "los angeles": "la", "l.a.": "la", "delhi": "delhi", "beijing": "beijing",
    "dhaka": "dhaka", "british columbia": "bc", "b.c.": "bc",
}

# Extra cities the live mode can look up from NASA POWER: name -> (lat, lon)
LIVE_CITIES = {
    "toronto": (43.65, -79.38), "montreal": (45.50, -73.57),
    "calgary": (51.05, -114.07), "new york": (40.71, -74.01),
    "chicago": (41.88, -87.63), "miami": (25.76, -80.19),
    "mexico city": (19.43, -99.13), "sao paulo": (-23.55, -46.63),
    "london": (51.51, -0.13), "paris": (48.86, 2.35), "madrid": (40.42, -3.70),
    "cairo": (30.04, 31.24), "lagos": (6.52, 3.38), "nairobi": (-1.29, 36.82),
    "cape town": (-33.92, 18.42), "mumbai": (19.08, 72.88),
    "tokyo": (35.68, 139.69), "sydney": (-33.87, 151.21),
    "reykjavik": (64.15, -21.94), "anchorage": (61.22, -149.90),
}

# (words that signal it, variable family, direction: +1 up, -1 down)
CLAIM_RULES = [
    (("warmer", "hotter", "warming", "heating up", "getting hot"), "temp", +1),
    (("cooler", "colder", "cooling"), "temp", -1),
    (("wetter", "rainier", "more rain", "more snow", "more precipitation",
      "snowier"), "rain", +1),
    (("drier", "dryer", "less rain", "less snow", "drying", "drought"), "rain", -1),
    (("more polluted", "dirtier", "pollution is rising", "pollution is getting worse",
      "air is getting worse", "smoggier", "more smog"), "air", +1),
    (("cleaner", "less polluted", "pollution is falling", "air is improving",
      "air is getting better", "less smog"), "air", -1),
]


def parse_claim(text):
    """Turn a sentence into (place key or city, family, direction).

    Returns a dict with whichever parts were recognised; missing parts are None.
    """
    t = " " + text.lower().strip() + " "
    family = direction = None
    soil = "soil" in t or "ground" in t
    for words, fam, d in CLAIM_RULES:
        if any(w in t for w in words):
            family, direction = fam, d
            break
    if family == "rain" and soil:
        family = "soil"
    place = live = None
    for alias, key in sorted(PLACE_ALIASES.items(), key=lambda kv: -len(kv[0])):
        if alias in t:
            place = key
            break
    if place is None:
        for city in sorted(LIVE_CITIES, key=len, reverse=True):
            if city in t:
                live = city
                break
    return dict(place=place, live_city=live, family=family, direction=direction)


def record_for(place, family):
    """Pick the stored record that answers a claim, or None."""
    wanted = {"temp": ["T2M"], "rain": ["PRECTOTCORR", "IMERG"],
              "soil": ["GWETROOT", "SOIL10"], "air": ["NO2"]}[family]
    for var in wanted:
        if f"{place}:{var}" in RECORDS:
            return f"{place}:{var}"
    return None
