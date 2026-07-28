import {
  appendCheckLog,
  getJobs,
  getSites,
  updateSiteLastChecked,
  upsertJobs,
} from "./db";
import { createJobId, scrapeJobPostings } from "./scraper";
import type { CheckLogEntry, CheckResult, JobPosting } from "./types";

export async function runDailyCheck(): Promise<CheckLogEntry> {
  const sites = await getSites();
  const existingJobs = await getJobs();
  const existingIds = new Set(existingJobs.map((job) => job.id));
  const startedAt = new Date().toISOString();
  const results: CheckResult[] = [];
  let totalNewJobs = 0;

  for (const site of sites) {
    const checkedAt = new Date().toISOString();

    try {
      const scraped = await scrapeJobPostings(site.url);
      const newJobs: JobPosting[] = [];

      for (const item of scraped) {
        const id = createJobId(site.id, item.url);
        const isNew = !existingIds.has(id);

        if (isNew) {
          const job: JobPosting = {
            id,
            siteId: site.id,
            siteName: site.name,
            title: item.title,
            url: item.url,
            firstSeenAt: checkedAt,
            isNew: true,
          };
          newJobs.push(job);
          existingIds.add(id);
        }
      }

      if (newJobs.length > 0) {
        await upsertJobs(newJobs);
        totalNewJobs += newJobs.length;
      }

      await updateSiteLastChecked(site.id, checkedAt);

      results.push({
        siteId: site.id,
        siteName: site.name,
        newJobs,
        totalFound: scraped.length,
        checkedAt,
      });
    } catch (error) {
      await updateSiteLastChecked(site.id, checkedAt);

      results.push({
        siteId: site.id,
        siteName: site.name,
        newJobs: [],
        totalFound: 0,
        checkedAt,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const entry: CheckLogEntry = {
    id: crypto.randomUUID(),
    startedAt,
    completedAt: new Date().toISOString(),
    sitesChecked: sites.length,
    newJobsFound: totalNewJobs,
    results,
  };

  await appendCheckLog(entry);
  return entry;
}
