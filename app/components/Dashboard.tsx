"use client";

import { useCallback, useEffect, useState } from "react";
import CheckButton from "./CheckButton";
import JobList from "./JobList";
import SiteForm from "./SiteForm";
import SiteList from "./SiteList";
import type { JobPosting, MonitoredSite, SiteCheckStatus } from "@/lib/types";

export default function Dashboard() {
  const [sites, setSites] = useState<MonitoredSite[]>([]);
  const [checkStatus, setCheckStatus] = useState<Record<string, SiteCheckStatus>>(
    {}
  );
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [sitesRes, jobsRes] = await Promise.all([
      fetch("/api/sites"),
      fetch("/api/jobs"),
    ]);

    const sitesData = await sitesRes.json();
    const jobsData = await jobsRes.json();

    setSites(sitesData.sites ?? []);
    setCheckStatus(sitesData.checkStatus ?? {});
    setJobs(jobsData.jobs ?? []);
    setNewCount(jobsData.newCount ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleRemove(id: string) {
    await fetch(`/api/sites/${id}`, { method: "DELETE" });
    refresh();
  }

  async function handleMarkSeen() {
    await fetch("/api/jobs/mark-seen", { method: "POST" });
    refresh();
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Job Postings Monitor
        </h1>
        <p className="max-w-2xl text-slate-600">
          Add company career pages and check them daily for new job postings.
          The app scans each page for job-related links and highlights anything
          newly discovered.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Actions</h2>
          <CheckButton onComplete={refresh} />
        </div>
        <p className="text-sm text-slate-500">
          Daily checks run automatically at 8:00 AM when deployed with Vercel
          Cron, or via Windows Task Scheduler locally (see README).
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Monitored sites ({sites.length})
        </h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <SiteForm onAdded={refresh} />
          <div className="mt-6">
            <SiteList
              sites={sites}
              checkStatus={checkStatus}
              onRemove={handleRemove}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Job postings ({jobs.length})
        </h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <JobList jobs={jobs} newCount={newCount} onMarkSeen={handleMarkSeen} />
        </div>
      </section>
    </div>
  );
}
