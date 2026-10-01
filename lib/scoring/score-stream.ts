import type { ScoreJobsResult, ScoreProgressEvent } from "@/lib/types";

export interface StreamScoreJobsOptions {
  force?: boolean;
  jobIds?: string[];
  signal?: AbortSignal;
  onEvent?: (event: ScoreProgressEvent) => void;
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

export async function streamScoreJobs(
  options: StreamScoreJobsOptions = {}
): Promise<ScoreJobsResult> {
  const response = await fetch("/api/jobs/score/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      force: options.force === true,
      jobIds: options.jobIds,
    }),
    signal: options.signal,
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

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        parseScoreSseChunk(part, (event) => {
          options.onEvent?.(event);

          if (
            (event.type === "complete" || event.type === "cancelled") &&
            event.result
          ) {
            finalResult = event.result;
          }

          if (event.type === "error") {
            throw new Error(event.message || "Failed to rescore jobs");
          }
        });
      }
    }
  } catch (error) {
    if (options.signal?.aborted) {
      return (
        finalResult ?? { scored: 0, failed: 0, skipped: 0, cancelled: true }
      );
    }
    throw error;
  }

  if (!finalResult) {
    throw new Error("Scoring ended without a result");
  }

  return finalResult;
}
