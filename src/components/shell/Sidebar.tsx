import { CalendarCheck, Flame, LayoutDashboard, ListChecks, Medal, Settings, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { PulseMark } from "./PulseMark";
import { usePulseStore } from "@/store/usePulseStore";
import { todayKey } from "@/lib/dates";
import { levelFromXp } from "@/lib/xp";
import { Tooltip } from "@/components/ui/controls";

export type Route = "today" | "tasks" | "focus" | "analytics" | "progress" | "settings";

const NAV: { group: string; items: { route: Route; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }[] }[] = [
  {
    group: "Days",
    items: [
      { route: "today", label: "Today", icon: LayoutDashboard },
      { route: "tasks", label: "Tasks", icon: ListChecks },
    ],
  },
  {
    group: "Deep work",
    items: [{ route: "focus", label: "Focus", icon: Timer }],
  },
  {
    group: "Reflection",
    items: [
      { route: "analytics", label: "Analytics", icon: CalendarCheck },
      { route: "progress", label: "Progress", icon: Medal },
    ],
  },
];

function useNavCounts() {
  const tasks = usePulseStore((s) => s.tasks);
  const today = todayKey();
  const overdue = tasks.filter((t) => !t.completedAt && t.dueDate !== null && t.dueDate < today).length;
  const dueToday = tasks.filter((t) => !t.completedAt && t.dueDate === today).length;
  const inbox = tasks.filter((t) => !t.completedAt && t.dueDate === null).length;
  return { today: overdue + dueToday, tasks: inbox, overdue };
}

function NavCounts({ route }: { route: Route }) {
  const counts = useNavCounts();
  if (route === "today" && counts.today > 0) return <span className="num text-[11.5px] text-muted">{counts.today}</span>;
  if (route === "tasks" && counts.tasks > 0) return <span className="num text-[11.5px] text-muted">{counts.tasks}</span>;
  return null;
}

export function Sidebar({
  route,
  onNavigate,
  className,
}: {
  route: Route;
  onNavigate: (r: Route) => void;
  className?: string;
}) {
  const name = usePulseStore((s) => s.settings.name);
  const xp = usePulseStore((s) => s.progress.xp);
  const level = levelFromXp(xp);
  const streak = usePulseStore((s) => s.progress.streak);
  const displayName = name.trim() || "You";

  return (
    <aside className={cn("flex h-full w-[240px] shrink-0 flex-col bg-ground", className)}>
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
        <PulseMark size={28} />
        <div className="min-w-0">
          <div className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Pulse</div>
          <div className="text-[11.5px] leading-tight text-muted">One day, kept in rhythm</div>
        </div>
      </div>

      <nav className="thin-scroll flex-1 overflow-y-auto px-3 pb-4" aria-label="Primary">
        {NAV.map((group) => (
          <div key={group.group} className="mb-5">
            <div className="px-2 pb-1.5 pt-2 text-[12px] leading-none text-muted">{group.group}</div>
            {group.items.map((item) => {
              const active = route === item.route;
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => onNavigate(item.route)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "mb-0.5 flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors",
                    active ? "bg-active font-medium text-ink" : "text-muted hover:bg-active/50 hover:text-ink",
                  )}
                >
                  <item.icon size={16} strokeWidth={1.75} className={active ? "text-ink" : ""} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <NavCounts route={item.route} />
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-rule px-3 pb-4 pt-3">
        <button
          type="button"
          onClick={() => onNavigate("settings")}
          aria-current={route === "settings" ? "page" : undefined}
          className={cn(
            "mb-0.5 flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors",
            route === "settings" ? "bg-active font-medium text-ink" : "text-muted hover:bg-active/50 hover:text-ink",
          )}
        >
          <Settings size={16} strokeWidth={1.75} />
          <span className="flex-1 text-left">Settings</span>
        </button>

        <div className="mt-1 flex items-center gap-2.5 rounded-lg px-2.5 py-1.5">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[12px] font-semibold text-accent-ink"
            aria-hidden
          >
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-ink">{displayName}</span>
            <span className="block text-[11.5px] text-muted">
              Level {level}
              {streak.current > 1 ? (
                <>
                  {" · "}
                  <Flame size={10} className="inline -translate-y-px" strokeWidth={1.75} /> {streak.current} day
                  {streak.current === 1 ? "" : "s"}
                </>
              ) : null}
            </span>
          </span>
          <Tooltip label="Your pulse level">
            <span className="num rounded-full bg-inset px-2 py-0.5 text-[11px] text-muted">LV {level}</span>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}