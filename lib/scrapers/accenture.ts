import type { ScrapedJob } from "./types";
import { FETCH_TIMEOUT_MS, MAX_JOBS, USER_AGENT } from "./utils";

interface AccentureJob {
  title?: string;
  jobDetailUrl?: string;
  jobFamilyGroup?: string[];
  location?: string[];
  cityState?: string;
  country?: string;
  jobTypeDescription?: string;
}

interface AccentureResponse {
  data?: AccentureJob[];
  totalCount?: number;
}

function mapAccentureFilters(url: URL): Array<{
  fieldName: string;
  items: string[];
  multiSelect: boolean;
}> {
  const filters: Array<{
    fieldName: string;
    items: string[];
    multiSelect: boolean;
  }> = [];

  const employmentType = url.searchParams.get("et");
  if (employmentType) {
    filters.push({
      fieldName: "employeeType.keyword",
      items: employmentType.split("|").map((value) => decodeURIComponent(value)),
      multiSelect: false,
    });
  }

  const areaOfInterest = url.searchParams.get("aoi");
  if (areaOfInterest) {
    filters.push({
      fieldName: "areaOfInterestTitle.keyword",
      items: areaOfInterest.split("|").map((value) => decodeURIComponent(value)),
      multiSelect: false,
    });
  }

  const jobType = url.searchParams.get("jt");
  if (jobType) {
    filters.push({
      fieldName: "jobTypeDescription.keyword",
      items: jobType.split("|").map((value) => decodeURIComponent(value)),
      multiSelect: false,
    });
  }

  return filters;
}

function resolveAccentureJobUrl(raw: string | undefined, countrySite: string): string | null {
  if (!raw) return null;
  const resolved = raw.replace("{0}", countrySite);
  try {
    return new URL(resolved).toString();
  } catch {
    return null;
  }
}

export function isAccentureJobsUrl(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "");
  return host === "accenture.com" && /\/careers\/jobsearch/i.test(url.pathname);
}

export async function scrapeAccenture(siteUrl: string): Promise<ScrapedJob[]> {
  const url = new URL(siteUrl);
  if (!isAccentureJobsUrl(url)) return [];

  const countrySite =
    url.pathname.match(/^\/([a-z]{2}-[a-z]{2})\//i)?.[1]?.toLowerCase() ?? "us-en";
  const [jobCountry = "USA", jobLanguage = "en"] = (() => {
    const [region, lang] = countrySite.split("-");
    if (region.toLowerCase() === "us") return ["USA", lang || "en"];
    if (region.toLowerCase() === "ca") return ["CAN", lang || "en"];
    return [region.toUpperCase(), lang || "en"];
  })();

  const pageSize = 12;
  const jobs: ScrapedJob[] = [];
  let startIndex = 0;
  let total = Infinity;
  const jobFilters = mapAccentureFilters(url);

  while (jobs.length < MAX_JOBS && startIndex < total) {
    const form = new FormData();
    form.set("startIndex", String(startIndex));
    form.set("maxResultSize", String(pageSize));
    form.set("jobKeyword", url.searchParams.get("q") ?? "");
    form.set("jobCountry", jobCountry);
    form.set("jobLanguage", jobLanguage);
    form.set("countrySite", countrySite);
    form.set("sortBy", "2");
    form.set("searchType", "vectorSearch");
    form.set("enableQueryBoost", "true");
    form.set("minScore", "0.6");
    form.set("getFeedbackJudgmentEnabled", "true");
    form.set("useCleanEmbedding", "true");
    form.set("score", "true");
    form.set("totalHits", "true");
    form.set("debugQuery", "false");
    form.set("jobFilters", JSON.stringify(jobFilters));

    const response = await fetch(
      "https://www.accenture.com/api/accenture/elastic/findjobs",
      {
        method: "POST",
        body: form,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          Origin: "https://www.accenture.com",
          Referer: siteUrl,
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching Accenture jobs`);
    }

    const data = (await response.json()) as AccentureResponse;
    const pageJobs = data.data ?? [];
    total = data.totalCount ?? startIndex + pageJobs.length;
    if (pageJobs.length === 0) break;

    for (const job of pageJobs) {
      const jobUrl = resolveAccentureJobUrl(job.jobDetailUrl, countrySite);
      if (!job.title || !jobUrl) continue;
      jobs.push({
        title: job.title,
        url: jobUrl,
        department: job.jobFamilyGroup?.join(", ") || undefined,
        location:
          job.location?.join("; ") ||
          job.cityState ||
          job.country ||
          undefined,
      });
      if (jobs.length >= MAX_JOBS) break;
    }

    startIndex += pageSize;
  }

  return jobs;
}
