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

interface WorkdayJobPostingInfo {
  title?: string;
  jobDescription?: string;
  location?: string;
  jobRequisitionLocation?: { descriptor?: string };
}

interface WorkdayJobResponse {
  jobPostingInfo?: WorkdayJobPostingInfo;
}

function parseWorkdayJobUrl(
  jobUrl: string
): { apiBase: string; tenant: string; site: string; jobSlug: string } | null {
  try {
    const url = new URL(jobUrl);
    const host = url.hostname.replace(/^www\./, "");
    if (host !== "myworkdayjobs.com" && !host.endsWith(".myworkdayjobs.com")) {
      return null;
    }

    const tenantMatch = host.match(/^([^.]+)\.wd\d+\.myworkdayjobs\.com$/i);
    if (!tenantMatch) return null;

    const parts = url.pathname.split("/").filter(Boolean);
    const jobIndex = parts.findIndex((segment) => segment.toLowerCase() === "job");
    if (jobIndex < 1) return null;

    const jobSlug = parts[parts.length - 1]?.replace(/\.html$/i, "");
    if (!jobSlug) return null;

    let siteIndex = jobIndex - 1;
    while (siteIndex >= 0 && /^[a-z]{2}-[A-Z]{2}$/i.test(parts[siteIndex] ?? "")) {
      siteIndex -= 1;
    }

    const site = parts[siteIndex];
    if (!site) return null;

    return {
      apiBase: url.origin,
      tenant: tenantMatch[1],
      site,
      jobSlug,
    };
  } catch {
    return null;
  }
}

function formatWorkdayLocation(info: WorkdayJobPostingInfo): string | undefined {
  const location =
    info.jobRequisitionLocation?.descriptor?.trim() ||
    info.location?.trim();
  return location || undefined;
}

async function fetchWorkdayDetails(jobUrl: string): Promise<JobDetails | null> {
  const parsed = parseWorkdayJobUrl(jobUrl);
  if (!parsed) return null;

  const data = await fetchJson<WorkdayJobResponse>(
    `${parsed.apiBase}/wday/cxs/${encodeURIComponent(parsed.tenant)}/${encodeURIComponent(parsed.site)}/job/${encodeURIComponent(parsed.jobSlug)}`
  );

  const descriptionHtml = data.jobPostingInfo?.jobDescription?.trim();
  if (!descriptionHtml) return null;

  return {
    descriptionText: htmlToText(descriptionHtml),
    location: formatWorkdayLocation(data.jobPostingInfo ?? {}),
  };
}

interface MckessonPostalAddress {
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
}

interface MckessonJobPosting {
  description?: string;
  jobLocation?: { address?: MckessonPostalAddress }[];
}

function isMckessonJobUrl(jobUrl: string): boolean {
  try {
    const url = new URL(jobUrl);
    const host = url.hostname.replace(/^www\./, "");
    return host === "careers.mckesson.com" && /\/job\//i.test(url.pathname);
  } catch {
    return false;
  }
}

function formatMckessonLocation(
  jobLocation: MckessonJobPosting["jobLocation"]
): string | undefined {
  const parts: string[] = [];

  for (const place of jobLocation ?? []) {
    const address = place.address;
    if (!address) continue;

    if (address.addressCountry?.trim().toLowerCase() === "remote") {
      parts.push("Remote");
      continue;
    }

    const city = address.addressLocality?.trim();
    const region = address.addressRegion?.trim();
    if (city && region) {
      parts.push(`${city}, ${region}`);
    } else if (city) {
      parts.push(city);
    } else if (address.addressCountry?.trim()) {
      parts.push(address.addressCountry.trim());
    }
  }

  return parts.length > 0 ? [...new Set(parts)].join("; ") : undefined;
}

function extractJsonLdJobPosting(html: string): MckessonJobPosting | null {
  const $ = cheerio.load(html);

  for (const element of $("script[type='application/ld+json']").toArray()) {
    try {
      const raw = $(element).html()?.trim();
      if (!raw) continue;

      const data = JSON.parse(raw) as { "@type"?: string };
      if (data["@type"] === "JobPosting") {
        return data as MckessonJobPosting;
      }
    } catch {
      // ignore malformed JSON-LD blocks
    }
  }

  return null;
}

function extractMckessonDepartment(html: string): string | undefined {
  const match = html.match(
    /<meta\s+name="gtm_tbcn_jobcategory"\s+content="([^"]+)"/i
  );
  if (!match?.[1]?.trim()) return undefined;

  return match[1]
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

async function fetchMckessonDetails(jobUrl: string): Promise<JobDetails | null> {
  if (!isMckessonJobUrl(jobUrl)) return null;

  const html = await fetchHtml(jobUrl);
  const posting = extractJsonLdJobPosting(html);
  if (!posting?.description?.trim()) return null;

  return {
    descriptionText: htmlToText(posting.description),
    department: extractMckessonDepartment(html),
    location: formatMckessonLocation(posting.jobLocation),
  };
}

function isAvatureJobUrl(jobUrl: string): boolean {
  try {
    const url = new URL(jobUrl);
    if (url.hostname.replace(/^www\./, "") === "jobs.slalom.com") {
      return true;
    }

    return /\/JobDetail/i.test(url.pathname) && Boolean(url.searchParams.get("jobId"));
  } catch {
    return false;
  }
}

function formatAvatureLocations(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  const segments = trimmed
    .split(/(?<=[A-Z]{2})(?=[A-Z][A-Za-z])/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  return segments.length > 0 ? segments.join("; ") : trimmed;
}

function extractAvatureField($: cheerio.CheerioAPI, label: string): string | undefined {
  const normalizedLabel = label.trim().toLowerCase();
  let value: string | undefined;

  $(".article__content__view__field__label").each((_, element) => {
    const fieldLabel = $(element).text().replace(/\s+/g, " ").trim().toLowerCase();
    if (fieldLabel !== normalizedLabel) return;

    const fieldValue = $(element)
      .next(".article__content__view__field__value")
      .text()
      .replace(/\s+/g, " ")
      .trim();
    if (fieldValue) {
      value = fieldValue;
    }
  });

  return value;
}

function extractAvatureFieldHtml(
  $: cheerio.CheerioAPI,
  label: string
): string | undefined {
  const normalizedLabel = label.trim().toLowerCase();
  let value: string | undefined;

  $(".article__content__view__field__label").each((_, element) => {
    const fieldLabel = $(element).text().replace(/\s+/g, " ").trim().toLowerCase();
    if (fieldLabel !== normalizedLabel) return;

    const fieldValue = $(element)
      .next(".article__content__view__field__value")
      .html()
      ?.trim();
    if (fieldValue) {
      value = fieldValue;
    }
  });

  return value;
}

async function fetchAvatureDetails(jobUrl: string): Promise<JobDetails | null> {
  if (!isAvatureJobUrl(jobUrl)) return null;

  const html = await fetchHtml(jobUrl);
  const $ = cheerio.load(html);

  const descriptionHtml =
    extractAvatureFieldHtml($, "Job Description") ??
    extractAvatureFieldHtml($, "Description and Requirements");
  if (!descriptionHtml?.trim()) return null;

  const rawLocations = extractAvatureField($, "Locations");
  const businessFunction = extractAvatureField($, "Business Function");

  return {
    descriptionText: htmlToText(descriptionHtml),
    department: businessFunction,
    location: rawLocations ? formatAvatureLocations(rawLocations) : undefined,
  };
}

function removePageBoilerplate($: cheerio.CheerioAPI): void {
  $("script, style, noscript, nav, header, footer").remove();
  $(
    "footer, [role='contentinfo'], [class*='site-footer'], [class*='page-footer'], [class*='footer__'], [class*='footer-'], [class*='__footer']"
  ).remove();
  $(
    "[class*='legal'], [class*='disclaimer'], [class*='eeo'], [class*='cookie-banner'], [class*='cookie-consent']"
  ).remove();
}

function decodeHtmlEntities(html: string): string {
  if (!/&(?:lt|gt|amp|quot|#39|#x[0-9a-f]+|#\d+);/i.test(html)) {
    return html;
  }

  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)));
}

function htmlToText(html: string): string {
  const normalized = decodeHtmlEntities(html);
  const $ = cheerio.load(normalized);
  $("script, style, noscript, footer, nav, header").remove();
  $(
    "[class*='footer'], [class*='legal'], [class*='disclaimer'], [class*='eeo'], [class*='cookie']"
  ).remove();
  $("li, p, br, h1, h2, h3, h4").each((_, element) => {
    $(element).append(" ");
  });
  return cleanJobDescription($.text().replace(/\s+/g, " ").trim());
}

export function looksLikeHtml(text: string): boolean {
  return /<(?:p|ul|li|div|span|strong|h[1-6]|br|em)\b/i.test(text);
}

export function ensurePlainTextDescription(text: string): string {
  if (!text.trim()) return text;

  if (looksLikeHtml(text) || /&lt;(?:p|ul|li|div|span|strong|h[1-6])\b/i.test(text)) {
    return htmlToText(text);
  }

  return cleanJobDescription(text);
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

  removePageBoilerplate($);

  const selectors = [
    "[class*='job-description']",
    "[class*='JobDescription']",
    "[class*='posting-page']",
    "[class*='posting-details']",
    "[data-automation-id='jobPostingDescription']",
    ".article__content__view__field__value",
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

  const workday = await fetchWorkdayDetails(jobUrl).catch(() => null);
  if (workday) return workday;

  const mckesson = await fetchMckessonDetails(jobUrl).catch(() => null);
  if (mckesson) return mckesson;

  const avature = await fetchAvatureDetails(jobUrl).catch(() => null);
  if (avature) return avature;

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
