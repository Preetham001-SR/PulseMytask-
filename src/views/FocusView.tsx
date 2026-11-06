import { useMemo } from "react";
import { Play, Timer } from "lucide-react";
import { Panel, EmptyHint } from "@/components/dashboard/Panel";
import { Button } from "@/components/ui/button";
import { BarsChart, RingChart } from "@/components/charts/charts";
import { usePulseStore } from "@/store/usePulseStore";
import { useFocusRun } from "@/components/focus/useFocusRun";
import { formatHour, minutesLabel, relativeDayLabel, dateKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** Focus history and rhythm. Its question: how deep do I actually go? */
export function FocusView({ toggleFocus }: { toggleFocus: (taskId?: string | null) => void }) {
  const tasks = usePulseStore((s) => s.tasks);
  const sessions = usePulseStore((s) => s.focusSessions);
  const settings = usePulseStore((s) => s.settings);
  const run = useFocusRun();

  const now = new Date();
  const openTasks = useMemo(() => tasks.filter((t) => t.completedAt === null).slice(0, 30), [tasks]);

  const last14 = useMemo(() => {
    const days: { label: string; value: number; key: string }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = dateKey(d);
      const value = sessions.filter((s) => dateKey(new Date(s.startedAt)) === key).reduce((sum, s) => sum + s.minutes, 0);
      days.push({ label: d.toLocaleDateString(undefined, { weekday: "narrow" }), value, key });
    }
    return days;
  }, [sessions, now]);

  const weekStartKey = useMemo(() => {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return dateKey(weekStart);
  }, [now]);
  const weekMinutes = useMemo(() => sessions.filter((s) => dateKey(new Date(s.startedAt)) >= weekStartKey).reduce((sum, s) => sum + s.minutes, 0), [sessions, weekStartKey]);
  const weekSessions = useMemo(() => sessions.filter((s) => dateKey(new Date(s.startedAt)) >= weekStartKey).length, [sessions, weekStartKey]);

  const completedSessions = sessions.filter((s) => s.completed);
  const completionRate = sessions.length > 0 ? completedSessions.length / sessions.length : 0;
  const bestDay = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const s of sessions) byDay.set(dateKey(new Date(s.startedAt)), (byDay.get(dateKey(new Date(s.startedAt))) ?? 0) + s.minutes);
    let best: { key: string; value: number } | null = null;
    for (const [key, value] of byDay) if (!best || value > best.value) best = { key, value };
    return best;
  }, [sessions]);

  const recent = useMemo(() => sessions.slice(-8).reverse(), [sessions]);
  const longestRun = sessions.reduce((m, s) => Math.max(m, s.minutes), 0);

  const resumeText = run.plannedMinutes > 0 ? (run.running ? "A timer is running — open it" : `A ${run.phase === "focus" ? "focus" : "break"} timer is paused — resume`) : null;

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.01em]">Focus</h1>
          <p className="mt-1.5 max-w-[62ch] text-[14px] text-muted">
            {weekMinutes > 0 ? (
              <>
                <span className="num font-medium text-ink">{formatHour(weekMinutes)}</span> underwater this week · {weekSessions} sessions
              </>
            ) : (
              "No focus time yet this week — one session changes that."
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {resumeText ? (
            <Button variant="primary" onClick={() => toggleFocus(null)}>
              <Timer size={15} strokeWidth={1.75} /> {resumeText}
            </Button>
          ) : null}
          <Button variant={resumeText ? "secondary" : "primary"} onClick={() => toggleFocus(openTasks[0]?.id ?? null)}>
            <Play size={15} strokeWidth={2} /> Start {settings.focusMinutes}′{openTasks[0] ? " · next task" : ""}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <Panel title="Two weeks of deep work" className="md:col-span-9">
          <div className="flex flex-wrap items-center gap-x-10 gap-y-5">
            <RingChart
              pct={completionRate}
              size={104}
              stroke={8}
              center={<span className="num text-[20px] font-medium text-ink">{Math.round(completionRate * 100)}%</span>}
              sub="finished"
            />
            <div className="min-w-0 flex-1">
              <MinutesBars days={last14} />
              <p className="mt-2.5 text-[12px] text-muted">
                Bars are focused minutes per day
                {bestDay ? `, best was ${relativeDayLabel(bestDay.key, now).toLowerCase()} with ${formatHour(bestDay.value)}` : ""}
                . Longest single session: {longestRun > 0 ? `${formatHour(longestRun)}` : "—"}.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="At a glance" className="md:col-span-3">
          <StatLine label="Sessions this week" value={String(weekSessions)} />
          <StatLine label="Time this week" value={formatHour(weekMinutes)} />
          <StatLine label="Longest session" value={longestRun > 0 ? formatHour(longestRun) : "—"} />
          <StatLine label="Sessions logged" value={String(sessions.length)} />
        </Panel>

        <Panel title="Recent sessions" className="md:col-span-7">
          {recent.length === 0 ? (
            <EmptyHint className="max-w-[480px]">
              No sessions yet. Twenty-five minutes with a single task is enough to start — the overlay opens with the timer running.
            </EmptyHint>
          ) : (
            <div className="flex flex-col">
              {recent.map((s, i) => {
                const task = tasks.find((t) => t.id === s.taskId) ?? null;
                return (
                  <div key={`${s.startedAt}-${i}`} className="flex items-center justify-between gap-3 border-b border-rule py-2.5 last:border-b-0">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-ink">{task ? task.title : "Unattached session"}</p>
                      <p className="text-[12px] text-muted">
                        {relativeDayLabel(dateKey(new Date(s.startedAt)), now)} ·{" "}
                        {new Date(s.startedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        {s.completed ? "" : " · ended early"}
                      </p>
                    </div>
                    <span className={cn("num shrink-0 text-[13px]", s.completed ? "text-ink" : "text-faint")}>{minutesLabel(s.minutes)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Send to the timer" className="md:col-span-5">
          {openTasks.length === 0 ? (
            <EmptyHint>No open tasks to attach. The timer works unattached too — start one from the header.</EmptyHint>
          ) : (
            <div className="flex flex-col">
              {openTasks.slice(0, 6).map((t) => (
                <div key={t.id} className="group flex items-center justify-between gap-3 border-b border-rule py-2 last:border-b-0">
                  <p className="truncate text-[13.5px] text-ink">{t.title}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleFocus(t.id)}
                    aria-label={`Start a focus session for ${t.title}`}
                  >
                    <Play size={13} strokeWidth={2} /> Start
                  </Button>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-[12px] text-faint">Each finished session earns +12 XP. Breaks are {settings.breakMinutes} minutes.</p>
        </Panel>
      </div>
    </div>
  );
}

function MinutesBars({ days }: { days: { label: string; value: number; key: string }[] }) {
  const todayKey = days[days.length - 1]?.key;
  return (
    <div>
      <BarsChart points={days.map((d) => ({ label: "", value: d.value }))} height={96} />
      <div className="mt-1.5 flex justify-between text-[11px] text-faint">
        {days.map((d) => (
          <span key={d.key} className={cn("w-4 text-center", d.key === todayKey && "font-medium text-muted")}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-rule py-2 last:border-b-0">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="num text-[15px] font-medium text-ink">{value}</span>
    </div>
  );
}
