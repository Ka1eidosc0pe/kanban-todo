import { addDaysISO } from "./taskUtils";
import type { AppData, Category, Task } from "./types";

export function createSeed(): AppData {
  const now = Date.now();
  const categories: Category[] = [
    { id: "cat-career", name: "Career", color: "blue" },
    { id: "cat-college", name: "College", color: "violet" },
    { id: "cat-personal", name: "Personal", color: "green" },
  ];
  let n = 0;
  const t = (p: Partial<Task> & Pick<Task, "id" | "title" | "status" | "categoryId">): Task => ({
    notes: "",
    priority: "medium",
    dueDate: null,
    parentId: null,
    order: n++,
    createdAt: now,
    updatedAt: now,
    ...p,
  });
  const tasks: Task[] = [
    t({ id: "s1", title: "👋 Drag me to another column", status: "created", categoryId: "cat-personal", notes: "Drag any card between lists. In Status view it changes the task's status; in Category view it changes the category." }),
    t({ id: "s2", title: "Try the Category view", status: "created", categoryId: "cat-personal", notes: "Use the view switcher in the header, then add or delete your own categories." }),
    t({ id: "s3", title: "Open me and add a subtask", status: "planned", categoryId: "cat-college", priority: "high", dueDate: addDaysISO(2), notes: "Click a card to open its details. Subtasks appear on the board as their own cards." }),
    t({ id: "s3a", title: "Subtask: write an outline", status: "in_progress", categoryId: "cat-college", parentId: "s3" }),
    t({ id: "s3b", title: "Subtask: gather sources", status: "created", categoryId: "cat-college", parentId: "s3" }),
    t({ id: "s4", title: "Update résumé", status: "in_progress", categoryId: "cat-career", dueDate: addDaysISO(-1) }),
    t({ id: "s5", title: "Add your first real task (press N)", status: "planned", categoryId: "cat-career", notes: "When you're ready, use the menu to clear these samples." }),
    t({ id: "s6", title: "Finish this sample board ✅", status: "completed", categoryId: "cat-personal" }),
    t({ id: "s7", title: "Old task (archived)", status: "archived", categoryId: "cat-personal" }),
  ];
  return {
    version: 1,
    categories,
    tasks,
    isSample: true,
    prefs: { view: "status", showArchived: false, query: "", tourDone: false, lastVisit: null },
  };
}
