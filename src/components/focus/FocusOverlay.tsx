import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Keyboard, Pause, Play, RotateCcw, SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RingChart } from "@/components/charts/charts";
import { PulseMark } from "@/components/shell/PulseMark";
import { useFocusRun, remainingSeconds } from "./useFocusRun";
import { usePulseStore } from "@/store/usePulseStore";
import { useToasts } from "@/components/ui/toast";
import { useNow } from "@/hooks/useMeasureAndNow";
import { clockParts } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** The distraction-free Pomodoro. One task, one countdown, nothing else. */
export function FocusOverlay({ onExit, initialTaskId = null }: { onExit: () => void; initialTaskId?: string | null }) {
  const run = useFocusRun();
  const settings = usePulseStore((s) => s.settings);
  const tasks = usePulseStore((s) => s.tasks);
  const logSession = usePulseStore((s) => s.logFocusSession);
  const pushToast = useToasts((s) => s.push);
  const tick = useNow(250);
  const [expiryHandled, setExpiryHandled] = useState(false);

  const totalS = run.plannedMinutes * 60;
  // re-derive with each tick — the countdown never drifts from the wall clock
  const leftS = useMemo(() => remainingSeconds(run), [tick, run]);
  const expired = run.running && leftS <= 0;
  const { mm, ss } = clockParts(leftS || run.plannedMinutes * 60);
  const task = useMemo(
    () => tasks.find((t) => t.id === (run.plannedMinutes === 0 ? initialTaskId : run.taskId)) ?? null,
    [tasks, run.taskId, initialTaskId],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onExit();
      }
      if (e.key === " ") {
        e.preventDefault();
        if (useFocusRun.getState().running) useFocusRun.getState().pause();
        else useFocusRun.getState().resume();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  // expiry: log the session, then roll into the complementary phase
  useEffect(() => {
    if (!expired || expiryHandled) return;
    setExpiryHandled(true);
    if (run.phase === "focus") {
      logSession({ minutes: run.plannedMinutes, completed: true, taskId: run.taskId });
      pushToast({ kind: "xp", title: "Session complete", detail: `${run.plannedMinutes} focused minutes — take the break` });
      useFocusRun.getState().flip(Math.min(settings.breakMinutes, 30));
    } else {
      pushToast({ kind: "info", title: "Break finished", detail: "Ready for another round?" });
      useFocusRun.getState().flip(settings.focusMinutes);
    }
    setExpiryHandled(false);
  }, [expired, expiryHandled, run.phase, run.plannedMinutes, run.taskId, settings.breakMinutes, settings.focusMinutes, logSession, pushToast]);

  const paused = !run.running && run.plannedMinutes > 0;
  const idle = run.plannedMinutes === 0;

  const startHere = (minutes: number, phase: "focus" | "break") => {
    useFocusRun.getState().start(task?.id ?? null, minutes, phase);
    setExpiryHandled(false);
  };

  if (idle) {
    return (
      <IdleScreen
        focusMinutes={settings.focusMinutes}
        breakMinutes={settings.breakMinutes}
        onStart={startHere}
        onExit={onExit}
        taskTitle={task?.title ?? null}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-80 flex flex-col bg-surface" role="dialog" aria-modal="true" aria-label="Focus timer">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <PulseMark size={24} />
          <span className={cn("text-[13px]", run.phase === "focus" ? "text-muted" : "text-muted")}>
            {run.phase === "focus" ? "Focusing" : "On a break"}
            {paused ? " · paused" : ""}
          </span>
          <span className={cn("ml-1 h-1.5 w-1.5 rounded-full", run.running ? "heartbeat bg-accent-deep" : "bg-control")} aria-hidden />
        </div>
        <Button variant="ghost" size="sm" onClick={onExit} aria-label="Exit focus mode (Esc)">
          <X size={15} strokeWidth={1.75} /> Exit
        </Button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 pb-24">
        <div className="relative">
          <RingChart
            pct={totalS > 0 ? 1 - leftS / totalS : 0}
            size={268}
            stroke={6}
            center={
              <span className="num text-[64px] leading-none tracking-[-0.02em] text-ink" aria-live="off">
                {mm}:{ss}
              </span>
            }
          />
        </div>

        <div className="max-w-[420px] text-center">
          {task ? (
            <p className="text-[15px] font-medium text-ink">{task.title}</p>
          ) : (
            <p className="text-[15px] font-medium text-muted">No task attached — this time is yours</p>
          )}
          <p className="mt-1.5 text-[12.5px] text-muted">
            {run.plannedMinutes} minutes · started{" "}
            {run.startedAt ? new Date(run.startedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "—"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {run.running ? (
            <Button size="lg" onClick={() => useFocusRun.getState().pause()} aria-label="Pause (space)">
              <Pause size={16} strokeWidth={2} /> Pause
            </Button>
          ) : (
            <Button size="lg" variant="primary" onClick={() => useFocusRun.getState().resume()} aria-label="Resume (space)">
              <Play size={16} strokeWidth={2} /> Resume
            </Button>
          )}
          <Button size="lg" variant="ghost" onClick={() => useFocusRun.getState().reset()} aria-label="Restart this timer">
            <RotateCcw size={15} strokeWidth={1.75} /> Restart
          </Button>
          <Button
            size="lg"
            variant="ghost"
            onClick={() => {
              useFocusRun.getState().flip(run.phase === "focus" ? settings.breakMinutes : settings.focusMinutes);
              setExpiryHandled(false);
            }}
            aria-label="Skip to the next phase"
          >
            <SkipForward size={15} strokeWidth={1.75} /> Skip
          </Button>
        </div>

        <AnimatePresence>
          {expired ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[13px] text-muted" aria-live="polite">
              Rolling into the next phase…
            </motion.p>
          ) : null}
        </AnimatePresence>

        <p className="absolute bottom-6 text-[11.5px] text-faint">
          Space to pause or resume · Esc to exit · the timer keeps running if you leave
        </p>
      </div>
    </div>
  );
}

function IdleScreen({
  focusMinutes,
  breakMinutes,
  onStart,
  onExit,
  taskTitle,
}: {
  focusMinutes: number;
  breakMinutes: number;
  onStart: (m: number, phase: "focus" | "break") => void;
  onExit: () => void;
  taskTitle: string | null;
}) {
  return (
    <div className="fixed inset-0 z-80 flex flex-col bg-surface" role="dialog" aria-modal="true" aria-label="Focus mode">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <PulseMark size={24} />
          <span className="text-[13px] text-muted">Focus mode</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onExit} aria-label="Exit focus mode (Esc)">
          <X size={15} strokeWidth={1.75} /> Exit
        </Button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-7 px-6 text-center">
        <p className="font-serif text-[34px] leading-tight text-ink">Give one thing a quiet {focusMinutes}.</p>
        <p className="max-w-[400px] text-[14px] text-muted">
          {taskTitle ? "You had a task attached:" : "Attaching a task is optional — the timer works either way."}
          {taskTitle ? <span className="block font-medium text-ink">“{taskTitle}”</span> : null}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button size="lg" variant="primary" onClick={() => onStart(focusMinutes, "focus")}>
            Start {focusMinutes} minutes
          </Button>
          <Button size="lg" variant="secondary" onClick={() => onStart(50, "focus")}>
            <Keyboard size={15} strokeWidth={1.75} /> Deep 50
          </Button>
          <Button size="lg" variant="ghost" onClick={() => onStart(breakMinutes, "break")}>
            Just a break
          </Button>
        </div>
        <p className="text-[11.5px] text-faint">
          Sessions of {focusMinutes} or 50 minutes · breaks of {breakMinutes} · Esc exits · durations live in Settings
        </p>
      </div>
    </div>
  );
}
