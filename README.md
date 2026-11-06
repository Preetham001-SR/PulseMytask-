# PULSE

A personal productivity app that keeps one day in rhythm: a dashboard with a daily
mission, real task management, a Pomodoro-style focus veil, and quiet analytics —
with a light XP/streak layer to keep the loop alive.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Production build:

```bash
npm run build    # typechecks (tsc --noEmit) then builds into dist/
npm run preview  # serves the build
```

A prebuilt `dist/` ships with the project — serve it with any static server
(`npx serve dist`) if you just want to look.

## What's inside

- **Today** — greeting, day fact line, the daily mission (mark done / focus / not
  today), pulse ring, next three tasks, challenge cards, "Coming up" dates, and
  the week's rhythm.
- **Tasks** — Inbox / Today / Upcoming / All / Completed buckets, search (`/`),
  sort, priority & project filters, drag to reorder, row menus (due date,
  reschedule, delete), full detail dialog (subtasks, notes, recurrence,
  category, project, estimate).
- **Focus** — a veil over the whole screen: 25/50-minute focus or a short break,
  space to pause/restart, skip to flip into the break. Sessions earn XP and feed
  the charts. `Esc` leaves. State survives reloads.
- **Analytics** — 30-day completions, weekly totals, focus minutes, weekly
  rhythm, where your effort concentrates (workspace, priorities, projects).
- **Progress** — XP → level, streak, challenge wins, milestone weeks, badges.
- **Settings** — name, projects, theme (light / dark / system), timer lengths,
  daily goal, JSON backup export, clear-sample-data.

## Shortcuts

| Key | Action |
| --- | --- |
| `n` | New task |
| `f` | Focus |
| `t` | Go to Today |
| `a` | Go to Analytics |
| `p` | Go to Progress |
| `/` | Tasks + search |
| `?` | Shortcut help |
| `space` | Pause / restart the focus timer |
| `s` | Skip to the next focus phase |
| `Esc` | Leave focus mode |

## Stack

Vite 7 · React 19 · TypeScript (strict) · Tailwind v4 · Radix primitives ·
Framer Motion · Zustand (persisted) · date-fns. State lives in `localStorage`
(`pulse-store`, `pulse-focus-run`).

## Layout

```
src/
  views/        Today · Tasks · Focus · Analytics · Progress · Settings
  components/   shell (sidebar/mobile bar) · tasks · focus · dashboard · charts · ui
  store/        usePulseStore (zustand + persist), useFocusRun, useToasts
  lib/          xp, stakes (challenges), gamify, dates, analytics helpers
  data/         sample tasks & projects on first boot
  types/        domain types, constants, zod validation
```
