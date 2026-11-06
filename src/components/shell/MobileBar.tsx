import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CalendarCheck, ListChecks, Medal, Menu, Plus, Settings, Timer, LayoutDashboard, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PulseMark } from "./PulseMark";
import type { Route } from "./Sidebar";
import { todayKey } from "@/lib/dates";
import { usePulseStore } from "@/store/usePulseStore";

const ICONS: Record<Route, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  today: LayoutDashboard,
  tasks: ListChecks,
  focus: Timer,
  analytics: CalendarCheck,
  progress: Medal,
  settings: Settings,
};

const ORDER: Route[] = ["today", "tasks", "focus", "analytics", "progress", "settings"];

export const ROUTE_TITLES: Record<Route, string> = {
  today: "Today",
  tasks: "Tasks",
  focus: "Focus",
  analytics: "Analytics",
  progress: "Progress",
  settings: "Settings",
};

export function MobileTopBar({
  route,
  onNavigate,
  onQuickAdd,
}: {
  route: Route;
  onNavigate: (r: Route) => void;
  onQuickAdd: () => void;
}) {
  const tasks = usePulseStore((s) => s.tasks);
  const today = todayKey();
  const dueCount = tasks.filter((t) => !t.completedAt && t.dueDate !== null && t.dueDate <= today).length;
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-1 border-b border-rule bg-ground px-3 md:hidden">
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <button type="button" aria-label="Open navigation" className="relative rounded-full p-2 text-muted hover:bg-active hover:text-ink">
            <Menu size={18} strokeWidth={1.75} />
            {dueCount > 0 ? (
              <span className="num absolute right-0.5 top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-positive px-1 text-[9px] leading-none text-ground" />
            ) : null}
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30" />
          <Dialog.Content
            className="elevated fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border border-b-0 border-edge bg-surface pb-7 outline-none"
            aria-describedby={undefined}
          >
            <Dialog.Title className="flex items-center gap-2.5 px-5 pt-4 pb-3 text-[16px] font-semibold tracking-[-0.01em]">
              <PulseMark size={22} /> Pulse
            </Dialog.Title>
            <div className="flex flex-col px-3">
              {ORDER.map((r) => {
                const Icon = ICONS[r];
                const active = route === r;
                return (
                  <Dialog.Close asChild key={r}>
                    <button
                      type="button"
                      onClick={() => onNavigate(r)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-11 items-center gap-3 rounded-xl px-4 text-[14.5px]",
                        active ? "bg-active font-medium text-ink" : "text-muted",
                      )}
                    >
                      <Icon size={16} strokeWidth={1.75} />
                      {ROUTE_TITLES[r]}
                    </button>
                  </Dialog.Close>
                );
              })}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close navigation"
                className="absolute right-4 top-4 rounded-full p-1.5 text-muted hover:bg-active"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex flex-1 items-center justify-center text-[14px] font-semibold tracking-[-0.01em] text-ink">
        {ROUTE_TITLES[route]}
      </div>
      <button
        type="button"
        onClick={onQuickAdd}
        aria-label="Add a task"
        className="rounded-full bg-primary p-2 text-primary-ink hover:opacity-90"
      >
        <Plus size={18} strokeWidth={2} />
      </button>
    </header>
  );
}

/** Same fold behaviour between 641–1100px: the tablet band shares the phone bar. */
export function useFoldedNav(): boolean {
  const [folded, setFolded] = useState(() => typeof window !== "undefined" && window.innerWidth < 1100);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1100px)");
    const update = () => setFolded(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return folded;
}
