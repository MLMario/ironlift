# Phase 7: History and Settings - Research

**Researched:** 2026-02-15
**Domain:** Settings bottom sheet, workout history timeline, workout detail, exercise management UI
**Confidence:** MEDIUM (bottom sheet SDK 54 compatibility has known issues requiring validation)

## Summary

Phase 7 builds four distinct features: a settings bottom sheet overlay on the dashboard, a workout history screen with paginated timeline and summary stats, a workout detail screen showing exercise/set breakdowns, and a My Exercises management screen with inline editing. All services are already ported (logging service with `getWorkoutLogsPaginated`, `getWorkoutSummaryStats`, `getWorkoutLog`; exercises service with `getUserExercises`, `updateExercise`, `getExerciseDependencies`, `createExercise`, `deleteExercise`). The screen route files exist as placeholders. The primary implementation work is UI components and wiring.

The main technical risk is `@gorhom/bottom-sheet` compatibility with the project's Expo SDK 54 + Reanimated v4.1.6 stack. Research found multiple GitHub issues reporting problems with this exact combination, but the critical fix (reanimated >= 4.1.4) is already satisfied by the project's v4.1.6. A hand-rolled RN Modal fallback should be planned in case `@gorhom/bottom-sheet` proves unstable after installation.

**Primary recommendation:** Install `@gorhom/bottom-sheet` v5.2.8+ and validate basic open/close/dismiss behavior immediately. If it works, use it for the settings sheet. If not, fall back to the RN Modal pattern already proven in this codebase (AddChartSheet, ConfirmationModal).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Settings Bottom Sheet:**
- `@gorhom/bottom-sheet` overlay on dashboard, triggered by existing gear icon (currently wired to logout -- rewire to open sheet)
- Three menu items only: My Exercises, Workout History, Log Out -- matching web app's SettingsMenu
- Menu item visual: icon (list/calendar/logout) + label + chevron, per web's settings-menu-item pattern
- No additional items (no app version footer, no theme toggle)
- Log Out button styled with danger color, separated from navigation items

**Settings Navigation Flow:**
- Tapping My Exercises or Workout History: bottom sheet dismisses first, then sub-screen pushes as stack navigation
- Back button from My Exercises or History returns to dashboard (re-open sheet from gear icon)
- Back button from Workout Detail returns to History (standard stack pop)
- Stack structure: Dashboard -> History -> Detail (two-level deep); Dashboard -> My Exercises (one-level deep)

**Workout History Timeline:**
- Timeline with decorative vertical line + dots (match web app's visual treatment)
- Summary stats bar at top: total workouts, total sets, total volume -- sticky (does not scroll away)
- Stats bar layout: three equal-width boxes with value (accent, monospace) + label (uppercase, muted)
- Volume formatted with formatVolume helper: 45200 -> "45.2k", 1000 -> "1k", 750 -> "750"
- Infinite scroll pagination (auto-load next page when scrolling near bottom, not "Load More" button)
- Page size: 7 items (matching web)
- Workout card: template name (or "Untitled Workout"), exercise count badge, completed sets badge, total volume badge
- Date markers: "Feb 5" format (short month + day, no year)
- Empty state: "No workout history yet"
- Tapping a workout card navigates to Workout Detail

**Workout Detail:**
- Read-only view -- no delete, share, or other actions
- Header: template name (or "Untitled Workout") + date ("Feb 5, 2026" with year)
- Exercise blocks with category badges (color-coded per category: Chest=red, Back=blue, Shoulders=orange, Legs=green, Arms=purple, Core=yellow)
- Set grid per exercise: set number, weight, reps, status (checkmark for done, X for skipped)
- Exercises sorted by order field, sets by set_number

**My Exercises:**
- Alphabetical list of user-created exercises (name + category per row)
- Inline accordion edit: tap edit icon -> form expands below the row with name input, category dropdown, cancel/save buttons (match web pattern)
- Single exercise expanded at a time -- switching rows collapses the previous
- Edit validation: empty name, invalid characters (non-alphanumeric/space), duplicate name (case-insensitive)
- Delete: dependency check (templateCount, workoutLogCount, chartCount) -> warning with counts only (not listing specific items) -> confirmation modal
- Create: modal with name + category dropdown (same validation as edit)
- Empty state: "You haven't created any custom exercises yet" + Create Exercise button

### Claude's Discretion
- Timeline line/dot exact dimensions and positioning in RN (implementing the pseudo-element pattern natively)
- Infinite scroll threshold distance for triggering next page load
- Bottom sheet snap points and height configuration
- Transition animation timing between sheet dismiss and stack push
- Set grid column widths adaptation for mobile screen sizes
- Exercise block accordion animation implementation

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core (Already in Project)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `expo-router` | ~6.0.23 | File-based routing for settings screens | Installed, placeholder routes exist |
| `react-native-reanimated` | ~4.1.6 | Accordion animation, bottom sheet dependency | Installed |
| `react-native-gesture-handler` | ~2.28.0 | Bottom sheet dependency, swipe gestures | Installed |
| `react-native-safe-area-context` | ~5.6.0 | SafeAreaView for all screens | Installed |
| `@expo/vector-icons` (Ionicons) | ^15.0.3 | Menu item icons (list, calendar, log-out) | Installed |

### To Install

| Library | Version | Purpose | Risk Level |
|---------|---------|---------|------------|
| `@gorhom/bottom-sheet` | ^5.2.8 | Settings bottom sheet overlay | MEDIUM -- known SDK 54 issues, but project has reanimated >= 4.1.4 which should resolve them |

### Fallback (If @gorhom/bottom-sheet fails)

| Pattern | Purpose | Precedent |
|---------|---------|-----------|
| RN Modal + slide animation | Settings bottom sheet as Modal | AddChartSheet, ConfirmationModal already use this pattern successfully |

**Installation:**
```bash
pnpm add @gorhom/bottom-sheet@^5.2.8
```

**Validation test after install:**
```typescript
// Minimal smoke test in dashboard:
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
// Render with a single snap point, verify open/close/dismiss
```

## Architecture Patterns

### Route Structure (Already Exists -- Replace Placeholders)

```
app/
├── _layout.tsx              <- Root stack (settings group already registered)
├── index.tsx                <- Dashboard (rewire gear icon to open bottom sheet)
└── settings/
    ├── _layout.tsx          <- Settings stack layout (exists, headerShown: false)
    ├── exercises.tsx         <- My Exercises (placeholder exists, replace)
    ├── history.tsx           <- Workout History (placeholder exists, replace)
    └── [exerciseId].tsx      <- RENAME to [workoutId].tsx for Workout Detail
```

**CRITICAL: Route file rename needed.** The existing `[exerciseId].tsx` in `settings/` was a Phase 1 placeholder for "Exercise Detail." Per CONTEXT.md decisions, this screen is actually Workout Detail, navigated from History. Rename to `[workoutId].tsx` and update the route parameter accordingly.

### Component Structure

```
src/components/
├── SettingsSheet.tsx         # Bottom sheet overlay with menu items (NEW)
├── SettingsMenuItem.tsx      # Icon + label + chevron menu row (NEW)
├── WorkoutHistoryTimeline.tsx  # Timeline with line/dots + cards (NEW)
├── WorkoutHistoryCard.tsx    # Individual workout card with badges (NEW)
├── SummaryStatsBar.tsx       # Three-box stats bar (NEW)
├── WorkoutDetailView.tsx     # Exercise blocks + set grids (NEW)
├── ExerciseBlock.tsx         # Single exercise with category badge + set grid (NEW)
├── MyExercisesList.tsx       # Exercise list with inline edit accordion (NEW)
├── CreateExerciseModal.tsx   # Modal for creating new exercise (NEW)
├── ConfirmationModal.tsx     # EXISTING -- reuse for delete confirmation
```

### Pattern 1: Bottom Sheet as Dashboard Overlay

The settings bottom sheet is NOT a route screen -- it is a component rendered on the dashboard that overlays content. The dashboard owns the sheet state.

```typescript
// In app/index.tsx (Dashboard):
import { SettingsSheet } from '@/components/SettingsSheet';

// State
const [settingsOpen, setSettingsOpen] = useState(false);

// Gear icon handler (replace current auth.logout())
function handleSettingsPress() {
  setSettingsOpen(true);
}

// Navigation handlers -- dismiss sheet, then navigate
function handleMyExercises() {
  setSettingsOpen(false);
  // Small delay to let sheet dismiss animation complete
  setTimeout(() => router.push('/settings/exercises'), 200);
}

function handleHistory() {
  setSettingsOpen(false);
  setTimeout(() => router.push('/settings/history'), 200);
}

function handleLogout() {
  setSettingsOpen(false);
  auth.logout();
}
```

### Pattern 2: Dismiss-Then-Navigate Timing

The CONTEXT.md specifies: "bottom sheet dismisses first, then sub-screen pushes." This requires a sequenced animation. Two approaches:

**Option A: setTimeout (simple, recommended)**
```typescript
const handleNavigate = (route: string) => {
  bottomSheetRef.current?.close();
  setTimeout(() => router.push(route), 250);
};
```

**Option B: onClose callback (more precise)**
```typescript
// Track pending navigation
const pendingRoute = useRef<string | null>(null);

const handleNavigate = (route: string) => {
  pendingRoute.current = route;
  bottomSheetRef.current?.close();
};

const handleSheetClose = () => {
  if (pendingRoute.current) {
    router.push(pendingRoute.current);
    pendingRoute.current = null;
  }
};
```

**Recommendation:** Option A (setTimeout with ~200-250ms delay). Simpler, and the AddChartSheet already uses this pattern implicitly. The bottom sheet `onClose` callback timing can be unpredictable with gesture handler.

### Pattern 3: FlatList Infinite Scroll

Use FlatList's built-in `onEndReached` + `onEndReachedThreshold` for automatic pagination.

```typescript
<FlatList
  data={workouts}
  renderItem={renderWorkoutCard}
  keyExtractor={(item) => item.id}
  onEndReached={loadMore}
  onEndReachedThreshold={0.3}  // Trigger when 30% from bottom
  ListHeaderComponent={<SummaryStatsBar stats={summary} />}
  ListFooterComponent={isLoadingMore ? <ActivityIndicator /> : null}
  ListEmptyComponent={<EmptyState message="No workout history yet" />}
  stickyHeaderIndices={[0]}  // Keep stats bar sticky
/>
```

**Key detail:** `stickyHeaderIndices={[0]}` makes the `ListHeaderComponent` (SummaryStatsBar) stick to the top during scrolling -- matching the locked decision "sticky (does not scroll away)."

### Pattern 4: Accordion with LayoutAnimation

For the inline exercise edit accordion in My Exercises, use `LayoutAnimation` for smooth expand/collapse:

```typescript
import { LayoutAnimation, UIManager, Platform } from 'react-native';

// Enable on Android if needed (iOS has it by default)
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

function handleEditClick(exerciseId: string) {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  setExpandedId(expandedId === exerciseId ? null : exerciseId);
}
```

Alternative: `react-native-reanimated` with `useAnimatedStyle` and `withTiming` for height interpolation. This is more complex but gives finer control. Given that the accordion is a simple expand/collapse, `LayoutAnimation` is sufficient and simpler.

### Pattern 5: Category Color Lookup

Port the web's CSS `data-category` color mapping to a TypeScript lookup object:

```typescript
// Source: web app's styles.css category colors
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Chest:     { bg: 'rgba(239, 68, 68, 0.15)',  text: '#ef4444' },
  Back:      { bg: 'rgba(59, 130, 246, 0.15)',  text: '#3b82f6' },
  Shoulders: { bg: 'rgba(249, 115, 22, 0.15)',  text: '#f97316' },
  Legs:      { bg: 'rgba(34, 197, 94, 0.15)',   text: '#22c55e' },
  Arms:      { bg: 'rgba(168, 85, 247, 0.15)',  text: '#a855f7' },
  Core:      { bg: 'rgba(234, 179, 8, 0.15)',   text: '#eab308' },
  Other:     { bg: 'rgba(161, 161, 170, 0.15)', text: '#a1a1aa' },
};
```

### Anti-Patterns to Avoid

- **DO NOT render BottomSheet inside a ScrollView.** The bottom sheet must be a sibling of the ScrollView at the dashboard level, not nested inside it.
- **DO NOT use nested FlatLists.** The workout history timeline should be a single FlatList, not a ScrollView wrapping a FlatList.
- **DO NOT navigate from inside the bottom sheet component.** Navigation should be handled by the dashboard via callbacks to ensure proper sheet dismissal sequencing.
- **DO NOT forget to handle the FlatList `onEndReached` double-firing.** Add a `isLoadingMore` guard to prevent duplicate page loads.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bottom sheet gestures | Custom pan responder bottom sheet | `@gorhom/bottom-sheet` or RN Modal | Gesture physics, snap points, backdrop dimming, keyboard avoidance |
| Category color lookup | Per-component if/else chains | Shared `CATEGORY_COLORS` constant object | Used in WorkoutDetail exercise blocks and potentially elsewhere |
| Volume formatting | Inline math in each component | Shared `formatVolume()` utility function | Web app already has this pattern; reuse across History and Detail |
| Date formatting | Inline `toLocaleDateString` calls | Shared `formatWorkoutDate()` and `formatDetailDate()` helpers | Consistent formatting, match web patterns exactly |
| Confirmation modal | New modal for delete exercise | Existing `ConfirmationModal` component | Already built with configurable title, message, danger/primary variants |
| Infinite scroll pagination | Custom scroll event listener | FlatList `onEndReached` + `onEndReachedThreshold` | Built-in, performant, handles edge cases |

## Common Pitfalls

### Pitfall 1: @gorhom/bottom-sheet SDK 54 Crashes
**What goes wrong:** Bottom sheet crashes or doesn't open on Expo SDK 54 with Reanimated v4
**Why it happens:** Library v5 was originally built for Reanimated v3; v5.1.8+ added v4 support but some edge cases remain
**How to avoid:** Install v5.2.8+ (latest), ensure reanimated >= 4.1.4 (project has 4.1.6), test basic open/close immediately after install. If broken, fall back to RN Modal pattern.
**Warning signs:** `TypeError: Cannot read property 'level' of undefined`, sheet not responding to gestures, touch blocking after close

### Pitfall 2: FlatList onEndReached Fires Multiple Times
**What goes wrong:** `onEndReached` triggers multiple times causing duplicate API calls and duplicate items
**Why it happens:** FlatList fires `onEndReached` on render and whenever the threshold is crossed
**How to avoid:** Guard with `isLoadingMore` state flag. Only call `loadMore` when `!isLoadingMore && hasMore`.
**Warning signs:** Duplicate items in the list, excessive API calls in network tab

### Pitfall 3: Bottom Sheet Inside ScrollView
**What goes wrong:** Bottom sheet gestures conflict with parent ScrollView, causing janky or non-functional behavior
**Why it happens:** Gesture handlers compete for touch events
**How to avoid:** Render the BottomSheet as a sibling of the ScrollView at the dashboard level, not inside it. The dashboard currently wraps content in a ScrollView; the BottomSheet should be rendered outside and above it.
**Warning signs:** Sheet doesn't respond to swipe gestures, sheet content scrolling conflicts

### Pitfall 4: stickyHeaderIndices with FlatList + ListHeaderComponent
**What goes wrong:** `stickyHeaderIndices` doesn't work as expected with `ListHeaderComponent`
**Why it happens:** In FlatList, `ListHeaderComponent` is at index 0 and IS included in `stickyHeaderIndices`. But if the data array changes, the sticky behavior can break.
**How to avoid:** `stickyHeaderIndices={[0]}` is correct for making `ListHeaderComponent` sticky. Ensure the header renders consistently (don't conditionally omit it).
**Warning signs:** Stats bar scrolls away with content, or sticky bar causes layout jumps

### Pitfall 5: Route File Naming Mismatch
**What goes wrong:** Navigation to workout detail fails because route expects `exerciseId` but receives `workoutId`
**Why it happens:** Phase 1 placeholder named the file `[exerciseId].tsx` but the actual feature navigates with workout IDs
**How to avoid:** Rename `[exerciseId].tsx` to `[workoutId].tsx` before building the Workout Detail screen. Update `useLocalSearchParams` accordingly.
**Warning signs:** 404 on navigation, undefined route parameters

### Pitfall 6: Dismiss-Then-Navigate Race Condition
**What goes wrong:** Navigation fires before bottom sheet finishes closing, causing visual artifacts or stale state
**Why it happens:** Sheet close animation takes ~200-300ms, but `router.push()` is synchronous
**How to avoid:** Use a setTimeout delay (200-250ms) between `close()` and `router.push()`, or use the `onClose` callback from bottom sheet.
**Warning signs:** Sub-screen appears while sheet is still visible, sheet overlay persists on sub-screen

## Code Examples

### formatVolume Utility (Port from Web)
```typescript
// Source: web app WorkoutHistoryList.tsx
function formatVolume(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return k % 1 === 0 ? k + 'k' : k.toFixed(1) + 'k';
  }
  return n.toLocaleString();
}
```

### formatWorkoutDate (Short Format)
```typescript
// Source: web app WorkoutHistoryList.tsx
function formatWorkoutDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}
```

### formatDetailDate (With Year)
```typescript
// Source: web app WorkoutDetail.tsx
function formatDetailDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
```

### Timeline Line + Dot (Native Equivalent of CSS ::before)
```typescript
// Web uses CSS pseudo-element ::before for the vertical line.
// RN equivalent: absolute-positioned View as the first child of the timeline container.

// Timeline container
<View style={styles.timelineContainer}>
  {/* Decorative vertical line */}
  <View style={styles.timelineLine} />

  {/* Timeline items */}
  {workouts.map((workout) => (
    <View key={workout.id} style={styles.timelineItem}>
      {/* Dot */}
      <View style={styles.timelineDot} />
      {/* Date + Card */}
      <View style={styles.timelineContent}>
        <Text style={styles.dateText}>{formatWorkoutDate(workout.started_at)}</Text>
        <WorkoutHistoryCard workout={workout} onPress={() => handleSelect(workout.id)} />
      </View>
    </View>
  ))}
</View>

// Styles (dimensions from web CSS):
timelineContainer: {
  position: 'relative',
  paddingLeft: 28,       // web: padding-left: 28px
},
timelineLine: {
  position: 'absolute',
  left: 6,               // web: left: 6px
  top: 14,               // Align with first dot
  bottom: 0,
  width: 2,              // web: width: 2px
  backgroundColor: '#2a2a2a',  // theme.colors.border
  borderRadius: 1,
},
timelineItem: {
  position: 'relative',
  marginBottom: 16,      // theme.spacing.md
},
timelineDot: {
  position: 'absolute',
  left: -28,             // web: left: -28px
  top: 14,               // web: top: 14px (center with card)
  width: 10,             // web: width: 10px
  height: 10,            // web: height: 10px
  borderRadius: 5,
  backgroundColor: '#4f9eff',  // theme.colors.accent
},
```

### BottomSheet Basic Setup
```typescript
// Source: @gorhom/bottom-sheet docs
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';

const bottomSheetRef = useRef<BottomSheet>(null);

// Dynamic snap points based on content
// For 3 menu items: ~250-300px height
const snapPoints = useMemo(() => ['35%'], []);

// Open
const openSheet = () => bottomSheetRef.current?.expand();

// Close
const closeSheet = () => bottomSheetRef.current?.close();

// Backdrop (dims background, tap to dismiss)
const renderBackdrop = useCallback(
  (props: any) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      opacity={0.6}
    />
  ),
  []
);

<BottomSheet
  ref={bottomSheetRef}
  snapPoints={snapPoints}
  index={-1}  // Start closed
  enablePanDownToClose
  backdropComponent={renderBackdrop}
  backgroundStyle={{ backgroundColor: theme.colors.bgSurface }}
  handleIndicatorStyle={{ backgroundColor: theme.colors.textMuted }}
>
  <BottomSheetView>
    {/* Menu items here */}
  </BottomSheetView>
</BottomSheet>
```

### Set Grid Layout
```typescript
// Source: web CSS grid-template-columns: 48px 1fr 1fr 48px
// RN equivalent: flexDirection: 'row' with fixed + flex widths

const setGridRow: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 6,
};

const setCell: TextStyle = {
  fontSize: 14,
  color: theme.colors.textSecondary,
  textAlign: 'center',
};

// Column widths:
// Set number: width 48
// Weight: flex 1
// Reps: flex 1
// Status: width 48
```

### Existing Service Functions (Already Built)

These service functions are already ported and ready to use:

```typescript
// Logging service (src/services/logging.ts):
logging.getWorkoutLogsPaginated(offset, limit)  // Returns PaginatedResult<WorkoutHistoryItem>
logging.getWorkoutSummaryStats()                 // Returns WorkoutSummaryStats
logging.getWorkoutLog(id)                        // Returns WorkoutLogWithExercises

// Exercise service (src/services/exercises.ts):
exercises.getUserExercises()                     // Returns Exercise[] (user-created only, alphabetical)
exercises.updateExercise({ id, name?, category? }) // Returns UpdateExerciseResult with validation errors
exercises.createExercise(name, category)         // Returns Exercise
exercises.deleteExercise(id)                     // Returns ServiceError
exercises.getExerciseDependencies(exerciseId)    // Returns ExerciseDependencies { templateCount, workoutLogCount, chartCount }
exercises.getCategories()                        // Returns ExerciseCategory[]
```

### Reusable Components (Already Built)

```typescript
// ConfirmationModal -- reuse for delete exercise confirmation
import { ConfirmationModal } from '@/components/ConfirmationModal';
// Props: visible, title, message, secondaryMessage?, confirmLabel, cancelLabel,
//        confirmVariant ('primary' | 'danger'), dismissOnOverlayPress?, onConfirm, onCancel

// DashboardHeader -- already has onSettingsPress prop
import { DashboardHeader } from '@/components/DashboardHeader';
// Currently: onSettingsPress calls auth.logout()
// Phase 7: rewire to open settings bottom sheet
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Placeholder screen files | Implement actual screens | Phase 7 | Replace 3 placeholder files |
| Gear icon -> auth.logout() | Gear icon -> settings sheet | Phase 7 | Rewire handleSettingsPress in dashboard |
| `[exerciseId].tsx` route | `[workoutId].tsx` route | Phase 7 | Rename file, update params |
| No @gorhom/bottom-sheet installed | Install and use for settings | Phase 7 | New dependency |

## Open Questions

1. **@gorhom/bottom-sheet stability**
   - What we know: Latest v5.2.8 should work with reanimated >= 4.1.4 (project has 4.1.6). Issue #2507 was resolved by reanimated 4.1.4+.
   - What's unclear: Whether other issues (touch blocking #2551, crashes on close #2476) affect this exact version combination.
   - Recommendation: Install early in phase, validate immediately. Have RN Modal fallback ready.

2. **FlatList with timeline decoration**
   - What we know: FlatList renders items in a virtualized list. Timeline decorations (line, dots) need to render relative to items.
   - What's unclear: Whether the continuous vertical line works well with FlatList's virtualization (items unmount when off-screen, potentially breaking the continuous line visual).
   - Recommendation: Render the timeline line as an absolute-positioned view in the FlatList's container, not per-item. Dots are per-item and work fine with virtualization.

3. **stickyHeaderIndices behavior on iOS**
   - What we know: `stickyHeaderIndices={[0]}` should make `ListHeaderComponent` sticky.
   - What's unclear: Edge cases with dynamic header height (loading vs. loaded stats).
   - Recommendation: Always render the stats bar (show 0/0/0 while loading, or a skeleton). Don't conditionally omit it.

## Sources

### Primary (HIGH confidence)
- Web app reference files: `SettingsMenu.tsx`, `SettingsPanel.tsx`, `WorkoutHistoryList.tsx`, `WorkoutDetail.tsx`, `MyExercisesList.tsx` -- exact UI patterns and formatting logic
- Web app CSS `styles.css` -- exact dimensions, colors, spacing for timeline, category badges, set grid
- Existing codebase: `src/services/logging.ts`, `src/services/exercises.ts` -- all service functions already ported
- Existing codebase: `src/types/services.ts`, `src/types/database.ts` -- all types already defined
- Existing codebase: `src/theme/tokens.ts` -- theme tokens available
- Existing codebase: `app/settings/_layout.tsx`, `app/settings/*.tsx` -- route files exist as placeholders

### Secondary (MEDIUM confidence)
- [GitHub Issue #2507](https://github.com/gorhom/react-native-bottom-sheet/issues/2507) -- confirmed fix in reanimated 4.1.4+
- [GitHub Releases](https://github.com/gorhom/react-native-bottom-sheet/releases) -- v5.2.8 is latest (Dec 4, 2025)
- [@gorhom/bottom-sheet docs](https://gorhom.dev/react-native-bottom-sheet/) -- basic usage pattern
- React Native FlatList `onEndReached` pattern -- standard infinite scroll approach

### Tertiary (LOW confidence)
- [GitHub Issue #2471](https://github.com/gorhom/react-native-bottom-sheet/issues/2471) -- SDK 54 TypeError, resolved but unclear which version
- [GitHub Issue #2546](https://github.com/gorhom/react-native-bottom-sheet/issues/2546) -- reanimated v4 incompatibility (closed as invalid for template issues)
- [GitHub Issue #2528](https://github.com/gorhom/react-native-bottom-sheet/issues/2528) -- sheet won't open after expo 54 upgrade (closed for template issues)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all services and types already exist, only UI components needed
- Architecture: HIGH -- route structure exists, navigation patterns established in codebase
- Bottom sheet: MEDIUM -- known compatibility concerns, but evidence suggests project's reanimated version should work
- Pitfalls: HIGH -- well-documented issues with clear mitigations
- Timeline rendering: MEDIUM -- FlatList + absolute positioning for decorative line needs validation

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days -- stable domain, main risk is bottom-sheet library updates)
