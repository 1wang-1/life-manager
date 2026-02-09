# LX In-App Integration Design

**Goal:** Provide an in-app LX-like music experience (search, play, favorites, basic controls) without launching external LX Music.

**Scope:**
- In-app search and playback via LX source scripts (no external app launch).
- Favorites playlist and existing playback controls.
- Clear in-app guidance and error messaging when sources are missing or fail.

**Non-goals:**
- No external LX control (no Scheme URL, no 23330 Open API panel).
- No iTunes fallback or 30s preview.
- No lyrics or advanced LX parity beyond minimal feature set.

## Architecture
Reuse existing layers:
- **MusicPage**: UI, user actions, source status, alerts.
- **MusicService**: online search and play URL retrieval via LX adapter.
- **LxPluginAdapter**: script runtime and request shim for LX source scripts.
- **useMusicStore**: playback state, playlists, favorites.

Only modify behaviors to enforce “LX only” in-app flow and remove external Scheme entrypoints.

## Data Flow
1. User loads a source (URL or local script) in “Source Management”.
2. Source script registers callbacks via `lxAdapter`.
3. Search uses `MusicService.searchOnline` -> `lxAdapter.search`.
4. Selecting a track triggers `MusicService.getPlayUrl` -> `lxAdapter.getMusicUrl`.
5. Player updates track URL and plays in the app’s audio element.

If no source is loaded or the script fails, search returns empty and the UI presents guidance.

## UI/UX
- Remove the “LX Play” (Scheme URL) button from the search page.
- Keep the “Source Management” page with recommended sources and local import.
- On search page, show a prominent banner when source is not ready (plus a button to open settings).
- On search/play failure, show an alert and keep the banner visible.

## Error Handling
- Source load: show success/failure alerts, persist source info, auto-load last source.
- Search/play: on failure, show alert and keep “source not ready” banner if applicable.
- Log errors to the existing debug log (lx-debug.txt) for diagnosis.

## Storage
- Continue using `music_sources_v2` and `music_last_source_id`.
- Legacy `music_custom_sources` is only read for migration.

## Testing
- Update `MusicService.searchOnline` tests: remove iTunes fallback expectations.
- Update `MusicPage` UI tests: ensure Scheme entry is removed and guidance text exists.
- Keep `LxPluginAdapter` tests for rawScript/request behavior.

## Risks and Mitigations
- **Source scripts expire**: encourage local script import and keep recommended mirrors.
- **Network instability**: surface errors clearly and avoid silent fallbacks.
- **Script compatibility**: keep adapter shims (request/body/rawScript) stable.
