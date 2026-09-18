import { isHealthTechNerdsUrl } from "./detect";
import type { ScrapedJob } from "./types";
import { fetchJson, MAX_JOBS } from "./utils";

interface HealthTechNerdsJobData {
  job_title?: string;
  company_name?: string;
  location?: string;
  location_type?: string;
  function?: string;
  job_description?: string;
  company_description?: string;
}

interface HealthTechNerdsPosting {
  slack_ts?: number | string;
  job_url?: string;
  job_data?: HealthTechNerdsJobData;
}

interface HealthTechNerdsResponse {
  job_postings?: HealthTechNerdsPosting[];
}

const CACHE_MS = 5 * 60 * 1000;
const cache = new Map<string, { fetchedAt: number; data: HealthTechNerdsResponse }>();

export function parseHealthTechNerdsJobUrl(jobUrl: string): {
  origin: string;
  jobId: string;
} | null {
  try {
    const url = new URL(jobUrl);
    if (!isHealthTechNerdsUrl(url)) return null;
    const jobId = url.searchParams.get("job")?.trim();
    if (!jobId) return null;
    return { origin: url.origin, jobId };
  } catch {
    return null;
  }
}

function formatLocation(data: HealthTechNerdsJobData): string | undefined {
  const location = data.location?.trim();
  const locationType = data.location_type?.trim();
  const parts = [location, locationType].filter(Boolean) as string[];
  if (parts.length === 0) return undefined;
  return [...new Set(parts)].join(" · ");
}

function buildJobUrl(origin: string, slackTs: number | string): string {
  const url = new URL("/", origin);
  url.searchParams.set("job", String(slackTs));
  return url.toString();
}

function mapPosting(origin: string, posting: HealthTechNerdsPosting): ScrapedJob | null {
  const title = posting.job_data?.job_title?.trim();
  if (!title || posting.slack_ts == null) return null;

  return {
    title,
    url: buildJobUrl(origin, posting.slack_ts),
    department: posting.job_data?.function?.trim() || undefined,
    team: posting.job_data?.company_name?.trim() || undefined,
    location: posting.job_data ? formatLocation(posting.job_data) : undefined,
  };
}

async function loadBoard(origin: string): Promise<HealthTechNerdsResponse> {
  const cached = cache.get(origin);
  if (cached && Date.now() - cached.fetchedAt < CACHE_MS) {
    return cached.data;
  }

  const data = await fetchJson<HealthTechNerdsResponse>(
    new URL("/data/transformed_job_data.json", origin).toString()
  );
  cache.set(origin, { fetchedAt: Date.now(), data });
  return data;
}

export async function scrapeHealthTechNerds(
  siteUrl: string
): Promise<ScrapedJob[]> {
  const url = new URL(siteUrl);
  if (!isHealthTechNerdsUrl(url)) return [];

  const data = await loadBoard(url.origin);
  const jobs: ScrapedJob[] = [];

  for (const posting of data.job_postings ?? []) {
    const job = mapPosting(url.origin, posting);
    if (!job) continue;
    jobs.push(job);
    if (jobs.length >= MAX_JOBS) break;
  }

  return jobs;
}

export async function lookupHealthTechNerdsJob(jobUrl: string): Promise<{
  descriptionText: string;
  department?: string;
  team?: string;
  location?: string;
} | null> {
  const parsed = parseHealthTechNerdsJobUrl(jobUrl);
  if (!parsed) return null;

  const data = await loadBoard(parsed.origin);
  const posting = (data.job_postings ?? []).find(
    (entry) => String(entry.slack_ts) === parsed.jobId
  );
  if (!posting?.job_data) return null;

  const description = [
    posting.job_data.job_description?.trim(),
    posting.job_data.company_description?.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!description) return null;

  return {
    descriptionText: description,
    department: posting.job_data.function?.trim() || undefined,
    team: posting.job_data.company_name?.trim() || undefined,
    location: formatLocation(posting.job_data),
  };
}
