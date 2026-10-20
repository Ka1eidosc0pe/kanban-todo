# Kanban To-Do

An interactive kanban to-do board with drag-and-drop cards, two ways of grouping them (by **status** and by **category**) plus a dated **agenda** list, and subtasks that appear as their own (visually distinct) cards. Everything is stored in your browser's `localStorage`. There is no backend, no accounts and no external APIs.

**Stack:** Next.js (App Router) · Tailwind CSS · TypeScript · localStorage

## Design requirements → how we meet them

| Requirement | Approach |
|---|---|
| **Flow** (first visit → core task → return) | See the flow diagrams below. |
| **Onboarding** | A first visit loads a populated sample board plus a short coach tour. There is never an empty screen. One click clears the samples. |
| **Coming back** | Autosave on every change. Last view and search filter are restored. A "Welcome back" strip summarises overdue, due-soon and in-progress work. |
| **Components** | One shared set of primitives (`Button`, `Badge`, `Modal`, `Drawer`, `Toast`, `EmptyState`...) and domain components (`TaskCard`, `Column`, `ViewSwitcher`...). |
| **Navigation** | Persistent header with a view switcher, URL-addressable views, breadcrumb in the task drawer, Esc/back closes overlays. |

## Features

- Drag cards between lists (changes **status** in Status view, **category** in Category view)
- **Status view:** Created → Planned → In progress → Completed → Archived
- **Category view:** Career, College, Personal + create, rename, recolor, delete your own (deleting offers *move tasks* or *delete tasks*, with undo)
- Tasks with notes, due date and priority
- Subtasks with their own independent status. They show as compact, dashed-border cards with a parent chip, and can be dragged like any card
- Search, plus filters (priority, category, due) and per-board sorting (manual, due date, priority)
- Undo toasts, keyboard-accessible drag-and-drop, and long-press drag on touch screens
- Keyboard shortcuts: `N` new task, `/` search, `Cmd/Ctrl+Z` undo, `?` shortcut list
- Relative due dates ("Today", "Tomorrow", "Fri") with a distinct due-today style
- Inline quick-add at the bottom of each column
- Collapsible columns and a WIP limit for "In progress"
- Reorder category columns by dragging their headers (or with the up/down buttons in Manage categories)
- Bulk actions: Shift/Cmd/Ctrl+click to select cards, then move, archive or delete them in one undoable step
- **Agenda view** (`?view=agenda`): a plain list of open tasks grouped Overdue, Today, Tomorrow, This week, Later and No due date, with search and filters applied and a checkbox to finish tasks
- **Recurring tasks:** repeat daily, on weekdays, weekly or monthly (needs a due date). Completing one creates the next occurrence (subtasks copied fresh); undo removes it again
- **Auto-archive:** the header menu can archive completed tasks after 1, 3, 7, 14 or 30 days (checked on load and hourly, with undo)
- **Weekly progress:** a quiet "done this week" count and completion streak above the board
- **Notes in light markdown:** bold, italic, code, links, lists and clickable `- [ ]` checklists; cards show a checklist count
- Filter-aware quick add: a task added into a column but hidden by the current filters tells you and offers to clear them
- **Dark mode:** System / Light / Dark in the header menu. "System" follows your OS live, the choice is remembered, and an inline script applies it before first paint so there is no flash

## User flows

### 1. Overall flow: first visit, core task, returning

```mermaid
flowchart TD
    A([Open app]) --> B{Saved data in localStorage?}
    B -- No --> C[Welcome: pre-filled sample board<br/>with tour tasks and subtasks]
    C --> D[Coach marks: drag a card, add a task,<br/>add a subtask, switch view]
    D --> E[Edit or delete samples,<br/>or 'Clear samples and start fresh']
    B -- Yes --> F[Welcome-back strip:<br/>overdue, due soon, in progress.<br/>Last view and filters restored]
    E --> G
    F --> G[Board]

    G --> V{View switcher}
    V --> V1[By Status:<br/>Created, Planned, In progress,<br/>Completed, Archived]
    V --> V2[By Category:<br/>Career, College, Personal, custom]
    V --> V3[Agenda:<br/>open tasks grouped by due date]

    G --> T1[Quick-add task]
    T1 --> T2[Task drawer:<br/>title, notes, category,<br/>status, due, priority]
    T2 --> T3[Add subtasks]
    T3 --> T4[Subtask cards appear on board,<br/>visually distinct, with parent chip]

    G --> M[Drag card between lists]
    M --> M1[Status view: changes status]
    M --> M2[Category view: changes category]

    V2 --> CG[Manage categories:<br/>create, rename, recolor, delete]
    CG --> CD{Delete category that has tasks?}
    CD --> CD1[Move tasks to another category]
    CD --> CD2[Delete tasks too, with undo toast]

    G --> S[Search and filter]
    G --> R([Close tab. Autosaved.<br/>Return later: back at step B])
```

### 2. Core task: create a task with subtasks

```mermaid
sequenceDiagram
    actor U as User
    participant B as Board
    participant D as Task drawer
    participant L as localStorage
    U->>B: Click "+ Add task" (or press N)
    B->>D: Open drawer (breadcrumb: Board › New task)
    U->>D: Enter title, pick category, status
    D->>L: Autosave
    U->>D: Add subtask(s)
    D->>L: Autosave
    U->>D: Close (Esc / ✕)
    D->>B: Task and subtask cards visible
    U->>B: Drag subtask to "Completed"
    B->>L: Autosave
    B-->>U: All subtasks done? Offer to complete the parent
```

### 3. Navigation map

```mermaid
flowchart LR
    H[Header: logo, view switcher, search, + Add, menu] --> BS[/board?view=status/]
    H --> BC[/board?view=category/]
    H --> BA[/board?view=agenda/]
    BS --> TD[Task drawer]
    BC --> TD
    BA --> TD
    BC --> CM[Manage categories modal]
    H --> MENU[Menu: auto-archive, reset, replay tour]
    TD -->|Esc / ✕ / back| BS
    TD -->|Esc / ✕ / back| BC
    TD -->|Esc / ✕ / back| BA
    CM -->|Done| BC
```

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Deploying

The app is fully static/client-side, so it deploys to Vercel with zero configuration.
