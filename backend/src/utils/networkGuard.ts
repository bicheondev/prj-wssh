export function isBlockedHost(host: string, allowPrivateRanges: boolean) {
  const blocked = [/^localhost$/i, /^127\./, /^::1$/, /^169\.254\.169\.254$/, /^0\./];
  if (blocked.some((p) => p.test(host))) return true;
  if (!allowPrivateRanges) {
    const privateRanges = [/^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[0-1])\./, /^fc/i, /^fd/i];
    if (privateRanges.some((p) => p.test(host))) return true;
  }
  return false;
}
