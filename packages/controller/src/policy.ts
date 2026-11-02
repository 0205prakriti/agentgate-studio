/**
 * Application-owned deterministic rules. These are a best-effort filter for
 * well-known credential formats, not a guarantee that no secret can pass.
 */
const SECRET_RULES: readonly { rule: string; pattern: RegExp }[] = [
  { rule: 'private-key', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { rule: 'aws-access-key', pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { rule: 'api-key-sk', pattern: /\bsk-[A-Za-z0-9_-]{16,}/ },
  { rule: 'github-token', pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
  { rule: 'slack-token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}/ },
  { rule: 'google-api-key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  {
    rule: 'jwt',
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  },
  {
    rule: 'credential-assignment',
    pattern:
      /\b(?:api[_-]?key|secret|password|passwd|token)\b["']?\s*[:=]\s*["']?[^\s"']{12,}/i,
  },
];

/** Names of the rules that matched. Matched text is never returned, so findings are safe to store. */
export function detectSecrets(text: string): string[] {
  return SECRET_RULES.filter(({ pattern }) => pattern.test(text)).map(
    ({ rule }) => rule,
  );
}

const DISALLOWED_OPERATIONS: readonly { rule: string; pattern: RegExp }[] = [
  {
    rule: 'destructive-shell',
    pattern: /\brm\s+-[a-z]*r[a-z]*f?\s+\/|\bmkfs\b|\bformat\s+c:/i,
  },
  {
    rule: 'destructive-sql',
    pattern: /\bdrop\s+(?:table|database)\b|\btruncate\s+table\b/i,
  },
  {
    rule: 'remote-code-execution',
    pattern: /\b(?:curl|wget)\b[^\n|]*\|\s*(?:sh|bash|zsh)\b/i,
  },
];

/** Operations no agent in this application may be asked to perform. First matching rule, or null. */
export function detectDisallowedOperation(text: string): string | null {
  return (
    DISALLOWED_OPERATIONS.find(({ pattern }) => pattern.test(text))?.rule ??
    null
  );
}

/** Markdown images/links that carry data in a URL query are a common exfiltration channel. */
const EXFILTRATION_LINK = /!?\[[^\]]*\]\(\s*https?:\/\/[^)\s]*\?[^)\s]+\)/i;
export function detectExfiltrationLink(text: string): boolean {
  return EXFILTRATION_LINK.test(text);
}

/** A short, secret-free excerpt that is safe to store and show; null when it cannot be made safe. */
export function safeExcerpt(text: string, max = 160): string | null {
  if (detectSecrets(text).length > 0) return null;
  const clean = text
    .replace(/[\p{Cc}\p{Cf}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean || null;
}
