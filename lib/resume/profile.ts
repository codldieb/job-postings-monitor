import type { PositionExperience, ResumeProfile } from "@/lib/types";

export function parsePositionExperience(value: unknown): PositionExperience[] {
  if (!Array.isArray(value)) return [];

  const entries: PositionExperience[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const record = item as { position?: unknown; years?: unknown };
    if (typeof record.position !== "string") continue;

    const position = record.position.trim();
    if (!position) continue;

    const years =
      typeof record.years === "number"
        ? record.years
        : Number.parseFloat(String(record.years ?? ""));

    if (!Number.isFinite(years) || years < 0 || years > 50) continue;

    entries.push({
      position,
      years: Math.round(years * 10) / 10,
    });
  }

  return entries;
}

export function parseTargetDepartments(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ];
}

export function parseTargetCountries(value: unknown): string[] {
  return parseTargetDepartments(value);
}

export function parseTargetContinents(value: unknown): string[] {
  return parseTargetDepartments(value);
}

export function mergePositionExperience(
  existing: PositionExperience[],
  incoming: PositionExperience[]
): PositionExperience[] {
  return parsePositionExperience([...existing, ...incoming]).reduce<
    PositionExperience[]
  >((merged, entry) => {
    const key = entry.position.toLowerCase();
    const index = merged.findIndex(
      (item) => item.position.toLowerCase() === key
    );

    if (index === -1) {
      merged.push(entry);
      return merged;
    }

    merged[index] = {
      position: merged[index].position,
      years: Math.round((merged[index].years + entry.years) * 10) / 10,
    };
    return merged;
  }, []);
}

export function normalizeResumeProfile(
  profile: ResumeProfile | null
): ResumeProfile | null {
  if (!profile) return null;

  if (profile.positionExperience?.length) {
    return {
      ...profile,
      positionExperience: parsePositionExperience(profile.positionExperience),
    };
  }

  if (profile.yearsOfExperience !== undefined) {
    return {
      ...profile,
      positionExperience: [
        {
          position: "Professional",
          years: profile.yearsOfExperience,
        },
      ],
    };
  }

  return profile;
}
