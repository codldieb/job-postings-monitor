import type { JobPosting, ResumeProfile } from "@/lib/types";
import {
  CA_PROVINCE_CODES,
  CA_PROVINCE_NAMES,
  CITY_TO_COUNTRY,
  INDIAN_STATE_NAMES,
  US_STATE_CODES,
  US_STATE_NAMES,
  countryToContinent,
  normalizeContinentName,
  normalizeCountryName,
} from "./location-data";

export interface ParsedLocation {
  raw: string;
  country?: string;
  continent?: string;
  isRemote?: boolean;
}

export interface LocationMatchResult {
  inTarget: boolean | undefined;
  note: string;
  location?: string;
}

const REMOTE_ONLY_PATTERN =
  /^(?:remote|#li-remote|#remote|hybrid remote|fully remote|100% remote)$/i;

function parseLocationSegment(segment: string): ParsedLocation | null {
  const raw = segment.trim().replace(/\s+/g, " ");
  if (!raw || raw.length < 2) return null;

  if (REMOTE_ONLY_PATTERN.test(raw)) {
    return { raw, isRemote: true };
  }

  const anywhereMatch = raw.match(
    /\banywhere in (Canada|the United States|the US|United States)\b/i
  );
  if (anywhereMatch) {
    const country =
      normalizeCountryName(anywhereMatch[1].replace(/^the\s+/i, "")) ??
      "Canada";
    return {
      raw,
      country,
      continent: countryToContinent(country),
      isRemote: true,
    };
  }

  const parts = raw.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return { raw };

  const lastPart = parts[parts.length - 1]
    .replace(/\s+\d[\dA-Z -]{2,}$/i, "")
    .trim();
  const secondLast = parts.length >= 2 ? parts[parts.length - 2].trim() : "";

  const countryFromLast = normalizeCountryName(lastPart);
  if (countryFromLast) {
    return {
      raw,
      country: countryFromLast,
      continent: countryToContinent(countryFromLast),
    };
  }

  if (US_STATE_CODES.has(lastPart.toUpperCase())) {
    return {
      raw,
      country: "United States",
      continent: countryToContinent("United States"),
    };
  }

  if (CA_PROVINCE_CODES.has(lastPart.toUpperCase())) {
    return {
      raw,
      country: "Canada",
      continent: countryToContinent("Canada"),
    };
  }

  const stateLower = lastPart.toLowerCase();
  if (US_STATE_NAMES.has(stateLower)) {
    return {
      raw,
      country: "United States",
      continent: countryToContinent("United States"),
    };
  }

  if (CA_PROVINCE_NAMES.has(stateLower)) {
    return {
      raw,
      country: "Canada",
      continent: countryToContinent("Canada"),
    };
  }

  if (INDIAN_STATE_NAMES.has(stateLower)) {
    return {
      raw,
      country: "India",
      continent: countryToContinent("India"),
    };
  }

  if (
    normalizeCountryName(secondLast) &&
    CA_PROVINCE_CODES.has(lastPart.toUpperCase())
  ) {
    return {
      raw,
      country: "Canada",
      continent: countryToContinent("Canada"),
    };
  }

  const cityKey = parts[0].toLowerCase();
  const countryFromCity = CITY_TO_COUNTRY[cityKey];
  if (countryFromCity) {
    return {
      raw,
      country: countryFromCity,
      continent: countryToContinent(countryFromCity),
    };
  }

  for (const part of parts) {
    const countryFromPart = CITY_TO_COUNTRY[part.toLowerCase()];
    if (countryFromPart) {
      return {
        raw,
        country: countryFromPart,
        continent: countryToContinent(countryFromPart),
      };
    }
  }

  return { raw };
}

function formatCityLabel(cityKey: string): string {
  return cityKey
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function extractLocationFromUrl(url: string): string[] {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\/job\/([a-z0-9-]+)\//i);
    if (!match) return [];

    const slug = match[1].toLowerCase();
    const asWords = slug.replace(/-/g, " ");

    if (CITY_TO_COUNTRY[asWords]) {
      return [formatCityLabel(asWords)];
    }

    if (CITY_TO_COUNTRY[slug]) {
      return [formatCityLabel(slug)];
    }
  } catch {
    // ignore invalid URLs
  }

  return [];
}

function extractTrailingLocation(text: string): string | undefined {
  const match = text.match(
    /\b([A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*)*,\s*[A-Za-z .'-]+)\s*$/
  );
  return match?.[1]?.trim();
}

function extractLocationFromTitle(title: string): string[] {
  const results: string[] = [];
  const withoutPrefix = title.replace(/^\d+\s+\d{2}\/\d{2}\/\d{4}\s+/, "").trim();

  for (const segment of withoutPrefix.split("|")) {
    const trailing = extractTrailingLocation(segment.trim());
    if (trailing) {
      results.push(trailing);
    }
  }

  const lowerTitle = withoutPrefix.toLowerCase();
  for (const city of Object.keys(CITY_TO_COUNTRY)) {
    const pattern = new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(lowerTitle)) {
      results.push(formatCityLabel(city));
    }
  }

  return [...new Set(results)];
}

function addParsedLocation(
  parsed: ParsedLocation[],
  seen: Set<string>,
  segment: string
) {
  const result = parseLocationSegment(segment);
  if (result && !seen.has(result.raw)) {
    seen.add(result.raw);
    parsed.push(result);
  }
}

function splitMultiLocations(block: string): string[] {
  const trimmed = block.trim();
  if (!trimmed) return [];

  const segments = trimmed
    .split(
      /\s(?=[A-Z][A-Za-z.'-]+(?:,\s*(?:[A-Z]{2}|AB|BC|ON|QC|MB|SK|NS|NB|NL|PE|YT|NT|NU|Virginia|California|Texas|India|Mexico|Germany|Georgia|Illinois|Ohio|Florida|Colorado|Washington|Arizona|Pennsylvania|Massachusetts|Delaware|Maryland|Missouri|Kansas|Tennessee|Minnesota|Oregon|Utah)))/ 
    )
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 2);

  return segments.length > 0 ? segments : [trimmed];
}

function extractLocationStrings(text: string): string[] {
  const results: string[] = [];

  const locationBlock = text.match(
    /\bLocation:\s*(.+?)(?=\sReq ID:|\sJobs by Category:|\sDescription|\sBusiness Function|\sDate posted|\sRef #|$)/i
  );
  if (locationBlock) {
    results.push(...splitMultiLocations(locationBlock[1]));
  }

  const primaryAddress = text.match(
    /\bPrimary Address\s+([^|]+?)(?:\||\sOverview|\sPin job|$)/i
  );
  if (primaryAddress) {
    results.push(...splitMultiLocations(primaryAddress[1]));
  }

  const slalomLocations = text.match(
    /\bLocations?\s+([A-Za-z0-9 ,./-]+?)(?=\sBusiness Function|\sDate posted|\sRef #|$)/i
  );
  if (slalomLocations) {
    results.push(...splitMultiLocations(slalomLocations[1]));
  }

  const pipeLocations = text.match(
    /\b(?:Primary Address|Pin job Apply)\b[\s\S]{0,160}?\b([A-Z][A-Za-z .,'-]+,\s*(?:Virginia|California|Texas|Illinois|Ohio|Florida|Colorado|Washington|Arizona|Pennsylvania|Georgia|[A-Z]{2}|India|Mexico|Karnataka|Maharashtra))(?:\s*\|\s*([A-Z][A-Za-z .,'-]+,\s*(?:Virginia|California|Texas|Illinois|Ohio|Florida|Colorado|Washington|Arizona|Pennsylvania|Georgia|[A-Z]{2}|India|Mexico|Karnataka|Maharashtra)))*/i
  );
  if (pipeLocations) {
    results.push(
      ...pipeLocations[0]
        .split("|")
        .map((segment) => segment.trim())
        .filter((segment) => segment.includes(","))
    );
  }

  return [...new Set(results.map((value) => value.trim()).filter(Boolean))];
}

export function extractLocationsFromJob(job: JobPosting): ParsedLocation[] {
  const parsed: ParsedLocation[] = [];
  const seen = new Set<string>();

  if (job.location?.trim()) {
    for (const segment of splitMultiLocations(job.location)) {
      addParsedLocation(parsed, seen, segment);
    }
  }

  for (const segment of extractLocationFromUrl(job.url)) {
    addParsedLocation(parsed, seen, segment);
  }

  for (const segment of extractLocationFromTitle(job.title)) {
    addParsedLocation(parsed, seen, segment);
  }

  if (job.descriptionText?.trim()) {
    for (const segment of extractLocationStrings(job.descriptionText)) {
      addParsedLocation(parsed, seen, segment);
    }
  }

  return parsed;
}

export function formatLocationDisplay(locations: ParsedLocation[]): string {
  const labels = locations.map((location) => {
    if (location.country) {
      return location.isRemote
        ? `${location.raw} (${location.country})`
        : location.country;
    }
    return location.raw;
  });

  return [...new Set(labels)].join("; ");
}

function matchesTarget(
  location: ParsedLocation,
  targetCountries: Set<string>,
  targetContinents: Set<string>
): boolean {
  if (!location.country) return false;

  if (targetCountries.has(location.country)) {
    return true;
  }

  if (location.continent && targetContinents.has(location.continent)) {
    return true;
  }

  return false;
}

export function evaluateLocationMatch(
  job: JobPosting,
  profile: ResumeProfile | null
): LocationMatchResult {
  const targetCountries = (profile?.targetCountries ?? [])
    .map(normalizeCountryName)
    .filter((value): value is string => Boolean(value));
  const targetContinents = (profile?.targetContinents ?? [])
    .map(normalizeContinentName)
    .filter((value): value is string => Boolean(value));

  if (targetCountries.length === 0 && targetContinents.length === 0) {
    return {
      inTarget: undefined,
      note: "No location preferences configured",
    };
  }

  const countrySet = new Set(targetCountries);
  const continentSet = new Set(targetContinents);
  const parsed = extractLocationsFromJob(job);
  const location = formatLocationDisplay(parsed);

  if (parsed.length === 0) {
    return {
      inTarget: undefined,
      note: "Could not determine job location",
      location,
    };
  }

  const located = parsed.filter((entry) => entry.country);
  const remoteOnly = parsed.every((entry) => entry.isRemote && !entry.country);

  if (remoteOnly) {
    return {
      inTarget: undefined,
      note: "Remote role with no geographic restriction listed",
      location: location || "Remote",
    };
  }

  if (located.length === 0) {
    return {
      inTarget: undefined,
      note: `Location unclear (${location})`,
      location,
    };
  }

  const inTarget = located.some((entry) =>
    matchesTarget(entry, countrySet, continentSet)
  );
  const countries = [...new Set(located.map((entry) => entry.country!))].join(
    ", "
  );

  if (inTarget) {
    return {
      inTarget: true,
      note: `In target area (${countries})`,
      location: location || countries,
    };
  }

  return {
    inTarget: false,
    note: `Outside target area (${countries})`,
    location: location || countries,
  };
}

export function inferJobLocation(job: JobPosting): string | undefined {
  const parsed = extractLocationsFromJob(job);
  if (parsed.length === 0) return undefined;
  return formatLocationDisplay(parsed);
}
