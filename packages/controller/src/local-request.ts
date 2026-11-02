/** Fail closed: browser mutations must originate from the same loopback host. */
export function isLocalMutation(
  origin: string | null,
  host: string | null,
): boolean {
  if (!origin || !host) return false;
  try {
    const url = new URL(origin);
    return (
      url.protocol === 'http:' &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) &&
      url.host === host &&
      url.origin === origin
    );
  } catch {
    return false;
  }
}
