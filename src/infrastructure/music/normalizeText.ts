/** Lowercase, accent-free, whitespace-collapsed form used to compare titles and key caches. */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
