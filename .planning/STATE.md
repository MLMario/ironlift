# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** The core workout loop -- pick a template, log sets with weight/reps, finish and save -- must work flawlessly, including fully offline.
**Current focus:** Phase 5 gap closure complete (UAT round 2 fixes done). Ready for Phase 6 (Charts).

## Current Position

Phase: 5 of 7 (Active Workout) -- COMPLETE (with gap closure)
Plan: 8 of 8 in current phase (6 original + 2 gap closure)
Status: Complete
Last activity: 2026-02-14 -- Completed 05-08-PLAN.md (UAT round 2 cosmetic fixes)

Progress: [████████████████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 27
- Average duration: ~3.3 min (including human verification)
- Total execution time: ~90 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation and Theme | 3/3 | ~29 min | ~10 min |
| 2. Authentication | 5/5 | ~12 min | ~2 min |
| 3. Exercise Library | 3/3 | ~7 min | ~2.3 min |
| 4. Templates and Dashboard | 6/6 | ~12 min | ~2 min |
| 5. Active Workout | 8/8 | ~26 min | ~3.3 min |

**Recent Trend:**
- Last 5 plans: 05-05 (~3 min), 05-06 (~3 min), 05-07 (~1 min), 05-08 (~1 min)
- Trend: Gap closure plans with targeted single-file fixes execute fastest

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
- [04-01]: Template service ported as-is from web app -- zero logic changes, only import paths (same pattern as exercises)
- [04-01]: Cache key ironlift:templates with no expiry timestamps -- best-effort caching (same as exercises)
- [04-01]: GestureHandlerRootView wraps outermost in RootLayout (outside ThemeProvider/AuthProvider)
- [04-02]: EditingSet/EditingExercise types colocated in ExerciseEditorCard.tsx -- lightweight editing state separate from DB types
- [04-02]: RestTimerInline progress bar uses 300s max reference for visual fill ratio
- [04-02]: parseTimeInput accepts both plain seconds ("90") and MM:SS ("1:30") format
- [04-03]: Settings gear wired to auth.logout() temporarily (Phase 7 settings bottom sheet replacement)
- [04-03]: Start button rendered as no-op placeholder (Phase 5 active workout implementation)
- [04-03]: CARD_MIN_HEIGHT=180 exported from TemplateCard for grid alignment consistency (removed in 04-05)
- [04-04]: EditingTemplate interface with id: string | null for create/edit mode detection
- [04-04]: ExercisePickerModal excludeIds prevents duplicate exercises in template
- [04-04]: ScrollView with .map() for exercise list -- avoids nested FlatList warnings
- [04-04]: hasChanges boolean for unsaved changes tracking triggers Cancel dialog
- [04-05]: Single-column vertical list replaces 2-column grid for iOS template display
- [04-05]: useFocusEffect triggers refresh() on every dashboard focus event for template freshness
- [04-05]: TemplateGrid owns section header with +Create button, replacing sentinel add card pattern
- [04-05]: Empty state handled naturally by showing header with no cards (no separate empty message)
- [04-06]: Brand text split into two Text elements (Iron=textPrimary, Lift=accent) matching web app pattern
- [04-06]: Weight input uses decimal-pad keyboard with Math.round(v*10)/10 for 1-decimal display
- [04-06]: RestTimerInline progress bar fully removed (workout-only feature for Phase 5)
- [05-01]: Logging service ported as-is from web app -- zero logic changes, only import paths (same pattern as exercises, templates)
- [05-01]: Single write queue key (ironlift:writeQueue) not per-user -- payload contains user_id
- [05-01]: SDK 54 notification handler requires shouldShowBanner + shouldShowList (not in older docs)
- [05-01]: Sound asset directory uses .gitkeep placeholder -- real MP3 to be sourced separately
- [05-02]: Wall-clock time for timer instead of tick counting -- immune to iOS background suspension
- [05-02]: RestoredWorkoutData defined in useWorkoutState to avoid circular imports with useWorkoutBackup
- [05-02]: createAudioPlayer (non-hook API) for one-shot sound playback from callback context
- [05-02]: All backup errors logged but never thrown (best-effort persistence)
- [05-03]: ProgressRing radius derived from (size - strokeWidth) / 2 for configurable sizing
- [05-03]: RestTimerBar uses 8px track height with 28px container for time text overlay
- [05-03]: ConfirmationModal nested Pressable pattern prevents overlay press propagation through card
- [05-03]: Modal overlay pattern: rgba(0,0,0,0.6) backdrop, centered card, maxWidth 340
- [05-03]: Dismissible vs non-dismissible overlay via ConfirmationModal.dismissOnOverlayPress prop
- [05-04]: Rubberband factor 0.2 for swipe overscroll resistance, spring config damping:20 stiffness:200
- [05-04]: All exercise cards default to expanded (user controls collapse, matching web)
- [05-04]: Alert.alert for remove exercise confirmation (simpler than ConfirmationModal for single action)
- [05-04]: failOffsetY [-5, 5] on pan gesture prevents swipe from conflicting with vertical ScrollView
- [05-05]: Route params (templateId, restore) for template loading and crash recovery
- [05-05]: backupTrigger counter pattern for deferred backup save via useEffect
- [05-05]: Template update best-effort: skip silently on failure, workout save is priority
- [05-06]: Start button navigates via router.push with templateId query param
- [05-06]: Crash recovery check runs on dashboard mount via useWorkoutBackup.restore()
- [05-06]: Discard immediately clears backup (no confirmation per locked decision)
- [05-07]: useRef(false) isInitialized guard prevents re-initialization while allowing useEffect to re-fire on async dependency changes
- [05-08]: Inner content opacity (not outer Animated.View) preserves swipe-behind-layer opacity isolation
- [05-08]: getTimerProps returns exercise.rest_seconds when timer inactive, showing full bar instead of 0:00

### Pending Todos

- Supabase Dashboard configuration needed (see 02-USER-SETUP.md): redirect URL, email confirmation, password length

### Blockers/Concerns

- [Research]: @gorhom/bottom-sheet has LOW confidence on SDK 54 compatibility -- test early, prepare hand-rolled fallback (affects Phase 7)
- [Research]: New Architecture acceptance needed -- Expo Go SDK 54 defaults to it, constitution says classic

## Session Continuity

Last session: 2026-02-14
Stopped at: Completed 05-08-PLAN.md (UAT round 2 cosmetic fixes). Phase 5 fully complete.
Resume file: None
