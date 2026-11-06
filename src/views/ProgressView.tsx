import { useMemo } from "react";
import { Flame, Trophy } from "lucide-react";
import { Panel, EmptyHint } from "@/components/dashboard/Panel";
import { ProgressTrack, RingChart } from "@/components/charts/charts";
import { usePulseStore } from "@/store/usePulseStore";
import { computeStreak, ACHIEVEMENT_DEFS } from "@/lib/gamify";
import { formatHour, dateKey, todayKey } from "@/lib/dates";
import { completionsThisWeek, completionsTotal, MILESTONE_TARGET, weekKey } from "@/lib/analytics";
import { levelTitle, xpProgress } from "@/lib/xp";
import { cn } from "@/lib/utils";

const MILESTONE_XP = 80;

/** Its question: how far have I come? Only earned things, plainly shown. */
export function ProgressView() {
  const tasks = usePulseStore((s) => s.tasks);
  const sessions = usePulseStore((s) => s.focusSessions);
  const xp = usePulseStore((s) => s.progress.xp);
  const earnedMap = usePulseStore((s) => s.progress.achievements);
  const milestoneWeek = usePulseStore((s) => s.progress.milestoneWeek);

  const progress = useMemo(() => xpProgress(xp), [xp]);
  const streak = useMemo(() => computeStreak(tasks, sessions), [tasks, sessions]);
  const achievedIds = useMemo(() => new Set(Object.keys(earnedMap)), [earnedMap]);
  const weekCompletions = useMemo(() => completionsThisWeek(tasks), [tasks]);
  const currentWeekKey = weekKey();
  const weekMilestone = milestoneWeek === currentWeekKey ? 1 : 0;
  const totalCompleted = useMemo(() => completionsTotal(tasks), [tasks]);
  const focusTotal = useMemo(() => sessions.reduce((sum, s) => (s.completed ? sum + s.minutes : sum), 0), [sessions]);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-[24px] font-semibold tracking-[-0.01em]">Progress</h1>
        <p className="mt-1.5 max-w-[62ch] text-[14px] text-muted">
          Everything here is computed from what you actually did — the XP, the badges, the streak. Nothing given, nothing invented.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <Panel title="Your level" className="md:col-span-9">
          <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
            <RingChart
              pct={progress.pct}
              size={140}
              stroke={9}
              center={
                <>
                  <span className="num text-[34px] font-medium leading-none text-ink">{progress.level}</span>
                  <span className="mt-1 text-[11px] text-muted">level</span>
                </>
              }
            />
            <div className="min-w-[240px] flex-1">
              <p className="font-serif text-[24px] text-ink">{levelTitle(progress.level)}</p>
              <p className="mt-1 num text-[13px] text-muted">{xp} XP so far</p>
              <div className="mt-4 max-w-[420px]">
                <ProgressTrack
                  value={xp}
                  max={progress.toNext !== null ? xp + progress.toNext : xp}
                  labelStart={<span className="num">Level {progress.level}</span>}
                  labelEnd={
                    progress.toNext !== null ? (
                      <span className="num">{progress.toNext} XP to level {progress.level + 1}</span>
                    ) : (
                      <span>the last level</span>
                    )
                  }
                />
              </div>
            </div>
            <StreakBadge current={streak.current} best={streak.best} />
          </div>
        </Panel>

        <Panel title="The day's XP" className="md:col-span-3">
          <div className="flex flex-col">
            <ShortRow label="Today's completions" value={String(tasks.filter((t) => t.completedAt && dateKey(new Date(t.completedAt)) === todayKey()).length)} />
            <ShortRow label="Tasks ever completed" value={String(totalCompleted)} />
            <ShortRow label="Focus sessions finished" value={String(sessions.filter((s) => s.completed).length)} />
            <ShortRow label="Focused in total" value={formatHour(focusTotal)} />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="col-span-full h-1" />

        <Panel title="Badges" className="md:col-span-8">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            {ACHIEVEMENT_DEFS.map((def) => {
              const done = achievedIds.has(def.id);
              return (
                <div key={def.id} className={cn("flex flex-col gap-1", !done && "opacity-55")}>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                        done ? "bg-accent text-accent-ink" : "border border-edge bg-inset text-faint",
                      )}
                    >
                      <Trophy size={13} strokeWidth={1.75} />
                    </span>
                    <p className={cn("text-[13.5px] font-medium", done ? "text-ink" : "text-muted")}>{def.name}</p>
                  </div>
                  <p className="text-[12px] leading-snug text-muted">{def.description}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-5 text-[12px] text-faint">
            {achievedIds.size} of {ACHIEVEMENT_DEFS.length} earned — badges are retroactive: they arrive when the history says so.
          </p>
        </Panel>

        <Panel title="This week's milestone" className="md:col-span-4">
          {weekMilestone > 0 || weekCompletions > 0 ? (
            <>
              <p className="font-serif text-[24px] text-ink">
                <span className="num">{weekCompletions}</span> done this week
                {weekMilestone > 0 ? " — milestone banked" : ""}
              </p>
              <p className="mt-2 max-w-[38ch] text-[13.5px] leading-relaxed text-muted">
                Every {MILESTONE_TARGET} completions in a week banks a milestone worth {MILESTONE_XP} XP. The counter resets on Monday and never looks back.
              </p>
              <div className="mt-4 max-w-[300px]">
                <ProgressTrack
                  value={weekCompletions}
                  max={MILESTONE_TARGET}
                  labelStart={<span className="num">{weekMilestone} milestone{weekMilestone === 1 ? "" : "s"} this week</span>}                  labelEnd={<span className="num">target {MILESTONE_TARGET}</span>}
                />
              </div>
            </>
          ) : (
            <EmptyHint className="max-w-[300px]">
              Twenty-five completions in a week earns a milestone worth {MILESTONE_XP} XP. The count starts at zero each Monday.
            </EmptyHint>
          )}
        </Panel>
      </div>
    </div>
  );
}

function StreakBadge({ current, best }: { current: number; best: number }) {
  const active = current > 0;
  return (
    <div
      className="flex min-w-[170px] flex-col gap-1 rounded-2xl border border-edge bg-inset p-4"
      title={active ? "An active day — a relationship with your list, not a punishment for missing one" : "The streak waits to grow again"}
    >
      <div className="flex items-center gap-2">
        <Flame size={16} strokeWidth={1.75} className={active ? "text-accent-deep" : "text-faint"} />
        <span className="num text-[24px] font-medium text-ink">{current}</span>
        <span className="text-[12.5px] text-muted">day{current === 1 ? "" : "s"} running</span>
      </div>
      <p className="text-[12px] text-muted">Best so far: {best} day{best === 1 ? "" : "s"}</p>
    </div>
  );
}

function ShortRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-rule py-2 last:border-b-0">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="num text-[15px] font-medium text-ink">{value}</span>
    </div>
  );
}
