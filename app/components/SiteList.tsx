"use client";

import type { MonitoredSite, SiteCheckStatus } from "@/lib/types";

interface SiteListProps {
  sites: MonitoredSite[];
  checkStatus: Record<string, SiteCheckStatus>;
  onRemove: (id: string) => void;
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

function CheckStatus({ status }: { status?: SiteCheckStatus }) {
  if (!status) {
    return (
      <p className="mt-1 text-xs text-slate-500">Not checked yet</p>
    );
  }

  if (status.error) {
    return (
      <p className="mt-1 break-all text-xs text-red-600">
        Check failed: {status.error}
      </p>
    );
  }

  if (status.totalFound === 0) {
    return (
      <p className="mt-1 break-words text-xs text-amber-700">
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
    <p className="mt-1 break-words text-xs text-emerald-700">
      {status.totalFound} posting{status.totalFound === 1 ? "" : "s"} found
      {newLabel}
      {archivedLabel}
    </p>
  );
}

export default function SiteList({ sites, checkStatus, onRemove }: SiteListProps) {
  if (sites.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No sites yet. Add a careers page above to start monitoring.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
      {sites.map((site) => (
        <li
          key={site.id}
          className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-900">{site.name}</p>
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 block break-all text-sm text-emerald-700 hover:text-emerald-900 hover:underline"
            >
              {site.url}
            </a>
            <p className="mt-1 text-xs text-slate-500">
              Last checked: {formatDate(site.lastCheckedAt)}
            </p>
            <CheckStatus status={checkStatus[site.id]} />
          </div>
          <button
            onClick={() => onRemove(site.id)}
            className="shrink-0 self-start rounded-full border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700 sm:self-center"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
