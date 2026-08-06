import type { ScrapedJob } from "./types";
import { FETCH_TIMEOUT_MS, MAX_JOBS, USER_AGENT } from "./utils";

interface HarriSearchHit {
  id?: number | string;
  title?: string;
  position_name?: string;
  brand_name?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
    formatted_address?: string;
  };
  job_url?: string;
  absolute_url?: string;
}

interface HarriSearchResponse {
  data?: {
    hits?: number;
    results?: HarriSearchHit[];
  };
}

interface HarriBrandResponse {
  data?: {
    id?: number;
    slug?: string;
    name?: string;
  };
}

export function isHarriJobsUrl(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "");
  return host === "harri.com" || host.endsWith(".harri.com");
}

function getHarriSlug(url: URL): string | null {
  const [slug] = url.pathname.split("/").filter(Boolean);
  return slug || null;
}

function parseAvailability(url: URL): string[] | undefined {
  const raw = url.searchParams.get("filters") ?? "";
  const decoded = decodeURIComponent(decodeURIComponent(raw));
  const match = decoded.match(/jobsAvailability=([^&]+)/i);
  if (!match) return undefined;
  const value = match[1];
  if (/fullyRemote|fully_remote/i.test(value)) return ["fully_remote"];
  if (/remote/i.test(value)) return ["remote"];
  return undefined;
}

function formatHarriLocation(hit: HarriSearchHit): string | undefined {
  if (hit.location?.formatted_address) return hit.location.formatted_address;
  const parts = [
    hit.location?.city,
    hit.location?.state,
    hit.location?.country,
  ]
    .map((part) => part?.trim())
    .filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(", ") : undefined;
}

async function resolveBrandId(slug: string): Promise<number | null> {
  const response = await fetch(
    `https://gateway.harri.com/core/api/v1/profile/slug/${encodeURIComponent(slug)}`,
    {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        Origin: "https://harri.com",
        Referer: `https://harri.com/${slug}`,
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    }
  );
  if (!response.ok) return null;
  const data = (await response.json()) as HarriBrandResponse;
  return data.data?.id ?? null;
}

export async function scrapeHarri(siteUrl: string): Promise<ScrapedJob[]> {
  const url = new URL(siteUrl);
  if (!isHarriJobsUrl(url)) return [];

  const slug = getHarriSlug(url);
  if (!slug) return [];

  const brandId = await resolveBrandId(slug);
  if (!brandId) return [];

  const availability = parseAvailability(url);
  // Use a continental US center so remote/nationwide searches still resolve.
  const body: Record<string, unknown> = {
    size: Math.min(MAX_JOBS, 100),
    source: "web",
    brand_level_ids: [brandId],
    radius: 300,
    locations: [39.8283, -98.5795],
    sort: ["newest"],
    flow: "CAREER_PORTAL",
  };
  if (availability) body.availability = availability;

  const response = await fetch(
    "https://gateway.harri.com/core/api/v1/harri_search/search_jobs",
    {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        "Content-Type": "application/json",
        Origin: "https://harri.com",
        Referer: siteUrl,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching Harri jobs`);
  }

  const data = (await response.json()) as HarriSearchResponse;
  return (data.data?.results ?? []).slice(0, MAX_JOBS).map((hit) => {
    const title = hit.title || hit.position_name || "Untitled role";
    const jobUrl =
      hit.absolute_url ||
      hit.job_url ||
      `https://harri.com/${slug}?jobId=${encodeURIComponent(String(hit.id ?? ""))}`;
    return {
      title,
      url: jobUrl,
      location: formatHarriLocation(hit),
    };
  }).filter((job) => job.title && job.url);
}
