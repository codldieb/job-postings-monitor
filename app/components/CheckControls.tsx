"use client";

import { useRef, useState } from "react";
import type { CheckLogEntry, CheckProgressEvent, ScoreJobsResult } from "@/lib/types";

export interface CheckProgressState {
  total: number;
  completed: number;
  currentSiteName?: string;
  currentJobTitle?: string;
  phase: "checking" | "scoring";
  isRunning: boolean;
  stopped?: boolean;
}

interface CheckControlsProps {
  onComplete: () => void;
  onMessage?: (message: string | null) => void;
  onProgress?: (progress: CheckProgressState | null) => void;
}

function parseSseChunk(
  chunk: string,
  onEvent: (event: CheckProgressEvent) => void
) {
  for (const line of chunk.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    onEvent(JSON.parse(line.slice(6)) as CheckProgressEvent);
  }
}

function formatCheckMessage(
  result: CheckLogEntry,
  scoreResult?: ScoreJobsResult
): string {
  const archivedLabel =
    result.jobsArchived > 0
      ? ` Archived ${result.jobsArchived} unavailable posting(s).`
      : "";

  const scoredLabel =
    scoreResult && scoreResult.scored + scoreResult.failed > 0
      ? ` Scored ${scoreResult.scored} new job(s)` +
        (scoreResult.failed > 0 ? ` (${scoreResult.failed} failed)` : "") +
        "."
      : "";

  if (result.cancelled) {
    return `Stopped after ${result.sitesChecked} of ${result.totalSites ?? result.sitesChecked} site(s). Found ${result.newJobsFound} new posting(s).${archivedLabel}${scoredLabel}`;
  }

  return `Checked ${result.sitesChecked} site(s). Found ${result.newJobsFound} new posting(s).${archivedLabel}${scoredLabel}`;
}

export default function CheckControls({
  onComplete,
  onMessage,
  onProgress,
}: CheckControlsProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<CheckProgressState | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const progressRef = useRef<CheckProgressState | null>(null);

  function updateProgress(next: CheckProgressState | null) {
    progressRef.current = next;
    setProgress(next);
    onProgress?.(next);
  }

  async function handleCheck() {
    setIsRunning(true);
    onMessage?.(null);
    updateProgress({
      total: 0,
      completed: 0,
      phase: "checking",
      isRunning: true,
    });

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const response = await fetch("/api/check/stream", {
        method: "POST",
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error("Check failed to start");
      }

      if (!response.body) {
        throw new Error("Streaming is not supported in this browser");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: CheckLogEntry | null = null;
      let finalScoreResult: ScoreJobsResult | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          parseSseChunk(part, (event) => {
            if (event.type === "start") {
              updateProgress({
                total: event.totalSites ?? 0,
                completed: 0,
                phase: "checking",
                isRunning: true,
              });
            }

            if (event.type === "site-start") {
              updateProgress({
                total: event.totalSites ?? 0,
                completed: Math.max(0, (event.index ?? 1) - 1),
                currentSiteName: event.siteName,
                phase: "checking",
                isRunning: true,
              });
            }

            if (event.type === "site-complete") {
              updateProgress({
                total: event.totalSites ?? 0,
                completed: event.index ?? 0,
                currentSiteName: event.siteName,
                phase: "checking",
                isRunning: true,
              });
            }

            if (event.type === "score-start") {
              updateProgress({
                total: event.totalJobs ?? 0,
                completed: 0,
                phase: "scoring",
                isRunning: true,
              });
            }

            if (event.type === "score-progress") {
              updateProgress({
                total: event.totalJobs ?? 0,
                completed: Math.max(0, (event.index ?? 1) - 1),
                currentJobTitle: event.jobTitle,
                phase: "scoring",
                isRunning: true,
              });
            }

            if (
              (event.type === "complete" || event.type === "cancelled") &&
              event.result
            ) {
              finalResult = event.result;
              finalScoreResult = event.scoreResult;
              updateProgress({
                total:
                  event.scoreResult &&
                  event.scoreResult.scored + event.scoreResult.failed > 0
                    ? event.scoreResult.scored + event.scoreResult.failed
                    : event.result.totalSites ?? event.result.sitesChecked,
                completed:
                  event.scoreResult &&
                  event.scoreResult.scored + event.scoreResult.failed > 0
                    ? event.scoreResult.scored + event.scoreResult.failed
                    : event.result.sitesChecked,
                phase: "scoring",
                isRunning: false,
                stopped: event.type === "cancelled" || event.result.cancelled,
              });
            }

            if (event.type === "error") {
              throw new Error(event.message || "Check failed");
            }
          });
        }
      }

      if (!finalResult) {
        if (abortController.signal.aborted) {
          const last = progressRef.current;
          onMessage?.(
            last && last.total > 0
              ? `Check stopped after ${last.completed} of ${last.total} site(s).`
              : "Check stopped."
          );
          onComplete();
          return;
        }

        throw new Error("Check finished without a result");
      }

      onMessage?.(formatCheckMessage(finalResult, finalScoreResult));
      onComplete();

      window.setTimeout(() => {
        updateProgress(null);
      }, 2500);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        const last = progressRef.current;
        updateProgress(
          last
            ? { ...last, isRunning: false, stopped: true }
            : null
        );
        onMessage?.(
          last && last.total > 0
            ? `Check stopped after ${last.completed} of ${last.total} site(s).`
            : "Check stopped."
        );
        onComplete();
        window.setTimeout(() => {
          updateProgress(null);
        }, 2500);
        return;
      }

      onMessage?.(err instanceof Error ? err.message : "Check failed");
      updateProgress(null);
    } finally {
      abortRef.current = null;
      setIsRunning(false);
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  const percent =
    progress && progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : progress?.isRunning
        ? 12
        : 100;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-3 backdrop-blur-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          {isRunning || progress ? (
            <>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <p className="font-medium text-white">
                  {progress?.stopped
                    ? "Check stopped"
                    : isRunning && progress?.phase === "scoring"
                      ? "Scoring new jobs..."
                      : isRunning
                        ? "Checking sites..."
                        : "Check complete"}
                </p>
                <p className="shrink-0 text-emerald-100/80">
                  {progress && progress.total > 0
                    ? `${progress.completed} / ${progress.total}`
                    : isRunning
                      ? "Preparing..."
                      : "Done"}
                </p>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-emerald-950/40">
                <div
                  className={`h-full rounded-full bg-gradient-to-r from-lime-300 via-emerald-400 to-green-500 transition-all duration-500 ease-out ${isRunning && progress?.total === 0 ? "animate-pulse" : ""}`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              <p className="mt-2 truncate text-xs text-emerald-100/75">
                {isRunning && progress?.phase === "scoring" && progress.currentJobTitle
                  ? `Scoring ${progress.currentJobTitle}...`
                  : isRunning && progress?.phase === "scoring"
                    ? "Preparing to score new jobs..."
                    : isRunning && progress?.currentSiteName
                      ? `Scraping ${progress.currentSiteName}...`
                      : isRunning
                        ? "Starting check..."
                        : progress?.stopped
                          ? `Stopped after ${progress.completed} of ${progress.total} site(s)`
                          : progress
                            ? progress.phase === "scoring"
                              ? `Finished scoring ${progress.total} new job${progress.total === 1 ? "" : "s"}`
                              : `Finished ${progress.total} site${progress.total === 1 ? "" : "s"}`
                            : ""}
              </p>
            </>
          ) : (
            <p className="text-sm text-emerald-100/85">
              Run a manual check of all monitored career pages.
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-2 self-end sm:self-center">
          {isRunning ? (
            <button
              type="button"
              onClick={handleStop}
              className="rounded-full border border-red-400/60 bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-red-950/30 transition hover:bg-red-500"
            >
              Stop check
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCheck}
              className="btn-primary disabled:shadow-none"
            >
              Run check
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
