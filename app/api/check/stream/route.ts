import { runDailyCheck } from "@/lib/checker";
import { scoreNewJobs } from "@/lib/scoring/score-jobs";
import type { CheckLogEntry, CheckProgressEvent, ScoreJobsResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function createEventStream(
  signal: AbortSignal,
  onEvent: (send: (event: CheckProgressEvent) => void) => Promise<void>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const send = (event: CheckProgressEvent) => {
        if (signal.aborted && event.type !== "cancelled") return;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };

      try {
        await onEvent(send);
      } catch (error) {
        if (!signal.aborted) {
          send({
            type: "error",
            message: error instanceof Error ? error.message : "Check failed",
          });
        }
      } finally {
        controller.close();
      }
    },
  });
}

async function scoreDiscoveredJobs(
  newJobIds: string[],
  send: (event: CheckProgressEvent) => void
): Promise<ScoreJobsResult> {
  if (newJobIds.length === 0) {
    return { scored: 0, failed: 0, skipped: 0 };
  }

  send({ type: "score-start", totalJobs: newJobIds.length });

  return scoreNewJobs(newJobIds, (event) => {
    if (event.type === "job-start") {
      send({
        type: "score-progress",
        index: event.index,
        totalJobs: event.totalJobs,
        jobTitle: event.jobTitle,
      });
    }
  });
}

export async function POST(request: Request) {
  const signal = request.signal;

  const stream = createEventStream(signal, async (send) => {
    const result = await runDailyCheck((event) => {
      send(event);
    }, { signal });

    const newJobIds = result.results.flatMap((siteResult) =>
      siteResult.newJobs.map((job) => job.id)
    );

    const scoreResult = await scoreDiscoveredJobs(newJobIds, send);

    if (signal.aborted || result.cancelled) {
      send({ type: "cancelled", result, scoreResult });
      return;
    }

    send({ type: "complete", result, scoreResult });
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function formatCheckMessage(result: CheckLogEntry): string {
  const archivedLabel =
    result.jobsArchived > 0
      ? ` Archived ${result.jobsArchived} unavailable posting(s).`
      : "";

  if (result.cancelled) {
    return `Stopped after ${result.sitesChecked} of ${result.totalSites} site(s). Found ${result.newJobsFound} new posting(s).${archivedLabel}`;
  }

  return `Checked ${result.sitesChecked} site(s). Found ${result.newJobsFound} new posting(s).${archivedLabel}`;
}
