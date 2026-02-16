# Phase 10: Settings Stack Navigation - Research

**Researched:** 2026-02-16
**Domain:** Expo Router stack navigation, settings screen refactoring, dependency cleanup
**Confidence:** HIGH

## Summary

Phase 10 replaces the settings bottom sheet overlay (built with `@gorhom/bottom-sheet` in Phase 7) with a full-screen settings screen that slides in from the right as a standard stack push. This is a refactoring phase -- all the settings sub-screens (My Exercises, Workout History, Workout Detail) already work correctly as stack pushes from the existing `app/settings/` route group. The change is replacing the entry point from a bottom sheet overlay to a full-screen settings index screen.

The codebase is well-positioned for this change. The `app/settings/` directory already has a `_layout.tsx` with a nested Stack navigator and three working sub-screens (`exercises.tsx`, `history.tsx`, `[workoutId].tsx`). The only missing piece is an `app/settings/index.tsx` file that serves as the settings menu screen. Currently, the bottom sheet component (`SettingsSheet.tsx`) holds the menu UI and the dashboard (`app/index.tsx`) manages the state and navigation callbacks with a 200ms setTimeout dismiss-then-navigate pattern. The new approach eliminates this complexity entirely -- the gear icon simply calls `router.push('/settings')` and the settings index screen handles its own navigation to sub-screens directly.

A major benefit of this change is that `@gorhom/bottom-sheet` is **only** used by `SettingsSheet.tsx` in the entire codebase (confirmed via grep). The `AddChartSheet` explicitly uses RN Modal instead. This means removing the settings bottom sheet allows full uninstallation of `@gorhom/bottom-sheet`, reducing the dependency footprint.

**Primary recommendation:** Create `app/settings/index.tsx` as a full-screen settings menu, change the dashboard gear icon to use `router.push('/settings')`, remove the SettingsSheet component and all bottom-sheet state management from the dashboard, then uninstall `@gorhom/bottom-sheet`.

## Standard Stack

### Core (Already in Project -- No New Dependencies)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `expo-router` | ~6.0.23 | File-based routing, Stack navigator | Installed, settings route group exists |
| `react-native-safe-area-context` | ~5.6.0 | SafeAreaView for settings screen | Installed |
| `@expo/vector-icons` (Ionicons) | ^15.0.3 | Menu icons (list, time, log-out, chevron) | Installed |

### To Remove

| Library | Version | Reason | Impact |
|---------|---------|--------|--------|
| `@gorhom/bottom-sheet` | ^5.2.8 | Only used by SettingsSheet.tsx which is being deleted | Zero impact -- no other consumers |

### No New Dependencies Needed

This phase adds zero new dependencies and removes one. The settings screen is built entirely with existing project primitives (Pressable, View, Text, Ionicons, SafeAreaView, StyleSheet).

**Uninstall command:**
```bash
pnpm remove @gorhom/bottom-sheet
```

## Architecture Patterns

### Current Architecture (Being Replaced)

```
Dashboard (app/index.tsx)
  |-- [state: settingsOpen] --> SettingsSheet (bottom sheet overlay)
  |-- [onMyExercises callback] --> setTimeout(200ms) --> router.push('/settings/exercises')
  |-- [onWorkoutHistory callback] --> setTimeout(200ms) --> router.push('/settings/history')
  |-- [onLogout callback] --> auth.logout()
```

Problems with current approach:
- Dashboard manages settings sheet state (`settingsOpen`)
- 200ms setTimeout hack for dismiss-then-navigate sequencing
- Navigation callbacks are split between dashboard and sheet component
- SettingsSheet component is a wrapper around bottom sheet with no reusable value

### New Architecture (Target)

```
Dashboard (app/index.tsx)
  |-- gear icon --> router.push('/settings')

Settings Index (app/settings/index.tsx)  -- NEW FILE
  |-- My Exercises --> router.push('/settings/exercises')
  |-- Workout History --> router.push('/settings/history')
  |-- Log Out --> auth.logout()
  |-- Back button --> router.back()

Settings Sub-screens (UNCHANGED)
  |-- app/settings/exercises.tsx
  |-- app/settings/history.tsx
  |-- app/settings/[workoutId].tsx
```

Benefits:
- Zero state management for settings in dashboard
- No setTimeout hacks
- Standard Expo Router stack navigation (native slide animation)
- Settings index screen owns its own navigation logic
- Simpler dashboard code (remove ~40 lines)

### Recommended File Changes

```
MODIFY:
  app/index.tsx                    # Remove SettingsSheet import, state, callbacks
  app/_layout.tsx                  # No changes needed (settings group already registered)
  app/settings/_layout.tsx         # No changes needed (nested Stack already configured)
  src/components/DashboardHeader.tsx # No interface changes needed (onSettingsPress stays)

CREATE:
  app/settings/index.tsx           # New settings menu screen

DELETE:
  src/components/SettingsSheet.tsx  # Bottom sheet component no longer needed
```

### Pattern 1: Settings Index Screen Structure

The new settings index screen follows the exact same visual pattern as the current SettingsSheet menu items, but rendered as a full-screen with a header containing a back button.

```typescript
// app/settings/index.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useAuth } from '@/hooks/useAuth';
import { auth } from '@/services/auth';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Menu items */}
      <View style={styles.menuContent}>
        {/* My Exercises */}
        <Pressable onPress={() => router.push('/settings/exercises')}>
          {/* icon + label + chevron */}
        </Pressable>

        {/* Workout History */}
        <Pressable onPress={() => router.push('/settings/history')}>
          {/* icon + label + chevron */}
        </Pressable>

        {/* Separator */}
        <View style={styles.separator} />

        {/* Log Out */}
        <Pressable onPress={() => auth.logout()}>
          {/* icon + label (danger color) */}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
```

### Pattern 2: Simplified Dashboard Gear Icon Handler

The dashboard's gear icon handler becomes a single line:

```typescript
// In app/index.tsx
function handleSettingsPress() {
  router.push('/settings');
}
```

This replaces:
```typescript
// OLD -- all of this gets removed:
const [settingsOpen, setSettingsOpen] = useState(false);

function handleSettingsPress() {
  setSettingsOpen(true);
}
function handleSettingsClose() {
  setSettingsOpen(false);
}
function handleMyExercises() {
  setSettingsOpen(false);
  setTimeout(() => router.push('/settings/exercises'), 200);
}
function handleWorkoutHistory() {
  setSettingsOpen(false);
  setTimeout(() => router.push('/settings/history'), 200);
}
function handleLogout() {
  setSettingsOpen(false);
  auth.logout();
}
```

### Pattern 3: Sub-screen Back Navigation

The existing settings sub-screens already use `router.back()` for their back buttons. With the new architecture:

- Settings index -> `router.back()` -> returns to Dashboard (correct)
- My Exercises -> `router.back()` -> returns to Settings index (correct -- previously went to Dashboard)
- Workout History -> `router.back()` -> returns to Settings index (correct -- previously went to Dashboard)
- Workout Detail -> `router.back()` -> returns to Workout History (correct, unchanged)

**Key change:** Sub-screens now return to the Settings index screen, not the Dashboard. This is the correct behavior for stack navigation. Users can then tap back again to return to the Dashboard. This is a UX improvement -- the navigation is now fully predictable.

### Anti-Patterns to Avoid

- **DO NOT keep SettingsSheet.tsx "just in case."** The phase goal explicitly states removing the bottom sheet for settings. Delete the file.
- **DO NOT add a setTimeout for navigation.** The whole point is replacing the dismiss-then-navigate hack with direct stack navigation.
- **DO NOT modify the settings sub-screen back buttons.** They already use `router.back()` which will correctly navigate up the stack.
- **DO NOT create a new navigation group or layout.** The existing `app/settings/_layout.tsx` with its nested Stack is already correct.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slide-from-right animation | Custom Animated.View transition | Expo Router's default stack animation | Built-in, native performance, correct iOS behavior |
| Back button | Custom back navigation logic | `router.back()` + Ionicons chevron-back | Standard pattern used by all other settings sub-screens |
| Header layout | New header component | Same hand-rolled header pattern from exercises.tsx / history.tsx | Consistent with existing sub-screens |

**Key insight:** This phase is a simplification. The existing Expo Router stack already provides the exact transition animation (slide from right) and back navigation behavior needed. No new patterns are required.

## Common Pitfalls

### Pitfall 1: Forgetting to Remove Dashboard SettingsSheet State
**What goes wrong:** Dead code remains in the dashboard -- unused state, unused callbacks, unused import
**Why it happens:** Developer creates the new settings screen but forgets to clean up the old code
**How to avoid:** Checklist: (1) Remove `SettingsSheet` import, (2) Remove `settingsOpen` state, (3) Remove all settings callback functions (handleSettingsClose, handleMyExercises, handleWorkoutHistory, handleLogout from settings context), (4) Remove `<SettingsSheet>` JSX, (5) Simplify `handleSettingsPress` to just `router.push('/settings')`
**Warning signs:** Unused imports warning, `settingsOpen` state never read

### Pitfall 2: Breaking Sub-screen Navigation Expectation
**What goes wrong:** Users expect back from My Exercises to go to Dashboard (old behavior) but now it goes to Settings index
**Why it happens:** The navigation stack is now: Dashboard -> Settings -> My Exercises. Back from My Exercises returns to Settings, not Dashboard.
**How to avoid:** This is actually the CORRECT behavior for stack navigation and matches the success criteria ("All existing settings sub-screens continue to work as stack pushes from the settings screen"). The old behavior was a side effect of the bottom sheet dismiss pattern. No fix needed -- this is an improvement.
**Warning signs:** None -- this is expected and correct

### Pitfall 3: Constitution and Decision Docs Reference Stale Pattern
**What goes wrong:** Future development refers to the constitution which says "Settings menu -> bottom sheet" and uses the old pattern
**Why it happens:** The constitution and decision docs still reference `@gorhom/bottom-sheet` for settings
**How to avoid:** Update the constitution's Navigation section and Allowed Libraries table after completing the phase. Update the decision document's navigation paradigm description.
**Warning signs:** Future phases trying to use bottom sheet for settings

### Pitfall 4: Not Uninstalling @gorhom/bottom-sheet
**What goes wrong:** Unused dependency bloats the project and could cause future compatibility issues
**Why it happens:** Developer removes the code but forgets to uninstall the package
**How to avoid:** Run `pnpm remove @gorhom/bottom-sheet` after all code changes are verified. Also remove it from the constitution's "Allowed Libraries" table.
**Warning signs:** `@gorhom/bottom-sheet` still in package.json after phase completion

### Pitfall 5: Settings Index Screen Not Following Existing Visual Pattern
**What goes wrong:** The settings menu screen looks different from what users expect
**Why it happens:** Building the menu UI from scratch instead of porting the existing SettingsSheet visual design
**How to avoid:** Copy the menu item styles (icon + label + chevron, separator, danger-colored logout) directly from `SettingsSheet.tsx` into the new `settings/index.tsx`. The visual design should be identical -- only the container changes from bottom sheet to full-screen.
**Warning signs:** Menu items look different from the bottom sheet version

## Code Examples

### Complete Settings Index Screen

```typescript
// app/settings/index.tsx
// Ports the menu UI from SettingsSheet.tsx into a full-screen settings page
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme';
import { auth } from '@/services/auth';

export default function SettingsScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Menu */}
      <View style={styles.menuContent}>
        {/* My Exercises */}
        <Pressable
          style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
          onPress={() => router.push('/settings/exercises')}
        >
          <View style={styles.menuIcon}>
            <Ionicons name="list-outline" size={22} color={theme.colors.textPrimary} />
          </View>
          <Text style={styles.menuLabel}>My Exercises</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </Pressable>

        {/* Workout History */}
        <Pressable
          style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
          onPress={() => router.push('/settings/history')}
        >
          <View style={styles.menuIcon}>
            <Ionicons name="time-outline" size={22} color={theme.colors.textPrimary} />
          </View>
          <Text style={styles.menuLabel}>Workout History</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </Pressable>

        {/* Separator */}
        <View style={styles.separator} />

        {/* Log Out */}
        <Pressable
          style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
          onPress={() => auth.logout()}
        >
          <View style={styles.menuIcon}>
            <Ionicons name="log-out-outline" size={22} color={theme.colors.danger} />
          </View>
          <Text style={styles.logoutLabel}>Log Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bgPrimary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      flex: 1,
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    headerSpacer: {
      width: 44,
    },
    menuContent: {
      paddingTop: theme.spacing.sm,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      minHeight: 52,
    },
    menuItemPressed: {
      backgroundColor: theme.colors.bgElevated,
    },
    menuIcon: {
      width: 32,
      alignItems: 'center',
    },
    menuLabel: {
      flex: 1,
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textPrimary,
      marginLeft: theme.spacing.sm,
    },
    logoutLabel: {
      flex: 1,
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.danger,
      marginLeft: theme.spacing.sm,
    },
    separator: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing.sm,
      marginHorizontal: theme.spacing.md,
    },
  });
}
```

### Simplified Dashboard (app/index.tsx changes)

```typescript
// REMOVE these imports:
// import { SettingsSheet } from '@/components/SettingsSheet';

// REMOVE this state:
// const [settingsOpen, setSettingsOpen] = useState(false);

// REMOVE these callback functions:
// function handleSettingsClose() { ... }
// function handleMyExercises() { ... }
// function handleWorkoutHistory() { ... }
// function handleLogout() { ... }   <-- the one specific to settings

// SIMPLIFY this function:
function handleSettingsPress() {
  router.push('/settings');
}

// REMOVE from JSX:
// <SettingsSheet
//   visible={settingsOpen}
//   onClose={handleSettingsClose}
//   onMyExercises={handleMyExercises}
//   onWorkoutHistory={handleWorkoutHistory}
//   onLogout={handleLogout}
// />
```

## State of the Art

| Old Approach (Phase 7) | New Approach (Phase 10) | Why Changed | Impact |
|------------------------|------------------------|-------------|--------|
| Settings menu as `@gorhom/bottom-sheet` overlay on dashboard | Settings menu as full-screen stack push via Expo Router | User-requested UX change -- full-screen is clearer than overlay | Simpler code, removes dependency, standard iOS navigation |
| Dashboard manages settings state + 200ms setTimeout navigation | Dashboard has zero settings state -- just `router.push('/settings')` | Eliminates timing hacks and state complexity | ~40 lines removed from dashboard |
| `@gorhom/bottom-sheet` dependency | No bottom sheet dependency | Only consumer removed | Smaller bundle, fewer potential SDK compatibility issues |
| Sub-screens back to Dashboard (via dismiss-then-navigate) | Sub-screens back to Settings index (via standard stack pop) | Natural stack navigation behavior | More predictable, standard iOS back pattern |

**Deprecated/outdated after this phase:**
- `SettingsSheet.tsx` component: Deleted entirely
- `@gorhom/bottom-sheet` package: Uninstalled
- Constitution reference to "Settings menu -> bottom sheet": Must be updated to "Settings menu -> stack push (full-screen)"
- Constitution "Allowed Libraries" table entry for `@gorhom/bottom-sheet`: Must be removed

## Open Questions

1. **Should the constitution and decision docs be updated?**
   - What we know: The constitution (line 62) says "Settings menu -> bottom sheet" and the Allowed Libraries table lists `@gorhom/bottom-sheet`. The decision doc (Decision 6) also references bottom sheet.
   - What's unclear: Whether updating these docs is in scope for this phase or should be a separate task.
   - Recommendation: Update the constitution as part of this phase since it directly reflects the code change. At minimum, update the Navigation section and Allowed Libraries table.

2. **Should `GestureHandlerRootView` wrapper be removed from root layout?**
   - What we know: `GestureHandlerRootView` wraps the entire app in `app/_layout.tsx`. It was required by `@gorhom/bottom-sheet`.
   - What's unclear: Whether other components (swipe-to-delete in workout, gesture-based interactions) depend on `GestureHandlerRootView`.
   - Recommendation: **Keep it.** `react-native-gesture-handler` is still a dependency (used by `react-native-reanimated` and Expo Router itself). The `GestureHandlerRootView` wrapper is a best practice for any app using gesture handler and costs nothing to keep. `react-native-gesture-handler` is an Expo Go built-in -- it cannot be uninstalled.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/components/SettingsSheet.tsx` -- current bottom sheet implementation, only consumer of `@gorhom/bottom-sheet`
- Existing codebase: `app/index.tsx` -- dashboard with settings state management to be simplified
- Existing codebase: `app/settings/_layout.tsx` -- nested Stack navigator already exists
- Existing codebase: `app/settings/exercises.tsx`, `history.tsx`, `[workoutId].tsx` -- sub-screens with `router.back()` pattern
- Existing codebase: `src/components/DashboardHeader.tsx` -- gear icon with `onSettingsPress` callback
- Existing codebase: `package.json` -- confirms `@gorhom/bottom-sheet` ^5.2.8 installed
- Grep verification: `@gorhom/bottom-sheet` only imported in `SettingsSheet.tsx`
- [Expo Router Stack docs](https://docs.expo.dev/router/advanced/stack/) -- stack navigation patterns, screen options

### Secondary (MEDIUM confidence)
- [Expo Router navigation docs](https://docs.expo.dev/router/basics/navigation/) -- router.push(), router.back() behavior
- [Expo Router nesting docs](https://docs.expo.dev/router/advanced/nesting-navigators/) -- nested stack patterns

### Tertiary (LOW confidence)
- None -- this phase is entirely based on existing codebase patterns and official Expo Router docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, using existing Expo Router patterns
- Architecture: HIGH -- straightforward refactoring with clear before/after states verified in codebase
- Pitfalls: HIGH -- all pitfalls are code-level concerns verified by reading the existing implementation
- Code examples: HIGH -- based directly on existing codebase patterns (exercises.tsx header, SettingsSheet menu items)

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (30 days -- stable domain, simple refactoring with no external risk)
