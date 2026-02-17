# Pending

Gaps:

- Redesign exercise card add and remove bottom
- Add exercise botton also inda weird? maybe check other options

Minor

Modals:

- Some are ugly, need some work

Charts

- see if we can make that chart stop scrolling up and down when pointer is being worked.

Template Grids:

- Create a template message when templates are empty, create a template to start logging your workout
- Log a wrokout subtitle only appear when templates >1
- when weigh and reps are changed they should be silently updated in just like timer.

---

# Tech Debt Audit Prompt

## Prompt: Systematic Tech Debt Identification for IronLift iOS

You are auditing the IronLift iOS codebase for tech debt. This is an Expo (React Native) + TypeScript app backed by Supabase. The codebase has ~15,000 lines across `src/` and `app/`.

### Pre-Audit Context

Before doing anything, read these files to understand the project's architectural rules and constraints:

- `docs/constitution.md` — binding rules for code placement, styling, dependencies, offline behavior
- `docs/app_develop_decision.md` — historical architecture decisions and their rationale
- `docs/pending_issues.md` — already-known issues (do NOT re-report these)

Any finding you produce must respect these documents. Do not flag something as debt if the constitution explicitly permits or mandates it (e.g., no tests for Supabase CRUD wrappers, manual testing only, no component libraries).

### Exclusions

Do NOT report the following — they are known, intentional, or already being addressed:

- **Chart re-rendering cascade** — 9 issues already documented in `pending_issues.md` and actively being fixed on branch `002-chart-re-rendering-optimization`
- **Lack of automated tests** — project convention is manual testing on physical device; no CI gates. Only flag if you find specific high-risk untested logic (state machines, cache sync, offline queue)
- **No JSDoc/comments** — project prefers self-documenting code
- **No pre-commit hooks or CI** — intentional per project rules

### Codebase Structure Reference

```
src/components/  — 34 files, ~5,963 lines (UI components)
src/services/    — 6 files, ~2,807 lines (Supabase CRUD, cache, logging)
src/hooks/       — 9 files, ~1,514 lines (state, data, timers)
src/types/       — 2 files, ~1,162 lines (TypeScript types)
src/lib/         — 4 files, ~362 lines (cache, formatters, Supabase client)
src/theme/       — 3 files, ~86 lines (theme provider, tokens)
app/             — 11 files, ~3,186 lines (screens, Expo Router)
```

Largest files (primary audit targets):

- `src/types/services.ts` (829 lines)
- `src/services/logging.ts` (826 lines)
- `app/workout.tsx` (770 lines)
- `src/services/templates.ts` (729 lines)
- `src/components/AddChartSheet.tsx` (624 lines)
- `src/components/ExercisePickerModal.tsx` (543 lines)
- `app/template-editor.tsx` (524 lines)
- `src/services/exercises.ts` (512 lines)
- `src/hooks/useWorkoutState.ts` (449 lines)
- `src/hooks/useRestTimer.ts` (345 lines)

---

## Task: Spawn 5 Subagents

Create 5 subagents, one per exploration area below. Each subagent works independently and in parallel. Each subagent must read the relevant files, analyze them against the criteria defined for its area, and produce a structured report.

---

### Subagent 1: Performance & Re-rendering (beyond charts)

**Objective:** Find unnecessary re-renders, expensive computations, and missing memoization outside the already-documented chart issues.

**Files to explore:**

- All files in `src/hooks/` (especially `useWorkoutState.ts`, `useRestTimer.ts`, `useTemplates.ts`, `useExercises.ts`)
- All files in `app/` (screen-level re-render triggers)
- Large components: `WorkoutExerciseCard.tsx`, `WorkoutSetRow.tsx`, `ExercisePickerModal.tsx`, `AddChartSheet.tsx`, `RestTimerBar.tsx`, `TemplateCard.tsx`

**What to look for:**

- Components that should be wrapped in `React.memo` but aren't (components receiving stable props from parent but re-rendering anyway)
- Hooks with unstable dependency arrays (object/array references instead of scalar values)
- Missing `useCallback`/`useMemo` where new references are created every render and passed as props to child components
- `useFocusEffect` or `useEffect` callbacks that trigger unconditional data fetches without checking if data actually changed
- `StyleSheet.create()` called inside component bodies instead of module scope
- Inline object/array literals passed as props (creating new references each render)
- State updates that could be batched but aren't
- Any heavy computation happening during render that should be memoized

**Do NOT report:** Anything related to `ChartCard.tsx`, `useCharts.ts`, `useChartData.ts`, `ChartSection.tsx` — these are already covered in `pending_issues.md`.

---

### Subagent 2: Component Decomposition & Separation of Concerns

**Objective:** Identify components and screens that violate single-responsibility, mix UI with business logic, or are too large to maintain effectively.

**Files to explore:**

- All files in `app/` (screens should be UI-only per project rules — no business logic)
- All components over 250 lines: `AddChartSheet.tsx`, `ExercisePickerModal.tsx`, `MyExercisesList.tsx`, `WorkoutSetRow.tsx`, `WorkoutExerciseCard.tsx`, `CreateExerciseModal.tsx`, `ExerciseEditorCard.tsx`, `RestTimerBar.tsx`, `ChartCard.tsx`
- `src/hooks/useWorkoutState.ts` (449 lines — complex state machine)
- `src/hooks/useRestTimer.ts` (345 lines)

**What to look for:**

- Screens in `app/` that contain business logic (data transformations, complex state management, validation) instead of delegating to hooks/services — this directly violates the project's code placement rules
- Components doing more than one thing (e.g., a modal that also manages its own data fetching, transforms data, AND renders UI)
- State that's lifted too high or too low — prop drilling through 3+ levels where a hook extraction would be cleaner
- Components with multiple distinct visual sections that could be extracted into focused sub-components
- Hooks that combine unrelated concerns (e.g., a hook managing both timer state AND notification scheduling AND UI state)
- Inline helper functions inside components that could be extracted to utils or a dedicated hook
- Any component rendering conditional sections with complex branching (>3 conditional paths) that should be split

---

### Subagent 3: Service Layer, Data Flow & Cache Coherence

**Objective:** Audit the service layer for cohesion issues, the cache layer for staleness/invalidation gaps, and the offline write queue for edge cases.

**Files to explore:**

- All files in `src/services/` (especially `logging.ts` at 826 lines, `templates.ts` at 729 lines)
- `src/lib/cache.ts` (209 lines — the cache layer)
- `src/services/writeQueue.ts` (154 lines — offline queue)
- `src/hooks/useWriteQueue.ts` (49 lines)
- `src/hooks/useWorkoutBackup.ts` (136 lines)
- All hooks that call services: `useExercises.ts`, `useTemplates.ts`, `useCharts.ts`, `useChartData.ts`

**What to look for:**

- Services that do too many things — `logging.ts` handles workout inserts, metric queries, and history retrieval. Should any of these be separate services?
- Cache invalidation gaps: when data is mutated (create/update/delete), is the corresponding cache entry invalidated or updated? Trace each mutation path
- Stale cache reads: are there scenarios where cached data is served after a mutation without refresh?
- Write queue edge cases: what happens if the app crashes mid-queue-flush? Are idempotency keys truly idempotent? Is there retry logic with backoff?
- Inconsistent data access patterns: some hooks might bypass the cache while others use it, leading to different data freshness for the same entity
- Service functions that duplicate logic (e.g., similar Supabase queries with slight variations that could be parameterized)
- Missing error propagation — services that catch errors silently instead of bubbling them up to the UI
- Race conditions: concurrent calls to the same service that could produce inconsistent state

---

### Subagent 4: Type Safety & Interface Contracts

**Objective:** Find weak type boundaries, `any` usage, overly broad types, and mismatches between what services return and what consumers expect.

**Files to explore:**

- `src/types/services.ts` (829 lines — all service types)
- `src/types/database.ts` (333 lines — Supabase generated types)
- All files in `src/services/` (check return types match declared interfaces)
- All files in `src/hooks/` (check hook return types and parameter types)
- `src/lib/cache.ts` (does the cache preserve type safety or use `any`?)

**What to look for:**

- Explicit `any` or implicit `any` (untyped function parameters, untyped destructured objects)
- `as` type assertions that bypass the type system instead of properly narrowing
- The monolithic `services.ts` type file — identify natural domain boundaries where it could be split (workout types, template types, exercise types, chart types, auth types)
- Supabase query results that aren't properly typed (raw `.data` usage without narrowing)
- Cache layer type safety — does `cache.get()` return `any` or a properly typed generic?
- Service functions whose actual return shape doesn't match their declared return type
- Optional fields (`?`) used where values are always present (or vice versa — required fields that can actually be null)
- Hooks that return loosely typed objects instead of discriminated unions for loading/error/success states

---

### Subagent 5: Error Handling & Resilience

**Objective:** Audit error paths across the app — especially critical for an offline-first app where network failures, auth expiry, and data conflicts are expected, not exceptional.

**Files to explore:**

- All files in `src/services/` (how do they handle Supabase errors?)
- All files in `src/hooks/` (how do they surface errors to the UI?)
- All screen files in `app/` (how do screens render error states?)
- `src/services/writeQueue.ts` and `src/hooks/useWriteQueue.ts` (offline error recovery)
- `src/hooks/useWorkoutBackup.ts` (what happens when backup/restore fails?)
- `src/services/auth.ts` (token expiry, session refresh failures)
- `src/lib/cache.ts` (what happens when AsyncStorage read/write fails?)

**What to look for:**

- Silent `catch` blocks — errors caught and swallowed with no user feedback and no logging
- Missing error states in hooks — hooks that have `loading` and `data` but no `error` state, leaving the UI with no way to show failure
- Screens with no error UI — what does the user see when a service call fails? A blank screen? Stale data with no indication?
- Network-specific error handling: does the app distinguish between "offline" (expected, cache should serve) and "server error" (unexpected, user should know)?
- Auth edge cases: what happens when the Supabase session expires mid-workout? Mid-template-edit? Is there graceful degradation or a hard crash?
- AsyncStorage failures: what if the device storage is full? Are cache writes wrapped in try-catch?
- Write queue failure modes: what if a queued workout fails server-side validation on sync? Is the user notified? Is the item retried or dropped?
- Unhandled promise rejections — async functions called without `.catch()` or `try/catch`
- Error messages that leak implementation details (Supabase error codes shown raw to user)

---

## Output Format (Required for Each Subagent)

Each subagent must produce its findings as a structured list inside a markdown document called [subagent_name.md] under docs/tech_debt_exploration/. Each finding must include:

```
### [SEVERITY] Finding title
- **Location:** `file/path.ts:line_number` (or line range)
- **What:** Concise description of the debt
- **Why it matters:** Impact on UX, maintainability, correctness, or performance
- **Suggested fix:** Concrete action to resolve it (not vague advice)
- **Blast radius:** What other files/features would be affected by the fix
```

Severity levels:

- **CRITICAL** — Causes bugs, data loss, or crashes in production
- **HIGH** — Significant UX degradation, maintenance burden, or correctness risk
- **MEDIUM** — Code smell that slows development or increases risk of future bugs
- **LOW** — Minor improvement, cleanup, or consistency fix

---

## Synthesis Step

After all 5 subagents complete, Spawn an agent to read all tech debt reporst ad produce a final consolidated report called consolidated_tech_debt_reports.md, it must:

1. **Deduplicate** — merge findings that overlap across agents
2. **Rank** — order all findings by severity, then by blast radius (smaller blast radius = easier to fix first)
3. **Group** — cluster related findings that should be fixed together in a single PR
4. **Summary table** — count of findings by severity and area
5. **Recommended fix order** — a prioritized sequence of 5-8 fix batches, each scoped to a single PR
