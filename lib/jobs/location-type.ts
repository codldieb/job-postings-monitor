import type { JobPosting, LocationType } from "@/lib/types";

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

function segmentLooksPhysical(segment: string): boolean {
  const trimmed = segment.trim();
  if (!trimmed || segmentLooksRemoteOnly(trimmed)) return false;
  if (REMOTE_PATTERN.test(trimmed) && !/,\s*[A-Za-z]/.test(trimmed)) {
    return false;
  }

  return (
    /,\s*(?:[A-Z]{2}|[A-Za-z .'-]{2,})\b/.test(trimmed) ||
    US_STATE_CODE.test(trimmed) ||
    /\b(?:United States|United Kingdom|Canada|India|Mexico|Germany|France|Australia)\b/i.test(
      trimmed
    )
  );
}

function hasPhysicalLocation(location: string | undefined): boolean {
  if (!location?.trim()) return false;

  return location
    .split(";")
    .some((segment) => segmentLooksPhysical(segment.trim()));
}

export function inferLocationTypes(
  job: Pick<JobPosting, "location" | "title" | "descriptionText">
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

  if (types.has("Hybrid") && !types.has("Onsite")) {
    types.add("Onsite");
  }

  return [...types];
}

export function formatLocationTypes(types: LocationType[]): string {
  return types.join(", ");
}

export const ALL_LOCATION_TYPES: LocationType[] = ["Remote", "Hybrid", "Onsite"];

export function matchesLocationTypeFilter(
  job: JobPosting,
  selected: Set<LocationType>
): boolean {
  if (selected.size === 0 || selected.size === ALL_LOCATION_TYPES.length) {
    return true;
  }

  const types = job.locationTypes ?? [];
  if (types.length === 0) return false;

  return types.some((type) => selected.has(type));
}
