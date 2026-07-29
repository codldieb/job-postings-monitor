import { scoreJobs } from "@/lib/scoring/score-jobs";
import type { ScoreProgressEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function createEventStream(
  signal: AbortSignal,
  onEvent: (send: (event: ScoreProgressEvent) => void) => Promise<void>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const send = (event: ScoreProgressEvent) => {
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
            message: error instanceof Error ? error.message : "Scoring failed",
          });
        }
      } finally {
        controller.close();
      }
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const force = body?.force === true;
  const jobIds = Array.isArray(body?.jobIds)
    ? body.jobIds.filter((id: unknown): id is string => typeof id === "string")
    : undefined;

  const stream = createEventStream(request.signal, async (send) => {
    await scoreJobs(
      {
        jobIds,
        onlyUnscored: !force && !jobIds?.length,
        force,
      },
      send,
      request.signal
    );
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
