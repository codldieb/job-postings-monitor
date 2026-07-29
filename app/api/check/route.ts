import { NextResponse } from "next/server";
import { runDailyCheck } from "@/lib/checker";
import { scoreNewJobs } from "@/lib/scoring/score-jobs";

export async function POST() {
  const result = await runDailyCheck();

  const newJobIds = result.results.flatMap((siteResult) =>
    siteResult.newJobs.map((job) => job.id)
  );

  const scoreResult = await scoreNewJobs(newJobIds);

  return NextResponse.json({ ...result, scoreResult });
}
