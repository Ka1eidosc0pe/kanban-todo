"use client";

import { Badge, EmptyState, cn } from "@/components/ui";
import { PRIORITY, STATUS_TONE } from "./TaskCard";
import { dueLabel, groupAgenda, todayISO } from "@/lib/taskUtils";
import { CATEGORY_COLORS, STATUS_LABELS, type Category, type Task } from "@/lib/types";

export interface AgendaViewProps {
  /** Tasks already narrowed by search and filters. */
  tasks: Task[];
  byId: Map<string, Task>;
  catById: Map<string, Category>;
  filtered: boolean;
  onOpen: (id: string) => void;
  onToggleDone: (t: Task) => void;
}

/** Vertical list of open tasks grouped by when they are due. */
export function AgendaView({ tasks, byId, catById, filtered, onOpen, onToggleDone }: AgendaViewProps) {
  const today = todayISO();
  const groups = groupAgenda(tasks, today);
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10 pt-2 sm:px-6">
      {groups.length === 0 ? (
        <EmptyState
          icon="✓"
          title={filtered ? "No matching open tasks" : "Nothing open. Enjoy the quiet."}
          description={filtered ? "Try clearing the search or filters." : "New tasks you add will show up here, grouped by due date."}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <section key={g.key} aria-labelledby={`agenda-${g.key}`}>
              <h2 id={`agenda-${g.key}`} className={cn("mb-2 flex items-center gap-2 text-sm font-semibold", g.key === "overdue" ? "text-rose-700" : g.key === "today" ? "text-amber-700" : "text-slate-800")}>
                {g.label}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500" aria-label={`${g.tasks.length} tasks`}>{g.tasks.length}</span>
              </h2>
              <ul className="flex flex-col gap-1.5">
                {g.tasks.map((t) => {
                  const cat = catById.get(t.categoryId);
                  const parent = t.parentId ? byId.get(t.parentId) : undefined;
                  const pr = PRIORITY[t.priority];
                  return (
                    <li
                      key={t.id}
                      data-agenda-row
                      className={cn(
                        "flex items-center gap-3 rounded-xl border bg-white px-3 py-2 shadow-sm",
                        t.parentId ? "border-dashed border-slate-300 bg-slate-50/70" : "border-slate-200",
                        g.key === "overdue" && "border-l-4 border-l-rose-400",
                        g.key === "today" && "border-l-4 border-l-amber-400",
                      )}
                    >
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={false}
                        aria-label={`Mark "${t.title}" done`}
                        onClick={() => onToggleDone(t)}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-400 bg-white text-[11px] leading-none hover:border-indigo-500 focus-visible:outline-2 focus-visible:outline-indigo-500"
                      />
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => onOpen(t.id)}
                          className="block max-w-full truncate rounded text-left text-sm font-medium text-slate-900 hover:underline focus-visible:outline-2 focus-visible:outline-indigo-500"
                        >
                          {t.title}
                          {t.repeat && <span className="ml-1.5 text-xs font-normal text-slate-400" aria-label={`Repeats ${t.repeat}`}>↻</span>}
                        </button>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {parent && (
                            <Badge tone="indigo" className="max-w-[10rem] text-[10px]" title={`Subtask of ${parent.title}`}>
                              <span aria-hidden>↳</span> {parent.title}
                            </Badge>
                          )}
                          {cat && (
                            <Badge colorClass={CATEGORY_COLORS[cat.color]?.chip ?? CATEGORY_COLORS.slate.chip}>
                              <span className={cn("h-1.5 w-1.5 rounded-full", CATEGORY_COLORS[cat.color]?.dot ?? CATEGORY_COLORS.slate.dot)} aria-hidden />
                              {cat.name}
                            </Badge>
                          )}
                          <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABELS[t.status]}</Badge>
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-slate-500" title={`${pr.label} priority`}>
                        <span className={cn("h-2 w-2 rounded-full", pr.cls)} aria-hidden />
                        <span className="sr-only">{pr.label} priority</span>
                      </span>
                      {t.dueDate && (
                        <span className={cn("w-20 shrink-0 text-right text-xs", g.key === "overdue" ? "font-semibold text-rose-600" : g.key === "today" ? "font-semibold text-amber-700" : "text-slate-500")}>
                          {dueLabel(t.dueDate, today)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
