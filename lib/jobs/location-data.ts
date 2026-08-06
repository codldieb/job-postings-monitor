export const COUNTRY_ALIASES: Record<string, string> = {
  us: "United States",
  usa: "United States",
  "u.s.": "United States",
  "u.s.a.": "United States",
  "united states": "United States",
  "united states of america": "United States",
  ca: "Canada",
  can: "Canada",
  canada: "Canada",
  in: "India",
  ind: "India",
  india: "India",
  uk: "United Kingdom",
  gbr: "United Kingdom",
  "united kingdom": "United Kingdom",
  england: "United Kingdom",
  mx: "Mexico",
  mex: "Mexico",
  mexico: "Mexico",
  de: "Germany",
  deu: "Germany",
  germany: "Germany",
  fr: "France",
  fra: "France",
  france: "France",
  au: "Australia",
  aus: "Australia",
  australia: "Australia",
  nz: "New Zealand",
  nzl: "New Zealand",
  "new zealand": "New Zealand",
  ie: "Ireland",
  irl: "Ireland",
  ireland: "Ireland",
  nl: "Netherlands",
  nld: "Netherlands",
  netherlands: "Netherlands",
  es: "Spain",
  esp: "Spain",
  spain: "Spain",
  it: "Italy",
  ita: "Italy",
  italy: "Italy",
  br: "Brazil",
  bra: "Brazil",
  brazil: "Brazil",
  sg: "Singapore",
  sgp: "Singapore",
  singapore: "Singapore",
  jp: "Japan",
  jpn: "Japan",
  japan: "Japan",
  cn: "China",
  chn: "China",
  china: "China",
  ph: "Philippines",
  phl: "Philippines",
  philippines: "Philippines",
  pl: "Poland",
  pol: "Poland",
  poland: "Poland",
  cr: "Costa Rica",
  cri: "Costa Rica",
  "costa rica": "Costa Rica",
  ar: "Argentina",
  arg: "Argentina",
  argentina: "Argentina",
  "u.k.": "United Kingdom",
  "u.k": "United Kingdom",
};

/** ISO country codes that also collide with USPS state codes. */
export const AMBIGUOUS_US_STATE_COUNTRY_CODES = new Set([
  "CA", // California / Canada
  "DE", // Delaware / Germany
  "GA", // Georgia / Gabon (unused) — also country name Georgia
  "IN", // Indiana / India
  "AL", // Alabama / Albania
  "AR", // Arkansas / Argentina
  "CO", // Colorado / Colombia
  "ID", // Idaho / Indonesia
  "LA", // Louisiana / Laos
  "MA", // Massachusetts / Morocco
  "MD", // Maryland / Moldova
  "ME", // Maine / Montenegro
  "MT", // Montana / Malta
  "PA", // Pennsylvania / Panama
  "SC", // South Carolina / Seychelles
]);

export const US_STATE_NAMES = new Set([
  "alabama",
  "alaska",
  "arizona",
  "arkansas",
  "california",
  "colorado",
  "connecticut",
  "delaware",
  "florida",
  "georgia",
  "hawaii",
  "idaho",
  "illinois",
  "indiana",
  "iowa",
  "kansas",
  "kentucky",
  "louisiana",
  "maine",
  "maryland",
  "massachusetts",
  "michigan",
  "minnesota",
  "mississippi",
  "missouri",
  "montana",
  "nebraska",
  "nevada",
  "new hampshire",
  "new jersey",
  "new mexico",
  "new york",
  "north carolina",
  "north dakota",
  "ohio",
  "oklahoma",
  "oregon",
  "pennsylvania",
  "rhode island",
  "south carolina",
  "south dakota",
  "tennessee",
  "texas",
  "utah",
  "vermont",
  "virginia",
  "washington",
  "west virginia",
  "wisconsin",
  "wyoming",
  "district of columbia",
]);

export const US_STATE_CODES = new Set([
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
]);

export const CA_PROVINCE_CODES = new Set([
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
]);

export const CA_PROVINCE_NAMES = new Set([
  "alberta",
  "british columbia",
  "manitoba",
  "new brunswick",
  "newfoundland and labrador",
  "nova scotia",
  "ontario",
  "prince edward island",
  "quebec",
  "saskatchewan",
]);

export const INDIAN_STATE_NAMES = new Set([
  "andhra pradesh",
  "arunachal pradesh",
  "assam",
  "bihar",
  "chhattisgarh",
  "goa",
  "gujarat",
  "haryana",
  "himachal pradesh",
  "jharkhand",
  "karnataka",
  "kerala",
  "madhya pradesh",
  "maharashtra",
  "manipur",
  "meghalaya",
  "mizoram",
  "nagaland",
  "odisha",
  "punjab",
  "rajasthan",
  "sikkim",
  "tamil nadu",
  "telangana",
  "tripura",
  "uttar pradesh",
  "uttarakhand",
  "west bengal",
  "delhi",
]);

export const CITY_TO_COUNTRY: Record<string, string> = {
  atlanta: "United States",
  austin: "United States",
  baltimore: "United States",
  boston: "United States",
  charlotte: "United States",
  chicago: "United States",
  columbus: "United States",
  dallas: "United States",
  denver: "United States",
  detroit: "United States",
  houston: "United States",
  indianapolis: "United States",
  "kansas city": "United States",
  "los angeles": "United States",
  mclean: "United States",
  miami: "United States",
  minneapolis: "United States",
  nashville: "United States",
  philadelphia: "United States",
  phoenix: "United States",
  "portland": "United States",
  raleigh: "United States",
  richmond: "United States",
  sacramento: "United States",
  "salt lake city": "United States",
  "san antonio": "United States",
  "san diego": "United States",
  "san francisco": "United States",
  "san jose": "United States",
  seattle: "United States",
  "silicon valley": "United States",
  "st. louis": "United States",
  "st louis": "United States",
  "washington": "United States",
  wilmington: "United States",
  plano: "United States",
  brooklyn: "United States",
  cambridge: "United States",
  "new york": "United States",
  bengaluru: "India",
  bangalore: "India",
  mumbai: "India",
  delhi: "India",
  hyderabad: "India",
  chennai: "India",
  pune: "India",
  noida: "India",
  gurgaon: "India",
  gurugram: "India",
  toronto: "Canada",
  vancouver: "Canada",
  montreal: "Canada",
  montréal: "Canada",
  calgary: "Canada",
  edmonton: "Canada",
  ottawa: "Canada",
  winnipeg: "Canada",
  halifax: "Canada",
  "quebec city": "Canada",
  québec: "Canada",
  burnaby: "Canada",
  mississauga: "Canada",
  waterloo: "Canada",
  "mexico city": "Mexico",
  "buenos aires": "Argentina",
  london: "United Kingdom",
  singapore: "Singapore",
  berlin: "Germany",
  düsseldorf: "Germany",
  dusseldorf: "Germany",
  frankfurt: "Germany",
  hamburg: "Germany",
  munich: "Germany",
  münchen: "Germany",
  auckland: "New Zealand",
  wellington: "New Zealand",
  christchurch: "New Zealand",
  melbourne: "Australia",
  sydney: "Australia",
  canberra: "Australia",
  brisbane: "Australia",
  perth: "Australia",
  "hong kong": "China",
  tokyo: "Japan",
  paris: "France",
  amsterdam: "Netherlands",
  dublin: "Ireland",
  madrid: "Spain",
  rome: "Italy",
  "são paulo": "Brazil",
  "sao paulo": "Brazil",
};

export const CONTINENT_COUNTRIES: Record<string, string[]> = {
  "North America": ["United States", "Canada", "Mexico", "Costa Rica"],
  Europe: [
    "United Kingdom",
    "Germany",
    "France",
    "Ireland",
    "Netherlands",
    "Spain",
    "Italy",
    "Poland",
  ],
  Asia: ["India", "China", "Japan", "Singapore", "Philippines"],
  Oceania: ["Australia", "New Zealand"],
  "South America": ["Brazil", "Argentina"],
};

export function countryToContinent(country: string): string | undefined {
  for (const [continent, countries] of Object.entries(CONTINENT_COUNTRIES)) {
    if (countries.includes(country)) {
      return continent;
    }
  }
  return undefined;
}

export function normalizeCountryName(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const lower = trimmed.toLowerCase();
  if (COUNTRY_ALIASES[lower]) {
    return COUNTRY_ALIASES[lower];
  }

  for (const country of Object.values(COUNTRY_ALIASES)) {
    if (country.toLowerCase() === lower) {
      return country;
    }
  }

  return undefined;
}

export function normalizeContinentName(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const lower = trimmed.toLowerCase();
  for (const continent of Object.keys(CONTINENT_COUNTRIES)) {
    if (continent.toLowerCase() === lower) {
      return continent;
    }
  }

  return undefined;
}
