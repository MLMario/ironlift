# Phase 7: History and Settings - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Settings bottom sheet from dashboard gear icon with navigation to My Exercises, Workout History, and Log Out. My Exercises screen for managing custom exercises (list, inline edit, create, delete with dependency warnings). Workout History screen with paginated timeline showing summary stats. Workout Detail screen showing full exercise/set breakdown for a past workout. All sub-screens present as stack pushes after dismissing the bottom sheet.

</domain>

<decisions>
## Implementation Decisions

### Settings Bottom Sheet
- `@gorhom/bottom-sheet` overlay on dashboard, triggered by existing gear icon (currently wired to logout — rewire to open sheet)
- Three menu items only: My Exercises, Workout History, Log Out — matching web app's SettingsMenu
- Menu item visual: icon (list/calendar/logout) + label + chevron, per web's settings-menu-item pattern
- No additional items (no app version footer, no theme toggle)
- Log Out button styled with danger color, separated from navigation items

### Settings Navigation Flow
- Tapping My Exercises or Workout History: bottom sheet dismisses first, then sub-screen pushes as stack navigation
- Back button from My Exercises or History returns to dashboard (re-open sheet from gear icon)
- Back button from Workout Detail returns to History (standard stack pop)
- Stack structure: Dashboard → History → Detail (two-level deep); Dashboard → My Exercises (one-level deep)

### Workout History Timeline
- Timeline with decorative vertical line + dots (match web app's visual treatment)
- Summary stats bar at top: total workouts, total sets, total volume — sticky (does not scroll away)
- Stats bar layout: three equal-width boxes with value (accent, monospace) + label (uppercase, muted)
- Volume formatted with formatVolume helper: 45200 → "45.2k", 1000 → "1k", 750 → "750"
- Infinite scroll pagination (auto-load next page when scrolling near bottom, not "Load More" button)
- Page size: 7 items (matching web)
- Workout card: template name (or "Untitled Workout"), exercise count badge, completed sets badge, total volume badge
- Date markers: "Feb 5" format (short month + day, no year)
- Empty state: "No workout history yet"
- Tapping a workout card navigates to Workout Detail

### Workout Detail
- Read-only view — no delete, share, or other actions
- Header: template name (or "Untitled Workout") + date ("Feb 5, 2026" with year)
- Exercise blocks with category badges (color-coded per category: Chest=red, Back=blue, Shoulders=orange, Legs=green, Arms=purple, Core=yellow)
- Set grid per exercise: set number, weight, reps, status (checkmark for done, X for skipped)
- Exercises sorted by order field, sets by set_number

### My Exercises
- Alphabetical list of user-created exercises (name + category per row)
- Inline accordion edit: tap edit icon → form expands below the row with name input, category dropdown, cancel/save buttons (match web pattern)
- Single exercise expanded at a time — switching rows collapses the previous
- Edit validation: empty name, invalid characters (non-alphanumeric/space), duplicate name (case-insensitive)
- Delete: dependency check (templateCount, workoutLogCount, chartCount) → warning with counts only (not listing specific items) → confirmation modal
- Create: modal with name + category dropdown (same validation as edit)
- Empty state: "You haven't created any custom exercises yet" + Create Exercise button

### Claude's Discretion
- Timeline line/dot exact dimensions and positioning in RN (implementing the pseudo-element pattern natively)
- Infinite scroll threshold distance for triggering next page load
- Bottom sheet snap points and height configuration
- Transition animation timing between sheet dismiss and stack push
- Set grid column widths adaptation for mobile screen sizes
- Exercise block accordion animation implementation

</decisions>

<specifics>
## Specific Ideas

- Web app's settings panel (`SettingsPanel.tsx`) uses internal sub-navigation state ('menu' | 'exercises' | 'history' | 'workout-detail') — iOS replaces this with actual stack navigation (dismiss sheet → push screen)
- Web app's history timeline uses CSS pseudo-element `::before` for the vertical line — iOS needs a View-based equivalent
- Category badge colors from web are data-driven style mappings — port as a category-to-color lookup object
- Stats bar values use monospace font (SF Mono on iOS, matching web's `ui-monospace`)
- Web app resets panel view to 'menu' after close animation — iOS gets this for free since each open of the bottom sheet starts fresh

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-history-and-settings*
*Context gathered: 2026-02-15*
