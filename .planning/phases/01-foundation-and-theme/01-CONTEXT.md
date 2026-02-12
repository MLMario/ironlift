# Phase 1: Foundation and Theme - Context

**Gathered:** 2026-02-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Expo project scaffolding, theme system, navigation skeleton, and Supabase client connection -- the substrate every subsequent screen is built on. Placeholder screens only; no business logic, no auth flow, no data fetching beyond a Supabase connection test.

Requirements: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06

</domain>

<decisions>
## Implementation Decisions

### Theme system
- ThemeProvider React Context + `useTheme()` hook (Decision 7a, UI-02)
- Semantic token names: `surface`, `textPrimary`, `border`, etc. -- never literal color names (Decision 7b, UI-01)
- Dark mode only at launch; token structure supports future light mode via same keys, different values (Decision 7b)
- Token categories: colors, spacing, radii, typography (Roadmap success criteria #2)
- All token values extracted from the web app's CSS custom properties -- web app is the canonical source of truth (Decision 7, UI-05)

### Styling approach
- All components hand-rolled with `StyleSheet.create()` -- no UI component libraries (Decision 7, UI-03)
- System font (SF Pro) only -- no custom fonts, no font loading (Decision 7c, UI-04)
- Minimum 44px tap target on all interactive elements (UI-06)
- No inline styles except dynamic values depending on props/state

### Navigation skeleton
- Expo Router file-based routing (Decision 6a)
- Hub-and-spoke: dashboard is sole persistent screen (Decision 6)
- No tab bar (Decision 6)
- Layout groups: root layout, auth layout, and main layout as Expo Router layout groups (Roadmap success criteria #4)
- All screens are empty placeholders in Phase 1 -- just enough to verify navigation structure works
- Presentation styles configured in layout: modals for template editor, stack push for workout, bottom sheet for settings (Decision 6b)

### Supabase client
- Direct Supabase with RLS -- no API layer, no Edge Functions (Decision 4)
- Token storage via `expo-sqlite/localStorage` adapter passed as custom `storage` to Supabase client init (Decision 5a)
- Env vars adapted from web's Vite-specific vars to Expo mechanism (Decision 2c)
- Connection verified by a test query or auth ping (Roadmap success criteria #5)

### Web app port (Phase 1 scope)
- Copy as-is: `sql/` schema files for database reference (Decision 2a)
- Copy as-is: `src/types/database.ts` and `src/types/services.ts` (Decision 2a)
- Translate: Web app CSS custom properties (colors, spacing, radii, typography) into TypeScript theme object (Roadmap)
- Reference: Web app stylesheets for exact design token values (Roadmap)

### Claude's Discretion
- Theme object structure (flat vs nested organization of tokens)
- Expo SDK version selection (latest stable)
- Env var configuration approach (expo-constants, .env, etc.)
- Placeholder screen content and styling
- Auth/main layout group naming convention
- tsconfig path alias configuration

</decisions>

<specifics>
## Specific Ideas

- Web app CSS custom properties are the pixel-accurate reference for all token values -- researcher must extract these from `Apps/exercise_tracker_app/` stylesheets
- The navigation file structure is defined in Decision 6c of `docs/app_develop_decision.md` (includes exact file paths)
- New Architecture is required (Expo Go since SDK 52, SDK 55 removes opt-out) -- not optional (Decision 1c)
- Development on Windows PC + Expo Go on physical iPhone over Wi-Fi (Decision 1e)

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope. All decisions were pre-captured in existing documentation.

</deferred>

---

*Phase: 01-foundation-and-theme*
*Context gathered: 2026-02-12*
