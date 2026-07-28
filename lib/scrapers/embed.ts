import { scrapeAshby } from "./ashby";
import { scrapeGreenhouse } from "./greenhouse";
import type { ScrapedJob } from "./types";
import { FETCH_TIMEOUT_MS, USER_AGENT } from "./utils";

const EMBEDDED_ASHBY = /jobs\.ashbyhq\.com\/([a-z0-9-]+)/i;
const EMBEDDED_GREENHOUSE =
  /(?:job-boards|boards)\.greenhouse\.io\/([a-z0-9-]+)/i;

export function extractEmbeddedBoards(html: string): {
  ashby: string | null;
  greenhouse: string | null;
} {
  return {
    ashby: html.match(EMBEDDED_ASHBY)?.[1] ?? null,
    greenhouse: html.match(EMBEDDED_GREENHOUSE)?.[1] ?? null,
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
  const { ashby, greenhouse } = extractEmbeddedBoards(html);

  if (ashby) {
    try {
      const jobs = await scrapeAshby(ashby);
      if (jobs.length > 0) return jobs;
    } catch {
      // Try greenhouse if ashby fails.
    }
  }

  if (greenhouse) {
    try {
      return await scrapeGreenhouse(greenhouse);
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
  return /cf-browser-verification|challenge-platform|Performing security verification|Enable JavaScript and cookies to continue/i.test(
    html
  );
}
