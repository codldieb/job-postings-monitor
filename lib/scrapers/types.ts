export interface ScrapedJob {
  title: string;
  url: string;
  department?: string;
  team?: string;
  location?: string;
  postedOn?: string;
}

export type ScrapeMethod =
  | "api-greenhouse"
  | "api-ashby"
  | "static"
  | "browser";
