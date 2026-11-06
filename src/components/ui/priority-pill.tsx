import { cn } from "@/lib/utils";
import { PRIORITY_META, type Priority } from "@/types";

/** Priority as a quiet pill inside the row — pale tint, dark ink. */
export function PriorityPill({ priority, className }: { priority: Priority; className?: string }) {
  const meta = PRIORITY_META[priority];
  const cls =
    priority === "urgent"
      ? "bg-pill-negative-bg text-pill-negative-ink"
      : priority === "high"
        ? "bg-pill-warning-bg text-pill-warning-ink"
        : "bg-inset text-muted";
  return (
    <span
      className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11.5px] font-medium", cls, className)}
    >
      {meta.label}
    </span>
  );
}
