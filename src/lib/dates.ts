import { format, isAfter, isBefore, parseISO, startOfDay, addDays, addMonths, addMinutes } from "date-fns";

/** Local calendar date key, "yyyy-MM-dd". */
export function dateKey(d: Date = new Date()): string {
  return format(d, "yyyy-MM-dd");
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function parseDate(key: string): Date {
  return parseISO(`${key}T00:00:00`);
}

/** "Today", "Tomorrow", "Overdue by 2 days", "Mon 12 Nov" */
export function humanDue(key: string, from: Date = new Date()): string {
  const today = startOfDay(from).getTime();
  const due = parseDate(key).getTime();
  const diff = Math.round((due - today) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < -1) return `Overdue · ${-diff}d`;
  if (diff >= 2 && diff <= 6) return format(parseDate(key), "EEE d MMM");
  return format(parseDate(key), "EEE d MMM");
}

/** Compare two date keys safely. */
export function isOverdue(due: string | null, from: Date = new Date()): boolean {
  if (!due) return false;
  return parseDate(due).getTime() < startOfDay(from).getTime();
}

export function isDueToday(due: string | null, from: Date = new Date()): boolean {
  if (!due) return false;
  return due === dateKey(from);
}

export function isUpcoming(due: string | null, from: Date = new Date()): boolean {
  if (!due) return false;
  const d = parseDate(due).getTime();
  return d > startOfDay(from).getTime() && d <= addDays(startOfDay(from), 14).getTime();
}

/** Next due date for a recurrence, from a base date key. */
export function nextRecurrence(kind: string, interval: number, fromKey: string): string | null {
  const base = parseDate(fromKey);
  switch (kind) {
    case "daily":
      return dateKey(addDays(base, interval));
    case "weekdays": {
      let next = addDays(base, 1);
      while (next.getDay() === 0 || next.getDay() === 6) next = addDays(next, 1);
      return dateKey(next);
    }
    case "weekly":
      return dateKey(addDays(base, 7 * interval));
    case "monthly":
      return dateKey(addMonths(base, interval));
    default:
      return null;
  }
}

export function relativeDayLabel(key: string, from: Date = new Date()): string {
  if (key === dateKey(from)) return "Today";
  if (key === dateKey(addDays(startOfDay(from), -1))) return "Yesterday";
  if (key === dateKey(addDays(startOfDay(from), 1))) return "Tomorrow";
  const withinWeek = Math.abs(parseDate(key).getTime() - startOfDay(from).getTime()) < 6 * 86_400_000;
  return format(parseDate(key), withinWeek ? "EEEE" : "EEE d MMM");
}

export function clockParts(secondsTotal: number): { mm: string; ss: string } {
  const s = Math.max(0, Math.round(secondsTotal));
  return { mm: String(Math.floor(s / 60)).padStart(2, "0"), ss: String(s % 60).padStart(2, "0") };
}

export function formatHour(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} m`;
}

export { isAfter, isBefore, formatHour as minutesLabel };
export const _e = { addMinutes, parseISO };
