"use client";

import { useMemo, useState } from "react";
import {
  ALL_LOCATION_TYPES,
  matchesLocationTypeFilter,
} from "@/lib/jobs/location-type";
import type { JobPosting, LocationType } from "@/lib/types";

interface JobListProps {
  jobs: JobPosting[];
  onMarkSeen: () => void;
  onMarkJobSeen?: (jobId: string) => void | Promise<void>;
  newCount: number;
  hasResumeProfile: boolean;
  showMinScoreFilter?: boolean;
  showRoleFilter?: boolean;
  showLocationFilter?: boolean;
  showLocationTypeFilter?: boolean;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function scoreBadgeClass(score: number) {
  if (score >= 80) return "bg-emerald-100 text-emerald-800";
  if (score >= 60) return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

function locationTypeBadgeClass(type: LocationType) {
  switch (type) {
    case "Remote":
      return "bg-sky-100 text-sky-800";
    case "Hybrid":
      return "bg-violet-100 text-violet-800";
    case "Onsite":
      return "bg-stone-200 text-stone-800";
  }
}

function JobMatchDetails({ job }: { job: JobPosting }) {
  if (job.scoreError && job.matchScore === undefined) {
    return (
      <p className="mt-2 text-xs text-red-600">{job.scoreError}</p>
    );
  }

  if (job.matchScore === undefined) {
    return (
      <p className="mt-2 text-xs text-slate-500">
        {job.scoredAt ? "No score available" : "Not scored yet"}
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-2 text-xs">
      {(job.matchSkillScore !== undefined ||
        job.matchExperienceScore !== undefined) && (
        <div className="rounded-lg bg-stone-100 px-3 py-2 text-slate-600">
          {job.matchSkillScore !== undefined && (
            <p>Skills: {job.matchSkillScore}/100</p>
          )}
          {job.matchExperienceScore !== undefined && (
            <p>Experience: {job.matchExperienceScore}/100</p>
          )}
        </div>
      )}
      {job.experienceNote && (
        <p className="text-slate-600">{job.experienceNote}</p>
      )}
      {job.roleRelevanceNote && (
        <p
          className={
            job.roleRelevant === false
              ? "text-amber-700"
              : job.roleRelevant === true
                ? "text-emerald-700"
                : "text-slate-600"
          }
        >
          Role: {job.roleRelevanceNote}
        </p>
      )}
      {job.locationNote && (
        <p
          className={
            job.locationInTarget === false
              ? "text-amber-700"
              : job.locationInTarget === true
                ? "text-emerald-700"
                : "text-slate-600"
          }
        >
          Location: {job.locationNote}
        </p>
      )}
      {(job.locationTypes?.length ?? 0) > 0 && (
        <p className="text-slate-600">
          Work style: {job.locationTypes?.join(", ")}
        </p>
      )}
      {(job.department || job.team || job.location) && (
        <p className="text-slate-500">
          {[job.department, job.team, job.location].filter(Boolean).join(" · ")}
        </p>
      )}
      {(job.matchedSkills?.length ?? 0) > 0 && (
        <div>
          <p className="font-medium text-emerald-700">Matched skills</p>
          <p className="mt-0.5 break-words text-slate-600">
            {job.matchedSkills?.join(", ")}
          </p>
        </div>
      )}
      {(job.missingSkills?.length ?? 0) > 0 && (
        <div>
          <p className="font-medium text-amber-700">Mentioned but not on your resume</p>
          <p className="mt-0.5 break-words text-slate-600">
            {job.missingSkills?.join(", ")}
          </p>
        </div>
      )}
      {job.matchedSkills?.length === 0 && job.missingSkills?.length === 0 && (
        <p className="text-slate-500">No recognizable skills found in description.</p>
      )}
    </div>
  );
}

export default function JobList({
  jobs,
  onMarkSeen,
  onMarkJobSeen,
  newCount,
  hasResumeProfile,
  showMinScoreFilter = true,
  showRoleFilter = true,
  showLocationFilter = false,
  showLocationTypeFilter = true,
}: JobListProps) {
  const [minScore, setMinScore] = useState(0);
  const [hideOffTargetRoles, setHideOffTargetRoles] = useState(true);
  const [hideOutsideLocations, setHideOutsideLocations] = useState(true);
  const [locationTypeFilter, setLocationTypeFilter] = useState<Set<LocationType>>(
    () => new Set(ALL_LOCATION_TYPES)
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [markingJobId, setMarkingJobId] = useState<string | null>(null);

  function toggleLocationType(type: LocationType) {
    setLocationTypeFilter((current) => {
      const next = new Set(current);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  async function handleMarkJobSeen(jobId: string) {
    if (!onMarkJobSeen || markingJobId) return;

    setMarkingJobId(jobId);
    try {
      await onMarkJobSeen(jobId);
    } finally {
      setMarkingJobId(null);
    }
  }

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (minScore > 0 && (job.matchScore ?? 0) < minScore) return false;
      if (hideOffTargetRoles && job.roleRelevant === false) return false;
      if (showLocationFilter && hideOutsideLocations && job.locationInTarget === false) {
        return false;
      }
      if (showLocationTypeFilter && !matchesLocationTypeFilter(job, locationTypeFilter)) {
        return false;
      }
      return true;
    });
  }, [
    jobs,
    minScore,
    hideOffTargetRoles,
    hideOutsideLocations,
    showLocationFilter,
    showLocationTypeFilter,
    locationTypeFilter,
  ]);

  if (jobs.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No job postings discovered yet. Run a check after adding sites.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {!hasResumeProfile && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Add your skills in the Resume profile section to enable match scores.
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          {showMinScoreFilter && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Min score
              <select
                value={minScore}
                onChange={(event) => setMinScore(Number(event.target.value))}
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              >
                <option value={0}>Any</option>
                <option value={50}>50+</option>
                <option value={60}>60+</option>
                <option value={70}>70+</option>
                <option value={80}>80+</option>
              </select>
            </label>
          )}
          {showRoleFilter && hasResumeProfile && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={hideOffTargetRoles}
                onChange={(event) => setHideOffTargetRoles(event.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Hide off-target roles
            </label>
          )}
          {showLocationFilter && hasResumeProfile && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={hideOutsideLocations}
                onChange={(event) =>
                  setHideOutsideLocations(event.target.checked)
                }
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Hide outside target locations
            </label>
          )}
          {showLocationTypeFilter && (
            <fieldset className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <legend className="sr-only">Work location type</legend>
              <span className="text-slate-500">Work style</span>
              {ALL_LOCATION_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={locationTypeFilter.has(type)}
                    onChange={() => toggleLocationType(type)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  {type}
                </label>
              ))}
            </fieldset>
          )}
          {!showMinScoreFilter && (
            <p className="text-sm text-slate-500">
              Newly discovered postings since your last review.
            </p>
          )}
        </div>
        <p className="text-sm text-slate-500">
          Showing {filteredJobs.length} of {jobs.length}
        </p>
      </div>

      {newCount > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
          <p className="text-sm font-medium text-emerald-800">
            {newCount} new posting{newCount === 1 ? "" : "s"} since last review
          </p>
          <button
            onClick={onMarkSeen}
            className="rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Mark all seen
          </button>
        </div>
      )}

      {filteredJobs.length === 0 ? (
        <p className="text-sm text-slate-500">
          No jobs match the current filters.
        </p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-stone-50/70">
          {filteredJobs.map((job) => {
            const isExpanded = expandedId === job.id;
            const canExpand =
              hasResumeProfile &&
              (job.matchScore !== undefined || Boolean(job.scoreError));

            return (
              <li key={job.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-stone-900 hover:text-emerald-700"
                    >
                      {job.title}
                    </a>
                    <p className="mt-1 text-sm text-slate-500">{job.siteName}</p>
                    {(job.department || job.team || job.location) && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {[job.department, job.team, job.location].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                      First seen: {formatDate(job.firstSeenAt)}
                    </p>
                    {isExpanded && <JobMatchDetails job={job} />}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {job.isNew && (
                      <div className="flex flex-col items-end gap-1">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                          New
                        </span>
                        {onMarkJobSeen && (
                          <button
                            type="button"
                            onClick={() => handleMarkJobSeen(job.id)}
                            disabled={markingJobId === job.id}
                            className="text-xs text-emerald-700 hover:underline disabled:opacity-60"
                          >
                            {markingJobId === job.id ? "Saving..." : "Mark seen"}
                          </button>
                        )}
                      </div>
                    )}
                    {job.roleRelevant === false && !hideOffTargetRoles && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                        Off-target
                      </span>
                    )}
                    {job.locationInTarget === false && !hideOutsideLocations && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                        Outside location
                      </span>
                    )}
                    {job.locationTypes?.map((type) => (
                      <span
                        key={type}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${locationTypeBadgeClass(type)}`}
                      >
                        {type}
                      </span>
                    ))}
                    {job.matchScore !== undefined && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${scoreBadgeClass(job.matchScore)}`}
                      >
                        {job.matchScore}/100
                      </span>
                    )}
                    {canExpand && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : job.id)
                        }
                        className="text-xs text-emerald-700 hover:underline"
                      >
                        {isExpanded ? "Hide match" : "Show match"}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
