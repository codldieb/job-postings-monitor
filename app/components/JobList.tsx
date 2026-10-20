"use client";

import { useEffect, useMemo, useState } from "react";
import FilterMultiSelect from "./FilterMultiSelect";
import {
  ALL_LOCATION_TYPES,
  jobLocationTypes,
  matchesLocationTypeFilter,
} from "@/lib/jobs/location-type";
import { missingRequiredLanguages } from "@/lib/jobs/language-requirements";
import {
  displayRoleRelevance,
  isOffTargetRole as roleLooksOffTarget,
} from "@/lib/jobs/role-relevance";
import { displayJobScores } from "@/lib/skills/matcher";
import type { JobPosting, LocationType } from "@/lib/types";

interface JobListProps {
  jobs: JobPosting[];
  onMarkSeen: () => void;
  onMarkJobSeen?: (jobId: string) => void | Promise<void>;
  onMarkJobsSeen?: (jobIds: string[]) => void | Promise<void>;
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

function formatDay(value: string) {
  return new Date(value).toLocaleDateString();
}

function scoreBadgeClass(score: number) {
  if (score >= 80) return "status-badge-success";
  if (score >= 60) return "status-badge-accent";
  return "status-badge";
}

type IncludeFilter = "matching" | "off-target" | "outside-location";

const INCLUDE_OPTIONS: { value: IncludeFilter; label: string }[] = [
  { value: "matching", label: "Matching roles" },
  { value: "off-target", label: "Off-target roles" },
  { value: "outside-location", label: "Outside target locations" },
];

function workStyleSummary(selected: Set<LocationType>): string {
  if (selected.size === 0 || selected.size === ALL_LOCATION_TYPES.length) {
    return "All";
  }
  return ALL_LOCATION_TYPES.filter((type) => selected.has(type)).join(", ");
}

function includeSummary(
  selected: Set<IncludeFilter>,
  options: { value: IncludeFilter; label: string }[]
): string {
  if (selected.size === 0) return "None";
  if (options.every((option) => selected.has(option.value))) return "All";
  if (selected.size === 1 && selected.has("matching")) return "Matching only";
  return options
    .filter((option) => selected.has(option.value))
    .map((option) => option.label)
    .join(", ");
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

function isOffTargetRole(job: JobPosting): boolean {
  return roleLooksOffTarget(job.title, job.roleRelevant);
}

function matchesIncludedGroups(
  job: JobPosting,
  included: Set<IncludeFilter>,
  filters: { role: boolean; location: boolean }
): boolean {
  const offTarget = isOffTargetRole(job);
  const outside = job.locationInTarget === false;
  const matching =
    (!filters.role || !offTarget) && (!filters.location || !outside);

  if (included.has("matching") && matching) return true;
  if (filters.role && included.has("off-target") && offTarget) return true;
  if (filters.location && included.has("outside-location") && outside) {
    return true;
  }
  return false;
}

function displayMissingSkills(job: JobPosting): string[] {
  const languageGaps = missingRequiredLanguages(
    `${job.title}\n${job.descriptionText ?? ""}`,
    job.matchedSkills ?? []
  );
  return [
    ...new Map(
      [...(job.missingSkills ?? []), ...languageGaps].map((skill) => [
        skill.toLowerCase(),
        skill,
      ])
    ).values(),
  ];
}

function JobMatchDetails({ job }: { job: JobPosting }) {
  const locationTypes = jobLocationTypes(job);
  const scores = displayJobScores(job);
  const missingSkills = displayMissingSkills(job);
  const roleRelevance = displayRoleRelevance(job);

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
          {scores.skillScore !== undefined && (
            <p>Skills: {scores.skillScore}/100</p>
          )}
          {scores.experienceScore !== undefined && (
            <p>Experience: {scores.experienceScore}/100</p>
          )}
          {job.matchSource === "ollama" && (
            <p className="text-ink-subtle">Scored with local Ollama</p>
          )}
        </div>
      )}
      {job.matchSummary && (
        <p className="text-ink-muted">{job.matchSummary}</p>
      )}
      {scores.experienceNote && (
        <p className="text-ink-muted">{scores.experienceNote}</p>
      )}
      {roleRelevance.note && (
        <p
          className={
            roleRelevance.relevant === false
              ? "text-ink-subtle"
              : roleRelevance.relevant === true
                ? "text-semantic-success"
                : "text-ink-muted"
          }
        >
          Role: {roleRelevance.note}
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
      {locationTypes.length > 0 && (
        <p className="text-ink-muted">
          Work style: {locationTypes.join(", ")}
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
      {missingSkills.length > 0 && (
        <div>
          <p className="font-medium text-ink-subtle">
            Mentioned but not on your resume
          </p>
          <p className="mt-0.5 break-words text-ink-muted">
            {missingSkills.join(", ")}
          </p>
        </div>
      )}
      {job.matchedSkills?.length === 0 && missingSkills.length === 0 && (
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
  onMarkJobsSeen,
  newCount,
  hasResumeProfile,
  showMinScoreFilter = true,
  showRoleFilter = true,
  showLocationFilter = false,
  showLocationTypeFilter = true,
}: JobListProps) {
  const [minScore, setMinScore] = useState(0);
  const [included, setIncluded] = useState<Set<IncludeFilter>>(
    () => new Set(["matching"])
  );
  const [locationTypeFilter, setLocationTypeFilter] = useState<Set<LocationType>>(
    () => new Set(ALL_LOCATION_TYPES)
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [markingJobId, setMarkingJobId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [markingSelected, setMarkingSelected] = useState(false);

  useEffect(() => {
    const newIds = new Set(jobs.filter((job) => job.isNew).map((job) => job.id));
    setSelectedIds((current) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of current) {
        if (newIds.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : current;
    });
  }, [jobs]);

  async function handleMarkJobSeen(jobId: string) {
    if (!onMarkJobSeen || markingJobId || markingSelected) return;

    setMarkingJobId(jobId);
    try {
      await onMarkJobSeen(jobId);
    } finally {
      setMarkingJobId(null);
    }
  }

  function toggleSelected(jobId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }

  function toggleVisibleSelection(visibleIds: string[], checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of visibleIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  async function handleMarkSelected() {
    if (!onMarkJobsSeen || selectedIds.size === 0 || markingSelected) return;

    setMarkingSelected(true);
    try {
      await onMarkJobsSeen([...selectedIds]);
      setSelectedIds(new Set());
    } finally {
      setMarkingSelected(false);
    }
  }

  const roleFilterEnabled = showRoleFilter && hasResumeProfile;
  const locationFilterEnabled = showLocationFilter && hasResumeProfile;
  const includeOptions = INCLUDE_OPTIONS.filter((option) => {
    if (option.value === "off-target") return roleFilterEnabled;
    if (option.value === "outside-location") return locationFilterEnabled;
    return roleFilterEnabled || locationFilterEnabled;
  });

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (minScore > 0 && (displayJobScores(job).matchScore ?? 0) < minScore) {
        return false;
      }
      if (includeOptions.length > 1 && !matchesIncludedGroups(job, included, {
        role: roleFilterEnabled,
        location: locationFilterEnabled,
      })) {
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
    included,
    includeOptions.length,
    roleFilterEnabled,
    locationFilterEnabled,
    showLocationTypeFilter,
    locationTypeFilter,
  ]);

  const visibleNewIds = filteredJobs
    .filter((job) => job.isNew)
    .map((job) => job.id);
  const allVisibleSelected =
    visibleNewIds.length > 0 &&
    visibleNewIds.every((id) => selectedIds.has(id));

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
          {includeOptions.length > 0 && (
            <FilterMultiSelect
              label="Include"
              options={includeOptions}
              selected={included}
              onChange={setIncluded}
              summary={includeSummary(included, includeOptions)}
            />
          )}
          {showLocationTypeFilter && (
            <FilterMultiSelect
              label="Work style"
              options={ALL_LOCATION_TYPES.map((type) => ({
                value: type,
                label: type,
              }))}
              selected={locationTypeFilter}
              onChange={setLocationTypeFilter}
              summary={workStyleSummary(locationTypeFilter)}
            />
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
        <div className="alert-banner-accent flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-ink">
            {newCount} new posting{newCount === 1 ? "" : "s"} since last review
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {onMarkJobsSeen && visibleNewIds.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-ink-muted">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(event) =>
                    toggleVisibleSelection(visibleNewIds, event.target.checked)
                  }
                  disabled={markingSelected}
                  className="checkbox-field"
                />
                Select all shown
              </label>
            )}
            {onMarkJobsSeen && (
              <button
                type="button"
                onClick={handleMarkSelected}
                disabled={selectedIds.size === 0 || markingSelected}
                className="btn-secondary"
              >
                {markingSelected
                  ? "Saving..."
                  : `Mark selected seen${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
              </button>
            )}
            <button
              type="button"
              onClick={onMarkSeen}
              disabled={markingSelected}
              className="btn-primary"
            >
              Mark all seen
            </button>
          </div>
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
            const scores = displayJobScores(job);
            const canExpand =
              hasResumeProfile &&
              (job.matchScore !== undefined || Boolean(job.scoreError));

            return (
              <li key={job.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  {job.isNew && onMarkJobsSeen && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(job.id)}
                      onChange={() => toggleSelected(job.id)}
                      disabled={markingSelected}
                      aria-label={`Select ${job.title}`}
                      className="checkbox-field mt-1"
                    />
                  )}
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
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
                      {job.postedAt && ` · Posted: ${formatDay(job.postedAt)}`}
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
                            disabled={markingJobId === job.id || markingSelected}
                            className="btn-tertiary px-0 py-0 text-xs disabled:opacity-60"
                          >
                            {markingJobId === job.id ? "Saving..." : "Mark seen"}
                          </button>
                        )}
                      </div>
                    )}
                    {isOffTargetRole(job) && included.has("off-target") && (
                      <span className="status-badge font-semibold">
                        Off-target
                      </span>
                    )}
                    {job.locationInTarget === false && included.has("outside-location") && (
                      <span className="status-badge font-semibold">
                        Outside location
                      </span>
                    )}
                    {jobLocationTypes(job).map((type) => (
                      <span
                        key={type}
                        className={`font-semibold ${locationTypeBadgeClass(type)}`}
                      >
                        {type}
                      </span>
                    ))}
                    {scores.matchScore !== undefined && (
                      <span
                        className={`font-semibold ${scoreBadgeClass(scores.matchScore)}`}
                      >
                        {scores.matchScore}/100
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
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
