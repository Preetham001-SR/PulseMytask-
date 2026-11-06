import type { FocusSession, Priority, Task } from "@/types";
import { dateKey, parseDate, todayKey } from "@/lib/dates";
import { addDays, format } from "date-fns";

/* Everything here is computed from the user's real data. No invented
   numbers, no vanity totals: zeros are printed as zeros. */

export interface DayCount {
  date: string;
  label: string;
  completed: number;
}

export function completionsByDay(task: Task[], days: number, from: Date = new Date()): DayCount[] {
  const start = startOfDayN(from, days - 1);
  const out: DayCount[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i);
    const key = dateKey(d);
    out.push({
      date: key,
      label: format(d, "EEE"),
      completed: task.filter((t) => t.completedAt && dateKey(new Date(t.completedAt)) === key).length,
    });
  }
  return out;
}

function startOfDayN(from: Date, back: number): Date {
  const t = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return addDays(t, -back);
}

export function completionsTotal(task: Task[]): number {
  return task.filter((t) => t.completedAt).length;
}

export function completedTasksSorted(task: Task[]): Task[] {
  return task
    .filter((t) => t.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
}

export function openTasks(task: Task[]): Task[] {
  return task.filter((t) => !t.completedAt);
}

/** Open tasks by priority — the distribution of what's still on the table. */
export function priorityDistribution(task: Task[]): { priority: Priority; count: number }[] {
  const open = openTasks(task);
  const count = (p: Priority) => open.filter((t) => t.priority === p).length;
  return [
    { priority: "urgent", count: count("urgent") },
    { priority: "high", count: count("high") },
    { priority: "medium", count: count("medium") },
    { priority: "low", count: count("low") },
  ];
}

export function focusMinutesByDay(sessions: FocusSession[], days: number, from: Date = new Date()): DayCount[] {
  const start = startOfDayN(from, days - 1);
  const out: DayCount[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i);
    const key = dateKey(d);
    out.push({
      date: key,
      label: format(d, "EEE"),
      completed: sessions
        .filter((s) => s.completed && dateKey(new Date(s.startedAt)) === key)
        .reduce((sum, s) => sum + s.minutes, 0),
    });
  }
  return out;
}

export interface WeekPoint {
  label: string;
  completed: number;
}

/** Completions per ISO-ish week (last 4 calendar weeks, Sunday start). */
export function weeklyTrend(task: Task[], weeks: number, from: Date = new Date()): WeekPoint[] {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const out: WeekPoint[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const start = addDays(today, -w * 7 - today.getDay());
    const end = addDays(start, 6);
    const count = task.filter((t) => {
      if (!t.completedAt) return false;
      const d = new Date(t.completedAt);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      return key >= start.getTime() && key <= end.getTime();
    }).length;
    out.push({
      label: `${format(start, "d MMM")}`,
      completed: count,
    });
  }
  return out;
}

export interface DailyPeriod {
  completed: number;
}

export function todayStats(task: Task[], from: Date = new Date()): DailyPeriod & { open: number; overdue: number; dueToday: number } {
  const key = dateKey(from);
  const dueToday = task.filter((t) => t.dueDate === key);
  return {
    completed: task.filter((t) => t.completedAt && dateKey(new Date(t.completedAt)) === key).length,
    open: dueToday.filter((t) => !t.completedAt).length,
    dueToday: dueToday.length,
    overdue: task.filter((t) => !t.completedAt && t.dueDate !== null && t.dueDate < key).length,
  };
}

/** Personal bests, computed from history. */
export interface PersonalBests {
  bestDay: { date: string; count: number } | null;
  bestFocusDay: { date: string; minutes: number } | null;
  busiestWeekday: { label: string; count: number } | null;
}

export function personalBests(task: Task[], sessions: FocusSession[]): PersonalBests {
  const byDay = new Map<string, number>();
  for (const t of task) {
    if (!t.completedAt) continue;
    const k = dateKey(new Date(t.completedAt));
    byDay.set(k, (byDay.get(k) ?? 0) + 1);
  }
  let bestDay: PersonalBests["bestDay"] = null;
  for (const [date, count] of byDay) {
    if (!bestDay || count > bestDay.count) bestDay = { date, count };
  }

  const focusByDay = new Map<string, number>();
  for (const s of sessions) {
    if (!s.completed) continue;
    const k = dateKey(new Date(s.startedAt));
    focusByDay.set(k, (focusByDay.get(k) ?? 0) + s.minutes);
  }
  let bestFocusDay: PersonalBests["bestFocusDay"] = null;
  for (const [date, minutes] of focusByDay) {
    if (!bestFocusDay || minutes > bestFocusDay.minutes) bestFocusDay = { date, minutes };
  }

  const weekdayTotals = new Map<number, number>();
  for (const t of task) {
    if (!t.completedAt) continue;
    const d = new Date(t.completedAt);
    weekdayTotals.set(d.getDay(), (weekdayTotals.get(d.getDay()) ?? 0) + 1);
  }
  let busiestWeekday: PersonalBests["busiestWeekday"] = null;
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  for (const [day, count] of weekdayTotals) {
    if (!busiestWeekday || count > busiestWeekday.count) busiestWeekday = { label: names[day] ?? "?", count };
  }

  return { bestDay, bestFocusDay, busiestWeekday };
}

/** The week key for the weekly milestone: "w-2026-44" style, Monday start. */
export function weekKey(from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const jan1 = new Date(monday.getFullYear(), 0, 1);
  const week = Math.floor((monday.getTime() - jan1.getTime()) / (7 * 86_400_000)) + 1;
  return `w-${monday.getFullYear()}-${String(week).padStart(2, "0")}`;
}

export function completionsThisWeek(task: Task[], from: Date = new Date()): number {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return task.filter((t) => {
    if (!t.completedAt) return false;
    const c = new Date(t.completedAt);
    const key = new Date(c.getFullYear(), c.getMonth(), c.getDate()).getTime();
    return key >= monday.getTime();
  }).length;
}

export const MILESTONE_TARGET = 25;

export function isTodayKey(key: string): boolean {
  return key === todayKey();
}

export { parseDate };
