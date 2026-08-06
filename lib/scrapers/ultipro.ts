import type { ScrapedJob } from "./types";
import { FETCH_TIMEOUT_MS, MAX_JOBS, USER_AGENT } from "./utils";

interface UltiproLocation {
  LocalizedDescription?: string | null;
  Address?: {
    City?: string | null;
    State?: { Code?: string | null; Name?: string | null } | null;
    Country?: { Code?: string | null; Name?: string | null } | null;
  } | null;
}

interface UltiproOpportunity {
  Id?: string;
  Title?: string;
  JobCategoryName?: string | null;
  Locations?: UltiproLocation[] | null;
  PostedDate?: string;
}

interface UltiproSearchResponse {
  opportunities?: UltiproOpportunity[];
  totalCount?: number;
}

export function parseUltiproBoard(url: URL): {
  origin: string;
  tenant: string;
  boardId: string;
  filters: { fieldName: number; values: string[] }[];
  query: string;
} | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "recruiting.ultipro.com" && !host.endsWith(".ultipro.com")) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const boardIndex = segments.findIndex(
    (segment) => segment.toLowerCase() === "jobboard"
  );
  if (boardIndex < 1 || boardIndex >= segments.length - 1) return null;

  const tenant = segments[boardIndex - 1];
  const boardId = segments[boardIndex + 1];
  if (!tenant || !boardId) return null;

  const filters: { fieldName: number; values: string[] }[] = [];
  for (const [key, rawValue] of url.searchParams.entries()) {
    const match = key.match(/^f(\d+)$/i);
    if (!match) continue;
    const values = rawValue
      .split("+")
      .map((value) => value.trim())
      .filter(Boolean);
    if (values.length === 0) continue;
    filters.push({ fieldName: Number(match[1]), values });
  }

  return {
    origin: url.origin,
    tenant,
    boardId,
    filters,
    query: url.searchParams.get("q") ?? "",
  };
}

function formatUltiproLocation(opportunity: UltiproOpportunity): string | undefined {
  const labels = (opportunity.Locations ?? [])
    .map((location) => {
      if (location.LocalizedDescription?.trim()) {
        return location.LocalizedDescription.trim();
      }
      const city = location.Address?.City?.trim();
      const state =
        location.Address?.State?.Code?.trim() ||
        location.Address?.State?.Name?.trim();
      const country =
        location.Address?.Country?.Name?.trim() ||
        location.Address?.Country?.Code?.trim();
      return [city, state, country].filter(Boolean).join(", ");
    })
    .filter(Boolean);

  return labels.length > 0 ? [...new Set(labels)].join("; ") : undefined;
}

export async function scrapeUltipro(siteUrl: string): Promise<ScrapedJob[]> {
  const parsed = parseUltiproBoard(new URL(siteUrl));
  if (!parsed) return [];

  const endpoint = `${parsed.origin}/${encodeURIComponent(parsed.tenant)}/JobBoard/${encodeURIComponent(parsed.boardId)}/JobBoardView/LoadSearchResults`;
  const pageSize = 50;
  const jobs: ScrapedJob[] = [];
  let skip = 0;
  let total = Infinity;

  while (jobs.length < MAX_JOBS && skip < total) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({
        opportunitySearch: {
          Top: pageSize,
          Skip: skip,
          QueryString: parsed.query,
          OrderBy: [
            {
              Value: "postedDateDesc",
              PropertyName: "PostedDate",
              Ascending: false,
            },
          ],
          Filters: parsed.filters.map((filter) => ({
            t: "TermsSearchFilterDto",
            fieldName: filter.fieldName,
            values: filter.values,
          })),
        },
        matchCriteria: {
          PreferredLocale: "en_US",
          Keywords: parsed.query,
        },
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching Ultipro jobs`);
    }

    const data = (await response.json()) as UltiproSearchResponse;
    const opportunities = data.opportunities ?? [];
    total = data.totalCount ?? opportunities.length;
    if (opportunities.length === 0) break;

    for (const opportunity of opportunities) {
      if (!opportunity.Id || !opportunity.Title) continue;
      jobs.push({
        title: opportunity.Title,
        url: `${parsed.origin}/${encodeURIComponent(parsed.tenant)}/JobBoard/${encodeURIComponent(parsed.boardId)}/OpportunityDetail?opportunityId=${encodeURIComponent(opportunity.Id)}`,
        department: opportunity.JobCategoryName?.trim() || undefined,
        location: formatUltiproLocation(opportunity),
      });
      if (jobs.length >= MAX_JOBS) break;
    }

    skip += pageSize;
  }

  return jobs;
}
