import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { ScrapedJob } from "./types";
import {
  canonicalizeJobUrl,
  FETCH_TIMEOUT_MS,
  MAX_JOBS,
  USER_AGENT,
} from "./utils";

const MAX_PAGES = 25;

const JOB_LISTING_SELECTORS = [
  ".opening a[href]",
  ".posting-title a[href]",
  ".posting-btn-title[href]",
  ".posting[href]",
  "[data-job-id] a[href]",
  "[data-automation-id='jobTitle']",
  "[class*='job-listing'] a[href]",
  "[class*='job-result'] a[href]",
  "[class*='JobListing'] a[href]",
  "[class*='opening-job'] a[href]",
  "li.opening a[href]",
  "tr[data-job] a[href]",
];

const EXCLUDED_TITLE_PATTERNS = [
  /^careers?$/i,
  /^jobs?$/i,
  /^all (jobs|openings|positions|roles)$/i,
  /^view (all )?(jobs|openings|positions|roles)$/i,
  /^see (all )?(jobs|openings|positions|roles)$/i,
  /^search( jobs?)?$/i,
  /^job search$/i,
  /^apply( now)?$/i,
  /^learn more$/i,
  /^read more$/i,
  /^next(\s*page)?$/i,
  /^previous(\s*page)?$/i,
  /^prev(\s*page)?$/i,
  /^back$/i,
  /^home$/i,
  /^about(\s+us)?$/i,
  /^benefits$/i,
  /^culture$/i,
  /^life at/i,
  /^our team$/i,
  /^how we work$/i,
  /^get started/i,
  /job finder/i,
  /^programs?$/i,
  /^(early|graduate|full-?time|internship) /i,
  /^pinned jobs$/i,
  /^open jobs$/i,
  /talent community/i,
  /^departments?$/i,
  /^locations?$/i,
  /^teams?$/i,
  /^blog$/i,
  /^news$/i,
  /^contact(\s+us)?$/i,
  /^privacy$/i,
  /^terms$/i,
  /^sign in$/i,
  /^log in$/i,
  /^login$/i,
  /^cookie/i,
  /^(english|français|french|german|japanese|spanish|deutsch)$/i,
  /^(job id|title|location|date|job function)$/i,
  /^https?:\/\//i,
  /^page \d+$/i,
  /^\d+$/,
  /^→$/,
  /^›$/,
  /^»$/,
  /^←$/,
  /^‹$/,
  /^«$/,
];

const EXCLUDED_PATH_SEGMENTS = new Set([
  "careers",
  "jobs",
  "job",
  "openings",
  "opening",
  "vacancies",
  "vacancy",
  "positions",
  "position",
  "postings",
  "posting",
  "roles",
  "role",
  "opportunities",
  "opportunity",
  "search",
  "apply",
  "team",
  "teams",
  "departments",
  "department",
  "locations",
  "location",
  "blog",
  "news",
  "about",
  "benefits",
  "culture",
  "privacy",
  "terms",
  "login",
  "signup",
  "sign-up",
  "register",
  "talent",
  "life",
  "students",
  "internships",
  "events",
  "faq",
  "help",
  "contact",
  "page",
  "pages",
  "how-we-work",
  "fit-finder",
  "saved-jobs",
  "search-jobs",
  "programs",
  "program",
  "graduate",
  "graduate-programs",
  "full-time-programs",
  "internship-programs",
  "early-internships-program",
  "cookie-management",
  "content",
  "talent-community",
  "home",
  "community",
  "new-york",
  "san-francisco",
  "products",
  "legal",
  "signup",
  "sign-up",
  "posts",
  "feed",
  "browse",
]);

const NON_JOB_LINK_SELECTORS = [
  "header",
  "footer",
  "nav",
  "[role='navigation']",
  "[class*='header']",
  "[class*='footer']",
  "[class*='nav-menu']",
  "[class*='navbar']",
  "aside",
].join(", ");

const CAPITAL_ONE_SEARCH_JOBS_PATH =
  /^\/search-jobs\/[^/]+\/\d+\/\d+$/i;

const JOB_PATH_SEGMENT =
  /^(jobs?|careers?|openings?|vacancies|positions?|postings?|roles?|opportunities)$/i;

function cleanTitle(title: string): string {
  return title.replace(/\s+/g, " ").trim();
}

function normalizeUrl(baseUrl: string, href: string): string | null {
  try {
    const resolved = new URL(href, baseUrl);
    if (!["http:", "https:"].includes(resolved.protocol)) return null;
    resolved.hash = "";
    for (const key of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
      "source",
    ]) {
      resolved.searchParams.delete(key);
    }
    return resolved.toString();
  } catch {
    return null;
  }
}

function isSameOrigin(base: URL, target: URL): boolean {
  return base.hostname === target.hostname;
}

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^www\./, "");
}

function isTrustedAtsHost(hostname: string): boolean {
  const host = normalizeHostname(hostname);

  return (
    host === "myworkdayjobs.com" ||
    host.endsWith(".myworkdayjobs.com") ||
    host === "job-boards.greenhouse.io" ||
    host === "boards.greenhouse.io" ||
    host === "jobs.ashbyhq.com" ||
    host.endsWith(".applicantpro.com") ||
    host.endsWith(".applytojob.com") ||
    host.endsWith(".lever.co")
  );
}

function isJobDetailQueryUrl(jobUrl: URL): boolean {
  if (!/jobdetail/i.test(jobUrl.pathname)) return false;

  const jobId =
    jobUrl.searchParams.get("jobId") ?? jobUrl.searchParams.get("jobid");
  return !!jobId && /^\d+$/.test(jobId);
}

function isApplyToJobUrl(pathname: string): boolean {
  const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (segments.length < 2 || segments[0].toLowerCase() !== "apply") {
    return false;
  }

  return /^[A-Za-z0-9]{6,}$/.test(segments[1]);
}

function isWorkdayJobUrl(pathname: string): boolean {
  const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const jobIndex = segments.findIndex((segment) => segment.toLowerCase() === "job");
  if (jobIndex < 0) return false;

  const lastSegment = segments[segments.length - 1]?.replace(/\.html$/i, "") ?? "";
  if (hasJobIdentifierSegment(lastSegment)) return true;
  return /_(?:jr|r)-\d+$/i.test(lastSegment);
}

function isGreenhouseJobUrl(pathname: string): boolean {
  const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const jobsIndex = segments.findIndex((segment) => segment.toLowerCase() === "jobs");
  if (jobsIndex < 0 || jobsIndex >= segments.length - 1) return false;

  return /^\d+$/.test(segments[jobsIndex + 1]);
}

function isAshbyJobUrl(pathname: string): boolean {
  const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (segments.length < 2) return false;

  return /^[a-f0-9-]{36}$/i.test(segments[segments.length - 1]);
}

function isApplicantProJobUrl(pathname: string): boolean {
  const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const jobsIndex = segments.findIndex((segment) => segment.toLowerCase() === "jobs");
  if (jobsIndex < 0 || jobsIndex >= segments.length - 1) return false;

  return /^\d+$/.test(segments[jobsIndex + 1].replace(/\.html$/i, ""));
}

function isLeverJobUrl(pathname: string): boolean {
  const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const jobsIndex = segments.findIndex((segment) => segment.toLowerCase() === "jobs");
  if (jobsIndex < 0 || jobsIndex >= segments.length - 1) return false;

  const slug = segments[jobsIndex + 1];
  return slug.length > 0 && !EXCLUDED_PATH_SEGMENTS.has(slug.toLowerCase());
}

function isTrustedAtsJobUrl(jobUrl: URL): boolean {
  const host = normalizeHostname(jobUrl.hostname);
  const pathname = jobUrl.pathname;

  if (host === "myworkdayjobs.com" || host.endsWith(".myworkdayjobs.com")) {
    return isWorkdayJobUrl(pathname);
  }
  if (host === "job-boards.greenhouse.io" || host === "boards.greenhouse.io") {
    return isGreenhouseJobUrl(pathname);
  }
  if (host === "jobs.ashbyhq.com") {
    return isAshbyJobUrl(pathname);
  }
  if (host.endsWith(".applicantpro.com")) {
    return isApplicantProJobUrl(pathname);
  }
  if (host.endsWith(".applytojob.com")) {
    return isApplyToJobUrl(pathname);
  }
  if (host.endsWith(".lever.co")) {
    return isLeverJobUrl(pathname);
  }

  return false;
}

function isExcludedTitle(title: string): boolean {
  const cleaned = cleanTitle(title);
  if (cleaned.length < 4) return true;
  return EXCLUDED_TITLE_PATTERNS.some((pattern) => pattern.test(cleaned));
}

function isGenericListingPath(pathname: string): boolean {
  const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (segments.length === 0) return true;

  const last = segments[segments.length - 1].toLowerCase();
  if (EXCLUDED_PATH_SEGMENTS.has(last) && segments.length <= 2) {
    return true;
  }

  return false;
}

function hasJobIdentifierSegment(segment: string): boolean {
  const value = segment.toLowerCase();
  if (EXCLUDED_PATH_SEGMENTS.has(value)) return false;
  if (/^\d{4,}$/.test(value)) return true;
  if (/^[a-f0-9]{8,}$/i.test(value)) return true;
  if (/^[a-f0-9-]{32,}$/i.test(value)) return true;
  if (/^[^\s/]+_(?:jr|r)\d+$/i.test(value)) return true;
  return false;
}

function isMarketingPath(pathname: string): boolean {
  const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (segments.length !== 1) return false;

  const segment = segments[0].toLowerCase();
  if (EXCLUDED_PATH_SEGMENTS.has(segment)) return true;
  return /^[a-z0-9]+(?:-[a-z0-9]+)+$/i.test(segment);
}

function isBlockedHostname(jobUrl: URL): boolean {
  const host = jobUrl.hostname.replace(/^www\./, "");
  if (host !== "linkedin.com") return false;
  return !jobUrl.pathname.includes("/jobs/view/");
}

function isIndividualJobUrl(jobUrl: URL, listingUrl: URL): boolean {
  if (isBlockedHostname(jobUrl)) return false;

  if (isJobDetailQueryUrl(jobUrl)) return true;

  if (isTrustedAtsHost(jobUrl.hostname) && isTrustedAtsJobUrl(jobUrl)) {
    return true;
  }

  if (!isSameOrigin(listingUrl, jobUrl)) return false;

  const jobPath = jobUrl.pathname.replace(/\/+$/, "");
  const listingPath = listingUrl.pathname.replace(/\/+$/, "");

  if (jobPath === listingPath) return false;
  if (isGenericListingPath(jobPath)) return false;
  if (isMarketingPath(jobPath)) return false;

  const segments = jobPath.split("/").filter(Boolean);
  const jobSegmentIndex = segments.findIndex((segment) =>
    JOB_PATH_SEGMENT.test(segment)
  );

  if (jobSegmentIndex < 0) return false;

  const afterJob = segments.slice(jobSegmentIndex + 1);
  if (afterJob.length === 0) return false;
  return afterJob.some((segment) => hasJobIdentifierSegment(segment));
}

function looksLikeJobPosting(
  url: string,
  title: string,
  listingUrl: string
): boolean {
  if (isExcludedTitle(title)) return false;

  try {
    return isIndividualJobUrl(new URL(url), new URL(listingUrl));
  } catch {
    return false;
  }
}

function extractTitle($: CheerioAPI, element: Parameters<CheerioAPI>[0]): string {
  const node = $(element);
  return cleanTitle(
    node.text() ||
      node.attr("title") ||
      node.attr("aria-label") ||
      node.find("h1,h2,h3,h4,h5,span").first().text() ||
      ""
  );
}

function addJobCandidate(
  jobs: Map<string, ScrapedJob>,
  listingUrl: string,
  rawUrl: string | undefined,
  title: string
) {
  if (!rawUrl) return;

  const normalized = normalizeUrl(listingUrl, rawUrl);
  if (!normalized) return;

  const canonical = canonicalizeJobUrl(normalized);
  const cleanedTitle = cleanTitle(title) || canonical;

  if (!looksLikeJobPosting(canonical, cleanedTitle, listingUrl)) return;

  const existing = jobs.get(canonical);
  if (!existing || cleanedTitle.length > existing.title.length) {
    jobs.set(canonical, { title: cleanedTitle, url: canonical });
  }
}

function extractJobsFromStructuredListings(
  $: CheerioAPI,
  listingUrl: string,
  jobs: Map<string, ScrapedJob>
): boolean {
  let foundStructured = false;

  for (const selector of JOB_LISTING_SELECTORS) {
    const matches = $(selector);
    if (matches.length === 0) continue;

    foundStructured = true;
    matches.each((_, element) => {
      addJobCandidate(jobs, listingUrl, $(element).attr("href"), extractTitle($, element));
    });
  }

  return foundStructured && jobs.size > 0;
}

function extractJobsFromLinks(
  $: CheerioAPI,
  listingUrl: string,
  jobs: Map<string, ScrapedJob>
) {
  const $scope = cheerio.load($.html());
  $scope(NON_JOB_LINK_SELECTORS).remove();

  $scope("a[href]").each((_, element) => {
    const href = $scope(element).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
    addJobCandidate(jobs, listingUrl, href, extractTitle($scope, element));
  });
}

function isSameSearchPath(candidate: URL, listingUrl: URL): boolean {
  return (
    candidate.pathname.replace(/\/+$/, "") ===
    listingUrl.pathname.replace(/\/+$/, "")
  );
}

function isCapitalOneSearchJobsPath(pathname: string): boolean {
  return CAPITAL_ONE_SEARCH_JOBS_PATH.test(pathname.replace(/\/+$/, ""));
}

function isPaginationUrl(candidate: URL, listingUrl: URL, currentUrl: URL): boolean {
  if (!isSameOrigin(listingUrl, candidate)) return false;

  if (isCapitalOneSearchJobsPath(candidate.pathname)) {
    const candidatePrefix = candidate.pathname.replace(/\/\d+$/, "");
    const listingPrefix = listingUrl.pathname.replace(/\/\d+$/, "");
    if (candidatePrefix === listingPrefix) return true;
  }

  if (isSameSearchPath(candidate, listingUrl)) {
    if (
      candidate.searchParams.has("page") ||
      candidate.searchParams.has("p") ||
      candidate.searchParams.has("offset") ||
      candidate.searchParams.has("startrow") ||
      candidate.searchParams.has("start") ||
      candidate.searchParams.has("from")
    ) {
      return true;
    }
  }

  if (/\/page\/\d+$/i.test(candidate.pathname)) return true;
  if (/\/jobs\/page\/\d+$/i.test(candidate.pathname)) return true;
  if (/\/careers\/page\/\d+$/i.test(candidate.pathname)) return true;

  const currentPage = currentUrl.searchParams.get("page") ?? "1";
  const candidatePage = candidate.searchParams.get("page");
  if (candidatePage && candidatePage !== currentPage) return true;

  return false;
}

function inferPaginationUrls(
  currentUrl: string,
  listingUrl: string,
  visited: Set<string>
): string[] {
  const pages: string[] = [];

  try {
    const current = new URL(currentUrl);
    const listing = new URL(listingUrl);

    if (isCapitalOneSearchJobsPath(current.pathname)) {
      const match = current.pathname.match(/\/(\d+)$/);
      if (match) {
        const nextPage = parseInt(match[1], 10) + 1;
        const next = new URL(current.href);
        next.pathname = current.pathname.replace(/\/\d+$/, `/${nextPage}`);
        pages.push(next.toString());
      }
    }

    if (
      isSameSearchPath(current, listing) &&
      (current.searchParams.has("q") || listing.searchParams.has("q"))
    ) {
      const startrow = parseInt(current.searchParams.get("startrow") ?? "0", 10);
      const next = new URL(current.href);
      next.searchParams.set("startrow", String(startrow + 25));
      pages.push(next.toString());
    }
  } catch {
    // ignore invalid URLs
  }

  return pages.filter((url) => !visited.has(canonicalizeJobUrl(url)));
}

function extractPaginationUrls(
  $: CheerioAPI,
  listingUrl: string,
  currentUrl: string,
  visited: Set<string>
): string[] {
  const pages = new Set<string>();
  const listing = new URL(listingUrl);
  const current = new URL(currentUrl);

  const considerLink = (href: string | undefined) => {
    if (!href) return;
    const normalized = normalizeUrl(currentUrl, href);
    if (!normalized || visited.has(canonicalizeJobUrl(normalized))) return;

    try {
      const candidate = new URL(normalized);
      if (isPaginationUrl(candidate, listing, current)) {
        pages.add(normalized);
      }
    } catch {
      // ignore invalid URLs
    }
  };

  $('a[rel="next"]').each((_, element) => {
    considerLink($(element).attr("href"));
  });

  $(
    '[class*="pagination"] a[href], nav[aria-label*="pagination" i] a[href], [class*="pager"] a[href]'
  ).each((_, element) => {
    const href = $(element).attr("href");
    const text = cleanTitle($(element).text());
    if (/^(next|›|»|→)$/i.test(text)) {
      considerLink(href);
      return;
    }
    if (/^page \d+$/i.test(text) || /^\d+$/.test(text)) {
      considerLink(href);
    }
  });

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;
    const normalized = normalizeUrl(currentUrl, href);
    if (!normalized) return;

    try {
      const candidate = new URL(normalized);
      if (isPaginationUrl(candidate, listing, current)) {
        considerLink(href);
      }
    } catch {
      // ignore invalid URLs
    }
  });

  return [...pages];
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

function parseJobsFromHtml(
  html: string,
  pageUrl: string,
  listingUrl: string,
  jobs: Map<string, ScrapedJob>,
  visitedPages: Set<string>
) {
  const $ = cheerio.load(html);
  const foundStructured = extractJobsFromStructuredListings($, listingUrl, jobs);

  if (!foundStructured || jobs.size === 0) {
    extractJobsFromLinks($, listingUrl, jobs);
  }

  const linkPages = extractPaginationUrls($, listingUrl, pageUrl, visitedPages);
  const inferredPages = inferPaginationUrls(pageUrl, listingUrl, visitedPages);
  return [...new Set([...linkPages, ...inferredPages])];
}

export async function scrapeStaticHtml(siteUrl: string): Promise<ScrapedJob[]> {
  const listingUrl = siteUrl;
  const jobs = new Map<string, ScrapedJob>();
  const visitedPages = new Set<string>();
  const queue: string[] = [siteUrl];

  while (queue.length > 0 && visitedPages.size < MAX_PAGES) {
    const pageUrl = queue.shift();
    if (!pageUrl) break;

    const pageKey = canonicalizeJobUrl(pageUrl);
    if (visitedPages.has(pageKey)) continue;
    visitedPages.add(pageKey);

    const html = await fetchHtml(pageUrl);
    const nextPages = parseJobsFromHtml(
      html,
      pageUrl,
      listingUrl,
      jobs,
      visitedPages
    );

    for (const nextPage of nextPages) {
      const nextKey = canonicalizeJobUrl(nextPage);
      if (!visitedPages.has(nextKey) && !queue.includes(nextPage)) {
        queue.push(nextPage);
      }
    }

    if (jobs.size >= MAX_JOBS) break;
  }

  return [...jobs.values()].slice(0, MAX_JOBS);
}

export function scrapeJobsFromHtmlForTest(
  html: string,
  pageUrl: string,
  listingUrl: string = pageUrl
): ScrapedJob[] {
  const jobs = new Map<string, ScrapedJob>();
  parseJobsFromHtml(html, pageUrl, listingUrl, jobs, new Set());
  return [...jobs.values()];
}
