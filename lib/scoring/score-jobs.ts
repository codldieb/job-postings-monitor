import { getJobs } from "@/lib/db";
import type {
  JobPosting,
  ScoreJobsResult,
  ScoreProgressEvent,
} from "@/lib/types";
import { scoreJob } from "./score-job";

export interface ScoreJobsOptions {
  jobIds?: string[];
  onlyUnscored?: boolean;
  force?: boolean;
}

export type { ScoreJobsResult };

export async function scoreJobs(
  options: ScoreJobsOptions = {},
  onProgress?: (event: ScoreProgressEvent) => void,
  abortSignal?: AbortSignal
): Promise<ScoreJobsResult> {
  const jobs = await getJobs();
  let targets: JobPosting[];

  if (options.jobIds?.length) {
    const idSet = new Set(options.jobIds);
    targets = jobs.filter((job) => idSet.has(job.id));
  } else {
    targets = [...jobs];
  }

  if (options.onlyUnscored && !options.force) {
    targets = targets.filter((job) => !job.scoredAt);
  }

  onProgress?.({ type: "start", totalJobs: targets.length });

  if (targets.length === 0) {
    const result: ScoreJobsResult = { scored: 0, failed: 0, skipped: 0 };
    onProgress?.({ type: "complete", result, totalJobs: 0 });
    return result;
  }

  let scored = 0;
  let failed = 0;

  for (let index = 0; index < targets.length; index++) {
    if (abortSignal?.aborted) {
      const result: ScoreJobsResult = {
        scored,
        failed,
        skipped: 0,
        cancelled: true,
      };
      onProgress?.({
        type: "cancelled",
        result,
        index,
        totalJobs: targets.length,
      });
      return result;
    }

    const job = targets[index];

    onProgress?.({
      type: "job-start",
      index: index + 1,
      totalJobs: targets.length,
      jobId: job.id,
      jobTitle: job.title,
    });

    const updated = await scoreJob(job);

    if (updated.scoreError && updated.matchScore === undefined) {
      failed++;
    } else {
      scored++;
    }

    onProgress?.({
      type: "job-complete",
      index: index + 1,
      totalJobs: targets.length,
      jobId: job.id,
      jobTitle: job.title,
    });
  }

  const result: ScoreJobsResult = { scored, failed, skipped: 0 };
  onProgress?.({ type: "complete", result, totalJobs: targets.length });
  return result;
}

export async function scoreNewJobs(
  jobIds: string[],
  onProgress?: (event: ScoreProgressEvent) => void
): Promise<ScoreJobsResult> {
  if (jobIds.length === 0) {
    return { scored: 0, failed: 0, skipped: 0 };
  }

  return scoreJobs({ jobIds, onlyUnscored: true }, onProgress);
}
