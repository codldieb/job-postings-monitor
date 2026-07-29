import { getResumeProfile, saveResumeProfile } from "@/lib/db";
import {
  normalizeResumeProfile,
  parsePositionExperience,
  parseTargetContinents,
  parseTargetCountries,
  parseTargetDepartments,
} from "@/lib/resume/profile";
import { rebuildUserSynonyms } from "@/lib/skills/user-synonyms";
import type { ResumeProfile } from "@/lib/types";
import { NextResponse } from "next/server";

export async function GET() {
  const profile = await getResumeProfile();
  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    skills?: unknown;
    positionExperience?: unknown;
    targetDepartments?: unknown;
    targetCountries?: unknown;
    targetContinents?: unknown;
  };

  if (!Array.isArray(body.skills)) {
    return NextResponse.json(
      { error: "skills must be an array of strings" },
      { status: 400 }
    );
  }

  const skills = body.skills
    .filter((skill): skill is string => typeof skill === "string")
    .map((skill) => skill.trim())
    .filter(Boolean);

  const uniqueSkills = [...new Set(skills)];
  const existing = normalizeResumeProfile(await getResumeProfile());
  const positionExperience =
    body.positionExperience !== undefined
      ? parsePositionExperience(body.positionExperience)
      : existing?.positionExperience ?? [];
  const targetDepartments =
    body.targetDepartments !== undefined
      ? parseTargetDepartments(body.targetDepartments)
      : existing?.targetDepartments ?? [];
  const targetCountries =
    body.targetCountries !== undefined
      ? parseTargetCountries(body.targetCountries)
      : existing?.targetCountries ?? [];
  const targetContinents =
    body.targetContinents !== undefined
      ? parseTargetContinents(body.targetContinents)
      : existing?.targetContinents ?? [];

  const profile: ResumeProfile = {
    skills: uniqueSkills,
    positionExperience,
    targetDepartments,
    targetCountries,
    targetContinents,
    updatedAt: new Date().toISOString(),
    resumeFileName: existing?.resumeFileName,
    resumeUploadedAt: existing?.resumeUploadedAt,
    extractedText: existing?.extractedText,
  };

  await saveResumeProfile(profile);
  const synonymCount = await rebuildUserSynonyms(uniqueSkills);

  return NextResponse.json({ profile, synonymCount });
}
