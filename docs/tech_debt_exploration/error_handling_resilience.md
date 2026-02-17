# Error Handling & Resilience Tech Debt Audit

## CRITICAL

### [CRITICAL] Write Queue Does Not Handle Server-Side Validation Failures
- **Location:** `src/services/writeQueue.ts:124-136`
- **What:** When `logging.createWorkoutLog()` fails, the entry is incremented and retried, but there's no distinction between transient errors (network) and permanent errors (validation failure). A malformed workout log will fail forever, consuming retry budget with exponential backoff, but the user is never notified.
- **Why it matters:** Offline-first is a core feature (Decision 3). Users expect failed workouts to either sync or show an error. Currently they silently retry 10 times and get stuck in the queue.
- **Suggested fix:**
  1. Add error type detection (check if error is auth/validation vs network)
  2. For validation errors, remove from queue immediately and log a warning
  3. Surface a persistent UI indicator on the dashboard: "1 workout failed to sync" with a retry/discard button
  4. Store failed entries separately in a "dead letter" queue for manual review
- **Blast radius:** Affects all offline workouts; requires new cache entry for failed items and dashboard UI for error display

### [CRITICAL] setCachedChartMetrics Swallows Race Conditions
- **Location:** `src/lib/cache.ts:186-198`
- **What:** `setCachedChartMetrics` reads the current map, merges, and writes back. If two concurrent calls happen (e.g., multiple charts refreshing), the second read may miss updates from the first write. No error is caught or logged beyond the generic catch.
- **Why it matters:** Chart data is cached for offline viewing. A race condition silently loses cached entries, and the user sees stale or missing chart data with no indication of the failure.
- **Suggested fix:**
  1. Use a per-key write pattern instead of read-modify-write
  2. Add a simple in-memory lock or debounce concurrent writes
  3. Log all cache write errors with context (which chart, which metric)
- **Blast radius:** All chart caching; requires restructuring the metrics cache format

### [CRITICAL] AsyncStorage Write Failures During Workout Are Silent
- **Location:** `src/hooks/useWorkoutBackup.ts:82-86` and `src/lib/cache.ts` (all set* functions)
- **What:** AsyncStorage writes are wrapped in try-catch and logged to console, but no error state is exposed to the UI. If the device storage is full or AsyncStorage fails, the user continues the workout with no backup being saved. On app crash, the workout is lost.
- **Why it matters:** Backup is the sole crash recovery mechanism. Silent failure means data loss.
- **Suggested fix:**
  1. Expose a `backupError` state from `useWorkoutBackup` to the caller
  2. Display a persistent warning on the workout screen if backup fails: "Backup failed. Your progress won't be recovered if the app crashes."
  3. Retry backup on the next meaningful action (set done, add exercise)
- **Blast radius:** Workout screen needs new error state and UI; `useWorkoutBackup` hook needs to expose error

### [CRITICAL] Session Refresh Failures Are Not Handled
- **Location:** `src/lib/supabase.ts:26-32`
- **What:** `supabase.auth.startAutoRefresh()` is called when the app comes to foreground, but if refresh fails (token expired, network down), the error is never caught or propagated. A mid-workout session expiry will cause the next Supabase query to fail with a silent error, and the user sees either a blank screen or stale data.
- **Why it matters:** Auth is a hard requirement for syncing. Session failures should redirect to login, not silently fail.
- **Suggested fix:**
  1. Monitor auth state changes with `onAuthStateChange()` subscription at app root
  2. On unauthorized error from any service, clear cached session and navigate to login
  3. Show a toast/banner: "Session expired. Please log in again."
- **Blast radius:** App-wide; affects all screens and services

## HIGH

### [HIGH] Supabase Query Errors Are Not Distinguished from Offline
- **Location:** `src/hooks/useExercises.ts:76-85`, `useCharts.ts:70-80`, `useTemplates.ts:68-78`
- **What:** All hooks use the same error message for any failure: "Failed to load exercises. Please check your connection." But the error could be auth, RLS violation, server error, or actually network. User gets incorrect guidance.
- **Why it matters:** User experience degrades when the actual error (e.g., "permission denied") is hidden. Users blame their connection instead of checking account status.
- **Suggested fix:**
  1. Parse error codes from Supabase and return typed errors (e.g., `{ type: 'unauthorized' | 'network' | 'server' }`)
  2. Customize error messages per error type
  3. Provide specific guidance per error type
- **Blast radius:** All data loading hooks; requires new error type system

### [HIGH] Write Queue Processing Errors Are Completely Silent
- **Location:** `src/services/writeQueue.ts:98-143`
- **What:** `processQueue()` is called on app foreground and network change, but any error in `processQueue()` itself (e.g., AsyncStorage read fails) is caught and logged to console only. The user never knows their queue failed to process.
- **Why it matters:** Offline workouts won't sync if the queue can't even be read. User thinks it's processing, but it silently stalled.
- **Suggested fix:**
  1. Return a status from `processQueue()`: `{ processed: number, failed: number, error?: Error }`
  2. Store last-processed timestamp and failure count in a separate AsyncStorage entry
  3. Display a dashboard badge: "Syncing..." or "Sync failed (2 items)"
- **Blast radius:** Requires new status tracking and dashboard UI updates

### [HIGH] Chart Data Computation Errors Not Surfaced
- **Location:** `src/hooks/useChartData.ts:110-117`
- **What:** If `logging.getExerciseMetrics()` returns an error mid-refresh (after cached data was shown), the error is silently ignored and stale cached data remains on screen with no indication.
- **Why it matters:** Charts are read-only in offline mode, but if fresh data fetch fails, the user sees outdated metrics with no indication the data is stale.
- **Suggested fix:**
  1. Add an `error` state to `useChartData` hook
  2. Display a subtle badge or icon on the chart: "Updated X minutes ago" or "Failed to refresh"
- **Blast radius:** All chart rendering; requires new state in hook and UI indicator

### [HIGH] Template Mutations Partially Fail Without Cleanup
- **Location:** `src/services/templates.ts:264-361` (createTemplate), `372-476` (updateTemplate)
- **What:** If template insertion succeeds but exercise insertion fails, the template is created but empty (exercises are not added). The error is returned, but the half-created template remains in Supabase. On retry, users get duplicate empty templates.
- **Why it matters:** Templates are the core of the workout flow. Half-created templates break the UI and confuse users.
- **Suggested fix:**
  1. Use Supabase transactions (or implement pessimistic rollback): create template, then create exercises, then mark as ready
  2. Return a more detailed error with the partial state
  3. On failure, offer a "Delete & Retry" action to the user
- **Blast radius:** Template editor screen; requires transaction semantics

### [HIGH] Cache Read Errors Leave UI in Loading State Forever
- **Location:** `src/hooks/useExercises.ts:63-72`, `useCharts.ts:57-67`, `useTemplates.ts:56-65`
- **What:** If `getCachedExercises()` throws an exception (corrupted JSON in AsyncStorage), the error is silently caught with a comment "continue to network". But if network also fails, the UI is left in `isLoading: true` with no error shown because `hasCachedData` is still false.
- **Why it matters:** User sees a spinner forever with no error message or recovery option.
- **Suggested fix:**
  1. Explicitly set an error state if cache read throws
  2. Add a "Clear Cache" button to error screens
  3. Log cache exceptions separately from network errors
- **Blast radius:** All cache-backed hooks

### [HIGH] Silent Save Failures (Weight/Reps) Are Not Tracked
- **Location:** `src/services/templates.ts:757-784` (updateTemplateExerciseSetValues)
- **What:** The function `updateTemplateExerciseSetValues()` silently ignores all errors during individual set updates. If 3 of 5 sets fail to update, the function completes "successfully" and the caller has no way to know some values weren't persisted.
- **Why it matters:** Users think their set data was saved to the template, but some values are missing on the next workout.
- **Suggested fix:**
  1. Return a result: `{ updated: number, failed: number }`
  2. If any fail, log a warning and store failures in a retry queue
  3. On next workout finish, retry failed updates
- **Blast radius:** Workout finish flow; requires return value change

## MEDIUM

### [MEDIUM] Auth Token Storage Errors Not Surfaced
- **Location:** `src/lib/supabase.ts:1-22`
- **What:** The `expo-sqlite/localStorage` adapter is configured as the token storage, but if it fails to persist tokens (e.g., corrupted SQLite database), the failure is internal to Supabase and not exposed. Users will be logged out on next app open with no explanation.
- **Why it matters:** Silent session loss breaks the entire auth flow.
- **Suggested fix:**
  1. Test token persistence on app startup: call `getCurrentUser()` and verify session is loaded
  2. If session is missing but user was previously logged in, show a login screen with message
- **Blast radius:** App root/layout; requires startup auth validation

### [MEDIUM] Notification Scheduling Errors Are Silently Ignored
- **Location:** `src/hooks/useRestTimer.ts:163-179` and `273-288`
- **What:** Notification scheduling can fail if the user denies permission, but the error is caught and ignored. Timer still runs in foreground with haptics, but the user is not informed permission was denied.
- **Why it matters:** Notifications are a key feature for backgrounded timer completion. Silent failures mean users miss set alerts.
- **Suggested fix:**
  1. Add a permission state to the hook: `permissionStatus: 'granted' | 'denied' | 'unknown'`
  2. Show a warning on the timer: "Notifications disabled. You won't be alerted if the app is closed."
  3. Offer a "Request Permission" button that navigates to settings
- **Blast radius:** Rest timer UI; requires new permission tracking

### [MEDIUM] Rollback Operations Don't Verify Success
- **Location:** `src/services/templates.ts:311-314`, `346`, `584`, `641-644`
- **What:** When a nested insert fails (exercises fail), the code attempts rollback by deleting the parent. But this delete is not awaited or error-checked. If the delete fails silently, the orphaned template remains.
- **Why it matters:** Orphaned templates accumulate and clutter the database/UI.
- **Suggested fix:**
  1. Await all delete operations and check errors
  2. If rollback fails, return a detailed error: `{ rollbackFailed: true, templateId: id }`
  3. Add a cleanup job to find and delete orphaned templates
- **Blast radius:** Template editor; requires cleanup logic

### [MEDIUM] useChartData Doesn't Handle Cancelled Cleanup
- **Location:** `src/hooks/useChartData.ts:132`
- **What:** The hook uses a `cancelled` flag to avoid state updates after unmount, but `setCachedChartMetrics()` is called after the cancellation check. If the cache write takes time and the component remounts, the cache is stale.
- **Why it matters:** Rapid navigation between charts can leave the cache inconsistent.
- **Suggested fix:** Move `setCachedChartMetrics()` inside the cancellation check.
- **Blast radius:** Low; minor fix

### [MEDIUM] No Error Recovery for AsyncStorage Corruption
- **Location:** `src/lib/cache.ts` (all functions)
- **What:** If AsyncStorage returns corrupted data (JSON.parse fails), the functions return null silently. Over time, if AsyncStorage is corrupted, all caches are lost and the app goes into full network mode. No mechanism to clean up corrupted data.
- **Why it matters:** Offline functionality is disabled silently.
- **Suggested fix:**
  1. Detect JSON parse errors and attempt to delete the corrupted key
  2. Log corruption events separately
  3. Consider a "Cache Health" debug screen in settings
- **Blast radius:** Cache system; can be isolated to cache layer

## LOW

### [LOW] Console Errors Not Consistent in Format
- **Location:** Throughout all services and hooks
- **What:** Error logging uses various formats: `console.error()`, `console.warn()`, `console.log()`. Some include context (file/function), some don't. Makes debugging production issues difficult.
- **Why it matters:** No centralized error tracking; logs are hard to parse for patterns.
- **Suggested fix:**
  1. Create a logger utility: `logger.error(context, message, details)`
  2. Use consistent format: `[service:function] message (code: XYZ)`
- **Blast radius:** Debugging; low urgency but high value

### [LOW] Service Functions Don't Include Request Context
- **Location:** All services
- **What:** When a service call fails, there's no request ID or timestamp to correlate logs. Multiple concurrent requests become hard to track.
- **Why it matters:** Debugging concurrency issues or race conditions is harder.
- **Suggested fix:** Add optional context parameter to service calls (request ID, user action).
- **Blast radius:** Low; optional enhancement

### [LOW] No Error Rate Monitoring
- **Location:** No centralized monitoring
- **What:** Write queue retry counts are never exposed. If 10% of workouts fail, there's no dashboard metric or alert.
- **Why it matters:** Silent widespread failures could go unnoticed.
- **Suggested fix:** Add a monitoring hook that tracks error rates per service. Display a debug panel in settings.
- **Blast radius:** Optional; requires new monitoring infrastructure

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 4 |
| HIGH | 6 |
| MEDIUM | 5 |
| LOW | 3 |
| **Total** | **18** |

**Main patterns identified:**
1. Silent errors — Exceptions caught but not surfaced to UI
2. No distinction between error types — Network vs auth vs validation treated the same
3. No error states in hooks — `isLoading` and `data` exist, but no `error` state in some
4. Incomplete rollback — Partial failures leave orphaned data
5. Race conditions in cache — Concurrent writes can lose updates

**Highest-impact fixes:**
- Add `error` state to all data-loading hooks
- Implement proper write queue failure handling with user notification
- Add session expiry detection with login redirection
- Validate backup writes during workouts
