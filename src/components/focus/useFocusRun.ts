import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { usePulseStore } from "@/store/usePulseStore";

export type Phase = "focus" | "break";

/** The live Pomodoro run, persisted so a refresh never loses the timer.
 *  `endsAt` is null while paused; `remainingS` caches the paused remainder. */
interface FocusRun {
  phase: Phase;
  endsAt: number | null;
  remainingS: number;
  plannedMinutes: number;
  taskId: string | null;
  running: boolean;
  startedAt: number | null;
  start: (taskId: string | null, minutes: number, phase?: Phase) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  /** clears everything without logging */
  clear: () => void;
  /** swap to the complementary phase */
  flip: (minutes: number) => void;
}

const IDLE = { phase: "focus" as Phase, endsAt: null, remainingS: 0, plannedMinutes: 0, taskId: null, running: false, startedAt: null };

export const useFocusRun = create<FocusRun>()(
  persist(
    (set, get) => ({
      ...IDLE,
      start: (taskId, minutes, phase = "focus") =>
        set({ phase, endsAt: Date.now() + minutes * 60_000, remainingS: minutes * 60, plannedMinutes: minutes, taskId, running: true, startedAt: Date.now() }),
      pause: () => {
        const { endsAt } = get();
        if (endsAt === null) return;
        set({ endsAt: null, running: false, remainingS: Math.max(0, Math.round((endsAt - Date.now()) / 1000)) });
      },
      resume: () => {
        const { remainingS, endsAt } = get();
        if (endsAt !== null) return;
        set({ endsAt: Date.now() + remainingS * 1000, running: true });
      },
      reset: () => {
        const { plannedMinutes, taskId, phase } = get();
        if (!plannedMinutes) {
          get().clear();
          return;
        }
        set({ endsAt: Date.now() + plannedMinutes * 60_000, remainingS: plannedMinutes * 60, running: true, phase, taskId, startedAt: Date.now() });
      },
      clear: () => set({ ...IDLE }),
      flip: (minutes) => {
        const { phase } = get();
        get().start(get().taskId, minutes, phase === "focus" ? "break" : "focus");
      },
    }),
    {
      name: "pulse-focus-run",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        phase: s.phase,
        endsAt: s.endsAt,
        remainingS: s.remainingS,
        plannedMinutes: s.plannedMinutes,
        taskId: s.taskId,
        running: s.running,
        startedAt: s.startedAt,
      }),
    },
  ),
);

/** Remaining seconds of the live run (ticks with the caller). */
export function remainingSeconds(run: { endsAt: number | null; remainingS: number; running: boolean }): number {
  if (run.endsAt !== null && run.running) {
    return Math.max(0, Math.round((run.endsAt - Date.now()) / 1000));
  }
  return run.remainingS;
}

/** Session minutes that get logged when a focus phase finishes naturally. */
export function plannedOfRun(run: { phase: Phase; plannedMinutes: number; taskId: string | null }) {
  const store = usePulseStore.getState();
  return run.phase === "focus" ? run.plannedMinutes : store.settings.breakMinutes;
}
