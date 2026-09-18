import type { ScrapedJob } from "./types";
import { FETCH_TIMEOUT_MS, MAX_JOBS, USER_AGENT } from "./utils";

interface WorkdayJobPosting {
  title?: string;
  externalPath?: string;
  locationsText?: string;
  postedOn?: string;
  bulletFields?: string[];
}

interface WorkdayFacetValue {
  descriptor?: string;
  id?: string;
}

interface WorkdayFacet {
  facetParameter?: string;
  descriptor?: string;
  values?: WorkdayFacetValue[];
}

interface WorkdayJobsResponse {
  total?: number;
  jobPostings?: WorkdayJobPosting[];
  facets?: WorkdayFacet[];
}

export interface WorkdayBoard {
  origin: string;
  tenant: string;
  site: string;
}

export function parseWorkdayBoard(url: URL): WorkdayBoard | null {
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

function normalizeFacetName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchFacetValueId(
  facet: WorkdayFacet,
  wanted: string
): string | undefined {
  const normalizedWanted = normalizeFacetName(wanted);
  if (!normalizedWanted) return undefined;

  const values = facet.values ?? [];
  const exact = values.find(
    (value) =>
      value.id && normalizeFacetName(value.descriptor ?? "") === normalizedWanted
  );
  if (exact?.id) return exact.id;

  const partial = values.find((value) => {
    if (!value.id) return false;
    const descriptor = normalizeFacetName(value.descriptor ?? "");
    return (
      descriptor.includes(normalizedWanted) ||
      normalizedWanted.includes(descriptor)
    );
  });
  return partial?.id;
}

export function resolveNamedFacets(
  facets: WorkdayFacet[],
  facetNames: Record<string, string[]>
): Record<string, string[]> {
  const resolved: Record<string, string[]> = {};

  for (const [parameter, names] of Object.entries(facetNames)) {
    const facet = facets.find(
      (item) =>
        item.facetParameter === parameter ||
        normalizeFacetName(item.descriptor ?? "") === normalizeFacetName(parameter)
    );
    if (!facet) continue;

    const ids: string[] = [];
    for (const name of names) {
      const id = matchFacetValueId(facet, name);
      if (id && !ids.includes(id)) ids.push(id);
    }
    if (ids.length > 0) resolved[parameter] = ids;
  }

  return resolved;
}

async function fetchWorkdayPage(
  board: WorkdayBoard,
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

function mapPosting(board: WorkdayBoard, posting: WorkdayJobPosting): ScrapedJob | null {
  if (!posting.title || !posting.externalPath) return null;

  const jobUrl = new URL(
    `/${board.site}${posting.externalPath}`.replace(/\/{2,}/g, "/"),
    board.origin
  ).toString();

  return {
    title: posting.title,
    url: jobUrl,
    location: posting.locationsText?.trim() || undefined,
    postedOn: posting.postedOn?.trim() || undefined,
  };
}

export async function scrapeWorkdayBoard(
  board: WorkdayBoard,
  options: {
    appliedFacets?: Record<string, string[]>;
    facetNames?: Record<string, string[]>;
    searchText?: string;
  } = {}
): Promise<ScrapedJob[]> {
  const searchText = options.searchText ?? "";
  let appliedFacets = { ...(options.appliedFacets ?? {}) };
  const facetNames = options.facetNames ?? {};

  if (Object.keys(facetNames).length > 0) {
    const probe = await fetchWorkdayPage(board, appliedFacets, searchText, 0, 1);
    appliedFacets = {
      ...appliedFacets,
      ...resolveNamedFacets(probe.facets ?? [], facetNames),
    };
  }

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
      const job = mapPosting(board, posting);
      if (!job) continue;
      jobs.push(job);
      if (jobs.length >= MAX_JOBS) break;
    }

    offset += pageSize;
  }

  return jobs;
}

export async function scrapeWorkday(siteUrl: string): Promise<ScrapedJob[]> {
  const url = new URL(siteUrl);
  const board = parseWorkdayBoard(url);
  if (!board) return [];

  return scrapeWorkdayBoard(board, {
    appliedFacets: buildAppliedFacets(url),
    searchText:
      url.searchParams.get("q") ?? url.searchParams.get("searchText") ?? "",
  });
}
