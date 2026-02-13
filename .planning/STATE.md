# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** The core workout loop -- pick a template, log sets with weight/reps, finish and save -- must work flawlessly, including fully offline.
**Current focus:** Phase 2: Authentication -- auth UI components complete, building auth screens next

## Current Position

Phase: 2 of 7 (Authentication)
Plan: 2 of 4 in current phase
Status: In progress
Last activity: 2026-02-13 -- Completed 02-02-PLAN.md (Auth UI components)

Progress: [█████░░░░░] ~25%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: ~7 min (including human verification)
- Total execution time: ~35 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation and Theme | 3/3 | ~29 min | ~10 min |
| 2. Authentication | 2/4 | ~6 min | ~3 min |

**Recent Trend:**
- Last 5 plans: 01-02 (~2 min), 01-03 (~22 min incl. human verify), 02-01 (~3 min), 02-02 (~3 min)
- Trend: Auth plans executing fast -- straightforward component creation with no blockers

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 7 phases derived from 78 requirements across 9 categories
- [Roadmap]: Offline infrastructure (CacheManager, WriteQueue, SyncManager) built within feature phases, not a standalone phase
- [Roadmap]: Dashboard requirements split across Phase 4 (template cards) and Phase 6 (chart cards) based on feature dependency
- [01-01]: @/* path alias maps to src/* (not root ./*) -- separates source from config
- [01-01]: App identity set to "IronLift" with "ironlift" slug and "ironlift://" deep link scheme
- [01-01]: .env used for Supabase credentials (not .env.local) -- added to .gitignore
- [01-02]: ThemeContext default = darkTheme (works outside ThemeProvider for testing)
- [01-02]: typography.fontFamily = undefined (RN system font default, no custom font loading)
- [01-02]: darkTheme uses `as const` for literal type autocomplete
- [01-02]: Supabase client throws on missing env vars at startup (runtime validation)
- [01-03]: isLoggedIn = true hardcoded in root layout for Phase 1 -- Stack.Protected guard ready for Phase 2
- [01-03]: getSession() is a local-only operation -- returns "successful" even without real .env credentials (acceptable for Phase 1)
- [01-03]: All 17 default Expo template files deleted -- hub-and-spoke replaces tabs entirely
- [02-01]: useAuth.tsx uses .tsx extension (not .ts) because AuthProvider renders JSX
- [02-01]: AppState auto-refresh at module level in supabase.ts per official Supabase pattern
- [02-01]: reset-password.tsx placeholder created for Expo Router route requirement (implementation in 02-04)
- [02-01]: create-account.tsx deleted -- register is internal to sign-in screen per CONTEXT.md
- [02-02]: getStyles(theme) pattern for StyleSheet.create with theme tokens -- avoids inline styles while keeping theme-awareness
- [02-02]: rgba approximations for ErrorBox/SuccessBox semi-transparent backgrounds (no semi-transparent tokens exist)

### Pending Todos

- Supabase Dashboard configuration needed (see 02-USER-SETUP.md): redirect URL, email confirmation, password length

### Blockers/Concerns

- [Research]: @gorhom/bottom-sheet has LOW confidence on SDK 54 compatibility -- test early, prepare hand-rolled fallback (affects Phase 7)
- [Research]: New Architecture acceptance needed -- Expo Go SDK 54 defaults to it, constitution says classic

## Session Continuity

Last session: 2026-02-13
Stopped at: Completed 02-02-PLAN.md (Auth UI components)
Resume file: None
