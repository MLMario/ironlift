# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** The core workout loop -- pick a template, log sets with weight/reps, finish and save -- must work flawlessly, including fully offline.
**Current focus:** Phase 6 (Charts) complete including UAT gap closure. Ready for Phase 7.

## Current Position

Phase: 6 of 7 (Charts)
Plan: 5 of 5 in current phase (includes gap closure plan)
Status: Phase complete (all UAT gaps closed)
Last activity: 2026-02-15 -- Completed 06-05-PLAN.md (UAT gap closure)

Progress: [█████████████████████████████] 33/33 plans (100%)

## Performance Metrics

**Velocity:**
- Total plans completed: 33
- Average duration: ~3.0 min (including human verification)
- Total execution time: ~100 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation and Theme | 3/3 | ~29 min | ~10 min |
| 2. Authentication | 5/5 | ~12 min | ~2 min |
| 3. Exercise Library | 3/3 | ~7 min | ~2.3 min |
| 4. Templates and Dashboard | 6/6 | ~12 min | ~2 min |
| 5. Active Workout | 9/9 | ~27 min | ~3 min |
| 6. Charts | 5/5 | ~10 min | ~2 min |

**Recent Trend:**
- Last 5 plans: 06-02 (~2 min), 06-03 (~2 min), 06-04 (~2 min), 06-05 (~2 min)
- Trend: Bugfix plans executing at consistent ~2 min pace

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
- [05-03]: RestTimerBar uses 28px container for time text overlay
- [05-09]: RestTimerBar inactive fill changed from bgElevated to textMuted for visible contrast
- [05-09]: RestTimerBar track height changed from 8px to 28px, proportional to 44px buttons
- [05-09]: RestTimerBar time text changed from xs to sm for readability in thicker bar
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
- [06-01]: Charts service exported as plain object (no ChartsService type annotation) -- renderChart/destroyChart discarded
- [06-01]: createChart re-fetches with exercises join after insert (fixes web app bug)
- [06-01]: getMetricDisplayName returns "Max Volume" (shortened from web's "Max Volume Set (lbs)") for mobile card titles
- [06-01]: Cache key ironlift:charts with no expiry timestamps -- best-effort caching (same as exercises, templates)
- [06-02]: useChartData dependency array uses [chart.id] only -- recomputes when chart config changes (SUPERSEDED by 06-05-01)
- [06-02]: KebabMenu uses RN Modal pattern (proven in codebase) rather than absolute positioning
- [06-02]: ChartCard tooltip shows rounded integer with unit suffix ("225 lbs", "12 sets")
- [06-02]: ChartSection renders charts with .map() not FlatList to avoid nested scrollable container warnings
- [06-02]: Date labels formatted as M/D and session labels as plain numbers
- [06-03]: RN Modal with slide animation used for AddChartSheet (not @gorhom/bottom-sheet) -- simpler for 3-field form
- [06-03]: Step state machine ('form' | 'selectExercise') for multi-step flow within single modal
- [06-03]: RadioGroup sub-component with hand-rolled circles (20px outer, 10px inner) per constitution no-component-library rule
- [06-03]: Exercise list grouped by category using Map reduce, preserving getExercisesWithLoggedData sort order
- [06-03]: Offline error detection via error message content check for network-related keywords
- [06-04]: TemplateGrid uses .map() instead of FlatList for ScrollView compatibility (avoids nested scrollable warnings)
- [06-04]: Dashboard ScrollView wraps both template and chart sections for continuous scroll experience
- [06-05]: useChartData dependency changed from [chart.id] to [chart] to detect new object references from refreshCharts()
- [06-05]: activatePointersOnLongPress: true enables scroll by default, tooltip on long press
- [06-05]: Inner Pressable in AddChartSheet replaced with View + onStartShouldSetResponder to stop touch swallowing
- [06-05]: KebabMenu uses View.measure() with collapsable={false} for reliable screen coordinate measurement

### Pending Todos

- Supabase Dashboard configuration needed (see 02-USER-SETUP.md): redirect URL, email confirmation, password length

### Blockers/Concerns

- [Research]: @gorhom/bottom-sheet has LOW confidence on SDK 54 compatibility -- test early, prepare hand-rolled fallback (affects Phase 7)
- [Research]: New Architecture acceptance needed -- Expo Go SDK 54 defaults to it, constitution says classic

## Session Continuity

Last session: 2026-02-15
Stopped at: Completed 06-05-PLAN.md (UAT gap closure). Phase 6 fully complete with all UAT gaps closed.
Resume file: None
