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

function tabClass(isActive: boolean) {
  return isActive
    ? "border-b-2 border-emerald-600 text-emerald-800"
    : "border-b-2 border-transparent text-stone-500 hover:text-stone-800";
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
      <div className="flex gap-6 overflow-x-auto border-b border-stone-200">
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`shrink-0 pb-3 text-sm font-medium transition-colors ${tabClass(tab === "active")}`}
        >
          Active ({jobs.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("new")}
          className={`shrink-0 pb-3 text-sm font-medium transition-colors ${tabClass(tab === "new")}`}
        >
          New ({newJobs.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("archived")}
          className={`shrink-0 pb-3 text-sm font-medium transition-colors ${tabClass(tab === "archived")}`}
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
              <p className="text-sm text-slate-500">
                No new postings since your last review.
              </p>
            )}
          </div>
        )}

        {tab === "archived" && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
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
