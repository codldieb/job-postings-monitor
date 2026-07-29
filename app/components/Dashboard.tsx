"use client";

import { useCallback, useEffect, useState } from "react";
import CheckControls from "./CheckControls";
import JobTabs from "./JobTabs";
import ResumeProfileForm from "./ResumeProfileForm";
import SiteForm from "./SiteForm";
import SiteList from "./SiteList";
import type {
  ArchivedJobPosting,
  JobPosting,
  MonitoredSite,
  SiteCheckStatus,
} from "@/lib/types";

type DashboardView = "jobs" | "sites" | "resume";

export default function Dashboard() {
  const [view, setView] = useState<DashboardView>("jobs");
  const [sites, setSites] = useState<MonitoredSite[]>([]);
  const [checkStatus, setCheckStatus] = useState<Record<string, SiteCheckStatus>>(
    {}
  );
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [archivedJobs, setArchivedJobs] = useState<ArchivedJobPosting[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [hasResumeProfile, setHasResumeProfile] = useState(false);
  const [hasLocationPreferences, setHasLocationPreferences] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [showAddSite, setShowAddSite] = useState(false);

  const refresh = useCallback(async () => {
    const [sitesRes, jobsRes, archivedRes, resumeRes] = await Promise.all([
      fetch("/api/sites"),
      fetch("/api/jobs"),
      fetch("/api/jobs/archived"),
      fetch("/api/resume"),
    ]);

    const sitesData = await sitesRes.json();
    const jobsData = await jobsRes.json();
    const archivedData = await archivedRes.json();
    const resumeData = await resumeRes.json();

    setSites(sitesData.sites ?? []);
    setCheckStatus(sitesData.checkStatus ?? {});
    setJobs(jobsData.jobs ?? []);
    setArchivedJobs(archivedData.jobs ?? []);
    setNewCount(jobsData.newCount ?? 0);
    setHasResumeProfile((resumeData.profile?.skills?.length ?? 0) > 0);
    setHasLocationPreferences(
      (resumeData.profile?.targetCountries?.length ?? 0) > 0 ||
        (resumeData.profile?.targetContinents?.length ?? 0) > 0
    );
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
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-stone-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <header className="app-shell-header sticky top-0 z-20 rounded-b-3xl px-4 pb-4 pt-5 sm:px-6">
        <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-emerald-50">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
              Live job tracker
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Job Postings Monitor
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-emerald-100/90">
              Scan career pages, score matches against your skills, and focus on
              the roles worth applying to.
            </p>
          </div>

        <nav
          className="mt-5 flex gap-2 overflow-x-auto pb-1"
          aria-label="Main sections"
        >
          <button
            type="button"
            onClick={() => setView("jobs")}
            className={`nav-pill flex shrink-0 items-center gap-2 ${view === "jobs" ? "nav-pill-active" : "nav-pill-idle"}`}
          >
            Jobs
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${view === "jobs" ? "bg-emerald-100 text-emerald-900" : "bg-white/15 text-emerald-50"}`}
            >
              {jobs.length}
            </span>
            {newCount > 0 && (
              <span className="rounded-full bg-lime-300 px-2 py-0.5 text-xs font-bold text-emerald-950">
                {newCount} new
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setView("sites")}
            className={`nav-pill flex shrink-0 items-center gap-2 ${view === "sites" ? "nav-pill-active" : "nav-pill-idle"}`}
          >
            Sites
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${view === "sites" ? "bg-emerald-100 text-emerald-900" : "bg-white/15 text-emerald-50"}`}
            >
              {sites.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setView("resume")}
            className={`nav-pill flex shrink-0 items-center gap-2 ${view === "resume" ? "nav-pill-active" : "nav-pill-idle"}`}
          >
            Resume
            {!hasResumeProfile && (
              <span className="rounded-full bg-amber-300 px-2 py-0.5 text-xs font-semibold text-amber-950">
                Setup
              </span>
            )}
          </button>
        </nav>

        <div className="mt-4 space-y-3">
          <CheckControls onComplete={refresh} onMessage={setCheckMessage} />

          {checkMessage && (
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-300/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-50 backdrop-blur-sm">
              <p>{checkMessage}</p>
              <button
                type="button"
                onClick={() => setCheckMessage(null)}
                className="shrink-0 text-emerald-100/80 hover:text-white"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="pt-7">
        {view === "jobs" && (
          <section className="app-panel-accent p-4 sm:p-6">
            <JobTabs
              jobs={jobs}
              archivedJobs={archivedJobs}
              newCount={newCount}
              hasResumeProfile={hasResumeProfile}
              hasLocationPreferences={hasLocationPreferences}
              onMarkSeen={handleMarkSeen}
              defaultTab={newCount > 0 ? "new" : "active"}
            />
          </section>
        )}

        {view === "sites" && (
          <section className="app-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/80 px-4 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">
                  Monitored sites
                </h2>
                <p className="text-sm text-stone-500">
                  Career pages checked daily at 8:00 AM UTC.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSite((open) => !open)}
                className="btn-secondary"
              >
                {showAddSite ? "Cancel" : "Add site"}
              </button>
            </div>

            {showAddSite && (
              <div className="border-b border-emerald-100 bg-emerald-50/50 px-4 py-5 sm:px-6">
                <SiteForm
                  onAdded={() => {
                    refresh();
                    setShowAddSite(false);
                  }}
                />
              </div>
            )}

            <div className="p-4 sm:p-6">
              <SiteList
                sites={sites}
                checkStatus={checkStatus}
                onRemove={handleRemove}
              />
            </div>
          </section>
        )}

        {view === "resume" && (
          <section className="app-panel-accent p-4 sm:p-6">
            <div className="mb-5 border-b border-stone-100 pb-4">
              <h2 className="text-lg font-semibold text-stone-900">
                Resume profile
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Upload your resume and maintain the skill list used for match
                scoring.
              </p>
            </div>
            <ResumeProfileForm onUpdated={refresh} />
          </section>
        )}
      </main>
    </div>
  );
}
