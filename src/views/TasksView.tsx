import { useEffect, useMemo, useRef, useState } from "react";
import { Reorder } from "framer-motion";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuickAdd } from "@/components/tasks/QuickAdd";
import { StaticRow, SortableRow, type TaskRowMenuActions } from "@/components/tasks/TaskRow";
import { EmptyHint } from "@/components/dashboard/Panel";
import { usePulseStore } from "@/store/usePulseStore";
import { dateKey, humanDue, isOverdue, relativeDayLabel, todayKey, parseDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { CATEGORIES, PRIORITIES, PRIORITY_META, type Priority, type Task } from "@/types";

type Bucket = "inbox" | "today" | "upcoming" | "all" | "completed";
type Sort = "manual" | "due" | "priority" | "title" | "estimate";

const BUCKET_TITLES: Record<Bucket, string> = {
  inbox: "Inbox",
  today: "Today",
  upcoming: "Upcoming",
  all: "All tasks",
  completed: "Completed",
};

const PRIORITY_ORDER: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

/** Its question: which tasks are where, and which one is next? */
export function TasksView({ menu, searchRef }: { menu: TaskRowMenuActions; searchRef: { current: (() => void) | null } }) {
  const tasks = usePulseStore((s) => s.tasks);
  const projects = usePulseStore((s) => s.projects);
  const toggleTask = usePulseStore((s) => s.toggleTask);
  const reorderTasks = usePulseStore((s) => s.reorderTasks);

  const [bucket, setBucket] = useState<Bucket>("today");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("manual");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current = () => {
      setBucket("all");
      window.setTimeout(() => searchInputRef.current?.focus(), 30);
    };
    return () => {
      searchRef.current = null;
    };
  }, [searchRef]);

  const counts = useMemo(() => {
    const today = todayKey();
    return {
      inbox: tasks.filter((t) => !t.completedAt && t.dueDate === null).length,
      today: tasks.filter((t) => !t.completedAt && (t.dueDate === today || (t.dueDate !== null && t.dueDate < today))).length,
      upcoming: tasks.filter((t) => !t.completedAt && t.dueDate !== null && t.dueDate > today).length,
      all: tasks.length,
      completed: tasks.filter((t) => t.completedAt).length,
    };
  }, [tasks]);

  const toOpen = (t: Task) => menu.onEdit?.(t);

  const now = new Date();

  const filtered = useMemo(() => {
    const today = todayKey();
    let rows: Task[] = tasks.slice();
    switch (bucket) {
      case "inbox":
        rows = rows.filter((t) => !t.completedAt && t.dueDate === null);
        break;
      case "today":
        rows = rows.filter((t) => !t.completedAt && t.dueDate !== null && t.dueDate <= today);
        break;
      case "upcoming":
        rows = rows.filter((t) => !t.completedAt && t.dueDate !== null && t.dueDate > today);
        break;
      case "completed":
        rows = rows.filter((t) => t.completedAt);
        break;
      case "all":
        rows = rows.filter((t) => !t.completedAt);
        break;
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
          (CATEGORIES.find((c) => c.id === t.categoryId)?.name.toLowerCase().includes(q) ?? false),
      );
    }
    if (priorityFilter !== "all") rows = rows.filter((t) => t.priority === priorityFilter);
    if (projectFilter !== "all") rows = rows.filter((t) => t.projectId === projectFilter);
    if (categoryFilter !== "all") rows = rows.filter((t) => t.categoryId === categoryFilter);

    rows.sort((a, b) => {
      switch (sort) {
        case "due": {
          const av = a.dueDate ? parseDate(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          const bv = b.dueDate ? parseDate(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          if (av !== bv) return av - bv;
          return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        }
        case "priority": {
          const p = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
          if (p !== 0) return p;
          return a.order - b.order;
        }
        case "title":
          return a.title.localeCompare(b.title);
        case "estimate":
          return (a.estimateMin ?? 9999) - (b.estimateMin ?? 9999);
        default:
          return a.order - b.order;
      }
    });
    return rows;
  }, [tasks, bucket, query, sort, priorityFilter, projectFilter, categoryFilter]);

  const reorderable = sort === "manual" && (bucket === "today" || bucket === "upcoming" || bucket === "all");
  const ids = filtered.map((t) => t.id);

  const grouped = useMemo(() => {
    if (bucket === "completed") {
      const groups = new Map<string, Task[]>();
      for (const t of filtered) {
        const key = dateKey(new Date(t.completedAt!));
        const arr = groups.get(key) ?? [];
        arr.push(t);
        groups.set(key, arr);
      }
      return [...groups.entries()];
    }
    if (bucket === "upcoming") {
      const groups = new Map<string, Task[]>();
      for (const t of filtered) {
        const key = t.dueDate!;
        const arr = groups.get(key) ?? [];
        arr.push(t);
        groups.set(key, arr);
      }
      return [...groups.entries()];
    }
    return null;
  }, [bucket, filtered]);

  const anyFilter = query.trim() || priorityFilter !== "all" || projectFilter !== "all" || categoryFilter !== "all";

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.01em]">Tasks</h1>
          <p className="mt-1.5 text-[14px] text-muted">
            {counts.today} for today{" · "}{counts.inbox} inbox · {counts.completed} completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} strokeWidth={1.75} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <Input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles, tags, notes…"
              aria-label="Search tasks"
              className="w-[240px] pl-8"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="w-[128px]" aria-label="Sort tasks">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">My order</SelectItem>
              <SelectItem value="due">By due date</SelectItem>
              <SelectItem value="priority">By priority</SelectItem>
              <SelectItem value="estimate">By length</SelectItem>
              <SelectItem value="title">A → Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* tabs on the full-width rule */}
      <div className="relative mb-4 flex items-center gap-1 overflow-x-auto border-b border-edge" role="tablist" aria-label="Task views">
        {(Object.keys(BUCKET_TITLES) as Bucket[]).map((b) => (
          <button
            key={b}
            type="button"
            role="tab"
            aria-selected={bucket === b}
            onClick={() => setBucket(b)}
            className={cn(
              "relative flex h-9 shrink-0 items-center gap-1.5 px-3 text-[13.5px] transition-colors",
              bucket === b ? "font-medium text-ink" : "text-muted hover:text-ink",
            )}
          >
            {BUCKET_TITLES[b]}
            {counts[b] > 0 ? <span className="num text-[11.5px] text-faint">{counts[b]}</span> : null}
            {bucket === b ? <span className="absolute inset-x-2 -bottom-px h-[2px] bg-ink" aria-hidden /> : null}
          </button>
        ))}
      </div>

      {/* filters as a quiet second row */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SlidersHorizontal size={13} strokeWidth={1.75} className="text-faint" aria-hidden />
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as Priority | "all")}>
          <SelectTrigger className="h-7 w-auto gap-1 border-none bg-inset px-2.5 py-0 text-[12px]" aria-label="Filter by priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_META[p].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {projects.length > 0 ? (
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="h-7 w-auto gap-1 border-none bg-inset px-2.5 py-0 text-[12px]" aria-label="Filter by project">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-7 w-auto gap-1 border-none bg-inset px-2.5 py-0 text-[12px]" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {anyFilter ? (
          <Button size="sm" variant="ghost" onClick={() => { setQuery(""); setPriorityFilter("all"); setProjectFilter("all"); setCategoryFilter("all"); }}>
            <X size={13} strokeWidth={1.75} /> Clear filters
          </Button>
        ) : null}
        {reorderable ? <span className="ml-auto hidden text-[12px] text-faint sm:block">Drag the handle to set your order</span> : null}
      </div>

      {bucket !== "completed" ? (
        <div className="mb-3">
          <QuickAdd defaultDue={bucket === "today" ? "today" : bucket === "upcoming" ? "tomorrow" : "none"} placeholder={bucket === "today" ? "Add to today" : "Add a task"} />
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="py-10">
          <EmptyHint className="max-w-[560px]">
            {anyFilter
              ? "No task matches this mix. Loosen a filter, or type something else."
              : bucket === "completed"
                ? "Nothing completed yet. The first checkmark is the hardest."
                : bucket === "today"
                  ? "Today is clear. Add a task, or open the Inbox to pull something in."
                  : bucket === "upcoming"
                    ? "Nothing dated yet. Give a task a date and it will appear here."
                    : bucket === "inbox"
                      ? "The inbox is empty — a rare and excellent state. Capture something before it walks off."
                      : "No open tasks at all. Add one above."}
          </EmptyHint>
        </div>
      ) : grouped ? (
        <div className="flex flex-col gap-6">
          {grouped.map(([key, rows]) => (
            <section key={key}>
              <h2 className={cn("mb-1.5 text-[13.5px] font-medium", bucket === "completed" ? "text-muted" : "text-muted")}>
                {bucket === "completed" ? relativeDayLabel(key, now) : humanDue(key)}{" "}
                <span className="num font-normal text-faint">· {rows.length}</span>
              </h2>
              <div className="flex flex-col">
                {rows.map((t) => (
                  <div key={t.id} className="py-1">
                    <StaticRow task={t} onToggle={(task) => toggleTask(task.id)} onOpen={toOpen} menu={menu} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : reorderable && (bucket === "today" || bucket === "upcoming" || bucket === "all") ? (
        <Reorder.Group
          axis="y"
          values={ids}
          onReorder={(nextIds: string[]) => reorderTasks(nextIds)}
          as="ul"
          className="flex flex-col"
        >
          {filtered.map((t) => (
            <SortableRow key={t.id} task={t} onToggle={(task) => toggleTask(task.id)} onOpen={toOpen} menu={menu} />
          ))}
        </Reorder.Group>
      ) : (
        <div className="flex flex-col">
          {filtered.map((t) => (
            <div key={t.id} className="border-b border-rule py-1 last:border-b-0">
              <StaticRow task={t} onToggle={(task) => toggleTask(task.id)} onOpen={toOpen} menu={menu} />
            </div>
          ))}
        </div>
      )}

      {bucket === "completed" && filtered.length > 0 ? (
        <p className="mt-4 text-[12.5px] text-muted">
          {filtered.length} completed task{filtered.length === 1 ? "" : "s"} — undone counts as a lesson, not a loss. Restoring keeps its place.
        </p>
      ) : null}

      {bucket === "today" && filtered.length > 0 && filtered.some((t) => isOverdue(t.dueDate)) ? (
        <p className="mt-3 text-[12.5px] text-pill-negative-ink">
          Some of these are overdue — pick the smallest first step and give it five minutes.
        </p>
      ) : null}
    </div>
  );
}
