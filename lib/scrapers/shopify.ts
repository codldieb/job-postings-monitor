import type { ScrapedJob } from "./types";
import { fetchPageHtml } from "./embed";
import { MAX_JOBS } from "./utils";

const SHOPIFY_JOB_PATTERN =
  /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\\",\\"([A-Z][^\\"]{3,160})\\",\\"(?:jobId|Published|\d{4}-\d{2}-\d{2})/g;

const SHOPIFY_NON_TITLE =
  /^(Published|departmentName|teamName|locationName|locationExternalName|isListed|Full time|Pipeline|Template|Group|Scope|Discipline|Subdiscipline|Job Type|Time Type|Enable Referrals for Job|Recruiter|Hiring Manager)$/i;

export function isShopifyCareersUrl(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "");
  return host === "shopify.com" && /\/careers/i.test(url.pathname);
}

export function scrapeShopifyJobsFromHtml(html: string): ScrapedJob[] {
  const referencedIds = new Set(
    [...html.matchAll(/careers\?ashby_jid=([a-f0-9-]{36})/gi)].map(
      (match) => match[1]
    )
  );
  const jobs = new Map<string, ScrapedJob>();

  for (const match of html.matchAll(SHOPIFY_JOB_PATTERN)) {
    const id = match[1];
    const title = match[2]?.trim();
    if (!id || !title) continue;
    if (SHOPIFY_NON_TITLE.test(title)) continue;
    if (/^[a-f0-9-]{36}$/i.test(title)) continue;
    if (referencedIds.size > 0 && !referencedIds.has(id)) continue;

    jobs.set(id, {
      title,
      url: `https://www.shopify.com/careers?ashby_jid=${id}`,
    });
    if (jobs.size >= MAX_JOBS) break;
  }

  // Fallback: title may sit between the Ashby id and another UUID/date without jobId.
  if (jobs.size === 0 || (referencedIds.size > 0 && jobs.size < referencedIds.size / 3)) {
    for (const id of referencedIds) {
      if (jobs.has(id)) continue;
      const nearby = html.match(
        new RegExp(
          `${id}\\\\",\\\\"([A-Z][^\\\\"]{3,160})\\\\"`
        )
      );
      const title = nearby?.[1]?.trim();
      if (!title || SHOPIFY_NON_TITLE.test(title) || /^[a-f0-9-]{36}$/i.test(title)) {
        continue;
      }
      jobs.set(id, {
        title,
        url: `https://www.shopify.com/careers?ashby_jid=${id}`,
      });
      if (jobs.size >= MAX_JOBS) break;
    }
  }

  return [...jobs.values()];
}

export async function scrapeShopify(siteUrl: string): Promise<ScrapedJob[]> {
  const url = new URL(siteUrl);
  if (!isShopifyCareersUrl(url)) return [];
  const html = await fetchPageHtml(siteUrl);
  return scrapeShopifyJobsFromHtml(html);
}
