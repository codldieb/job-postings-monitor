import { NextResponse } from "next/server";
import { getJobs } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const newOnly = searchParams.get("new") === "true";

  const jobs = await getJobs();
  const filtered = newOnly ? jobs.filter((job) => job.isNew) : jobs;

  const sorted = filtered.sort((a, b) => {
    const aScore = a.matchScore ?? -1;
    const bScore = b.matchScore ?? -1;
    if (bScore !== aScore) return bScore - aScore;
    return (
      new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime()
    );
  });

  return NextResponse.json({
    jobs: sorted,
    total: filtered.length,
    newCount: jobs.filter((job) => job.isNew).length,
  });
}
