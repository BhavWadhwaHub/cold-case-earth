# Cold Case: Earth

A fact-checker for climate trends, built for the NASA Space Apps Challenge 2026
(**Be An Earth System Trend Detective!**).

Pick a place and a measurement. The app tells you whether the change is real,
how strong the evidence is, and whether the claim survives scrutiny.

| Feature | Question it answers |
|---|---|
| Verdict | Is it changing, by how much, and is that statistically real? |
| Evidence Clock | When did the trend become detectable, or how many more years are needed? |
| Alibi Check | Does the answer depend on which years you picked? |
| Hidden Seasons | Is a flat yearly figure hiding opposite seasonal changes? |
| Opposite Twin | Is the same measurement going the other way somewhere else? |
| Check a claim | Type "Phoenix is getting drier" and get TRUE, FALSE or UNPROVEN |

## Two front ends, one set of statistics

All the maths lives in Python (`detective.py`). Both front ends show the same results.

### Web app (React, in `web/`)

The public site: a space-themed interface with a 3D globe. It displays results
that `scripts/build_data.py` precomputes into `web/public/data/cases.json`.

```
cd web
npm install
npm run dev        # local development
npm run build      # production build in web/dist
```

Deploy on Vercel: import this repository and set **Root Directory** to `web`.
Vercel detects Vite and needs no other settings.

After changing data or statistics, regenerate the results from the repository root:

```
pip install -r requirements.txt
python scripts/build_data.py
```

### Analysis app (Streamlit, at the repository root)

The same cases plus a live lookup for any location from NASA POWER.

```
pip install -r requirements.txt
streamlit run app.py
```

## Data

All files are in `data/`.

- **NASA POWER (MERRA-2)**: monthly temperature, precipitation and root-zone
  soil wetness for Vancouver, Inuvik and Phoenix, 1981 to 2025.
- **NASA Giovanni, OMI OMNO2d v004**: daily tropospheric nitrogen dioxide for
  Los Angeles, Delhi, Beijing and Dhaka, 2005 to 2025.
- **NASA Giovanni, GPM IMERG v07** and **GLDAS Noah v2.1**: monthly
  precipitation and topsoil moisture for southwest British Columbia.

## Method and limits

See `PROJECT_SPEC.md` and the "How it works" page in the app. In short: the
seasonal cycle is removed, records are averaged to yearly values, and a linear
trend is tested with a t-test and an autocorrelation-corrected Mann-Kendall
test. POWER values are model-based estimates for one grid cell; only linear
trends are tested; a confirmed trend says nothing about its cause.

## Prior work

Start/end-year trend diagrams: Liebmann et al. (2010), and the Moyhu
temperature trend viewer. "Time of emergence" is an established research
concept. This project combines those checks for any place and several NASA
variables in plain language.

## AI use

Built with assistance from Claude (Anthropic) for planning, code and analysis.
