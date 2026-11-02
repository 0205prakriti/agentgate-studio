import { z } from 'zod';

export const DEFAULT_SCANNER_URL = 'http://127.0.0.1:8765';
const SCAN_TIMEOUT_MS = 10_000;
const responseSchema = z.object({
  scanner: z.string(),
  results: z.array(
    z.object({ valid: z.boolean(), score: z.number().min(0).max(1) }).strict(),
  ),
});

export type ScanVerdict = { injection: boolean; score: number };

/** Raised for any scanner problem. Callers must treat it as "not scanned" and block. */
export class ScannerUnavailableError extends Error {
  constructor(reason: string) {
    super(`The security scanner is unavailable: ${reason}`);
    this.name = 'ScannerUnavailableError';
  }
}

export interface InjectionScanner {
  /** One verdict per input text, in order. */
  scan(texts: string[]): Promise<ScanVerdict[]>;
}

/** Adapter for the LLM Guard prompt-injection scanner service in /scanner. */
export class LlmGuardScanner implements InjectionScanner {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string = DEFAULT_SCANNER_URL,
    private readonly timeoutMs: number = SCAN_TIMEOUT_MS,
  ) {
    this.baseUrl = new URL(baseUrl).origin;
  }

  async scan(texts: string[]): Promise<ScanVerdict[]> {
    if (texts.length === 0) return [];
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/scan`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ texts }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new ScannerUnavailableError(
        error instanceof Error && error.name === 'TimeoutError'
          ? 'it timed out'
          : 'it could not be reached',
      );
    }
    if (!response.ok)
      throw new ScannerUnavailableError(`it returned HTTP ${response.status}`);
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ScannerUnavailableError('it returned malformed data');
    }
    const parsed = responseSchema.safeParse(body);
    if (!parsed.success || parsed.data.results.length !== texts.length)
      throw new ScannerUnavailableError('it returned an unexpected response');
    return parsed.data.results.map((result) => ({
      injection: !result.valid,
      score: result.score,
    }));
  }
}
