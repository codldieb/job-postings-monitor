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
      <p className="body-text text-ink-subtle">
        No archived postings yet. Jobs no longer listed on a career page are
        moved here during checks.
      </p>
    );
  }

  return (
    <ul className="list-panel">
      {jobs.map((job) => (
        <li key={job.id} className="px-4 py-3">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-ink link-accent no-underline hover:underline"
          >
            {job.title}
          </a>
          <p className="caption-text mt-1">{job.siteName}</p>
          <p className="caption-text mt-1 text-ink-tertiary">
            First seen: {formatDate(job.firstSeenAt)} · Archived:{" "}
            {formatDate(job.archivedAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}
