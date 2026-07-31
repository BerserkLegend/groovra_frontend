# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Groovra — a React + TypeScript + Vite music-streaming SPA (frontend only; talks to a separate backend gateway). PWA-enabled, bilingual (uk/en), with a global audio player, playlists, likes, history, and an AI-mix feature.

## Commands

```bash
npm run dev       # vite dev server (port 5178, see vite.config.ts)
npm run build      # tsc -b && vite build — type-checks via project references, then bundles
npm run lint        # eslint .
npm run preview      # serve the production build locally
```

There is no test runner wired up. `vitest.setup.ts` and `@testing-library/jest-dom` exist but `vitest` itself is not a dependency and no `test` script exists — don't assume tests can be run until this is actually set up.

**Type-checking gotcha:** the root `tsconfig.json` is a references-only file (`"files": []`). Running `tsc --noEmit -p .` or `tsc --noEmit -p tsconfig.json` silently checks nothing and exits 0. To actually type-check, use `tsc -b` (what `npm run build` does) or `tsc --noEmit -p tsconfig.app.json` directly.

## Environment

Copy `.env.example` to `.env.local` (gitignored):
- `VITE_GATEWAY_URL` — backend gateway base URL. `src/api/api-client.ts` builds every API call as an absolute URL (`${GATEWAY_URL}/...`), so it's read directly from env. There is no dev-server proxy — a leftover blanket `/auth` proxy rule used to intercept the real `/auth/callback` frontend route (Google OAuth landing page) as if it were an API call, 404ing before the app could ever load; it was removed, and the one relative-path caller (`track.tsx`'s lyrics fetch) was switched to `GATEWAY_URL` too. Always use `GATEWAY_URL`, never a relative `/music`/`/auth` path.
- `VITE_GOOGLE_CLIENT_ID` — Google OAuth client ID (`@react-oauth/google`).

## Architecture

### Provider/router nesting (`src/App.tsx`)

```
ProfileProvider > PlayerProvider > PlaylistModalProvider > Router > Routes
                                                          > PlaylistModal (mounted once, outside <Router>, app-wide)
```

Cross-cutting UI (like "add to playlist") follows this pattern: a context provider holds the shared state (`playlist-modal-context.tsx`), any component can trigger it (`AddToPlaylistButton` calls `openModal(trackId)`), and a single modal component is mounted once at the app root and reads from context — not re-mounted per page. Follow this pattern for other app-wide overlays (toasts, dialogs) rather than duplicating modal JSX per page.

### Routing (`/:lang?` prefix)

All routes live under an optional `:lang` param (`/main`, `/en/main`). `LanguageSync` reconciles the URL prefix, `i18next`'s active language, and `localStorage['lang']` on every navigation (uk = no prefix, en = `/en` prefix). `LanguageRedirect`/`WildcardRedirect` handle `/` and unknown paths.

Protected app routes (`profile`, `main`, `playlists`, `ai-mix`, `downloads`, `search`, `library`, `liked`, `track`, etc.) are nested under one `<Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>` — `Layout` renders the sidebar nav, header/search bar, and the fixed footer player dock, with the actual page rendered via `<Outlet />`. Auth-flow pages (`login`, `reg`, `create`, `confirm-reg`, `forgotpassword`, `emailcod`, `passwordrecovery`, `auth/callback`) are wrapped in `PublicRoute` instead.

### Auth model

- The access token lives **only in memory** (`api/token-store.ts`) — it's lost on every full page reload.
- `localStorage['UserEmail']` is the persisted "is logged in" flag. `ProtectedRoute` allows access if there's an in-memory token **or** `UserEmail` is set; `PublicRoute` redirects away from auth pages if a token exists.
- On app mount (`App.tsx`'s `initApp`), if `UserEmail` is set (and we're not on the OAuth callback page), `refreshSession()` is called to re-mint an access token via `POST /auth/refresh` (cookie-based refresh token, `credentials: 'include'`).
- `apiFetch()` (`api/api-client.ts`) transparently retries once on a 401 by calling `refreshSession()`.
- If refresh fails anywhere, `clearAuth()` wipes `UserEmail` and does a **hard** `window.location.href` redirect to `/login`. This means any broken/unreachable backend during dev will bounce you straight back to the login screen, even mid-session.

### Player

`context/player-context.tsx` (`usePlayer()`) is the single source of truth for the track queue, the current track, and the actual `<audio>` element (via a ref owned by the provider) — playback controls, volume, shuffle/repeat, and track fetching (`fetchTracks`) all live here. It's a big context; read it before adding new playback-related state instead of introducing a second audio element or a parallel "currentTrack" elsewhere.

### Duplicate page implementations — know which one is live

`pages/main-page.tsx` (`Main`) has its **own internal tab state** (`Home`/`Search`/`Library`/`Playlist`/`Liked`/`AI`/`Downloads`/`Settings`) with its own copies of track-grid/library-row/playlist rendering and its own data fetching. Separately, there are dedicated routed pages that duplicate the same UI: `pages/search.tsx`, `pages/library.tsx`, `pages/liked.tsx`, `pages/playlists.tsx`, plus a shared `components/History.tsx`.

**The sidebar (`components/layout.tsx`) navigates to the dedicated routes** (`/search`, `/library`, `/liked`, `/playlists`), not to `Main`'s internal tabs — those tabs are effectively dead code for `Search`/`Library`/`Liked`/`Playlist` in normal navigation (only `Main`'s `Home`, `AI`, `Downloads`, `Settings` tabs are actually reached, via the `/main` route). When fixing a bug in one of these areas, check whether it needs fixing in `main-page.tsx`, the dedicated page, or both — they don't share rendering code, only the shared `usePlayer()`/`AddToPlaylistButton`/`PlaylistModal` pieces.

### Styling

No CSS modules — one large global stylesheet (`src/app.css`, ~3400 lines) plus a handful of per-page/per-component global CSS files (`profile.css`, `track.css`, `footer-from-json.css`, `LangSwitcher.css`, `pages/downloads/downloads.css`, `pages/ai-mix/**/style.css`, etc.), imported ad-hoc wherever needed. Class names are plain and global (`.MusicCard`, `.AddToPlaylistBtn`, `.LibraryRow`, ...) — reusing a name anywhere collides everywhere, and the same shared classes (`.ModalOverlay`, `.PlaylistModal`, `.AddToPlaylistBtn`, `.ToastNotification`, `.ActionBtn`) are intentionally reused across `main-page.tsx`, `search.tsx`, `library.tsx`, `liked.tsx`, `History.tsx`, and `track.tsx` for the add-to-playlist UI — don't fork them per page.

**Fragility gotcha:** an unbalanced `{`/`}` in `app.css` doesn't fail the build (Vite/esbuild don't validate CSS structurally the way they do JS/TS) — it silently makes the browser's CSS parser fold everything after the error into whatever block it's stuck inside (e.g. a stray unclosed `@media (max-width: 768px)` once silently disabled dozens of unrelated selectors including the whole playlist-modal UI on desktop, with zero build or lint error). After editing `app.css`, verify brace balance and actually check the rendered page — don't trust `vite build` succeeding as proof the CSS is correct.

### i18n

`react-i18next` + `i18next-browser-languagedetector`, initialized in `i18n/config.ts`, strings in `i18n/translations.ts` (`uk`/`en`, `uk` is the fallback). Usage is inconsistent across the codebase: some components use `t('key')` properly, others hardcode both languages inline with `i18n.language === 'en' ? '...' : '...'` ternaries instead of adding translation keys. Prefer `t()` for new/changed strings, but don't be surprised to find the ternary pattern in existing code.

### Misc

- `context/profile context.tsx` has a **space** in its filename — import as `'../context/profile context'`.
- PWA is configured via `vite-plugin-pwa` in `vite.config.ts` (autoUpdate service worker, manifest for "Groovra").
- Docker: multi-stage build (`node:24-alpine` builds `dist/`, served by `nginx:alpine`).


U can have example of styles here and design here(it will be really good if u take stuff from this): https://www.figma.com/files/team/1650525295618270183/all-projects?fuid=1561427304877208319 
from Team Project
