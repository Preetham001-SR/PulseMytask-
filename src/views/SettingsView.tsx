import { useMemo, useState } from "react";
import { Monitor, Moon, Sun, Download, Trash2 } from "lucide-react";
import { Panel } from "@/components/dashboard/Panel";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/controls";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePulseStore, applyTheme } from "@/store/usePulseStore";
import type { PulseState } from "@/types";
import type { ThemeSetting } from "@/types";

/** Its question: how does Pulse adapt to me? Few settings, all with a reason. */
export function SettingsView() {
  const settings = usePulseStore((s) => s.settings);
  const tasks = usePulseStore((s) => s.tasks);
  const updateSettings = usePulseStore((s) => s.updateSettings);
  const setTheme = usePulseStore((s) => s.setTheme);
  const clearSampleData = usePulseStore((s) => s.clearSampleData);
  const addProject = usePulseStore((s) => s.addProject);
  const pushToast = usePulseStore((s) => s.pushToast);

  const sampleCount = useMemo(() => tasks.filter((t) => t.isSample).length, [tasks]);
  const [name, setName] = useState(settings.name);
  const [projectName, setProjectName] = useState("");

  const exportAll = () => {
    const snapshot: PulseState = {
      version: usePulseStore.getState().version,
      createdAt: usePulseStore.getState().createdAt,
      tasks: usePulseStore.getState().tasks,
      projects: usePulseStore.getState().projects,
      focusSessions: usePulseStore.getState().focusSessions,
      progress: usePulseStore.getState().progress,
      settings: usePulseStore.getState().settings,
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulse-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast({ kind: "info", title: "Backup exported", detail: "A JSON snapshot of everything — tasks, sessions, XP, settings." });
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-[24px] font-semibold tracking-[-0.01em]">Settings</h1>
        <p className="mt-1.5 max-w-[62ch] text-[14px] text-muted">A few ways Pulse adapts to you. Everything is local — nothing leaves this device.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <Panel title="How it greets you" className="md:col-span-5" contentClassName="flex flex-col gap-3">
          <Label htmlFor="name">Your name (optional)</Label>
          <div className="flex gap-2">
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Named or anonymous — both fine"
              maxLength={30}
            />
            <Button
              variant="secondary"
              onClick={() => {
                updateSettings({ name });
                pushToast({ kind: "info", title: name.trim() ? `Saved — hello, ${name.trim()}.` : "Saved — back to anonymity." });
              }}
            >
              Save
            </Button>
          </div>
          <p className="text-[12.5px] text-muted">The dashboard greeting uses it. Privacy is the default; the name only ever stays local.</p>

          <div className="mt-2">
            <Label htmlFor="project">New project</Label>
            <div className="mt-1.5 flex gap-2">
              <Input id="project" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Home move" maxLength={40} />
              <Button
                variant="secondary"
                disabled={!projectName.trim()}
                onClick={() => {
                  addProject(projectName);
                  setProjectName("");
                  pushToast({ kind: "info", title: "Project added" });
                }}
              >
                Add
              </Button>
            </div>
            <p className="mt-1.5 text-[12.5px] text-muted">Tasks can belong to one project; filters show them across the app.</p>
          </div>
        </Panel>

        <Panel title="Appearance" className="md:col-span-3" contentClassName="flex flex-col gap-3">
          <Segmented<ThemeSetting>
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
              { value: "system", label: "System" },
            ]}
            value={settings.theme}
            onChange={(v) => {
              setTheme(v);
              applyTheme(v);
            }}
            ariaLabel="Theme"
          />
          <div className="flex items-start gap-2 text-[12.5px] text-muted">
            {settings.theme === "dark" ? (
              <Moon size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            ) : settings.theme === "system" ? (
              <Monitor size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            ) : (
              <Sun size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            )}
            Follows this setting instantly; the system option keeps step with your OS.
          </div>
        </Panel>

        <Panel title="Rhythm" className="md:col-span-4" contentClassName="flex flex-col gap-3">
          <Label htmlFor="focus">Focus session length</Label>
          <Select value={String(settings.focusMinutes)} onValueChange={(v) => updateSettings({ focusMinutes: Number(v) })}>
            <SelectTrigger id="focus" aria-label="Focus session length">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[15, 20, 25, 30, 45, 50].map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m} minutes{m === 50 ? " · deep" : m === 25 ? " · classic" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Label htmlFor="break" className="mt-1">Break length</Label>
          <Select value={String(settings.breakMinutes)} onValueChange={(v) => updateSettings({ breakMinutes: Number(v) })}>
            <SelectTrigger id="break" aria-label="Break length">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[3, 5, 10, 15].map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m} minutes
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Label htmlFor="goal" className="mt-1">Daily pulse — tasks per day</Label>
          <Select value={String(settings.dailyGoal)} onValueChange={(v) => updateSettings({ dailyGoal: Number(v) })}>
            <SelectTrigger id="goal" aria-label="Daily goal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 8, 10].map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m} task{m === 1 ? "" : "s"} per day
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[12.5px] text-muted">The goal draws a quiet line on the Today pulse — no guilt fireworks when you miss it.</p>
        </Panel>

        <Panel title="Your data" className="md:col-span-6" contentClassName="flex flex-col gap-3">
          <p className="text-[13.5px] leading-relaxed text-muted">
            Everything lives in this browser's localStorage — exported as a JSON file any time, no account, no cloud.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportAll}>
              <Download size={15} strokeWidth={1.75} /> Export backup
            </Button>
          </div>
          <p className="text-[12.5px] text-muted">Import is not wired in this build — the export is fully readable JSON, so recovery is always possible.</p>
        </Panel>

        <Panel title="Sample data" className="md:col-span-6" contentClassName="flex flex-col gap-3">
          {sampleCount > 0 ? (
            <>
              <p className="text-[13.5px] leading-relaxed text-muted">
                {sampleCount} sample task{sampleCount === 1 ? "" : "s"} from the introductory set are still on your lists. Clearing them leaves your own data untouched — undo is on the toast.
              </p>
              <div className="w-fit">
                <Button variant="danger" onClick={clearSampleData}>
                  <Trash2 size={15} strokeWidth={1.75} /> Clear sample data
                </Button>
              </div>
            </>
          ) : (
            <p className="text-[13.5px] text-muted">No sample data on your lists — you're already running entirely on your own tasks.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
