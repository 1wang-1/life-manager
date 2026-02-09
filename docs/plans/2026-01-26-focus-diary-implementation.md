# Focus + Diary overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Provide a full-screen focus route, a home console that only previews focus controls, and a diary workspace for recording entries with persistence.

**Architecture:** Create new renderer pages (`FocusPage`, `DiaryPage`) and expand routing plus IPC (window controls). Home now defers to focus route for running timers and includes a diary card. Diary data lives in renderer storage (localStorage) with a simple DAO and autosave.

**Tech Stack:** React + TypeScript (Vite), Electron IPC, localStorage, Vitest for existing shared tests.

---

### Task 1: Focus page and route

**Files:**
- Create: `src/renderer/src/pages/FocusPage.tsx`
- Modify: `src/renderer/src/App.tsx`, `src/renderer/src/layout/MainLayout.tsx` (hide sidebar when route matches), `src/renderer/src/pages/HomePage.tsx`
- Test: manual focus route behavior (no automated tests yet); rely on shared tests staying green.

**Step 1:** Outline `FocusPage` component with 100vw/100vh container, centered panel, header info, timer display, large start/pause/stop buttons, stats footer. Include props for task/mode, re-use timer hooks.

**Step 2:** Add `/focus` route to router and optionally switch to `FocusPage` once status runs via `useEffect` in `HomePage`. Keep manual exit guard (ref) so user closing focus stays out.

**Step 3:** Ensure `HomePage` focus preview card now shows smaller timer, mentions current task/mode, and button triggers navigation to `/focus`.

**Step 4:** Run `npm run test:shared -- tests/shared/navigation-ui.test.ts tests/shared/theme-tokens.test.ts` (already existing).

**Step 5:** Commit focused change.

### Task 2: Home diary card and ephemeral controls

**Files:**
- Modify: `src/renderer/src/pages/HomePage.tsx`, `src/renderer/src/App.css`/`HomePage` styles if needed.
- Test: None; rely on visual verification.

**Step 1:** Update `HomePage` focus panel for smaller typography and label current task/mode.

**Step 2:** Add “今日随记” card summarizing last diary or prompt + button to go to `/diary`.

**Step 3:** Ensure button triggers navigation (e.g., `useNavigate` from React Router) to diary page.

**Step 4:** Verify layout/responsiveness manually.

**Step 5:** Commit home tweaks.

### Task 3: Diary notebook MVP

**Files:**
- Create: `src/renderer/src/pages/DiaryPage.tsx`, `src/renderer/src/store/useDiaryStore.ts` (or hook), `src/renderer/src/components/DiaryList.tsx` if needed, `src/renderer/src/components/DiaryEditor.tsx`.
- Modify: `src/renderer/src/App.tsx` (add route), `src/renderer/src/components/common/Sidebar.tsx` (add diary nav item), `src/renderer/src/App.css` (styles for diary page/card).
- Test: Vitest not configured; rely on manual smoke.

**Step 1:** Implement diary store module using localStorage: load entries sorted by date desc, auto-save with debounce, support create/update/delete functions, expose selectors.

**Step 2:** Build `DiaryPage` with left column list (date/title) that selects entry; default to today’s entry (create if missing); support delete button per entry.

**Step 3:** Right column editor includes title input + textarea content, auto-save on change (debounce 500ms). Provide “New Today” button updating selection, and delete control.

**Step 4:** Add diary route & sidebar link; ensure `localStorage` key includes entries as JSON.

**Step 5:** Manual testing for persistence, creation, deletion, editing, navigation (including newly added diary card linking from home).

**Step 6:** Commit diary feature.

### Task 4: Window maximize/restore policy follow-through

**Files:**
- Modify: `electron/main.ts`, `electron/preload.ts`, `src/renderer/src/bridge.d.ts` (if not already), `HomePage/FocusPage` effects to call `window.api.window.maximize/restore`.
- Test: Manual behavior when focus page is entered/exited and when user manually closes, verifying restore only when auto-maximized.

**Step 1:** Expose IPC handlers for `window:maximize` and `window:restore` (1 call ensures main window tracked globally).

**Step 2:** In focus effect, maximize window only when entering focus automatically; track whether maximize was auto triggered (e.g., ref) and restore when timer stops if auto maximize still flagged.

**Step 3:** Provide user button inside focus page to toggle fullscreen (if desired) without auto restore hooking (separate user flag).

**Step 4:** Manual testing (start timer -> focus page -> maximize -> stop -> restore; manual exit -> no automatic focus/restore; user fullscreen -> not auto restored.)

**Step 5:** Commit window-control adjustments.
