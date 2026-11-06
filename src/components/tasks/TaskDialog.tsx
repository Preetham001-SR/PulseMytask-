import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Trash2, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompleteCheckbox } from "./CompleteCheckbox";
import { usePulseStore } from "@/store/usePulseStore";
import { CATEGORIES, ESTIMATE_OPTIONS, PRIORITIES, PRIORITY_META, type Priority, type RecurrenceKind, type Task } from "@/types";
import { cn } from "@/lib/utils";
import { dateKey, todayKey } from "@/lib/dates";

interface Props {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Draft {
  title: string;
  notes: string;
  priority: Priority;
  dueDate: string | null;
  estimateMin: number | null;
  categoryId: string | null;
  projectId: string | null;
  tags: string[];
  recurrenceKind: RecurrenceKind;
}

export function TaskDialog({ task, open, onOpenChange }: Props) {
  const updateTask = usePulseStore((s) => s.updateTask);
  const deleteTask = usePulseStore((s) => s.deleteTask);
  const projects = usePulseStore((s) => s.projects);
  const toggleSubtask = usePulseStore((s) => s.toggleSubtask);
  const addSubtask = usePulseStore((s) => s.addSubtask);
  const removeSubtask = usePulseStore((s) => s.removeSubtask);
  const toggleComplete = usePulseStore((s) => s.toggleTask);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [subInput, setSubInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (task && open) {
      setDraft({
        title: task.title,
        notes: task.notes,
        priority: task.priority,
        dueDate: task.dueDate,
        estimateMin: task.estimateMin,
        categoryId: task.categoryId,
        projectId: task.projectId,
        tags: [...task.tags],
        recurrenceKind: task.recurrence.kind,
      });
      setConfirmDelete(false);
      setTagInput("");
      setSubInput("");
    }
  }, [task, open]);

  const commit = useMemo(
    () => (d: Draft) => {
      if (!task) return;
      const clean = { ...d, title: d.title.trim() };
      updateTask(task.id, {
        title: clean.title,
        notes: clean.notes,
        priority: clean.priority,
        dueDate: clean.dueDate,
        estimateMin: clean.estimateMin,
        categoryId: (clean.categoryId as Task["categoryId"]) ?? null,
        projectId: clean.projectId,
        tags: clean.tags,
        recurrence: { kind: clean.recurrenceKind, interval: task.recurrence.interval || 1 },
      });
    },
    [task, updateTask],
  );

  if (!task || !draft) return null;
  const done = task.completedAt !== null;
  const patch = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const dueAndClose = (date: string | null, close = false) => {
    patch("dueDate", date);
    if (close) {
      commit({ ...draft, dueDate: date });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? (commit(draft), onOpenChange(false)) : onOpenChange(true))}>
      <DialogContent
        wide
        title={
          <span className="flex items-center gap-2.5">
            <CompleteCheckbox checked={done} onToggle={() => toggleComplete(task.id)} title={task.title} size={24} />
            <input
              value={draft.title}
              onChange={(e) => patch("title", e.target.value)}
              onBlur={() => commit(draft)}
              aria-label="Task title"
              className="min-w-0 flex-1 border-none bg-transparent text-[18px] font-semibold tracking-[-0.01em] outline-none placeholder:text-faint"
            />
          </span>
        }
        description={`Created ${new Date(task.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}${done ? ` · Completed ${new Date(task.completedAt!).toLocaleDateString(undefined, { day: "numeric", month: "short" })}` : ""}`}
      >
        <div className="thin-scroll grid max-h-[62vh] grid-cols-1 gap-4 overflow-y-auto px-6 pb-4 sm:grid-cols-2">
          <div className="flex flex-col gap-4 sm:col-span-2">
            <div>
              <Label className="mb-1.5 block">Notes</Label>
              <Textarea
                value={draft.notes}
                onChange={(e) => patch("notes", e.target.value)}
                onBlur={() => commit(draft)}
                placeholder="What does done look like?"
                aria-label="Notes"
              />
            </div>
            {/* subtasks */}
            <div>
              <Label className="mb-1.5 block">
                Steps <span className="font-normal text-muted">({task.subtasks.filter((s) => s.done).length}/{task.subtasks.length})</span>
              </Label>
              <div className="flex flex-col gap-1">
                {task.subtasks.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-active">
                    <CompleteCheckbox
                      checked={s.done}
                      size={18}
                      title={s.title}
                      onToggle={() => toggleSubtask(task.id, s.id)}
                    />
                    <span className={cn("flex-1 text-[13.5px]", s.done ? "text-muted line-through" : "text-ink")}>{s.title}</span>
                    <button
                      type="button"
                      aria-label={`Remove step "${s.title}"`}
                      onClick={() => removeSubtask(task.id, s.id)}
                      className="rounded-full p-1 text-faint hover:bg-raised hover:text-ink"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-control px-2.5 py-1.5">
                  <PlusGlyph />
                  <input
                    value={subInput}
                    onChange={(e) => setSubInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && subInput.trim()) {
                        addSubtask(task.id, subInput);
                        setSubInput("");
                      }
                    }}
                    placeholder="Add a step, ⏎"
                    aria-label="Add subtask"
                    className="h-6 min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-faint"
                  />
                </div>
              </div>
            </div>
            {/* tags */}
            <div>
              <Label className="mb-1.5 block">Tags</Label>
              <div className="flex flex-wrap items-center gap-1.5">
                {draft.tags.map((t) => (
                  <span key={t} className="flex items-center gap-1 rounded-full bg-inset px-2.5 py-1 text-[12px] text-muted">
                    #{t}
                    <button
                      type="button"
                      aria-label={`Remove tag ${t}`}
                      onClick={() => {
                        const tags = draft.tags.filter((x) => x !== t);
                        patch("tags", tags);
                        commit({ ...draft, tags });
                      }}
                      className="text-faint hover:text-ink"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    const v = tagInput.trim().replace(/^#/, "");
                    if ((e.key === "Enter" || e.key === ",") && v) {
                      e.preventDefault();
                      if (!draft.tags.includes(v)) {
                        const tags = [...draft.tags, v].slice(0, 10);
                        patch("tags", tags);
                        commit({ ...draft, tags });
                      }
                      setTagInput("");
                    }
                  }}
                  placeholder="Add tag and press ⏎"
                  aria-label="Add tag"
                  className="h-8 w-40"
                />
              </div>
            </div>
          </div>

          {/* due date */}
          <div>
            <Label className="mb-1.5 flex items-center gap-1.5">
              <CalendarDays size={13} strokeWidth={1.75} /> Due date
            </Label>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {[
                { label: "Today", value: todayKey() },
                { label: "Tomorrow", value: dateKey(new Date(Date.now() + 86_400_000)) },
                { label: "+3 days", value: dateKey(new Date(Date.now() + 3 * 86_400_000)) },
                { label: "None", value: null },
              ].map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => dueAndClose(c.value, false)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[12px] transition-colors",
                    draft.dueDate === c.value ? "bg-primary text-primary-ink" : "bg-inset text-muted hover:text-ink",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <Input
              type="date"
              value={draft.dueDate ?? ""}
              onChange={(e) => dueAndClose(e.target.value || null, false)}
              aria-label="Pick a due date"
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Priority</Label>
            <div className="flex gap-1.5">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={draft.priority === p}
                  title={PRIORITY_META[p].hint}
                  onClick={() => {
                    patch("priority", p);
                    commit({ ...draft, priority: p });
                  }}
                  className={cn(
                    "flex-1 rounded-lg border px-1 py-1.5 text-[12.5px] transition-colors",
                    draft.priority === p
                      ? p === "urgent"
                        ? "border-pill-negative-ink bg-pill-negative-bg text-pill-negative-ink"
                        : p === "high"
                          ? "border-transparent bg-pill-warning-bg text-pill-warning-ink"
                          : "border-primary bg-primary text-primary-ink"
                      : "border-control text-muted hover:text-ink",
                  )}
                >
                  {PRIORITY_META[p].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">Category</Label>
            <Select
              value={draft.categoryId ?? "none"}
              onValueChange={(v) => {
                const v2 = v === "none" ? null : v;
                patch("categoryId", v2);
                commit({ ...draft, categoryId: v2 });
              }}
            >
              <SelectTrigger aria-label="Category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block">Project</Label>
            <Select
              value={draft.projectId ?? "none"}
              onValueChange={(v) => {
                const v2 = v === "none" ? null : v;
                patch("projectId", v2);
                commit({ ...draft, projectId: v2 });
              }}
            >
              <SelectTrigger aria-label="Project">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block">Estimate</Label>
            <Select
              value={String(draft.estimateMin ?? "none")}
              onValueChange={(v) => {
                const v2 = v === "none" ? null : Number(v);
                patch("estimateMin", v2);
                commit({ ...draft, estimateMin: v2 });
              }}
            >
              <SelectTrigger aria-label="Estimated duration">
                <SelectValue placeholder="Duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No estimate</SelectItem>
                {ESTIMATE_OPTIONS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block">Repeats</Label>
            <Select
              value={draft.recurrenceKind}
              onValueChange={(v: RecurrenceKind) => {
                patch("recurrenceKind", v);
                commit({ ...draft, recurrenceKind: v });
              }}
            >
              <SelectTrigger aria-label="How often it repeats">
                <SelectValue placeholder="Repeats" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Does not repeat</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekdays">Every weekday</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* footer: destructive last, in its own space */}
        <div className="flex items-center justify-between gap-2 border-t border-rule px-6 pb-5 pt-3">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-muted">Delete “{task.title.slice(0, 28)}{task.title.length > 28 ? "…" : ""}”?</span>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  deleteTask(task.id);
                  onOpenChange(false);
                }}
              >
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                Keep
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} strokeWidth={1.75} /> Delete
            </Button>
          )}
          <div className="flex items-center gap-2">
            {task.dueDate ? (
              <Button size="sm" variant="ghost" onClick={() => dueAndClose(task.dueDate, false)}>
                Due {draft.dueDate === todayKey() ? "today" : "soon"}
              </Button>
            ) : null}
            <Button size="sm" variant="primary" onClick={() => (commit(draft), onOpenChange(false))}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlusGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="text-faint">
      <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
