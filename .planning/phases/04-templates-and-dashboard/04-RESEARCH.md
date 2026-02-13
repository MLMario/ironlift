# Phase 4: Templates and Dashboard - Research

**Researched:** 2026-02-13
**Domain:** React Native dashboard UI, template CRUD service porting, drag-to-reorder, swipe-to-reveal gestures, Expo Router modal patterns
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Dashboard Header
- Sticky header with "IronLift" brand text and settings gear icon (right side)
- Matches web app header layout: brand left, gear icon right

#### Template Grid
- 2-column grid layout for template cards
- Gap between cards matches web spacing (8px / spacing.sm)
- "+" card at the end of the grid as the "New Template" entry point -- tapping opens the template editor in create mode

#### Template Card Design
- Card shows: template name (2-line clamp, bold) + first 2-3 exercise names as a mini preview list + full-width "Start" button at bottom
- Card body is NOT tappable -- only the explicit "Start" button triggers a workout (Phase 5)
- Edit and Delete accessed via **swipe-to-reveal** (swipe left on card) -- native iOS pattern, keeps card surface clean
- No hover states (iOS) -- swipe replaces the web's visible edit/delete icons

#### Template Editor (Modal)
- Opens as modal (slides up from bottom) per Decision 6b
- Header: Cancel (left) / "New Template" or "Edit Template" (center) / Save (right)
- Template name input with placeholder "e.g., Upper Body Day"
- Exercise list with exercise editor cards (one per exercise)
- "Add Exercise" full-width button at bottom opens Phase 3's ExercisePickerModal
- **Unsaved changes protection**: If user has changes and taps Cancel, show "Discard changes?" confirmation dialog

#### Set Configuration (per exercise)
- Table layout per exercise card: set# | weight | reps | delete button
- Default: 3 sets, weight=0, reps=10 per new exercise
- "Add Set" button on exercise card header adds a new set (copies last set's values)
- Minimum 1 set per exercise (can't delete the last set)
- Number inputs for weight and reps (centered, monospace)

#### Rest Timer Configuration (per exercise)
- Inline rest timer display below sets: [-10s] [progress bar] [time input MM:SS] [+10s]
- Default: 90 seconds per exercise
- -10s/+10s buttons adjust in 10-second increments
- Minimum: 0 seconds
- Time input accepts MM:SS format

#### Exercise Reordering
- Drag handles (grip icon) on each exercise card in the template editor
- User long-presses or grabs the handle to drag-to-reorder
- **Research needed**: Evaluate `react-native-draggable-flatlist` or similar library for drag-to-reorder support

#### Exercise Removal
- Remove button on exercise card header (visible, not swipe-based)
- Matches web pattern: X button on exercise card

#### Delete Template
- Confirmation dialog before deletion: "Delete [template name]?"
- Deletes template and all associated exercises/sets (cascade)

#### Empty State (no templates)
- Centered text: "No templates yet. Create your first workout template to get started!"
- The '+' grid card is always visible as the create entry point

#### Validation
- Template name required (non-empty after trim)
- At least one exercise required
- Error messages displayed at top of editor

#### Template Service
- Port `templates.ts` from web app -- swap Supabase client import, same business logic
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

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Summary

Phase 4 is the largest and most complex phase so far, combining a dashboard screen (the app's central hub), template CRUD operations, a modal-based template editor with rich exercise configuration UI, swipe-to-reveal card actions, and drag-to-reorder exercise lists. The core service layer is a straightforward port from the web app (`templates.ts`), but the UI requires several native-specific patterns: `ReanimatedSwipeable` for card actions, a drag-to-reorder library for exercise ordering, and careful keyboard avoidance in a scrollable modal form.

The codebase already has the foundational pieces in place: `template-editor.tsx` route declared as a modal in `_layout.tsx`, all database types defined in `database.ts`, service type interfaces in `services.ts`, the `ExercisePickerModal` component ready for reuse, and the `useExercises` hook with cache-first loading. The template service port is mechanical -- the web app's `templates.ts` is 730 lines of well-structured Supabase CRUD that needs only an import path swap.

The primary technical risk is the drag-to-reorder library selection. `react-native-draggable-flatlist` (v4.0.3) is the established standard but its compatibility with Reanimated 4.x (installed as ~4.1.1) is unverified. `react-native-reanimated-dnd` is a modern alternative explicitly claiming Expo compatibility. Both require approval per the constitution's dependency rules. A safe fallback exists: simple up/down arrow buttons (matching the web app's `moveExerciseUp`/`moveExerciseDown` pattern) require zero new dependencies.

**Primary recommendation:** Port the template service as-is, build the dashboard with 2-column FlatList grid, use `ReanimatedSwipeable` (already bundled with gesture-handler) for card swipe actions, and start with up/down arrow buttons for exercise reordering with a plan to upgrade to drag-to-reorder if the library is approved.

## Standard Stack

### Core (Already Installed -- No New Dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-native-gesture-handler` | ~2.28.0 | Swipeable cards, gesture recognition | Expo Go built-in, provides `ReanimatedSwipeable` |
| `react-native-reanimated` | ~4.1.1 | Smooth swipe animations, layout animations | Expo Go built-in, powers gesture transitions |
| `expo-router` | ~6.0.23 | Modal presentation for template editor | File-based routing, modal support via `presentation: 'modal'` |
| `@react-native-async-storage/async-storage` | 2.2.0 | Template data caching | Already used for exercise cache |
| `@supabase/supabase-js` | ^2.95.3 | Template CRUD operations | Direct DB access with RLS |

### Needs Approval (For Drag-to-Reorder)
| Library | Version | Purpose | Why Consider |
|---------|---------|---------|--------------|
| `react-native-draggable-flatlist` | 4.0.3 | Drag-to-reorder exercises in editor | Established standard (3.4k GitHub stars), simple API |
| `react-native-reanimated-dnd` | ~1.1.0 | Alternative drag-to-reorder | Modern, Expo-first, `Sortable` component with handle support |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Drag-to-reorder library | Up/down arrow buttons | Zero new deps, matches web app pattern, less native feel |
| `react-native-draggable-flatlist` | `react-native-reanimated-dnd` | Newer/smaller community, but explicitly Expo-compatible and has drag handle support |
| `ReanimatedSwipeable` | Hand-rolled pan gesture | Swipeable is already bundled, battle-tested, has proper snap/threshold logic |

### Drag-to-Reorder Library Recommendation

**Recommended: Start with up/down arrow buttons, optionally add `react-native-draggable-flatlist` if approved.**

Rationale:
- Up/down arrows require zero new dependencies and match the web app's existing pattern exactly (`handleMoveExerciseUp`/`handleMoveExerciseDown` already in web codebase)
- `react-native-draggable-flatlist` v4.0.3 has peer deps of `react-native >= 0.64.0`, `react-native-gesture-handler >= 2.0.0`, `react-native-reanimated >= 2.8.0` -- all satisfied by the current project, but Reanimated 4.x compatibility is UNVERIFIED (LOW confidence)
- `react-native-reanimated-dnd` claims Expo compatibility and has a `Sortable` component with `SortableItem.Handle` for drag handles -- a good fit, but it's newer with a smaller community (MEDIUM confidence)
- Neither library is on the constitution's approved list -- approval needed before installation

**If drag-to-reorder is desired, test `react-native-draggable-flatlist` first** (larger community, more battle-tested). If it has Reanimated 4.x issues, fall back to `react-native-reanimated-dnd`.

## Architecture Patterns

### Recommended Project Structure (New Files for Phase 4)
```
app/
  index.tsx              # Dashboard screen (REPLACE placeholder)
  template-editor.tsx    # Template editor modal (REPLACE placeholder)
src/
  services/
    templates.ts         # NEW: Port from web app
  hooks/
    useTemplates.ts      # NEW: Cache-first template loading (mirrors useExercises)
  components/
    TemplateCard.tsx      # NEW: Swipeable template card
    TemplateGrid.tsx      # NEW: 2-column grid with + card
    DashboardHeader.tsx   # NEW: Sticky header (brand + gear)
    ExerciseEditorCard.tsx # NEW: Per-exercise config in template editor
    SetRow.tsx            # NEW: Weight/reps row in set table
    RestTimerInline.tsx   # NEW: [-10s] [bar] [MM:SS] [+10s]
  lib/
    cache.ts             # EXTEND: Add template caching functions
```

### Pattern 1: Template Service Port (Copy-and-Adapt)
**What:** Port web app's `templates.ts` by swapping the Supabase client import
**When to use:** All service layer code in this phase
**How:**
```typescript
// Web app has:
// import { supabase } from '../lib/supabase';
// Change to:
import { supabase } from '@/lib/supabase';

// All business logic (queries, transforms, error handling) stays identical
// The web app's templates.ts is 730 lines -- copy as-is, change import only
```
**Confidence:** HIGH -- This is the same pattern used successfully for `exercises.ts` in Phase 3

### Pattern 2: Cache-First Hook (useTemplates)
**What:** Mirror the `useExercises` hook pattern for template data
**When to use:** Dashboard screen data loading
**Example:**
```typescript
// Source: Existing useExercises.ts pattern
export function useTemplates() {
  const [templates, setTemplates] = useState<TemplateWithExercises[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Step 1: Try cache first
    const cached = await getCachedTemplates();
    if (cached) {
      setTemplates(cached);
      setIsLoading(false);
    }

    // Step 2: Fetch fresh from Supabase
    const { data, error: fetchError } = await templates.getTemplates();
    if (data) {
      setTemplates(data);
      await setCachedTemplates(data);
    } else if (fetchError && !cached) {
      setError('Failed to load templates.');
    }

    setIsLoading(false);
  }, []);

  return { templates, isLoading, error, refresh: loadTemplates };
}
```
**Confidence:** HIGH -- Proven pattern from Phase 3

### Pattern 3: Expo Router Modal with Params
**What:** Pass template ID to the editor modal for edit mode vs create mode
**When to use:** Opening template editor from dashboard
**Example:**
```typescript
// Dashboard: navigate to create mode
router.push('/template-editor');

// Dashboard: navigate to edit mode
router.push(`/template-editor?templateId=${template.id}`);

// Template editor: receive params
const { templateId } = useLocalSearchParams<{ templateId?: string }>();
const isEditing = !!templateId;
```
**Confidence:** HIGH -- Already set up in `_layout.tsx` with `presentation: 'modal'`

### Pattern 4: Editing State Management (EditingTemplate)
**What:** Local state object for in-progress template edits, separate from server data
**When to use:** Template editor modal
**Example (from web app -- port directly):**
```typescript
interface EditingSet {
  set_number: number;
  weight: number;
  reps: number;
}

interface EditingExercise {
  exercise_id: string;
  name: string;
  category: string;
  default_rest_seconds: number;
  sets: EditingSet[];
}

interface EditingTemplate {
  id: string | null;  // null = create mode
  name: string;
  exercises: EditingExercise[];
}

// Convert server data to editing format
function templateToEditing(template: TemplateWithExercises): EditingTemplate {
  return {
    id: template.id,
    name: template.name,
    exercises: template.exercises.map(ex => ({
      exercise_id: ex.exercise_id,
      name: ex.name,
      category: ex.category,
      default_rest_seconds: ex.default_rest_seconds,
      sets: ex.sets.map(set => ({ ...set })),
    })),
  };
}
```
**Confidence:** HIGH -- Direct port from web app's TemplateEditorSurface.tsx

### Pattern 5: ReanimatedSwipeable for Card Actions
**What:** Swipe left to reveal Edit/Delete buttons on template cards
**When to use:** Template cards on dashboard
**Example:**
```typescript
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';

function RightActions(
  progress: SharedValue<number>,
  translation: SharedValue<number>,
) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translation.value + 160 }], // 160 = total action width
  }));

  return (
    <Animated.View style={[styles.actionsContainer, animatedStyle]}>
      <Pressable style={styles.editAction} onPress={onEdit}>
        <Ionicons name="pencil" size={20} color={theme.colors.textPrimary} />
      </Pressable>
      <Pressable style={styles.deleteAction} onPress={onDelete}>
        <Ionicons name="trash" size={20} color={theme.colors.textPrimary} />
      </Pressable>
    </Animated.View>
  );
}

// In TemplateCard:
<ReanimatedSwipeable
  renderRightActions={renderRightActions}
  rightThreshold={40}
  friction={2}
  overshootRight={false}
>
  {/* Card content */}
</ReanimatedSwipeable>
```
**Confidence:** HIGH -- `ReanimatedSwipeable` ships with `react-native-gesture-handler` (already installed at ~2.28.0)

### Pattern 6: GestureHandlerRootView Requirement
**What:** The app MUST wrap the root layout in `GestureHandlerRootView` for swipeable and gesture components to work
**When to use:** Root `_layout.tsx`
**Critical note:** The current `_layout.tsx` does NOT have `GestureHandlerRootView`. This MUST be added.
```typescript
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
```
**Confidence:** HIGH -- Required by react-native-gesture-handler docs for all gesture/swipeable components

### Pattern 7: 2-Column Grid with FlatList
**What:** Use FlatList with `numColumns={2}` for template card grid
**When to use:** Dashboard template grid
**Example:**
```typescript
<FlatList
  data={[...templates, { id: '__add__' }]} // Append '+' card
  numColumns={2}
  columnWrapperStyle={{ gap: theme.spacing.sm }}
  contentContainerStyle={{ gap: theme.spacing.sm, padding: theme.spacing.md }}
  renderItem={({ item }) =>
    item.id === '__add__'
      ? <AddTemplateCard onPress={handleCreateTemplate} />
      : <TemplateCard template={item} ... />
  }
  keyExtractor={(item) => item.id}
/>
```
**Confidence:** HIGH -- Standard React Native FlatList pattern

### Anti-Patterns to Avoid
- **Don't use ScrollView with grid layout**: FlatList with `numColumns` is the standard for grid layouts in RN. ScrollView requires manual column management.
- **Don't manage template state globally**: Template editing state is local to the editor modal. Dashboard re-fetches on return from editor via `refresh()`.
- **Don't use `router.replace` for modal**: The template editor should use `router.push` (or Link) so `router.back()` returns to dashboard. The `presentation: 'modal'` config in `_layout.tsx` handles the slide-up animation.
- **Don't nest FlatList inside ScrollView**: The template editor should use a single ScrollView with mapped exercise cards, not a FlatList-in-ScrollView (which causes layout warnings).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Swipe-to-reveal card actions | Custom pan gesture + animated position tracking | `ReanimatedSwipeable` from `react-native-gesture-handler` | Handles snap thresholds, overshoot, touch cancellation, proper spring physics |
| Template data transform | New transform logic | Port `transformTemplate()` from web app | Already handles null exercises (FK join), sorting, set ordering |
| Template CRUD service | New service implementation | Port `templates.ts` from web app (730 lines) | Battle-tested, handles rollback on partial insert failure, proper error types |
| Confirmation dialogs | Custom modal component | React Native `Alert.alert()` | Native iOS alert with confirm/cancel, no custom UI needed |
| MM:SS time formatting | Regex parser | `formatTime`/`parseTimeInput` from web app's ExerciseEditor | Already handles edge cases (plain seconds input, MM:SS format, min 0) |
| Keyboard avoidance in modal | Custom keyboard listener | `KeyboardAvoidingView` with `behavior="padding"` | Built into React Native, works in modals with `keyboardVerticalOffset` |

**Key insight:** The web app already has all the business logic for this phase. The template service, data transforms, validation rules, editing state management, and set/rest-time manipulation are all implemented and tested. The work is UI translation, not logic invention.

## Common Pitfalls

### Pitfall 1: Missing GestureHandlerRootView
**What goes wrong:** `ReanimatedSwipeable` silently fails -- cards don't swipe, no error thrown
**Why it happens:** `react-native-gesture-handler` requires the root of the app to be wrapped in `GestureHandlerRootView`
**How to avoid:** Add `GestureHandlerRootView` to root `_layout.tsx` BEFORE building any swipeable/gesture components
**Warning signs:** Swipe gestures don't respond at all (not even partially)

### Pitfall 2: FlatList numColumns Re-render Key Warning
**What goes wrong:** React warns about changing `numColumns` on the fly
**Why it happens:** FlatList's `numColumns` prop must be stable across renders
**How to avoid:** Hardcode `numColumns={2}`, never change it dynamically
**Warning signs:** Yellow box warning about `numColumns`

### Pitfall 3: Modal Keyboard Offset
**What goes wrong:** `KeyboardAvoidingView` shifts content too much or too little inside a modal
**Why it happens:** iOS modals have their own offset from the top of the screen that `KeyboardAvoidingView` doesn't account for
**How to avoid:** Use `keyboardVerticalOffset` prop set to the modal's top offset. For `pageSheet` presentation, this is approximately the status bar height. Alternatively, wrap the editor content in a `ScrollView` that naturally scrolls to the focused input.
**Warning signs:** Inputs hidden behind keyboard, or content jumps too high when keyboard opens

### Pitfall 4: Swipeable Inside FlatList Conflicts
**What goes wrong:** FlatList horizontal scroll gesture conflicts with swipe gesture on cards
**Why it happens:** Both are horizontal pan gestures competing for the same touch
**How to avoid:** Since the FlatList is vertical (not horizontal), this is NOT a problem for our 2-column grid. However, if adding horizontal scrolling later, use the `simultaneousWithExternalGesture` prop on `ReanimatedSwipeable`.
**Warning signs:** Cards don't swipe, or FlatList doesn't scroll vertically

### Pitfall 5: Template Editor State Loss on Modal Dismiss
**What goes wrong:** User loses all editing progress when accidentally swiping down on the modal
**Why it happens:** iOS modals can be dismissed via downward swipe gesture by default
**How to avoid:** Two defenses: (1) Track dirty state (`hasChanges`) and show "Discard changes?" alert on cancel/dismiss. (2) For the Expo Router modal, the `gestureEnabled` prop can be controlled to prevent accidental swipe-dismiss.
**Warning signs:** Users report losing work after accidentally swiping the modal down

### Pitfall 6: Supabase Nested Query Type Casting
**What goes wrong:** TypeScript errors on Supabase's nested select queries
**Why it happens:** Supabase's complex nested query return type doesn't match the expected interface
**How to avoid:** Use the `as unknown as RawTemplate[]` double-cast pattern already established in the web app's `transformTemplate` function
**Warning signs:** TypeScript errors on `.map()` or property access after Supabase query

### Pitfall 7: Empty FlatList numColumns Layout
**What goes wrong:** When only the "+" card exists, it spans the full width instead of taking half
**Why it happens:** FlatList with `numColumns` distributes items evenly across columns -- a single item fills the row
**How to avoid:** This is actually fine for the "+" card -- when there are no templates, the grid shows only the "+" card (which can be full-width or half-width). If half-width is desired, pad the data array to ensure even counts.
**Warning signs:** "+" card looks oddly wide when it's the only item

## Code Examples

### Template Service Port Pattern
```typescript
// Source: Web app packages/shared/src/services/templates.ts
// Port strategy: Copy entire file, change ONE import line

// BEFORE (web app):
import { supabase } from '../lib/supabase';

// AFTER (ironlift):
import { supabase } from '@/lib/supabase';

// Everything else is identical:
// - transformTemplate() function
// - Raw* interface types (RawExerciseData, RawTemplateExercise, etc.)
// - getTemplates(), getTemplate(), createTemplate(), updateTemplate(), deleteTemplate()
// - addExerciseToTemplate(), removeExerciseFromTemplate(), updateTemplateExercise()
// - Error handling, rollback logic, type casting

// Note: Also change the type imports:
// BEFORE: import type { ... } from '../types/services';
// AFTER:  import type { ... } from '@/types/services';
// BEFORE: import type { ... } from '../types/database';
// AFTER:  import type { ... } from '@/types/database';
```

### Template Cache Extension
```typescript
// Source: Existing cache.ts pattern
import type { TemplateWithExercises } from '@/types/database';

const CACHE_KEY_TEMPLATES = 'ironlift:templates';

export async function getCachedTemplates(): Promise<TemplateWithExercises[] | null> {
  try {
    const json = await AsyncStorage.getItem(CACHE_KEY_TEMPLATES);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

export async function setCachedTemplates(templates: TemplateWithExercises[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY_TEMPLATES, JSON.stringify(templates));
  } catch (err) {
    console.error('Failed to cache templates:', err);
  }
}

export async function clearTemplateCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY_TEMPLATES);
  } catch (err) {
    console.error('Failed to clear template cache:', err);
  }
}
```

### Confirmation Dialog (Native Alert)
```typescript
// Source: React Native Alert API
import { Alert } from 'react-native';

// Delete confirmation
Alert.alert(
  'Delete Template',
  `Delete "${templateName}"?`,
  [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: handleDelete },
  ]
);

// Discard changes confirmation
Alert.alert(
  'Discard Changes?',
  'You have unsaved changes. Are you sure you want to discard them?',
  [
    { text: 'Keep Editing', style: 'cancel' },
    { text: 'Discard', style: 'destructive', onPress: () => router.back() },
  ]
);
```

### Set Table Row
```typescript
// Source: Web app ExerciseEditor.tsx set-row pattern, adapted for RN
<View style={styles.setRow}>
  {/* Set number badge */}
  <View style={styles.setNumber}>
    <Text style={styles.setNumberText}>{set.set_number}</Text>
  </View>

  {/* Weight input */}
  <TextInput
    style={styles.setInput}
    value={String(set.weight)}
    onChangeText={(text) => handleUpdateSet(setIndex, 'weight', parseFloat(text) || 0)}
    keyboardType="decimal-pad"
    textAlign="center"
  />

  {/* Reps input */}
  <TextInput
    style={styles.setInput}
    value={String(set.reps)}
    onChangeText={(text) => handleUpdateSet(setIndex, 'reps', parseInt(text, 10) || 0)}
    keyboardType="number-pad"
    textAlign="center"
  />

  {/* Delete set button (hidden if last set) */}
  {exercise.sets.length > 1 ? (
    <Pressable style={styles.deleteSetButton} onPress={() => handleRemoveSet(setIndex)}>
      <Ionicons name="close" size={14} color={theme.colors.textMuted} />
    </Pressable>
  ) : (
    <View style={styles.deleteSetPlaceholder} />
  )}
</View>
```

### Rest Timer Inline
```typescript
// Source: Web app ExerciseEditor.tsx rest-timer-inline, adapted for RN
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function parseTimeInput(value: string): number {
  const trimmed = value.trim();
  if (trimmed.includes(':')) {
    const [mins, secs] = trimmed.split(':').map(s => parseInt(s, 10) || 0);
    return Math.max(0, mins * 60 + secs);
  }
  return Math.max(0, parseInt(trimmed, 10) || 0);
}

// JSX:
<View style={styles.restTimerRow}>
  <Pressable style={styles.timerButton} onPress={handleDecreaseTime}>
    <Text style={styles.timerButtonText}>-10s</Text>
  </Pressable>

  <View style={styles.timerBar}>
    <View style={[styles.timerBarFill, { width: '100%' }]} />
  </View>

  <TextInput
    style={styles.timerInput}
    value={formatTime(exercise.default_rest_seconds)}
    onBlur={(e) => {
      const seconds = parseTimeInput(e.nativeEvent.text);
      onUpdateRestTime(seconds);
    }}
    keyboardType="numbers-and-punctuation"
    textAlign="center"
  />

  <Pressable style={styles.timerButton} onPress={handleIncreaseTime}>
    <Text style={styles.timerButtonText}>+10s</Text>
  </Pressable>
</View>
```

## Discretion Recommendations

### Swipe-to-Reveal Implementation
**Recommendation:** Use `ReanimatedSwipeable` from `react-native-gesture-handler/ReanimatedSwipeable`. Configure `rightThreshold={40}`, `friction={2}`, `overshootRight={false}`. Right action panel: two 80px-wide buttons (Edit blue, Delete red) for total 160px action width.

### Exercise Card Expand/Collapse
**Recommendation:** No expand/collapse needed. Template cards on the dashboard show only a preview (name + 2-3 exercises). The full exercise detail is in the template editor. Exercise editor cards in the template editor are always expanded showing all sets.

### Card Proportions
**Recommendation:** Each card takes `(screenWidth - 3 * spacing.sm) / 2` width (accounting for left padding, gap, right padding). Card padding: `spacing.sm` (8px). Min height driven by content: template name (2 lines max) + exercise previews (2-3 lines) + Start button (44px). Use `flex: 1` on card container within `columnWrapperStyle`.

### Exercise Preview Count
**Recommendation:** Show 2 exercise names. If the template has more, show "... and N more". This provides context without making cards too tall.

### Loading Skeleton
**Recommendation:** Simple approach -- use `ActivityIndicator` centered on screen while loading, same as Phase 3. Skeleton screens are a nice-to-have but add complexity. The cache-first strategy means the loading spinner is only visible on first ever load or when cache is empty.

### Error State Handling
**Recommendation:** Show error text in a dismissible banner at the top of the dashboard (tap to dismiss). For CRUD failures in the template editor, show error at the top of the editor below the header. Use the same `ErrorBox` component pattern from auth screens or a simple styled `Text` component.

### Keyboard Avoidance in Template Editor
**Recommendation:** Wrap the template editor content in a `ScrollView` (not FlatList -- exercise count is small, typically 3-8 exercises). When a TextInput is focused, the ScrollView naturally scrolls to keep it visible. Add `KeyboardAvoidingView` with `behavior="padding"` as the outermost wrapper inside the modal's SafeAreaView. Set `keyboardVerticalOffset` to approximately 0 since `pageSheet` modals handle their own offset on iOS.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Swipeable` (legacy) | `ReanimatedSwipeable` | RNGH 2.x | Use Reanimated-based version, old one deprecated |
| `FlatList` manual grid | `FlatList numColumns` | Always available | Standard approach for grid layouts |
| Custom keyboard handling | `KeyboardAvoidingView` | React Native core | Built-in, no library needed |
| `useSearchParams` (global) | `useLocalSearchParams` (local) | Expo Router v3+ | Prevents unexpected re-renders from global URL changes |

**Deprecated/outdated:**
- Legacy `Swipeable` from `react-native-gesture-handler/Swipeable`: Use `ReanimatedSwipeable` instead
- `useSearchParams`: Use `useLocalSearchParams` in Expo Router for component-scoped params

## Open Questions

1. **Drag-to-reorder library approval**
   - What we know: Both `react-native-draggable-flatlist` (v4.0.3) and `react-native-reanimated-dnd` (~1.1.0) can do the job. Peer deps are met for draggable-flatlist. reanimated-dnd claims Expo compatibility.
   - What's unclear: Whether either library works correctly with Reanimated 4.x and Expo SDK 54. Neither is on the constitution's approved library list.
   - Recommendation: Build with up/down arrow buttons first (zero risk, matches web app). Add drag-to-reorder as an enhancement if a library is approved and tested. The CONTEXT.md explicitly asked for this research, so present findings to user for approval.

2. **GestureHandlerRootView addition impact**
   - What we know: It MUST be added to the root layout for swipeable cards to work
   - What's unclear: Whether adding it mid-project will cause any regressions with existing screens (auth, exercise picker)
   - Recommendation: Add it early in Phase 4 and test existing screens. It should be harmless (it's a passthrough wrapper), but verify.

3. **Template editor modal swipe-to-dismiss**
   - What we know: Expo Router modals with `presentation: 'modal'` on iOS can be dismissed by swiping down
   - What's unclear: Whether there's a clean way to intercept the dismiss gesture to show "discard changes?" when dirty
   - Recommendation: Use the `beforeRemove` navigation event listener to intercept dismiss and show an Alert. This is the standard React Navigation pattern.

## Sources

### Primary (HIGH confidence)
- Web app `templates.ts` (730 lines) -- complete service implementation to port
- Web app `TemplateEditorSurface.tsx`, `ExerciseEditor.tsx`, `ExerciseList.tsx` -- editing state management patterns
- Web app `DashboardSurface.tsx`, `TemplateCard.tsx`, `TemplateList.tsx` -- dashboard layout patterns
- Web app `styles.css` -- grid layout (`templates-mini-grid`), card styling, set table grid layout
- Project files: `database.ts`, `services.ts` -- all types already defined
- Project files: `_layout.tsx` -- modal route already configured
- Project files: `ExercisePickerModal.tsx` -- component ready for reuse
- [ReanimatedSwipeable docs](https://docs.swmansion.com/react-native-gesture-handler/docs/components/reanimated_swipeable/) -- full API for swipe-to-reveal
- [react-native-draggable-flatlist GitHub](https://github.com/computerjazz/react-native-draggable-flatlist) -- v4.0.3, peer deps verified
- [Expo Router URL parameters docs](https://docs.expo.dev/router/reference/url-parameters/) -- param passing pattern

### Secondary (MEDIUM confidence)
- [react-native-reanimated-dnd docs](https://react-native-reanimated-dnd.netlify.app/docs/components/sortable/) -- Sortable component API with handle support
- [Expo keyboard handling guide](https://docs.expo.dev/guides/keyboard-handling/) -- KeyboardAvoidingView best practices

### Tertiary (LOW confidence)
- `react-native-draggable-flatlist` + Reanimated 4.x compatibility -- peer deps are satisfied on paper but no verified reports of working with Reanimated ~4.1.1
- `react-native-reanimated-dnd` Expo Go compatibility -- claimed but not independently verified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All core libraries already installed; only question is drag-to-reorder library
- Architecture: HIGH -- Patterns directly port from web app and follow Phase 3 precedents
- Pitfalls: HIGH -- Identified from official docs, known React Native patterns, and existing codebase analysis
- Drag-to-reorder: MEDIUM -- Library options researched but runtime compatibility with Reanimated 4.x unverified

**Research date:** 2026-02-13
**Valid until:** 30 days (stable domain, no fast-moving dependencies)
