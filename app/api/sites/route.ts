import { NextResponse } from "next/server";
import { addSite, getLatestCheckStatusBySite, getSites } from "@/lib/db";
import type { AddSiteInput, MonitoredSite } from "@/lib/types";

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET() {
  const [sites, checkStatus] = await Promise.all([
    getSites(),
    getLatestCheckStatusBySite(),
  ]);
  return NextResponse.json({ sites, checkStatus });
}

export async function POST(request: Request) {
  let body: AddSiteInput;

  try {
    body = (await request.json()) as AddSiteInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  const url = body.url?.trim();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (!url || !isValidUrl(url)) {
    return NextResponse.json(
      { error: "A valid http(s) URL is required" },
      { status: 400 }
    );
  }

  const site: MonitoredSite = {
    id: crypto.randomUUID(),
    name,
    url,
    createdAt: new Date().toISOString(),
    lastCheckedAt: null,
  };

  await addSite(site);
  return NextResponse.json({ site }, { status: 201 });
}
