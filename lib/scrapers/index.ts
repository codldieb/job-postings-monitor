import { scrapeAshby } from "./ashby";
import {
  getAshbyBoardName,
  getGreenhouseBoardToken,
  isLinkedInJobsListing,
  parseSiteUrl,
  shouldTryBrowserFallback,
} from "./detect";
import { scrapeEmbeddedAts } from "./embed";
import { scrapeGreenhouse } from "./greenhouse";
import { scrapeWithBrowser } from "./browser";
import { scrapeStaticHtml } from "./static";
import type { ScrapedJob } from "./types";

export async function scrapeJobPostings(siteUrl: string): Promise<ScrapedJob[]> {
  const url = parseSiteUrl(siteUrl);

  if (isLinkedInJobsListing(url)) {
    throw new Error(
      "LinkedIn job listings cannot be scraped. Add the company's direct career page instead (for ITS, use https://testsys.applytojob.com/apply)."
    );
  }

  const greenhouseToken = getGreenhouseBoardToken(url);
  if (greenhouseToken) {
    try {
      const jobs = await scrapeGreenhouse(greenhouseToken);
      if (jobs.length > 0) return jobs;
    } catch {
      // Fall through to other scrapers.
    }
  }

  const ashbyBoard = getAshbyBoardName(url);
  if (ashbyBoard) {
    try {
      const jobs = await scrapeAshby(ashbyBoard);
      if (jobs.length > 0) return jobs;
    } catch {
      // Fall through to other scrapers.
    }
  }

  let staticFailed = false;

  try {
    const staticJobs = await scrapeStaticHtml(siteUrl);
    if (staticJobs.length > 0) return staticJobs;
  } catch {
    staticFailed = true;
  }

  try {
    const embeddedJobs = await scrapeEmbeddedAts(siteUrl);
    if (embeddedJobs.length > 0) return embeddedJobs;
  } catch {
    // Fall through to browser scraper.
  }

  if (shouldTryBrowserFallback(url) || staticFailed) {
    return await scrapeWithBrowser(siteUrl);
  }

  return [];
}

export type { ScrapedJob, ScrapeMethod } from "./types";
export { canonicalizeJobUrl, createJobId } from "./utils";
export { scrapeJobsFromHtmlForTest } from "./static";
