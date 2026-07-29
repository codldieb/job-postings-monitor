import type { PositionExperience } from "@/lib/types";
import {
  combineMatchScores,
  parseJobExperienceRequirement,
  scoreExperienceMatch,
} from "./experience";
import {
  COMMON_JOB_SKILLS,
  getSkillVariants,
  normalizeSkillName,
  skillsMatch,
} from "./synonyms";

export interface MatchResult {
  score: number;
  skillScore: number;
  experienceScore: number;
  experienceNote: string;
  matchedSkills: string[];
  missingSkills: string[];
}

type UserSynonyms = Record<string, string[]>;

const REQUIREMENT_HEADERS =
  /(?:^|\n)\s*(?:requirements?|qualifications?|must[\s-]have|what you(?:'ll| will) need|what we(?:'re| are) looking for|minimum qualifications?|required skills?)\s*:?\s*/gi;

const PREFERRED_HEADERS =
  /(?:^|\n)\s*(?:nice[\s-]to[\s-]have|preferred|bonus|pluses?|desired skills?)\s*:?\s*/gi;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitDescriptionSections(description: string): {
  required: string;
  preferred: string;
  full: string;
} {
  const full = description;
  const lower = description.toLowerCase();

  const requirementStarts: number[] = [];
  for (const match of lower.matchAll(REQUIREMENT_HEADERS)) {
    if (match.index !== undefined) {
      requirementStarts.push(match.index);
    }
  }

  const preferredStarts: number[] = [];
  for (const match of lower.matchAll(PREFERRED_HEADERS)) {
    if (match.index !== undefined) {
      preferredStarts.push(match.index);
    }
  }

  const firstRequirement = requirementStarts.sort((a, b) => a - b)[0];
  const firstPreferred = preferredStarts.sort((a, b) => a - b)[0];

  let required = "";
  if (firstRequirement !== undefined) {
    const end =
      firstPreferred !== undefined && firstPreferred > firstRequirement
        ? firstPreferred
        : description.length;
    required = description.slice(firstRequirement, end);
  }

  let preferred = "";
  if (firstPreferred !== undefined) {
    preferred = description.slice(firstPreferred);
  }

  return { required, preferred, full };
}

function usesWordBoundary(variant: string): boolean {
  return /^[a-z0-9+#.]+$/i.test(variant);
}

export function skillMentionedInText(
  skill: string,
  text: string,
  userSynonyms: UserSynonyms = {}
): boolean {
  if (!text.trim()) return false;

  for (const variant of getSkillVariants(skill, userSynonyms)) {
    if (usesWordBoundary(variant)) {
      const pattern = new RegExp(`\\b${escapeRegex(variant)}\\b`, "i");
      if (pattern.test(text)) return true;
    } else if (text.toLowerCase().includes(variant.toLowerCase())) {
      return true;
    }
  }

  return false;
}

function buildJobSkillCandidates(userSkills: string[]): string[] {
  const candidates = new Map<string, string>();

  for (const skill of [...COMMON_JOB_SKILLS, ...userSkills]) {
    const key = normalizeSkillName(skill);
    if (!candidates.has(key)) {
      candidates.set(key, skill);
    }
  }

  return [...candidates.values()];
}

function sectionWeight(
  skill: string,
  sections: ReturnType<typeof splitDescriptionSections>,
  userSynonyms: UserSynonyms
): number {
  if (skillMentionedInText(skill, sections.required, userSynonyms)) return 2;
  if (skillMentionedInText(skill, sections.preferred, userSynonyms)) return 1.5;
  if (skillMentionedInText(skill, sections.full, userSynonyms)) return 1;
  return 0;
}

export function scoreJobMatch(
  userSkills: string[],
  descriptionText: string,
  userSynonyms: UserSynonyms = {},
  jobTitle = "",
  positionExperience: PositionExperience[] = []
): MatchResult {
  const trimmedSkills = userSkills
    .map((skill) => skill.trim())
    .filter(Boolean);

  if (!descriptionText.trim() || trimmedSkills.length === 0) {
    return {
      score: 0,
      skillScore: 0,
      experienceScore: 0,
      experienceNote: "",
      matchedSkills: [],
      missingSkills: [],
    };
  }

  const sections = splitDescriptionSections(descriptionText);

  const matchedSkills = trimmedSkills.filter((skill) =>
    skillMentionedInText(skill, sections.full, userSynonyms)
  );

  const missingSkills: string[] = [];
  for (const candidate of buildJobSkillCandidates(trimmedSkills)) {
    if (!skillMentionedInText(candidate, sections.full, userSynonyms)) continue;

    const coveredByUser = trimmedSkills.some((userSkill) =>
      skillsMatch(userSkill, candidate, userSynonyms)
    );
    if (!coveredByUser) {
      missingSkills.push(candidate);
    }
  }

  const uniqueMissing = [
    ...new Map(
      missingSkills.map((skill) => [normalizeSkillName(skill), skill])
    ).values(),
  ].sort((a, b) => a.localeCompare(b));

  let matchedWeight = 0;
  for (const skill of matchedSkills) {
    matchedWeight += sectionWeight(skill, sections, userSynonyms);
  }

  let missingWeight = 0;
  for (const skill of uniqueMissing) {
    missingWeight += sectionWeight(skill, sections, userSynonyms);
  }

  let skillScore: number;
  const totalWeight = matchedWeight + missingWeight;

  if (totalWeight > 0) {
    skillScore = Math.round((matchedWeight / totalWeight) * 100);
  } else if (matchedSkills.length > 0) {
    skillScore = Math.round((matchedSkills.length / trimmedSkills.length) * 100);
  } else {
    skillScore = 0;
  }

  skillScore = Math.min(100, Math.max(0, skillScore));

  const requirement = parseJobExperienceRequirement(jobTitle, descriptionText);
  const experienceResult = scoreExperienceMatch(
    positionExperience,
    jobTitle,
    requirement
  );
  const score = combineMatchScores(
    skillScore,
    experienceResult.score,
    requirement
  );

  return {
    score,
    skillScore,
    experienceScore: experienceResult.score,
    experienceNote: experienceResult.note,
    matchedSkills: matchedSkills.sort((a, b) => a.localeCompare(b)),
    missingSkills: uniqueMissing,
  };
}
