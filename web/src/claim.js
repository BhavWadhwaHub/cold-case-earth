// Turn a typed claim into place + measurement + direction, then rule on it.
// Mirrors parse_claim in cases.py; stored places only.

const PLACE_ALIASES = {
  vancouver: "vancouver", inuvik: "inuvik", phoenix: "phoenix",
  "los angeles": "la", "l.a.": "la", delhi: "delhi", beijing: "beijing",
  dhaka: "dhaka", "british columbia": "bc", "b.c.": "bc",
};

const RULES = [
  [["warmer", "hotter", "warming", "heating up", "getting hot"], "temp", 1],
  [["cooler", "colder", "cooling"], "temp", -1],
  [["wetter", "rainier", "more rain", "more snow", "more precipitation", "snowier"], "rain", 1],
  [["drier", "dryer", "less rain", "less snow", "drying", "drought"], "rain", -1],
  [["more polluted", "dirtier", "pollution is rising", "pollution is getting worse",
    "air is getting worse", "smoggier", "more smog"], "air", 1],
  [["cleaner", "less polluted", "pollution is falling", "air is improving",
    "air is getting better", "less smog"], "air", -1],
];

const WANTED = {
  temp: ["T2M"], rain: ["PRECTOTCORR", "IMERG"],
  soil: ["GWETROOT", "SOIL10"], air: ["NO2"],
};

export const EXAMPLES = [
  "Phoenix is getting drier",
  "Beijing is more polluted",
  "Vancouver is getting wetter",
  "Dhaka's air is getting worse",
  "Inuvik is getting colder",
];

export function parseClaim(text) {
  const t = ` ${text.toLowerCase().trim()} `;
  let family = null, direction = null;
  for (const [words, fam, dir] of RULES) {
    if (words.some((w) => t.includes(w))) { family = fam; direction = dir; break; }
  }
  if (family === "rain" && (t.includes("soil") || t.includes("ground"))) family = "soil";
  let place = null;
  const aliases = Object.keys(PLACE_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    if (t.includes(alias)) { place = PLACE_ALIASES[alias]; break; }
  }
  return { place, family, direction };
}

export function checkClaim(text, records) {
  const got = parseClaim(text);
  if (!got.family) {
    return { problem: "I could not find a direction in that. Try words like warmer, cooler, wetter, drier, cleaner or more polluted." };
  }
  if (!got.place) {
    return { problem: "I do not recognise that place. Stored places: Vancouver, Inuvik, Phoenix, Los Angeles, Delhi, Beijing, Dhaka and British Columbia." };
  }
  const key = WANTED[got.family].map((v) => `${got.place}:${v}`).find((k) => records[k]);
  if (!key) {
    return { problem: "There is no stored record of that kind for that place. Air pollution is stored for Los Angeles, Delhi, Beijing and Dhaka; temperature, precipitation and soil for Vancouver, Inuvik and Phoenix." };
  }
  const rec = records[key];
  const up = rec.a.slope > 0;
  let ruling = "UNPROVEN";
  if (rec.verdict === "CONFIRMED") ruling = up === got.direction > 0 ? "TRUE" : "FALSE";
  return { key, ruling };
}
