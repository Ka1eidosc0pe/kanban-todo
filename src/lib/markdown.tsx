import { Fragment, type ReactNode } from "react";
import { cn } from "@/components/ui/cn";

// A tiny markdown subset rendered straight to React elements (never raw HTML, so notes can't inject markup).

const TASK = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/;
const BULLET = /^\s*[-*]\s+(.*)$/;
const ORDERED = /^\s*\d+\.\s+(.*)$/;
const lines = (src: string) => src.split(/\r?\n/);

/** Done/total for `- [ ]` / `- [x]` items in the notes (null when there are none). */
export function checklistCounts(notes: string): { done: number; total: number } | null {
  let done = 0;
  let total = 0;
  for (const l of lines(notes)) {
    const m = TASK.exec(l);
    if (m) {
      total++;
      if (m[1] !== " ") done++;
    }
  }
  return total ? { done, total } : null;
}

/** Flip `[ ]` <-> `[x]` on exactly one line of the notes source. */
export function toggleChecklistLine(notes: string, lineIndex: number): string {
  return lines(notes)
    .map((l, i) => (i === lineIndex ? l.replace(/\[([ xX])\]/, (_, c) => (c === " " ? "[x]" : "[ ]")) : l))
    .join("\n");
}

const safeUrl = (raw: string): string | null => {
  try {
    const u = new URL(raw);
    return ["http:", "https:", "mailto:"].includes(u.protocol) ? raw : null;
  } catch {
    return null;
  }
};

const linkCls = "text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:text-indigo-800 dark:hover:text-indigo-200";
const external = { target: "_blank", rel: "noopener noreferrer" } as const;

// code | [text](url) | **bold** | *italic* | _italic_ | bare URL
const INLINE = /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|\*\*(.+?)\*\*|\*([^*\s](?:[^*]*[^*\s])?)\*|(?<![\w])_([^_\n]+)_(?!\w)|(https?:\/\/[^\s<]+)/g;

function inline(text: string, key = ""): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}${n++}`;
    if (m[1] !== undefined) {
      out.push(<code key={k} className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[0.85em] text-slate-800 dark:text-slate-100">{m[1]}</code>);
    } else if (m[2] !== undefined) {
      const href = safeUrl(m[3]);
      out.push(href ? <a key={k} href={href} {...external} className={linkCls}>{m[2]}</a> : m[0]); // unsafe scheme: show as plain text
    } else if (m[4] !== undefined) {
      out.push(<strong key={k} className="font-semibold">{inline(m[4], k)}</strong>);
    } else if (m[5] !== undefined || m[6] !== undefined) {
      out.push(<em key={k}>{inline((m[5] ?? m[6])!, k)}</em>);
    } else {
      const url = m[7].replace(/[.,;:!?)\]]+$/, ""); // trailing punctuation belongs to the sentence
      const href = safeUrl(url);
      out.push(href ? <a key={k} href={href} {...external} className={linkCls}>{url}</a> : url);
      out.push(m[7].slice(url.length));
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "ul"; items: { line: number; text: string; checked?: boolean }[] }
  | { kind: "ol"; items: { line: number; text: string }[] };

function parse(src: string): Block[] {
  const blocks: Block[] = [];
  lines(src).forEach((l, i) => {
    const top = blocks[blocks.length - 1];
    const task = TASK.exec(l);
    const bullet = task ? null : BULLET.exec(l);
    const ordered = task || bullet ? null : ORDERED.exec(l);
    if (task || bullet) {
      const item = { line: i, text: (task ?? bullet)![task ? 2 : 1], ...(task ? { checked: task[1] !== " " } : {}) };
      if (top?.kind === "ul") top.items.push(item);
      else blocks.push({ kind: "ul", items: [item] });
    } else if (ordered) {
      const item = { line: i, text: ordered[1] };
      if (top?.kind === "ol") top.items.push(item);
      else blocks.push({ kind: "ol", items: [item] });
    } else if (!l.trim()) {
      blocks.push({ kind: "p", lines: [] }); // blank line ends the current block (empty paragraphs are skipped on render)
    } else if (top?.kind === "p" && top.lines.length) top.lines.push(l);
    else blocks.push({ kind: "p", lines: [l] });
  });
  return blocks;
}

export function Markdown({ source, onToggle }: { source: string; onToggle?: (lineIndex: number) => void }) {
  return (
    <div className="flex flex-col gap-2 text-sm leading-relaxed text-slate-800 dark:text-slate-100 [overflow-wrap:anywhere]">
      {parse(source).map((b, bi) => {
        if (b.kind === "p") {
          if (!b.lines.length) return null;
          return (
            <p key={bi}>
              {b.lines.map((l, i) => (
                <Fragment key={i}>
                  {i > 0 && <br />}
                  {inline(l, `${bi}-${i}-`)}
                </Fragment>
              ))}
            </p>
          );
        }
        if (b.kind === "ol") {
          return (
            <ol key={bi} className="list-decimal pl-5">
              {b.items.map((it) => <li key={it.line}>{inline(it.text, `${it.line}-`)}</li>)}
            </ol>
          );
        }
        return (
          <ul key={bi} className="flex flex-col gap-0.5">
            {b.items.map((it) =>
              it.checked === undefined ? (
                <li key={it.line} className="flex gap-2">
                  <span aria-hidden className="text-slate-400">•</span>
                  <span>{inline(it.text, `${it.line}-`)}</span>
                </li>
              ) : (
                <li key={it.line} className="flex items-start gap-2">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={it.checked}
                    aria-label={`${it.checked ? "Uncheck" : "Check"}: ${it.text}`}
                    onClick={(e) => {
                      e.stopPropagation(); // don't switch the notes into edit mode
                      onToggle?.(it.line);
                    }}
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] leading-none focus-visible:outline-2 focus-visible:outline-indigo-500 dark:focus-visible:outline-indigo-400",
                      it.checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-400 dark:border-slate-500 bg-white dark:bg-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400",
                    )}
                  >
                    {it.checked && <span aria-hidden>✓</span>}
                  </button>
                  <span className={cn(it.checked && "text-slate-400 line-through")}>{inline(it.text, `${it.line}-`)}</span>
                </li>
              ),
            )}
          </ul>
        );
      })}
    </div>
  );
}
