# Theme Picker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Introduce user-selectable color themes so the app can switch between the green/soft palette and new relaxed palettes while keeping structure simple.

**Architecture:** Add a theme registry that exposes CSS variable maps, surface it through the settings store, and apply it via DOM updates during render. The Settings page lists available swatches and persists the choice; `App.tsx` watches `selectedTheme` to reapply CSS variables.

**Tech Stack:** React + TypeScript (Vite), Zustand store, plain CSS variables, Electron Renderer.

---

### Task 1: Create theme registry + helper

**Files:**
- Create: `src/renderer/src/theme/themes.ts`
- Modify: `src/renderer/src/App.tsx:35-80`

**Step 1:** Define `ThemeName` union and `ThemePalette` interface plus `THEMES` map with entries `serene` (current green), `calm`, `sunrise` (per provided palette). Provide helper `applyTheme(name: ThemeName)` to set `document.documentElement.style.setProperty` for each key/value.

**Step 2:** Import the helper into `App.tsx` and in the `AppContent` component call `applyTheme(settings.selectedTheme)` whenever the setting changes (useEffect watching `settings.selectedTheme`).

**Step 3:** Ensure there is a default `selectedTheme` in settings store (add to `AppSettings`), defaulting to `'serene'`.

**Step 4:** Run `npm run lint` (if configured) or `npm run test` if existing theme tests; even if not, run `npm run test` to verify no regressions.

**Step 5:** Commit changes for Task 1.

### Task 2: Extend settings store + persistence

**Files:**
- Modify: `src/renderer/src/store/useSettingsStore.ts:9-40`
- Modify: `src/renderer/src/services/StorageService.ts` if needed to persist new field (likely no change).

**Step 1:** Update `AppSettings` type to include `selectedTheme: ThemeName`, update default value, storage, and update function accordingly.

**Step 2:** Ensure `SettingsPage` and any consumers read/write `selectedTheme` from the store.

**Step 3:** Run `npm run test` to ensure store updates still serialized correctly.

**Step 4:** Commit Task 2 adjustments.

### Task 3: Build Settings UI for theme choice

**Files:**
- Modify: `src/renderer/src/pages/SettingsPage.tsx:120-220` to add new section.
- Modify: `src/renderer/src/pages/SettingsPage.css` (or create `SettingsPage.css` block) for the swatch grid.

**Step 1:** Add a card section titled “主题风格” with buttons/swatches for each `ThemeName`; show color chips (use CSS gradient backgrounds) and description. On click call `updateSettings({ selectedTheme: name })`.

**Step 2:** Highlight the currently selected swatch with a border/outline and screen-reader friendly text; ensure buttons accessible (aria-pressed).

**Step 3:** Update CSS to style swatch buttons, add helper `.theme-swatch` class and `.selected`.

**Step 4:** Run `npm run lint` or `npm run test` to ensure new JSX passes.

**Step 5:** Commit Task 3.

### Task 4: Verify behavior cross-page

**Files:**
- Manual verification, no file changes.

**Step 1:** Start `npm run dev`, open Settings page, switch themes, and confirm both home/task pages reflect new variable sets without reload.

**Step 2:** Inspect dev tools to ensure CSS variables update on root.

**Step 3:** Document manual step or capture screenshot as needed for QA.

**Step 4:** No tests to run; mention manual checks above.

**Step 5:** Commit final documentation/notes if needed.
