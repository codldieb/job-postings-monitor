import { createHash } from "crypto";
import { Agent, fetch as undiciFetch } from "undici";

export const MAX_JOBS = 500;
export const FETCH_TIMEOUT_MS = 30000;
export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const httpDispatcher = new Agent({ maxHeaderSize: 256 * 1024 });

export async function fetchText(url: string, accept: string): Promise<Response> {
  return undiciFetch(url, {
    dispatcher: httpDispatcher,
    headers: {
      "User-Agent": USER_AGENT,
      Accept: accept,
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  }) as unknown as Promise<Response>;
}

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
  const response = await fetchText(url, "application/json");

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }

  return response.json() as Promise<T>;
}
