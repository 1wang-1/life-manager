# Life Manager Desktop (Electron) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Windows desktop MVP for tasks + timer + music playback using Electron, with local storage and stats.

**Architecture:** Electron app with main/renderer split, shared domain logic in a TypeScript module, storage via SQLite in the main process, UI in the renderer with IPC bridge.

**Tech Stack:** Electron, TypeScript, Vite (electron-vite), SQLite (better-sqlite3), Vitest

**Relevant skills:** @superpowers:test-driven-development, @superpowers:verification-before-completion, @superpowers:using-git-worktrees

---

### Task 1: Initialize Electron App + Test Harness

**Files:**
- Create: `package.json`
- Create: `electron.vite.config.ts`
- Create: `src/main/index.ts`
- Create: `src/preload/index.ts`
- Create: `src/renderer/src/main.tsx`
- Create: `src/shared/models/` (folder)
- Create: `tests/shared/smoke.test.ts`

**Step 1: Remove old .NET scaffolding (if present)**

Run:
- `Remove-Item -Recurse -Force LifeManager.sln, src\LifeManager.Core, src\LifeManager.Data, src\LifeManager.App, tests\LifeManager.Core.Tests`

**Step 2: Create the Electron project**

Run:
- `npm create electron-vite@latest life-manager-desktop -- --template react-ts`
- `cd life-manager-desktop`

**Step 3: Add Vitest for shared tests**

Run:
- `npm install -D vitest`
- Add script `"test:shared": "vitest"` in `package.json`

**Step 4: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('test harness is alive', () => {
    expect(true).toBe(true);
  });
});
```

Save as `tests/shared/smoke.test.ts`.

**Step 5: Run test to verify it passes**

Run: `npm run test:shared`
Expected: PASS.

**Step 6: Commit**

```bash
git add package.json electron.vite.config.ts src tests
git commit -m "chore: scaffold electron app and test harness"
```

---

### Task 2: Task Model and Status

**Files:**
- Create: `src/shared/models/task.ts`
- Create: `tests/shared/task.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { createTask, TaskStatus, Priority } from '../../src/shared/models/task';

describe('task model', () => {
  it('defaults to not started with normal priority', () => {
    const task = createTask('Write plan');
    expect(task.status).toBe(TaskStatus.NotStarted);
    expect(task.priority).toBe(Priority.Normal);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:shared`
Expected: FAIL because model does not exist.

**Step 3: Write minimal implementation**

```ts
export enum TaskStatus {
  NotStarted = 'not_started',
  InProgress = 'in_progress',
  Completed = 'completed'
}

export enum Priority {
  Low = 'low',
  Normal = 'normal',
  High = 'high'
}

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
};

export function createTask(title: string): Task {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title,
    status: TaskStatus.NotStarted,
    priority: Priority.Normal,
    createdAt: now,
    updatedAt: now
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:shared`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/shared/models/task.ts tests/shared/task.test.ts
git commit -m "feat: add task model and status"
```

---

### Task 3: Categories and Task Metadata

**Files:**
- Create: `src/shared/models/category.ts`
- Modify: `src/shared/models/task.ts`
- Create: `tests/shared/category.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { createCategory } from '../../src/shared/models/category';
import { createTask } from '../../src/shared/models/task';

describe('category', () => {
  it('task can attach category', () => {
    const category = createCategory('Work', '#66CC99');
    const task = createTask('Prepare slides');
    task.categoryId = category.id;
    expect(task.categoryId).toBe(category.id);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:shared`
Expected: FAIL because category model does not exist.

**Step 3: Write minimal implementation**

```ts
export type Category = {
  id: string;
  name: string;
  colorHex: string;
};

export function createCategory(name: string, colorHex: string): Category {
  return {
    id: crypto.randomUUID(),
    name,
    colorHex
  };
}
```

Update `Task` to include `categoryId?: string`.

**Step 4: Run test to verify it passes**

Run: `npm run test:shared`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/shared/models tests/shared/category.test.ts
git commit -m "feat: add categories"
```

---

### Task 4: Focus Sessions and Timer Modes

**Files:**
- Create: `src/shared/models/focus-session.ts`
- Create: `tests/shared/focus-session.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { createFocusSession, TimerMode } from '../../src/shared/models/focus-session';

describe('focus session', () => {
  it('stores planned minutes and mode', () => {
    const session = createFocusSession(TimerMode.Pomodoro, 25);
    expect(session.plannedMinutes).toBe(25);
    expect(session.mode).toBe(TimerMode.Pomodoro);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:shared`
Expected: FAIL because model does not exist.

**Step 3: Write minimal implementation**

```ts
export enum TimerMode {
  Pomodoro = 'pomodoro',
  Forward = 'forward',
  Countdown = 'countdown'
}

export type FocusSession = {
  id: string;
  mode: TimerMode;
  plannedMinutes: number;
  actualMinutes: number;
  startedAt?: string;
  endedAt?: string;
};

export function createFocusSession(mode: TimerMode, plannedMinutes: number): FocusSession {
  return {
    id: crypto.randomUUID(),
    mode,
    plannedMinutes,
    actualMinutes: 0
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:shared`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/shared/models tests/shared/focus-session.test.ts
git commit -m "feat: add focus session model"
```

---

### Task 5: Timer Engine (Shared Service)

**Files:**
- Create: `src/shared/services/clock.ts`
- Create: `src/shared/services/timer-engine.ts`
- Create: `tests/shared/timer-engine.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { FakeClock } from './utils/fake-clock';
import { TimerEngine } from '../../src/shared/services/timer-engine';

describe('timer engine', () => {
  it('countdown completes at zero', () => {
    const clock = new FakeClock(new Date('2026-01-01T12:00:00Z'));
    const engine = new TimerEngine(clock, 25 * 60 * 1000);

    engine.startCountdown();
    clock.advance(25 * 60 * 1000);
    engine.tick();

    expect(engine.isCompleted).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:shared`
Expected: FAIL because service does not exist.

**Step 3: Write minimal implementation**

```ts
export interface Clock {
  now(): number;
}

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}

export class TimerEngine {
  private startTime: number | null = null;
  public isCompleted = false;

  constructor(private clock: Clock, private durationMs: number) {}

  startCountdown(): void {
    this.startTime = this.clock.now();
    this.isCompleted = false;
  }

  tick(): void {
    if (this.startTime === null) return;
    if (this.clock.now() - this.startTime >= this.durationMs) {
      this.isCompleted = true;
    }
  }
}
```

Add a test helper `tests/shared/utils/fake-clock.ts`.

**Step 4: Run test to verify it passes**

Run: `npm run test:shared`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/shared/services tests/shared/timer-engine.test.ts tests/shared/utils/fake-clock.ts
git commit -m "feat: add timer engine"
```

---

### Task 6: Stats Aggregation

**Files:**
- Create: `src/shared/services/stats-aggregator.ts`
- Create: `tests/shared/stats-aggregator.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { aggregateDailyFocus } from '../../src/shared/services/stats-aggregator';
import { FocusSession, TimerMode } from '../../src/shared/models/focus-session';

describe('stats aggregation', () => {
  it('aggregates focus minutes by day', () => {
    const sessions: FocusSession[] = [
      { id: 'a', mode: TimerMode.Pomodoro, plannedMinutes: 25, actualMinutes: 25, endedAt: '2026-01-01T10:00:00Z' },
      { id: 'b', mode: TimerMode.Pomodoro, plannedMinutes: 25, actualMinutes: 25, endedAt: '2026-01-01T14:00:00Z' }
    ];

    const stats = aggregateDailyFocus(sessions);
    expect(stats['2026-01-01']).toBe(50);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:shared`
Expected: FAIL because aggregator does not exist.

**Step 3: Write minimal implementation**

```ts
import { FocusSession } from '../models/focus-session';

export function aggregateDailyFocus(sessions: FocusSession[]): Record<string, number> {
  return sessions
    .filter(session => session.endedAt)
    .reduce<Record<string, number>>((acc, session) => {
      const day = session.endedAt!.slice(0, 10);
      acc[day] = (acc[day] ?? 0) + session.actualMinutes;
      return acc;
    }, {});
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:shared`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/shared/services/stats-aggregator.ts tests/shared/stats-aggregator.test.ts
git commit -m "feat: add stats aggregation"
```

---

### Task 7: SQLite Repository (Main Process)

**Files:**
- Create: `src/main/data/db.ts`
- Create: `src/main/data/task-repo.ts`
- Modify: `package.json`
- Create: `tests/shared/task-repo.schema.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { createSchemaSql } from '../../src/main/data/db';

describe('db schema', () => {
  it('creates tasks table', () => {
    expect(createSchemaSql()).toContain('CREATE TABLE tasks');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:shared`
Expected: FAIL because db module does not exist.

**Step 3: Write minimal implementation**

```ts
export function createSchemaSql(): string {
  return `
    CREATE TABLE tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      category_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `;
}
```

Add dependency:
- `npm install better-sqlite3`

**Step 4: Run test to verify it passes**

Run: `npm run test:shared`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/main/data/db.ts tests/shared/task-repo.schema.test.ts package.json package-lock.json
git commit -m "feat: add sqlite schema"
```

---

### Task 8: IPC Bridge for Tasks and Timer

**Files:**
- Modify: `src/preload/index.ts`
- Create: `src/main/ipc/task-ipc.ts`
- Create: `src/main/ipc/timer-ipc.ts`
- Create: `src/renderer/src/bridge.d.ts`

**Step 1: Write the failing test**

This is an integration/IPC task. Use a type-level check.

**Step 2: Run type check to verify it fails**

Run: `npm run typecheck`
Expected: FAIL because bridge types are missing.

**Step 3: Write minimal implementation**

- Define IPC channels for task CRUD and timer start/stop.
- Expose `window.api` in preload.
- Add `bridge.d.ts` to declare types for renderer.

**Step 4: Run type check to verify it passes**

Run: `npm run typecheck`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/preload src/main/ipc src/renderer/src/bridge.d.ts
git commit -m "feat: add ipc bridge"
```

---

### Task 9: Renderer Shell and Navigation

**Files:**
- Modify: `src/renderer/src/App.tsx`
- Create: `src/renderer/src/pages/TasksPage.tsx`
- Create: `src/renderer/src/pages/TimerPage.tsx`
- Create: `src/renderer/src/pages/MusicPage.tsx`
- Create: `src/renderer/src/pages/StatsPage.tsx`
- Create: `src/renderer/src/pages/SettingsPage.tsx`

**Step 1: Write the failing test**

UI shell task. Use build check.

**Step 2: Run build to verify it fails**

Run: `npm run build`
Expected: FAIL because pages do not exist.

**Step 3: Implement minimal shell**

- Add left navigation and route-like state in App.
- Create placeholder pages and render selected page.

**Step 4: Run build to verify it passes**

Run: `npm run build`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/renderer/src
git commit -m "feat: add renderer shell and pages"
```

---

### Task 10: Music Source Selection (Renderer + Shared)

**Files:**
- Create: `src/shared/models/music.ts`
- Create: `src/renderer/src/pages/MusicPage.tsx`
- Create: `tests/shared/music.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { MusicSource, defaultMusicState } from '../../src/shared/models/music';

describe('music state', () => {
  it('defaults to no source', () => {
    expect(defaultMusicState().source).toBe(MusicSource.None);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:shared`
Expected: FAIL because music model does not exist.

**Step 3: Write minimal implementation**

```ts
export enum MusicSource {
  None = 'none',
  ThirdParty = 'third_party',
  Local = 'local'
}

export type MusicState = {
  source: MusicSource;
  lastQuery?: string;
};

export function defaultMusicState(): MusicState {
  return { source: MusicSource.None };
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:shared`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/shared/models/music.ts tests/shared/music.test.ts src/renderer/src/pages/MusicPage.tsx
git commit -m "feat: add music source selection"
```

---

Plan complete and saved to `docs/plans/2026-01-18-life-manager-implementation.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?
