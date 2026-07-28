import type { ScrapedJob } from "./types";
import { fetchJson, MAX_JOBS } from "./utils";

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
}

export async function scrapeGreenhouse(boardToken: string): Promise<ScrapedJob[]> {
  const data = await fetchJson<GreenhouseResponse>(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs`
  );

  return (data.jobs ?? []).slice(0, MAX_JOBS).map((job) => ({
    title: job.title,
    url: job.absolute_url,
  }));
}
