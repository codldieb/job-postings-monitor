import { NextResponse } from "next/server";
import { getCheckLog } from "@/lib/db";

export async function GET() {
  const log = await getCheckLog();
  return NextResponse.json({ log });
}
