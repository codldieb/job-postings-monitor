import type { Page } from "playwright";
import type { ScrapedJob } from "./types";
import {
  isBlockedPageHtml,
  scrapeEmbeddedAtsFromHtml,
} from "./embed";
import { scrapeJobsFromHtmlForTest } from "./static";
import { canonicalizeJobUrl } from "./utils";

const BROWSER_TIMEOUT_MS = 60000;
const RENDER_WAIT_MS = 10000;

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const JOB_LINK_SELECTORS = [
  "[data-automation-id='jobTitle']",
  "a[href*='JobDetail']",
  "a[href*='Job-Description']",
  "a[href*='OpportunityDetail']",
  ".opening a[href]",
  ".posting-title a[href]",
  "a[href*='/job/']",
  "a[href*='/jobs/']",
  "a[href*='myworkdayjobs.com']",
  "a[href*='greenhouse.io']",
  "a[href*='ashbyhq.com']",
  "a[href*='applytojob.com']",
  "a[href*='lever.co']",
  "a[href*='workable.com']",
  "a[href*='ultipro.com']",
  "a[href*='workforcenow.adp.com']",
  "a[href*='gh_jid=']",
  "a[href*='folderId=']",
  "a[data-ph-at-id='job-link']",
  ".jobs-list a[href]",
  "[class*='job-card'] a[href]",
  "[class*='JobCard'] a[href]",
].join(", ");

async function extractDomJobLinks(
  page: Page,
  listingUrl: string
): Promise<ScrapedJob[]> {
  const rawLinks = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll(
        [
          "a[href*='JobDetail']",
          "a[href*='Job-Description']",
          "a[href*='jobId=']",
          "a[href*='folderId=']",
          "a[href*='OpportunityDetail']",
          "a[href*='/jobs/']",
          "a[href*='/job/']",
          "a[href*='applytojob.com/apply/']",
          "a[href*='jobs.lever.co/']",
          "a[href*='workable.com']",
          "a[href*='myworkdayjobs.com']",
          "a[href*='ultipro.com']",
          "a[href*='workforcenow.adp.com']",
          "a[href*='gh_jid=']",
          "a[data-ph-at-id='job-link']",
          "a[href*='/careers/']",
        ].join(", ")
      )
    )
      .map((anchor) => ({
        href: (anchor as HTMLAnchorElement).href,
        title: anchor.textContent?.replace(/\s+/g, " ").trim() ?? "",
      }))
      .filter(
        ({ href, title }) =>
          title.length >= 4 && !/^apply( now)?$/i.test(title) && href.length > 0
      )
  );

  const jobs = new Map<string, ScrapedJob>();

  for (const link of rawLinks) {
    const validated = scrapeJobsFromHtmlForTest(
      `<a href="${link.href.replace(/"/g, "&quot;")}">${link.title}</a>`,
      listingUrl,
      listingUrl
    );

    for (const job of validated) {
      const key = canonicalizeJobUrl(job.url);
      if (!jobs.has(key)) jobs.set(key, job);
    }
  }

  return [...jobs.values()];
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    throw new Error(
      "Playwright is not installed. Run: npm install && npx playwright install chromium"
    );
  }
}

export async function scrapeWithBrowser(siteUrl: string): Promise<ScrapedJob[]> {
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  try {
    const context = await browser.newContext({
      userAgent: BROWSER_USER_AGENT,
      viewport: { width: 1365, height: 900 },
      locale: "en-US",
    });
    const page = await context.newPage();

    await page.goto(siteUrl, {
      waitUntil: "domcontentloaded",
      timeout: BROWSER_TIMEOUT_MS,
    });

    await page
      .getByRole("button", { name: /accept all|accept cookies|i agree/i })
      .first()
      .click({ timeout: 3000 })
      .catch(() => undefined);

    await page.waitForSelector(JOB_LINK_SELECTORS, { timeout: 20000 }).catch(
      () => undefined
    );

    await page.waitForTimeout(RENDER_WAIT_MS);

    const html = await page.content();
    const pageUrl = page.url();

    if (isBlockedPageHtml(html)) {
      throw new Error(
        `Blocked by bot protection (Cloudflare) fetching ${siteUrl}`
      );
    }

    const embeddedJobs = await scrapeEmbeddedAtsFromHtml(html);
    if (embeddedJobs.length > 0) return embeddedJobs;

    const domJobs = await extractDomJobLinks(page, siteUrl);
    if (domJobs.length > 0) return domJobs;

    const scraped = scrapeJobsFromHtmlForTest(html, pageUrl, siteUrl);
    if (scraped.length > 0) return scraped;

    return [];
  } finally {
    await browser.close();
  }
}
