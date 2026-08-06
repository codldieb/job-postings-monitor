import type { ScrapedJob } from "./types";
import { FETCH_TIMEOUT_MS, MAX_JOBS, USER_AGENT } from "./utils";

interface WorkdayJobPosting {
  title?: string;
  externalPath?: string;
  locationsText?: string;
  bulletFields?: string[];
}

interface WorkdayJobsResponse {
  total?: number;
  jobPostings?: WorkdayJobPosting[];
}

export function parseWorkdayBoard(url: URL): {
  origin: string;
  tenant: string;
  site: string;
} | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "myworkdayjobs.com" && !host.endsWith(".myworkdayjobs.com")) {
    return null;
  }

  const tenantMatch = host.match(/^([^.]+)\.wd\d+\.myworkdayjobs\.com$/i);
  if (!tenantMatch) return null;

  const segments = url.pathname.split("/").filter(Boolean);
  const site = segments[0];
  if (!site) return null;

  return {
    origin: url.origin,
    tenant: tenantMatch[1],
    site,
  };
}

function buildAppliedFacets(url: URL): Record<string, string[]> {
  const facets: Record<string, string[]> = {};

  for (const [key, value] of url.searchParams.entries()) {
    if (!value || key === "q" || key === "searchText") continue;
    if (!facets[key]) facets[key] = [];
    if (!facets[key].includes(value)) {
      facets[key].push(value);
    }
  }

  return facets;
}

async function fetchWorkdayPage(
  board: { origin: string; tenant: string; site: string },
  appliedFacets: Record<string, string[]>,
  searchText: string,
  offset: number,
  limit: number
): Promise<WorkdayJobsResponse> {
  const response = await fetch(
    `${board.origin}/wday/cxs/${encodeURIComponent(board.tenant)}/${encodeURIComponent(board.site)}/jobs`,
    {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        appliedFacets,
        limit,
        offset,
        searchText,
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    }
  );

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} fetching Workday jobs for ${board.site}`
    );
  }

  return (await response.json()) as WorkdayJobsResponse;
}

export async function scrapeWorkday(siteUrl: string): Promise<ScrapedJob[]> {
  const url = new URL(siteUrl);
  const board = parseWorkdayBoard(url);
  if (!board) return [];

  const appliedFacets = buildAppliedFacets(url);
  const searchText = url.searchParams.get("q") ?? url.searchParams.get("searchText") ?? "";
  const pageSize = 20;
  const jobs: ScrapedJob[] = [];
  let offset = 0;
  let total = Infinity;

  while (jobs.length < MAX_JOBS && offset < total) {
    const data = await fetchWorkdayPage(
      board,
      appliedFacets,
      searchText,
      offset,
      pageSize
    );
    const postings = data.jobPostings ?? [];
    total = data.total ?? postings.length;
    if (postings.length === 0) break;

    for (const posting of postings) {
      if (!posting.title || !posting.externalPath) continue;
      const jobUrl = new URL(
        `/${board.site}${posting.externalPath}`.replace(/\/{2,}/g, "/"),
        board.origin
      ).toString();
      jobs.push({
        title: posting.title,
        url: jobUrl,
        location: posting.locationsText?.trim() || undefined,
      });
      if (jobs.length >= MAX_JOBS) break;
    }

    offset += pageSize;
  }

  return jobs;
}
