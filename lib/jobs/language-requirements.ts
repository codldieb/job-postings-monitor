const SPOKEN_LANGUAGES = [
  "Spanish",
  "Portuguese",
  "French",
  "German",
  "Mandarin",
  "Cantonese",
  "Chinese",
  "Japanese",
  "Korean",
  "Hindi",
  "Arabic",
  "Italian",
  "Dutch",
  "Russian",
  "Polish",
  "Vietnamese",
  "Tagalog",
  "Hebrew",
  "Turkish",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Greek",
  "Thai",
  "Indonesian",
  "Malay",
  "Ukrainian",
  "Czech",
  "Romanian",
  "Hungarian",
  "Swahili",
] as const;

const LANGUAGE_LOOKUP = new Map(
  SPOKEN_LANGUAGES.map((language) => [language.toLowerCase(), language])
);

function canonicalLanguage(value: string): string | undefined {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed === "english") return undefined;
  return LANGUAGE_LOOKUP.get(trimmed);
}

function addLanguage(found: Set<string>, raw: string | undefined) {
  if (!raw) return;
  const language = canonicalLanguage(raw);
  if (language) found.add(language);
}

/**
 * Spoken/written languages the posting requires besides English.
 * English-only requirements are ignored.
 */
export function extractRequiredLanguages(text: string): string[] {
  if (!text.trim()) return [];

  const found = new Set<string>();

  for (const match of text.matchAll(
    /\b(?:fluency|fluent|native(?:\s+speaker)?|professional(?:\s+working)?\s+proficiency|proficiency)\s+in\s+([A-Za-z]+)(?:\s+and\s+([A-Za-z]+))?/gi
  )) {
    addLanguage(found, match[1]);
    addLanguage(found, match[2]);
  }

  for (const match of text.matchAll(
    /\bbilingual(?:\s+in)?[:\s]+([A-Za-z]+)(?:\s*[/&,]\s*|\s+and\s+)([A-Za-z]+)/gi
  )) {
    addLanguage(found, match[1]);
    addLanguage(found, match[2]);
  }

  for (const match of text.matchAll(
    /\b([A-Za-z]+)\s+and\s+English\s+required\b/gi
  )) {
    addLanguage(found, match[1]);
  }

  for (const match of text.matchAll(
    /\bEnglish\s+and\s+([A-Za-z]+)\s+required\b/gi
  )) {
    addLanguage(found, match[1]);
  }

  for (const language of SPOKEN_LANGUAGES) {
    const pattern = new RegExp(
      `\\b(?:required|must have|must be)\\b[^.]{0,80}\\b${language}\\b|\\b${language}\\b[^.]{0,80}\\b(?:required|must have|must be fluent)\\b`,
      "i"
    );
    if (pattern.test(text)) found.add(language);
  }

  return [...found];
}

export function missingRequiredLanguages(
  text: string,
  userSkills: string[]
): string[] {
  const required = extractRequiredLanguages(text);
  if (required.length === 0) return [];

  return required.filter((language) => {
    const lower = language.toLowerCase();
    return !userSkills.some((skill) => {
      const skillLower = skill.toLowerCase();
      return skillLower === lower || skillLower.includes(lower);
    });
  });
}
