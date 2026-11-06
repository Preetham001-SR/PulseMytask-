import { useCallback } from "react";
import { useToasts } from "@/components/ui/toast";
import { usePulseStore } from "@/store/usePulseStore";
import { dateKey } from "@/lib/dates";
import type { Task } from "@/types";
import type { TaskRowMenuActions } from "@/components/tasks/TaskRow";

void dateKey;

/** Shared row-menu wiring: every task list gets identical, honest actions. */
export function useTaskMenu(onEdit?: (task: Task) => void): TaskRowMenuActions {
  const rescheduleTask = usePulseStore((s) => s.rescheduleTask);
  const deleteTask = usePulseStore((s) => s.deleteTask);
  const pushToast = useToasts((s) => s.push);

  const onDue = useCallback(
    (task: Task, date: string | null) => {
      rescheduleTask(task.id, date);
      pushToast({
        kind: "info",
        title: date ? `Rescheduled to ${new Date(`${date}T12:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}` : "Moved to no date",
        detail: task.title,
      });
    },
    [rescheduleTask, pushToast],
  );

  const onRescheduleNextWeek = useCallback(
    (task: Task) => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      rescheduleTask(task.id, d.toISOString().slice(0, 10));
      pushToast({ kind: "info", title: "Rescheduled to next week", detail: task.title });
    },
    [rescheduleTask, pushToast],
  );

  const onDelete = useCallback(
    (task: Task) => {
      deleteTask(task.id);
    },
    [deleteTask],
  );

  return { onEdit, onDue, onRescheduleNextWeek, onDelete };
}
