export function parseSiteUrl(siteUrl: string): URL {
  return new URL(siteUrl);
}

export function getGreenhouseBoardToken(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "job-boards.greenhouse.io" && host !== "boards.greenhouse.io") {
    return null;
  }

  const [boardToken] = url.pathname.split("/").filter(Boolean);
  return boardToken ?? null;
}

export function getAshbyBoardName(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "jobs.ashbyhq.com") return null;

  const [boardName] = url.pathname.split("/").filter(Boolean);
  return boardName ?? null;
}

export function isLinkedInJobsListing(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "");
  return host === "linkedin.com" && url.pathname.includes("/jobs");
}

export function shouldTryBrowserFallback(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "");

  if (host.endsWith(".applicantpro.com")) return true;
  if (host.endsWith(".applytojob.com")) return true;
  if (host.endsWith(".myworkdayjobs.com") || host === "myworkdayjobs.com") {
    return true;
  }
  if (host === "jobs.slalom.com") return true;
  if (host.endsWith(".telusdigital.com") || host === "jobs.telusdigital.com") {
    return true;
  }
  if (host.endsWith(".ttcportals.com")) return true;
  if (host.includes("workday")) return true;
  if (host.endsWith(".telus.com") && /\/careers/i.test(url.pathname)) {
    return true;
  }
  if (/\/careers/i.test(url.pathname)) return true;

  return false;
}
