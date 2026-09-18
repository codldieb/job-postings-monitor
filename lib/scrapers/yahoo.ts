import type { ScrapedJob } from "./types";
import { scrapeWorkdayBoard } from "./workday";

const YAHOO_WORKDAY_BOARD = {
  origin: "https://ouryahoo.wd5.myworkdayjobs.com",
  tenant: "ouryahoo",
  site: "careers",
};

export function isYahooCareersUrl(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "");
  return host === "yahooinc.com" && /\/careers/i.test(url.pathname);
}

function parseFilterList(value: string | null): string[] {
  if (!value) return [];

  const decoded = value.replace(/^"+|"+$/g, "").trim();
  if (!decoded) return [];

  return [
    ...new Set(
      decoded
        .split(",")
        .map((part) => part.replace(/^"+|"+$/g, "").trim())
        .filter(Boolean)
    ),
  ];
}

export async function scrapeYahoo(siteUrl: string): Promise<ScrapedJob[]> {
  const url = new URL(siteUrl);
  if (!isYahooCareersUrl(url)) return [];

  const categories = parseFilterList(url.searchParams.get("category"));
  const locations = parseFilterList(url.searchParams.get("location"));
  const facetNames: Record<string, string[]> = {};

  if (categories.length > 0) facetNames.jobFamilyGroup = categories;
  if (locations.length > 0) facetNames.Location_Country = locations;

  return scrapeWorkdayBoard(YAHOO_WORKDAY_BOARD, { facetNames });
}
