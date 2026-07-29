import type { ScrapedJob } from "./types";
import { fetchJson, MAX_JOBS } from "./utils";

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  departments?: { name: string }[];
  offices?: { name: string }[];
  location?: { name: string };
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
}

function formatGreenhouseDepartment(job: GreenhouseJob): string | undefined {
  const names = (job.departments ?? [])
    .map((department) => department.name?.trim())
    .filter(Boolean);

  return names.length > 0 ? names.join(", ") : undefined;
}

function formatGreenhouseLocation(job: GreenhouseJob): string | undefined {
  const parts = [
    job.location?.name?.trim(),
    ...(job.offices ?? []).map((office) => office.name?.trim()).filter(Boolean),
  ].filter(Boolean);

  return parts.length > 0 ? [...new Set(parts)].join("; ") : undefined;
}

export async function scrapeGreenhouse(boardToken: string): Promise<ScrapedJob[]> {
  const data = await fetchJson<GreenhouseResponse>(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs`
  );

  return (data.jobs ?? []).slice(0, MAX_JOBS).map((job) => ({
    title: job.title,
    url: job.absolute_url,
    department: formatGreenhouseDepartment(job),
    location: formatGreenhouseLocation(job),
  }));
}
