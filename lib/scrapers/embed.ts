import { scrapeAshby } from "./ashby";
import { scrapeGreenhouse } from "./greenhouse";
import { scrapeLever } from "./lever";
import { scrapeWorkable } from "./workable";
import type { ScrapedJob } from "./types";
import { FETCH_TIMEOUT_MS, USER_AGENT } from "./utils";

const EMBEDDED_ASHBY = /jobs\.ashbyhq\.com\/([a-z0-9-]+)/i;
const EMBEDDED_GREENHOUSE_FOR =
  /(?:job-boards|boards)\.greenhouse\.io\/embed\/job_board(?:\/js)?[^"'\\\s>]*[?&]for=([a-z0-9-]+)/i;
const EMBEDDED_GREENHOUSE_PATH =
  /(?:job-boards|boards)\.greenhouse\.io\/([a-z0-9-]+)/i;
const EMBEDDED_LEVER =
  /(?:jobs\.)?lever\.co\/([a-z0-9-]+)(?:\/[a-f0-9-]{36})?/i;
const EMBEDDED_WORKABLE =
  /(?:apply|jobs)\.workable\.com\/(?:widgets\/)?([a-z0-9-]+)/i;

function extractGreenhouseBoardToken(html: string): string | null {
  const fromForParam = html.match(EMBEDDED_GREENHOUSE_FOR)?.[1];
  if (fromForParam) return fromForParam;

  const fromPath = html.match(EMBEDDED_GREENHOUSE_PATH)?.[1] ?? null;
  if (!fromPath || fromPath.toLowerCase() === "embed") return null;
  return fromPath;
}

export function extractEmbeddedBoards(html: string): {
  ashby: string | null;
  greenhouse: string | null;
  lever: string | null;
  workable: string | null;
} {
  const lever = html.match(EMBEDDED_LEVER)?.[1] ?? null;
  const workableRaw = html.match(EMBEDDED_WORKABLE)?.[1] ?? null;
  const workable =
    workableRaw && !["j", "widgets", "api"].includes(workableRaw.toLowerCase())
      ? workableRaw
      : null;

  return {
    ashby: html.match(EMBEDDED_ASHBY)?.[1] ?? null,
    greenhouse: extractGreenhouseBoardToken(html),
    lever: lever && lever.toLowerCase() !== "job-seeker-support" ? lever : null,
    workable,
  };
}

export async function fetchPageHtml(siteUrl: string): Promise<string> {
  const response = await fetch(siteUrl, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${siteUrl}`);
  }

  return response.text();
}

export async function scrapeEmbeddedAtsFromHtml(
  html: string
): Promise<ScrapedJob[]> {
  const { ashby, greenhouse, lever, workable } = extractEmbeddedBoards(html);

  if (ashby) {
    try {
      const jobs = await scrapeAshby(ashby);
      if (jobs.length > 0) return jobs;
    } catch {
      // Try other embedded boards.
    }
  }

  if (greenhouse) {
    try {
      const jobs = await scrapeGreenhouse(greenhouse);
      if (jobs.length > 0) return jobs;
    } catch {
      // Try other embedded boards.
    }
  }

  if (lever) {
    try {
      const jobs = await scrapeLever(lever);
      if (jobs.length > 0) return jobs;
    } catch {
      // Try other embedded boards.
    }
  }

  if (workable) {
    try {
      return await scrapeWorkable(workable);
    } catch {
      return [];
    }
  }

  return [];
}

export async function scrapeEmbeddedAts(siteUrl: string): Promise<ScrapedJob[]> {
  const html = await fetchPageHtml(siteUrl);
  return scrapeEmbeddedAtsFromHtml(html);
}

export function isBlockedPageHtml(html: string): boolean {
  // Avoid false positives from third-party script URLs that merely mention
  // Cloudflare challenge platform assets on otherwise-usable pages (e.g. Lever).
  if (/Performing security verification/i.test(html)) return true;
  if (/Enable JavaScript and cookies to continue/i.test(html)) return true;
  if (
    /cf-browser-verification/i.test(html) &&
    /cdn-cgi\/challenge-platform/i.test(html)
  ) {
    return true;
  }
  if (
    /<title[^>]*>\s*Just a moment\.\.\.\s*<\/title>/i.test(html) ||
    /<title[^>]*>\s*Attention Required!\s*\|\s*Cloudflare\s*<\/title>/i.test(html)
  ) {
    return true;
  }
  return false;
}
