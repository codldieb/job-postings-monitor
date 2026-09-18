import type { ScrapedJob } from "./types";
import { fetchJson, MAX_JOBS } from "./utils";

const EPIC_GREENHOUSE_BOARD = "epicgames";

interface GreenhouseMetadata {
  name?: string;
  value?: string | string[] | null;
}

interface GreenhouseJob {
  id: number;
  title: string;
  location?: { name: string };
  metadata?: GreenhouseMetadata[];
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
}

export function isEpicGamesCareersUrl(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "");
  return host === "epicgames.com" && /\/careers/i.test(url.pathname);
}

export function parseEpicGamesJobUrl(jobUrl: string): { jobId: string } | null {
  try {
    const url = new URL(jobUrl);
    if (!isEpicGamesCareersUrl(url)) return null;

    const ghJid = url.searchParams.get("gh_jid")?.trim();
    if (ghJid && /^\d+$/.test(ghJid)) return { jobId: ghJid };

    const match = url.pathname.match(/\/jobs\/(\d+)/i);
    return match?.[1] ? { jobId: match[1] } : null;
  } catch {
    return null;
  }
}

function epicGamesJobUrl(jobId: string | number): string {
  return `https://www.epicgames.com/site/careers/jobs/${jobId}`;
}

function metadataValue(
  metadata: GreenhouseMetadata[] | undefined,
  name: string
): string | undefined {
  const entry = metadata?.find(
    (item) => item.name?.trim().toLowerCase() === name.toLowerCase()
  );
  const value = entry?.value;
  if (Array.isArray(value)) {
    const joined = value.map((item) => item.trim()).filter(Boolean).join(", ");
    return joined || undefined;
  }
  return value?.trim() || undefined;
}

function normalizeFilter(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function formatEpicGamesLocation(
  locationName: string | undefined,
  remoteEligible?: string
): string | undefined {
  const parts = (locationName ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && part.toUpperCase() !== "BLANK");

  if (remoteEligible && /^yes$/i.test(remoteEligible)) {
    parts.push("Remote");
  }

  return parts.length > 0 ? [...new Set(parts)].join(", ") : undefined;
}

function matchesFilter(actual: string | undefined, expected?: string): boolean {
  if (!expected) return true;
  return (actual ?? "").trim().toLowerCase() === expected.toLowerCase();
}

function matchesCountry(location: string | undefined, country?: string): boolean {
  if (!country) return true;
  const haystack = (location ?? "").toLowerCase();
  const expected = country.toLowerCase();
  if (haystack.includes(expected)) return true;
  if (expected === "united states") {
    return /\b(?:usa|u\.s\.a?)\b/i.test(haystack);
  }
  return false;
}

function scrapeEpicGamesJobsFromApi(
  jobs: GreenhouseJob[],
  siteUrl: string
): ScrapedJob[] {
  const url = new URL(siteUrl);
  const department = normalizeFilter(url.searchParams.get("department"));
  const country = normalizeFilter(url.searchParams.get("country"));
  const type = normalizeFilter(url.searchParams.get("type"));

  return jobs
    .filter((job) => {
      if (!job.title?.trim() || job.id == null) return false;
      if (
        !matchesFilter(
          metadataValue(job.metadata, "Careers Page Department"),
          department
        )
      ) {
        return false;
      }
      if (
        !matchesFilter(
          metadataValue(job.metadata, "Careers Page Job Type"),
          type
        )
      ) {
        return false;
      }
      if (!matchesCountry(job.location?.name, country)) return false;
      return true;
    })
    .slice(0, MAX_JOBS)
    .map((job) => ({
      title: job.title.trim(),
      url: epicGamesJobUrl(job.id),
      department:
        metadataValue(job.metadata, "Careers Page Department") || undefined,
      location: formatEpicGamesLocation(
        job.location?.name,
        metadataValue(job.metadata, "Careers Page Remote Eligible")
      ),
    }));
}

export async function scrapeEpicGames(siteUrl: string): Promise<ScrapedJob[]> {
  const url = new URL(siteUrl);
  if (!isEpicGamesCareersUrl(url)) return [];

  const data = await fetchJson<GreenhouseResponse>(
    `https://boards-api.greenhouse.io/v1/boards/${EPIC_GREENHOUSE_BOARD}/jobs`
  );

  return scrapeEpicGamesJobsFromApi(data.jobs ?? [], siteUrl);
}
