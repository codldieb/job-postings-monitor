import type { ScrapedJob } from "./types";
import { fetchJson, MAX_JOBS } from "./utils";

interface AshbyJob {
  title: string;
  jobUrl: string;
  isListed?: boolean;
  department?: string;
  team?: string;
  location?: string;
  locationName?: string;
}

interface AshbyResponse {
  jobs: AshbyJob[];
}

export async function scrapeAshby(boardName: string): Promise<ScrapedJob[]> {
  const data = await fetchJson<AshbyResponse>(
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(boardName)}`
  );

  return (data.jobs ?? [])
    .filter((job) => job.isListed !== false)
    .slice(0, MAX_JOBS)
    .map((job) => ({
      title: job.title,
      url: job.jobUrl,
      department: job.department?.trim() || undefined,
      team: job.team?.trim() || undefined,
      location: job.location?.trim() || job.locationName?.trim() || undefined,
    }));
}
