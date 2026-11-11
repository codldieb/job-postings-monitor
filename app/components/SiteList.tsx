"use client";

import type { MonitoredSite, SiteCheckStatus } from "@/lib/types";

interface SiteListProps {
  sites: MonitoredSite[];
  checkStatus: Record<string, SiteCheckStatus>;
  onRemove: (id: string) => void;
  onCheck: (id: string) => void;
  checkRunning?: boolean;
  checkingSiteId?: string | null;
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

function CheckStatus({ status }: { status?: SiteCheckStatus }) {
  if (!status) {
    return (
      <p className="caption-text mt-1">Not checked yet</p>
    );
  }

  if (status.error) {
    return (
      <p className="caption-text mt-1 break-all text-ink-muted">
        Check failed: {status.error}
      </p>
    );
  }

  if (status.totalFound === 0) {
    return (
      <p className="caption-text mt-1 break-words text-ink-subtle">
        Last check found no job postings
      </p>
    );
  }

  const newLabel =
    status.newJobsCount > 0
      ? ` (${status.newJobsCount} new)`
      : "";

  const archivedLabel =
    status.archivedJobsCount > 0
      ? `, ${status.archivedJobsCount} archived`
      : "";

  return (
    <p className="caption-text mt-1 break-words text-semantic-success">
      {status.totalFound} posting{status.totalFound === 1 ? "" : "s"} found
      {newLabel}
      {archivedLabel}
    </p>
  );
}

export default function SiteList({
  sites,
  checkStatus,
  onRemove,
  onCheck,
  checkRunning = false,
  checkingSiteId = null,
}: SiteListProps) {
  if (sites.length === 0) {
    return (
      <p className="body-text text-ink-subtle">
        No sites yet. Add a careers page above to start monitoring.
      </p>
    );
  }

  return (
    <ul className="list-panel">
      {sites.map((site) => (
        <li
          key={site.id}
          className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink">{site.name}</p>
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="link-accent mt-0.5 block break-all text-sm"
            >
              {site.url}
            </a>
            <p className="caption-text mt-1">
              Last checked: {formatDate(site.lastCheckedAt)}
            </p>
            <CheckStatus status={checkStatus[site.id]} />
          </div>
          <div className="flex shrink-0 gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() => onCheck(site.id)}
              disabled={checkRunning}
              className="btn-primary"
            >
              {checkingSiteId === site.id ? "Checking..." : "Check"}
            </button>
            <button
              type="button"
              onClick={() => onRemove(site.id)}
              disabled={checkingSiteId === site.id}
              className="btn-secondary"
            >
              Remove
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
