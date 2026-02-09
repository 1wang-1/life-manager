# Life Manager Desktop - Design

## 1. Product Scope
A Windows desktop app for task management + timer (pomodoro/forward/countdown) + music playback with a soft, card-based UI. The first release includes the full task flow, timer modes, stats, notifications, and third-party music playback with a film-like focus mode.

## 2. Goals
- Manage tasks with categories, priority, and status flow.
- Provide three timer modes: pomodoro, forward count, countdown.
- Show stats and insights on completion and focus time.
- Enable music playback with search, playlists, recent, and favorites.
- Deliver a calm, low-fatigue UI based on mint/olive tones.

## 3. Non-Goals (MVP)
- Multi-device cloud sync (local-only for v1).
- Collaboration or shared lists.
- Advanced automation (rules, scripts).

## 4. UX & Visual Direction
- Layout: left navigation + right content area, card-based sections.
- Tone: calm, minimal, soft shadows, rounded corners.
- Palette: primary mint/olive (#66CC99 / #8EAC50), background beige (#F2F2F2), text dark gray (#333333), accent coral/blue (#FF6F61 / #0099CC).
- Music mode: optional film-style focus view, can be linked to timer but not forced.

## 5. Tech Stack
- UI: WinUI 3 + .NET 8
- Pattern: MVVM
- Storage: SQLite + EF Core
- Notifications: Windows Toast
- Audio: local audio for effects; separate service for music playback

## 6. Core Modules
1) Task Management
- CRUD, categories, priority, status (not started/in progress/completed)
- Task cards with quick actions

2) Timer
- Pomodoro, forward, countdown
- Custom duration
- Task binding and auto status update

3) Stats
- Completed count
- Focus time
- Weekly/monthly trend charts

4) Music
- Third-party login + alternative sources
- Search, playlists, recent, favorites
- Playback queue and film focus mode

5) Settings
- Theme colors
- Default timer settings
- Notification and sound toggles
- Music source selection

## 7. Data Model (SQLite)
- Tasks: Id, Title, Description, CategoryId, Priority, Status, EstimatedMinutes, ActualMinutes, CreatedAt, UpdatedAt
- Categories: Id, Name, Color
- FocusSessions: Id, TaskId, Mode, PlannedMinutes, ActualSeconds, StartedAt, EndedAt, Status
- Events: Id, Type, RefId, Payload, CreatedAt
- MusicSettings: Provider, AuthState, CachedRecent, CachedFavorites
- UserSettings: Theme, PomodoroDefaults, Notification, Sound

## 8. Data Flow
- Start timer -> create focus session -> set task status to in progress -> update UI -> optional music focus mode.
- End timer -> write event -> update stats -> notify user -> user confirms completion -> update task status.
- Stats pages aggregate data from FocusSessions and Events by day/week/month.

## 9. Error Handling
- Timer drift: compensate with system time diff after sleep/resume.
- Music login error: fallback to built-in/local source, keep timer running.
- Storage error: show warning, keep UI responsive, log details.

## 10. Testing
- Unit tests: status transitions, timer compensation, stats aggregation.
- Integration tests: timer + task binding + event logging + stats view.
- Manual tests: music login, focus mode playback, notifications.

## 11. Release
- Package: MSIX
- Install: desktop shortcut + start menu
- Update: future auto-update support
