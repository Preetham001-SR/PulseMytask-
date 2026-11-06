/** Deterministic ids across environments. */
export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Short stable oklch-less tint pick for a string (identity hues, pale). */
const PERSON_TINTS = [0, 1, 2, 3];
export function stableTintIndex(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PERSON_TINTS[Math.abs(h) % PERSON_TINTS.length] ?? 0;
}
