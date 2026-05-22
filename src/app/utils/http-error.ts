/** True when the browser could not reach the API (down, CORS blocked, wrong port, etc.). */
export function isApiUnreachable(err: unknown): boolean {
  if (!err || typeof err !== 'object') return true;
  const status = (err as { status?: number }).status;
  return status === 0 || status == null;
}
