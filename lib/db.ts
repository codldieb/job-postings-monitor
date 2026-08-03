import { promises as fs } from "fs";
import path from "path";
import { normalizeResumeProfile } from "./resume/profile";
import type {
  ArchivedJobPosting,
  CheckLogEntry,
  JobPosting,
  MonitoredSite,
  ResumeProfile,
  SiteCheckStatus,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJsonFile<T>(filename: string, fallback: T): Promise<T> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function getSites(): Promise<MonitoredSite[]> {
  return readJsonFile<MonitoredSite[]>("sites.json", []);
}

export async function saveSites(sites: MonitoredSite[]): Promise<void> {
  await writeJsonFile("sites.json", sites);
}

export async function getJobs(): Promise<JobPosting[]> {
  return readJsonFile<JobPosting[]>("jobs.json", []);
}

export async function saveJobs(jobs: JobPosting[]): Promise<void> {
  await writeJsonFile("jobs.json", jobs);
}

export async function getArchivedJobs(): Promise<ArchivedJobPosting[]> {
  return readJsonFile<ArchivedJobPosting[]>("archived-jobs.json", []);
}

export async function saveArchivedJobs(
  jobs: ArchivedJobPosting[]
): Promise<void> {
  await writeJsonFile("archived-jobs.json", jobs);
}

export async function getResumeProfile(): Promise<ResumeProfile | null> {
  const profile = await readJsonFile<ResumeProfile | null>(
    "resume-profile.json",
    null
  );
  return normalizeResumeProfile(profile);
}

export async function saveResumeProfile(profile: ResumeProfile): Promise<void> {
  await writeJsonFile("resume-profile.json", profile);
}

export async function updateJob(
  jobId: string,
  updates: Partial<JobPosting>
): Promise<JobPosting | null> {
  const jobs = await getJobs();
  const index = jobs.findIndex((job) => job.id === jobId);
  if (index === -1) return null;

  jobs[index] = { ...jobs[index], ...updates };
  await saveJobs(jobs);
  return jobs[index];
}

export async function getCheckLog(): Promise<CheckLogEntry[]> {
  return readJsonFile<CheckLogEntry[]>("check-log.json", []);
}

export async function saveCheckLog(entries: CheckLogEntry[]): Promise<void> {
  await writeJsonFile("check-log.json", entries);
}

export async function addSite(site: MonitoredSite): Promise<void> {
  const sites = await getSites();
  sites.push(site);
  await saveSites(sites);
}

export async function removeSite(id: string): Promise<boolean> {
  const sites = await getSites();
  const filtered = sites.filter((site) => site.id !== id);
  if (filtered.length === sites.length) return false;
  await saveSites(filtered);

  const jobs = await getJobs();
  const siteJobs = jobs.filter((job) => job.siteId === id);
  if (siteJobs.length > 0) {
    await archiveJobs(siteJobs, new Date().toISOString());
    await saveJobs(jobs.filter((job) => job.siteId !== id));
  }

  return true;
}

export async function updateSiteLastChecked(
  siteId: string,
  checkedAt: string
): Promise<void> {
  const sites = await getSites();
  const index = sites.findIndex((site) => site.id === siteId);
  if (index === -1) return;
  sites[index] = { ...sites[index], lastCheckedAt: checkedAt };
  await saveSites(sites);
}

async function archiveJobs(
  jobs: JobPosting[],
  archivedAt: string
): Promise<void> {
  if (jobs.length === 0) return;

  const archived = await getArchivedJobs();
  const archivedIds = new Set(archived.map((job) => job.id));

  for (const job of jobs) {
    if (archivedIds.has(job.id)) continue;
    archived.push({ ...job, archivedAt, isNew: false });
    archivedIds.add(job.id);
  }

  await saveArchivedJobs(archived);
}

export async function archiveStaleJobsForSite(
  siteId: string,
  activeIds: Set<string>,
  archivedAt: string
): Promise<number> {
  const jobs = await getJobs();
  const staleJobs = jobs.filter(
    (job) => job.siteId === siteId && !activeIds.has(job.id)
  );

  if (staleJobs.length === 0) return 0;

  await archiveJobs(staleJobs, archivedAt);
  await saveJobs(
    jobs.filter((job) => job.siteId !== siteId || activeIds.has(job.id))
  );

  return staleJobs.length;
}

export async function restoreArchivedJob(
  id: string,
  updates: Pick<
    JobPosting,
    "title" | "url" | "siteName" | "department" | "team" | "location"
  >
): Promise<JobPosting | null> {
  const archived = await getArchivedJobs();
  const index = archived.findIndex((job) => job.id === id);
  if (index === -1) return null;

  const { archivedAt: _, ...job } = archived[index];
  const restored: JobPosting = {
    ...job,
    ...updates,
    isNew: true,
  };

  archived.splice(index, 1);
  await saveArchivedJobs(archived);

  const active = await getJobs();
  active.push(restored);
  await saveJobs(active);

  return restored;
}

export async function upsertJobs(newJobs: JobPosting[]): Promise<number> {
  const existing = await getJobs();
  const existingIds = new Set(existing.map((job) => job.id));
  let addedCount = 0;

  for (const job of newJobs) {
    if (!existingIds.has(job.id)) {
      existing.push(job);
      existingIds.add(job.id);
      addedCount++;
    }
  }

  await saveJobs(existing);
  return addedCount;
}

export async function markAllJobsSeen(): Promise<void> {
  const jobs = await getJobs();
  const updated = jobs.map((job) => ({ ...job, isNew: false }));
  await saveJobs(updated);
}

export async function markJobSeen(jobId: string): Promise<JobPosting | null> {
  return updateJob(jobId, { isNew: false });
}

export async function appendCheckLog(entry: CheckLogEntry): Promise<void> {
  const log = await getCheckLog();
  log.unshift(entry);
  await saveCheckLog(log.slice(0, 50));
}

export async function getLatestCheckStatusBySite(): Promise<
  Record<string, SiteCheckStatus>
> {
  const log = await getCheckLog();
  const statuses: Record<string, SiteCheckStatus> = {};

  for (const entry of log) {
    for (const result of entry.results) {
      if (statuses[result.siteId]) continue;

      statuses[result.siteId] = {
        checkedAt: result.checkedAt,
        totalFound: result.totalFound,
        newJobsCount: result.newJobs.length,
        archivedJobsCount:
          result.archivedJobsCount ?? result.removedJobsCount ?? 0,
        error: result.error,
      };
    }
  }

  return statuses;
}
