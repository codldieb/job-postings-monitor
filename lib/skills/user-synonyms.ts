import { promises as fs } from "fs";
import path from "path";
import { SKILL_SYNONYMS, normalizeSkillName } from "./synonyms";

const DATA_DIR = path.join(process.cwd(), "data");
const USER_SYNONYMS_PATH = path.join(DATA_DIR, "user-synonyms.json");

function generateVariants(skill: string): Set<string> {
  const variants = new Set<string>();
  const trimmed = skill.trim();
  const lower = trimmed.toLowerCase();
  const canonical = normalizeSkillName(trimmed);

  variants.add(lower);
  variants.add(canonical);

  if (trimmed.includes(".")) {
    variants.add(trimmed.replace(/\./g, "").toLowerCase());
    variants.add(trimmed.replace(/\./g, " ").toLowerCase());
  }

  if (trimmed.includes("-")) {
    variants.add(trimmed.replace(/-/g, " ").toLowerCase());
    variants.add(trimmed.replace(/-/g, "").toLowerCase());
  }

  if (trimmed.includes("/")) {
    for (const part of trimmed.split("/")) {
      variants.add(part.trim().toLowerCase());
    }
  }

  if (trimmed.includes(" ")) {
    variants.add(trimmed.replace(/\s+/g, "").toLowerCase());
    const acronym = trimmed
      .split(/\s+/)
      .map((word) => word[0])
      .join("")
      .toLowerCase();
    if (acronym.length >= 2 && acronym.length <= 6) {
      variants.add(acronym);
    }
  }

  if (trimmed.includes("#")) {
    variants.add(trimmed.replace(/#/g, "sharp").toLowerCase());
    variants.add(trimmed.replace(/\s+/g, "").toLowerCase());
  }

  if (trimmed.startsWith(".")) {
    variants.add(trimmed.slice(1).toLowerCase());
    variants.add(trimmed.replace(/\./g, "").toLowerCase());
  }

  return variants;
}

function mergeStaticSynonyms(canonical: string, variants: Set<string>) {
  const direct = SKILL_SYNONYMS[canonical];
  if (direct) {
    for (const synonym of direct) {
      variants.add(synonym.toLowerCase());
    }
  }

  for (const [key, synonyms] of Object.entries(SKILL_SYNONYMS)) {
    if (
      key === canonical ||
      synonyms.some((synonym) => normalizeSkillName(synonym) === canonical)
    ) {
      variants.add(key);
      for (const synonym of synonyms) {
        variants.add(synonym.toLowerCase());
      }
    }
  }
}

export function buildUserSynonymsFromSkills(
  skills: string[]
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const skill of skills) {
    const canonical = normalizeSkillName(skill);
    const variants = generateVariants(skill);
    mergeStaticSynonyms(canonical, variants);
    variants.delete(canonical);

    const synonyms = [...variants]
      .filter((variant) => variant && variant !== canonical)
      .sort((a, b) => a.localeCompare(b));

    if (synonyms.length > 0) {
      result[canonical] = synonyms;
    }
  }

  return result;
}

export async function getUserSynonyms(): Promise<Record<string, string[]>> {
  try {
    const raw = await fs.readFile(USER_SYNONYMS_PATH, "utf-8");
    return JSON.parse(raw) as Record<string, string[]>;
  } catch {
    return {};
  }
}

export async function saveUserSynonyms(
  synonyms: Record<string, string[]>
): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    USER_SYNONYMS_PATH,
    JSON.stringify(synonyms, null, 2),
    "utf-8"
  );
}

export async function rebuildUserSynonyms(skills: string[]): Promise<number> {
  const synonyms = buildUserSynonymsFromSkills(skills);
  await saveUserSynonyms(synonyms);
  return Object.keys(synonyms).length;
}
