export type LocationType = "Remote" | "Hybrid" | "Onsite";

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
  department?: string;
  team?: string;
  location?: string;
  locationTypes?: LocationType[];
  descriptionText?: string;
  descriptionFetchedAt?: string;
  matchScore?: number;
  matchSkillScore?: number;
  matchExperienceScore?: number;
  experienceNote?: string;
  roleRelevant?: boolean;
  roleRelevanceNote?: string;
  locationInTarget?: boolean;
  locationNote?: string;
  matchedSkills?: string[];
  missingSkills?: string[];
  scoredAt?: string;
  scoreError?: string;
}

export interface PositionExperience {
  position: string;
  years: number;
}

export interface ResumeProfile {
  skills: string[];
  positionExperience?: PositionExperience[];
  targetDepartments?: string[];
  targetCountries?: string[];
  targetContinents?: string[];
  /** @deprecated Migrated to positionExperience on read */
  yearsOfExperience?: number;
  updatedAt: string;
  resumeFileName?: string;
  resumeUploadedAt?: string;
  extractedText?: string;
}

export interface ArchivedJobPosting extends JobPosting {
  archivedAt: string;
}

export interface CheckResult {
  siteId: string;
  siteName: string;
  newJobs: JobPosting[];
  archivedJobsCount: number;
  totalFound: number;
  checkedAt: string;
  error?: string;
  /** @deprecated Legacy field from before archiving */
  removedJobsCount?: number;
}

export interface SiteCheckStatus {
  checkedAt: string;
  totalFound: number;
  newJobsCount: number;
  archivedJobsCount: number;
  error?: string;
}

export interface CheckProgressEvent {
  type:
    | "start"
    | "site-start"
    | "site-complete"
    | "score-start"
    | "score-progress"
    | "complete"
    | "cancelled"
    | "error";
  totalSites?: number;
  totalJobs?: number;
  index?: number;
  siteId?: string;
  siteName?: string;
  jobTitle?: string;
  newJobsCount?: number;
  error?: string;
  result?: CheckLogEntry;
  scoreResult?: ScoreJobsResult;
  message?: string;
}

export interface CheckLogEntry {
  id: string;
  startedAt: string;
  completedAt: string;
  sitesChecked: number;
  totalSites?: number;
  newJobsFound: number;
  jobsArchived: number;
  results: CheckResult[];
  cancelled?: boolean;
  /** @deprecated Legacy field from before archiving */
  jobsRemoved?: number;
}

export interface ScoreJobsResult {
  scored: number;
  failed: number;
  skipped: number;
  cancelled?: boolean;
}

export interface ScoreProgressEvent {
  type:
    | "start"
    | "job-start"
    | "job-complete"
    | "complete"
    | "cancelled"
    | "error";
  totalJobs?: number;
  index?: number;
  jobId?: string;
  jobTitle?: string;
  result?: ScoreJobsResult;
  message?: string;
}

export interface AddSiteInput {
  name: string;
  url: string;
}
