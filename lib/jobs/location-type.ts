import type { JobPosting, LocationType } from "@/lib/types";
import { extractLocationsFromJob } from "./location";
import {
  CITY_TO_COUNTRY,
  US_STATE_NAMES,
  normalizeCountryName,
} from "./location-data";

const REMOTE_PATTERN =
  /\b(?:remote(?:-first|-only|-friendly)?|fully remote|100% remote|work from home|wfh|anywhere in(?: the)?|#remote|#li-remote)\b/i;

const HYBRID_PATTERN =
  /\bhybrid\b|\b\d+\s+days?\s+(?:per\s+week\s+)?in[- ]office\b|\bpartially remote\b/i;

const ONSITE_PATTERN =
  /\bon[- ]site\b|\bin[- ]person\b|\bin the office\b|\bin-office\b/i;

const US_STATE_CODE = /\b(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/;

function segmentLooksRemoteOnly(segment: string): boolean {
  const trimmed = segment.trim();
  if (!trimmed) return false;
  if (/^remote$/i.test(trimmed)) return true;
  return /^[A-Za-z .'-]+\s+remote$/i.test(trimmed) && !/,/.test(trimmed);
}

function looksLikePlaceName(value: string): boolean {
  const cleaned = value.replace(/\./g, "").trim();
  if (cleaned.length < 2) return false;
  const lower = cleaned.toLowerCase();
  return (
    Boolean(normalizeCountryName(cleaned)) ||
    Boolean(CITY_TO_COUNTRY[lower]) ||
    US_STATE_NAMES.has(lower)
  );
}

function segmentHasKnownCountry(segment: string): boolean {
  const trimmed = segment.trim();
  if (!trimmed) return false;
  // Multi-word countries like "United States" must be checked whole; splitting
  // on spaces turns them into tokens that are not country names.
  if (looksLikePlaceName(trimmed)) return true;

  return trimmed.split(/[\s,;()/|-]+/).some((token) => {
    const cleaned = token.replace(/\./g, "").trim();
    if (cleaned.length < 3) return false;
    return looksLikePlaceName(cleaned);
  });
}

function segmentLooksPhysical(segment: string): boolean {
  const trimmed = segment.trim();
  if (!trimmed || segmentLooksRemoteOnly(trimmed)) return false;
  if (REMOTE_PATTERN.test(trimmed) && !/,\s*[A-Za-z]/.test(trimmed)) {
    return false;
  }

  return (
    /,\s*(?:[A-Z]{2}|[A-Za-z .'-]{2,})\b/.test(trimmed) ||
    US_STATE_CODE.test(trimmed) ||
    segmentHasKnownCountry(trimmed)
  );
}

function hasPhysicalLocation(location: string | undefined): boolean {
  if (!location?.trim()) return false;

  return location
    .split(/[;|]/)
    .some((segment) => segmentLooksPhysical(segment.trim()));
}

export function inferLocationTypes(
  job: Pick<JobPosting, "location" | "title" | "descriptionText" | "url">
): LocationType[] {
  const location = job.location ?? "";
  const title = job.title ?? "";
  const descriptionSample = job.descriptionText?.slice(0, 1500) ?? "";
  const text = `${location} ${title} ${descriptionSample}`;

  const types = new Set<LocationType>();

  if (REMOTE_PATTERN.test(text) || segmentLooksRemoteOnly(location)) {
    types.add("Remote");
  }

  if (HYBRID_PATTERN.test(text)) {
    types.add("Hybrid");
    types.add("Onsite");
  }

  if (ONSITE_PATTERN.test(text)) {
    types.add("Onsite");
  }

  if (hasPhysicalLocation(location)) {
    types.add("Onsite");
  }

  const parsed = extractLocationsFromJob(job);
  if (parsed.some((entry) => entry.country && !entry.isRemote)) {
    types.add("Onsite");
  }

  if (types.has("Hybrid") && !types.has("Onsite")) {
    types.add("Onsite");
  }

  return [...types];
}

export function formatLocationTypes(types: LocationType[]): string {
  return types.join(", ");
}

export const ALL_LOCATION_TYPES: LocationType[] = ["Remote", "Hybrid", "Onsite"];

export function jobLocationTypes(job: JobPosting): LocationType[] {
  const stored = job.locationTypes ?? [];
  if (stored.includes("Onsite")) {
    return stored;
  }

  return [...new Set([...stored, ...inferLocationTypes(job)])];
}

export function matchesLocationTypeFilter(
  job: JobPosting,
  selected: Set<LocationType>
): boolean {
  if (selected.size === 0 || selected.size === ALL_LOCATION_TYPES.length) {
    return true;
  }

  const types = jobLocationTypes(job);
  if (types.length === 0) return false;

  return types.some((type) => selected.has(type));
}
