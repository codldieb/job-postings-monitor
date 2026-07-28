"use client";

import type { JobPosting } from "@/lib/types";

interface JobListProps {
  jobs: JobPosting[];
  onMarkSeen: () => void;
  newCount: number;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function JobList({ jobs, onMarkSeen, newCount }: JobListProps) {
  if (jobs.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No job postings discovered yet. Run a check after adding sites.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {newCount > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
          <p className="text-sm font-medium text-emerald-800">
            {newCount} new posting{newCount === 1 ? "" : "s"} since last review
          </p>
          <button
            onClick={onMarkSeen}
            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Mark all seen
          </button>
        </div>
      )}

      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {jobs.map((job) => (
          <li key={job.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-slate-900 hover:text-blue-600"
                >
                  {job.title}
                </a>
                <p className="mt-1 text-sm text-slate-500">{job.siteName}</p>
                <p className="mt-1 text-xs text-slate-400">
                  First seen: {formatDate(job.firstSeenAt)}
                </p>
              </div>
              {job.isNew && (
                <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  New
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
