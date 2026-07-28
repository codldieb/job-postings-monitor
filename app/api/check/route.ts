import { NextResponse } from "next/server";
import { runDailyCheck } from "@/lib/checker";

export async function POST() {
  const result = await runDailyCheck();
  return NextResponse.json(result);
}
