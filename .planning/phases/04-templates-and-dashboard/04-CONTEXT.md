# Phase 4: Templates and Dashboard - Context

**Gathered:** 2026-02-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create, edit, and delete workout templates from a dashboard that serves as the app's central hub — the launch point for every workout. Dashboard displays template cards in a grid with a "Start" button per template. Template editor opens as a modal for building/editing templates (name, exercises, sets with weight/reps, rest times). Exercise picker from Phase 3 is reused. Charts section is Phase 6 — not in scope here.

</domain>

<decisions>
## Implementation Decisions

### Dashboard Header
- Sticky header with "IronLift" brand text and settings gear icon (right side)
- Matches web app header layout: brand left, gear icon right

### Template Grid
- 2-column grid layout for template cards
- Gap between cards matches web spacing (8px / spacing.sm)
- "+' card at the end of the grid as the "New Template" entry point — tapping opens the template editor in create mode

### Template Card Design
- Card shows: template name (2-line clamp, bold) + first 2-3 exercise names as a mini preview list + full-width "Start" button at bottom
- Card body is NOT tappable — only the explicit "Start" button triggers a workout (Phase 5)
- Edit and Delete accessed via **swipe-to-reveal** (swipe left on card) — native iOS pattern, keeps card surface clean
- No hover states (iOS) — swipe replaces the web's visible edit/delete icons

### Template Editor (Modal)
- Opens as modal (slides up from bottom) per Decision 6b
- Header: Cancel (left) / "New Template" or "Edit Template" (center) / Save (right)
- Template name input with placeholder "e.g., Upper Body Day"
- Exercise list with exercise editor cards (one per exercise)
- "Add Exercise" full-width button at bottom opens Phase 3's ExercisePickerModal
- **Unsaved changes protection**: If user has changes and taps Cancel, show "Discard changes?" confirmation dialog

### Set Configuration (per exercise)
- Table layout per exercise card: set# | weight | reps | delete button
- Default: 3 sets, weight=0, reps=10 per new exercise
- "Add Set" button on exercise card header adds a new set (copies last set's values)
- Minimum 1 set per exercise (can't delete the last set)
- Number inputs for weight and reps (centered, monospace)

### Rest Timer Configuration (per exercise)
- Inline rest timer display below sets: [-10s] [progress bar] [time input MM:SS] [+10s]
- Default: 90 seconds per exercise
- -10s/+10s buttons adjust in 10-second increments
- Minimum: 0 seconds
- Time input accepts MM:SS format

### Exercise Reordering
- Drag handles (grip icon) on each exercise card in the template editor
- User long-presses or grabs the handle to drag-to-reorder
- **Research needed**: Evaluate `react-native-draggable-flatlist` or similar library for drag-to-reorder support — avoid manual drag/release gesture math. Must work in Expo Go with `react-native-gesture-handler` + `react-native-reanimated`

### Exercise Removal
- Remove button on exercise card header (visible, not swipe-based — this is inside the editor, not the dashboard)
- Matches web pattern: X button on exercise card

### Delete Template
- Confirmation dialog before deletion: "Delete [template name]?"
- Deletes template and all associated exercises/sets (cascade)

### Empty State (no templates)
- Centered text: "No templates yet. Create your first workout template to get started!"
- The '+' grid card is always visible as the create entry point

### Validation
- Template name required (non-empty after trim)
- At least one exercise required
- Error messages displayed at top of editor

### Template Service
- Port `templates.ts` from web app — swap Supabase client import, same business logic
- CRUD: getTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate
- addExerciseToTemplate, removeExerciseFromTemplate, updateTemplateExercise
- Update replaces entire exercise list (delete all, re-insert)

### Claude's Discretion
- Swipe-to-reveal animation and gesture implementation details
- Exercise card expand/collapse behavior (if needed for long templates)
- Exact card proportions and spacing for the 2-column grid with exercise preview
- Loading skeleton design for dashboard
- Error state handling for failed CRUD operations
- Keyboard avoidance behavior in template editor modal
- How many exercise names to preview on cards (2-3, based on card height)

</decisions>

<specifics>
## Specific Ideas

- Template cards should show exercise name previews (first 2-3 exercises) — gives context about what's in the template without opening it
- Swipe-to-reveal for card actions is preferred over visible icons because it keeps the card surface clean on the small mobile screen
- Drag-to-reorder for exercises should feel native — prefer a library solution over hand-rolled gesture math
- The '+' card in the grid should visually read as an invitation to create (dashed border or similar)
- Web app at `Apps/exercise_tracker_app/` is the pixel reference for all other visual details (colors, spacing, typography, rest timer inline layout)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-templates-and-dashboard*
*Context gathered: 2026-02-13*
