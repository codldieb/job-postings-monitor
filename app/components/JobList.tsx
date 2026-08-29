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
  if (score >= 80) return "status-badge-success";
  if (score >= 60) return "status-badge-accent";
  return "status-badge";
}

function locationTypeBadgeClass(type: LocationType) {
  switch (type) {
    case "Remote":
      return "status-badge-accent";
    case "Hybrid":
      return "status-badge";
    case "Onsite":
      return "status-badge";
  }
}

function JobMatchDetails({ job }: { job: JobPosting }) {
  if (job.scoreError && job.matchScore === undefined) {
    return (
      <p className="caption-text mt-2 text-ink-muted">{job.scoreError}</p>
    );
  }

  if (job.matchScore === undefined) {
    return (
      <p className="caption-text mt-2">
        {job.scoredAt ? "No score available" : "Not scored yet"}
      </p>
    );
  }

  return (
    <div className="caption-text mt-2 space-y-2">
      {(job.matchSkillScore !== undefined ||
        job.matchExperienceScore !== undefined) && (
        <div className="match-detail-box">
          {job.matchSkillScore !== undefined && (
            <p>Skills: {job.matchSkillScore}/100</p>
          )}
          {job.matchExperienceScore !== undefined && (
            <p>Experience: {job.matchExperienceScore}/100</p>
          )}
        </div>
      )}
      {job.experienceNote && (
        <p className="text-ink-muted">{job.experienceNote}</p>
      )}
      {job.roleRelevanceNote && (
        <p
          className={
            job.roleRelevant === false
              ? "text-ink-subtle"
              : job.roleRelevant === true
                ? "text-semantic-success"
                : "text-ink-muted"
          }
        >
          Role: {job.roleRelevanceNote}
        </p>
      )}
      {job.locationNote && (
        <p
          className={
            job.locationInTarget === false
              ? "text-ink-subtle"
              : job.locationInTarget === true
                ? "text-semantic-success"
                : "text-ink-muted"
          }
        >
          Location: {job.locationNote}
        </p>
      )}
      {(job.locationTypes?.length ?? 0) > 0 && (
        <p className="text-ink-muted">
          Work style: {job.locationTypes?.join(", ")}
        </p>
      )}
      {(job.department || job.team || job.location) && (
        <p className="text-ink-subtle">
          {[job.department, job.team, job.location].filter(Boolean).join(" · ")}
        </p>
      )}
      {(job.matchedSkills?.length ?? 0) > 0 && (
        <div>
          <p className="font-medium text-semantic-success">Matched skills</p>
          <p className="mt-0.5 break-words text-ink-muted">
            {job.matchedSkills?.join(", ")}
          </p>
        </div>
      )}
      {(job.missingSkills?.length ?? 0) > 0 && (
        <div>
          <p className="font-medium text-ink-subtle">
            Mentioned but not on your resume
          </p>
          <p className="mt-0.5 break-words text-ink-muted">
            {job.missingSkills?.join(", ")}
          </p>
        </div>
      )}
      {job.matchedSkills?.length === 0 && job.missingSkills?.length === 0 && (
        <p className="text-ink-subtle">
          No recognizable skills found in description.
        </p>
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
      <p className="body-text text-ink-subtle">
        No job postings discovered yet. Run a check after adding sites.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {!hasResumeProfile && (
        <p className="alert-banner-accent">
          Add your skills in the Resume profile section to enable match scores.
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          {showMinScoreFilter && (
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              Min score
              <select
                value={minScore}
                onChange={(event) => setMinScore(Number(event.target.value))}
                className="select-field"
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
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={hideOffTargetRoles}
                onChange={(event) => setHideOffTargetRoles(event.target.checked)}
                className="checkbox-field"
              />
              Hide off-target roles
            </label>
          )}
          {showLocationFilter && hasResumeProfile && (
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={hideOutsideLocations}
                onChange={(event) =>
                  setHideOutsideLocations(event.target.checked)
                }
                className="checkbox-field"
              />
              Hide outside target locations
            </label>
          )}
          {showLocationTypeFilter && (
            <fieldset className="flex flex-wrap items-center gap-3 text-sm text-ink-muted">
              <legend className="sr-only">Work location type</legend>
              <span className="text-ink-subtle">Work style</span>
              {ALL_LOCATION_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={locationTypeFilter.has(type)}
                    onChange={() => toggleLocationType(type)}
                    className="checkbox-field"
                  />
                  {type}
                </label>
              ))}
            </fieldset>
          )}
          {!showMinScoreFilter && (
            <p className="body-text text-ink-subtle">
              Newly discovered postings since your last review.
            </p>
          )}
        </div>
        <p className="caption-text">
          Showing {filteredJobs.length} of {jobs.length}
        </p>
      </div>

      {newCount > 0 && (
        <div className="alert-banner-accent flex items-center justify-between">
          <p className="text-sm font-medium text-ink">
            {newCount} new posting{newCount === 1 ? "" : "s"} since last review
          </p>
          <button onClick={onMarkSeen} className="btn-primary">
            Mark all seen
          </button>
        </div>
      )}

      {filteredJobs.length === 0 ? (
        <p className="body-text text-ink-subtle">
          No jobs match the current filters.
        </p>
      ) : (
        <ul className="list-panel">
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
                      className="font-medium text-ink link-accent no-underline hover:underline"
                    >
                      {job.title}
                    </a>
                    <p className="caption-text mt-1">{job.siteName}</p>
                    {(job.department || job.team || job.location) && (
                      <p className="caption-text mt-0.5">
                        {[job.department, job.team, job.location].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <p className="caption-text mt-1 text-ink-tertiary">
                      First seen: {formatDate(job.firstSeenAt)}
                    </p>
                    {isExpanded && <JobMatchDetails job={job} />}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {job.isNew && (
                      <div className="flex flex-col items-end gap-1">
                        <span className="status-badge-success font-semibold">
                          New
                        </span>
                        {onMarkJobSeen && (
                          <button
                            type="button"
                            onClick={() => handleMarkJobSeen(job.id)}
                            disabled={markingJobId === job.id}
                            className="btn-tertiary px-0 py-0 text-xs disabled:opacity-60"
                          >
                            {markingJobId === job.id ? "Saving..." : "Mark seen"}
                          </button>
                        )}
                      </div>
                    )}
                    {job.roleRelevant === false && !hideOffTargetRoles && (
                      <span className="status-badge font-semibold">
                        Off-target
                      </span>
                    )}
                    {job.locationInTarget === false && !hideOutsideLocations && (
                      <span className="status-badge font-semibold">
                        Outside location
                      </span>
                    )}
                    {job.locationTypes?.map((type) => (
                      <span
                        key={type}
                        className={`font-semibold ${locationTypeBadgeClass(type)}`}
                      >
                        {type}
                      </span>
                    ))}
                    {job.matchScore !== undefined && (
                      <span
                        className={`font-semibold ${scoreBadgeClass(job.matchScore)}`}
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
                        className="btn-tertiary px-0 py-0 text-xs"
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
