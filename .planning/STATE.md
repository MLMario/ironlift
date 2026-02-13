# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** The core workout loop -- pick a template, log sets with weight/reps, finish and save -- must work flawlessly, including fully offline.
**Current focus:** Phase 3 (Exercise Library) complete -- ready for Phase 4 (Templates and Dashboard)

## Current Position

Phase: 3 of 7 (Exercise Library) -- COMPLETE
Plan: 3 of 3 in current phase
Status: Phase complete, ready for Phase 4 planning
Last activity: 2026-02-13 -- Completed 03-03-PLAN.md (exercise picker modal)

Progress: [██████████░░░░░░░░░░] ~48%

## Performance Metrics

**Velocity:**
- Total plans completed: 11
- Average duration: ~4.3 min (including human verification)
- Total execution time: ~48 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation and Theme | 3/3 | ~29 min | ~10 min |
| 2. Authentication | 5/5 | ~12 min | ~2 min |
| 3. Exercise Library | 3/3 | ~7 min | ~2.3 min |

**Recent Trend:**
- Last 5 plans: 02-05 (<1 min), 03-01 (~2 min), 03-02 (~1.5 min), 03-03 (~3 min)
- Trend: Phase 3 completed in ~7 min total -- 3 plans building service, hook, components, and modal

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
- [02-03]: Email preserved across login/register tab switches (cleared only on successful registration)
- [02-03]: Password and confirmPassword cleared on all view transitions for security
- [02-03]: successMessage prop on ResetPasswordForm kept as null in sign-in.tsx (reserved for future use)
- [02-04]: reset-password screen placed outside both Protected guard groups -- setSession() triggers isLoggedIn=true mid-flow
- [02-04]: Temporary logout button on dashboard placeholder (replaced in Phase 7 settings bottom sheet)
- [02-05]: reset-password declared AFTER isLoggedIn group to fix redirect scan order -- Expo Router finds index first on login
- [03-01]: Exercise service ported as-is from web app -- zero logic changes, only import paths
- [03-01]: Cache key ironlift:exercises with no expiry timestamps -- best-effort caching
- [03-01]: AsyncStorage cache errors logged but never thrown (cache is best-effort)
- [03-02]: sortExercises: user exercises first, system second, alphabetical within (case-insensitive localeCompare)
- [03-02]: CategoryChips uses ScrollView (not FlatList) for 8 fixed items
- [03-02]: ITEM_HEIGHT=60 exported for FlatList getItemLayout optimization
- [03-02]: No Cardio in CATEGORIES or FORM_CATEGORIES per user decision and DB constraint
- [03-03]: ExercisePickerModal is a component (not a route) -- uses RN Modal, not Expo Router modal
- [03-03]: Custom category dropdown built inline (no @react-native-picker/picker) -- not in approved library list
- [03-03]: Modal state resets on every open via useEffect on visible prop
- [03-03]: Inline create auto-selects the new exercise and closes the modal (onSelect callback)
- [03-03]: Duplicate exercise name rejection with user-friendly error message

### Pending Todos

- Supabase Dashboard configuration needed (see 02-USER-SETUP.md): redirect URL, email confirmation, password length

### Blockers/Concerns

- [Research]: @gorhom/bottom-sheet has LOW confidence on SDK 54 compatibility -- test early, prepare hand-rolled fallback (affects Phase 7)
- [Research]: New Architecture acceptance needed -- Expo Go SDK 54 defaults to it, constitution says classic

## Session Continuity

Last session: 2026-02-13
Stopped at: Completed 03-03-PLAN.md (exercise picker modal) -- Phase 3 complete
Resume file: None
