import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePulseStore } from "@/store/usePulseStore";
import { PRIORITIES, PRIORITY_META, type Priority } from "@/types";
import { todayKey, dateKey } from "@/lib/dates";

/** Inline quick composer: title + Enter. Defaults differ per surface —
 *  on Today it lands in today; in the Inbox it stays undated. */
export function QuickAdd({
  defaultDue,
  className,
  placeholder = "Add a task",
  autoFocus,
}: {
  defaultDue?: "today" | "none" | "tomorrow";
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState<string | null>(defaultDue === "today" ? todayKey() : defaultDue === "tomorrow" ? dateKey(new Date(Date.now() + 86_400_000)) : null);
  const [priority, setPriority] = useState<Priority>("medium");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const addTask = usePulseStore((s) => s.addTask);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const submit = () => {
    const t = title.trim();
    if (!t) return;
    addTask({ title: t, dueDate: due, priority });
    setTitle("");
    inputRef.current?.focus();
  };

  const chips: { label: string; value: string | null }[] = [
    { label: "Today", value: todayKey() },
    { label: "Tomorrow", value: dateKey(new Date(Date.now() + 86_400_000)) },
    { label: "Next week", value: dateKey(new Date(Date.now() + 7 * 86_400_000)) },
    { label: "No date", value: null },
  ];

  return (
    <div className={cn("rounded-2xl border border-edge bg-surface px-3 py-2.5 transition-colors focus-within:border-control", focused && "shadow-[0_0_0_1px_var(--control)]", className)}>
      <div className="flex items-center gap-2.5">
        <Plus size={16} strokeWidth={2} className="shrink-0 text-muted" />
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-7 min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
        />
        <span className="num hidden shrink-0 text-[11.5px] text-faint sm:block">⏎</span>
      </div>
      {focused || title ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-rule pt-2.5">
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setDue(c.value)}
              aria-pressed={due === c.value}
              className={cn(
                "rounded-full px-2.5 py-1 text-[12px] transition-colors",
                due === c.value ? "bg-primary text-primary-ink" : "bg-inset text-muted hover:text-ink",
              )}
            >
              {c.label}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-rule" aria-hidden />
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setPriority(p)}
              aria-pressed={priority === p}
              title={PRIORITY_META[p].hint}
              className={cn(
                "rounded-full px-2.5 py-1 text-[12px] transition-colors",
                priority === p
                  ? p === "urgent"
                    ? "bg-pill-negative-bg text-pill-negative-ink"
                    : p === "high"
                      ? "bg-pill-warning-bg text-pill-warning-ink"
                      : "bg-primary text-primary-ink"
                  : "bg-inset text-muted hover:text-ink",
              )}
            >
              {PRIORITY_META[p].label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
