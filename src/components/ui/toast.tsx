import { create } from "zustand";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Undo2, X, Star, Zap, PartyPopper, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { uid } from "@/lib/id";

export interface Toast {
  id: string;
  kind: "xp" | "achievement" | "level" | "info" | "undo" | "warn";
  title: string;
  detail?: string;
  xp?: number;
  undo?: () => void;
}

interface ToastStore {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

export const useToasts = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => {
    const id = uid();
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
    window.setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 5600);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

const ICON: Record<Toast["kind"], React.ReactNode> = {
  xp: <Zap size={15} className="text-ink" />,
  achievement: <Star size={15} className="text-accent-deep" />,
  level: <PartyPopper size={15} className="text-accent-deep" />,
  info: <Info size={15} className="text-muted" />,
  undo: <Undo2 size={15} className="text-muted" />,
  warn: <Info size={15} className="text-negative" />,
};

export function ToastStack() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  const reduced = useReducedMotion();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-70 flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
            className="elevated pointer-events-auto flex w-full max-w-[400px] items-center gap-3 rounded-2xl border border-edge bg-surface px-4 py-3"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-active">{ICON[t.kind]}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-medium text-ink">
                {t.title}
                {t.xp !== undefined ? <span className="ml-2 font-semibold text-accent-deep tabular-nums">+{t.xp} XP</span> : null}
              </div>
              {t.detail ? <div className="truncate text-[12.5px] text-muted">{t.detail}</div> : null}
            </div>
            {t.undo ? (
              <button
                type="button"
                onClick={() => {
                  t.undo?.();
                  dismiss(t.id);
                }}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium text-ink hover:bg-active"
              >
                <Undo2 size={13} /> Undo
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(t.id)}
              className="rounded-full p-1 text-faint hover:bg-active hover:text-ink"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export { cn };
