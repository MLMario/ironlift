# Architecture Research

**Domain:** Offline-capable iOS exercise tracker (Expo React Native + Supabase)
**Researched:** 2026-02-11
**Confidence:** HIGH

This document defines the component architecture, data flow patterns, and build order for IronLift iOS. The architecture decisions in `docs/app_develop_decision.md` are treated as binding constraints -- this research fills in the implementation details for the cache layer, write queue, sync manager, workout state, and service architecture.

---

## System Overview

```
+------------------------------------------------------------------+
|                       PRESENTATION LAYER                          |
|  +------------+  +----------+  +---------+  +---------+          |
|  | Dashboard  |  | Workout  |  | Template|  | Settings|          |
|  | (index)    |  | Screen   |  | Editor  |  | Screens |          |
|  +-----+------+  +-----+----+  +----+----+  +----+----+          |
|        |              |             |             |                |
|        +------+-------+------+------+------+------+               |
|               |              |             |                      |
+---------------|--------------|-------------|----------------------+
|               v              v             v                      |
|                        HOOKS LAYER                                |
|  +------------------+  +------------------+  +-----------------+  |
|  | useExercises     |  | useWorkout       |  | useAuth         |  |
|  | useTemplates     |  | useRestTimer     |  | useSync         |  |
|  | useWorkoutHistory|  | useWorkoutBackup |  | useConnectivity |  |
|  +--------+---------+  +--------+---------+  +--------+--------+  |
|           |                     |                     |           |
+-----------+---------------------+---------------------+-----------+
|           v                     v                     v           |
|                       SERVICE LAYER                               |
|  +-----------+  +----------+  +----------+  +-----------+        |
|  | exercises |  | templates|  | logging  |  | charts    |        |
|  | Service   |  | Service  |  | Service  |  | Service   |        |
|  +-----+-----+  +-----+----+  +----+-----+  +-----+-----+       |
|        |              |             |              |               |
+-----------+---------------------+---------------------+-----------+
|           v                     v                     v           |
|                    DATA ACCESS LAYER                              |
|  +-------------------+  +-------------------+  +---------------+  |
|  | CacheManager      |  | WriteQueue        |  | SyncManager   |  |
|  | (AsyncStorage)    |  | (AsyncStorage)    |  | (Orchestrator)|  |
|  +--------+----------+  +--------+----------+  +-------+-------+  |
|           |                      |                      |         |
+-----------+----------------------+----------------------+---------+
|           v                      v                      v         |
|                     EXTERNAL LAYER                                |
|  +-------------------+  +-------------------+                     |
|  | Supabase Client   |  | AsyncStorage      |                    |
|  | (with SecureStore) |  | (Local cache)     |                    |
|  +-------------------+  +-------------------+                     |
+------------------------------------------------------------------+
```

---

## Component Responsibilities

### Presentation Layer (app/)

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| `app/_layout.tsx` | Root stack navigator, auth gate, providers (Theme, Auth) | AuthProvider, ThemeProvider |
| `app/index.tsx` | Dashboard -- template cards, summary stats, chart previews | useTemplates, useWorkoutHistory, useSync |
| `app/workout.tsx` | Active workout session -- set logging, rest timer | useWorkout, useRestTimer, useWorkoutBackup |
| `app/template-editor.tsx` | Create/edit templates (modal presentation) | useTemplates, useExercises |
| `app/settings/exercises.tsx` | Manage user-created exercises | useExercises |
| `app/settings/history.tsx` | Workout history list with pagination | useWorkoutHistory |
| `app/settings/[exerciseId].tsx` | Exercise detail -- history and chart for one exercise | useWorkoutHistory, charts service |

**Boundary rule:** Screens contain UI and navigation only. No direct Supabase calls. No direct AsyncStorage access. All data flows through hooks, which call services.

### Hooks Layer (src/hooks/)

| Hook | Responsibility | Communicates With |
|------|----------------|-------------------|
| `useAuth` | Auth state, login/logout, session lifecycle | auth service, Supabase auth |
| `useExercises` | Exercise library with cached reads | exercises service, CacheManager |
| `useTemplates` | Template list with cached reads | templates service, CacheManager |
| `useWorkout` | Active workout state machine (in-memory during workout) | logging service, WriteQueue, CacheManager |
| `useRestTimer` | Rest timer countdown with notification scheduling | expo-notifications |
| `useWorkoutBackup` | Periodic backup of active workout to AsyncStorage | AsyncStorage directly |
| `useWorkoutHistory` | Paginated workout history from cache | logging service, CacheManager |
| `useSync` | Triggers sync on foreground, after writes | SyncManager |
| `useConnectivity` | Network status via NetInfo | @react-native-community/netinfo |
| `useCharts` | Chart configurations and computed chart data | charts service, logging service, CacheManager |

**Boundary rule:** Hooks compose services and managers. They do not call Supabase directly (except `useAuth` which wraps auth-specific calls). They return data + loading + error states to screens.

### Service Layer (src/services/)

| Service | Responsibility | Communicates With |
|---------|----------------|-------------------|
| `auth.ts` | Login, logout, register, password reset, session | Supabase auth |
| `exercises.ts` | Exercise CRUD (getExercises, createExercise, etc.) | Supabase from('exercises') |
| `templates.ts` | Template CRUD with nested exercises/sets | Supabase from('templates') |
| `logging.ts` | Workout log creation, history queries, metrics | Supabase from('workout_logs') |
| `charts.ts` | Chart CRUD, metric display helpers | Supabase from('user_charts'), logging service |

**Boundary rule:** Services are pure Supabase wrappers. They do NOT read from or write to AsyncStorage. They do NOT check connectivity. They return `ServiceResult<T>` -- the hooks/managers above decide whether to use cache or call the service.

**Port note:** Services are copied from the web app (`packages/shared/src/services/`) with two changes: (1) swap `import { supabase }` to point to the iOS Supabase client, and (2) in `auth.ts`, swap `window.location.origin` to `ironlift://reset-password` for the deep link redirect.

### Data Access Layer (src/lib/)

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| `supabase.ts` | Supabase client init with SecureStore adapter | expo-secure-store, Supabase |
| `cache.ts` (CacheManager) | Typed cache read/write/invalidate with timestamps | AsyncStorage |
| `writeQueue.ts` (WriteQueue) | Offline write queue with idempotency keys | AsyncStorage |
| `sync.ts` (SyncManager) | Orchestrates: flush write queue, then refresh caches | WriteQueue, CacheManager, Services, NetInfo |
| `connectivity.ts` | Thin wrapper around NetInfo for connectivity state | @react-native-community/netinfo |

---

## Data Flow Patterns

### Flow 1: Online Read (Cache-Then-Network)

This is the primary read pattern for exercises, templates, and history.

```
Screen renders
    |
    v
Hook calls CacheManager.get('exercises')
    |
    +-- Cache HIT (and not stale) --> return cached data immediately
    |
    +-- Cache MISS or STALE --> call service.getExercises()
            |
            +-- SUCCESS --> CacheManager.set('exercises', data) --> return data
            |
            +-- NETWORK ERROR --> return stale cache (if exists) + show sync indicator
            |
            +-- NO CACHE, NO NETWORK --> return empty + show offline message
```

**Implementation pattern:**

```typescript
// src/lib/cache.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;  // Date.now() when cached
}

const CACHE_KEYS = {
  exercises: 'cache:exercises',
  userExercises: 'cache:userExercises',
  templates: 'cache:templates',
  workoutHistory: 'cache:workoutHistory',
} as const;

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

async function get<T>(key: string): Promise<{ data: T | null; isStale: boolean }> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return { data: null, isStale: true };

  const entry: CacheEntry<T> = JSON.parse(raw);
  const isStale = Date.now() - entry.timestamp > STALE_THRESHOLD_MS;
  return { data: entry.data, isStale };
}

async function set<T>(key: string, data: T): Promise<void> {
  const entry: CacheEntry<T> = { data, timestamp: Date.now() };
  await AsyncStorage.setItem(key, JSON.stringify(entry));
}

async function invalidate(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

async function invalidateAll(): Promise<void> {
  const keys = Object.values(CACHE_KEYS);
  await AsyncStorage.multiRemove(keys);
}
```

**Confidence:** HIGH -- standard cache-aside pattern, well-established in React Native apps. AsyncStorage API verified from official Expo docs.

### Flow 2: Cached Read (Offline)

When the app is offline, all reads come from cache. The user never waits for network.

```
Screen renders (offline)
    |
    v
Hook calls CacheManager.get('templates')
    |
    +-- Cache HIT --> return cached data (regardless of staleness)
    |
    +-- Cache MISS --> return null + show "No data available offline"
```

**Key point:** Staleness is ignored when offline. The user sees whatever was last cached. A sync indicator shows "Last synced: X minutes ago."

### Flow 3: Offline Workout Write (Write Queue)

This is the most architecturally important flow. Workouts must be saveable without network.

```
User taps "Finish Workout"
    |
    v
useWorkout builds WorkoutLogInput from in-memory state
    |
    v
Check connectivity (NetInfo)
    |
    +-- ONLINE --> call logging.createWorkoutLog(data) directly
    |       |
    |       +-- SUCCESS --> invalidate cache('workoutHistory') --> navigate to dashboard
    |       |
    |       +-- FAILURE --> fall through to offline path below
    |
    +-- OFFLINE (or online call failed) --> WriteQueue.enqueue(data)
            |
            v
        Generate idempotency key (UUID v4)
        Save to AsyncStorage: writeQueue:[key] = { type, payload, createdAt, retryCount }
            |
            v
        Show "Workout saved locally. Will sync when online."
            |
            v
        Navigate to dashboard
```

**Write Queue implementation pattern:**

```typescript
// src/lib/writeQueue.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';  // or use crypto.randomUUID()

interface QueueEntry {
  id: string;              // Idempotency key (UUID)
  type: 'workout_log';     // Currently only one type
  payload: WorkoutLogInput;
  createdAt: string;       // ISO timestamp
  retryCount: number;
  lastError?: string;
}

const QUEUE_INDEX_KEY = 'writeQueue:index';

async function enqueue(type: QueueEntry['type'], payload: QueueEntry['payload']): Promise<string> {
  const id = uuidv4();
  const entry: QueueEntry = {
    id,
    type,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  // Store entry
  await AsyncStorage.setItem(`writeQueue:${id}`, JSON.stringify(entry));

  // Update index (ordered list of IDs)
  const index = await getIndex();
  index.push(id);
  await AsyncStorage.setItem(QUEUE_INDEX_KEY, JSON.stringify(index));

  return id;
}

async function getIndex(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(QUEUE_INDEX_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function dequeue(id: string): Promise<void> {
  await AsyncStorage.removeItem(`writeQueue:${id}`);
  const index = await getIndex();
  const updated = index.filter(i => i !== id);
  await AsyncStorage.setItem(QUEUE_INDEX_KEY, JSON.stringify(updated));
}

async function getAll(): Promise<QueueEntry[]> {
  const index = await getIndex();
  const keys = index.map(id => `writeQueue:${id}`);
  const pairs = await AsyncStorage.multiGet(keys);
  return pairs
    .filter(([_, value]) => value !== null)
    .map(([_, value]) => JSON.parse(value!) as QueueEntry);
}

async function markRetry(id: string, error: string): Promise<void> {
  const raw = await AsyncStorage.getItem(`writeQueue:${id}`);
  if (!raw) return;
  const entry: QueueEntry = JSON.parse(raw);
  entry.retryCount += 1;
  entry.lastError = error;
  await AsyncStorage.setItem(`writeQueue:${id}`, JSON.stringify(entry));
}
```

**Confidence:** HIGH for the pattern. The idempotency key approach is well-established. UUID generation needs verification -- `crypto.randomUUID()` may not be available in all React Native environments; `uuid` package or `expo-crypto` are safer alternatives.

### Flow 4: Sync (Flush Queue + Refresh Cache)

Sync is triggered by: (1) app comes to foreground, (2) user completes a write action, (3) iOS background fetch.

```
SyncManager.sync() called
    |
    v
Check connectivity (NetInfo)
    |
    +-- OFFLINE --> return early (no-op)
    |
    +-- ONLINE --> proceed
            |
            v
        Phase 1: Flush Write Queue (FIFO order)
            |
            For each entry in queue:
            |   |
            |   v
            |   Call logging.createWorkoutLog(entry.payload)
            |   |
            |   +-- SUCCESS --> dequeue entry
            |   |
            |   +-- FAILURE (network) --> stop processing, retry next sync
            |   |
            |   +-- FAILURE (4xx, data error) --> increment retryCount
            |           |
            |           +-- retryCount > MAX_RETRIES --> dequeue + log error
            |
            v
        Phase 2: Refresh Caches (parallel)
            |
            Promise.all([
              exercises.getExercises() --> cache.set('exercises'),
              templates.getTemplates() --> cache.set('templates'),
              logging.getWorkoutLogsPaginated() --> cache.set('workoutHistory'),
            ])
            |
            v
        Update lastSyncTimestamp in AsyncStorage
```

**SyncManager implementation pattern:**

```typescript
// src/lib/sync.ts
const MAX_RETRIES = 5;

async function sync(): Promise<{ flushed: number; errors: number }> {
  const isConnected = await NetInfo.fetch().then(state => state.isConnected);
  if (!isConnected) return { flushed: 0, errors: 0 };

  let flushed = 0;
  let errors = 0;

  // Phase 1: Flush write queue (sequential, FIFO)
  const entries = await writeQueue.getAll();
  for (const entry of entries) {
    try {
      if (entry.type === 'workout_log') {
        const result = await logging.createWorkoutLog(entry.payload);
        if (result.error) throw result.error;
      }
      await writeQueue.dequeue(entry.id);
      flushed++;
    } catch (err) {
      if (isNetworkError(err)) {
        // Stop processing -- network went away
        break;
      }
      // Data/server error -- mark for retry
      await writeQueue.markRetry(entry.id, String(err));
      if (entry.retryCount + 1 >= MAX_RETRIES) {
        await writeQueue.dequeue(entry.id);
        // TODO: save to dead-letter storage for debugging
      }
      errors++;
    }
  }

  // Phase 2: Refresh caches (parallel, best-effort)
  try {
    await Promise.allSettled([
      refreshExercisesCache(),
      refreshTemplatesCache(),
      refreshHistoryCache(),
    ]);
  } catch {
    // Cache refresh failures are non-fatal
  }

  await AsyncStorage.setItem('lastSyncTimestamp', new Date().toISOString());
  return { flushed, errors };
}
```

**Confidence:** HIGH for the two-phase pattern. LOW for iOS background fetch specifics -- `expo-background-fetch` works in Expo Go but its scheduling is controlled by iOS with minimum intervals of ~15 minutes and no guarantees. This should be treated as a bonus, not a primary sync trigger.

### Flow 5: Active Workout State Management

The active workout is managed entirely in-memory via a `useWorkout` hook. This is the most state-heavy part of the app.

```
User picks template --> useWorkout.start(template)
    |
    v
Initialize in-memory state:
  {
    templateId: string | null,
    templateName: string,
    startedAt: ISO string,
    exercises: [
      {
        exerciseId: string,
        name: string,
        category: string,
        restSeconds: number,
        order: number,
        sets: [{ setNumber, weight, reps, isDone }]
      }
    ]
  }
    |
    v
User interacts (update weight, reps, toggle isDone)
  --> React setState on the in-memory workout object
    |
    v
useWorkoutBackup periodically saves snapshot to AsyncStorage
  (debounced, every N seconds or on significant state changes)
    |
    v
User taps "Finish Workout"
  --> Build WorkoutLogInput from in-memory state
  --> Follow Flow 3 (offline write)
  --> Clear backup from AsyncStorage
```

**Workout state hook pattern:**

```typescript
// src/hooks/useWorkout.ts
interface ActiveWorkout {
  templateId: string | null;
  templateName: string;
  startedAt: string;
  exercises: ActiveExercise[];
}

interface ActiveExercise {
  exerciseId: string;
  name: string;
  category: ExerciseCategory;
  restSeconds: number;
  order: number;
  sets: ActiveSet[];
}

interface ActiveSet {
  setNumber: number;
  weight: number;
  reps: number;
  isDone: boolean;
}

// State is a discriminated union to prevent impossible states
type WorkoutState =
  | { status: 'idle' }
  | { status: 'active'; workout: ActiveWorkout }
  | { status: 'finishing'; workout: ActiveWorkout }
  | { status: 'error'; workout: ActiveWorkout; error: string };
```

**Backup strategy:** The web app uses `localStorage` to back up the active workout for crash recovery. The iOS app uses AsyncStorage for the same purpose. The backup key is `activeWorkout_{userId}` (matching the web pattern). On app launch, if a backup exists, prompt the user to resume or discard.

**Confidence:** HIGH -- the web app's `useWorkoutBackup` hook and `WorkoutBackupData` type transfer directly. The discriminated union timer pattern from `useTimerState` also transfers with a `preact/hooks` to `react` import swap.

### Flow 6: Chart Computation (Client-Side)

Charts are computed from cached workout history, not from separate API calls.

```
User navigates to dashboard (charts section)
    |
    v
useCharts loads chart configurations from cache/service
    |
    For each chart config: { exerciseId, metricType, xAxisMode }
    |
    v
Call logging.getExerciseMetrics(exerciseId, { metric, mode, limit })
    |
    +-- Service queries Supabase --> returns ChartData { labels, values }
    |
    +-- For offline: compute from cached workout history
            |
            Filter cached workoutHistory for exerciseId
            Calculate metrics (totalSets, maxVolumeSet) per session/date
            Return ChartData { labels, values }
    |
    v
Pass ChartData to <LineChart> / <BarChart> from react-native-gifted-charts
```

**Offline chart computation:** The web app's `getExerciseMetrics` calls `getExerciseHistory` which queries Supabase. For offline charts, the iOS app needs a local version of `calculateMetrics` that operates on cached workout history data instead of Supabase queries. The `calculateMetrics` helper function from `logging.ts` (lines 42-65) is already a pure function -- it can be extracted and reused.

**Confidence:** MEDIUM -- the computation logic is straightforward (it is a pure function already in the web app). The unknown is performance: computing metrics for all charts on app launch from a large cached history. For a single user this is unlikely to be a problem (a year of training data is ~500 workouts maximum), but it should be profiled during implementation.

---

## Recommended Project Structure

```
ironlift/
+-- app/                          # Expo Router screens (UI + navigation only)
|   +-- _layout.tsx               # Root stack navigator + providers
|   +-- index.tsx                  # Dashboard
|   +-- workout.tsx                # Active workout
|   +-- template-editor.tsx        # Template create/edit (modal)
|   +-- settings/
|       +-- exercises.tsx          # My Exercises
|       +-- history.tsx            # Workout History
|       +-- [exerciseId].tsx       # Exercise Detail
+-- src/
|   +-- types/
|   |   +-- database.ts            # DB row types (copied from web)
|   |   +-- services.ts            # Service interface types (copied from web)
|   |   +-- cache.ts               # CacheEntry, CacheKeys types
|   |   +-- sync.ts                # WriteQueueEntry, SyncStatus types
|   +-- services/
|   |   +-- auth.ts                # Auth service (adapted from web)
|   |   +-- exercises.ts           # Exercise service (adapted from web)
|   |   +-- templates.ts           # Template service (adapted from web)
|   |   +-- logging.ts             # Logging service (adapted from web)
|   |   +-- charts.ts              # Charts service (adapted, no Chart.js)
|   +-- hooks/
|   |   +-- useAuth.ts             # Auth state + session lifecycle
|   |   +-- useExercises.ts        # Exercise list with cache
|   |   +-- useTemplates.ts        # Template list with cache
|   |   +-- useWorkout.ts          # Active workout state machine
|   |   +-- useRestTimer.ts        # Rest timer (adapted from web useTimerState)
|   |   +-- useWorkoutBackup.ts    # Active workout backup to AsyncStorage
|   |   +-- useWorkoutHistory.ts   # Paginated history from cache
|   |   +-- useSync.ts             # Sync trigger on foreground/after writes
|   |   +-- useConnectivity.ts     # Network state via NetInfo
|   |   +-- useCharts.ts           # Chart configs + computed chart data
|   +-- components/
|   |   +-- common/                # Button, Input, Card, Modal, etc.
|   |   +-- workout/               # SetRow, ExerciseCard, TimerDisplay
|   |   +-- dashboard/             # TemplateCard, ChartPreview, SummaryStats
|   |   +-- settings/              # ExerciseRow, HistoryRow
|   +-- lib/
|   |   +-- supabase.ts            # Client init with SecureStore adapter
|   |   +-- cache.ts               # CacheManager (get/set/invalidate)
|   |   +-- writeQueue.ts          # Write queue (enqueue/dequeue/getAll)
|   |   +-- sync.ts                # SyncManager (flush + refresh)
|   |   +-- connectivity.ts        # NetInfo wrapper
|   |   +-- theme.ts               # ThemeProvider + useTheme + token definitions
|   |   +-- uuid.ts                # UUID generation (expo-crypto or uuid package)
|   +-- constants/
|       +-- layout.ts              # Spacing, sizes
|       +-- cache.ts               # Cache keys, stale thresholds
+-- sql/                           # Schema reference (copied from web)
+-- assets/                        # App icon, splash screen
+-- __tests__/                     # Jest test files
    +-- lib/
    |   +-- cache.test.ts
    |   +-- writeQueue.test.ts
    |   +-- sync.test.ts
    +-- hooks/
        +-- useWorkout.test.ts
        +-- useRestTimer.test.ts
```

### Structure Rationale

- **app/:** Expo Router convention. Screens are thin -- they compose hooks and components, contain no business logic.
- **src/services/:** Direct ports from the web app. These files change the least. Isolating them makes the port straightforward.
- **src/hooks/:** The primary new code for iOS. Hooks mediate between services and screens, adding cache/sync/offline awareness that the web app did not need.
- **src/lib/:** Infrastructure code. The cache, write queue, and sync manager are the core of the offline architecture. These get the most testing.
- **src/components/:** All hand-rolled with StyleSheet.create(). Organized by domain (common, workout, dashboard, settings) to match screen boundaries.
- **__tests__/:** Mirrors src/ structure. Focuses on lib/ (cache, queue, sync) and hook logic (workout state, timer).

---

## Architectural Patterns

### Pattern 1: Cache-Aside with Stale-While-Revalidate

**What:** Hooks read from cache first, then trigger a background refresh from Supabase. If the cache is fresh (within threshold), no network call is made. If stale, the cached data is returned immediately while a refresh happens in the background.

**When to use:** All read operations for exercises, templates, workout history, chart configs.

**Trade-offs:**
- Pro: Instant UI rendering, no loading spinners for cached data
- Pro: Works fully offline (stale cache is still usable)
- Con: UI may briefly show stale data before refresh completes
- Con: Must handle the cache refresh updating displayed data (React state update)

**Example:**

```typescript
// src/hooks/useExercises.ts
export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // 1. Try cache first
      const cached = await cache.get<Exercise[]>(CACHE_KEYS.exercises);
      if (cached.data) {
        setExercises(cached.data);
        setLoading(false);
      }

      // 2. If stale or no cache, fetch from network
      if (cached.isStale) {
        const result = await exercisesService.getExercises();
        if (result.data) {
          setExercises(result.data);
          await cache.set(CACHE_KEYS.exercises, result.data);
        }
        // If network fails and we had cache, keep showing cached data
      }

      setLoading(false);
    }
    load();
  }, []);

  return { exercises, loading };
}
```

### Pattern 2: Discriminated Union State Machines

**What:** Use TypeScript discriminated unions for state that has mutually exclusive modes. Prevents impossible states at compile time.

**When to use:** Workout state, timer state, sync status, auth state.

**Trade-offs:**
- Pro: Impossible states are unrepresentable (no "active workout with null startedAt")
- Pro: Exhaustive switch/case checking catches missing handlers
- Con: More verbose than simple boolean flags

**Example (already proven in the web app):**

```typescript
// From web app's useTimerState -- transfers directly
type TimerState =
  | { status: 'idle' }
  | { status: 'active'; exerciseIndex: number; elapsed: number; total: number }
  | { status: 'paused'; exerciseIndex: number; elapsed: number; total: number };

// Workout state (new for iOS)
type WorkoutState =
  | { status: 'idle' }
  | { status: 'active'; workout: ActiveWorkout }
  | { status: 'finishing'; workout: ActiveWorkout }
  | { status: 'error'; workout: ActiveWorkout; error: string };
```

### Pattern 3: Service Result Pattern

**What:** All services return `{ data: T | null, error: Error | null }` instead of throwing. Callers check the result, never wrap in try/catch.

**When to use:** Every service function.

**Trade-offs:**
- Pro: Consistent error handling across the app
- Pro: Already established in the web app -- no learning curve
- Con: Slightly more verbose than exceptions

**Example (from the existing web codebase):**

```typescript
const result = await exercises.getExercises();
if (result.error) {
  // handle error
  return;
}
// result.data is guaranteed non-null here
```

### Pattern 4: Foreground Sync via AppState

**What:** Listen to React Native's `AppState` to trigger sync when the app comes to foreground.

**When to use:** SyncManager integration in the root layout.

**Trade-offs:**
- Pro: User always sees fresh data after switching back to the app
- Pro: Covers the most common sync scenario (user opens app in gym after being idle)
- Con: AppState fires on every foreground event including returning from notification center
- Mitigation: Debounce sync to avoid rapid fire (minimum 30 second gap between syncs)

**Example:**

```typescript
// In app/_layout.tsx or a dedicated SyncProvider
useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active') {
      syncManager.sync(); // debounced internally
    }
  });
  return () => subscription.remove();
}, []);
```

**Confidence:** HIGH -- AppState API is a core React Native API, well-documented at reactnative.dev/docs/appstate.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Supabase Calls in Screens

**What people do:** Call `supabase.from('exercises').select()` directly in screen components.

**Why it is wrong:** Screens become untestable, cache/offline logic cannot be layered in, and every screen independently handles loading/error states.

**Do this instead:** Screens call hooks. Hooks call services (for Supabase) or managers (for cache/queue). This three-layer boundary is strict.

### Anti-Pattern 2: Global Zustand/Redux Store for Everything

**What people do:** Put all app state into a global store (exercises, templates, active workout, timer, auth, sync status).

**Why it is wrong:** IronLift is a single-user app with hub-and-spoke navigation. Only one "spoke" is active at a time. A global store creates coupling between unrelated concerns and introduces stale reference bugs when navigating between screens. The constitutional decision explicitly says "React hooks (no global store)."

**Do this instead:** Each hook owns its own `useState`. The cache layer (AsyncStorage) provides persistence across screen navigations. Auth state is the only truly global state (via React Context in the root layout). Everything else is per-screen or per-hook.

### Anti-Pattern 3: Optimistic Writes Without Queue

**What people do:** Show the write as successful immediately and fire-and-forget the API call.

**Why it is wrong:** If the API call fails (network drops mid-request), the data is lost. The user thinks the workout was saved, but it was not.

**Do this instead:** All writes go through the write queue. Online writes also go through the queue, but the queue is flushed immediately. This guarantees no data loss.

**Refinement:** For online writes, the app can attempt a direct write first. If it succeeds, skip the queue. If it fails, fall back to the queue. This gives immediate feedback when online while still protecting against data loss.

### Anti-Pattern 4: Polling for Data Freshness

**What people do:** Set up `setInterval` to periodically fetch fresh data from the server.

**Why it is wrong:** Wastes battery and network on a mobile app. The constitutional decision explicitly says "No polling."

**Do this instead:** Sync on foreground (AppState), sync after writes, and optional iOS background fetch. The user always gets fresh data when they actually look at the app.

### Anti-Pattern 5: Storing Entire Supabase Responses in Cache

**What people do:** Cache the raw Supabase response including metadata, pagination info, and nested objects.

**Why it is wrong:** Bloats AsyncStorage usage, makes cache keys unpredictable, and couples cache structure to Supabase response format.

**Do this instead:** Cache only the extracted, typed data arrays. `CacheEntry<Exercise[]>` contains the data and a timestamp, nothing else.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase PostgreSQL | Direct client via `@supabase/supabase-js` | RLS handles auth. No API layer. |
| Supabase Auth | Custom storage adapter (SecureStore) | See Supabase Client section below. |
| AsyncStorage | Key-value JSON | Cache, write queue, workout backup, last sync time. |
| expo-secure-store | Auth token storage | Supabase session tokens only. 2048-byte limit per key on some iOS versions. |
| expo-notifications | Local notification scheduling | Rest timer alerts when backgrounded. |
| @react-native-community/netinfo | Connectivity state | Included in Expo Go. Used by sync manager and hooks. |

### Supabase Client Configuration

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

**Size limit concern:** Supabase session tokens (access + refresh) are typically ~1.5KB total. The expo-secure-store 2048-byte limit is per key, and Supabase stores access token and refresh token as separate keys. This should be safe for email/password auth. OAuth providers (Google, Apple) can produce larger tokens, but IronLift uses email/password only.

**Alternative if size becomes an issue:** Use `expo-sqlite/localStorage/install` polyfill instead of SecureStore. This is now Supabase's recommended approach in their latest Expo tutorial. Less secure (not Keychain-encrypted) but no size limit. For a personal gym app, the security trade-off is acceptable.

**Confidence:** MEDIUM -- the SecureStore adapter pattern is well-documented in Supabase's official tutorials and multiple community implementations. The 2048-byte concern is flagged by the Supabase GitHub discussion #14306 but primarily affects OAuth, not email/password. The `expo-sqlite/localStorage` alternative is from the latest official Supabase Expo quickstart.

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Screen to Hook | React hook call | Screens never call services directly |
| Hook to Service | Async function call | Services return ServiceResult |
| Hook to CacheManager | Async function call | Cache returns typed data or null |
| SyncManager to WriteQueue | Async function call | Sequential flush, FIFO order |
| SyncManager to Services | Async function call | Parallel cache refresh |
| SyncManager to CacheManager | Async function call | Cache writes after service calls |

---

## Scalability Considerations

IronLift is a single-user personal app. "Scale" here means data volume over time, not concurrent users.

| Concern | Year 1 (~200 workouts) | Year 5 (~1000 workouts) | Year 10+ (~2000 workouts) |
|---------|-------------------------|--------------------------|---------------------------|
| AsyncStorage cache size | ~500KB | ~2.5MB | ~5MB |
| Cache load time | <50ms | ~100ms | ~200ms |
| Chart computation | Instant | ~50ms per chart | ~100ms per chart |
| Sync duration | <1s | ~2s | ~3s |
| Write queue typical size | 0-2 entries | 0-2 entries | 0-2 entries |

**First bottleneck:** Chart computation from cached history. If the user has many charts (5+) and years of data, computing all metrics on dashboard render could cause a noticeable delay.

**Mitigation:** Compute chart data lazily (only for visible charts) and memoize results. If this becomes insufficient, add a separate computed chart data cache that is invalidated only when workout history changes.

**Second bottleneck:** Full cache refresh pulling all history on every sync.

**Mitigation:** Implement incremental sync -- only fetch workouts newer than the most recent cached workout's `created_at`. This is a future optimization, not needed at launch.

---

## Build Order Implications

Based on component dependencies, the recommended build order is:

### Foundation (must be first)

1. **Supabase client** (`src/lib/supabase.ts`) -- everything depends on this
2. **Types** (`src/types/database.ts`, `src/types/services.ts`) -- copied from web as-is
3. **Theme** (`src/lib/theme.ts`) -- all UI depends on this
4. **Root layout** (`app/_layout.tsx`) -- providers, auth gate, navigation structure

### Core Infrastructure (must precede features)

5. **Auth service + useAuth hook** -- gated by Supabase client. All other services need authenticated user.
6. **CacheManager** (`src/lib/cache.ts`) -- simple AsyncStorage wrapper. All data hooks depend on this.
7. **Connectivity** (`src/lib/connectivity.ts` + `useConnectivity`) -- sync depends on this.

### Data Services (can be built in parallel)

8. **Exercises service + useExercises** -- needed by template editor and workout
9. **Templates service + useTemplates** -- needed by dashboard and workout
10. **Logging service + useWorkoutHistory** -- needed by dashboard and history screen

### Offline Infrastructure (depends on services)

11. **WriteQueue** (`src/lib/writeQueue.ts`) -- the offline write mechanism
12. **SyncManager** (`src/lib/sync.ts`) -- orchestrates queue flush + cache refresh
13. **useSync hook** -- foreground sync trigger in root layout

### Feature Screens (depends on hooks + services)

14. **Dashboard** (`app/index.tsx`) -- the hub
15. **Active Workout** (`app/workout.tsx`) -- the core feature, uses useWorkout + useRestTimer + useWorkoutBackup
16. **Template Editor** (`app/template-editor.tsx`) -- modal, uses useTemplates + useExercises
17. **Settings screens** -- My Exercises, History, Exercise Detail

### Charts (depends on logging service + cached history)

18. **Charts service** (adapted, no Chart.js rendering)
19. **useCharts hook** -- chart configs + computed data
20. **Chart components** -- react-native-gifted-charts integration on dashboard

This ordering ensures that each layer is testable before the layer above it is built. The offline infrastructure (11-13) can be deferred to a later phase if shipping faster is prioritized -- the app works online-only without it, and the offline capability layers on top without changing the service interfaces.

---

## Sources

- [Expo AsyncStorage documentation](https://docs.expo.dev/versions/latest/sdk/async-storage/) -- MEDIUM confidence (verified via search, not Context7)
- [Expo SecureStore documentation](https://docs.expo.dev/versions/latest/sdk/securestore/) -- HIGH confidence (fetched directly)
- [Supabase Expo React Native tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native) -- HIGH confidence (fetched directly)
- [Supabase Expo quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native) -- HIGH confidence (fetched directly)
- [React Native AppState docs](https://reactnative.dev/docs/appstate) -- HIGH confidence (official RN docs)
- [@react-native-community/netinfo Expo docs](https://docs.expo.dev/versions/latest/sdk/netinfo/) -- HIGH confidence (verified: "Included in Expo Go")
- [Supabase GitHub Discussion #14306 - SecureStore size limits](https://github.com/orgs/supabase/discussions/14306) -- MEDIUM confidence (community discussion)
- [Supabase GitHub Issue #14523 - Inconsistent store recommendations](https://github.com/supabase/supabase/issues/14523) -- LOW confidence (open issue, recommendations may change)
- Web app source code at `Apps/exercise_tracker_app/packages/shared/src/` -- HIGH confidence (canonical reference, read directly)

---
*Architecture research for: IronLift iOS -- offline-capable exercise tracker*
*Researched: 2026-02-11*
