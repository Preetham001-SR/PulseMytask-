import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  FocusSession,
  Priority,
  Progress,
  PulseState,
  Settings,
  Task,
  ThemeSetting,
} from "@/types";
import { DEFAULT_PROGRESS, DEFAULT_SETTINGS, PRIORITY_XP, STATE_VERSION, X_PER_SUBTASK } from "@/types";
import { makeTask, pulseStateSchema } from "@/types";
import { uid } from "@/lib/id";
import { dateKey, nextRecurrence, todayKey, parseDate } from "@/lib/dates";
import { ACHIEVEMENT_DEFS } from "@/lib/gamify";
import { levelFromXp } from "@/lib/xp";
import { MILESTONE_TARGET, weekKey, completionsThisWeek } from "@/lib/analytics";
import { seedTasks, SAMPLE_PROJECTS } from "@/data/samples";

/* ------------------------------------------------------------------ */
/*  Persistence — a single versioned snapshot in localStorage. The      */
/*  schema is validated with zod at the boundary (types/index.ts); a    */
/*  poisoned or foreign store loads as a fresh one. The repository      */
/*  interface in lib/repository.ts keeps the door open for Supabase.    */
/* ------------------------------------------------------------------ */

function freshState(): PulseState {
  return {
    version: STATE_VERSION,
    createdAt: new Date().toISOString(),
    tasks: seedTasks(),
    projects: SAMPLE_PROJECTS,
    focusSessions: [],
    progress: { ...DEFAULT_PROGRESS, streak: { current: 0, best: 0, lastActive: null } },
    settings: { ...DEFAULT_SETTINGS },
  };
}

interface ToastPayload {
  id: string;
  kind: "xp" | "achievement" | "level" | "info" | "undo" | "warn";
  title: string;
  detail?: string;
  xp?: number;
  undo?: () => void;
}

export interface PulseStore extends PulseState {
  hydrated: boolean;
  toasts: ToastPayload[];
  /* tasks */
  addTask: (patch: Partial<Task>) => Task;
  updateTask: (id: string, patch: Partial<Omit<Task, "id">>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => void;
  uncompleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  rescheduleTask: (id: string, date: string | null) => void;
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  removeSubtask: (taskId: string, subtaskId: string) => void;
  reorderTasks: (orderedIds: string[]) => void;
  clearSampleData: () => void;
  /* projects */
  addProject: (name: string) => string;
  /* focus */
  logFocusSession: (payload: { minutes: number; completed: boolean; taskId: string | null }) => void;
  /* settings */
  updateSettings: (patch: Partial<Settings>) => void;
  setTheme: (theme: ThemeSetting) => void;
  /* persistence + toasts */
  _hydrate: (state: unknown) => void;
  pushToast: (t: Omit<ToastPayload, "id">) => void;
  dismissToast: (id: string) => void;
}

function withOrder(task: Task[], patch: Partial<Task>): Partial<Task> {
  const maxOrder = task.reduce((m, t) => Math.max(m, t.order), -1);
  return { ...patch, order: patch.order ?? maxOrder + 1 };
}

function bumpStreak(progress: Progress): Progress {
  const today = todayKey();
  const yesterday = dateKey(new Date(Date.now() - 86_400_000));
  const { streak } = progress;
  if (streak.lastActive === today) return progress;
  const next = streak.lastActive === yesterday ? streak.current + 1 : 1;
  return {
    ...progress,
    streak: { current: next, best: Math.max(streak.best, next), lastActive: today },
  };
}

function checkMilestone(progress: Progress, tasks: Task[]): { progress: Progress; bonus: number } {
  const key = weekKey();
  const done = completionsThisWeek(tasks);
  if (done >= MILESTONE_TARGET && progress.milestoneWeek !== key) {
    return { progress: { ...progress, milestoneWeek: key }, bonus: 80 };
  }
  return { progress, bonus: 0 };
}

function newlyUnlocked(achievements: Record<string, string>, ctx: { task: Task[]; sessions: FocusSession[]; xp: number; streakBest: number }) {
  const out: { def: (typeof ACHIEVEMENT_DEFS)[number]; at: string }[] = [];
  for (const def of ACHIEVEMENT_DEFS) {
    if (achievements[def.id]) continue;
    if (def.test(ctx)) out.push({ def, at: new Date().toISOString() });
  }
  return out;
}

export const usePulseStore = create<PulseStore>()(
  persist(
    (set, get) => {
      /* toast helper */
      const toast = (t: Omit<ToastPayload, "id">) => {
        const id = uid();
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
        }, 5200);
        set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
      };

      const award = (xp: number, tasks: Task[], sessions: FocusSession[], note?: string) => {
        const state = get();
        let progress: Progress = { ...state.progress, xp: state.progress.xp + xp };
        progress = bumpStreak(progress);
        const sessionsWith: FocusSession[] = sessions;
        const unlocked = newlyUnlocked(progress.achievements, {
          task: tasks,
          sessions: sessionsWith,
          xp: progress.xp,
          streakBest: progress.streak.best,
        });
        let milestoneBonus = 0;
        ({ progress, bonus: milestoneBonus } = checkMilestone(progress, tasks));
        for (const u of unlocked) progress = { ...progress, achievements: { ...progress.achievements, [u.def.id]: u.at } };

        const prevLevel = levelFromXp(state.progress.xp);
        const nextLevel = levelFromXp(progress.xp);
        set({ progress });

        const parts: string[] = [];
        if (note) parts.push(note);
        if (milestoneBonus) toast({ kind: "xp", title: "Weekly milestone reached", detail: `${MILESTONE_TARGET} tasks this week — +${milestoneBonus + xp} XP`, xp: milestoneBonus + xp });
        if (nextLevel > prevLevel) {
          toast({ kind: "level", title: `Level ${nextLevel}`, detail: "A new pulse level — steady.", });
        }
        for (const u of unlocked) {
          toast({ kind: "achievement", title: u.def.name, detail: u.def.description });
        }
        return parts;
      };

      return {
        ...freshState(),
        hydrated: false,
        toasts: [],

        addTask: (patch) => {
          const task = makeTask(withOrder(get().tasks, patch));
          if (!task.title.trim()) return task;
          set((s) => ({ tasks: [...s.tasks, { ...task, title: task.title.trim() }] }));
          return task;
        },

        updateTask: (id, patch) =>
          set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch, title: patch.title !== undefined ? patch.title.trim() : t.title } : t)) })),

        deleteTask: (id) => {
          const victim = get().tasks.find((t) => t.id === id);
          set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
          if (victim) {
            toast({
              kind: "undo",
              title: "Task removed",
              detail: victim.title,
              undo: () => set((s) => ({ tasks: [...s.tasks, victim] })),
            });
          }
        },

        completeTask: (id) => {
          const state = get();
          const task = state.tasks.find((t) => t.id === id);
          if (!task || task.completedAt) return;

          const doneTask: Task = { ...task, completedAt: new Date().toISOString() };
          const tasks = state.tasks.map((t) => (t.id === id ? doneTask : t));

          // recurring tasks spawn their next occurrence immediately
          if (task.recurrence.kind !== "none" && task.dueDate) {
            const nextDate = nextRecurrence(task.recurrence.kind, task.recurrence.interval, task.dueDate);
            if (nextDate) {
              tasks.push({
                ...task,
                id: uid(),
                completedAt: null,
                dueDate: nextDate,
                order: task.order,
                subtasks: task.subtasks.map((s) => ({ ...s, done: false })),
              });
            }
          }
          set({ tasks });

          const gained = PRIORITY_XP[task.priority] + task.subtasks.filter((s) => s.done).length * X_PER_SUBTASK;
          award(gained, tasks, state.focusSessions, `“${task.title.length > 34 ? task.title.slice(0, 34) + "…" : task.title}” done`);
        },

        uncompleteTask: (id) => {
          const state = get();
          const task = state.tasks.find((t) => t.id === id);
          if (!task || !task.completedAt) return;
          const gained = PRIORITY_XP[task.priority] + task.subtasks.filter((s) => s.done).length * X_PER_SUBTASK;
          set((s) => ({
            tasks: s.tasks.map((t) => (t.id === id ? { ...t, completedAt: null } : t)),
            progress: { ...s.progress, xp: Math.max(0, s.progress.xp - gained) },
          }));
          toast({ kind: "undo", title: "Completion undone", detail: `−${gained} XP` });
        },

        toggleTask: (id) => {
          const t = get().tasks.find((x) => x.id === id);
          if (!t) return;
          if (t.completedAt) get().uncompleteTask(id);
          else get().completeTask(id);
        },

        rescheduleTask: (id, date) =>
          set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, dueDate: date } : t)) })),

        addSubtask: (taskId, title) =>
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === taskId && title.trim() ? { ...t, subtasks: [...t.subtasks, { id: uid(), title: title.trim(), done: false }] } : t,
            ),
          })),

        toggleSubtask: (taskId, subtaskId) =>
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === taskId
                ? { ...t, subtasks: t.subtasks.map((x) => (x.id === subtaskId ? { ...x, done: !x.done } : x)) }
                : t,
            ),
          })),

        removeSubtask: (taskId, subtaskId) =>
          set((s) => ({
            tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, subtasks: t.subtasks.filter((x) => x.id !== subtaskId) } : t)),
          })),

        reorderTasks: (orderedIds) =>
          set((s) => ({
            tasks: s.tasks.map((t) => {
              const i = orderedIds.indexOf(t.id);
              return i === -1 ? t : { ...t, order: i };
            }),
          })),

        clearSampleData: () => {
          const before = get().tasks.filter((t) => t.isSample);
          set((s) => ({ tasks: s.tasks.filter((t) => !t.isSample) }));
          toast({
            kind: "undo",
            title: `Removed ${before.length} sample task${before.length === 1 ? "" : "s"}`,
            undo: () => set((s) => ({ tasks: [...s.tasks, ...before] })),
          });
        },

        addProject: (name) => {
          const id = uid();
          if (name.trim()) set((s) => ({ projects: [...s.projects, { id, name: name.trim() }] }));
          return id;
        },

        logFocusSession: ({ minutes, completed, taskId }) => {
          const session: FocusSession = { id: uid(), startedAt: new Date(Date.now() - minutes * 60_000).toISOString(), minutes, completed, taskId };
          set((s) => ({ focusSessions: [...s.focusSessions, session] }));
          if (completed) {
            award(12, get().tasks, [...get().focusSessions], `${minutes} focused minutes`);
          }
        },

        updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

        setTheme: (theme) => {
          set((s) => ({ settings: { ...s.settings, theme } }));
          applyTheme(theme);
        },

        _hydrate: (state) => {
          set({ ...freshState(), ...(state as object) } as Partial<PulseStore> as PulseStore);
          set({ hydrated: true });
        },

        pushToast: (t) => toast(t),
        dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
      };
    },
    {
      name: "pulse-store",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): PulseState => ({
        version: s.version,
        createdAt: s.createdAt,
        tasks: s.tasks,
        projects: s.projects,
        focusSessions: s.focusSessions,
        progress: s.progress,
        settings: s.settings,
      }),
      onRehydrateStorage: () => (state, error) => {
        // validate what came back; a corrupted store is replaced, safely
        if (error) {
          try {
            localStorage.removeItem("pulse-store");
          } catch {}
        }
        const raw = localStorage.getItem("pulse-store");
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as { state?: unknown };
            const valid = pulseStateSchema.safeParse(parsed.state);
            if (valid.success && state) {
              state._hydrate(valid.data);
              return;
            }
            localStorage.removeItem("pulse-store");
          } catch {
            localStorage.removeItem("pulse-store");
          }
        }
        usePulseStore.setState({ hydrated: true });
      },
    },
  ),
);

export function applyTheme(theme: ThemeSetting) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

/* keep the theme in step with the system when set to system */
if (typeof window !== "undefined" && window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const theme = usePulseStore.getState().settings.theme;
    if (theme === "system") applyTheme("system");
  });
}

/* ------------------------------------------------------------------ */
/*  Shaping helpers shared by views                                    */
/* ------------------------------------------------------------------ */

const PRIORITY_ORDER: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export function sortForMonth(task: Task[]): Task[] {
  return task.sort((a, b) => (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) || a.order - b.order);
}

export function bucketKeyFor(task: Task): string {
  return task.dueDate ?? "someday";
}

export function dueLabel(dueDate: string | null): string {
  if (!dueDate) return "Someday";
  const diff = Math.round((parseDate(dueDate).getTime() - parseDate(todayKey()).getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `Overdue ${-diff}d`;
  return formatDay(dueDate);
}

function formatDay(key: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" }).format(parseDate(key));
}
