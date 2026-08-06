import type { ScrapedJob } from "./types";
import { FETCH_TIMEOUT_MS, MAX_JOBS, USER_AGENT } from "./utils";

interface SaashrLocation {
  city?: string;
  state?: string;
  country?: string;
  address_line_1?: string;
}

interface SaashrJob {
  id: number | string;
  job_title?: string;
  location?: SaashrLocation;
  job_categories?: string[];
}

interface SaashrResponse {
  job_requisitions?: SaashrJob[];
  total_count?: number;
  totalCount?: number;
}

export function parseSaashrBoard(url: URL): {
  origin: string;
  companyId: string;
} | null {
  const host = url.hostname.replace(/^www\./, "");
  if (!host.includes("saashr.com")) return null;

  const match = url.pathname.match(/\/ta\/(\d+)\.careers/i);
  if (!match) return null;

  return { origin: url.origin, companyId: match[1] };
}

function formatSaashrLocation(job: SaashrJob): string | undefined {
  const location = job.location;
  if (!location) return undefined;
  const parts = [
    location.city,
    location.state,
    location.country,
    location.address_line_1,
  ]
    .map((part) => part?.trim())
    .filter(Boolean) as string[];
  return parts.length > 0 ? [...new Set(parts)].join(", ") : undefined;
}

export async function scrapeSaashr(siteUrl: string): Promise<ScrapedJob[]> {
  const parsed = parseSaashrBoard(new URL(siteUrl));
  if (!parsed) return [];

  const pageSize = 50;
  const jobs: ScrapedJob[] = [];
  let offset = 1;

  while (jobs.length < MAX_JOBS) {
    const apiUrl = new URL(
      `/ta/rest/ui/recruitment/companies/%7C${parsed.companyId}/job-requisitions`,
      parsed.origin
    );
    apiUrl.searchParams.set("offset", String(offset));
    apiUrl.searchParams.set("size", String(pageSize));
    apiUrl.searchParams.set("sort", "desc");
    apiUrl.searchParams.set("lang", "en-US");

    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching SaaSHR jobs`);
    }

    const data = (await response.json()) as SaashrResponse;
    const requisitions = data.job_requisitions ?? [];
    if (requisitions.length === 0) break;

    for (const job of requisitions) {
      if (!job.job_title || job.id == null) continue;
      jobs.push({
        title: job.job_title,
        url: `${parsed.origin}/ta/${parsed.companyId}.careers?CareersSearch=1&lang=en-US#${job.id}`,
        department: job.job_categories?.join(", ") || undefined,
        location: formatSaashrLocation(job),
      });
      if (jobs.length >= MAX_JOBS) break;
    }

    if (requisitions.length < pageSize) break;
    offset += pageSize;
  }

  return jobs;
}
