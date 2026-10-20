import * as cheerio from "cheerio";
import type { ScrapedJob } from "./types";
import { scrapeAshby } from "./ashby";
import { extractEmbeddedBoards, fetchPageHtml } from "./embed";
import { canonicalizeJobUrl, MAX_JOBS } from "./utils";

const ROLE_ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const ROLE_PATH = /\/company\/careers\/roles\/[0-9a-f-]{36}$/i;

export function webflowRoleId(jobUrl: string): string | null {
  const match = jobUrl.match(ROLE_ID);
  return match ? match[0].toLowerCase() : null;
}

export function webflowRoleUrl(roleId: string): string {
  return `https://webflow.com/company/careers/roles/${roleId}`;
}

export function isWebflowCareersUrl(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "");
  return (
    host === "webflow.com" && /\/company\/careers\/roles\/?$/i.test(url.pathname)
  );
}

export function isWebflowRoleUrl(jobUrl: string): boolean {
  try {
    const url = new URL(jobUrl);
    const host = url.hostname.replace(/^www\./, "");
    return host === "webflow.com" && ROLE_PATH.test(url.pathname);
  } catch {
    return false;
  }
}

function formatWebflowLocation(
  places: string[],
  employment: string
): string | undefined {
  const unique = [
    ...new Set(places.map((place) => place.trim()).filter(Boolean)),
  ];
  const place = unique.join("; ");
  const workplace = employment.trim();

  if (!place) return workplace || undefined;
  if (!workplace || place.toLowerCase().includes(workplace.toLowerCase())) {
    return place;
  }
  if (/^(remote|hybrid|on-?site)$/i.test(workplace)) {
    return `${place} (${workplace})`;
  }
  return place;
}

export function scrapeWebflowJobsFromHtml(
  html: string,
  listingUrl: string
): ScrapedJob[] {
  const $ = cheerio.load(html);
  const jobs = new Map<string, ScrapedJob>();

  $("[data-job='group']").each((_, group) => {
    const department =
      $(group).find("[data-job='label']").first().text().replace(/\s+/g, " ").trim() ||
      undefined;

    $(group)
      .find("[data-job='item-wrap']")
      .each((__, item) => {
        if (jobs.size >= MAX_JOBS) return;

        const card = $(item);
        const title =
          card.find("[data-job='title']").first().text().replace(/\s+/g, " ").trim() ||
          card.find("[data-cta-text]").first().attr("data-cta-text")?.trim() ||
          "";
        const href = card.find("a[href]").first().attr("href");
        if (!title || !href || /^view job description$/i.test(title)) return;

        let url: string;
        try {
          url = canonicalizeJobUrl(new URL(href, listingUrl).toString());
        } catch {
          return;
        }

        if (!isWebflowRoleUrl(url) || jobs.has(url)) return;

        const places = card
          .find("[data-job='location-span']")
          .map((___, element) => $(element).text())
          .get();
        const employment = card
          .find("[data-job='employment']")
          .first()
          .text()
          .replace(/\s+/g, " ")
          .trim();
        const location = formatWebflowLocation(places, employment);

        jobs.set(url, {
          title,
          url,
          ...(department ? { department } : {}),
          ...(location ? { location } : {}),
        });
      });
  });

  return [...jobs.values()];
}

function withStableRoleUrl(job: ScrapedJob): ScrapedJob {
  const roleId = webflowRoleId(job.url);
  if (!roleId) return job;
  return { ...job, url: webflowRoleUrl(roleId) };
}

export async function scrapeWebflow(siteUrl: string): Promise<ScrapedJob[]> {
  const url = new URL(siteUrl);
  if (!isWebflowCareersUrl(url)) return [];

  const html = await fetchPageHtml(siteUrl);
  const fromCards = scrapeWebflowJobsFromHtml(html, siteUrl);
  if (fromCards.length > 0) return fromCards.map(withStableRoleUrl);

  // The careers index now redirects to the Ashby board. Keep the original
  // webflow.com role URL so postings found before that move stay the same job.
  const board = extractEmbeddedBoards(html).ashby;
  if (!board) return [];

  const jobs = await scrapeAshby(board);
  return jobs.slice(0, MAX_JOBS).map(withStableRoleUrl);
}
