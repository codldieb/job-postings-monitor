import { isPaylocityJobsUrl } from "./detect";
import type { ScrapedJob } from "./types";
import { FETCH_TIMEOUT_MS, MAX_JOBS, USER_AGENT } from "./utils";

const PAYLOCITY_GUID =
  /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i;
const ALL_SENTINEL = /^all\s+(departments|locations)$/i;

interface PaylocityLocation {
  Name?: string | null;
  City?: string | null;
  State?: string | null;
  Country?: string | null;
  Metro?: string | null;
}

interface PaylocityJob {
  JobId?: number | string;
  JobTitle?: string;
  LocationName?: string | null;
  HiringDepartment?: string | null;
  Description?: string | null;
  IsInternal?: boolean;
  IsRemote?: boolean;
  JobLocation?: PaylocityLocation | null;
}

interface PaylocityPageData {
  Jobs?: PaylocityJob[];
  ShowInternal?: boolean;
  ModuleTitle?: string;
}

export function parsePaylocityBoard(url: URL): {
  origin: string;
  listingId: string;
  department?: string;
  location?: string;
} | null {
  if (!isPaylocityJobsUrl(url)) return null;

  const segments = url.pathname.split("/").filter(Boolean);
  const jobsIndex = segments.findIndex(
    (segment) => segment.toLowerCase() === "jobs"
  );
  if (jobsIndex < 0) return null;

  const afterJobs = segments.slice(jobsIndex + 1);
  const listingId = afterJobs.find((segment) => PAYLOCITY_GUID.test(segment));
  if (!listingId) return null;

  const department = normalizeFilter(url.searchParams.get("department"));
  const location = normalizeFilter(url.searchParams.get("location"));

  return {
    origin: url.origin,
    listingId,
    department,
    location,
  };
}

export function parsePaylocityJobUrl(jobUrl: string): {
  origin: string;
  jobId: string;
  listingId?: string;
} | null {
  try {
    const url = new URL(jobUrl);
    if (!isPaylocityJobsUrl(url)) return null;

    const match = url.pathname.match(/\/jobs\/details\/(\d+)/i);
    if (!match?.[1]) return null;

    return {
      origin: url.origin,
      jobId: match[1],
      listingId: url.searchParams.get("listingId") ?? undefined,
    };
  } catch {
    return null;
  }
}

function normalizeFilter(value: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || ALL_SENTINEL.test(trimmed)) return undefined;
  return trimmed;
}

function extractPageData(html: string): PaylocityPageData | null {
  const markerIndex = html.indexOf("window.pageData");
  if (markerIndex < 0) return null;

  const jsonStart = html.indexOf("{", markerIndex);
  if (jsonStart < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = jsonStart; index < html.length; index++) {
    const char = html[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(jsonStart, index + 1)) as PaylocityPageData;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

function matchesFilter(actual: string | null | undefined, expected?: string) {
  if (!expected) return true;
  return (actual ?? "").trim().toLowerCase() === expected.toLowerCase();
}

function matchesLocation(job: PaylocityJob, expected?: string) {
  if (!expected) return true;
  if (expected.toLowerCase() === "remote") {
    return (
      job.IsRemote === true ||
      (job.LocationName ?? "").trim().toLowerCase() === "remote"
    );
  }
  return matchesFilter(job.LocationName, expected);
}

function formatPaylocityLocation(job: PaylocityJob): string | undefined {
  if (job.LocationName?.trim()) return job.LocationName.trim();

  const location = job.JobLocation;
  const parts = [location?.City, location?.State, location?.Country]
    .map((part) => part?.trim())
    .filter(Boolean) as string[];

  if (job.IsRemote) {
    return parts.length > 0 ? `Remote · ${parts.join(", ")}` : "Remote";
  }

  return parts.length > 0 ? parts.join(", ") : undefined;
}

function buildJobUrl(
  origin: string,
  listingId: string,
  jobId: number | string
): string {
  const url = new URL(`/Recruiting/Jobs/Details/${jobId}`, origin);
  url.searchParams.set("listingId", listingId);
  return url.toString();
}

export function scrapePaylocityJobsFromHtml(
  html: string,
  siteUrl: string
): ScrapedJob[] {
  const parsed = parsePaylocityBoard(new URL(siteUrl));
  if (!parsed) return [];

  const pageData = extractPageData(html);
  if (!pageData) return [];

  const includeInternal = pageData.ShowInternal === true;

  return (pageData.Jobs ?? [])
    .filter((job) => {
      if (job.JobId == null || !job.JobTitle?.trim()) return false;
      if (job.IsInternal && !includeInternal) return false;
      if (!matchesFilter(job.HiringDepartment, parsed.department)) return false;
      if (!matchesLocation(job, parsed.location)) return false;
      return true;
    })
    .slice(0, MAX_JOBS)
    .map((job) => ({
      title: job.JobTitle!.trim(),
      url: buildJobUrl(parsed.origin, parsed.listingId, job.JobId!),
      department: job.HiringDepartment?.trim() || undefined,
      location: formatPaylocityLocation(job),
    }));
}

export async function scrapePaylocity(siteUrl: string): Promise<ScrapedJob[]> {
  const parsed = parsePaylocityBoard(new URL(siteUrl));
  if (!parsed) return [];

  const listingUrl = new URL(
    `/recruiting/jobs/All/${parsed.listingId}`,
    parsed.origin
  );

  const response = await fetch(listingUrl, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching Paylocity jobs`);
  }

  return scrapePaylocityJobsFromHtml(await response.text(), siteUrl);
}
