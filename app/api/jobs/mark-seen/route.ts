import { markAllJobsSeen, markJobSeen } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let jobId: string | undefined;

  try {
    const body = (await request.json()) as { jobId?: unknown };
    if (typeof body.jobId === "string" && body.jobId.trim()) {
      jobId = body.jobId.trim();
    }
  } catch {
    // Empty body marks all jobs seen.
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
