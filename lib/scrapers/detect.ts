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

export function getLeverCompany(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "jobs.lever.co") return null;

  const [company] = url.pathname.split("/").filter(Boolean);
  return company ?? null;
}

export function getWorkableAccount(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "apply.workable.com" && host !== "jobs.workable.com") {
    return null;
  }

  const [account] = url.pathname.split("/").filter(Boolean);
  if (!account || account.toLowerCase() === "j") return null;
  return account;
}

export function isWorkdayJobsUrl(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "");
  return host === "myworkdayjobs.com" || host.endsWith(".myworkdayjobs.com");
}

export function isUltiproJobsUrl(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "");
  return host === "recruiting.ultipro.com" || host.endsWith(".ultipro.com");
}

export function isLinkedInJobsListing(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "");
  return host === "linkedin.com" && url.pathname.includes("/jobs");
}

export function shouldTryBrowserFallback(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "");

  if (host.endsWith(".applicantpro.com")) return true;
  if (host.endsWith(".applytojob.com")) return true;
  if (isWorkdayJobsUrl(url)) return true;
  if (host === "jobs.slalom.com") return true;
  if (host.endsWith(".avature.net")) return true;
  if (host === "workforcenow.adp.com") return true;
  if (host.endsWith(".saashr.com") || host.includes("saashr.com")) return true;
  if (host === "harri.com" || host.endsWith(".harri.com")) return true;
  if (host.endsWith(".phenompeople.com") || host.includes("phenom")) return true;
  if (host.endsWith(".telusdigital.com") || host === "jobs.telusdigital.com") {
    return true;
  }
  if (host.endsWith(".ttcportals.com")) return true;
  if (host.includes("workday")) return true;
  if (host.endsWith(".telus.com") && /\/careers/i.test(url.pathname)) {
    return true;
  }
  if (/\/careers|\/jobsearch|\/search-results/i.test(url.pathname)) return true;

  return false;
}
