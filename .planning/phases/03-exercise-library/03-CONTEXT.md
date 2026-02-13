# Phase 3: Exercise Library - Context

**Gathered:** 2026-02-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Browse ~1000 system exercises with search and category filtering, create custom exercises inline, and build a reusable exercise picker modal. The exercise service supports full CRUD (create, read, update, delete), but edit/delete UI is deferred to Phase 7's My Exercises screen. Only the create flow has UI in this phase.

</domain>

<decisions>
## Implementation Decisions

### Exercise picker modal presentation
- Near-full sheet (iOS style) — covers ~90% of screen with small gap at top showing parent screen dimmed
- Dismiss via swipe-down or X button in top-right corner
- Layout order top-to-bottom: Title/X → Search bar → Category chips → Scrollable exercise list → "Create New Exercise" toggle button → Inline create form
- Search moved above category filter (differs from web app's filter-first order) — iOS convention puts the most common action at the top
- Modal state resets on open: search cleared, filter reset to "All", create form hidden

### Exercise list layout
- Flat list (not sectioned by category) — matches web app
- Sort: user exercises first, then system exercises, alphabetical within each group — same ordering always, regardless of filter/search state
- Per-row info: exercise name (bold) + category (muted gray below) — no equipment metadata displayed
- CUSTOM green pill badge on user-created exercises (right-aligned)
- Disabled state (dimmed, non-tappable) for already-added exercises
- Empty state: simple centered text "No exercises found" — no additional prompts

### Category filter
- Scrollable horizontal chips (pill-shaped) — not dropdown like web app
- Single-select: one category at a time, tap to switch
- "All" chip pre-selected by default when picker opens
- Hardcoded category list: All, Chest, Back, Shoulders, Legs, Arms, Core, Other (Cardio dropped — DB constraint excludes it)
- Same categories used everywhere (filter chips and create form minus "All")

### Custom exercise creation
- Inline form inside the picker modal, toggled via full-width button ("Create New Exercise" / "Cancel New Exercise")
- Form fields: Exercise Name (text input) + Category (dropdown/picker from the same hardcoded list minus "All")
- Duplicate names rejected with error message
- On successful creation: auto-select the new exercise and close the modal
- Edit/delete UI deferred to Phase 7 — Phase 3 only delivers the create flow UI

### Exercise service scope
- Full CRUD service layer built (create, read, update, delete) — ported from web app's exercises.ts
- Read: fetch all system exercises + user's custom exercises
- Create: name + category, duplicate name validation
- Update/Delete: service methods ready, UI deferred to Phase 7
- Exercise data cached in AsyncStorage (system exercises + user exercises)
- Custom exercise CRUD requires connectivity

### Claude's Discretion
- CUSTOM badge exact sizing, color token mapping (use theme success color)
- Search bar styling (iOS-native feel vs custom)
- Chip styling details (selected state color, spacing, size)
- Loading states and skeleton patterns
- Error handling UX for failed creates
- Exercise list virtualization approach for ~1000 items
- Cache refresh strategy for exercises

</decisions>

<specifics>
## Specific Ideas

- Match web app's exercise picker as the visual reference — same info density, same sort order, same inline create flow
- iOS adaptations: near-full sheet instead of centered modal, scrollable chips instead of dropdown, search above filter
- Equipment metadata exists in database but is NOT displayed in current implementation — only name and category shown

</specifics>

<deferred>
## Deferred Ideas

- Edit/delete custom exercise UI — Phase 7 (My Exercises screen)
- Equipment display/filtering — not needed in current implementation
- Exercise detail view (tap to see full info) — not in current scope

</deferred>

---

*Phase: 03-exercise-library*
*Context gathered: 2026-02-12*
