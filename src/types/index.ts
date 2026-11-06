import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Domain types                                                       */
/* ------------------------------------------------------------------ */

export type Priority = "urgent" | "high" | "medium" | "low";

export type CategoryId = "work" | "personal" | "health" | "learning" | "errands";

export type RecurrenceKind = "none" | "daily" | "weekdays" | "weekly" | "monthly";

export interface Recurrence {
  kind: RecurrenceKind;
  /** every N days / weeks / months (1 = classic) */
  interval: number;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  priority: Priority;
  /** local calendar date "yyyy-MM-dd", or null for undated (inbox) */
  dueDate: string | null;
  /** estimated duration in minutes */
  estimateMin: number | null;
  categoryId: CategoryId | null;
  projectId: string | null;
  tags: string[];
  subtasks: Subtask[];
  recurrence: Recurrence;
  /** ISO instant when completed, null while open */
  completedAt: string | null;
  /** ISO instant when created */
  createdAt: string;
  /** manual sort position within its date bucket */
  order: number;
  /** true behind the one seeded sample set, so it can be cleared without touching user tasks */
  isSample: boolean;
}

export interface Project {
  id: string;
  name: string;
}

export interface FocusSession {
  id: string;
  startedAt: string;
  /** planned minutes (25, 50, custom) */
  minutes: number;
  /** true when the timer ran out; false when stopped early */
  completed: boolean;
  taskId: string | null;
}

export interface Streak {
  current: number;
  best: number;
  /** "yyyy-MM-dd" of the most recent active day */
  lastActive: string | null;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedAt: string | null;
}

export interface Progress {
  xp: number;
  streak: Streak;
  /** achievement id → ISO unlock instant; absence means locked */
  achievements: Record<string, string>;
  /** weekly milestone bookkeeping: granted per week key "yyyy-ww" */
  milestoneWeek: string | null;
  /** id of the last seen level, so the celebration fires once */
  seenLevel: number;
}

export type ThemeSetting = "light" | "dark" | "system";

export interface Settings {
  /** how the app greets you */
  name: string;
  theme: ThemeSetting;
  focusMinutes: number;
  breakMinutes: number;
  /** the daily pulse target: tasks finished per day */
  dailyGoal: number;
}

export interface PulseState {
  version: number;
  createdAt: string;
  tasks: Task[];
  projects: Project[];
  focusSessions: FocusSession[];
  progress: Progress;
  settings: Settings;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

export const CATEGORIES: { id: CategoryId; name: string }[] = [
  { id: "work", name: "Work" },
  { id: "personal", name: "Personal" },
  { id: "health", name: "Health" },
  { id: "learning", name: "Learning" },
  { id: "errands", name: "Errands" },
];

export const PRIORITIES: Priority[] = ["urgent", "high", "medium", "low"];

export const PRIORITY_META: Record<Priority, { label: string; hint: string }> = {
  urgent: { label: "Urgent", hint: "Do today, no matter what" },
  high: { label: "High", hint: "Important, due soon" },
  medium: { label: "Medium", hint: "This week" },
  low: { label: "Low", hint: "Whenever" },
};

export const PRIORITY_XP: Record<Priority, number> = {
  urgent: 22,
  high: 16,
  medium: 10,
  low: 5,
};

export const X_PER_SUBTASK = 2;
export const CHALLENGE_XP = 25;
export const FOCUS_XP = 12;
export const MILESTONE_XP = 80;

export const ESTIMATE_OPTIONS = [5, 10, 15, 30, 45, 60, 90, 120, 180];

export const STORAGE_KEY = "pulse-store";
export const STATE_VERSION = 1;
export const DEFAULT_SETTINGS: Settings = {
  name: "",
  theme: "system",
  focusMinutes: 25,
  breakMinutes: 5,
  dailyGoal: 5,
};

export const DEFAULT_PROGRESS: Progress = {
  xp: 0,
  streak: { current: 0, best: 0, lastActive: null },
  achievements: {},
  milestoneWeek: null,
  seenLevel: 1,
};

export function makeTask(patch: Partial<Task> = {}): Task {
  return {
    id: patch.id ?? crypto.randomUUID(),
    title: patch.title ?? "",
    notes: patch.notes ?? "",
    priority: patch.priority ?? "medium",
    dueDate: patch.dueDate ?? null,
    estimateMin: patch.estimateMin ?? null,
    categoryId: patch.categoryId ?? null,
    projectId: patch.projectId ?? null,
    tags: patch.tags ?? [],
    subtasks: patch.subtasks ?? [],
    recurrence: patch.recurrence ?? { kind: "none", interval: 1 },
    completedAt: patch.completedAt ?? null,
    createdAt: patch.createdAt ?? new Date().toISOString(),
    order: patch.order ?? 0,
    isSample: patch.isSample ?? false,
  };
}

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const subtaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  done: z.boolean(),
});

export const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  notes: z.string().max(2000),
  priority: z.enum(PRIORITIES),
  dueDate: dateKey.nullable(),
  estimateMin: z.number().int().min(5).max(480).nullable(),
  categoryId: z.enum([...CATEGORIES.map((c) => c.id), ""]).nullable().transform((v) => (v ? v : null)),
  projectId: z.string().min(1).nullable(),
  tags: z.array(z.string().min(1).max(30)).max(10),
  subtasks: z.array(subtaskSchema).max(50),
  recurrence: z.object({
    kind: z.enum(["none", "daily", "weekdays", "weekly", "monthly"]),
    interval: z.number().int().min(1).max(6),
  }),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  order: z.number(),
  isSample: z.boolean(),
});

export const projectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
});

export const sessionSchema = z.object({
  id: z.string().min(1),
  startedAt: z.string().datetime(),
  minutes: z.number().int().min(1).max(180),
  completed: z.boolean(),
  taskId: z.string().min(1).nullable(),
});

export const progressSchema = z.object({
  xp: z.number().int().min(0),
  streak: z.object({ current: z.number().int().min(0), best: z.number().int().min(0), lastActive: dateKey.nullable() }),
  achievements: z.record(z.string().min(1), z.string().datetime()),
  milestoneWeek: z.string().nullable(),
  seenLevel: z.number().int().min(1),
});

export const settingsSchema = z.object({
  name: z.string().max(40),
  theme: z.enum(["light", "dark", "system"]),
  focusMinutes: z.number().int().min(10).max(90),
  breakMinutes: z.number().int().min(3).max(30),
  dailyGoal: z.number().int().min(1).max(12),
});

export const pulseStateSchema = z.object({
  version: z.number(),
  createdAt: z.string().datetime(),
  tasks: z.array(taskSchema).max(1000),
  projects: z.array(projectSchema).max(50),
  focusSessions: z.array(sessionSchema).max(1000),
  progress: progressSchema,
  settings: settingsSchema,
});

/** Parse at the persistence boundary; a poisoned store loads as a fresh one. */
export function validatePulseState(input: unknown): PulseState | null {
  try {
    const parsed = pulseStateSchema.safeParse(input);
    if (!parsed.success) return null;
    const { data } = parsed;
    // keep only the fields we declare — older cruft is dropped, not trusted
    return {
      version: data.version,
      createdAt: data.createdAt,
      tasks: data.tasks,
      projects: data.projects,
      focusSessions: data.focusSessions,
      progress: data.progress,
      settings: data.settings,
    };
  } catch {
    return null;
  }
}
