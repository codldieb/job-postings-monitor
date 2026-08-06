import type { ScrapedJob } from "./types";
import { fetchJson, MAX_JOBS } from "./utils";

interface LeverCategory {
  commitment?: string;
  department?: string;
  location?: string;
  team?: string;
  allLocations?: string[];
}

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  categories?: LeverCategory;
  workplaceType?: string;
}

function matchesLeverFilters(
  posting: LeverPosting,
  filters: URLSearchParams
): boolean {
  const categories = posting.categories ?? {};

  for (const key of ["team", "department", "commitment", "location"] as const) {
    const expected = filters.get(key);
    if (!expected) continue;
    const actual = categories[key];
    if (!actual || actual.toLowerCase() !== expected.toLowerCase()) {
      return false;
    }
  }

  const workplaceType = filters.get("workplaceType");
  if (workplaceType) {
    const actual =
      posting.workplaceType ??
      (categories as { workplaceType?: string }).workplaceType;
    if (!actual || actual.toLowerCase() !== workplaceType.toLowerCase()) {
      return false;
    }
  }

  return true;
}

export async function scrapeLever(
  company: string,
  filters?: URLSearchParams
): Promise<ScrapedJob[]> {
  const apiUrl = new URL(
    `https://api.lever.co/v0/postings/${encodeURIComponent(company)}`
  );
  apiUrl.searchParams.set("mode", "json");

  const data = await fetchJson<LeverPosting[]>(apiUrl.toString());
  const filtered = (Array.isArray(data) ? data : []).filter((posting) =>
    filters ? matchesLeverFilters(posting, filters) : true
  );

  return filtered.slice(0, MAX_JOBS).map((posting) => ({
    title: posting.text,
    url: posting.hostedUrl || posting.applyUrl || "",
    department: posting.categories?.department?.trim() || undefined,
    team: posting.categories?.team?.trim() || undefined,
    location:
      posting.categories?.allLocations?.join("; ") ||
      posting.categories?.location?.trim() ||
      undefined,
  })).filter((job) => job.url && job.title);
}
