import { generateOllamaJson, isOllamaEnabled } from "@/lib/llm/ollama";
import { combineMatchScores } from "@/lib/skills/experience";
import {
  applyMissingSkillPenalty,
  type MatchResult,
} from "@/lib/skills/matcher";
import { normalizeSkillName, skillsMatch } from "@/lib/skills/synonyms";
import type { PositionExperience } from "@/lib/types";

const MAX_DESCRIPTION_CHARS = 6000;

export interface LlmJudgeInput {
  title: string;
  department?: string;
  team?: string;
  location?: string;
  descriptionText: string;
  resumeSkills: string[];
  positionExperience: PositionExperience[];
  targetDepartments: string[];
}

export interface LlmJudgeResult {
  match: MatchResult;
  roleRelevant: boolean | undefined;
  roleRelevanceNote: string;
  experienceRequired: boolean;
  summary: string;
}

interface LlmJudgePayload {
  roleRelevant?: boolean | null;
  roleRelevanceNote?: string;
  skillScore?: number;
  experienceScore?: number;
  experienceRequired?: boolean;
  experienceNote?: string;
  matchedSkills?: unknown;
  missingSkills?: unknown;
  summary?: string;
}

function clampScore(value: unknown): number | undefined {
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return Math.min(100, Math.max(0, Math.round(parsed)));
    }
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function asOptionalBoolean(value: unknown): boolean | undefined {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function truncateDescription(description: string): string {
  const trimmed = description.trim();
  if (trimmed.length <= MAX_DESCRIPTION_CHARS) return trimmed;

  const header = trimmed.search(
    /(?:requirements?|qualifications?|what (?:we(?:'re| are) looking for|you(?:'ll| will) (?:need|do))|must[\s-]have|responsibilities)/i
  );
  const start = header >= 0 ? header : 0;
  return trimmed.slice(start, start + MAX_DESCRIPTION_CHARS);
}

function filterToResumeSkills(
  mentioned: string[],
  resumeSkills: string[]
): string[] {
  const matched: string[] = [];
  const seen = new Set<string>();

  for (const item of mentioned) {
    const resumeSkill = resumeSkills.find(
      (skill) =>
        skillsMatch(skill, item) ||
        skill.toLowerCase() === item.toLowerCase()
    );
    if (!resumeSkill) continue;

    const key = normalizeSkillName(resumeSkill);
    if (seen.has(key)) continue;
    seen.add(key);
    matched.push(resumeSkill);
  }

  return matched;
}

function uniqueMissingSkills(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const skill of values) {
    const key = normalizeSkillName(skill);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(skill);
    if (result.length >= 12) break;
  }

  return result;
}

function buildPrompt(input: LlmJudgeInput): string {
  const experience =
    input.positionExperience.length > 0
      ? input.positionExperience
          .map((entry) => `${entry.position}: ${entry.years} years`)
          .join("\n")
      : "None listed";

  return `You score how well a candidate matches a job posting.
Return JSON only. Do not invent skills the candidate does not have.
matchedSkills may only include resume skills that the job description actually names. If the posting does not mention a skill, it is not a match — do not list transferable or implied skills.
Ignore company history, founding dates, and marketing copy when judging years of experience.
Count QA, test, and SDET years only for QA, SDET, test, and quality-engineering roles. Do not count those years toward software engineer, developer, or other product-engineering roles — use only the candidate's Software Engineer years for those.
Do not score experience as a near-zero just because the posting is in a specific domain (for example mainframe) if the candidate has matching years in the same role family.
"Engineer" in a mechanical, hardware, packaging, or manufacturing posting is not a software/QA role.

Candidate skills:
${input.resumeSkills.map((skill) => `- ${skill}`).join("\n")}

Candidate experience:
${experience}

Target role areas: ${input.targetDepartments.join(", ") || "Engineering, Software, QA"}

Job title: ${input.title}
Department: ${input.department || "(none)"}
Team: ${input.team || "(none)"}
Location: ${input.location || "(none)"}

Job description:
${truncateDescription(input.descriptionText)}

skillScore is the percent of job-mentioned skills the candidate has. It MUST be less than 100 when missingSkills is not empty. Use roughly matchedSkills.length / (matchedSkills.length + missingSkills.length) * 100.

Project manager, program manager, product manager, sales, marketing, and similar titles are not software/QA matches even if the posting mentions Jira, Agile, or AI. Score them as not role-relevant.
If the posting requires fluency in a language other than English (for example Spanish or Portuguese) and that language is not in the candidate skills list, put it in missingSkills and do not give a 100 skill score.

Return a JSON object with exactly these keys. Use real JSON values, not unions or placeholders.
Example:
{"roleRelevant":true,"roleRelevanceNote":"Software engineering role","skillScore":72,"experienceScore":80,"experienceRequired":true,"experienceNote":"Asks for 5 years of backend experience","matchedSkills":["TypeScript","React"],"missingSkills":["Kubernetes"],"summary":"Solid skill overlap on a relevant software role."}`;
}

export async function judgeJobWithOllama(
  input: LlmJudgeInput
): Promise<LlmJudgeResult | null> {
  if (!isOllamaEnabled() || !input.descriptionText.trim()) {
    return null;
  }

  try {
    const payload = (await generateOllamaJson(buildPrompt(input))) as LlmJudgePayload;
    const skillScore = clampScore(payload.skillScore);
    const experienceScore = clampScore(payload.experienceScore);
    if (skillScore === undefined || experienceScore === undefined) {
      return null;
    }

    const roleRelevant = asOptionalBoolean(payload.roleRelevant);
    const experienceRequired = asOptionalBoolean(payload.experienceRequired) === true;
    const matchedSkills = filterToResumeSkills(
      asStringList(payload.matchedSkills),
      input.resumeSkills
    );
    const missingSkills = uniqueMissingSkills(asStringList(payload.missingSkills));
    const experienceNote =
      payload.experienceNote?.trim() ||
      (experienceRequired
        ? "Experience requirement taken from the posting"
        : "No clear experience requirement found in posting");
    const summary = payload.summary?.trim() || "";
    const roleRelevanceNote =
      payload.roleRelevanceNote?.trim() ||
      (roleRelevant === false
        ? "Role does not look like a target software/QA job"
        : roleRelevant === true
          ? "Role looks relevant to your target areas"
          : "Could not determine role type — review manually");

    return {
      match: applyMissingSkillPenalty(
        {
          score: combineMatchScores(skillScore, experienceScore, {
            detected: experienceRequired,
            minYears: experienceRequired ? 1 : undefined,
          }),
          skillScore,
          experienceScore,
          experienceNote,
          matchedSkills,
          missingSkills,
        },
        experienceRequired
      ),
      roleRelevant,
      roleRelevanceNote,
      experienceRequired,
      summary,
    };
  } catch (error) {
    console.warn(
      "Ollama scoring failed; using keyword matcher",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}
