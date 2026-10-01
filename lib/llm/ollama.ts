const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "llama3.1";
const GENERATE_TIMEOUT_MS = 90_000;
const RETRY_DELAY_MS = 1_500;
const MAX_ATTEMPTS = 2;
const LOG_SNIPPET_CHARS = 180;

function envFlag(name: string): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export function isOllamaEnabled(): boolean {
  return envFlag("OLLAMA_ENABLED");
}

export function getOllamaBaseUrl(): string {
  return (process.env.OLLAMA_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(
    /\/+$/,
    ""
  );
}

export function getOllamaModel(): string {
  return process.env.OLLAMA_MODEL?.trim() || DEFAULT_MODEL;
}

interface OllamaGenerateResponse {
  response?: string;
  error?: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function snippet(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= LOG_SNIPPET_CHARS) return compact;
  return `${compact.slice(0, LOG_SNIPPET_CHARS)}…`;
}

function isRetryable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("HTTP 500") ||
    message.includes("not valid JSON") ||
    message.includes("empty response")
  );
}

export async function generateOllamaJson(prompt: string): Promise<unknown> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await generateOllamaJsonOnce(prompt);
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === MAX_ATTEMPTS) {
        break;
      }
      await delay(RETRY_DELAY_MS);
    }
  }

  throw lastError;
}

async function generateOllamaJsonOnce(prompt: string): Promise<unknown> {
  const response = await fetch(`${getOllamaBaseUrl()}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: getOllamaModel(),
      prompt,
      stream: false,
      format: "json",
      options: {
        temperature: 0,
      },
    }),
    signal: AbortSignal.timeout(GENERATE_TIMEOUT_MS),
  });

  if (!response.ok) {
    const detail = snippet(await response.text().catch(() => ""));
    throw new Error(
      detail
        ? `Ollama HTTP ${response.status}: ${detail}`
        : `Ollama HTTP ${response.status}`
    );
  }

  const data = (await response.json()) as OllamaGenerateResponse;
  if (data.error?.trim()) {
    throw new Error(data.error.trim());
  }

  const raw = data.response?.trim();
  if (!raw) {
    throw new Error("Ollama returned an empty response");
  }

  return parseJsonPayload(raw);
}

function parseJsonPayload(raw: string): unknown {
  const candidates = [raw, extractFencedJson(raw), extractObjectSlice(raw)]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => [value, repairJsonText(value)]);

  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error(`Ollama response was not valid JSON: ${snippet(raw)}`);
}

function extractFencedJson(raw: string): string | undefined {
  return raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
}

function extractObjectSlice(raw: string): string | undefined {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return undefined;
  return raw.slice(start, end + 1);
}

function repairJsonText(raw: string): string {
  return raw
    .replace(/\bTrue\b/g, "true")
    .replace(/\bFalse\b/g, "false")
    .replace(/\bNone\b/g, "null")
    .replace(/true\s*\|\s*false(?:\s*\|\s*null)?/gi, "null")
    .replace(/false\s*\|\s*true(?:\s*\|\s*null)?/gi, "null")
    .replace(/,\s*([}\]])/g, "$1");
}
