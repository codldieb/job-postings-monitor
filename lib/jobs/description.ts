import * as cheerio from "cheerio";
import { cleanJobDescription } from "@/lib/jobs/clean-description";
import { fetchJson, USER_AGENT, FETCH_TIMEOUT_MS } from "@/lib/scrapers/utils";

export interface JobDetails {
  descriptionText: string;
  department?: string;
  team?: string;
  location?: string;
}

interface GreenhouseJobDetail {
  content?: string;
  departments?: { name: string }[];
  offices?: { name: string }[];
  location?: { name: string };
}

interface AshbyJob {
  id: string;
  title: string;
  jobUrl: string;
  department?: string;
  team?: string;
  location?: string;
  locationName?: string;
  descriptionPlain?: string;
  descriptionHtml?: string;
}

interface AshbyResponse {
  jobs: AshbyJob[];
}

function htmlToText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, footer, nav, header").remove();
  $(
    "[class*='footer'], [class*='legal'], [class*='disclaimer'], [class*='eeo'], [class*='cookie']"
  ).remove();
  return cleanJobDescription($.text().replace(/\s+/g, " ").trim());
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }

  return response.text();
}

function parseGreenhouseJobUrl(
  jobUrl: string
): { boardToken: string; jobId: string } | null {
  try {
    const url = new URL(jobUrl);
    const host = url.hostname.replace(/^www\./, "");
    if (host !== "boards.greenhouse.io" && host !== "job-boards.greenhouse.io") {
      return null;
    }

    const parts = url.pathname.split("/").filter(Boolean);
    const jobsIndex = parts.indexOf("jobs");
    if (jobsIndex === -1 || !parts[jobsIndex + 1]) return null;

    const boardToken = parts[0];
    const jobId = parts[jobsIndex + 1];
    if (!boardToken || !/^\d+$/.test(jobId)) return null;

    return { boardToken, jobId };
  } catch {
    return null;
  }
}

function formatGreenhouseDepartment(data: GreenhouseJobDetail): string | undefined {
  const names = (data.departments ?? [])
    .map((department) => department.name?.trim())
    .filter(Boolean);

  return names.length > 0 ? names.join(", ") : undefined;
}

function formatGreenhouseLocation(data: GreenhouseJobDetail): string | undefined {
  const parts = [
    data.location?.name?.trim(),
    ...(data.offices ?? []).map((office) => office.name?.trim()).filter(Boolean),
  ].filter(Boolean);

  return parts.length > 0 ? [...new Set(parts)].join("; ") : undefined;
}

async function fetchGreenhouseDetails(
  jobUrl: string
): Promise<JobDetails | null> {
  const parsed = parseGreenhouseJobUrl(jobUrl);
  if (!parsed) return null;

  const data = await fetchJson<GreenhouseJobDetail>(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(parsed.boardToken)}/jobs/${encodeURIComponent(parsed.jobId)}`
  );

  if (!data.content?.trim()) return null;

  return {
    descriptionText: htmlToText(data.content),
    department: formatGreenhouseDepartment(data),
    location: formatGreenhouseLocation(data),
  };
}

function parseAshbyBoardFromJobUrl(jobUrl: string): string | null {
  try {
    const url = new URL(jobUrl);
    const host = url.hostname.replace(/^www\./, "");
    if (host !== "jobs.ashbyhq.com") return null;

    const [boardName] = url.pathname.split("/").filter(Boolean);
    return boardName ?? null;
  } catch {
    return null;
  }
}

async function fetchAshbyDetails(jobUrl: string): Promise<JobDetails | null> {
  const boardName = parseAshbyBoardFromJobUrl(jobUrl);
  if (!boardName) return null;

  const data = await fetchJson<AshbyResponse>(
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(boardName)}`
  );

  const canonicalJobUrl = jobUrl.replace(/\/+$/, "");
  const job = (data.jobs ?? []).find((entry) => {
    const entryUrl = entry.jobUrl?.replace(/\/+$/, "");
    return entryUrl === canonicalJobUrl || entryUrl === `${canonicalJobUrl}/`;
  });

  if (!job) return null;

  let descriptionText: string | undefined;
  if (job.descriptionPlain?.trim()) {
    descriptionText = cleanJobDescription(job.descriptionPlain.trim());
  } else if (job.descriptionHtml?.trim()) {
    descriptionText = htmlToText(job.descriptionHtml);
  }

  if (!descriptionText) return null;

  return {
    descriptionText,
    department: job.department?.trim() || undefined,
    team: job.team?.trim() || undefined,
    location: job.location?.trim() || job.locationName?.trim() || undefined,
  };
}

async function fetchGenericDescription(jobUrl: string): Promise<string> {
  const html = await fetchHtml(jobUrl);
  const $ = cheerio.load(html);

  $("script, style, noscript, nav, header, footer").remove();
  $(
    "[class*='footer'], [class*='legal'], [class*='disclaimer'], [class*='eeo'], [class*='cookie']"
  ).remove();

  const selectors = [
    "[class*='job-description']",
    "[class*='JobDescription']",
    "[class*='posting-page']",
    "[class*='posting-details']",
    "[data-automation-id='jobPostingDescription']",
    "main",
    "article",
    "body",
  ];

  for (const selector of selectors) {
    const text = cleanJobDescription(
      $(selector).first().text().replace(/\s+/g, " ").trim()
    );
    if (text.length >= 200) {
      return text;
    }
  }

  const bodyText = cleanJobDescription(
    $("body").text().replace(/\s+/g, " ").trim()
  );
  if (bodyText.length >= 100) {
    return bodyText;
  }

  throw new Error("Could not extract meaningful text from job page");
}

export async function fetchJobDetails(jobUrl: string): Promise<JobDetails> {
  const greenhouse = await fetchGreenhouseDetails(jobUrl).catch(() => null);
  if (greenhouse) return greenhouse;

  const ashby = await fetchAshbyDetails(jobUrl).catch(() => null);
  if (ashby) return ashby;

  return {
    descriptionText: await fetchGenericDescription(jobUrl),
  };
}

export async function fetchJobDescription(jobUrl: string): Promise<string> {
  const details = await fetchJobDetails(jobUrl);
  return details.descriptionText;
}
