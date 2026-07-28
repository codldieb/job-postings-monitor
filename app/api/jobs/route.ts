import { NextResponse } from "next/server";
import { getJobs } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const newOnly = searchParams.get("new") === "true";

  const jobs = await getJobs();
  const filtered = newOnly ? jobs.filter((job) => job.isNew) : jobs;

  return NextResponse.json({
    jobs: filtered.sort(
      (a, b) =>
        new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime()
    ),
    total: filtered.length,
    newCount: jobs.filter((job) => job.isNew).length,
  });
}
