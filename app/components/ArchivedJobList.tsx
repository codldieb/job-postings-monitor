"use client";

import type { ArchivedJobPosting } from "@/lib/types";

interface ArchivedJobListProps {
  jobs: ArchivedJobPosting[];
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function ArchivedJobList({ jobs }: ArchivedJobListProps) {
  if (jobs.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No archived postings yet. Jobs no longer listed on a career page are
        moved here during checks.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-stone-50/70">
      {jobs.map((job) => (
        <li key={job.id} className="px-4 py-3">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-stone-900 hover:text-emerald-700"
          >
            {job.title}
          </a>
          <p className="mt-1 text-sm text-slate-500">{job.siteName}</p>
          <p className="mt-1 text-xs text-slate-400">
            First seen: {formatDate(job.firstSeenAt)} · Archived:{" "}
            {formatDate(job.archivedAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}
