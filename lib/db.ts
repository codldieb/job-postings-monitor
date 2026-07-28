import { promises as fs } from "fs";
import path from "path";
import type {
  CheckLogEntry,
  JobPosting,
  MonitoredSite,
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
  await saveJobs(jobs.filter((job) => job.siteId !== id));
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
        error: result.error,
      };
    }
  }

  return statuses;
}
