import type { FocusSession, Task } from "@/types";
import { dateKey, todayKey, parseDate } from "@/lib/dates";

/* ------------------------------------------------------------------ */
/*  Streaks — never shame. A break in the streak is silent; the best    */
/*  streak stays visible and the counter simply waits to grow again.    */
/* ------------------------------------------------------------------ */

/** Recompute the streaks from the actual history: an active day is one with a
 *  completion, or a focus session of fifteen minutes or more. */
export function computeStreak(task: Task[], sessions: FocusSession[]): { current: number; best: number } {
  const days = new Set<string>();
  for (const t of task) if (t.completedAt) days.add(dateKey(new Date(t.completedAt)));
  for (const s of sessions) if (s.completed || s.minutes >= 15) days.add(dateKey(new Date(s.startedAt)));
  if (days.size === 0) return { current: 0, best: 0 };

  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of sorted) {
    const t = parseDate(d).getTime();
    run = prev !== null && t - prev === 86_400_000 ? run + 1 : 1;
    prev = t;
    if (run > best) best = run;
  }

  const today = todayKey();
  const yesterday = dateKey(new Date(Date.now() - 86_400_000));
  const last = sorted[sorted.length - 1]!;
  const current = last === today || last === yesterday ? run : 0;
  return { current, best: Math.max(best, current) };
}

/* ------------------------------------------------------------------ */
/*  Daily challenges — two per day, deterministic from the date.        */
/* ------------------------------------------------------------------ */

export interface ChallengeDef {
  id: string;
  label: string;
  detail: string;
  target: number;
  xp: number;
}

export function challengesForDate(dayKey: string): ChallengeDef[] {
  let h = 7;
  for (let i = 0; i < dayKey.length; i++) h = (h * 31 + dayKey.charCodeAt(i)) | 0;
  const pool: ChallengeDef[] = [
    { id: "tasks-2", label: "Finish two tasks", detail: "Any two — open the loop, close the loop.", target: 2, xp: 25 },
    { id: "tasks-4", label: "Four tasks down", detail: "A solid day's harvest, however small the tasks.", target: 4, xp: 25 },
    { id: "due-clear", label: "Clear today's plate", detail: "Complete everything scheduled for today.", target: 1, xp: 40 },
    { id: "focus-1", label: "One focus session", detail: "Twenty-five quiet minutes on a single thing.", target: 1, xp: 25 },
    { id: "mission", label: "Seal the daily mission", detail: "The one task that carries the day.", target: 1, xp: 35 },
  ];
  const first = Math.abs(h) % pool.length;
  let second = Math.abs(h >> 3) % pool.length;
  if (second === first) second = (first + 2) % pool.length;
  return [pool[first]!, pool[second]!];
}

export interface ChallengeState {
  def: ChallengeDef;
  progress: number;
  done: boolean;
}

/** One daily mission: the most important open task due today or earlier,
 *  falling back to the most important inbox task. */
export function missionOf(task: Task[], from: Date = new Date()): Task | null {
  const today = dateKey(from);
  const prio: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  const key = (t: Task) => (prio[t.priority] ?? 9) * 100_000 + (t.dueDate ? parseDate(t.dueDate).getTime() / 86_400_000 : 99_999) + t.order / 10_000;
  const dueTodayOrOver = task
    .filter((t) => !t.completedAt && t.dueDate !== null && t.dueDate <= today)
    .sort((a, b) => key(a) - key(b));
  if (dueTodayOrOver.length > 0) return dueTodayOrOver[0]!;
  const inbox = task.filter((t) => !t.completedAt && t.dueDate === null).sort((a, b) => key(a) - key(b));
  return inbox[0] ?? null;
}

export function nextThreeOf(task: Task[], from: Date = new Date(), excludeId?: string): Task[] {
  const today = dateKey(from);
  const prio: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  const key = (t: Task) => (prio[t.priority] ?? 9) * 100_000 + (t.dueDate ? parseDate(t.dueDate).getTime() / 86_400_000 : 99_999) + t.order / 10_000;
  return task
    .filter((t) => !t.completedAt && t.id !== excludeId && (!t.dueDate || t.dueDate <= today))
    .sort((a, b) => key(a) - key(b))
    .slice(0, 3);
}

/**
 * Challenge progress is derived from the user's real history — nothing
 * about challenges is stored, so the maths can never disagree with the list.
 */
export function challengeProgress(
  def: ChallengeDef,
  task: Task[],
  sessions: FocusSession[],
  opts: { missionId?: string | null } = {},
): ChallengeState {
  const today = todayKey();
  let progress = 0;
  switch (def.id) {
    case "tasks-2":
    case "tasks-4": {
      progress = task.filter((t) => t.completedAt && dateKey(new Date(t.completedAt)) === today).length;
      break;
    }
    case "due-clear": {
      const anyTodayDone = task.some((t) => t.completedAt && t.dueDate === today);
      const open = task.filter((t) => t.dueDate === today && !t.completedAt).length;
      progress = open === 0 && anyTodayDone ? 1 : 0;
      break;
    }
    case "focus-1": {
      progress = Math.min(1, sessions.filter((s) => s.completed && dateKey(new Date(s.startedAt)) === today).length);
      break;
    }
    case "mission": {
      const id = opts.missionId ?? document.documentElement.dataset.missionTask;
      progress = id ? (task.find((t) => t.id === id && t.completedAt && dateKey(new Date(t.completedAt)) === today) ? 1 : 0) : 0;
      break;
    }
  }
  return { def, progress, done: progress >= def.target };
}

/* ------------------------------------------------------------------ */
/*  Achievements                                                        */
/* ------------------------------------------------------------------ */

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  test: (c: AchievementContext) => boolean;
}

export interface AchievementContext {
  task: Task[];
  sessions: FocusSession[];
  xp: number;
  streakBest: number;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: "first", name: "First checkmark", description: "Complete your first task.", test: (c) => c.task.some((t) => t.completedAt) },
  { id: "ten", name: "Ten in", description: "Complete ten tasks.", test: (c) => c.task.filter((t) => t.completedAt).length >= 10 },
  { id: "fifty", name: "Fifty and counting", description: "Complete fifty tasks.", test: (c) => c.task.filter((t) => t.completedAt).length >= 50 },
  {
    id: "clean-sweep",
    name: "Clean sweep",
    description: "Finish every task due on one day — three or more.",
    test: (c) => {
      const byDay = new Map<string, { open: number; done: number }>();
      for (const t of c.task) {
        if (!t.dueDate) continue;
        const e = byDay.get(t.dueDate) ?? { open: 0, done: 0 };
        if (t.completedAt) e.done += 1;
        else e.open += 1;
        byDay.set(t.dueDate, e);
      }
      return [...byDay.values()].some((e) => e.done >= 3 && e.open === 0);
    },
  },
  { id: "streak-3", name: "Breathing rhythm", description: "An active day, three days running.", test: (c) => c.streakBest >= 3 },
  { id: "streak-7", name: "A week of it", description: "Show up seven days in a row.", test: (c) => c.streakBest >= 7 },
  {
    id: "early",
    name: "Before nine",
    description: "Complete a task before 9:00 in the morning.",
    test: (c) =>
      c.task.some((t) => {
        if (!t.completedAt) return false;
        return new Date(t.completedAt).getHours() < 9;
      }),
  },
  {
    id: "deep",
    name: "Deep work",
    description: "A single focus session of forty-five minutes or more.",
    test: (c) => c.sessions.some((s) => s.completed && s.minutes >= 45),
  },
  {
    id: "double",
    name: "Double session",
    description: "Two completed focus sessions in one day.",
    test: (c) => {
      const counts = new Map<string, number>();
      for (const s of c.sessions) {
        if (!s.completed) continue;
        const k = dateKey(new Date(s.startedAt));
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      return [...counts.values()].some((n) => n >= 2);
    },
  },
  { id: "focus-10", name: "Ten sessions in", description: "Ten completed focus sessions.", test: (c) => c.sessions.filter((s) => s.completed).length >= 10 },
  {
    id: "watt",
    name: "High-wattage day",
    description: "Earn two hundred XP in a single day.",
    test: (c) => {
      const xpByDay = new Map<string, number>();
      const add = (k: string, v: number) => xpByDay.set(k, (xpByDay.get(k) ?? 0) + v);
      for (const t of c.task) {
        if (!t.completedAt) continue;
        const base = { urgent: 22, high: 16, medium: 10, low: 5 }[t.priority];
        add(dateKey(new Date(t.completedAt)), (base ?? 0) + t.subtasks.filter((s) => s.done).length * 2);
      }
      for (const s of c.sessions) {
        if (!s.completed) continue;
        add(dateKey(new Date(s.startedAt)), 12);
      }
      return [...xpByDay.values()].some((v) => v >= 200);
    },
  },
  {
    id: "week-25",
    name: "A strong week",
    description: "Twenty-five completions in seven days.",
    test: (c) => {
      const days = c.task
        .flatMap((t) => (t.completedAt ? [parseDate(dateKey(new Date(t.completedAt))).getTime()] : []))
        .sort((a, b) => a - b);
      let best = 0;
      for (let i = 0; i < days.length; i++) {
        let n = 0;
        for (let j = i; j < days.length && days[j]! - days[i]! < 7 * 86_400_000; j++) n++;
        if (n > best) best = n;
      }
      return best >= 25;
    },
  },
];

