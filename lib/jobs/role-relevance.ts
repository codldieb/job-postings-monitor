import type { JobPosting, ResumeProfile } from "@/lib/types";

export const DEFAULT_TARGET_DEPARTMENTS = [
  "Engineering",
  "Software",
  "IT",
  "Information Technology",
  "Technology",
  "Technical",
  "R&D",
  "Research and Development",
  "Product Engineering",
  "Digital",
  "Platform",
];

export interface RoleRelevanceResult {
  relevant: boolean | undefined;
  note: string;
}

const EXCLUDE_TITLE_PATTERNS = [
  /\b(?:account executive|account manager|business development)\b/i,
  /\b(?:sales(?:\s+(?:director|manager|representative|associate))?)\b/i,
  /\b(?:marketing|brand manager|content strategist|copywriter)\b/i,
  /\b(?:product manager|product owner|program manager|project manager)\b/i,
  /\b(?:recruiter|talent acquisition)\b/i,
  /\b(?:human resources|\bhr\b(?:\s+(?:business partner|manager|generalist))?)\b/i,
  /\b(?:finance|financial analyst|accountant|controller|payroll)\b/i,
  /\b(?:legal|counsel|paralegal|compliance officer)\b/i,
  /\b(?:customer success|client success)\b/i,
  /\b(?:nurse|physician|pharmacist|pharmacy|compounding|pharmacy technician|clinical)\b/i,
  /\b(?:pilot|flight attendant|flight operations|aviation)\b/i,
  /\b(?:administrative associate|admin assistant|executive assistant|receptionist|office manager)\b/i,
  /\b(?:facilities technician|maintenance tech|hvac|workplace health|fitness|wellness consultant)\b/i,
  /\b(?:warehouse|forklift|delivery driver|field technician)\b/i,
  /\b(?:retail|cashier|barista|store associate|customer care representative)\b/i,
  /\b(?:relationship manager|branch ambassador|cafe coach)\b/i,
  /\b(?:business analyst|strategy manager|compensation analyst|operations manager)\b/i,
];

const INCLUDE_TITLE_PATTERNS = [
  /\b(?:software|platform|infrastructure|cloud|security|technology)\b/i,
  /\b(?:devops|sre|site reliability)\b/i,
  /\b(?:engineer|developer|programmer|architect|scientist)\b/i,
  /\b(?:full[\s-]?stack|front[\s-]?end|back[\s-]?end)\b/i,
  /\b(?:data engineer|data scientist|ml engineer|machine learning engineer|ai\/ml)\b/i,
  /\b(?:qa engineer|test engineer|sdet)\b/i,
  /\b(?:technical product manager|technical program manager|tpm)\b/i,
  /\b(?:engineering manager|director of engineering)\b/i,
];

const NON_TARGET_CATEGORY_PATTERNS = [
  /^health$/i,
  /health solutions/i,
  /clinical/i,
  /sales and marketing/i,
  /^marketing$/i,
  /customer service/i,
  /communications/i,
  /people & culture/i,
  /corporate affairs/i,
  /planning and analysis/i,
  /finance$/i,
];

const DESCRIPTION_FIELD_PATTERN =
  /\b(?:department|departments|job function|job category|business unit|jobs by category)\s*:\s*(.+?)(?=\s+(?:job function|jobs by category|status|schedule|req id|description|business function|date posted|ref #|category|experience|primary address|pin job)\s*:|$)/gi;

const MAX_DEPARTMENT_LABEL_LENGTH = 80;

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function getTargetDepartments(profile: ResumeProfile | null): string[] {
  const configured = profile?.targetDepartments?.filter(Boolean) ?? [];
  return configured.length > 0 ? configured : DEFAULT_TARGET_DEPARTMENTS;
}

function matchesTargetLabel(text: string, targets: string[]): boolean {
  const normalized = normalizeText(text);
  if (!normalized) return false;

  return targets.some((target) => {
    const normalizedTarget = normalizeText(target);
    if (!normalizedTarget) return false;

    return (
      normalized.includes(normalizedTarget) ||
      normalizedTarget.includes(normalized)
    );
  });
}

function titleMatchesExclude(title: string): boolean {
  return EXCLUDE_TITLE_PATTERNS.some((pattern) => pattern.test(title));
}

function titleMatchesInclude(title: string): boolean {
  return INCLUDE_TITLE_PATTERNS.some((pattern) => pattern.test(title));
}

function trimFieldValue(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isPlausibleDepartmentLabel(value: string): boolean {
  const trimmed = trimFieldValue(value);
  if (!trimmed || trimmed.length > MAX_DEPARTMENT_LABEL_LENGTH) {
    return false;
  }

  return !/^(description|join our|what you|our team|you will|about the|overview)\b/i.test(
    trimmed
  );
}

function matchesNonTargetCategory(text: string): boolean {
  const normalized = normalizeText(text);
  if (!normalized) return false;

  return NON_TARGET_CATEGORY_PATTERNS.some((pattern) => pattern.test(normalized));
}

function extractInlineMetadata(description: string): string[] {
  const hints: string[] = [];

  const categoryMatch = description.match(
    /\bJobs by Category:\s*(.+?)(?=\s+Job Function:|\s+Status:|\s+Schedule:|\s+Description\b|$)/i
  );
  if (categoryMatch?.[1]) {
    hints.push(trimFieldValue(categoryMatch[1]));
  }

  const functionMatch = description.match(
    /\bJob Function:\s*(.+?)(?=\s+Status:|\s+Schedule:|\s+Description\b|$)/i
  );
  if (functionMatch?.[1]) {
    hints.push(trimFieldValue(functionMatch[1]));
  }

  return hints;
}

function extractDepartmentHintsFromDescription(description: string): string[] {
  const hints: string[] = [];

  for (const value of extractInlineMetadata(description)) {
    if (isPlausibleDepartmentLabel(value) && !hints.includes(value)) {
      hints.push(value);
    }
  }

  for (const match of description.matchAll(DESCRIPTION_FIELD_PATTERN)) {
    const value = trimFieldValue(match[1] ?? "");
    if (isPlausibleDepartmentLabel(value) && !hints.includes(value)) {
      hints.push(value);
    }
  }

  return hints;
}

function collectDepartmentCandidates(job: JobPosting): string[] {
  const candidates: string[] = [];

  if (job.department?.trim()) candidates.push(job.department.trim());
  if (job.team?.trim()) candidates.push(job.team.trim());

  if (job.descriptionText?.trim()) {
    candidates.push(...extractDepartmentHintsFromDescription(job.descriptionText));
  }

  return candidates;
}

export function evaluateRoleRelevance(
  job: JobPosting,
  profile: ResumeProfile | null
): RoleRelevanceResult {
  const targets = getTargetDepartments(profile);
  const title = job.title.trim();

  if (titleMatchesInclude(title)) {
    return {
      relevant: true,
      note: "Title matches a technical/engineering role",
    };
  }

  if (titleMatchesExclude(title)) {
    return {
      relevant: false,
      note: "Title looks like a non-technical role",
    };
  }

  const departmentCandidates = collectDepartmentCandidates(job);
  const nonTargetCategory = departmentCandidates.find((candidate) =>
    matchesNonTargetCategory(candidate)
  );

  if (nonTargetCategory) {
    return {
      relevant: false,
      note: `Posting category (${nonTargetCategory}) is outside your target areas`,
    };
  }

  const matchedDepartment = departmentCandidates.find((candidate) =>
    matchesTargetLabel(candidate, targets)
  );

  if (matchedDepartment) {
    return {
      relevant: true,
      note: `Matches target area (${matchedDepartment})`,
    };
  }

  const explicitDepartment = job.department?.trim() || job.team?.trim();
  if (explicitDepartment) {
    return {
      relevant: false,
      note: `Department/team (${explicitDepartment}) is outside your target areas`,
    };
  }

  if (departmentCandidates.length > 0) {
    return {
      relevant: false,
      note: `Posting category (${departmentCandidates[0]}) is outside your target areas`,
    };
  }

  return {
    relevant: undefined,
    note: "Could not determine role type — review manually",
  };
}
