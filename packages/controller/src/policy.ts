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
