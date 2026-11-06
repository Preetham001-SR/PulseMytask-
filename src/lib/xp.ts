/** Cumulative XP thresholds. Level n needs LEVEL_THRESHOLDS[n-1] xp. */
const LEVEL_THRESHOLDS: number[] = [
  0, 50, 120, 260, 460, 750, 1120, 1600, 2200, 3000, 4000, 5200, 6600, 8200, 10000,
];

export function levelFromXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]!) level = i + 1;
  }
  // beyond the table, +2000 xp per level
  const top = LEVEL_THRESHOLDS.length;
  if (xp >= LEVEL_THRESHOLDS[top - 1]!) {
    level = top + Math.floor((xp - LEVEL_THRESHOLDS[top - 1]!) / 2000);
  }
  return level;
}

export function levelSpan(xp: number): { level: number; floor: number; next: number | null } {
  const level = levelFromXp(xp);
  const atOrBeyond = level > LEVEL_THRESHOLDS.length;
  const floor = atOrBeyond
    ? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]! + (level - LEVEL_THRESHOLDS.length) * 2000
    : LEVEL_THRESHOLDS[level - 1]!;
  const next = atOrBeyond ? floor + 2000 : (LEVEL_THRESHOLDS[level] ?? null);
  return { level, floor, next };
}

export function xpProgress(xp: number): { level: number; pct: number; toNext: number | null } {
  const { level, floor, next } = levelSpan(xp);
  if (next === null) return { level, pct: 1, toNext: null };
  const pct = Math.min(1, Math.max(0.02, (xp - floor) / (next - floor)));
  return { level, pct, toNext: next - xp };
}

export const LEVEL_TITLES = [
  "Opening pulse",
  "Warmed up",
  "In rhythm",
  "Steady beat",
  "Picked up pace",
  "Strong tempo",
  "In the zone",
  "Relentless",
  "Pure momentum",
  "Unstoppable",
];

export function levelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)] ?? "Unstoppable";
}
