const DAY_MS = 24 * 60 * 60 * 1000;
const FRESH_POSTING_MAX_AGE_MS = 3 * DAY_MS;
const REPOST_MIN_JUMP_MS = 2 * DAY_MS;

export function postedAtIso(
  postedOn: string | undefined,
  now = new Date()
): string | undefined {
  return parseRelativePostedOn(postedOn, now)?.toISOString();
}

export function parseRelativePostedOn(
  postedOn: string | undefined,
  now = new Date()
): Date | null {
  if (!postedOn) return null;

  const text = postedOn.trim();
  if (/^posted\s+today$/i.test(text)) return now;
  if (/^posted\s+yesterday$/i.test(text)) {
    return new Date(now.getTime() - DAY_MS);
  }

  const days = text.match(/^posted\s+(\d+)\+?\s+days?\s+ago$/i);
  if (days) {
    return new Date(now.getTime() - Number(days[1]) * DAY_MS);
  }

  const hours = text.match(/^posted\s+(\d+)\+?\s+hours?\s+ago$/i);
  if (hours) {
    return new Date(now.getTime() - Number(hours[1]) * 60 * 60 * 1000);
  }

  return null;
}

export function isPostedSinceLastCheck(
  postedOn: string | undefined,
  lastCheckedAt: string | null,
  now = new Date()
): boolean {
  if (!lastCheckedAt) return true;

  const postedAt = parseRelativePostedOn(postedOn, now);
  if (!postedAt) return true;

  const lastChecked = new Date(lastCheckedAt).getTime();
  if (Number.isNaN(lastChecked)) return true;

  return postedAt.getTime() >= lastChecked - DAY_MS;
}

export function looksLikeRepost(
  postedOn: string | undefined,
  storedPostedAt: string | undefined,
  now = new Date()
): boolean {
  const parsed = parseRelativePostedOn(postedOn, now);
  if (!parsed || !storedPostedAt) return false;

  const ageMs = now.getTime() - parsed.getTime();
  if (ageMs > FRESH_POSTING_MAX_AGE_MS) return false;

  const stored = new Date(storedPostedAt).getTime();
  if (Number.isNaN(stored)) return false;

  return parsed.getTime() - stored > REPOST_MIN_JUMP_MS;
}

export function shouldMarkRestoredAsNew(
  postedOn: string | undefined,
  storedPostedAt: string | undefined,
  lastCheckedAt: string | null,
  now = new Date()
): boolean {
  if (!postedOn) return false;
  if (storedPostedAt) return looksLikeRepost(postedOn, storedPostedAt, now);
  return isPostedSinceLastCheck(postedOn, lastCheckedAt, now);
}
