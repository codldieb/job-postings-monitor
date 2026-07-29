import { NextResponse } from "next/server";
import { scoreJobs } from "@/lib/scoring/score-jobs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const force = body?.force === true;
  const jobIds = Array.isArray(body?.jobIds)
    ? body.jobIds.filter((id: unknown): id is string => typeof id === "string")
    : undefined;

  const result = await scoreJobs({
    jobIds,
    onlyUnscored: !force && !jobIds?.length,
    force,
  });

  return NextResponse.json(result);
}
