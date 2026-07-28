export interface MonitoredSite {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  lastCheckedAt: string | null;
}

export interface JobPosting {
  id: string;
  siteId: string;
  siteName: string;
  title: string;
  url: string;
  firstSeenAt: string;
  isNew: boolean;
}

export interface CheckResult {
  siteId: string;
  siteName: string;
  newJobs: JobPosting[];
  totalFound: number;
  checkedAt: string;
  error?: string;
}

export interface SiteCheckStatus {
  checkedAt: string;
  totalFound: number;
  newJobsCount: number;
  error?: string;
}

export interface CheckLogEntry {
  id: string;
  startedAt: string;
  completedAt: string;
  sitesChecked: number;
  newJobsFound: number;
  results: CheckResult[];
}

export interface AddSiteInput {
  name: string;
  url: string;
}
