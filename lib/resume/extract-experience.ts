import type { PositionExperience } from "@/lib/types";

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const EXPERIENCE_LINE_PATTERN =
  /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{4})\s*[-–—]\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{4}|Present|Current)\s+(.+)/gi;

function parseMonthYear(value: string): { year: number; month: number } | null {
  const match = value
    .trim()
    .match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+(\d{4})$/i);

  if (!match) return null;

  const month = MONTHS[match[1].toLowerCase().replace(".", "")];
  const year = Number.parseInt(match[2], 10);

  if (month === undefined || !Number.isFinite(year)) return null;

  return { year, month };
}

function monthsBetween(
  start: { year: number; month: number },
  end: { year: number; month: number }
): number {
  return Math.max(0, (end.year - start.year) * 12 + (end.month - start.month));
}

function cleanPositionTitle(rawTitle: string): string {
  const primary = rawTitle.split(/\t+/)[0]?.trim() ?? rawTitle.trim();
  const withoutCompany = primary.split(/\s[-–—]\s/)[0]?.trim() ?? primary;
  return withoutCompany.replace(/\s{2,}/g, " ").trim();
}

function roundYears(months: number): number {
  return Math.round((months / 12) * 10) / 10;
}

export function extractPositionExperienceFromResumeText(
  text: string
): PositionExperience[] {
  const entries: PositionExperience[] = [];
  const now = new Date();

  for (const match of text.matchAll(EXPERIENCE_LINE_PATTERN)) {
    const start = parseMonthYear(match[1]);
    const endRaw = match[2].trim();
    const end =
      /^(?:Present|Current)$/i.test(endRaw)
        ? { year: now.getFullYear(), month: now.getMonth() }
        : parseMonthYear(endRaw);

    if (!start || !end) continue;

    const position = cleanPositionTitle(match[3]);
    if (!position) continue;

    const years = roundYears(monthsBetween(start, end));
    if (years <= 0) continue;

    entries.push({ position, years });
  }

  return mergeSimilarPositions(entries);
}

function normalizePositionKey(position: string): string {
  return position
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(
      /\b(?:senior|junior|lead|staff|principal|sr|jr|ii|iii|iv|associate|level|remote)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function mergeSimilarPositions(
  entries: PositionExperience[]
): PositionExperience[] {
  const merged = new Map<string, PositionExperience>();

  for (const entry of entries) {
    const key = normalizePositionKey(entry.position);
    if (!key) continue;

    const existing = merged.get(key);
    if (existing) {
      existing.years = Math.round((existing.years + entry.years) * 10) / 10;
      if (entry.position.length > existing.position.length) {
        existing.position = entry.position;
      }
    } else {
      merged.set(key, { ...entry });
    }
  }

  return [...merged.values()].sort((a, b) => b.years - a.years);
}

/** @deprecated Use extractPositionExperienceFromResumeText */
export function extractYearsFromResumeText(text: string): number | undefined {
  const entries = extractPositionExperienceFromResumeText(text);
  if (entries.length === 0) return undefined;

  const total = entries.reduce((sum, entry) => sum + entry.years, 0);
  return Math.round(total * 10) / 10;
}
