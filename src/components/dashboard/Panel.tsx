import { cn } from "@/lib/utils";

/** Tonal panel — title and content sit directly on one step off the ground.
 *  No inner cards, no shadows, 1px edge only. */
export function Panel({
  title,
  action,
  className,
  contentClassName,
  children,
  ...rest
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "title" | "action" | "className">) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-2xl border border-edge bg-surface px-5 py-4 sm:px-6 sm:py-5", className)} {...rest}>
      {title ? (
        <header className={cn("mb-3 flex items-center justify-between gap-2", action ? "" : "")}>
          <h2 className="text-[13.5px] font-medium tracking-[-0.005em] text-muted">{title}</h2>
          {action}
        </header>
      ) : null}
      <div className={cn("min-w-0 flex-1", contentClassName)}>{children}</div>
    </section>
  );
}

/** The one empty-state device: the frame keeps its size, one sentence spans it. */
export function EmptyHint({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("rounded-xl border border-dashed border-control px-4 py-3.5 text-[13px] leading-relaxed text-muted", className)}>
      {children}
    </p>
  );
}
