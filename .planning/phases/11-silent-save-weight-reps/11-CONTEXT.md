# Phase 11: Silent Save of Weight/Reps to Template - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

When a user modifies weight/reps during an active workout and finishes the workout, silently save completed set values back to the template — matching existing rest timer silent save behavior. Does NOT trigger the template update confirmation modal. Works offline.

</domain>

<decisions>
## Implementation Decisions

### Per-set save behavior
- Each set saves independently — template preserves per-set values exactly as performed
- Both weight AND reps save per-set (e.g., 135x10, 140x8, 145x6 all preserved individually)
- Every completed set overwrites its corresponding template set (by position: workout set 1 → template set 1, etc.)
- Sets beyond the template count are ignored (e.g., user added set 4 but template has 3 sets → set 4 ignored)

### Incomplete workout handling
- Cancelled/discarded workout = no changes saved to template at all
- Finished workout: only sets marked as "done" at save time have their values saved
- Evaluation is purely set-level, not exercise-level — each completed set saves independently regardless of whether the full exercise was completed
- Done button clicks/unclicks during the workout do NOT trigger any saves or checks — evaluation happens only at the workout save process

### Change detection and modal interaction
- Always overwrite completed sets — no diff comparison against template values needed (simpler logic, ensures template matches last workout)
- If user confirmed the template update modal → skip silent save entirely (modal already handled the update)
- If user declined the template update modal → silent save still fires for weight/reps on matching-position sets
- Set matching is by position (set 1 maps to template set 1, set 2 to set 2, etc.)
- If workout has more sets than template (user added sets, declined modal): save matching positions, ignore extras
- If workout has fewer sets than template (user removed sets, declined modal): extra template sets keep their existing values

### Claude's Discretion
- Whether to leverage the existing rest timer silent save implementation or create separate logic
- Technical approach to matching workout sets to template sets
- Error handling for edge cases (corrupted data, missing template, etc.)
- Offline queue integration details

</decisions>

<specifics>
## Specific Ideas

- "The update logic should be similar to rest timer silent save, but should account for the fact that workout sets might be different than template sets"
- The existing template update confirmation modal already handles structural changes (added/removed sets) — this silent save is specifically for weight/reps values on non-structural changes

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-silent-save-weight-reps*
*Context gathered: 2026-02-16*
