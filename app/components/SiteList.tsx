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
      <p className="mt-1 text-xs text-red-600">
        Check failed: {status.error}
      </p>
    );
  }

  if (status.totalFound === 0) {
    return (
      <p className="mt-1 text-xs text-amber-700">
        Last check found no job postings
      </p>
    );
  }

  const newLabel =
    status.newJobsCount > 0
      ? ` (${status.newJobsCount} new)`
      : "";

  return (
    <p className="mt-1 text-xs text-emerald-700">
      {status.totalFound} posting{status.totalFound === 1 ? "" : "s"} found
      {newLabel}
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
    <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
      {sites.map((site) => (
        <li
          key={site.id}
          className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-medium text-slate-900">{site.name}</p>
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
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
            className="self-start rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 sm:self-center"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
