export interface ScrapedJob {
  title: string;
  url: string;
}

export type ScrapeMethod =
  | "api-greenhouse"
  | "api-ashby"
  | "static"
  | "browser";
