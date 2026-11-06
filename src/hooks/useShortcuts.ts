import { useEffect } from "react";
import { useToasts } from "@/components/ui/toast";

/** Global keyboard shortcuts. Guarded against typing contexts.
 *  n — new task · f — focus timer · t — today · a — analytics ·
 *  p — progress · ? — shortcuts · / — search on the tasks view */
export function useShortcuts(opts: {
  onNewTask: () => void;
  onNavigate: (route: string) => void;
  onToggleFocus: () => void;
  onToggleHelp: () => void;
  onSearch: () => void;
  hasOpenOverlay: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable || target.getAttribute("role") === "combobox");

      if (e.key === "Escape") {
        const toasts = useToasts.getState().toasts;
        const last = toasts[toasts.length - 1];
        if (last) useToasts.getState().dismiss(last.id);
        return;
      }
      if (typing) return;
      if (e.key === "?") {
        e.preventDefault();
        opts.onToggleHelp();
        return;
      }
      if (opts.hasOpenOverlay) return;

      switch (e.key.toLowerCase()) {
        case "n":
          e.preventDefault();
          opts.onNewTask();
          break;
        case "f":
          e.preventDefault();
          opts.onToggleFocus();
          break;
        case "t":
          e.preventDefault();
          opts.onNavigate("today");
          break;
        case "a":
          e.preventDefault();
          opts.onNavigate("analytics");
          break;
        case "p":
          e.preventDefault();
          opts.onNavigate("progress");
          break;
        case "/":
          e.preventDefault();
          opts.onNavigate("tasks");
          opts.onSearch();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [opts]);
}
