import { useMemo } from "react";
import { Panel, EmptyHint } from "@/components/dashboard/Panel";
import { LineChart, BarsChart, BarListChart, ProgressTrack } from "@/components/charts/charts";
import { usePulseStore } from "@/store/usePulseStore";
import {
  completionsByDay,
  focusMinutesByDay,
  completedTasksSorted,
  openTasks,
  priorityDistribution,
  weeklyTrend,
  personalBests,
  completionsTotal,
} from "@/lib/analytics";
import { humanDue, isOverdue, minutesLabel, relativeDayLabel, formatHour, dateKey } from "@/lib/dates";
import { PRIORITY_META } from "@/types";
import { cn } from "@/lib/utils";

/** Its question: what does the record say I did? The truth, plainly. */
export function AnalyticsView() {
  const tasks = usePulseStore((s) => s.tasks);
  const sessions = usePulseStore((s) => s.focusSessions);
  const projects = usePulseStore((s) => s.projects);

  const now = new Date();
  const open = useMemo(() => openTasks(tasks), [tasks]);
  const completed = useMemo(() => completedTasksSorted(tasks), [tasks]);

  const month = useMemo(() => completionsByDay(tasks, 30, now), [tasks, now]);
  const week = useMemo(() => completionsByDay(tasks, 7, now), [tasks, now]);
  const focus30 = useMemo(() => focusMinutesByDay(sessions, 30, now), [sessions, now]);
  const trend = useMemo(() => weeklyTrend(tasks, 4, now), [tasks, now]);
  const dist = useMemo(() => priorityDistribution(tasks), [tasks]);
  const bests = useMemo(() => personalBests(tasks, sessions), [tasks, sessions]);
  const total = useMemo(() => completionsTotal(tasks), [tasks]);

  const totalFocus = sessions.filter((s) => s.completed).reduce((sum, s) => sum + s.minutes, 0);
  const focusRatio = useMemo(() => {
    const done = focus30.filter((d) => d.completed > 0).length;
    return done / 30;
  }, [focus30]);

  const byProject = useMemo(() => {
    const rows = projects.map((p) => ({
      label: p.name,
      value: tasks.filter((t) => t.projectId === p.id && t.completedAt).length,
    }));
    rows.push({ label: "No project", value: tasks.filter((t) => t.projectId === null && t.completedAt).length });
    return rows.filter((r) => r.value > 0);
  }, [projects, tasks]);

  const oldestOpen = useMemo(() => {
    const openDated = open.filter((t) => t.dueDate !== null).sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
    return openDated[0] ?? null;
  }, [open]);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-[24px] font-semibold tracking-[-0.01em]">Analytics</h1>
        <p className="mt-1.5 max-w-[64ch] text-[14px] text-muted">
          {total > 0 ? (
            <>
              {total} task{total === 1 ? "" : "s"} completed since you started{formatHour(totalFocus) !== "0 min" ? `, ${formatHour(totalFocus)} of focused time` : ""}
              {bests.busiestWeekday ? `. ${bests.busiestWeekday.label}s are your busiest day.` : "."}
            </>
          ) : (
            <>Nothing on the record yet — complete a task and this page starts filling in. Sample tasks do not count until you make them real.</>
          )}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        {/* Row A: the main line + weeklybars 9 / 3 */}
        <Panel title="Completions · last 30 days" className="md:col-span-9">
          <LineChart points={month.map((d) => ({ label: d.label, value: d.completed }))} height={196} ariaLabel="Tasks completed per day over the last 30 days" />
        </Panel>
        <Panel title="Week by week" className="md:col-span-3">
          <BarsChart points={trend.map((w) => ({ label: w.label.split(" ")[0]!, value: w.completed }))} height={196} valueSuffix="" />
          {trend[3] && trend[0] ? (
            <p className="mt-2 text-[12px] text-muted">
              {trend[3].completed >= trend[0].completed ? "Recent weeks hold the pace." : "A quieter stretch of late."} Each bar is one week.
            </p>
          ) : null}
        </Panel>

        {/* Row B 6 / 3 / 3 */}
        <Panel title="Focused minutes · last 30 days" className="md:col-span-6">
          {sessions.length === 0 ? (
            <EmptyHint>No focus sessions yet. Twenty minutes in the timer will draw the first bar here.</EmptyHint>
          ) : (
            <>
              <LineChart points={focus30.map((d) => ({ label: d.label, value: d.completed }))} height={150} ariaLabel="Focused minutes per day over the last 30 days" />
              <div className="mt-3 max-w-[300px]">
                <ProgressTrack
                  value={Math.round(focusRatio * 30)}
                  max={30}
                  labelStart={
                    <span className="num">{Math.round(focusRatio * 30)} of 30 days</span>
                  }
                  labelEnd={<span>with focus time</span>}
                />
              </div>
            </>
          )}
        </Panel>
        <Panel title="This week's rhythm" className="md:col-span-3">
          {week.every((d) => d.completed === 0) ? (
            <EmptyHint>A quiet week. Complete a task to give the bars something to show.</EmptyHint>
          ) : (
            <BarsChart points={week.map((d) => ({ label: d.label, value: d.completed }))} height={150} />
          )}
        </Panel>
        <Panel title="The open table" className="md:col-span-3">
          <BarListChart
            rows={dist
              .filter((d) => d.count > 0 || d.priority === "medium" || d.priority === "high")
              .map((d) => ({ label: `${PRIORITY_META[d.priority].label}`, value: d.count }))}
          />
          {oldestOpen && isOverdue(oldestOpen.dueDate) ? (
            <p className="mt-3 text-[12.5px] text-pill-negative-ink">
              Oldest dated task is “{oldestOpen.title}” — {humanDue(oldestOpen.dueDate!).toLowerCase()}.
            </p>
          ) : oldestOpen ? (
            <p className="mt-3 text-[12.5px] text-muted">Nearest date on the table: “{oldestOpen.title}”, {humanDue(oldestOpen.dueDate!).toLowerCase()}.</p>
          ) : (
            <p className="mt-3 text-[12.5px] text-muted">Nothing dated ahead.</p>
          )}
        </Panel>

        {/* Row C 6 / 3 / 3 */}
        <Panel title="Completed · newest first" className="md:col-span-6">
          {completed.length === 0 ? (
            <EmptyHint>Nothing completed yet. The first one lands here with its date and XP.</EmptyHint>
          ) : (
            <div className="flex flex-col">
              {completed.slice(0, 7).map((t) => (
                <div key={t.id} className="flex items-baseline justify-between gap-3 border-b border-rule py-2 last:border-b-0">
                  <span className="truncate text-[13.5px] text-ink">{t.title}</span>
                  <span className="num shrink-0 text-[12px] text-muted">{relativeDayLabel(dateKey(new Date(t.completedAt!)), now).toLowerCase()}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Where work lands" className="md:col-span-3">
          {byProject.length === 0 ? (
            <EmptyHint>Completed tasks grouped by project will show here.</EmptyHint>
          ) : (
            <BarListChart rows={byProject} formatValue={(v) => `${v}`} />
          )}
        </Panel>

        <Panel title="Personal bests" className="md:col-span-3">
          <BestRow label="Most finished in a day" value={bests.bestDay ? `${bests.bestDay.count} — ${relativeDayLabel(bests.bestDay.date, now).toLowerCase()}` : "—"} />
          <BestRow label="Deepest day of focus" value={bests.bestFocusDay ? minutesLabel(bests.bestFocusDay.minutes) : "—"} />
          <BestRow label="Favourite weekday" value={bests.busiestWeekday ? `${bests.busiestWeekday.label}s` : "—"} />
          <BestRow label="Focused in total" value={formatHour(totalFocus)} />
        </Panel>
      </div>
    </div>
  );
}

function BestRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-rule py-2 last:border-b-0">
      <span className="text-[13px] text-muted">{label}</span>
      <span className={cn("max-w-[55%] truncate text-right text-[13.5px] font-medium text-ink")}>{value}</span>
    </div>
  );
}
