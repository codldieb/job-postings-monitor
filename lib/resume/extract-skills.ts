import {
  COMMON_JOB_SKILLS,
  SKILL_SYNONYMS,
  normalizeSkillName,
} from "@/lib/skills/synonyms";

const SKILLS_SECTION_PATTERN =
  /(?:technical skills?|core competencies|skills?(?:\s*&\s*tools)?|technologies|proficiencies)\s*:?\s*/i;

const NEXT_SECTION_PATTERN =
  /\b(?:professional experience|work experience|experience|education|employment history|projects|certifications|awards)\b/i;

const BULLET_LINE_PATTERN = /^[\s•·▪▫\-*–—]+\s*(.+)$/;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function termInText(term: string, text: string): boolean {
  const lowerText = text.toLowerCase();
  const normalized = normalizeSkillName(term);

  if (/^[a-z0-9.+#]+$/i.test(normalized) && normalized.length >= 2) {
    return new RegExp(`\\b${escapeRegex(normalized)}\\b`, "i").test(text);
  }

  return lowerText.includes(normalized);
}

function splitSkillFragments(value: string): string[] {
  return value
    .split(/[,|/;•·]|(?:\s+and\s+)/i)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2 && part.length <= 50);
}

function isLikelySkillFragment(value: string): boolean {
  if (value.length < 2 || value.length > 50) return false;
  if (/^\d+$/.test(value)) return false;
  if (/^(experience|education|work history|summary)$/i.test(value)) return false;
  return true;
}

function addSkill(found: Map<string, string>, skill: string) {
  const trimmed = skill.trim();
  if (!isLikelySkillFragment(trimmed)) return;

  const key = normalizeSkillName(trimmed);
  if (!found.has(key)) {
    found.set(key, trimmed);
  }
}

function extractFromSkillsSection(text: string, found: Map<string, string>) {
  const sectionMatch = text.match(SKILLS_SECTION_PATTERN);
  if (!sectionMatch || sectionMatch.index === undefined) return;

  const afterHeader = text.slice(sectionMatch.index + sectionMatch[0].length);
  const nextSection = afterHeader.search(NEXT_SECTION_PATTERN);
  const sectionText =
    nextSection === -1 ? afterHeader.slice(0, 2500) : afterHeader.slice(0, nextSection);

  const chunks = sectionText.split(/[\n,|/;•·]|(?:\s+and\s+)/i);

  for (const chunk of chunks) {
    const cleaned = chunk.replace(BULLET_LINE_PATTERN, "$1").trim();
    for (const fragment of splitSkillFragments(cleaned)) {
      addSkill(found, fragment);
    }
  }
}

export function extractSkillsFromResumeText(text: string): string[] {
  const found = new Map<string, string>();

  for (const skill of COMMON_JOB_SKILLS) {
    if (termInText(skill, text)) {
      addSkill(found, skill);
    }
  }

  for (const [canonical, synonyms] of Object.entries(SKILL_SYNONYMS)) {
    if (termInText(canonical, text)) {
      addSkill(found, canonical);
    }

    for (const synonym of synonyms) {
      if (termInText(synonym, text)) {
        addSkill(found, canonical);
        break;
      }
    }
  }

  extractFromSkillsSection(text, found);

  return [...found.values()].sort((a, b) => a.localeCompare(b));
}
