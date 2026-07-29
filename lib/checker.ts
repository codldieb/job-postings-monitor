import {
  appendCheckLog,
  archiveStaleJobsForSite,
  getArchivedJobs,
  getJobs,
  getSites,
  restoreArchivedJob,
  updateSiteLastChecked,
  upsertJobs,
} from "./db";
import { createJobId, scrapeJobPostings } from "./scraper";
import type { CheckLogEntry, CheckProgressEvent, CheckResult, JobPosting } from "./types";

export async function runDailyCheck(
  onProgress?: (event: CheckProgressEvent) => void,
  options?: { signal?: AbortSignal }
): Promise<CheckLogEntry> {
  const sites = await getSites();
  const existingJobs = await getJobs();
  const archivedJobs = await getArchivedJobs();
  const existingIds = new Set(existingJobs.map((job) => job.id));
  const archivedIds = new Set(archivedJobs.map((job) => job.id));
  const startedAt = new Date().toISOString();
  const results: CheckResult[] = [];
  let totalNewJobs = 0;
  let totalJobsArchived = 0;
  let cancelled = false;

  onProgress?.({ type: "start", totalSites: sites.length });

  for (let index = 0; index < sites.length; index++) {
    if (options?.signal?.aborted) {
      cancelled = true;
      break;
    }

    const site = sites[index];
    const checkedAt = new Date().toISOString();

    onProgress?.({
      type: "site-start",
      index: index + 1,
      totalSites: sites.length,
      siteId: site.id,
      siteName: site.name,
    });

    try {
      const scraped = await scrapeJobPostings(site.url);
      const newJobs: JobPosting[] = [];

      for (const item of scraped) {
        const id = createJobId(site.id, item.url);

        if (existingIds.has(id)) continue;

        if (archivedIds.has(id)) {
          const restored = await restoreArchivedJob(id, {
            title: item.title,
            url: item.url,
            siteName: site.name,
            department: item.department,
            team: item.team,
            location: item.location,
          });
          if (restored) {
            newJobs.push(restored);
            existingIds.add(id);
            archivedIds.delete(id);
          }
          continue;
        }

        const job: JobPosting = {
          id,
          siteId: site.id,
          siteName: site.name,
          title: item.title,
          url: item.url,
          department: item.department,
          team: item.team,
          location: item.location,
          firstSeenAt: checkedAt,
          isNew: true,
        };
        newJobs.push(job);
        existingIds.add(id);
      }

      if (newJobs.length > 0) {
        await upsertJobs(newJobs);
        totalNewJobs += newJobs.length;
      }

      const scrapedIds = new Set(
        scraped.map((item) => createJobId(site.id, item.url))
      );
      const siteHadJobs = existingJobs.some((job) => job.siteId === site.id);
      let archivedJobsCount = 0;
      if (scraped.length > 0 || !siteHadJobs) {
        archivedJobsCount = await archiveStaleJobsForSite(
          site.id,
          scrapedIds,
          checkedAt
        );
        totalJobsArchived += archivedJobsCount;
      }

      await updateSiteLastChecked(site.id, checkedAt);

      results.push({
        siteId: site.id,
        siteName: site.name,
        newJobs,
        archivedJobsCount,
        totalFound: scraped.length,
        checkedAt,
      });

      onProgress?.({
        type: "site-complete",
        index: index + 1,
        totalSites: sites.length,
        siteId: site.id,
        siteName: site.name,
        newJobsCount: newJobs.length,
      });
    } catch (error) {
      await updateSiteLastChecked(site.id, checkedAt);
      const message =
        error instanceof Error ? error.message : "Unknown error";

      results.push({
        siteId: site.id,
        siteName: site.name,
        newJobs: [],
        archivedJobsCount: 0,
        totalFound: 0,
        checkedAt,
        error: message,
      });

      onProgress?.({
        type: "site-complete",
        index: index + 1,
        totalSites: sites.length,
        siteId: site.id,
        siteName: site.name,
        newJobsCount: 0,
        error: message,
      });
    }
  }

  const entry: CheckLogEntry = {
    id: crypto.randomUUID(),
    startedAt,
    completedAt: new Date().toISOString(),
    sitesChecked: results.length,
    totalSites: sites.length,
    newJobsFound: totalNewJobs,
    jobsArchived: totalJobsArchived,
    results,
    cancelled: cancelled || undefined,
  };

  await appendCheckLog(entry);
  return entry;
}
