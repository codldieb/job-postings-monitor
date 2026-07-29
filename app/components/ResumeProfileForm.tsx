"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_TARGET_DEPARTMENTS } from "@/lib/jobs/role-relevance";
import type { PositionExperience, ScoreJobsResult, ScoreProgressEvent } from "@/lib/types";

interface ResumeProfileFormProps {
  onUpdated: () => void;
}

interface PositionRow {
  id: string;
  position: string;
  years: string;
}

function createRow(entry?: PositionExperience): PositionRow {
  return {
    id: crypto.randomUUID(),
    position: entry?.position ?? "",
    years: entry?.years !== undefined ? String(entry.years) : "",
  };
}

function rowsFromProfile(
  positionExperience: PositionExperience[] | undefined
): PositionRow[] {
  if (!positionExperience?.length) {
    return [createRow()];
  }

  return positionExperience.map((entry) => createRow(entry));
}

function rowsToPositionExperience(rows: PositionRow[]): PositionExperience[] {
  return rows
    .map((row) => ({
      position: row.position.trim(),
      years: Number.parseFloat(row.years),
    }))
    .filter(
      (entry) =>
        entry.position &&
        Number.isFinite(entry.years) &&
        entry.years >= 0 &&
        entry.years <= 50
    );
}

interface ScoreProgressState {
  total: number;
  completed: number;
  currentJobTitle?: string;
  isRunning: boolean;
}

function parseScoreSseChunk(
  chunk: string,
  onEvent: (event: ScoreProgressEvent) => void
) {
  for (const line of chunk.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    onEvent(JSON.parse(line.slice(6)) as ScoreProgressEvent);
  }
}

function formatScoreMessage(result: ScoreJobsResult): string {
  if (result.cancelled) {
    return `Stopped after scoring ${result.scored + result.failed} job(s). ${result.scored} succeeded, ${result.failed} failed.`;
  }

  return (
    `Rescored ${result.scored} job(s)` +
    (result.failed > 0 ? ` (${result.failed} failed)` : "") +
    "."
  );
}

export default function ResumeProfileForm({ onUpdated }: ResumeProfileFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [skillsText, setSkillsText] = useState("");
  const [positionRows, setPositionRows] = useState<PositionRow[]>([createRow()]);
  const [targetDepartmentsText, setTargetDepartmentsText] = useState("");
  const [targetCountriesText, setTargetCountriesText] = useState("");
  const [targetContinentsText, setTargetContinentsText] = useState("");
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [resumeUploadedAt, setResumeUploadedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const [scoreProgress, setScoreProgress] = useState<ScoreProgressState | null>(
    null
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const response = await fetch("/api/resume");
      const data = await response.json();
      setSkillsText((data.profile?.skills ?? []).join("\n"));
      setPositionRows(rowsFromProfile(data.profile?.positionExperience));
      setTargetDepartmentsText(
        (data.profile?.targetDepartments ?? []).join("\n")
      );
      setTargetCountriesText((data.profile?.targetCountries ?? []).join("\n"));
      setTargetContinentsText(
        (data.profile?.targetContinents ?? []).join("\n")
      );
      setResumeFileName(data.profile?.resumeFileName ?? null);
      setResumeUploadedAt(data.profile?.resumeUploadedAt ?? null);
      setLoading(false);
    }

    loadProfile();
  }, []);

  async function rescoreAllJobs(): Promise<ScoreJobsResult> {
    setScoreProgress({
      total: 0,
      completed: 0,
      isRunning: true,
    });

    const response = await fetch("/api/jobs/score/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force: true }),
    });

    if (!response.ok) {
      throw new Error("Failed to start rescoring");
    }

    if (!response.body) {
      throw new Error("Streaming is not supported in this browser");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResult: ScoreJobsResult | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        parseScoreSseChunk(part, (event) => {
          if (event.type === "start") {
            setScoreProgress({
              total: event.totalJobs ?? 0,
              completed: 0,
              isRunning: true,
            });
          }

          if (event.type === "job-start") {
            setScoreProgress({
              total: event.totalJobs ?? 0,
              completed: Math.max(0, (event.index ?? 1) - 1),
              currentJobTitle: event.jobTitle,
              isRunning: true,
            });
          }

          if (event.type === "job-complete") {
            setScoreProgress({
              total: event.totalJobs ?? 0,
              completed: event.index ?? 0,
              currentJobTitle: event.jobTitle,
              isRunning: true,
            });
          }

          if (
            (event.type === "complete" || event.type === "cancelled") &&
            event.result
          ) {
            finalResult = event.result;
            setScoreProgress({
              total: event.totalJobs ?? event.result.scored + event.result.failed,
              completed: event.result.scored + event.result.failed,
              isRunning: false,
            });
          }

          if (event.type === "error") {
            throw new Error(event.message || "Failed to rescore jobs");
          }
        });
      }
    }

    if (!finalResult) {
      throw new Error("Rescoring finished without a result");
    }

    return finalResult;
  }

  function updatePositionRow(id: string, field: "position" | "years", value: string) {
    setPositionRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }

  function addPositionRow() {
    setPositionRows((rows) => [...rows, createRow()]);
  }

  function removePositionRow(id: string) {
    setPositionRows((rows) => {
      const next = rows.filter((row) => row.id !== id);
      return next.length > 0 ? next : [createRow()];
    });
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const skills = skillsText
        .split("\n")
        .map((skill) => skill.trim())
        .filter(Boolean);
      const targetDepartments = targetDepartmentsText
        .split("\n")
        .map((department) => department.trim())
        .filter(Boolean);
      const targetCountries = targetCountriesText
        .split("\n")
        .map((country) => country.trim())
        .filter(Boolean);
      const targetContinents = targetContinentsText
        .split("\n")
        .map((continent) => continent.trim())
        .filter(Boolean);

      const response = await fetch("/api/resume", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skills,
          positionExperience: rowsToPositionExperience(positionRows),
          targetDepartments,
          targetCountries,
          targetContinents,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save profile");
      }

      setSkillsText((data.profile?.skills ?? []).join("\n"));
      setPositionRows(rowsFromProfile(data.profile?.positionExperience));
      setTargetDepartmentsText(
        (data.profile?.targetDepartments ?? []).join("\n")
      );
      setTargetCountriesText((data.profile?.targetCountries ?? []).join("\n"));
      setTargetContinentsText(
        (data.profile?.targetContinents ?? []).join("\n")
      );
      setMessage(
        `Saved ${data.profile.skills.length} skill(s) and ${data.profile.positionExperience?.length ?? 0} position(s). Use "Rescore all jobs" when you're ready to update match scores.`
      );
      onUpdated();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const response = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to upload resume");
      }

      setSkillsText((data.profile?.skills ?? []).join("\n"));
      setPositionRows(rowsFromProfile(data.profile?.positionExperience));
      setResumeFileName(data.profile?.resumeFileName ?? file.name);
      setResumeUploadedAt(data.profile?.resumeUploadedAt ?? null);

      const addedCount = data.suggestedSkills?.length ?? 0;
      const positionCount = data.suggestedPositions?.length ?? 0;
      const positionNote =
        positionCount > 0
          ? ` Detected ${positionCount} position(s) from your work history.`
          : "";
      setMessage(
        `Uploaded ${file.name}, suggested ${addedCount} skill(s), and built ${data.synonymCount ?? 0} synonym group(s).${positionNote} Review and edit below, then use "Rescore all jobs" when ready.`
      );

      onUpdated();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to upload resume");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleRescoreAll() {
    setRescoring(true);
    setMessage(null);

    try {
      const scoreData = await rescoreAllJobs();
      setMessage(formatScoreMessage(scoreData));
      onUpdated();
      window.setTimeout(() => {
        setScoreProgress(null);
      }, 2500);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to rescore jobs");
      setScoreProgress(null);
    } finally {
      setRescoring(false);
    }
  }

  const skillCount = skillsText
    .split("\n")
    .map((skill) => skill.trim())
    .filter(Boolean).length;

  const positionCount = rowsToPositionExperience(positionRows).length;

  const scorePercent =
    scoreProgress && scoreProgress.total > 0
      ? Math.round((scoreProgress.completed / scoreProgress.total) * 100)
      : scoreProgress?.isRunning
        ? 12
        : 100;

  if (loading) {
    return <p className="text-sm text-slate-500">Loading resume profile...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-4">
        <details open={!resumeFileName}>
          <summary className="cursor-pointer text-sm font-medium text-slate-900">
            Upload resume (PDF)
          </summary>
          <p className="mt-2 text-sm text-slate-600">
            Skills and position history are extracted from your PDF and merged
            into the sections below. Review the results, edit as needed, then
            click &quot;Rescore all jobs&quot; when you&apos;re ready to update
            match scores.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleUpload}
              disabled={uploading}
              className="block text-sm text-stone-600 file:mr-3 file:rounded-full file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-500"
            />
            {uploading && (
              <span className="text-sm text-slate-500">Processing PDF...</span>
            )}
          </div>
        </details>
        {resumeFileName && (
          <p className="mt-2 text-xs text-slate-500">
            Last upload: {resumeFileName}
            {resumeUploadedAt
              ? ` · ${new Date(resumeUploadedAt).toLocaleString()}`
              : ""}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-slate-900">Position experience</p>
          <p className="mt-1 text-xs text-slate-500">
            Add each role type and how many years you&apos;ve spent in it. Jobs
            are matched against the most relevant position (e.g. Software
            Engineer vs QA Analyst).
          </p>
        </div>

        <div className="space-y-2">
          {positionRows.map((row) => (
            <div key={row.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                value={row.position}
                onChange={(event) =>
                  updatePositionRow(row.id, "position", event.target.value)
                }
                placeholder="Software Engineer"
                className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-stone-50/50 px-3 py-2 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={row.years}
                  onChange={(event) =>
                    updatePositionRow(row.id, "years", event.target.value)
                  }
                  placeholder="Years"
                  className="w-24 rounded-xl border border-stone-300 bg-stone-50/50 px-3 py-2 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
                <button
                  type="button"
                  onClick={() => removePositionRow(row.id)}
                  className="rounded-full border border-stone-300 px-3 py-2 text-xs font-medium text-stone-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addPositionRow}
          className="rounded-full border border-dashed border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50"
        >
          Add position
        </button>
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium text-slate-900">Target locations</p>
          <p className="mt-1 text-xs text-slate-500">
            Flag jobs outside your preferred countries or continents. Use one
            entry per line. Aliases like US, USA, and United States work. Leave
            both empty to skip location filtering.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-700">Countries</p>
            <textarea
              value={targetCountriesText}
              onChange={(event) => setTargetCountriesText(event.target.value)}
              rows={3}
              placeholder={"United States\nCanada"}
              className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3 py-2 font-mono text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-700">Continents</p>
            <textarea
              value={targetContinentsText}
              onChange={(event) => setTargetContinentsText(event.target.value)}
              rows={3}
              placeholder={"North America"}
              className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3 py-2 font-mono text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium text-slate-900">Target departments</p>
          <p className="mt-1 text-xs text-slate-500">
            One department or area per line. Jobs outside these areas (plus
            obvious non-technical titles) are marked off-target. Leave empty to
            use defaults like Engineering, IT, and Technology.
          </p>
        </div>
        <textarea
          value={targetDepartmentsText}
          onChange={(event) => setTargetDepartmentsText(event.target.value)}
          rows={4}
          placeholder={DEFAULT_TARGET_DEPARTMENTS.join("\n")}
          className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3 py-2 font-mono text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <p className="text-sm text-slate-600">
        One skill per line. Edit before saving or rescoring.
      </p>

      <textarea
        value={skillsText}
        onChange={(event) => setSkillsText(event.target.value)}
        rows={10}
        placeholder={"Python\nReact\nAWS\n..."}
        className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3 py-2 font-mono text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
      />

      {(rescoring || scoreProgress) && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <p className="font-medium text-slate-900">
              {scoreProgress?.isRunning ? "Scoring jobs..." : "Scoring complete"}
            </p>
            <p className="shrink-0 text-slate-500">
              {scoreProgress && scoreProgress.total > 0
                ? `${scoreProgress.completed} / ${scoreProgress.total}`
                : rescoring
                  ? "Preparing..."
                  : "Done"}
            </p>
          </div>

          <div className="h-2.5 overflow-hidden rounded-full bg-emerald-100">
            <div
              className={`h-full rounded-full bg-gradient-to-r from-lime-400 via-emerald-500 to-green-600 transition-all duration-500 ease-out ${scoreProgress?.isRunning && scoreProgress.total === 0 ? "animate-pulse" : ""}`}
              style={{ width: `${scorePercent}%` }}
            />
          </div>

          <p className="mt-2 truncate text-xs text-slate-500">
            {scoreProgress?.isRunning && scoreProgress.currentJobTitle
              ? `Scoring ${scoreProgress.currentJobTitle}...`
              : scoreProgress?.isRunning
                ? "Loading jobs to score..."
                : scoreProgress
                  ? `Finished ${scoreProgress.total} job${scoreProgress.total === 1 ? "" : "s"}`
                  : ""}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          {skillCount} skill(s) · {positionCount} position(s)
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || skillCount === 0}
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save profile"}
          </button>
          <button
            type="button"
            onClick={handleRescoreAll}
            disabled={rescoring || skillCount === 0}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900 disabled:opacity-60"
          >
            {rescoring ? "Scoring..." : "Rescore all jobs"}
          </button>
        </div>
      </div>

      {message && <p className="break-words text-sm text-slate-600">{message}</p>}
    </div>
  );
}
