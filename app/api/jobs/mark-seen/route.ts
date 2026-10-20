import { markAllJobsSeen, markJobSeen, markJobsSeen } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let jobId: string | undefined;
  let jobIds: string[] | undefined;

  try {
    const body = (await request.json()) as { jobId?: unknown; jobIds?: unknown };
    if (typeof body.jobId === "string" && body.jobId.trim()) {
      jobId = body.jobId.trim();
    }
    if (Array.isArray(body.jobIds)) {
      jobIds = body.jobIds.filter(
        (id): id is string => typeof id === "string" && id.trim().length > 0
      );
    }
  } catch {
    // Empty body marks all jobs seen.
  }

  if (jobIds) {
    if (jobIds.length === 0) {
      return NextResponse.json({ error: "No jobs selected" }, { status: 400 });
    }

    const updated = await markJobsSeen(jobIds);
    return NextResponse.json({ success: true, updated });
  }

  if (jobId) {
    const job = await markJobSeen(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, job });
  }

  await markAllJobsSeen();
  return NextResponse.json({ success: true });
}
