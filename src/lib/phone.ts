export function normalizePhone(p: string): string {
  return p.replace(/\D/g, "");
}

/**
 * Loose match that tolerates +62 vs 0 prefixes: compares the last 9 digits.
 * Used as the second factor for code+phone self-checkout.
 */
export function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (na.length < 7 || nb.length < 7) return false;
  return na.slice(-9) === nb.slice(-9);
}
