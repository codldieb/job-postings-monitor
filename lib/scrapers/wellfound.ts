import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { renderPageHtml } from "./browser";
import { isBlockedPageHtml } from "./embed";
import type { ScrapedJob } from "./types";
import { canonicalizeJobUrl } from "./utils";

const JOB_HREF = /\/jobs\/\d+-[^/?#]+/i;
const RECOMMENDED_HEADING = /^recommended jobs\b/i;
const LOCATION_PATTERN =
  /(?:remote only|onsite or remote|in office(?: - wfh flexibility)?)(?:\s*•\s*[^•$₹€£]+)?|\bremote\b(?:\s*•\s*[^•$₹€£]+)?/gi;

export function isWellfoundCompanyJobsUrl(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "");
  return host === "wellfound.com" && /^\/company\/[^/]+\/jobs\/?$/i.test(url.pathname);
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function elementTitle($: cheerio.CheerioAPI, element: AnyNode): string {
  const heading = cleanText($(element).find("h4").first().text());
  if (heading) return heading;
  return cleanText($(element).text());
}

function elementDepartment(
  $: cheerio.CheerioAPI,
  element: AnyNode
): string | undefined {
  const label = $(element)
    .find("h6")
    .toArray()
    .map((node) => cleanText($(node).text()))
    .find((text) => text && !/^new$/i.test(text) && !/^posted\b/i.test(text));
  return label || undefined;
}

function cardTextFor($: cheerio.CheerioAPI, element: AnyNode): string {
  let node = $(element);
  let cardText = "";
  for (let depth = 0; depth < 8; depth += 1) {
    node = node.parent();
    if (!node.length) break;
    const text = cleanText(node.text());
    if (text.length > 600) break;
    if (text.includes("•") || /remote|in office|onsite/i.test(text)) {
      cardText = text;
    }
  }
  return cardText;
}

function cardLocation(cardText: string): string | undefined {
  const matches = [...cardText.matchAll(LOCATION_PATTERN)].map((match) =>
    cleanText(match[0])
  );
  return matches.sort((a, b) => b.length - a.length)[0];
}

function cardPostedOn(cardText: string): string | undefined {
  const weeks = cardText.match(/posted\s+(\d+)\s+weeks?\s+ago/i);
  if (weeks) return `posted ${Number(weeks[1]) * 7} days ago`;
  const days = cardText.match(/posted\s+(\d+)\s+days?\s+ago/i);
  if (days) return `posted ${days[1]} days ago`;
  if (/posted\s+today/i.test(cardText)) return "posted today";
  if (/posted\s+yesterday/i.test(cardText)) return "posted yesterday";
  return undefined;
}

export function scrapeWellfoundJobsFromHtml(
  html: string,
  listingUrl: string
): ScrapedJob[] {
  const $ = cheerio.load(html);

  $("header, h1, h2, h3, h4").each((_, element) => {
    const text = cleanText($(element).text());
    if (text.length > 80 || !RECOMMENDED_HEADING.test(text)) return;
    $(element).parent().remove();
  });

  const jobs = new Map<string, ScrapedJob>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href || !JOB_HREF.test(href)) return;

    const title = elementTitle($, element);
    if (title.length < 4 || /^apply( now)?$/i.test(title)) return;

    let url: string;
    try {
      url = new URL(href, listingUrl).toString();
    } catch {
      return;
    }

    const key = canonicalizeJobUrl(url);
    if (jobs.has(key)) return;

    const details = cardTextFor($, element);
    const location = cardLocation(details);
    const department = elementDepartment($, element);
    const postedOn = cardPostedOn(details);

    jobs.set(key, {
      title,
      url,
      ...(department ? { department } : {}),
      ...(location ? { location } : {}),
      ...(postedOn ? { postedOn } : {}),
    });
  });

  return [...jobs.values()];
}

export async function scrapeWellfound(siteUrl: string): Promise<ScrapedJob[]> {
  const html = await renderPageHtml(siteUrl);
  if (isBlockedPageHtml(html)) {
    throw new Error(`Blocked by bot protection (Cloudflare) fetching ${siteUrl}`);
  }

  return scrapeWellfoundJobsFromHtml(html, siteUrl);
}
