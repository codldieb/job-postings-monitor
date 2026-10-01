"use client";

import { useRef, useState } from "react";
import { streamScoreJobs } from "@/lib/scoring/score-stream";
import type { ScoreJobsResult, ScoreProgressEvent } from "@/lib/types";

interface ScoreProgressState {
  total: number;
  completed: number;
  currentJobTitle?: string;
  isRunning: boolean;
  stopped?: boolean;
}

interface RescoreJobsControlProps {
  jobIds: string[];
  disabled?: boolean;
  label?: string;
  onComplete?: () => void;
  onMessage?: (message: string | null) => void;
}

function formatScoreMessage(result: ScoreJobsResult): string {
  if (result.cancelled) {
    return `Stopped after scoring ${result.scored + result.failed} new job(s). ${result.scored} succeeded, ${result.failed} failed.`;
  }

  return (
    `Rescored ${result.scored} new job(s)` +
    (result.failed > 0 ? ` (${result.failed} failed)` : "") +
    "."
  );
}

export default function RescoreJobsControl({
  jobIds,
  disabled = false,
  label = "Rescore new jobs",
  onComplete,
  onMessage,
}: RescoreJobsControlProps) {
  const [progress, setProgress] = useState<ScoreProgressState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  function applyEvent(event: ScoreProgressEvent) {
    if (event.type === "start") {
      setProgress({
        total: event.totalJobs ?? 0,
        completed: 0,
        isRunning: true,
      });
    }

    if (event.type === "job-start") {
      setProgress({
        total: event.totalJobs ?? 0,
        completed: Math.max(0, (event.index ?? 1) - 1),
        currentJobTitle: event.jobTitle,
        isRunning: true,
      });
    }

    if (event.type === "job-complete") {
      setProgress({
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
      setProgress({
        total: event.totalJobs ?? event.result.scored + event.result.failed,
        completed: event.result.scored + event.result.failed,
        isRunning: false,
        stopped: event.type === "cancelled",
      });
    }
  }

  async function handleRescore() {
    if (jobIds.length === 0) return;

    setIsRunning(true);
    onMessage?.(null);
    setProgress({
      total: jobIds.length,
      completed: 0,
      isRunning: true,
    });

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const result = await streamScoreJobs({
        force: true,
        jobIds,
        signal: abortController.signal,
        onEvent: applyEvent,
      });
      if (result.cancelled) {
        setProgress((prev) => ({
          total: prev?.total ?? jobIds.length,
          completed: prev?.completed ?? result.scored + result.failed,
          isRunning: false,
          stopped: true,
        }));
      }
      onMessage?.(formatScoreMessage(result));
      onComplete?.();
    } catch (error) {
      if (abortController.signal.aborted) {
        onMessage?.("Stopped rescoring new jobs.");
        onComplete?.();
      } else {
        onMessage?.(
          error instanceof Error ? error.message : "Failed to rescore new jobs"
        );
      }
    } finally {
      setIsRunning(false);
      abortRef.current = null;
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  const percent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.completed / progress.total) * 100))
      : isRunning
        ? 8
        : progress
          ? 100
          : 0;

  return (
    <div className="control-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          {isRunning || progress ? (
            <>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <p className="font-medium text-ink">
                  {progress?.stopped
                    ? "Rescore stopped"
                    : isRunning
                      ? "Scoring new jobs..."
                      : "Rescore complete"}
                </p>
                <p className="shrink-0 text-ink-subtle">
                  {progress && progress.total > 0
                    ? `${progress.completed} / ${progress.total}`
                    : isRunning
                      ? "Preparing..."
                      : "Done"}
                </p>
              </div>

              <div className="progress-track">
                <div
                  className={`progress-fill ${isRunning && (progress?.total ?? 0) === 0 ? "animate-pulse" : ""}`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              <p className="caption-text mt-2 truncate">
                {isRunning && progress?.currentJobTitle
                  ? `Scoring ${progress.currentJobTitle}...`
                  : isRunning
                    ? "Loading new jobs to score..."
                    : progress?.stopped
                      ? `Stopped after ${progress.completed} of ${progress.total} new job(s)`
                      : progress
                        ? `Finished ${progress.total} new job${progress.total === 1 ? "" : "s"}`
                        : ""}
              </p>
            </>
          ) : (
            <p className="body-text">
              Rescore only the {jobIds.length} new posting
              {jobIds.length === 1 ? "" : "s"}
              {disabled ? ". Add skills to your resume profile first." : "."}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-2 self-end sm:self-center">
          {isRunning ? (
            <button type="button" onClick={handleStop} className="btn-danger">
              Stop rescore
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRescore}
              disabled={disabled || jobIds.length === 0}
              className="btn-secondary"
            >
              {label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
