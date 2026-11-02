const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '[::1]'];

/** Fail closed: reads of private data accept only loopback Host headers (DNS rebinding defence). */
export function isLocalHost(host: string | null): boolean {
  if (!host) return false;
  try {
    return LOOPBACK_HOSTS.includes(new URL(`http://${host}`).hostname);
  } catch {
    return false;
  }
}

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
      LOOPBACK_HOSTS.includes(url.hostname) &&
      url.host === host &&
      url.origin === origin
    );
  } catch {
    return false;
  }
}
