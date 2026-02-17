# Phase 11: Silent Save of Weight/Reps to Template - Research

**Researched:** 2026-02-16
**Domain:** Workout template persistence, Supabase CRUD, offline data sync
**Confidence:** HIGH

## Summary

This phase adds silent save of weight/reps values from completed workout sets back to the template, mirroring the existing rest timer silent save pattern. After deep investigation of the codebase, the recommendation is to **follow the same pattern as the rest timer silent save** (best-effort Supabase calls at workout finish time) but with a **new dedicated service function** because the data model for sets is fundamentally different from rest seconds.

The rest timer save updates a single column (`default_rest_seconds`) on the `template_exercises` table via the existing `updateTemplateExercise()` service function. Weight/reps requires updating rows in the `template_exercise_sets` table -- a different table with different access patterns. The codebase currently has no service function for updating individual set values; the only set-writing function is `updateTemplate()` which does a destructive delete-all-then-reinsert, which is inappropriate for a surgical silent save.

**Primary recommendation:** Add a new `updateTemplateExerciseSetValues()` service function in `templates.ts` that performs targeted upserts on `template_exercise_sets`, then call it from the workout finish flow alongside the existing `saveRestTimeChanges()`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Each set saves independently -- template preserves per-set values exactly as performed
- Both weight AND reps save per-set (e.g., 135x10, 140x8, 145x6 all preserved individually)
- Every completed set overwrites its corresponding template set (by position: workout set 1 -> template set 1, etc.)
- Sets beyond the template count are ignored (e.g., user added set 4 but template has 3 sets -> set 4 ignored)
- Cancelled/discarded workout = no changes saved to template at all
- Finished workout: only sets marked as "done" at save time have their values saved
- Evaluation is purely set-level, not exercise-level -- each completed set saves independently regardless of whether the full exercise was completed
- Done button clicks/unclicks during the workout do NOT trigger any saves or checks -- evaluation happens only at the workout save process
- Always overwrite completed sets -- no diff comparison against template values needed (simpler logic, ensures template matches last workout)
- If user confirmed the template update modal -> skip silent save entirely (modal already handled the update)
- If user declined the template update modal -> silent save still fires for weight/reps on matching-position sets
- Set matching is by position (set 1 maps to template set 1, set 2 to set 2, etc.)
- If workout has more sets than template (user added sets, declined modal): save matching positions, ignore extras
- If workout has fewer sets than template (user removed sets, declined modal): extra template sets keep their existing values

### Claude's Discretion
- Whether to leverage the existing rest timer silent save implementation or create separate logic
- Technical approach to matching workout sets to template sets
- Error handling for edge cases (corrupted data, missing template, etc.)
- Offline queue integration details

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

No new libraries needed. This phase uses only existing project dependencies.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | existing | Direct DB access for template_exercise_sets updates | Already used throughout services |
| `@react-native-async-storage/async-storage` | existing | Template cache invalidation after save | Already used for caching |

### Supporting
No additional libraries required. All work is in existing service files and the workout screen.

## Architecture Patterns

### Existing Rest Timer Silent Save Pattern (Reference)

**Confidence:** HIGH (verified from source code)

The rest timer silent save is the closest existing pattern. Here is exactly how it works:

**Detection phase** (`useWorkoutState.ts`, `getRestTimeChanges()`):
```typescript
// Compares activeWorkout.exercises[].rest_seconds vs originalTemplateSnapshot.exercises[].rest_seconds
// Returns array of { exercise_id, rest_seconds } for changed exercises only
// Skips exercises added during workout (no original to compare)
```

**Execution phase** (`workout.tsx`, `saveRestTimeChanges()`):
```typescript
// Called in saveWorkoutAndCleanup() when shouldUpdateTemplate === false
// Iterates over changes, calls templatesService.updateTemplateExercise() for each
// Best-effort: catches errors silently per locked decision
```

**Key characteristics:**
1. Runs ONLY at workout finish time (not during workout)
2. Only fires when user did NOT confirm the template update modal
3. Best-effort: failures are silently caught
4. Uses existing service function (`updateTemplateExercise`)
5. NOT offline-capable (calls Supabase directly, no write queue)

### Recommended Pattern for Weight/Reps Silent Save

**Recommendation:** Follow the same structural pattern as rest timer (detect at finish, execute best-effort) but add a NEW service function because the data model is different.

**Why a new service function is needed:**
- `updateTemplateExercise()` only updates `default_rest_seconds` on `template_exercises` table
- Weight/reps live in `template_exercise_sets` table (different table entirely)
- The only existing function that writes to `template_exercise_sets` is `updateTemplate()`, which does a destructive delete-all-then-reinsert of ALL exercises and sets -- far too heavy for a surgical silent save
- A new function that updates individual set rows by `(template_exercise_id, set_number)` is needed

**Recommended approach (3-layer change):**

```
Layer 1: Service (templates.ts)
  - New function: updateTemplateExerciseSetValues()
  - Takes template_id, exercise_id, array of { set_number, weight, reps }
  - Looks up template_exercise_id from (template_id, exercise_id)
  - Updates each set in template_exercise_sets by (template_exercise_id, set_number)

Layer 2: Hook (useWorkoutState.ts)
  - New function: getWeightRepsChanges()
  - For each exercise in activeWorkout that exists in originalTemplateSnapshot:
    - For each set marked is_done:
      - If set_number <= template set count: include { exercise_id, set_number, weight, reps }
  - Returns structured data for the save function

Layer 3: Screen (workout.tsx)
  - New function: saveWeightRepsChanges()
  - Called in saveWorkoutAndCleanup() alongside saveRestTimeChanges()
  - Only when shouldUpdateTemplate === false
  - Best-effort with silent error handling
```

### Data Flow Diagram

```
User finishes workout
  |
  v
handleFinishConfirm()
  |
  +--> hasTemplateChanges()? ----YES----> showTemplateUpdateModal
  |                                         |
  NO                                  User chooses:
  |                                   /           \
  v                              "Yes, Update"   "No, Keep Original"
saveWorkoutAndCleanup(false)        |               |
  |                                 v               v
  +--> saveRestTimeChanges()   saveWorkoutAndCleanup(true)  saveWorkoutAndCleanup(false)
  |    [EXISTING]                   |                         |
  |                            updateTemplate()          saveRestTimeChanges()
  +--> saveWeightRepsChanges()  [full replace --          saveWeightRepsChanges()
  |    [NEW - THIS PHASE]       includes weight/reps]     [NEW - THIS PHASE]
  |
  +--> createWorkoutLog() or enqueue()
  |
  +--> cleanup (stop timer, clear backup, navigate)
```

### Recommended Project Structure Changes

```
src/
  services/
    templates.ts       # ADD: updateTemplateExerciseSetValues()
  hooks/
    useWorkoutState.ts # ADD: getWeightRepsChanges()
app/
  workout.tsx          # ADD: saveWeightRepsChanges(), wire into saveWorkoutAndCleanup
```

### Anti-Patterns to Avoid

- **DO NOT use `updateTemplate()` for silent save**: It does a destructive delete-all-then-reinsert of ALL template_exercises and their sets. This would wipe out rest_seconds changes and any exercises the user added/removed via the template editor between the time the workout started and finished. Use targeted updates instead.
- **DO NOT detect changes during the workout**: Per locked decision, evaluation happens only at the workout save process. No on-set-done checks.
- **DO NOT diff against template values**: Per locked decision, always overwrite completed sets -- no comparison needed. This simplifies the logic significantly.
- **DO NOT include sets beyond template count**: Per locked decision, extra sets are ignored. Match by position only up to `min(workout_sets, template_sets)`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Template exercise ID lookup | Raw SQL query | `supabase.from('template_exercises').select('id').eq('template_id', x).eq('exercise_id', y).single()` | RLS handles auth, Supabase handles SQL |
| Set value update | Batch raw SQL | `supabase.from('template_exercise_sets').update({weight, reps}).eq('template_exercise_id', x).eq('set_number', y)` | Uses existing UNIQUE constraint for targeting |
| Change detection | Custom diff algorithm | Simple iteration: for each exercise, for each done set with set_number <= template set count, include it | Per locked decision, always overwrite -- no diff needed |

**Key insight:** The `template_exercise_sets` table has a `UNIQUE (template_exercise_id, set_number)` constraint, which means we can reliably target individual sets by their position within a template exercise. No ambiguity in matching.

## Common Pitfalls

### Pitfall 1: Missing template_exercise_id Lookup
**What goes wrong:** The workout state stores `exercise_id` (the exercise UUID), but `template_exercise_sets` requires `template_exercise_id` (the junction table UUID). Directly querying template_exercise_sets with exercise_id would fail.
**Why it happens:** The workout state is exercise-centric, not template-exercise-centric.
**How to avoid:** The service function must first look up the `template_exercise_id` from the `template_exercises` table using `(template_id, exercise_id)` before updating sets.
**Warning signs:** Empty results from Supabase update queries.

### Pitfall 2: Template Update Modal Interaction
**What goes wrong:** Silent save fires even when the user confirmed the template update modal, causing the full `updateTemplate()` to run followed by individual set updates that are redundant (or worse, the set updates target old `template_exercise_id` values that no longer exist because `updateTemplate()` deleted and recreated all template_exercises).
**Why it happens:** `updateTemplate()` deletes all template_exercises and reinserts them, generating new UUIDs for template_exercise_id. Any subsequent query using old template_exercise_id values would find nothing.
**How to avoid:** Per locked decision, if user confirmed the template update modal, skip silent save entirely. The `shouldUpdateTemplate` flag already controls this correctly -- silent save only runs when `shouldUpdateTemplate === false`.
**Warning signs:** Errors in console about missing template_exercise_id references.

### Pitfall 3: Exercises Added During Workout
**What goes wrong:** User adds a new exercise during the workout (via ExercisePickerModal). At finish time, the code tries to find this exercise in the original template to save its sets, but it doesn't exist there.
**Why it happens:** The original template snapshot only contains exercises that were in the template at workout start. Added exercises have no template_exercise entry.
**How to avoid:** Only process exercises that exist in `originalTemplateSnapshot.exercises[]`. Skip any exercise_id not found in the snapshot. This is exactly how `getRestTimeChanges()` works already.
**Warning signs:** 404/null results when looking up template_exercise_id for new exercises.

### Pitfall 4: Set Count Mismatch (Declined Modal)
**What goes wrong:** User added/removed sets during workout, declined the template update modal, and the code tries to update template sets that don't exist (set 4 when template only has 3) or skips sets that should keep their values.
**Why it happens:** The user declined structural changes, so the template's set count is unchanged.
**How to avoid:** Per locked decision: only update sets where `workout_set.set_number <= template_set_count`. Use the template snapshot's set count per exercise as the boundary. Sets beyond that are ignored. Template sets with no matching workout set keep their existing values.
**Warning signs:** Supabase update returning 0 rows affected for sets beyond template count.

### Pitfall 5: Offline Behavior Inconsistency
**What goes wrong:** The silent save fails when offline, and there's no retry mechanism.
**Why it happens:** The existing rest timer silent save also has this behavior -- it calls Supabase directly with no write queue fallback.
**How to avoid:** This is actually consistent behavior per the constitution: "Online required for: Template editing." The rest timer silent save is also best-effort/online-only. Weight/reps should match this pattern. The workout LOG is always saved (offline or online), but template updates are best-effort.
**Warning signs:** None -- this is expected and documented behavior.

### Pitfall 6: Template Cache Staleness
**What goes wrong:** After silent save, the local template cache still has old weight/reps values. Next time the user starts a workout from this template, they see old values until the cache refreshes.
**Why it happens:** The silent save updates Supabase but doesn't invalidate or update the local template cache.
**How to avoid:** After a successful silent save, update the local template cache to reflect the new values. This can be done by either (a) fetching fresh templates from Supabase after save, or (b) surgically updating the cached template in memory. Option (b) is better for offline scenarios where the Supabase fetch might fail. However, since the dashboard already refreshes templates on mount, this may self-resolve on next navigation. Recommend option (a) as a simple post-save action, falling back gracefully if offline.
**Warning signs:** User sees old weight/reps when starting the same template again immediately after finishing.

## Code Examples

### Example 1: New Service Function (updateTemplateExerciseSetValues)

```typescript
// Source: Derived from existing patterns in templates.ts
// templates.ts - add this function

interface TemplateSetValueUpdate {
  set_number: number;
  weight: number;
  reps: number;
}

async function updateTemplateExerciseSetValues(
  templateId: string,
  exerciseId: string,
  setUpdates: TemplateSetValueUpdate[]
): Promise<void> {
  if (setUpdates.length === 0) return;

  // Look up the template_exercise_id (junction table ID)
  const { data: templateExercise, error: lookupError } = await supabase
    .from('template_exercises')
    .select('id')
    .eq('template_id', templateId)
    .eq('exercise_id', exerciseId)
    .single();

  if (lookupError || !templateExercise) return; // Best-effort: skip silently

  // Update each set's weight and reps
  for (const update of setUpdates) {
    await supabase
      .from('template_exercise_sets')
      .update({ weight: update.weight, reps: update.reps })
      .eq('template_exercise_id', templateExercise.id)
      .eq('set_number', update.set_number);
    // Errors silently ignored per best-effort pattern
  }
}
```

### Example 2: Change Detection Function (getWeightRepsChanges)

```typescript
// Source: Follows pattern of getRestTimeChanges() in useWorkoutState.ts

// Returns per-exercise set values for completed sets within template bounds
const getWeightRepsChanges = useCallback(
  (): Array<{
    exercise_id: string;
    sets: Array<{ set_number: number; weight: number; reps: number }>;
  }> => {
    if (!originalTemplateSnapshot) return [];

    const changes: Array<{
      exercise_id: string;
      sets: Array<{ set_number: number; weight: number; reps: number }>;
    }> = [];

    for (const exercise of activeWorkout.exercises) {
      const original = originalTemplateSnapshot.exercises.find(
        (e) => e.exercise_id === exercise.exercise_id
      );
      // Skip exercises added during workout (no original to compare)
      if (!original) continue;

      const templateSetCount = original.sets.length;
      const setsToSave: Array<{ set_number: number; weight: number; reps: number }> = [];

      for (const set of exercise.sets) {
        // Only include sets that are: (a) marked done AND (b) within template bounds
        if (set.is_done && set.set_number <= templateSetCount) {
          setsToSave.push({
            set_number: set.set_number,
            weight: set.weight,
            reps: set.reps,
          });
        }
      }

      if (setsToSave.length > 0) {
        changes.push({
          exercise_id: exercise.exercise_id,
          sets: setsToSave,
        });
      }
    }

    return changes;
  },
  [originalTemplateSnapshot, activeWorkout.exercises]
);
```

### Example 3: Save Function in Workout Screen

```typescript
// Source: Follows pattern of saveRestTimeChanges() in workout.tsx

async function saveWeightRepsChanges(): Promise<void> {
  const changes = getWeightRepsChanges();
  if (changes.length === 0) return;
  if (!activeWorkout.template_id) return;

  for (const change of changes) {
    try {
      await templatesService.updateTemplateExerciseSetValues(
        activeWorkout.template_id,
        change.exercise_id,
        change.sets
      );
    } catch {
      // Best-effort per locked decision -- skip silently on failure
    }
  }
}
```

### Example 4: Integration in saveWorkoutAndCleanup

```typescript
// In saveWorkoutAndCleanup, add alongside saveRestTimeChanges():
if (!shouldUpdateTemplate) {
  await saveRestTimeChanges();
  await saveWeightRepsChanges(); // NEW - this phase
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Only rest timer silent save | Rest timer + weight/reps silent save | Phase 11 | Template stays current with actual workout values |
| Template shows initial values until manual edit | Template reflects last completed workout's values | Phase 11 | Better UX - next workout pre-fills with last workout's actual values |

## Open Questions

### 1. Template Cache Invalidation Strategy
- **What we know:** After silent save to Supabase, the local AsyncStorage template cache still has old values. The dashboard's `useTemplates` hook refreshes from Supabase on mount, so the cache will update on next dashboard visit.
- **What's unclear:** Whether we should proactively invalidate/update the cache right after the silent save, or rely on the natural dashboard refresh.
- **Recommendation:** Add a template cache refresh after successful saves (call `getTemplates()` and `setCachedTemplates()`). This is low-cost and prevents stale data if the user immediately starts the same template again. Fall back gracefully if offline.

### 2. Auth Check Optimization
- **What we know:** The existing `updateTemplateExercise()` does its own auth check (`supabase.auth.getUser()`). The new `updateTemplateExerciseSetValues()` would also need auth -- but the workout screen already has the user from `useAuth()`.
- **What's unclear:** Whether to duplicate the auth check in the new service function (consistent with other service functions) or skip it (the RLS policy on `template_exercise_sets` already enforces ownership via the join path).
- **Recommendation:** Include the auth check for consistency with other service functions. The overhead is negligible and it maintains the pattern.

## Sources

### Primary (HIGH confidence)
- `app/workout.tsx` - Full finish flow, `saveRestTimeChanges()`, `saveWorkoutAndCleanup()`
- `src/hooks/useWorkoutState.ts` - `getRestTimeChanges()`, `hasTemplateChanges()`, `TemplateSnapshot` type, `ActiveWorkout` type, `WorkoutSet`/`WorkoutExercise` interfaces
- `src/services/templates.ts` - All template CRUD functions, `updateTemplateExercise()`, `updateTemplate()` delete-then-reinsert pattern
- `src/types/database.ts` - `TemplateExerciseSet`, `TemplateSetData`, `TemplateExerciseWithSets` types
- `src/types/services.ts` - `TemplateExerciseInput`, `TemplateSetInput`, `TemplateExerciseDefaults` types
- `sql/current_schema.sql` - `template_exercise_sets` table: `id`, `template_exercise_id`, `set_number`, `weight`, `reps`
- `sql/migration_template_sets.sql` - `UNIQUE (template_exercise_id, set_number)` constraint confirmed
- `src/services/writeQueue.ts` - Write queue only handles `workout_log` type, not template updates
- `src/lib/cache.ts` - Template cache functions: `getCachedTemplates()`, `setCachedTemplates()`

### Secondary (MEDIUM confidence)
- `docs/constitution.md` - "Online required for: Template editing" -- confirms best-effort/online-only is consistent
- `.planning/phases/11-silent-save-weight-reps/11-CONTEXT.md` - All locked decisions

### Tertiary (LOW confidence)
None -- all findings verified from source code.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, all existing code verified
- Architecture: HIGH - Pattern directly mirrors existing rest timer save, with verified code examples
- Pitfalls: HIGH - All pitfalls identified from actual code paths and data model analysis
- Code examples: HIGH - Based on actual codebase patterns and real type definitions

**Research date:** 2026-02-16
**Valid until:** Indefinite (code-specific research, not library-version dependent)
