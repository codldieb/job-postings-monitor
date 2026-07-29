export interface JobExperienceRequirement {
  minYears?: number;
  maxYears?: number;
  levelLabel?: string;
  detected: boolean;
}

export interface ExperienceMatchResult {
  score: number;
  note: string;
  requirement?: JobExperienceRequirement;
  matchedPosition?: string;
  matchedYears?: number;
}

export interface PositionExperienceEntry {
  position: string;
  years: number;
}

const LEVEL_DEFINITIONS = [
  { label: "Entry level", minYears: 0, maxYears: 2, pattern: /\b(?:entry[\s-]level|intern(?:ship)?|graduate)\b/i },
  { label: "Junior", minYears: 0, maxYears: 2, pattern: /\bjunior\b|\bJr\.?\b/i },
  { label: "Mid level", minYears: 2, maxYears: 5, pattern: /\bmid[\s-]level\b|\bintermediate\b/i },
  { label: "Senior", minYears: 5, maxYears: 10, pattern: /\bsenior\b|\bSr\.?\b/i },
  { label: "Staff / Principal", minYears: 8, maxYears: 15, pattern: /\b(?:staff|principal|distinguished)\b/i },
  { label: "Lead", minYears: 6, maxYears: 12, pattern: /\blead\b/i },
] as const;

const MIN_YEARS_PATTERN =
  /(?:minimum|min\.?|at least|requires?)\s+(?:of\s+)?(\d+)\+?\s*years?/gi;

const PLUS_YEARS_PATTERN =
  /(\d+)\+\s*years?(?:\s+of)?(?:\s+(?:of\s+)?(?:professional\s+|relevant\s+)?experience)?/gi;

const RANGE_YEARS_PATTERN = /(\d+)\s*(?:-|–|to)\s*(\d+)\s*years?/gi;

const YEARS_PATTERN =
  /(\d+)\+?\s*years?(?:\s+of)?(?:\s+(?:of\s+)?(?:professional\s+|relevant\s+)?experience)?/gi;

function collectYearMatches(text: string, pattern: RegExp): number[] {
  const values: number[] = [];
  for (const match of text.matchAll(pattern)) {
    const value = Number.parseInt(match[1], 10);
    if (Number.isFinite(value) && value >= 0 && value <= 40) {
      values.push(value);
    }
  }
  return values;
}

function detectLevel(text: string): (typeof LEVEL_DEFINITIONS)[number] | undefined {
  for (const level of LEVEL_DEFINITIONS) {
    if (level.pattern.test(text)) {
      return level;
    }
  }
  return undefined;
}

export function parseJobExperienceRequirement(
  jobTitle: string,
  descriptionText: string
): JobExperienceRequirement {
  const title = jobTitle.trim();
  const description = descriptionText.trim();
  const combined = `${title}\n${description}`;

  const minCandidates = [
    ...collectYearMatches(description, MIN_YEARS_PATTERN),
    ...collectYearMatches(description, PLUS_YEARS_PATTERN),
  ];

  for (const match of description.matchAll(RANGE_YEARS_PATTERN)) {
    const low = Number.parseInt(match[1], 10);
    const high = Number.parseInt(match[2], 10);
    if (Number.isFinite(low) && Number.isFinite(high)) {
      minCandidates.push(Math.min(low, high));
    }
  }

  if (minCandidates.length > 0) {
    const minYears = Math.max(...minCandidates);
    return {
      minYears,
      detected: true,
      levelLabel: `${minYears}+ years`,
    };
  }

  const generalYearMatches = collectYearMatches(combined, YEARS_PATTERN);
  if (generalYearMatches.length > 0) {
    const minYears = Math.max(...generalYearMatches);
    return {
      minYears,
      detected: true,
      levelLabel: `${minYears}+ years`,
    };
  }

  const titleLevel = detectLevel(title);
  if (titleLevel) {
    return {
      minYears: titleLevel.minYears,
      maxYears: titleLevel.maxYears,
      levelLabel: titleLevel.label,
      detected: true,
    };
  }

  const descriptionLevel = detectLevel(description);
  if (descriptionLevel) {
    return {
      minYears: descriptionLevel.minYears,
      maxYears: descriptionLevel.maxYears,
      levelLabel: descriptionLevel.label,
      detected: true,
    };
  }

  return { detected: false };
}

const POSITION_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "associate",
  "at",
  "for",
  "in",
  "iv",
  "ii",
  "iii",
  "jr",
  "junior",
  "lead",
  "level",
  "of",
  "or",
  "principal",
  "remote",
  "senior",
  "sr",
  "staff",
  "the",
  "to",
]);

function normalizePositionTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !POSITION_STOP_WORDS.has(token));
}

function positionMatchScore(jobTitle: string, userPosition: string): number {
  const jobTokens = normalizePositionTokens(jobTitle);
  const userTokens = normalizePositionTokens(userPosition);

  if (jobTokens.length === 0 || userTokens.length === 0) return 0;

  let overlap = 0;
  for (const token of userTokens) {
    if (jobTokens.includes(token)) overlap++;
  }

  const union = new Set([...jobTokens, ...userTokens]).size;
  return union > 0 ? overlap / union : 0;
}

const MIN_POSITION_MATCH_SCORE = 0.2;

export function findRelevantPositionExperience(
  jobTitle: string,
  userExperience: PositionExperienceEntry[]
): { position: string; years: number; score: number } | undefined {
  if (!jobTitle.trim() || userExperience.length === 0) return undefined;

  let best:
    | { position: string; years: number; score: number }
    | undefined;

  for (const entry of userExperience) {
    const score = positionMatchScore(jobTitle, entry.position);
    if (score < MIN_POSITION_MATCH_SCORE) continue;

    if (!best || score > best.score || (score === best.score && entry.years > best.years)) {
      best = {
        position: entry.position,
        years: entry.years,
        score,
      };
    }
  }

  return best;
}

function scoreYearsAgainstRequirement(
  userYears: number,
  requirement: JobExperienceRequirement
): Pick<ExperienceMatchResult, "score" | "note"> {
  const minYears = requirement.minYears!;
  const targetLabel =
    requirement.levelLabel ?? `${minYears}+ years`;
  const ratio = userYears / minYears;

  if (ratio >= 1) {
    return {
      score: 100,
      note: `Meets experience target (${userYears} years vs ${targetLabel})`,
    };
  }

  if (ratio >= 0.75) {
    return {
      score: 85,
      note: `Close on experience (${userYears} years vs ${targetLabel})`,
    };
  }

  if (ratio >= 0.5) {
    return {
      score: 65,
      note: `Partial experience fit (${userYears} years vs ${targetLabel})`,
    };
  }

  if (ratio >= 0.25) {
    return {
      score: 40,
      note: `Below experience target (${userYears} years vs ${targetLabel})`,
    };
  }

  return {
    score: 20,
    note: `Well below experience target (${userYears} years vs ${targetLabel})`,
  };
}

export function scoreExperienceMatch(
  userExperience: PositionExperienceEntry[],
  jobTitle: string,
  requirement: JobExperienceRequirement
): ExperienceMatchResult {
  if (!requirement.detected || requirement.minYears === undefined) {
    return {
      score: 100,
      note: "No clear experience requirement found in posting",
      requirement,
    };
  }

  const targetLabel =
    requirement.levelLabel ?? `${requirement.minYears}+ years`;

  if (userExperience.length === 0) {
    return {
      score: 50,
      note: `Posting looks for ${targetLabel}. Add position experience to your resume profile.`,
      requirement,
    };
  }

  const match = findRelevantPositionExperience(jobTitle, userExperience);

  if (!match) {
    return {
      score: 50,
      note: `Posting looks for ${targetLabel}. No matching role in your profile — add experience for a position like "${jobTitle.trim()}".`,
      requirement,
    };
  }

  const result = scoreYearsAgainstRequirement(match.years, requirement);

  return {
    ...result,
    note: `${result.note} (using ${match.years} years as ${match.position})`,
    requirement,
    matchedPosition: match.position,
    matchedYears: match.years,
  };
}

export const SKILL_MATCH_WEIGHT = 0.7;
export const EXPERIENCE_MATCH_WEIGHT = 0.3;

export function combineMatchScores(
  skillScore: number,
  experienceScore: number,
  requirement: JobExperienceRequirement
): number {
  if (!requirement.detected) {
    return skillScore;
  }

  return Math.round(
    skillScore * SKILL_MATCH_WEIGHT + experienceScore * EXPERIENCE_MATCH_WEIGHT
  );
}
