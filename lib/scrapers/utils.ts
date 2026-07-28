import { createHash } from "crypto";

export const MAX_JOBS = 500;
export const FETCH_TIMEOUT_MS = 30000;
export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export function canonicalizeJobUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";
  const path = parsed.pathname.replace(/\/+$/, "") || "/";
  parsed.pathname = path;
  return parsed.toString();
}

export function createJobId(siteId: string, url: string): string {
  return createHash("sha256")
    .update(`${siteId}:${canonicalizeJobUrl(url)}`)
    .digest("hex")
    .slice(0, 16);
}

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }

  return response.json() as Promise<T>;
}
