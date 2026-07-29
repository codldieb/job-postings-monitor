import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { extractPositionExperienceFromResumeText } from "@/lib/resume/extract-experience";
import { extractSkillsFromResumeText } from "@/lib/resume/extract-skills";
import { mergePositionExperience } from "@/lib/resume/profile";
import { extractTextFromPdf, RESUME_PDF_PATH } from "@/lib/resume/pdf";
import { getResumeProfile, saveResumeProfile } from "@/lib/db";
import { rebuildUserSynonyms } from "@/lib/skills/user-synonyms";
import type { ResumeProfile } from "@/lib/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_PDF_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("resume");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Resume PDF file is required" }, { status: 400 });
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }

  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "PDF must be 10 MB or smaller" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const extractedText = await extractTextFromPdf(buffer);
    const suggestedSkills = extractSkillsFromResumeText(extractedText);
    const extractedPositions =
      extractPositionExperienceFromResumeText(extractedText);

    await mkdir(path.dirname(RESUME_PDF_PATH), { recursive: true });
    await writeFile(RESUME_PDF_PATH, buffer);

    const existing = await getResumeProfile();
    const mergedSkills = [
      ...new Set([...(existing?.skills ?? []), ...suggestedSkills]),
    ];
    const positionExperience =
      extractedPositions.length > 0
        ? mergePositionExperience(
            existing?.positionExperience ?? [],
            extractedPositions
          )
        : existing?.positionExperience ?? [];

    const profile: ResumeProfile = {
      skills: mergedSkills,
      positionExperience,
      targetDepartments: existing?.targetDepartments ?? [],
      targetCountries: existing?.targetCountries ?? [],
      targetContinents: existing?.targetContinents ?? [],
      updatedAt: new Date().toISOString(),
      resumeFileName: file.name,
      resumeUploadedAt: new Date().toISOString(),
      extractedText: extractedText.slice(0, 100000),
    };

    await saveResumeProfile(profile);
    const synonymCount = await rebuildUserSynonyms(profile.skills);

    return NextResponse.json({
      profile,
      suggestedSkills,
      suggestedPositions: extractedPositions,
      synonymCount,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process resume PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
