import { scrapeAccenture, isAccentureJobsUrl } from "./accenture";
import { scrapeAdpCareerCenter, parseAdpCareerCenter } from "./adp";
import { scrapeAshby } from "./ashby";
import {
  getAshbyBoardName,
  getGreenhouseBoardToken,
  getLeverCompany,
  getWorkableAccount,
  isLinkedInJobsListing,
  isUltiproJobsUrl,
  isWorkdayJobsUrl,
  parseSiteUrl,
  shouldTryBrowserFallback,
} from "./detect";
import { scrapeEmbeddedAts } from "./embed";
import { scrapeGreenhouse } from "./greenhouse";
import { scrapeHarri, isHarriJobsUrl } from "./harri";
import { scrapeLever } from "./lever";
import { scrapeSaashr, parseSaashrBoard } from "./saashr";
import { scrapeShopify, isShopifyCareersUrl } from "./shopify";
import { scrapeUltipro } from "./ultipro";
import { scrapeWorkable } from "./workable";
import { scrapeWorkday } from "./workday";
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

  const leverCompany = getLeverCompany(url);
  if (leverCompany) {
    try {
      const jobs = await scrapeLever(leverCompany, url.searchParams);
      if (jobs.length > 0) return jobs;
    } catch {
      // Fall through to other scrapers.
    }
  }

  const workableAccount = getWorkableAccount(url);
  if (workableAccount) {
    try {
      const jobs = await scrapeWorkable(workableAccount);
      if (jobs.length > 0) return jobs;
    } catch {
      // Fall through to other scrapers.
    }
  }

  if (isWorkdayJobsUrl(url)) {
    try {
      const jobs = await scrapeWorkday(siteUrl);
      if (jobs.length > 0) return jobs;
    } catch {
      // Fall through to other scrapers.
    }
  }

  if (isUltiproJobsUrl(url)) {
    try {
      const jobs = await scrapeUltipro(siteUrl);
      if (jobs.length > 0) return jobs;
      if ([...url.searchParams.keys()].some((key) => /^f\d+$/i.test(key))) {
        const unfiltered = new URL(siteUrl);
        for (const key of [...unfiltered.searchParams.keys()]) {
          if (/^f\d+$/i.test(key)) unfiltered.searchParams.delete(key);
        }
        const fallback = await scrapeUltipro(unfiltered.toString());
        if (fallback.length > 0) return fallback;
      }
    } catch {
      // Fall through to other scrapers.
    }
  }

  if (parseSaashrBoard(url)) {
    try {
      const jobs = await scrapeSaashr(siteUrl);
      if (jobs.length > 0) return jobs;
    } catch {
      // Fall through to other scrapers.
    }
  }

  if (parseAdpCareerCenter(url)) {
    try {
      const jobs = await scrapeAdpCareerCenter(siteUrl);
      if (jobs.length > 0) return jobs;
    } catch {
      // Fall through to other scrapers.
    }
  }

  if (isAccentureJobsUrl(url)) {
    try {
      const jobs = await scrapeAccenture(siteUrl);
      if (jobs.length > 0) return jobs;
    } catch {
      // Fall through to other scrapers.
    }
  }

  if (isShopifyCareersUrl(url)) {
    try {
      const jobs = await scrapeShopify(siteUrl);
      if (jobs.length > 0) return jobs;
    } catch {
      // Fall through to other scrapers.
    }
  }

  if (isHarriJobsUrl(url)) {
    try {
      const jobs = await scrapeHarri(siteUrl);
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
