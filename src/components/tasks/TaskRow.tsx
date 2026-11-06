import { memo } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { CalendarClock, GripVertical, MoreHorizontal, Repeat2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CompleteCheckbox } from "./CompleteCheckbox";
import { PriorityPill } from "@/components/ui/priority-pill";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import type { Task } from "@/types";
import { CATEGORIES } from "@/types";
import { humanDue, isOverdue } from "@/lib/dates";

export interface TaskRowMenuActions {
  onEdit?: (task: Task) => void;
  onDue: (task: Task, date: string | null) => void;
  onRescheduleNextWeek: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

function dayKeyPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

interface RowProps {
  task: Task;
  dragging?: boolean;
  compact?: boolean;
  onToggle?: (task: Task) => void;
  onOpen?: (task: Task) => void;
  menu: TaskRowMenuActions;
}

export const TaskRow = memo(function TaskRow({ task, onToggle, onOpen, menu, dragging, compact }: RowProps) {
  const overdue = isOverdue(task.dueDate);
  const done = task.completedAt !== null;
  const category = CATEGORIES.find((c) => c.id === task.categoryId);

  return (
    <div
      className={cn(
        "group flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors sm:gap-3 sm:px-3",
        dragging ? "bg-active" : "hover:bg-active/60",
        done && "opacity-[0.6]",
      )}
    >
      <CompleteCheckbox checked={done} onToggle={() => onToggle?.(task)} title={task.title} size={compact ? 22 : 26} />
      <button
        type="button"
        onClick={() => onOpen?.(task)}
        className="flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-lg text-left"
      >
        <span className={cn("truncate text-[14px] leading-5 font-medium text-ink", done && "text-muted line-through decoration-1")}>
          {task.title}
        </span>
        {!compact ? (
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] leading-none text-muted">
            {task.dueDate ? (
              <span
                className={cn(
                  "num inline-flex items-center gap-1 whitespace-nowrap",
                  overdue && !done ? "font-medium text-pill-negative-ink" : "",
                )}
              >
                <CalendarClock size={12} strokeWidth={1.75} />
                {humanDue(task.dueDate)}
              </span>
            ) : null}
            {task.recurrence.kind !== "none" ? (
              <span className="inline-flex items-center gap-1 whitespace-nowrap text-muted">
                <Repeat2 size={12} strokeWidth={1.75} /> Recurs {task.recurrence.kind}
              </span>
            ) : null}
            {task.estimateMin !== null ? <span className="num whitespace-nowrap">{task.estimateMin} min</span> : null}
            {task.subtasks.length > 0 ? (
              <span className="num whitespace-nowrap">
                {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length} steps
              </span>
            ) : null}
            {category ? <span className="whitespace-nowrap">{category.name}</span> : null}
            {task.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="whitespace-nowrap text-faint">
                #{tag}
              </span>
            ))}
          </span>
        ) : null}
      </button>
      <div className="flex shrink-0 items-center gap-1">
        <PriorityPill priority={task.priority} className="hidden sm:inline-flex" />
        <RowMenu task={task} menu={menu} />
      </div>
    </div>
  );
});

function RowMenu({ task, menu }: { task: Task; menu: TaskRowMenuActions }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Actions for "${task.title}"`}
          className="rounded-full p-1.5 text-faint opacity-0 transition-opacity hover:bg-raised hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
        >
          <MoreHorizontal size={16} strokeWidth={1.75} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => menu.onEdit?.(task)}>Edit details</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => menu.onDue(task, dayKeyPlus(0))}>Due today</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => menu.onDue(task, dayKeyPlus(1))}>Due tomorrow</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => menu.onRescheduleNextWeek(task)}>Next week</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => menu.onDue(task, null)}>No date</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => menu.onDelete?.(task)}>
          Delete task
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------------------------------------------------------------- */
/*  Drag-to-reorder row (manual sort) — handled by the grip only      */
/* ---------------------------------------------------------------- */

export function SortableRow({ task, ...rest }: RowProps) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={task.id} dragListener={false} dragControls={controls} className="list-none" layout="position">
      <div className="flex items-center">
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            controls.start(e);
          }}
          aria-label={`Reorder "${task.title}" — drag`}
          className="flex h-9 w-5 shrink-0 cursor-grab touch-none items-center justify-center text-faint/70 transition-colors hover:text-muted active:cursor-grabbing"
        >
          <GripVertical size={14} strokeWidth={1.75} />
        </button>
        <div className="min-w-0 flex-1">
          <TaskRow task={task} {...rest} />
        </div>
      </div>
    </Reorder.Item>
  );
}

/** Plain non-draggable row. */
export function StaticRow({ task, ...rest }: RowProps) {
  return (
    <div className="flex items-center">
      <span className="w-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <TaskRow task={task} {...rest} />
      </div>
    </div>
  );
}
