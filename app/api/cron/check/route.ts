import { NextResponse } from "next/server";
import { runDailyCheck } from "@/lib/checker";
import { scoreNewJobs } from "@/lib/scoring/score-jobs";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runDailyCheck();

  const newJobIds = result.results.flatMap((siteResult) =>
    siteResult.newJobs.map((job) => job.id)
  );

  const scoreResult = await scoreNewJobs(newJobIds);

  return NextResponse.json({ ...result, scoreResult });
}
