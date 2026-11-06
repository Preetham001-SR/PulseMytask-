import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Keyboard } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Sidebar, type Route } from "@/components/shell/Sidebar";
import { MobileTopBar, ROUTE_TITLES, useFoldedNav } from "@/components/shell/MobileBar";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { QuickAdd } from "@/components/tasks/QuickAdd";
import { useTaskMenu } from "@/components/tasks/useTaskMenu";
import { FocusOverlay } from "@/components/focus/FocusOverlay";
import { ToastStack } from "@/components/ui/toast";
import { useShortcuts } from "@/hooks/useShortcuts";
import { usePulseStore } from "@/store/usePulseStore";
import { TodayView } from "@/views/TodayView";
import { TasksView } from "@/views/TasksView";
import { FocusView } from "@/views/FocusView";
import { AnalyticsView } from "@/views/AnalyticsView";
import { ProgressView } from "@/views/ProgressView";
import { SettingsView } from "@/views/SettingsView";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

const VALID_ROUTES: Route[] = ["today", "tasks", "focus", "analytics", "progress", "settings"];

function routeFromHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, "");
  return (VALID_ROUTES as string[]).includes(h) ? (h as Route) : "today";
}

export function App() {
  const [route, setRouteState] = useState<Route>(routeFromHash);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingOpen, setEditingOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const searchRef = useRef<() => void>(null);
  const folded = useFoldedNav();
  const hydrated = usePulseStore((s) => s.hydrated);
  const tasks = usePulseStore((s) => s.tasks);
  const menu = useTaskMenu(useCallback((task: Task) => {
    setEditingId(task.id);
    setEditingOpen(true);
  }, []));

  const setRoute = useCallback((r: Route) => {
    window.location.hash = `/${r}`;
    setRouteState(r);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const onHash = () => setRouteState(routeFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const toggleFocus = useCallback((taskId?: string | null) => {
    setFocusTaskId(taskId ?? null);
    setFocusOpen(true);
  }, []);

  useShortcuts({
    onNewTask: () => setQuickOpen(true),
    onNavigate: (r) => setRoute(r as Route),
    onToggleFocus: () => (focusOpen ? setFocusOpen(false) : setFocusOpen(true)),
    onToggleHelp: () => setHelpOpen((o) => !o),
    onSearch: () => searchRef.current?.(),
    hasOpenOverlay: focusOpen || editingOpen || quickOpen || helpOpen,
  });

  // apply the persisted theme on load (index.html covers first paint)
  useEffect(() => {
    const un = usePulseStore.subscribe((s) => {
      document.documentElement.classList.toggle("dark", s.settings.theme === "dark" || (s.settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches));
    });
    return () => un();
  }, []);

  // the persist callback only fires when storage has data; make sure a first
  // visit also clears the skeleton (validation still gates the real hydrate)
  useEffect(() => {
    if (usePulseStore.getState().hydrated) return;
    const t = window.setTimeout(() => {
      if (!usePulseStore.getState().hydrated) usePulseStore.setState({ hydrated: true });
    }, 300);
    return () => window.clearTimeout(t);
  }, []);

  const editingTask = useMemo(() => tasks.find((t) => t.id === editingId) ?? null, [tasks, editingId]);

  if (!hydrated) {
    return (
      <div className="grid h-full place-items-center bg-ground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-40 rounded-xl bg-active" aria-hidden />
          <div className="h-3 w-24 rounded bg-active" aria-hidden />
          <span className="sr-only" role="status">Loading your day…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {!folded ? <Sidebar route={route} onNavigate={setRoute} /> : null}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {folded ? <MobileTopBar route={route} onNavigate={setRoute} onQuickAdd={() => setQuickOpen(true)} /> : null}
        <main className={cn("thin-scroll flex-1 overflow-y-auto", folded ? "pb-20" : "")} aria-label={ROUTE_TITLES[route]}>
          <ViewSwitch route={route} menu={menu} searchRef={searchRef} toggleFocus={toggleFocus} />
        </main>
      </div>

      <TaskDialog task={editingTask} open={editingOpen} onOpenChange={setEditingOpen} />
      <QuickAddDialog open={quickOpen} onOpenChange={setQuickOpen} />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      {focusOpen ? <FocusOverlay onExit={() => setFocusOpen(false)} initialTaskId={focusTaskId} /> : null}
      <ToastStack />
    </div>
  );
}

function ViewSwitch({
  route,
  menu,
  searchRef,
  toggleFocus,
}: {
  route: Route;
  menu: ReturnType<typeof useTaskMenu>;
  searchRef: { current: (() => void) | null };
  toggleFocus: (taskId?: string | null) => void;
}) {
  const reduced = useReducedMotion();
  const common = { menu, toggleFocus };
  const view =
    route === "today" ? (
      <TodayView {...common} />
    ) : route === "tasks" ? (
      <TasksView {...common} searchRef={searchRef} />
    ) : route === "focus" ? (
      <FocusView toggleFocus={toggleFocus} />
    ) : route === "analytics" ? (
      <AnalyticsView />
    ) : route === "progress" ? (
      <ProgressView />
    ) : (
      <SettingsView />
    );

  return (
    <div className={cn("mx-auto w-full max-w-[1100px] px-5 pb-20 pt-10 sm:px-8 md:px-10")}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={route}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {view}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function QuickAddDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/25" />
        <Dialog.Content
          className="elevated fixed left-1/2 top-[18vh] z-50 w-[calc(100vw-32px)] max-w-[520px] -translate-x-1/2 rounded-2xl border border-edge bg-surface p-4 focus:outline-none"
          aria-describedby={undefined}
        >
          <Dialog.Title className="px-1 pb-2.5 text-[13px] text-muted">
            New task — <kbd className="rounded bg-active px-1.5 py-0.5 text-[11px]">N</kbd> any time
          </Dialog.Title>
          <QuickAdd defaultDue="none" autoFocus placeholder="What needs doing?" />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function HelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const rows: [string, string][] = [
    ["N", "New task"],
    ["F", "Toggle focus timer"],
    ["T", "Go to Today"],
    ["A", "Analytics"],
    ["P", "Progress"],
    ["/", "Search tasks"],
    ["⏎", "Save / complete in place"],
    ["Esc", "Close dialogs, exit focus"],
    ["?", "This dialog"],
  ];
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/25" />
        <Dialog.Content className="elevated fixed left-1/2 top-[20vh] z-50 w-[calc(100vw-32px)] max-w-[380px] -translate-x-1/2 rounded-2xl border border-edge bg-surface p-5 focus:outline-none">
          <Dialog.Title className="flex items-center gap-2 text-[16px] font-semibold tracking-[-0.01em]">
            <Keyboard size={15} strokeWidth={1.75} /> Keyboard shortcuts
          </Dialog.Title>
          <ul className="mt-4 flex flex-col gap-2">
            {rows.map(([k, label]) => (
              <li key={k + label} className="flex items-center justify-between text-[13.5px] text-ink">
                <span className="text-muted">{label}</span>
                <kbd className="num rounded-md border border-control bg-inset px-2 py-0.5 text-[12px]">{k}</kbd>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
