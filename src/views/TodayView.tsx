import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Timer } from "lucide-react";
import { Panel, EmptyHint } from "@/components/dashboard/Panel";
import { TaskRow } from "@/components/tasks/TaskRow";
import { QuickAdd } from "@/components/tasks/QuickAdd";
import { RingChart, BarListChart } from "@/components/charts/charts";
import { Button } from "@/components/ui/button";
import { PriorityPill } from "@/components/ui/priority-pill";
import { usePulseStore } from "@/store/usePulseStore";
import { humanDue, dateKey, todayKey, isOverdue, parseDate } from "@/lib/dates";
import { challengeProgress, challengesForDate, missionOf, nextThreeOf } from "@/lib/gamify";
import { completionsByDay, todayStats, completionsThisWeek } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";
import type { TaskRowMenuActions } from "@/components/tasks/TaskRow";

const QUOTES = [
  "Small strokes fell great oaks.",
  "Two minutes of motion beats an hour of planning.",
  "The pace is the promise.",
  "Done is a form of self-respect.",
  "Momentum thrives on the next small step.",
];

function greetingByHour(h: number): string {
  if (h < 5) return "Quiet night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** The overview. Its question: what should I do next? */
export function TodayView({ menu, toggleFocus }: { menu: TaskRowMenuActions; toggleFocus: (taskId?: string | null) => void }) {
  const tasks = usePulseStore((s) => s.tasks);
  const name = usePulseStore((s) => s.settings.name);
  const focusMin = usePulseStore((s) => s.settings.focusMinutes);
  const toggleTask = usePulseStore((s) => s.toggleTask);
  const completeTask = usePulseStore((s) => s.completeTask);
  const rescheduleTask = usePulseStore((s) => s.rescheduleTask);

  const now = new Date();
  const hour = now.getHours();
  const mission = useMemo(() => missionOf(tasks, now), [tasks]);
  const topThree = useMemo(() => nextThreeOf(tasks, now, mission?.id), [tasks, mission]);
  const stats = useMemo(() => todayStats(tasks, now), [tasks]);
  const week = useMemo(() => completionsByDay(tasks, 7, now), [tasks]);
  const weekTotal = useMemo(() => completionsThisWeek(tasks, now), [tasks]);
  const challenges = useMemo(() => {
    const ch = challengesForDate(todayKey());
    return ch.map((def) => challengeProgress(def, tasks, [], { missionId: mission?.id ?? null }));
  }, [tasks, mission]);
  const bestDay = useMemo(() => {
    let best: { label: string; value: number } | null = null;
    for (const d of week) if (d.completed > (best?.value ?? -1)) best = { label: d.label, value: d.completed };
    return best;
  }, [week]);

  const [quickOpen, setQuickOpen] = useState(false);
  const displayName = name.trim();

  const dueBuckets = useMemo(() => buildDeadlineRows(tasks), [tasks]);
  const quote = QUOTES[new Date().getDate() % QUOTES.length]!;

  const greetName = displayName ? `, ${displayName}` : "";

  return (
    <div>
      {/* title row: the greeting is the h1; right side holds the two real actions */}
      <header className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="min-w-0">
          <h1 className="greeting">
            {greetingByHour(hour)}
            {greetName}
          </h1>
          <p className="mt-2.5 max-w-[56ch] text-[14px] leading-relaxed text-muted">
            {longDate(now)} · {stats.completed} finished today{stats.dueToday > 0 ? `, ${stats.dueToday} on today’s list` : ""}
            {stats.overdue > 0 ? (
              <>
                {" · "}
                <span className="font-medium text-pill-negative-ink">{stats.overdue} overdue</span>
              </>
            ) : null}
            {" · the day’s "}
            <em className="font-serif text-[15.5px] not-italic text-ink">
              {(mission ?? topThree[0]) ? (mission ?? topThree[0]!).title : "page is clear"}
            </em>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => toggleFocus(mission?.id)} aria-label="Start a focus session">
            <Timer size={15} strokeWidth={1.75} /> Focus {focusMin}′
          </Button>
          <Button variant="primary" onClick={() => setQuickOpen((o) => !o)} aria-expanded={quickOpen}>
            Add a task
          </Button>
        </div>
      </header>

      <AnimatePresence>
        {quickOpen ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="mb-6 overflow-hidden"
          >
            <QuickAdd defaultDue="today" autoFocus placeholder="Today's next move… ⏎" />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* row A: 9 + 3 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <MissionPanel
          task={mission}
          focusMinutes={focusMin}
          onFocus={() => toggleFocus(mission?.id)}
          onComplete={() => mission && completeTask(mission.id)}
          onReschedule={(id, date) => rescheduleTask(id, date)}
          onEdit={(t) => menu.onEdit?.(t)}
          quote={quote}
        />
        <Panel title="The pulse" className="md:col-span-3">
          <div className="flex items-center gap-4">
            <RingChart
              pct={stats.dueToday + stats.overdue === 0 ? (stats.completed > 0 ? 1 : 0) : stats.completed / (stats.dueToday + stats.overdue)}
              size={96}
              stroke={7}
              center={<span className="num text-[19px] font-medium text-ink">{stats.completed}</span>}
              sub={stats.overdue + stats.open > 0 ? `of ${stats.dueToday + stats.overdue}` : "all clear"}
            />
          </div>
          <div className="mt-4 flex flex-col gap-2 text-[12.5px] text-muted">
            {stats.overdue > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pill-negative-bg px-2.5 py-1 text-pill-negative-ink self-start">
                {stats.overdue} overdue · carried kindly
              </span>
            ) : (
              <span className="self-start rounded-full bg-pill-positive-bg px-2.5 py-1 text-pill-positive-ink">Nothing overdue</span>
            )}
            {stats.open === 0 && stats.dueToday === 0 ? <EmptyHint>Nothing scheduled today. Freedom or a new task — both welcome.</EmptyHint> : null}
          </div>
        </Panel>

        {/* row B: 6 + 3 + 3 */}
        <Panel
          title="The next three"
          className="md:col-span-6"
          contentClassName="flex flex-col"
        >
          {topThree.length === 0 ? (
            <EmptyHint>No open tasks before you. Add the next one — or enjoy the space.</EmptyHint>
          ) : (
            <div className="-mx-1 flex flex-col">
              {topThree.map((t) => (
                <TaskRow key={t.id} task={t} compact onToggle={(task) => toggleTask(task.id)} onOpen={(task) => menu.onEdit?.(task)} menu={menu} />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Today's challenges" className="md:col-span-3">
          <div className="flex flex-col gap-3.5">
            {challenges.map((c) => (
              <div key={c.def.id} className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                    c.done ? "bg-accent text-accent-ink" : "bg-inset text-muted",
                  )}
                >
                  <CheckCircle2 size={12} strokeWidth={2.5} />
                </span>
                <div className="min-w-0">
                  <p className={cn("text-[13.5px] font-medium", c.done ? "text-muted line-through decoration-1" : "text-ink")}>{c.def.label}</p>
                  <p className="text-[12px] leading-snug text-muted">+{c.def.xp} XP · {c.done ? "earned" : c.def.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Coming up"
          className="md:col-span-6 self-start"
          action={
            <button type="button" onClick={() => (window.location.hash = "/tasks")} className="flex items-center gap-1 text-[12.5px] text-muted hover:text-ink">
              All tasks <ArrowRight size={12} strokeWidth={1.75} />
            </button>
          }
        >
          {dueBuckets.length === 0 ? (
            <EmptyHint>No dated tasks ahead. The week is an open page.</EmptyHint>
          ) : (
            <>
              <div className="-mx-1 flex flex-col">
                {dueBuckets.map(({ task: t }) => (
                  <TaskRow key={t.id} task={t} compact onToggle={(task) => toggleTask(task.id)} onOpen={(task) => menu.onEdit?.(task)} menu={menu} />
                ))}
              </div>
              <p className="mt-1 text-[12.5px] text-muted">
                {stats.overdue > 0
                  ? "Overdue rows sit at the top; mark one off and the list shrinks behind you."
                  : "Nearest dates first · six rows at a time"}
              </p>
            </>
          )}
        </Panel>

        <Panel title="This week's pulse" className="md:col-span-3">
          <p className="mb-3 text-[13px] text-ink">
            <span className="num font-medium">{weekTotal}</span> finished · Mon to today
          </p>
          <BarListChart
            rows={week
              .slice()
              .reverse()
              .map((d) => ({ label: d.label, value: d.completed }))}
          />
          {bestDay && bestDay.value > 0 ? (
            <p className="mt-3 text-[12.5px] text-muted">
              Best day {bestDay.label.toLowerCase()} ({bestDay.value}){bestDay.value >= 3 ? " — a good rhythm." : "."}
            </p>
          ) : (
            <p className="mt-3 text-[12.5px] text-muted">Quiet so far — the week is young.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const MISSION_QUOTE_STYLES = "font-serif italic text-[15px] leading-relaxed text-muted";

function MissionPanel({
  task,
  focusMinutes,
  onFocus,
  onComplete,
  onReschedule,
  onEdit,
  quote,
}: {
  task: Task | null;
  focusMinutes: number;
  onFocus: () => void;
  onComplete: () => void;
  onReschedule: (id: string, date: string | null) => void;
  onEdit: (task: Task) => void;
  quote: string;
}) {
  return (
    <Panel className="md:col-span-9" title={task ? undefined : "Daily mission"}>
      {task ? (
        <div className="flex flex-col gap-0">
          <p className="-mt-1 mb-1 text-[13.5px] font-medium text-muted">Daily mission</p>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="font-serif text-[27px] leading-[1.15] tracking-[-0.005em] text-ink">{task.title}</h2>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <PriorityPill priority={task.priority} />
            {task.dueDate ? (
              <span className={cn("num text-[12.5px]", isOverdue(task.dueDate) ? "text-pill-negative-ink" : "text-muted")}>
                {humanDue(task.dueDate)}
              </span>
            ) : null}
            {task.estimateMin !== null ? <span className="num text-[12.5px] text-muted">{task.estimateMin} min</span> : null}
            {task.subtasks.length > 0 ? (
              <span className="num text-[12.5px] text-muted">
                {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length} steps
              </span>
            ) : null}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button variant="primary" size="md" onClick={onComplete} aria-label="Complete the daily mission">
              <CheckCircle2 size={15} strokeWidth={2} /> Mark done
            </Button>
            <Button variant="secondary" size="md" onClick={onFocus}>
              <Timer size={15} strokeWidth={1.75} /> Focus {focusMinutes}′
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => onReschedule(task.id, dateKey(new Date(Date.now() + 86_400_000)))}
            >
              Not today
            </Button>
            <Button variant="ghost" size="md" onClick={() => onEdit(task)}>
              Details
            </Button>
          </div>
          <p className={cn(MISSION_QUOTE_STYLES, "mt-5 max-w-[46ch]")}>{quote}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="-mt-1 mb-1 text-[13.5px] font-medium text-muted">Daily mission</p>
          <h2 className="font-serif text-[27px] leading-tight text-ink">A clear page</h2>
          <p className="max-w-[44ch] text-[13.5px] leading-relaxed text-muted">
            No open task is older than a plan. Add the one thing that would make today a good day.
          </p>
          <div className="mt-1">
            <QuickAdd defaultDue="today" placeholder="What would make today count?" />
          </div>
        </div>
      )}
    </Panel>
  );
}

function longDate(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

/** Upcoming dated rows: overdue first, then dated ascending — capped at six. */
function buildDeadlineRows(tasks: Task[]): { task: Task; bucket: string }[] {
  const today = todayKey();
  const open = tasks.filter((t) => !t.completedAt && t.dueDate !== null);
  const overdue = open
    .filter((t) => t.dueDate! < today)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
  const upcoming = open
    .filter((t) => t.dueDate! >= today && t.dueDate !== today)
    .sort((a, b) => (parseDate(a.dueDate!).getTime() - parseDate(b.dueDate!).getTime()))
    .slice(0, Math.max(0, 6 - overdue.length));
  return [...overdue.map((t) => ({ task: t, bucket: `${t.dueDate}` })), ...upcoming.map((t) => ({ task: t, bucket: `${t.dueDate}` }))];
}
