import type { Task } from "@/types";
import { makeTask } from "@/types";
import { addDays, format, addMinutes, subDays } from "date-fns";
import { todayKey } from "@/lib/dates";

/** The first-run task set: believable, dated relative to today, all
 *  open — so the user's own statistics begin honest at zero. */
export function seedTasks(): Task[] {
  const today = todayKey();
  const d = (n: number) => format(addDays(new Date(), n), "yyyy-MM-dd");
  const mk = (patch: Partial<Task>, order: number) => makeTask({ ...patch, order, isSample: true, dueDate: patch.dueDate });

  return [
    mk(
      {
        title: "Submit the residency permit form",
        notes: "PDF signed, one passport photo stapled. Drop it at the office before 15:00.",
        priority: "urgent",
        dueDate: today,
        estimateMin: 45,
        categoryId: "errands",
        subtasks: [
          { id: "st-1", title: "Sign the PDF", done: true },
          { id: "st-2", title: "Print two copies", done: false },
          { id: "st-3", title: "Photocopy the passport page", done: false },
        ],
      },
      0,
    ),
    mk(
      {
        title: "Review the Q3 budget notes",
        notes: "Compare project spend against the plan; flag anything over 10%.",
        priority: "high",
        dueDate: today,
        estimateMin: 60,
        categoryId: "work",
        projectId: "p-rework",
        tags: ["finance"],
      },
      1,
    ),
    mk(
      {
        title: "Practice piano — 30 minutes",
        notes: "Burgmüller Op. 100 No. 15, hands separately, slow.",
        priority: "medium",
        dueDate: today,
        estimateMin: 30,
        categoryId: "personal",
        recurrence: { kind: "daily", interval: 1 },
      },
      2,
    ),
    mk(
      {
        title: "Book the dentist appointment",
        priority: "medium",
        dueDate: d(1),
        estimateMin: 10,
        categoryId: "health",
        tags: ["call"],
      },
      0,
    ),
    mk(
      {
        title: "Write the conference abstract",
        notes: "250 words on the intake-cache talk. Emphasise the measured numbers, not the architecture.",
        priority: "high",
        dueDate: d(3),
        estimateMin: 90,
        categoryId: "work",
        projectId: "p-rework",
        tags: ["writing"],
        subtasks: [
          { id: "st-4", title: "Outline the three claims", done: false },
          { id: "st-5", title: "Draft in one sitting", done: false },
        ],
      },
      1,
    ),
    mk(
      {
        title: "Read two chapters of the infrastructure book",
        priority: "low",
        dueDate: d(5),
        estimateMin: 45,
        categoryId: "learning",
        recurrence: { kind: "weekly", interval: 1 },
      },
      0,
    ),
    mk(
      {
        title: "Renew the gym membership",
        priority: "low",
        dueDate: d(8),
        estimateMin: 15,
        categoryId: "health",
      },
      0,
    ),
    mk(
      {
        title: "Plan the weekend trip",
        notes: "Trains out Saturday morning, back Sunday evening. Book the room by Thursday.",
        priority: "medium",
        dueDate: null,
        estimateMin: 30,
        categoryId: "personal",
        tags: ["weekend"],
      },
      0,
    ),
    mk(
      {
        title: "Reply to Lena about the studio space",
        priority: "medium",
        dueDate: null,
        estimateMin: 15,
        categoryId: "personal",
        tags: ["email"],
      },
      1,
    ),
  ];
}

export const SAMPLE_PROJECTS = [{ id: "p-rework", name: "Client rework" }];

/** A moment in the recent past, for tests and previews. */
export function pastIso(daysAgo: number, hour = 10): string {
  return addMinutes(subDays(new Date(), daysAgo), hour * 60).toISOString();
}
