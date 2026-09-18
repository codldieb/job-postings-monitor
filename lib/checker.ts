import {
  appendCheckLog,
  archiveStaleJobsForSite,
  getArchivedJobs,
  getJobs,
  getSites,
  mergeJobs,
  restoreArchivedJob,
  updateSiteLastChecked,
} from "./db";
import {
  looksLikeRepost,
  postedAtIso,
  isPostedSinceLastCheck,
  shouldMarkRestoredAsNew,
} from "./jobs/posted";
import { createJobId, scrapeJobPostings } from "./scraper";
import type { CheckLogEntry, CheckProgressEvent, CheckResult, JobPosting } from "./types";

const INCOMPLETE_SCRAPE_ARCHIVE_RATIO = 0.4;
const INCOMPLETE_SCRAPE_MIN_EXISTING = 8;

export async function runDailyCheck(
  onProgress?: (event: CheckProgressEvent) => void,
  options?: { signal?: AbortSignal }
): Promise<CheckLogEntry> {
  const sites = await getSites();
  const existingJobs = await getJobs();
  const archivedJobs = await getArchivedJobs();
  const existingById = new Map(existingJobs.map((job) => [job.id, job]));
  const existingIds = new Set(existingById.keys());
  const archivedById = new Map(archivedJobs.map((job) => [job.id, job]));
  const archivedIds = new Set(archivedById.keys());
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
      const jobsToMerge: JobPosting[] = [];
      const now = new Date(checkedAt);

      for (const item of scraped) {
        const id = createJobId(site.id, item.url);
        const postedAt = postedAtIso(item.postedOn, now);
        const listingUpdates = {
          title: item.title,
          url: item.url,
          siteName: site.name,
          ...(item.department ? { department: item.department } : {}),
          ...(item.team ? { team: item.team } : {}),
          ...(item.location ? { location: item.location } : {}),
          ...(postedAt ? { postedAt } : {}),
        };

        const existingJob = existingById.get(id);
        if (existingJob) {
          const updated: JobPosting = {
            ...existingJob,
            ...listingUpdates,
            postedAt: postedAt ?? existingJob.postedAt,
          };

          if (
            existingJob.postedAt &&
            looksLikeRepost(item.postedOn, existingJob.postedAt, now)
          ) {
            updated.isNew = true;
            newJobs.push(updated);
          }

          if (
            updated.isNew !== existingJob.isNew ||
            updated.postedAt !== existingJob.postedAt ||
            updated.title !== existingJob.title ||
            updated.location !== existingJob.location ||
            updated.department !== existingJob.department ||
            updated.team !== existingJob.team ||
            updated.url !== existingJob.url
          ) {
            jobsToMerge.push(updated);
            existingById.set(id, updated);
          }
          continue;
        }

        if (archivedIds.has(id)) {
          const archivedJob = archivedById.get(id);
          const isNew = shouldMarkRestoredAsNew(
            item.postedOn,
            archivedJob?.postedAt,
            site.lastCheckedAt,
            now
          );
          const restored = await restoreArchivedJob(id, {
            ...listingUpdates,
            isNew,
          });
          if (restored) {
            existingIds.add(id);
            existingById.set(id, restored);
            archivedIds.delete(id);
            archivedById.delete(id);
            if (restored.isNew) newJobs.push(restored);
          }
          continue;
        }

        const isNew = isPostedSinceLastCheck(
          item.postedOn,
          site.lastCheckedAt,
          now
        );
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
          postedAt,
          isNew,
        };
        jobsToMerge.push(job);
        if (isNew) newJobs.push(job);
        existingIds.add(id);
        existingById.set(id, job);
      }

      await mergeJobs(jobsToMerge);
      totalNewJobs += newJobs.length;

      const scrapedIds = new Set(
        scraped.map((item) => createJobId(site.id, item.url))
      );
      const existingSiteJobs = existingJobs.filter(
        (job) => job.siteId === site.id
      );
      const staleCount = existingSiteJobs.filter(
        (job) => !scrapedIds.has(job.id)
      ).length;
      const likelyIncompleteScrape =
        existingSiteJobs.length >= INCOMPLETE_SCRAPE_MIN_EXISTING &&
        staleCount / existingSiteJobs.length > INCOMPLETE_SCRAPE_ARCHIVE_RATIO;
      const siteHadJobs = existingSiteJobs.length > 0;
      let archivedJobsCount = 0;
      if (
        !likelyIncompleteScrape &&
        (scraped.length > 0 || !siteHadJobs)
      ) {
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
