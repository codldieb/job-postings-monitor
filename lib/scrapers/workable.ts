import type { ScrapedJob } from "./types";
import { fetchJson, MAX_JOBS } from "./utils";

interface WorkableWidgetJob {
  title: string;
  shortcode: string;
  department?: string | null;
  url?: string;
  shortlink?: string;
  location?: {
    city?: string | null;
    region?: string | null;
    country?: string | null;
    telecommuting?: boolean;
  } | null;
  telecommuting?: boolean;
}

interface WorkableWidgetResponse {
  name?: string;
  jobs?: WorkableWidgetJob[];
}

function formatWorkableLocation(job: WorkableWidgetJob): string | undefined {
  const parts = [
    job.location?.city,
    job.location?.region,
    job.location?.country,
  ]
    .map((part) => part?.trim())
    .filter(Boolean) as string[];

  if (job.telecommuting || job.location?.telecommuting) {
    parts.push("Remote");
  }

  return parts.length > 0 ? [...new Set(parts)].join(", ") : undefined;
}

export async function scrapeWorkable(account: string): Promise<ScrapedJob[]> {
  const data = await fetchJson<WorkableWidgetResponse>(
    `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(account)}`
  );

  return (data.jobs ?? []).slice(0, MAX_JOBS).map((job) => ({
    title: job.title,
    url:
      job.url ||
      job.shortlink ||
      `https://apply.workable.com/j/${encodeURIComponent(job.shortcode)}`,
    department: job.department?.trim() || undefined,
    location: formatWorkableLocation(job),
  }));
}
