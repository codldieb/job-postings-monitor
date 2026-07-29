import { NextResponse } from "next/server";
import { getArchivedJobs } from "@/lib/db";

export async function GET() {
  const jobs = await getArchivedJobs();

  return NextResponse.json({
    jobs: jobs.sort(
      (a, b) =>
        new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime()
    ),
    total: jobs.length,
  });
}
