import type { ScrapedJob } from "./types";
import { FETCH_TIMEOUT_MS, MAX_JOBS, USER_AGENT } from "./utils";

interface AdpCodeField {
  shortName?: string;
  codeValue?: string;
}

interface AdpJobRequisition {
  itemID?: string;
  requisitionTitle?: string;
  workLevelCode?: AdpCodeField;
  requisitionLocations?: Array<{
    nameCode?: AdpCodeField;
    address?: {
      cityName?: string;
      countrySubdivisionLevel1?: AdpCodeField;
      countryCode?: string;
    };
  }>;
  clientRequisitionID?: string;
}

interface AdpJobsResponse {
  jobRequisitions?: AdpJobRequisition[];
  meta?: { totalNumber?: number };
}

export function parseAdpCareerCenter(url: URL): {
  origin: string;
  cid: string;
  ccId: string;
  lang: string;
} | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "workforcenow.adp.com") return null;

  const cid = url.searchParams.get("cid");
  const ccId = url.searchParams.get("ccId");
  if (!cid || !ccId) return null;

  return {
    origin: url.origin,
    cid,
    ccId,
    lang: url.searchParams.get("lang") ?? "en_US",
  };
}

function formatAdpLocation(job: AdpJobRequisition): string | undefined {
  const labels = (job.requisitionLocations ?? [])
    .map((location) => {
      if (location.nameCode?.shortName) return location.nameCode.shortName;
      const city = location.address?.cityName;
      const state =
        location.address?.countrySubdivisionLevel1?.codeValue ||
        location.address?.countrySubdivisionLevel1?.shortName;
      const country = location.address?.countryCode;
      return [city, state, country].filter(Boolean).join(", ");
    })
    .filter(Boolean);

  return labels.length > 0 ? [...new Set(labels)].join("; ") : undefined;
}

export async function scrapeAdpCareerCenter(
  siteUrl: string
): Promise<ScrapedJob[]> {
  const parsed = parseAdpCareerCenter(new URL(siteUrl));
  if (!parsed) return [];

  const apiUrl = new URL(
    "/mascsr/default/careercenter/public/events/staffing/v1/job-requisitions",
    parsed.origin
  );
  apiUrl.searchParams.set("cid", parsed.cid);
  apiUrl.searchParams.set("ccId", parsed.ccId);
  apiUrl.searchParams.set("lang", parsed.lang);
  apiUrl.searchParams.set("selectedMenuKey", "CareerCenter");
  apiUrl.searchParams.set("timeStamp", String(Date.now()));

  const response = await fetch(apiUrl, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      Referer: siteUrl,
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ADP career center jobs`);
  }

  const data = (await response.json()) as AdpJobsResponse;
  return (data.jobRequisitions ?? []).slice(0, MAX_JOBS).map((job) => {
    const jobId = job.itemID ?? job.clientRequisitionID ?? "";
    const detail = new URL(
      "/mascsr/default/mdf/recruitment/recruitment.html",
      parsed.origin
    );
    detail.searchParams.set("cid", parsed.cid);
    detail.searchParams.set("ccId", parsed.ccId);
    detail.searchParams.set("lang", parsed.lang);
    if (jobId) detail.searchParams.set("jobId", jobId.split("_")[0] ?? jobId);

    return {
      title: job.requisitionTitle ?? "Untitled role",
      url: detail.toString(),
      location: formatAdpLocation(job),
    };
  }).filter((job) => job.title && job.url.includes("jobId="));
}
