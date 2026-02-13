# Phase 3: Exercise Library - Research

**Researched:** 2026-02-12
**Domain:** React Native exercise list UI, AsyncStorage caching, Supabase CRUD service porting
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Exercise picker modal presentation
- Near-full sheet (iOS style) -- covers ~90% of screen with small gap at top showing parent screen dimmed
- Dismiss via swipe-down or X button in top-right corner
- Layout order top-to-bottom: Title/X -> Search bar -> Category chips -> Scrollable exercise list -> "Create New Exercise" toggle button -> Inline create form
- Search moved above category filter (differs from web app's filter-first order) -- iOS convention puts the most common action at the top
- Modal state resets on open: search cleared, filter reset to "All", create form hidden

#### Exercise list layout
- Flat list (not sectioned by category) -- matches web app
- Sort: user exercises first, then system exercises, alphabetical within each group -- same ordering always, regardless of filter/search state
- Per-row info: exercise name (bold) + category (muted gray below) -- no equipment metadata displayed
- CUSTOM green pill badge on user-created exercises (right-aligned)
- Disabled state (dimmed, non-tappable) for already-added exercises
- Empty state: simple centered text "No exercises found" -- no additional prompts

#### Category filter
- Scrollable horizontal chips (pill-shaped) -- not dropdown like web app
- Single-select: one category at a time, tap to switch
- "All" chip pre-selected by default when picker opens
- Hardcoded category list: All, Chest, Back, Shoulders, Legs, Arms, Core, Cardio, Other
- Same categories used everywhere (filter chips and create form) -- Cardio included in both

#### Custom exercise creation
- Inline form inside the picker modal, toggled via full-width button ("Create New Exercise" / "Cancel New Exercise")
- Form fields: Exercise Name (text input) + Category (dropdown/picker from the same hardcoded list minus "All")
- Duplicate names rejected with error message
- On successful creation: auto-select the new exercise and close the modal
- Edit/delete UI deferred to Phase 7 -- Phase 3 only delivers the create flow UI

#### Exercise service scope
- Full CRUD service layer built (create, read, update, delete) -- ported from web app's exercises.ts
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

### Deferred Ideas (OUT OF SCOPE)
- Edit/delete custom exercise UI -- Phase 7 (My Exercises screen)
- Equipment display/filtering -- not needed in current implementation
- Exercise detail view (tap to see full info) -- not in current scope
</user_constraints>

## Summary

This phase ports the web app's exercise service to the iOS project and builds a reusable exercise picker modal component. The exercise service is a near-direct port from `exercise_tracker_app/packages/shared/src/services/exercises.ts` -- same Supabase queries, same business logic, adapted import paths. The picker modal is built from scratch as a React Native component (not a navigation route) using `React Native Modal` with `presentationStyle="pageSheet"` for the iOS near-full-sheet look. The list of ~1000 exercises uses `FlatList` with standard performance optimizations.

The caching layer introduces AsyncStorage for the first time in the project. It requires installing `@react-native-async-storage/async-storage` (included in Expo Go, zero native linking). The cache strategy is straightforward: fetch all exercises on first load, store in AsyncStorage, serve from cache on subsequent opens, refresh on app foreground.

One critical discovery: the user wants `Cardio` included in category chips and the create form, but the database CHECK constraint and the `ExerciseCategory` TypeScript type only allow 7 values (Chest, Back, Shoulders, Legs, Arms, Core, Other). This requires a database migration and type update before Cardio can be used in exercise creation. This is flagged as a blocking open question.

**Primary recommendation:** Port the exercise service as-is from the web app, build the picker modal as a standalone `<ExercisePickerModal>` component using React Native's `Modal` with `presentationStyle="pageSheet"`, and implement a simple AsyncStorage cache with foreground refresh.

## Standard Stack

The established libraries/tools for this phase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-native` (Modal) | 0.81.5 (installed) | Near-full sheet modal presentation | Built-in, `presentationStyle="pageSheet"` gives iOS sheet behavior |
| `react-native` (FlatList) | 0.81.5 (installed) | Virtualized exercise list for ~1000 items | Built-in, standard for large lists |
| `@react-native-async-storage/async-storage` | 2.2.x | Exercise data caching | Expo Go built-in, official Expo documentation |
| `@supabase/supabase-js` | 2.95.3 (installed) | Exercise CRUD via Supabase | Already in project |
| `@expo/vector-icons` (Ionicons) | 15.0.3 (installed) | Icons for X button, search icon, chips | Already used in existing components |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `expo-haptics` | 15.0.8 (installed) | Light haptic feedback on chip selection | Optional, enhances native feel |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| RN `Modal` component | Expo Router `formSheet` | Expo Router modals are navigation routes, not embeddable components. The picker needs to work from multiple parent screens without its own route. RN `Modal` is the right choice. |
| `FlatList` | `FlashList` by Shopify | FlashList is faster but requires `npx expo install @shopify/flash-list` -- an extra dependency not in the approved list. FlatList with optimizations handles ~1000 items fine. |

**Installation:**
```bash
npx expo install @react-native-async-storage/async-storage
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  services/
    exercises.ts          # Full CRUD service (ported from web app)
  hooks/
    useExercises.ts       # Hook: loads exercises, manages cache, exposes filtered/sorted data
  components/
    ExercisePickerModal.tsx  # Reusable picker modal (Modal + FlatList + search + chips + create form)
    CategoryChips.tsx     # Horizontal scrollable category filter chips
    ExerciseListItem.tsx  # Single exercise row (name, category, badge, disabled state)
  lib/
    cache.ts              # Generic AsyncStorage cache utilities (get, set, clear with keys)
  types/
    database.ts           # ExerciseCategory type (needs Cardio addition -- see Open Questions)
```

### Pattern 1: Reusable Modal Component (not a route)
**What:** The exercise picker is a React component using `<Modal>`, not an Expo Router screen. It receives props (exercises, excludeIds, onSelect, onCreateExercise) and manages its own state internally.
**When to use:** When a modal needs to be embedded in multiple parent screens (template editor, active workout, My Exercises) with different callback behaviors.
**Why not a route:** Expo Router modals are navigation destinations. The exercise picker is a UI component that receives callbacks -- it does not own its own data or navigation state.
**Example:**
```typescript
// Source: React Native Modal docs + existing web app ExercisePickerModal pattern
import { Modal } from 'react-native';

interface ExercisePickerModalProps {
  visible: boolean;
  exercises: Exercise[];
  excludeIds?: string[];
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  onCreateExercise?: (name: string, category: string) => Promise<Exercise | null>;
}

export function ExercisePickerModal({
  visible,
  exercises,
  excludeIds = [],
  onClose,
  onSelect,
  onCreateExercise,
}: ExercisePickerModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {/* Modal content: header, search, chips, list, create form */}
    </Modal>
  );
}
```

### Pattern 2: Service Port Pattern (from web app)
**What:** Port the web app's `exercises.ts` service by copying the file and changing only the import path for the Supabase client.
**When to use:** For all service modules that are direct ports.
**Example:**
```typescript
// Web app:   import { supabase } from '../lib/supabase';
// iOS app:   import { supabase } from '@/lib/supabase';
// Everything else stays identical
```

### Pattern 3: AsyncStorage Cache Layer
**What:** A thin cache module that wraps AsyncStorage with typed helpers for exercise data.
**When to use:** For all cached data (exercises now, templates and history in later phases).
**Example:**
```typescript
// Source: @react-native-async-storage/async-storage docs
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEYS = {
  EXERCISES: 'cache:exercises',
  EXERCISES_TIMESTAMP: 'cache:exercises:ts',
} as const;

export async function getCachedExercises(): Promise<Exercise[] | null> {
  try {
    const json = await AsyncStorage.getItem(CACHE_KEYS.EXERCISES);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

export async function setCachedExercises(exercises: Exercise[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.EXERCISES, JSON.stringify(exercises));
    await AsyncStorage.setItem(CACHE_KEYS.EXERCISES_TIMESTAMP, Date.now().toString());
  } catch (err) {
    console.error('Failed to cache exercises:', err);
  }
}
```

### Pattern 4: getStyles(theme) Pattern (established in Phase 2)
**What:** Styles extracted to a `getStyles(theme)` function that returns `StyleSheet.create()` result.
**When to use:** All components -- this is the established pattern from Phase 2 (see `TextInputField.tsx`, `SubmitButton.tsx`).
**Note:** The dashboard `index.tsx` uses `createStyles(theme)` naming. Use `getStyles(theme)` to match the majority pattern.
**Example:**
```typescript
function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: { /* ... */ },
    // ...
  });
}
```

### Pattern 5: useExercises Hook (data management)
**What:** A custom hook that encapsulates exercise loading, caching, filtering, and sorting. Parent screens call the hook and pass data to the picker modal.
**When to use:** Wherever exercise data is needed (dashboard for quick access, template editor, workout screen).
**Example:**
```typescript
export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load from cache first, then fetch from Supabase
  useEffect(() => {
    loadExercises();
  }, []);

  async function loadExercises() {
    // 1. Try cache first
    const cached = await getCachedExercises();
    if (cached) {
      setExercises(cached);
      setIsLoading(false);
    }
    // 2. Fetch fresh from Supabase
    const { data, error } = await exercises.getExercises();
    if (data) {
      setExercises(data);
      await setCachedExercises(data);
    }
    setIsLoading(false);
  }

  return { exercises, isLoading, error, refresh: loadExercises };
}
```

### Anti-Patterns to Avoid
- **Making the picker a navigation route:** The picker needs callbacks (onSelect, onCreateExercise). Navigation routes communicate via params/context, adding unnecessary complexity.
- **Filtering exercises server-side per category:** All exercises are already loaded and cached. Client-side filtering of ~1000 items is instant. Server-side filtering per category is wasteful.
- **Creating a custom modal overlay from scratch:** Use React Native's built-in `Modal` component with `presentationStyle="pageSheet"`. Do not hand-roll overlay + animated sheet.
- **Memoizing StyleSheet.create() with useMemo:** `StyleSheet.create()` is already optimized by React Native. The `getStyles(theme)` pattern re-creates on every render but this is negligible cost. Do not add useMemo around it.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Near-full sheet modal | Custom animated overlay + PanResponder dismissal | `<Modal presentationStyle="pageSheet">` | Built-in iOS native sheet behavior: dimmed parent, swipe-to-dismiss, rounded corners. Zero code. |
| Virtualized list for 1000 items | Manual list windowing / recycling | `<FlatList>` with `getItemLayout`, `removeClippedSubviews`, `maxToRenderPerBatch` | RN's built-in virtualization is battle-tested. Only switch to FlashList if profiling shows issues. |
| Duplicate name validation | Custom client-side uniqueness check | Supabase `.ilike()` query (already in web service) + DB unique constraint as fallback | The web app's `createExercise` already implements this pattern: client-side check via ilike, DB constraint as safety net. |
| Key-value caching | Custom file-system cache or SQLite wrapper | `AsyncStorage` (included in Expo Go) | Official, maintained, zero config. IronLift's data is tiny (~16MB lifetime). |

**Key insight:** This phase is a PORT, not a greenfield build. The web app's `exercises.ts` service already handles all the tricky parts (duplicate validation, RLS-aware queries, user-scoping). Copy it, swap the import, done.

## Common Pitfalls

### Pitfall 1: Cardio Category - Database Constraint Mismatch
**What goes wrong:** User decision says "Cardio included in both filter chips and create form." But the database `exercises_category_check` constraint only allows: `Chest, Back, Shoulders, Legs, Arms, Core, Other`. Creating an exercise with `Cardio` category will fail with a PostgreSQL constraint violation. The `ExerciseCategory` TypeScript type also excludes `Cardio`.
**Why it happens:** The web app had the same inconsistency -- `CATEGORY_OPTIONS` included Cardio for creation, but the DB constraint and type didn't. The web app's `FILTER_CATEGORIES` excluded Cardio. The user now wants consistency (Cardio everywhere).
**How to avoid:** Before implementing, resolve one of:
  - Option A: Add a SQL migration to include `Cardio` in the constraint, update `ExerciseCategory` type to include `'Cardio'`
  - Option B: Exclude Cardio from the create form (keep it filter-only, knowing it will match zero exercises)
  - Option C: Map Cardio to `Other` in the service layer (lossy, not recommended)
**Warning signs:** Exercise creation silently fails or returns a constraint violation error when user picks Cardio category.

### Pitfall 2: FlatList Performance Without getItemLayout
**What goes wrong:** FlatList with ~1000 items scrolls sluggishly, especially on older iPhones.
**Why it happens:** Without `getItemLayout`, FlatList must asynchronously measure each item height, causing layout thrashing during scroll.
**How to avoid:** Since all exercise rows have identical height (name + category, fixed padding), provide `getItemLayout` with a constant item height. Also set `removeClippedSubviews={true}`, `maxToRenderPerBatch={15}`, and `windowSize={11}`.
**Warning signs:** Blank areas appearing during fast scroll, jerky frame drops.

### Pitfall 3: Modal State Not Resetting on Open
**What goes wrong:** User opens picker, types a search, selects a category, toggles create form. Closes modal. Opens it again -- previous state persists.
**Why it happens:** React state persists across re-renders if the component stays mounted. The `Modal` component stays in the tree, just visibility changes.
**How to avoid:** Use `useEffect` triggered by `visible` prop to reset all internal state (search query, selected category, create form visibility, form fields, error messages). The web app does exactly this (lines 105-115 of `ExercisePickerModal.tsx`).
**Warning signs:** Stale search text or selected category appearing when modal reopens.

### Pitfall 4: Calling supabase.auth.getUser() on Every Service Call
**What goes wrong:** The web app's `createExercise`, `getUserExercises`, `updateExercise`, and `getExerciseDependencies` all call `supabase.auth.getUser()` at the start. This makes a network request each time, adding latency to every exercise operation.
**Why it happens:** The web service was written to be stateless -- it fetches the user on every call.
**How to avoid:** For the port, keep this pattern initially (match the web app 1:1). Optimization can come later: the auth hook already has the user available, and it could be passed to service functions. But for Phase 3, direct port is fine -- don't over-engineer.
**Warning signs:** Noticeable delay on exercise creation or fetching user exercises.

### Pitfall 5: Forgetting onRequestClose on Modal
**What goes wrong:** On Android, the hardware back button does nothing when the modal is open. On iOS, the swipe-to-dismiss gesture doesn't trigger the close callback.
**Why it happens:** `onRequestClose` is required for Android back button handling and is called by iOS pageSheet swipe dismiss.
**How to avoid:** Always provide `onRequestClose={onClose}` on the `<Modal>` component. This is the same callback as the X button.
**Warning signs:** Modal gets "stuck" on Android with no way to dismiss.

### Pitfall 6: Search Debounce Over-Engineering
**What goes wrong:** Developer adds a debounce timer for the search input, introducing complexity and delayed feedback.
**Why it happens:** Instinct to "optimize" search on large lists.
**How to avoid:** Filtering ~1000 items client-side with `String.includes()` is instantaneous (< 1ms). No debounce needed. The web app doesn't debounce either. Just filter on every keystroke via `useMemo`.
**Warning signs:** Noticeable delay between typing and list updating.

## Code Examples

Verified patterns from official sources and the existing codebase:

### React Native Modal with pageSheet (iOS near-full sheet)
```typescript
// Source: React Native Modal docs (https://reactnative.dev/docs/modal)
// presentationStyle="pageSheet" on iOS gives:
// - Near-full screen coverage with small gap at top
// - Dimmed parent screen visible behind
// - Native swipe-to-dismiss gesture
// - Rounded top corners
<Modal
  visible={visible}
  animationType="slide"
  presentationStyle="pageSheet"
  onRequestClose={onClose}
>
  <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bgPrimary }}>
    {/* Modal content */}
  </SafeAreaView>
</Modal>
```

### FlatList with Performance Optimizations
```typescript
// Source: React Native FlatList optimization docs
// (https://reactnative.dev/docs/optimizing-flatlist-configuration)
const ITEM_HEIGHT = 60; // Fixed height: name (15px) + category (12px) + padding (sm*2)

<FlatList
  data={filteredExercises}
  keyExtractor={(item) => item.id}
  renderItem={renderExerciseItem}
  getItemLayout={(_, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  removeClippedSubviews={true}
  maxToRenderPerBatch={15}
  windowSize={11}
  initialNumToRender={15}
  ListEmptyComponent={<EmptyState />}
/>
```

### Horizontal Category Chips (ScrollView)
```typescript
// Source: Established project patterns (see web app's category filter)
// ScrollView (not FlatList) because chip count is small and fixed (9 items)
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.chipsContainer}
>
  {CATEGORIES.map((category) => (
    <Pressable
      key={category}
      onPress={() => setSelectedCategory(category)}
      style={[
        styles.chip,
        selectedCategory === category && styles.chipSelected,
      ]}
    >
      <Text
        style={[
          styles.chipText,
          selectedCategory === category && styles.chipTextSelected,
        ]}
      >
        {category}
      </Text>
    </Pressable>
  ))}
</ScrollView>
```

### Exercise Service Port (minimal changes)
```typescript
// Source: Web app exercises.ts -- only import path changes
// Web:  import { supabase } from '../lib/supabase';
// iOS:  import { supabase } from '@/lib/supabase';

// Web:  import type { Exercise, ExerciseCategory } from '../types/database';
// iOS:  import type { Exercise, ExerciseCategory } from '@/types/database';

// Web:  import type { ExercisesService, ... } from '../types/services';
// iOS:  import type { ExercisesService, ... } from '@/types/services';

// ALL function bodies stay IDENTICAL. No logic changes.
```

### AsyncStorage Cache Pattern
```typescript
// Source: @react-native-async-storage/async-storage docs
// (https://docs.expo.dev/versions/latest/sdk/async-storage/)
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Exercise } from '@/types/database';

const CACHE_KEY_EXERCISES = 'ironlift:exercises';

export async function getCachedExercises(): Promise<Exercise[] | null> {
  try {
    const json = await AsyncStorage.getItem(CACHE_KEY_EXERCISES);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

export async function setCachedExercises(exercises: Exercise[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY_EXERCISES, JSON.stringify(exercises));
  } catch (err) {
    console.error('Cache write failed:', err);
  }
}

export async function clearExerciseCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY_EXERCISES);
  } catch {
    // Silent fail on clear
  }
}
```

### Exercise Row Component (matching web app CSS)
```typescript
// Source: Web app CSS (.exercise-list-item, .exercise-item-name, etc.)
// Translated from CSS to RN StyleSheet
function getStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,   // CSS: var(--spacing-md)
      paddingVertical: theme.spacing.sm,      // CSS: var(--spacing-sm)
      borderRadius: theme.radii.md,           // CSS: var(--radius-md)
    },
    rowDisabled: {
      opacity: 0.5,                           // CSS: .disabled { opacity: 0.5 }
    },
    info: {
      flex: 1,
      gap: 2,                                 // CSS: gap: 2px
    },
    name: {
      fontSize: 15,                           // CSS: 0.9375rem = 15px
      fontWeight: theme.typography.weights.medium,  // CSS: font-weight: 500
      color: theme.colors.textPrimary,        // CSS: #fafafa
    },
    category: {
      fontSize: theme.typography.sizes.xs,    // CSS: 0.75rem = 12px
      color: theme.colors.textMuted,          // CSS: #71717a
    },
    badge: {
      fontSize: 10,                           // CSS: font-size: 10px
      fontWeight: theme.typography.weights.semibold, // CSS: font-weight: 600
      textTransform: 'uppercase',             // CSS: text-transform: uppercase
      letterSpacing: 0.3,                     // CSS: letter-spacing: 0.03em
      paddingHorizontal: 10,                  // CSS: padding: 5px 10px
      paddingVertical: 5,
      borderRadius: theme.radii.full,         // CSS: border-radius: 100px
      color: '#18181b',                       // CSS: color: #18181b (dark text on green)
      backgroundColor: theme.colors.success,  // Use theme success color per discretion
      overflow: 'hidden',                     // Required for borderRadius on Text in RN
    },
  });
}
```

### Category Dropdown for Create Form (iOS Picker)
```typescript
// Source: React Native Picker (community package) or custom dropdown
// Since the constitution forbids adding packages without asking,
// use a simple pressable + modal approach for the category picker
// OR consider if ActionSheet/Alert with options is sufficient for 8 categories.

// Recommended: Simple custom dropdown using Modal + FlatList for 8 items
// This avoids adding @react-native-picker/picker (not in approved list)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `AsyncStorage` from `react-native` core | `@react-native-async-storage/async-storage` community package | RN 0.60+ | Core AsyncStorage was deprecated. Community package is the standard. |
| `presentationStyle="formSheet"` | `presentationStyle="pageSheet"` | iOS 13+ | `pageSheet` gives near-full-screen sheet on iPhones. `formSheet` is smaller/centered on larger devices. Use `pageSheet` for the exercise picker. |
| Manual list rendering with ScrollView | `FlatList` with virtualization | RN 0.43+ | FlatList is the standard for any list > ~50 items. |

**Deprecated/outdated:**
- `AsyncStorage` from `react-native` core -- deprecated since RN 0.60, use community package
- `ListView` -- replaced by `FlatList` long ago

## Open Questions

Things that couldn't be fully resolved:

1. **Cardio Category - Database/Type Mismatch (BLOCKING)**
   - What we know: User wants Cardio in filter chips AND create form. Database CHECK constraint (`exercises_category_check`) only allows: Chest, Back, Shoulders, Legs, Arms, Core, Other. TypeScript `ExerciseCategory` type matches the constraint (no Cardio). The web app had Cardio in `CATEGORY_OPTIONS` for creation but NOT in `FILTER_CATEGORIES` -- so this inconsistency was never hit in production because the web app excluded Cardio from the filter dropdown.
   - What's unclear: Did the user intend for Cardio to be creatable (requires DB migration) or only filterable (no-op filter that matches zero exercises)?
   - Recommendation: **Ask the user.** If Cardio should be creatable, add a SQL migration (`ALTER TABLE public.exercises DROP CONSTRAINT exercises_category_check; ALTER TABLE public.exercises ADD CONSTRAINT exercises_category_check CHECK (category = ANY (ARRAY['Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core', 'Cardio', 'Other']));`) and update `ExerciseCategory` type. If filter-only, just add it to the UI chip list but exclude from create form options.

2. **Category Picker for Create Form -- No @react-native-picker/picker Approved**
   - What we know: The create form needs a category dropdown. The standard RN approach is `@react-native-picker/picker`, but it's not in the approved library list (constitution). The web app uses a `<select>` element.
   - What's unclear: Whether `@react-native-picker/picker` should be added, or a custom dropdown built.
   - Recommendation: Build a custom dropdown using a small `Modal` or `ActionSheet`-style overlay with a flat list of 8 categories. This avoids adding an unapproved dependency and is trivial to implement for such a small list. Alternatively, use React Native's `ActionSheetIOS` for iOS-native feel (built-in, no package needed) but this is iOS-only and has limited styling.

3. **Exercise Data Size and Cache Strategy**
   - What we know: ~1000 system exercises + user exercises. Each exercise has ~10 fields. Estimated cache size: ~200-400KB JSON. AsyncStorage handles this easily.
   - What's unclear: Whether to use a single cache key for all exercises or split system/user. Whether to add cache expiry timestamps.
   - Recommendation: Single cache key (`ironlift:exercises`) for simplicity. No expiry -- refresh on app foreground (constitution says sync on foreground). Split keys can be added later if needed.

## Sources

### Primary (HIGH confidence)
- Web app `exercises.ts` service at `Apps/exercise_tracker_app/packages/shared/src/services/exercises.ts` -- direct port source
- Web app `ExercisePickerModal.tsx` at `Apps/exercise_tracker_app/apps/web/src/components/ExercisePickerModal.tsx` -- UI reference
- Web app CSS at `Apps/exercise_tracker_app/apps/web/css/styles.css` lines 2769-2834 -- visual reference
- Existing iOS codebase types (`database.ts`, `services.ts`) -- type contracts
- Existing iOS codebase patterns (`TextInputField.tsx`, `SubmitButton.tsx`) -- getStyles pattern
- React Native Modal docs (https://reactnative.dev/docs/modal) -- presentationStyle options
- React Native FlatList optimization docs (https://reactnative.dev/docs/optimizing-flatlist-configuration) -- performance props
- Expo AsyncStorage docs (https://docs.expo.dev/versions/latest/sdk/async-storage/) -- installation, Expo Go compatibility

### Secondary (MEDIUM confidence)
- Expo Router modal docs (https://docs.expo.dev/router/advanced/modals/) -- formSheet/detents (not used, but verified RN Modal is better for this use case)
- Database schema at `sql/current_schema.sql` -- exercises table structure, constraint values

### Tertiary (LOW confidence)
- None -- all findings verified with primary or official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries are either already installed or are official Expo Go built-ins
- Architecture: HIGH -- patterns are established in the codebase (getStyles, service objects) or are standard React Native (Modal, FlatList)
- Pitfalls: HIGH -- Cardio constraint mismatch verified directly in database schema and TypeScript types. FlatList performance recommendations from official RN docs.

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days -- stable domain, no fast-moving dependencies)
