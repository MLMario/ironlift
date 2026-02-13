# Phase 5: Active Workout - Research

**Researched:** 2026-02-13
**Domain:** Active workout tracking (state management, rest timer, local notifications, swipe gestures, offline write queue, crash recovery)
**Confidence:** HIGH

## Summary

Phase 5 is the product's centerpiece -- a full-featured active workout screen with exercise cards, set logging, rest timer with local notifications, offline support via write queue, and crash recovery. The research covered seven technical domains: workout state management, rest timer with notifications, swipe-to-delete gestures, progress ring SVG, offline write queue, crash recovery, and the logging service port.

The standard approach is: a single `useWorkoutState` hook managing all workout state, a `useRestTimer` hook wrapping `setInterval` with `expo-notifications` for background alerts and `expo-haptics` for foreground feedback, swipe-to-delete built with `react-native-gesture-handler`'s `Gesture.Pan` + `react-native-reanimated` shared values, progress rings via `react-native-svg` (already in Expo Go), a write queue service using AsyncStorage with `@react-native-community/netinfo` for connectivity detection, and crash recovery via AsyncStorage keyed by user ID.

**Primary recommendation:** Port the web app's workout architecture almost directly -- the state management, timer logic, template change detection, and logging service all translate cleanly. The main rebuilds are the swipe gesture (web's `@use-gesture` becomes `react-native-gesture-handler`) and the rest timer bar (web CSS becomes RN `View` + `Animated.View`). New additions are `expo-notifications` for background timer alerts and `expo-haptics` for foreground completion feedback.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Stack push from dashboard, swipe-back disabled during active workout
- iOS nav bar header: Cancel (left), template name (center), Finish (right)
- Collapsible accordion cards with progress ring + exercise name + chevron
- 4-column set row: set number badge, weight input, reps input, done checkbox (44px min tap targets)
- Done state: 60% opacity, green set number badge
- New set defaults: copy weight/reps from last set
- Swipe-to-delete for sets only (not exercises), one row at a time, rubberband + snap
- Exercises use "Remove Exercise" button in card footer
- Inline horizontal rest timer bar per exercise: [-10s] progress bar [MM:SS] [+10s]
- Timer triggers on set done (unchecked -> checked), uses exercise's rest_seconds
- Single timer -- new timer replaces previous
- Foreground completion: haptic + short alert sound
- Background completion: local notification via expo-notifications
- Cancellation: any invalidating action cancels scheduled notification
- Finish flow: validate 1+ exercise, confirm modal, structural change detection, conditional template update modal (non-dismissible), navigate to dashboard
- Cancel flow: confirm modal, discard all, navigate to dashboard
- Offline: cached templates, write queue with idempotency key, silent save
- Crash recovery: AsyncStorage keyed activeWorkout_{userId}, save on set done + structural changes (not keystrokes), resume modal on dashboard
- Add Exercise opens ExercisePickerModal (Phase 3 component), new exercise gets 3 default sets
- Port logging.ts from web, 3-table schema, rollback on failure, idempotency key

### Claude's Discretion
- Progress ring SVG dimensions and styling for mobile
- Rest timer bar height and visual proportions
- Haptic feedback pattern (which expo-haptics impact style)
- Alert sound choice for timer completion
- AsyncStorage key naming for write queue entries
- Write queue sync retry strategy and backoff
- Exact confirmation modal styling
- Whether to add exercise-level reordering mid-workout

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `react-native-gesture-handler` | ~2.28.0 | Swipe-to-delete gesture for set rows | Installed, GestureHandlerRootView in _layout.tsx |
| `react-native-reanimated` | ~4.1.1 | Animated swipe translation, accordion expand/collapse | Installed |
| `expo-haptics` | ~15.0.8 | Haptic feedback on timer completion | Installed |
| `@react-native-async-storage/async-storage` | 2.2.0 | Crash recovery backup, write queue storage | Installed |

### Core (needs installation)
| Library | Version | Purpose | Expo Go? |
|---------|---------|---------|----------|
| `expo-notifications` | latest SDK 54 | Local notification on timer completion (background) | YES - iOS device only |
| `react-native-svg` | latest SDK 54 | Progress ring circles on exercise cards | YES - included in Expo Go |
| `expo-audio` | latest SDK 54 | Short alert sound on timer completion (foreground) | YES - included in Expo Go |
| `@react-native-community/netinfo` | latest SDK 54 | Network connectivity detection for write queue sync | YES - included in Expo Go |

### Installation
```bash
npx expo install expo-notifications react-native-svg expo-audio @react-native-community/netinfo
```

### Not Needed
| Library | Why Not |
|---------|---------|
| `react-native-circular-progress` | Hand-roll with react-native-svg (simple, 2 circles + text) |
| `expo-av` | Deprecated in SDK 54, use expo-audio instead |
| Any swipe library | Hand-roll with gesture-handler + reanimated (locked decision) |

## Architecture Patterns

### Recommended Project Structure (new files for Phase 5)
```
src/
  services/
    logging.ts          # NEW: Port from web, add write queue integration
    writeQueue.ts       # NEW: Offline write queue service
  hooks/
    useWorkoutState.ts  # NEW: Workout state management (exercises, sets, timer)
    useRestTimer.ts     # NEW: Timer state machine + notifications + haptics
    useWorkoutBackup.ts # NEW: Crash recovery (AsyncStorage backup/restore)
    useWriteQueue.ts    # NEW: Write queue sync hook (AppState + NetInfo)
  components/
    WorkoutExerciseCard.tsx   # NEW: Accordion card with progress ring
    WorkoutSetRow.tsx         # NEW: 4-column set row with swipe-to-delete
    RestTimerBar.tsx          # NEW: Inline timer bar with progress + adjust buttons
    ProgressRing.tsx          # NEW: SVG circular progress indicator
    ConfirmationModal.tsx     # NEW: Reusable confirmation modal
    ResumeWorkoutModal.tsx    # NEW: Dashboard overlay for crash recovery
app/
  workout.tsx           # REPLACE: Placeholder -> full workout screen
  index.tsx             # MODIFY: Add crash recovery check + handleStart implementation
```

### Pattern 1: Workout State as Single Reducer-Style Hook
**What:** All workout state (exercises, sets, template snapshot) lives in a single `useWorkoutState` hook that mirrors the web's `WorkoutSurface` state management.
**When to use:** Always -- this is the only state management pattern for the workout.
**Why:** The web app uses `useState` with functional updates for immutable state. The same pattern works in React Native. A single hook keeps all workout mutations colocated and testable.

```typescript
// src/hooks/useWorkoutState.ts
interface WorkoutSet {
  set_number: number;
  weight: number;
  reps: number;
  is_done: boolean;
}

interface WorkoutExercise {
  exercise_id: string;
  name: string;
  category: string;
  order: number;
  rest_seconds: number;
  sets: WorkoutSet[];
}

interface ActiveWorkout {
  template_id: string | null;
  template_name: string;
  started_at: string | null;
  exercises: WorkoutExercise[];
}

// Hook returns state + all mutation functions
// Mirrors web WorkoutSurface's useState + handlers pattern
```

### Pattern 2: Rest Timer as Discriminated Union State Machine
**What:** Port the web's `useTimerState` hook almost directly -- timer state is `{status: 'idle'} | {status: 'active', exerciseIndex, elapsed, total}`. Add `expo-notifications` scheduling and `expo-haptics` feedback.
**When to use:** Always -- this is the locked timer architecture.

```typescript
// src/hooks/useRestTimer.ts
// Port useTimerState from web (swap preact -> react imports)
// Add: scheduleNotificationAsync on start, cancelScheduledNotificationAsync on stop
// Add: Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) on completion
// Add: expo-audio player.play() for alert sound on completion
```

### Pattern 3: Swipe-to-Delete with Gesture.Pan + Reanimated Shared Values
**What:** Each set row wraps content in a `GestureDetector` with `Gesture.Pan()`. Translation is a `useSharedValue` animated with `useAnimatedStyle`. Delete button is positioned behind the row.
**When to use:** Set rows only (locked decision -- exercises use button).

```typescript
// Key implementation pattern:
const translateX = useSharedValue(0);

const panGesture = Gesture.Pan()
  .activeOffsetX([-10, 10])  // Ignore small movements
  .onUpdate((e) => {
    // Constrain to left swipe, rubberband past -80px
    translateX.value = Math.min(0, Math.max(-80 - (e.translationX < -80 ? (-80 - e.translationX) * 0.8 : 0), e.translationX));
  })
  .onEnd((e) => {
    // Snap to revealed (-70px) or back (0) based on threshold
    const shouldReveal = translateX.value < -40 || (e.velocityX < -500);
    translateX.value = withSpring(shouldReveal ? -70 : 0);
  });
```

### Pattern 4: Write Queue with Idempotency Keys
**What:** Completed workouts saved to AsyncStorage write queue. Each entry has a UUID idempotency key. Sync attempts on connectivity return, with exponential backoff on failure.
**When to use:** When saving completed workouts (finish flow).

```typescript
// src/services/writeQueue.ts
interface WriteQueueEntry {
  id: string;           // UUID idempotency key
  type: 'workout_log';
  payload: WorkoutLogInput;
  created_at: string;
  attempts: number;
  last_attempt_at: string | null;
}

// AsyncStorage key: 'ironlift:writeQueue'
// Sync: on app foreground (AppState), on NetInfo connectivity change
// Retry: exponential backoff (5s, 15s, 45s, 135s, cap at 5min)
// Dedup: INSERT with idempotency key check (or ON CONFLICT)
```

### Pattern 5: Crash Recovery via AsyncStorage Backup
**What:** Workout state saved to `activeWorkout_{userId}` key in AsyncStorage on meaningful actions (set done, add/remove exercise/set). On app launch, dashboard checks for saved workout and shows resume modal.
**When to use:** Automatic -- triggered by specific state changes.

```typescript
// src/hooks/useWorkoutBackup.ts
// Port from web: swap localStorage -> AsyncStorage (async!)
// Key difference: web's save is synchronous, AsyncStorage is async
// Save trigger: after set done toggle, exercise add/remove, set add/remove
// NOT on every weight/reps keystroke (locked decision)
```

### Anti-Patterns to Avoid
- **Saving workout backup on every keystroke:** The user explicitly locked this out. Only save on set completion, exercise add/remove, set add/remove.
- **Multiple simultaneous timers:** Single timer only. Starting a new timer replaces the previous one.
- **Auto-expand/collapse accordion cards:** User controls which cards are open. No automatic behavior.
- **Floating timer indicator:** Timer only visible inside its exercise card. No floating overlay.
- **Summary screen after finish:** Navigate straight to dashboard after save.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Local notifications | Custom background timer tracking | `expo-notifications` scheduleNotificationAsync | iOS background execution is unreliable; scheduled notifications fire reliably |
| Network detection | Polling or manual fetch checks | `@react-native-community/netinfo` addEventListener | Native API, battery-efficient, handles all edge cases |
| Haptic feedback | Custom vibration patterns | `expo-haptics` impactAsync | Single line, iOS-native feel, correct motor patterns |
| Sound playback | Audio context management | `expo-audio` useAudioPlayer | Handles audio session, interruptions, format decoding |
| UUID generation | Custom ID generators | `crypto.randomUUID()` or `uuid` | Crypto-quality randomness for idempotency keys |

**Key insight:** The timer notification, haptics, and sound are each one-liner API calls. The real complexity is in the state management (which the web app already solved) and the swipe gesture (which react-native-gesture-handler + reanimated handle).

## Common Pitfalls

### Pitfall 1: Timer Interval Drift and Background Suspension
**What goes wrong:** `setInterval` stops when iOS suspends the app. Timer state becomes stale. User returns to find timer still "running" at wrong elapsed time.
**Why it happens:** iOS aggressively suspends background JS execution.
**How to avoid:** Use wall-clock time comparison instead of counting ticks. Store `timerStartedAt` timestamp and `timerDuration`. Calculate remaining = duration - (now - startedAt). The `setInterval` is only for UI updates while foregrounded.
**Warning signs:** Timer shows wrong remaining time after backgrounding and returning.

### Pitfall 2: AsyncStorage Async Nature for Crash Recovery
**What goes wrong:** Web's `localStorage.setItem` is synchronous. AsyncStorage is async. If the app crashes during the save, data may be lost.
**Why it happens:** AsyncStorage operations return promises.
**How to avoid:** Use `await` for backup saves. Accept that a crash during the async write could lose the last action. This is acceptable because saves only happen on discrete actions (set done), not continuous input.
**Warning signs:** Backup data is sometimes missing after app kill.

### Pitfall 3: Notification Permission Denied Silently on iOS
**What goes wrong:** User denies notification permission. Timer completion in background produces no alert. User misses rest timer completion.
**Why it happens:** iOS shows permission prompt once. If denied, subsequent calls silently fail.
**How to avoid:** Request permission early (app launch, per constitution). If denied, timer still works in foreground (haptic + sound). No need to re-prompt -- the foreground experience is sufficient.
**Warning signs:** No notification appears when app is backgrounded during timer.

### Pitfall 4: Keyboard Dismissal During Set Logging
**What goes wrong:** User types weight/reps, taps done checkbox. Keyboard dismisses but the tap also registers on the checkbox. Or keyboard covers the set rows.
**Why it happens:** React Native keyboard behavior interacts with scroll and tap targets.
**How to avoid:** Use `KeyboardAvoidingView` with `behavior="padding"` on iOS. Use `keyboardShouldPersistTaps="handled"` on the ScrollView so taps on buttons work without first dismissing the keyboard. Use `Keyboard.dismiss()` explicitly when toggling set done.
**Warning signs:** Need to tap twice to check done -- once to dismiss keyboard, once to toggle.

### Pitfall 5: Swipe Gesture Conflicts with ScrollView
**What goes wrong:** Horizontal swipe-to-delete gesture conflicts with vertical scroll. User tries to swipe a set row but the list scrolls instead, or vice versa.
**Why it happens:** Both gesture systems compete for the same touch events.
**How to avoid:** Use `Gesture.Pan().activeOffsetX([-10, 10])` to only activate after 10px horizontal movement. This lets vertical scrolling take priority for small movements. The `react-native-gesture-handler` system handles this natively when configured correctly.
**Warning signs:** Swipe gesture activates during vertical scroll, or scroll is impossible when touching set rows.

### Pitfall 6: Stale Timer Closure in setInterval Callback
**What goes wrong:** The `setInterval` callback captures stale state values. Timer never completes or completes at wrong time.
**Why it happens:** JavaScript closure captures the initial state value; functional setState is needed.
**How to avoid:** Use the web app's pattern exactly: track `elapsedCount` as a local variable in the closure (not React state), compare against `seconds` (also captured). Use functional `setState` for React state updates. The web's `useTimerState` already handles this correctly with `tick()` using functional setState.
**Warning signs:** Timer keeps running past 0, or completes immediately.

### Pitfall 7: Write Queue Duplicate Submissions
**What goes wrong:** Network flakes during sync. Request succeeds server-side but client gets timeout error. Client retries, creating duplicate workout log.
**Why it happens:** HTTP requests can succeed but the response fails to reach the client.
**How to avoid:** Add idempotency key to workout log. On the service side, check for existing workout with same idempotency key before inserting. Use Supabase's `.upsert()` or check-then-insert pattern.
**Warning signs:** Duplicate workout entries in history.

### Pitfall 8: Accordion Animated Height
**What goes wrong:** Collapsible card body has unknown height. Cannot animate `height` to a specific value without measuring.
**Why it happens:** React Native's `Animated` requires known target values for `height` animations.
**How to avoid:** Use `LayoutAnimation.configureNext()` for simple expand/collapse (no measurement needed). Or use `useAnimatedStyle` with `maxHeight` and `overflow: 'hidden'`. Or simply toggle visibility without animation (the web uses CSS `max-height` transition which has the same imprecision problem). Simplest approach: toggle `display` with `LayoutAnimation` for native animation.
**Warning signs:** Content clips or jumps during expand/collapse.

## Code Examples

### Scheduling and Canceling a Local Notification
```typescript
// Source: Expo official docs (https://docs.expo.dev/versions/latest/sdk/notifications/)
import * as Notifications from 'expo-notifications';

// MUST call this at app startup for foreground notifications to display
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Schedule notification X seconds from now
const notificationId = await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Rest Timer Complete',
    body: 'Time to start your next set',
    sound: true,
  },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: restSeconds,
  },
});

// Cancel when timer is invalidated
await Notifications.cancelScheduledNotificationAsync(notificationId);
```

### Haptic Feedback on Timer Completion
```typescript
// Source: Expo official docs (https://docs.expo.dev/versions/latest/sdk/haptics/)
import * as Haptics from 'expo-haptics';

// Medium impact -- "collision between moderately sized UI elements"
// Good for timer completion: noticeable but not aggressive
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
```

### Alert Sound on Timer Completion
```typescript
// Source: Expo official docs (https://docs.expo.dev/versions/latest/sdk/audio/)
import { useAudioPlayer } from 'expo-audio';

// In component/hook:
const alertPlayer = useAudioPlayer(require('../assets/sounds/timer-complete.mp3'));

// On timer completion (foreground):
alertPlayer.seekTo(0); // Reset position (expo-audio doesn't auto-reset)
alertPlayer.play();
```

### Progress Ring with react-native-svg
```typescript
// Source: Standard SVG circle progress pattern
import Svg, { Circle } from 'react-native-svg';

const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SIZE = 40;

function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const progress = total > 0 ? completed / total : 0;
  const offset = CIRCUMFERENCE * (1 - progress);
  const isComplete = total > 0 && completed === total;

  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {/* Background circle */}
      <Circle
        cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
        fill="none"
        stroke={theme.colors.bgElevated}
        strokeWidth={3}
      />
      {/* Progress arc */}
      <Circle
        cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
        fill="none"
        stroke={isComplete ? theme.colors.success : theme.colors.accent}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        rotation={-90}
        origin={`${SIZE / 2}, ${SIZE / 2}`}
      />
    </Svg>
  );
}
```

### Swipe-to-Delete with Gesture.Pan + Reanimated
```typescript
// Source: react-native-gesture-handler + reanimated documentation patterns
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';

function SwipeableSetRow({ onDelete, onReveal }: Props) {
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])   // 10px dead zone before activating
    .failOffsetY([-5, 5])       // Fail if vertical movement > 5px (let scroll take over)
    .onUpdate((e) => {
      // Constrain to left-only with rubberband past max
      const maxDrag = -80;
      if (e.translationX >= 0) {
        translateX.value = 0;
      } else if (e.translationX >= maxDrag) {
        translateX.value = e.translationX;
      } else {
        const overDrag = e.translationX - maxDrag;
        translateX.value = maxDrag + overDrag * 0.2; // Rubberband resistance
      }
    })
    .onEnd((e) => {
      const shouldReveal = translateX.value < -40 || e.velocityX < -500;
      translateX.value = withSpring(shouldReveal ? -70 : 0, {
        damping: 20, stiffness: 200,
      });
      if (shouldReveal) runOnJS(onReveal)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={animatedStyle}>
        {/* Set row content */}
      </Animated.View>
    </GestureDetector>
  );
}
```

### Write Queue Service Pattern
```typescript
// src/services/writeQueue.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const WRITE_QUEUE_KEY = 'ironlift:writeQueue';

interface WriteQueueEntry {
  id: string;              // UUID for idempotency
  type: 'workout_log';
  payload: WorkoutLogInput;
  created_at: string;
  attempts: number;
  last_attempt_at: string | null;
}

export async function enqueue(entry: Omit<WriteQueueEntry, 'attempts' | 'last_attempt_at'>): Promise<void> {
  const queue = await getQueue();
  queue.push({ ...entry, attempts: 0, last_attempt_at: null });
  await AsyncStorage.setItem(WRITE_QUEUE_KEY, JSON.stringify(queue));
}

export async function processQueue(): Promise<void> {
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) return;

  const queue = await getQueue();
  const remaining: WriteQueueEntry[] = [];

  for (const entry of queue) {
    try {
      // Call logging service with idempotency check
      const { error } = await logging.createWorkoutLog(entry.payload);
      if (error) throw error;
      // Success: don't add to remaining (removes from queue)
    } catch {
      // Failure: keep in queue with incremented attempt count
      remaining.push({
        ...entry,
        attempts: entry.attempts + 1,
        last_attempt_at: new Date().toISOString(),
      });
    }
  }

  await AsyncStorage.setItem(WRITE_QUEUE_KEY, JSON.stringify(remaining));
}
```

### Crash Recovery Check on Dashboard
```typescript
// In app/index.tsx (dashboard)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/useAuth';

// On mount, check for saved workout
useEffect(() => {
  const checkSavedWorkout = async () => {
    if (!userId) return;
    const key = `activeWorkout_${userId}`;
    const saved = await AsyncStorage.getItem(key);
    if (saved) {
      const backup = JSON.parse(saved);
      // Show resume modal with template name + time since start
      setResumeData(backup);
      setShowResumeModal(true);
    }
  };
  checkSavedWorkout();
}, [userId]);
```

## Discretion Recommendations

### Progress Ring Dimensions
**Recommendation:** 40x40px viewBox, 16px radius, 3px stroke width (matching web exactly). The web uses these values and they work well at mobile scale. The text overlay (`3/5`) uses 9px monospace font, positioned absolutely centered.

### Rest Timer Bar Height
**Recommendation:** 8px bar height (matching web's `.rest-timer-bar { height: 8px }`). The full row including buttons should be ~44px (button tap targets). The progress fill uses a gradient: `accent -> #67e8f9` (matching web's CSS gradient).

### Haptic Feedback Pattern
**Recommendation:** `Haptics.ImpactFeedbackStyle.Medium`. This is the "collision between moderately sized UI elements" -- appropriate for a timer completion event. Not too subtle (Light) and not jarring (Heavy). The user will feel it through their phone on the gym bench.

### Alert Sound
**Recommendation:** Bundle a short (~0.5s) alert chime as an MP3 asset. Use `expo-audio`'s `useAudioPlayer` hook. The sound should be distinct but not obnoxious -- a single clean tone or chime. Can source from a CC0 sound library or create a simple synthesized tone. Ship a `timer-complete.mp3` in `assets/sounds/`.

### AsyncStorage Key Naming for Write Queue
**Recommendation:** `ironlift:writeQueue` (single queue, not per-user). Each entry contains user_id in its payload. This simplifies the queue management -- no need to construct user-specific keys.

### Write Queue Retry Strategy
**Recommendation:** Exponential backoff: 5s, 15s, 45s, 135s, cap at 5 minutes. Max 10 attempts before marking as failed (but keeping in queue for manual retry later). Sync triggers: AppState change to 'active' (foreground), NetInfo connectivity change to online.

### Confirmation Modal Styling
**Recommendation:** iOS-native Alert.alert for simple confirmations (Cancel Workout). For the template update modal (which needs custom buttons "Yes, Update" / "No, Keep Original" and non-dismissible overlay), use a custom RN Modal with dark overlay, centered card, matching the web's ConfirmationModal but with iOS-native styling (rounded corners, blur background if desired). Keep it simple -- `Modal` with `transparent` and `animationType="fade"`.

### Exercise-Level Reordering
**Recommendation:** Do NOT add exercise-level reordering mid-workout. The web doesn't have it, the CONTEXT.md lists this as discretion but not requested, and it adds complexity (drag-to-reorder in a scrollable list is non-trivial). Keep exercise order as-added. Can always be added later if users request it.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `expo-av` Audio.Sound | `expo-audio` useAudioPlayer | SDK 54 (2025) | expo-av deprecated, will be removed SDK 55. Use expo-audio. |
| `@use-gesture/react` (web) | `react-native-gesture-handler` Gesture.Pan | N/A (platform-specific) | Must rebuild swipe gesture from scratch for RN |
| `localStorage` (sync) | `AsyncStorage` (async) | N/A (platform-specific) | All backup/restore operations become async; need await |
| Web Notification API | `expo-notifications` | N/A (platform-specific) | Scheduled notifications instead of in-browser alerts |
| CSS `max-height` transition | `LayoutAnimation` or Reanimated | N/A (platform-specific) | Accordion expand/collapse needs different approach in RN |

**Deprecated/outdated:**
- `expo-av`: Deprecated in SDK 54. Use `expo-audio` for sound playback.
- `Notifications` web API: Not available in React Native. Use `expo-notifications`.

## Open Questions

1. **Alert sound asset source**
   - What we know: Need a short (~0.5s) alert chime as MP3
   - What's unclear: Where to source it (create, download CC0, etc.)
   - Recommendation: Include a placeholder or simple beep; can be refined during implementation

2. **Notification permission timing**
   - What we know: Constitution says "on first app launch"
   - What's unclear: Whether Phase 5 should add the permission request or if it belongs in an earlier phase setup
   - Recommendation: Phase 5 should add `requestPermissionsAsync()` call in app startup (e.g., `_layout.tsx` or a startup hook) since this is the first phase that needs it

3. **Idempotency key enforcement server-side**
   - What we know: The logging service should check for duplicate idempotency keys
   - What's unclear: Whether to add a database column for idempotency key or use client-side dedup only
   - Recommendation: Add `idempotency_key` column to `workout_logs` table with UNIQUE constraint. This is the most robust approach. Alternatively, check client-side queue before submitting.

4. **Template update during offline workout**
   - What we know: Template update prompt fires on finish if structural changes detected
   - What's unclear: If offline, should the template update be queued too, or skipped?
   - Recommendation: Queue the template update in the write queue alongside the workout log. Both sync together when online.

## Sources

### Primary (HIGH confidence)
- Web app source code at `Apps/exercise_tracker_app/` - WorkoutSurface.tsx, useTimerState.ts, useWorkoutBackup.ts, logging.ts, SetRow.tsx, RestTimerBar.tsx, WorkoutExerciseCard.tsx (complete reference implementations)
- Existing iOS codebase at `Apps/ironlift/` - _layout.tsx, SetRow.tsx, RestTimerInline.tsx, ExercisePickerModal.tsx, cache.ts, database types (verified existing patterns)
- [Expo Notifications docs](https://docs.expo.dev/versions/latest/sdk/notifications/) - scheduleNotificationAsync, cancelScheduledNotificationAsync, TimeInterval trigger
- [Expo Haptics docs](https://docs.expo.dev/versions/latest/sdk/haptics/) - ImpactFeedbackStyle.Medium
- [Expo Audio docs](https://docs.expo.dev/versions/latest/sdk/audio/) - useAudioPlayer hook, expo-av deprecation
- [react-native-svg docs](https://docs.expo.dev/versions/latest/sdk/svg/) - Included in Expo Go
- [@react-native-community/netinfo docs](https://docs.expo.dev/versions/latest/sdk/netinfo/) - Included in Expo Go

### Secondary (MEDIUM confidence)
- [Swipe-to-delete patterns](https://medium.com/@ofir.zukerman/swipe-to-delete-react-native-with-reanimated-3-b593f29366ce) - Community implementation patterns verified against gesture-handler docs
- [React Native AppState](https://reactnative.dev/docs/appstate) - Foreground/background detection for write queue sync

### Tertiary (LOW confidence)
- Alert sound sourcing -- no specific verified source identified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified against Expo docs for Expo Go compatibility
- Architecture: HIGH - Direct port from web app with verified patterns, existing codebase examined
- Pitfalls: HIGH - Based on known platform differences (sync vs async storage, iOS background suspension, gesture conflicts)
- Write queue: MEDIUM - Pattern is standard but server-side idempotency enforcement needs implementation decision
- Alert sound: LOW - No specific asset identified; needs sourcing during implementation

**Research date:** 2026-02-13
**Valid until:** 2026-03-13 (stable domain, libraries well-established)
