"use client";

import { useMemo, useState } from "react";
import ArchivedJobList from "./ArchivedJobList";
import JobList from "./JobList";
import type { ArchivedJobPosting, JobPosting } from "@/lib/types";

type JobTab = "active" | "new" | "archived";

interface JobTabsProps {
  jobs: JobPosting[];
  archivedJobs: ArchivedJobPosting[];
  newCount: number;
  hasResumeProfile: boolean;
  hasLocationPreferences?: boolean;
  onMarkSeen: () => void;
  onMarkJobSeen?: (jobId: string) => void | Promise<void>;
  defaultTab?: JobTab;
}

export default function JobTabs({
  jobs,
  archivedJobs,
  newCount,
  hasResumeProfile,
  hasLocationPreferences = false,
  onMarkSeen,
  onMarkJobSeen,
  defaultTab = "active",
}: JobTabsProps) {
  const [tab, setTab] = useState<JobTab>(defaultTab);

  const newJobs = useMemo(() => jobs.filter((job) => job.isNew), [jobs]);

  return (
    <div>
      <div className="tab-bar w-fit max-w-full">
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`tab-item ${tab === "active" ? "tab-item-active" : "tab-item-idle"}`}
        >
          Active ({jobs.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("new")}
          className={`tab-item ${tab === "new" ? "tab-item-active" : "tab-item-idle"}`}
        >
          New ({newJobs.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("archived")}
          className={`tab-item ${tab === "archived" ? "tab-item-active" : "tab-item-idle"}`}
        >
          Archived ({archivedJobs.length})
        </button>
      </div>

      <div className="pt-4">
        {tab === "active" && (
          <JobList
            jobs={jobs}
            newCount={newCount}
            hasResumeProfile={hasResumeProfile}
            showLocationFilter={hasLocationPreferences}
            onMarkSeen={onMarkSeen}
            onMarkJobSeen={onMarkJobSeen}
          />
        )}

        {tab === "new" && (
          <div className="space-y-3">
            {newJobs.length > 0 ? (
              <JobList
                jobs={newJobs}
                newCount={newJobs.length}
                hasResumeProfile={hasResumeProfile}
                showLocationFilter={hasLocationPreferences}
                onMarkSeen={onMarkSeen}
                onMarkJobSeen={onMarkJobSeen}
                showMinScoreFilter={false}
              />
            ) : (
              <p className="body-text text-ink-subtle">
                No new postings since your last review.
              </p>
            )}
          </div>
        )}

        {tab === "archived" && (
          <div className="space-y-3">
            <p className="body-text text-ink-subtle">
              Postings that are no longer listed on their career page. These are
              kept for reference.
            </p>
            <ArchivedJobList jobs={archivedJobs} />
          </div>
        )}
      </div>
    </div>
  );
}
