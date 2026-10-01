/**
 * ISO 3166-1 English names plus alpha-2 / alpha-3 codes.
 * Alpha-2 codes that collide with USPS state codes or common English words
 * are omitted so "IN", "CA", "DE", "IT", "NO", etc. are not misread.
 * Workday-style locations use alpha-3 ("THA", "CHN", "POL"), which are unique.
 */
interface CountryRecord {
  name: string;
  alpha2: string;
  alpha3: string;
  continent: string;
  aliases?: string[];
}

const COUNTRY_RECORDS: CountryRecord[] = [
  // North America (includes Central America and the Caribbean)
  { name: "United States", alpha2: "US", alpha3: "USA", continent: "North America", aliases: ["united states of america", "u.s.", "u.s.a."] },
  { name: "Canada", alpha2: "CA", alpha3: "CAN", continent: "North America" },
  { name: "Mexico", alpha2: "MX", alpha3: "MEX", continent: "North America" },
  { name: "Guatemala", alpha2: "GT", alpha3: "GTM", continent: "North America" },
  { name: "Belize", alpha2: "BZ", alpha3: "BLZ", continent: "North America" },
  { name: "El Salvador", alpha2: "SV", alpha3: "SLV", continent: "North America" },
  { name: "Honduras", alpha2: "HN", alpha3: "HND", continent: "North America" },
  { name: "Nicaragua", alpha2: "NI", alpha3: "NIC", continent: "North America" },
  { name: "Costa Rica", alpha2: "CR", alpha3: "CRI", continent: "North America" },
  { name: "Panama", alpha2: "PA", alpha3: "PAN", continent: "North America" },
  { name: "Cuba", alpha2: "CU", alpha3: "CUB", continent: "North America" },
  { name: "Jamaica", alpha2: "JM", alpha3: "JAM", continent: "North America" },
  { name: "Haiti", alpha2: "HT", alpha3: "HTI", continent: "North America" },
  { name: "Dominican Republic", alpha2: "DO", alpha3: "DOM", continent: "North America" },
  { name: "Bahamas", alpha2: "BS", alpha3: "BHS", continent: "North America", aliases: ["the bahamas"] },
  { name: "Barbados", alpha2: "BB", alpha3: "BRB", continent: "North America" },
  { name: "Trinidad and Tobago", alpha2: "TT", alpha3: "TTO", continent: "North America" },
  { name: "Puerto Rico", alpha2: "PR", alpha3: "PRI", continent: "North America" },
  { name: "Greenland", alpha2: "GL", alpha3: "GRL", continent: "North America" },
  { name: "Bermuda", alpha2: "BM", alpha3: "BMU", continent: "North America" },
  { name: "Cayman Islands", alpha2: "KY", alpha3: "CYM", continent: "North America" },

  // South America
  { name: "Brazil", alpha2: "BR", alpha3: "BRA", continent: "South America" },
  { name: "Argentina", alpha2: "AR", alpha3: "ARG", continent: "South America" },
  { name: "Chile", alpha2: "CL", alpha3: "CHL", continent: "South America" },
  { name: "Colombia", alpha2: "CO", alpha3: "COL", continent: "South America" },
  { name: "Peru", alpha2: "PE", alpha3: "PER", continent: "South America" },
  { name: "Venezuela", alpha2: "VE", alpha3: "VEN", continent: "South America" },
  { name: "Ecuador", alpha2: "EC", alpha3: "ECU", continent: "South America" },
  { name: "Bolivia", alpha2: "BO", alpha3: "BOL", continent: "South America" },
  { name: "Paraguay", alpha2: "PY", alpha3: "PRY", continent: "South America" },
  { name: "Uruguay", alpha2: "UY", alpha3: "URY", continent: "South America" },
  { name: "Guyana", alpha2: "GY", alpha3: "GUY", continent: "South America" },
  { name: "Suriname", alpha2: "SR", alpha3: "SUR", continent: "South America" },

  // Europe
  { name: "United Kingdom", alpha2: "GB", alpha3: "GBR", continent: "Europe", aliases: ["uk", "u.k.", "u.k", "england", "scotland", "wales", "britain", "great britain"] },
  { name: "Ireland", alpha2: "IE", alpha3: "IRL", continent: "Europe" },
  { name: "France", alpha2: "FR", alpha3: "FRA", continent: "Europe" },
  { name: "Germany", alpha2: "DE", alpha3: "DEU", continent: "Europe", aliases: ["deutschland"] },
  { name: "Netherlands", alpha2: "NL", alpha3: "NLD", continent: "Europe", aliases: ["holland"] },
  { name: "Belgium", alpha2: "BE", alpha3: "BEL", continent: "Europe" },
  { name: "Luxembourg", alpha2: "LU", alpha3: "LUX", continent: "Europe" },
  { name: "Switzerland", alpha2: "CH", alpha3: "CHE", continent: "Europe" },
  { name: "Austria", alpha2: "AT", alpha3: "AUT", continent: "Europe" },
  { name: "Liechtenstein", alpha2: "LI", alpha3: "LIE", continent: "Europe" },
  { name: "Monaco", alpha2: "MC", alpha3: "MCO", continent: "Europe" },
  { name: "Spain", alpha2: "ES", alpha3: "ESP", continent: "Europe" },
  { name: "Portugal", alpha2: "PT", alpha3: "PRT", continent: "Europe" },
  { name: "Andorra", alpha2: "AD", alpha3: "AND", continent: "Europe" },
  { name: "Italy", alpha2: "IT", alpha3: "ITA", continent: "Europe" },
  { name: "Vatican City", alpha2: "VA", alpha3: "VAT", continent: "Europe", aliases: ["holy see"] },
  { name: "San Marino", alpha2: "SM", alpha3: "SMR", continent: "Europe" },
  { name: "Malta", alpha2: "MT", alpha3: "MLT", continent: "Europe" },
  { name: "Greece", alpha2: "GR", alpha3: "GRC", continent: "Europe" },
  { name: "Cyprus", alpha2: "CY", alpha3: "CYP", continent: "Europe" },
  { name: "Poland", alpha2: "PL", alpha3: "POL", continent: "Europe" },
  { name: "Czechia", alpha2: "CZ", alpha3: "CZE", continent: "Europe", aliases: ["czech republic"] },
  { name: "Slovakia", alpha2: "SK", alpha3: "SVK", continent: "Europe" },
  { name: "Hungary", alpha2: "HU", alpha3: "HUN", continent: "Europe" },
  { name: "Slovenia", alpha2: "SI", alpha3: "SVN", continent: "Europe" },
  { name: "Croatia", alpha2: "HR", alpha3: "HRV", continent: "Europe" },
  { name: "Bosnia and Herzegovina", alpha2: "BA", alpha3: "BIH", continent: "Europe", aliases: ["bosnia"] },
  { name: "Serbia", alpha2: "RS", alpha3: "SRB", continent: "Europe" },
  { name: "Montenegro", alpha2: "ME", alpha3: "MNE", continent: "Europe" },
  { name: "North Macedonia", alpha2: "MK", alpha3: "MKD", continent: "Europe", aliases: ["macedonia"] },
  { name: "Albania", alpha2: "AL", alpha3: "ALB", continent: "Europe" },
  { name: "Kosovo", alpha2: "XK", alpha3: "XKX", continent: "Europe" },
  { name: "Romania", alpha2: "RO", alpha3: "ROU", continent: "Europe" },
  { name: "Bulgaria", alpha2: "BG", alpha3: "BGR", continent: "Europe" },
  { name: "Moldova", alpha2: "MD", alpha3: "MDA", continent: "Europe" },
  { name: "Ukraine", alpha2: "UA", alpha3: "UKR", continent: "Europe" },
  { name: "Belarus", alpha2: "BY", alpha3: "BLR", continent: "Europe" },
  { name: "Lithuania", alpha2: "LT", alpha3: "LTU", continent: "Europe" },
  { name: "Latvia", alpha2: "LV", alpha3: "LVA", continent: "Europe" },
  { name: "Estonia", alpha2: "EE", alpha3: "EST", continent: "Europe" },
  { name: "Finland", alpha2: "FI", alpha3: "FIN", continent: "Europe" },
  { name: "Sweden", alpha2: "SE", alpha3: "SWE", continent: "Europe" },
  { name: "Norway", alpha2: "NO", alpha3: "NOR", continent: "Europe" },
  { name: "Denmark", alpha2: "DK", alpha3: "DNK", continent: "Europe" },
  { name: "Iceland", alpha2: "IS", alpha3: "ISL", continent: "Europe" },
  { name: "Russia", alpha2: "RU", alpha3: "RUS", continent: "Europe", aliases: ["russian federation"] },

  // Asia
  { name: "China", alpha2: "CN", alpha3: "CHN", continent: "Asia" },
  { name: "Taiwan", alpha2: "TW", alpha3: "TWN", continent: "Asia" },
  { name: "Hong Kong", alpha2: "HK", alpha3: "HKG", continent: "Asia" },
  { name: "Macau", alpha2: "MO", alpha3: "MAC", continent: "Asia", aliases: ["macao"] },
  { name: "Japan", alpha2: "JP", alpha3: "JPN", continent: "Asia" },
  { name: "South Korea", alpha2: "KR", alpha3: "KOR", continent: "Asia", aliases: ["korea", "republic of korea"] },
  { name: "North Korea", alpha2: "KP", alpha3: "PRK", continent: "Asia" },
  { name: "Mongolia", alpha2: "MN", alpha3: "MNG", continent: "Asia" },
  { name: "India", alpha2: "IN", alpha3: "IND", continent: "Asia" },
  { name: "Pakistan", alpha2: "PK", alpha3: "PAK", continent: "Asia" },
  { name: "Bangladesh", alpha2: "BD", alpha3: "BGD", continent: "Asia" },
  { name: "Sri Lanka", alpha2: "LK", alpha3: "LKA", continent: "Asia" },
  { name: "Nepal", alpha2: "NP", alpha3: "NPL", continent: "Asia" },
  { name: "Bhutan", alpha2: "BT", alpha3: "BTN", continent: "Asia" },
  { name: "Maldives", alpha2: "MV", alpha3: "MDV", continent: "Asia" },
  { name: "Afghanistan", alpha2: "AF", alpha3: "AFG", continent: "Asia" },
  { name: "Iran", alpha2: "IR", alpha3: "IRN", continent: "Asia" },
  { name: "Iraq", alpha2: "IQ", alpha3: "IRQ", continent: "Asia" },
  { name: "Syria", alpha2: "SY", alpha3: "SYR", continent: "Asia" },
  { name: "Lebanon", alpha2: "LB", alpha3: "LBN", continent: "Asia" },
  { name: "Jordan", alpha2: "JO", alpha3: "JOR", continent: "Asia" },
  { name: "Israel", alpha2: "IL", alpha3: "ISR", continent: "Asia" },
  { name: "Palestine", alpha2: "PS", alpha3: "PSE", continent: "Asia" },
  { name: "Saudi Arabia", alpha2: "SA", alpha3: "SAU", continent: "Asia" },
  { name: "Yemen", alpha2: "YE", alpha3: "YEM", continent: "Asia" },
  { name: "Oman", alpha2: "OM", alpha3: "OMN", continent: "Asia" },
  { name: "United Arab Emirates", alpha2: "AE", alpha3: "ARE", continent: "Asia", aliases: ["uae"] },
  { name: "Qatar", alpha2: "QA", alpha3: "QAT", continent: "Asia" },
  { name: "Kuwait", alpha2: "KW", alpha3: "KWT", continent: "Asia" },
  { name: "Bahrain", alpha2: "BH", alpha3: "BHR", continent: "Asia" },
  { name: "Turkey", alpha2: "TR", alpha3: "TUR", continent: "Asia", aliases: ["türkiye", "turkiye"] },
  { name: "Georgia", alpha2: "GE", alpha3: "GEO", continent: "Asia" },
  { name: "Armenia", alpha2: "AM", alpha3: "ARM", continent: "Asia" },
  { name: "Azerbaijan", alpha2: "AZ", alpha3: "AZE", continent: "Asia" },
  { name: "Kazakhstan", alpha2: "KZ", alpha3: "KAZ", continent: "Asia" },
  { name: "Uzbekistan", alpha2: "UZ", alpha3: "UZB", continent: "Asia" },
  { name: "Turkmenistan", alpha2: "TM", alpha3: "TKM", continent: "Asia" },
  { name: "Kyrgyzstan", alpha2: "KG", alpha3: "KGZ", continent: "Asia" },
  { name: "Tajikistan", alpha2: "TJ", alpha3: "TJK", continent: "Asia" },
  { name: "Thailand", alpha2: "TH", alpha3: "THA", continent: "Asia" },
  { name: "Vietnam", alpha2: "VN", alpha3: "VNM", continent: "Asia", aliases: ["viet nam"] },
  { name: "Cambodia", alpha2: "KH", alpha3: "KHM", continent: "Asia" },
  { name: "Laos", alpha2: "LA", alpha3: "LAO", continent: "Asia" },
  { name: "Myanmar", alpha2: "MM", alpha3: "MMR", continent: "Asia", aliases: ["burma"] },
  { name: "Malaysia", alpha2: "MY", alpha3: "MYS", continent: "Asia" },
  { name: "Singapore", alpha2: "SG", alpha3: "SGP", continent: "Asia" },
  { name: "Indonesia", alpha2: "ID", alpha3: "IDN", continent: "Asia" },
  { name: "Philippines", alpha2: "PH", alpha3: "PHL", continent: "Asia" },
  { name: "Brunei", alpha2: "BN", alpha3: "BRN", continent: "Asia" },
  { name: "Timor-Leste", alpha2: "TL", alpha3: "TLS", continent: "Asia", aliases: ["east timor"] },

  // Africa
  { name: "Egypt", alpha2: "EG", alpha3: "EGY", continent: "Africa" },
  { name: "Libya", alpha2: "LY", alpha3: "LBY", continent: "Africa" },
  { name: "Tunisia", alpha2: "TN", alpha3: "TUN", continent: "Africa" },
  { name: "Algeria", alpha2: "DZ", alpha3: "DZA", continent: "Africa" },
  { name: "Morocco", alpha2: "MA", alpha3: "MAR", continent: "Africa" },
  { name: "Sudan", alpha2: "SD", alpha3: "SDN", continent: "Africa" },
  { name: "South Sudan", alpha2: "SS", alpha3: "SSD", continent: "Africa" },
  { name: "Ethiopia", alpha2: "ET", alpha3: "ETH", continent: "Africa" },
  { name: "Eritrea", alpha2: "ER", alpha3: "ERI", continent: "Africa" },
  { name: "Djibouti", alpha2: "DJ", alpha3: "DJI", continent: "Africa" },
  { name: "Somalia", alpha2: "SO", alpha3: "SOM", continent: "Africa" },
  { name: "Kenya", alpha2: "KE", alpha3: "KEN", continent: "Africa" },
  { name: "Uganda", alpha2: "UG", alpha3: "UGA", continent: "Africa" },
  { name: "Tanzania", alpha2: "TZ", alpha3: "TZA", continent: "Africa" },
  { name: "Rwanda", alpha2: "RW", alpha3: "RWA", continent: "Africa" },
  { name: "Burundi", alpha2: "BI", alpha3: "BDI", continent: "Africa" },
  { name: "South Africa", alpha2: "ZA", alpha3: "ZAF", continent: "Africa" },
  { name: "Namibia", alpha2: "NA", alpha3: "NAM", continent: "Africa" },
  { name: "Botswana", alpha2: "BW", alpha3: "BWA", continent: "Africa" },
  { name: "Zimbabwe", alpha2: "ZW", alpha3: "ZWE", continent: "Africa" },
  { name: "Zambia", alpha2: "ZM", alpha3: "ZMB", continent: "Africa" },
  { name: "Malawi", alpha2: "MW", alpha3: "MWI", continent: "Africa" },
  { name: "Mozambique", alpha2: "MZ", alpha3: "MOZ", continent: "Africa" },
  { name: "Angola", alpha2: "AO", alpha3: "AGO", continent: "Africa" },
  { name: "Madagascar", alpha2: "MG", alpha3: "MDG", continent: "Africa" },
  { name: "Mauritius", alpha2: "MU", alpha3: "MUS", continent: "Africa" },
  { name: "Seychelles", alpha2: "SC", alpha3: "SYC", continent: "Africa" },
  { name: "Comoros", alpha2: "KM", alpha3: "COM", continent: "Africa" },
  { name: "Nigeria", alpha2: "NG", alpha3: "NGA", continent: "Africa" },
  { name: "Ghana", alpha2: "GH", alpha3: "GHA", continent: "Africa" },
  { name: "Côte d'Ivoire", alpha2: "CI", alpha3: "CIV", continent: "Africa", aliases: ["ivory coast", "cote d'ivoire", "cote divoire"] },
  { name: "Senegal", alpha2: "SN", alpha3: "SEN", continent: "Africa" },
  { name: "Mali", alpha2: "ML", alpha3: "MLI", continent: "Africa" },
  { name: "Burkina Faso", alpha2: "BF", alpha3: "BFA", continent: "Africa" },
  { name: "Niger", alpha2: "NE", alpha3: "NER", continent: "Africa" },
  { name: "Chad", alpha2: "TD", alpha3: "TCD", continent: "Africa" },
  { name: "Cameroon", alpha2: "CM", alpha3: "CMR", continent: "Africa" },
  { name: "Gabon", alpha2: "GA", alpha3: "GAB", continent: "Africa" },
  { name: "Republic of the Congo", alpha2: "CG", alpha3: "COG", continent: "Africa", aliases: ["congo"] },
  { name: "Democratic Republic of the Congo", alpha2: "CD", alpha3: "COD", continent: "Africa", aliases: ["drc"] },
  { name: "Central African Republic", alpha2: "CF", alpha3: "CAF", continent: "Africa" },
  { name: "Equatorial Guinea", alpha2: "GQ", alpha3: "GNQ", continent: "Africa" },
  { name: "Benin", alpha2: "BJ", alpha3: "BEN", continent: "Africa" },
  { name: "Togo", alpha2: "TG", alpha3: "TGO", continent: "Africa" },
  { name: "Sierra Leone", alpha2: "SL", alpha3: "SLE", continent: "Africa" },
  { name: "Liberia", alpha2: "LR", alpha3: "LBR", continent: "Africa" },
  { name: "Guinea", alpha2: "GN", alpha3: "GIN", continent: "Africa" },
  { name: "Guinea-Bissau", alpha2: "GW", alpha3: "GNB", continent: "Africa" },
  { name: "Gambia", alpha2: "GM", alpha3: "GMB", continent: "Africa" },
  { name: "Mauritania", alpha2: "MR", alpha3: "MRT", continent: "Africa" },
  { name: "Cape Verde", alpha2: "CV", alpha3: "CPV", continent: "Africa", aliases: ["cabo verde"] },
  { name: "São Tomé and Príncipe", alpha2: "ST", alpha3: "STP", continent: "Africa", aliases: ["sao tome and principe"] },
  { name: "Lesotho", alpha2: "LS", alpha3: "LSO", continent: "Africa" },
  { name: "Eswatini", alpha2: "SZ", alpha3: "SWZ", continent: "Africa", aliases: ["swaziland"] },

  // Oceania
  { name: "Australia", alpha2: "AU", alpha3: "AUS", continent: "Oceania" },
  { name: "New Zealand", alpha2: "NZ", alpha3: "NZL", continent: "Oceania" },
  { name: "Papua New Guinea", alpha2: "PG", alpha3: "PNG", continent: "Oceania" },
  { name: "Fiji", alpha2: "FJ", alpha3: "FJI", continent: "Oceania" },
  { name: "Solomon Islands", alpha2: "SB", alpha3: "SLB", continent: "Oceania" },
  { name: "Vanuatu", alpha2: "VU", alpha3: "VUT", continent: "Oceania" },
  { name: "Samoa", alpha2: "WS", alpha3: "WSM", continent: "Oceania" },
  { name: "Tonga", alpha2: "TO", alpha3: "TON", continent: "Oceania" },
  { name: "Kiribati", alpha2: "KI", alpha3: "KIR", continent: "Oceania" },
  { name: "Micronesia", alpha2: "FM", alpha3: "FSM", continent: "Oceania" },
  { name: "Marshall Islands", alpha2: "MH", alpha3: "MHL", continent: "Oceania" },
  { name: "Palau", alpha2: "PW", alpha3: "PLW", continent: "Oceania" },
  { name: "Nauru", alpha2: "NR", alpha3: "NRU", continent: "Oceania" },
  { name: "Tuvalu", alpha2: "TV", alpha3: "TUV", continent: "Oceania" },
];

/** ISO alpha-2 codes that also collide with USPS state codes. */
export const AMBIGUOUS_US_STATE_COUNTRY_CODES = new Set([
  "AL", // Alabama / Albania
  "AR", // Arkansas / Argentina
  "CA", // California / Canada
  "CO", // Colorado / Colombia
  "DE", // Delaware / Germany
  "GA", // Georgia (state) / Gabon
  "ID", // Idaho / Indonesia
  "IN", // Indiana / India
  "LA", // Louisiana / Laos
  "MA", // Massachusetts / Morocco
  "MD", // Maryland / Moldova
  "ME", // Maine / Montenegro
  "MN", // Minnesota / Mongolia
  "MO", // Missouri / Macau
  "MS", // Mississippi / Montserrat
  "MT", // Montana / Malta
  "NE", // Nebraska / Niger
  "PA", // Pennsylvania / Panama
  "SC", // South Carolina / Seychelles
  "VA", // Virginia / Vatican
]);

/** Two-letter tokens that are too ambiguous to treat as countries. */
const SKIP_ALPHA2 = new Set([
  ...AMBIGUOUS_US_STATE_COUNTRY_CODES,
  "AK",
  "AZ",
  "CT",
  "FL",
  "HI",
  "IL",
  "IA",
  "KS",
  "KY",
  "MI",
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
  "RI",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
  // Common English words / overly short tokens
  "AM",
  "AS",
  "AT",
  "BE",
  "BY",
  "DO",
  "IS",
  "IT",
  "MY",
  "NO",
  "SO",
  "TO",
]);

function addAlias(
  aliases: Record<string, string>,
  key: string,
  name: string
) {
  const normalized = key.trim().toLowerCase();
  if (!normalized) return;
  aliases[normalized] = name;
}

function buildCountryAliases(): Record<string, string> {
  const aliases: Record<string, string> = {};

  for (const country of COUNTRY_RECORDS) {
    addAlias(aliases, country.name, country.name);
    addAlias(aliases, country.alpha3, country.name);
    if (!SKIP_ALPHA2.has(country.alpha2.toUpperCase())) {
      addAlias(aliases, country.alpha2, country.name);
    }
    for (const alias of country.aliases ?? []) {
      addAlias(aliases, alias, country.name);
    }
  }

  return aliases;
}

function buildContinentCountries(): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const country of COUNTRY_RECORDS) {
    if (!result[country.continent]) {
      result[country.continent] = [];
    }
    if (!result[country.continent].includes(country.name)) {
      result[country.continent].push(country.name);
    }
  }

  return result;
}

function buildCountryToContinent(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const country of COUNTRY_RECORDS) {
    result[country.name] = country.continent;
  }
  return result;
}

export const COUNTRY_ALIASES = buildCountryAliases();
export const CONTINENT_COUNTRIES = buildContinentCountries();
const COUNTRY_TO_CONTINENT = buildCountryToContinent();

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
  portland: "United States",
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
  washington: "United States",
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
  "hong kong": "Hong Kong",
  tokyo: "Japan",
  paris: "France",
  amsterdam: "Netherlands",
  dublin: "Ireland",
  madrid: "Spain",
  rome: "Italy",
  "são paulo": "Brazil",
  "sao paulo": "Brazil",
  towson: "United States",
  idstein: "Germany",
  giessen: "Germany",
  gießen: "Germany",
  taichung: "Taiwan",
  suzhou: "China",
  warsaw: "Poland",
  "bang pakong": "Thailand",
  chachoengsao: "Thailand",
  lisbon: "Portugal",
  apodaca: "Mexico",
  "highland heights": "United States",
  "valley city": "United States",
  elyria: "United States",
  "farmers branch": "United States",
};

export function countryToContinent(country: string): string | undefined {
  return COUNTRY_TO_CONTINENT[country];
}

export function normalizeCountryName(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  return COUNTRY_ALIASES[trimmed.toLowerCase()];
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
