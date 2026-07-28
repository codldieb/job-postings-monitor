import { NextResponse } from "next/server";
import { markAllJobsSeen } from "@/lib/db";

export async function POST() {
  await markAllJobsSeen();
  return NextResponse.json({ success: true });
}
