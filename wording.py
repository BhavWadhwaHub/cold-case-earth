"""Plain-language wording shared by the Streamlit app and the web build."""
import detective as d


def num(x, c, signed=False):
    return f"{x:{'+' if signed else ''}.{c['meta']['decimals']}f}"


def direction_word(c, up):
    if c["var"] in ("PRECTOTCORR", "IMERG"):
        return "increasing" if up else "decreasing"
    return "rising" if up else "falling"


def sentence(c):
    a, m = c["a"], c["meta"]
    up = a["slope"] > 0
    rate = f"{num(abs(a['slope_decade']), c)} {m['unit']} per decade"
    span = f"{a['start']} to {a['end']}"
    if c["verdict"] == "CONFIRMED":
        return (f"{m['name']} in {c['place']} is {direction_word(c, up)} by {rate} "
                f"({span}). Very unlikely to be chance.")
    if c["verdict"] == "SUSPECT":
        extra = (" The two tests disagree, so treat it as unproven."
                 if min(a["p_t"], a["p_mk"]) < d.ALPHA else "")
        return (f"{m['name']} in {c['place']} may be {direction_word(c, up)} "
                f"(about {rate}), but the evidence is not strong enough yet.{extra}")
    return (f"{m['name']} in {c['place']} shows no clear direction over "
            f"{a['n']} years ({span}).")
