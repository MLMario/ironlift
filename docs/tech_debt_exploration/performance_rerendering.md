# Performance & Re-rendering Tech Debt Audit

## CRITICAL

### [CRITICAL] useRestTimer's isActiveForExercise dependency on full timer state
- **Location:** `src/hooks/useRestTimer.ts:302`
- **What:** The `isActiveForExercise` and `getProgress` callbacks include `[timer]` as a dependency, meaning they create new function references whenever ANY property of the timer object changes (status, exerciseIndex, duration, remaining). Even UI updates to the progress bar cause these callback references to change, triggering child re-renders.
- **Why it matters:** WorkoutExerciseCard receives both `isActiveForExercise` and `getProgress` as props. Every 1-second timer tick updates `timer.remaining`, causing these callbacks to recreate, propagating re-renders down to child components (RestTimerBar, ProgressRing, WorkoutSetRow).
- **Suggested fix:** Use `useCallback` dependencies more granularly: `isActiveForExercise` should depend only on `[timer.status, timer.exerciseIndex]` (the discriminating properties), and `getProgress` similarly.
- **Blast radius:** WorkoutExerciseCard, RestTimerBar, ProgressRing — all timer-related components on the active workout screen.

## HIGH

### [HIGH] useWorkoutState getRestTimeChanges and getWeightRepsChanges recreate on every render
- **Location:** `src/hooks/useWorkoutState.ts:392, 444`
- **What:** Both callbacks depend on `[originalTemplateSnapshot, activeWorkout.exercises]`. Since `activeWorkout.exercises` is a new array reference on every state update (even non-structural updates like weight/reps changes), these callbacks recreate frequently. The callbacks themselves are used in the finish flow and passed as props to child components.
- **Why it matters:** These callbacks are recreated often but only called during the finish flow. The constant re-creation adds cognitive load and potential re-render triggers if passed to memoized children (though currently they aren't).
- **Suggested fix:** Memoize the `exercises` dependency by comparing only the parts that matter: exercise count, set count per exercise, and exercise IDs. Create a helper that returns a shallow-frozen version of the relevant subset.
- **Blast radius:** Workout.tsx (saveWorkoutAndCleanup), potential future child components that might receive these functions as props.

### [HIGH] WorkoutExerciseCard re-renders on every timer tick due to timer prop cascade
- **Location:** `app/workout.tsx:624-649`
- **What:** `WorkoutExerciseCard` receives `timerRemaining`, `timerTotal`, `isTimerActive`, and `restSeconds` as props. The `timerRemaining` value updates every second from the timer hook. Since `WorkoutExerciseCard` is not memoized, the component and all its children (WorkoutSetRow, RestTimerBar, ProgressRing) re-render every second even when the exercise is not active.
- **Why it matters:** A 4-exercise workout with an active timer on exercise #1 causes exercises #2-4 to re-render every second despite no visible changes. With 10 sets per exercise, this multiplies the re-render count significantly.
- **Suggested fix:** Wrap `WorkoutExerciseCard` in `React.memo` with a custom comparator that compares: exercise structure (id, name, category, sets count), active timer status, and only re-render if timer is active for THIS exercise or the exercise structure changed.
- **Blast radius:** Entire active workout screen, most expensive component tree in the app.

### [HIGH] ExercisePickerModal filtering recreates objects on every keystroke
- **Location:** `src/components/ExercisePickerModal.tsx:79-94`
- **What:** The `filteredExercises` computed with `useMemo` depends on `[allExercises, selectedCategory, searchQuery]`. However, even with memoization, the filter operation creates new array references frequently. More critically, the `excludeSet` is memoized separately from the filter, but the combination of filteredExercises + renderItem callback means FlatList recomputes on every change.
- **Why it matters:** Every character typed in the search field recomputes the filtered array and re-renders the FlatList, even though the render logic uses callbacks (renderItem, keyExtractor). Without proper key extraction and item caching, list items re-render unnecessarily.
- **Suggested fix:** The `useMemo` is correct, but add `removeClippedSubviews={true}` and ensure `getItemLayout` is used (already in code at line 231). However, the `ListEmptyComponent` is recreated every render (line 160-167) — wrap it in `useMemo` keyed on theme reference only.
- **Blast radius:** Exercise picker modal interactions, especially during search on large exercise libraries.

### [HIGH] AddChartSheet RadioGroup recreates inline styles and components on every render
- **Location:** `src/components/AddChartSheet.tsx:69-137`
- **What:** The `RadioGroup` sub-component creates inline style objects for each radio option (lines 93-98, 100-122) on every render. The outer component also recreates grouped exercises map (lines 252-261) every time state changes, even if exercisesWithData hasn't changed.
- **Why it matters:** Every RadioGroup selection re-renders the component with new style objects, triggering potential re-renders of the radio buttons if they were memoized (they aren't). The groupedExercises computation is O(n) and done on every render instead of memoized.
- **Suggested fix:** Move inline styles outside the component or wrap in `useMemo`. Memoize the groupedExercises computation with `useMemo` keyed on `exercisesWithData`.
- **Blast radius:** Chart creation flow, noticeable lag when clicking metric/axis radio options.

### [HIGH] WorkoutScreen getTimerProps recreates timer props object every render
- **Location:** `app/workout.tsx:559-581`
- **What:** `getTimerProps(exerciseIndex)` is called inside the render loop for each exercise card (line 624), creating a new object reference every render even if timer state hasn't changed for that exercise.
- **Why it matters:** Though the function is small, it's called N times (N = exercise count) per render. The returned object is passed as individual props to WorkoutExerciseCard, but if the card were memoized (which it should be per Finding #3), this object recreation would still cause re-renders since object equality is by reference.
- **Suggested fix:** Memoize `getTimerProps` with `useCallback`, or inline the logic into the map callback. Better: compute and cache the timer props in a `useMemo` that depends on `[timer, activeWorkout.exercises]`.
- **Blast radius:** Workout screen performance during active timer.

### [HIGH] TemplateCard renderRightActions captures template in closure
- **Location:** `src/components/TemplateCard.tsx:45-77`
- **What:** The `renderRightActions` function captures `template` in its closure and is called on every swipe gesture update. While React.Reanimated handles this efficiently, the function is not wrapped in `useCallback`, so it's recreated on every component render.
- **Why it matters:** TemplateCard is used in a grid/list without memoization. If the parent re-renders for any reason, all TemplateCard instances recreate their renderRightActions function, even if the template data hasn't changed.
- **Suggested fix:** Wrap `renderRightActions` in `useCallback` with `[template, onEdit, onDelete]` dependencies. Then memoize `TemplateCard` itself with `React.memo`.
- **Blast radius:** Dashboard template grid scrolling performance with large template counts.

## MEDIUM

### [MEDIUM] RestTimerBar recreates callbacks on every timer tick
- **Location:** `src/components/RestTimerBar.tsx:85-139`
- **What:** The component has five callback handlers that don't use `useCallback`: `handleTimeTextPress`, `handleBlur`, `handleAdjustInEditMode`, `handleAdjustNormal`, `handleButtonPress`. These are recreated on every render (which happens on every timer tick via parent). They're not passed to memoized children, but the pattern is inefficient.
- **Why it matters:** Timer ticks every second, so 60 callback recreations per minute. While not causing direct re-renders (no memoized children), it's wasteful and reduces debuggability.
- **Suggested fix:** Wrap each callback in `useCallback` with appropriate dependencies. Dependencies are already available as local state or props.
- **Blast radius:** Memory usage, function allocation overhead during active workouts.

### [MEDIUM] ExercisePickerModal state reset on visibility change is brute force
- **Location:** `src/components/ExercisePickerModal.tsx:65-76`
- **What:** The entire component state (7 pieces of state) is reset in a useEffect whenever `visible` changes. This triggers 7 state updates sequentially, each causing a re-render (React batches but still multiple render passes for complex trees).
- **Why it matters:** Modal visibility toggle causes excessive batched re-renders, especially if the FlatList has many items.
- **Suggested fix:** Group the state reset into a single object or use `useReducer` for a single state update. Alternatively, move the state to local component scope rather than component body if the modal is destroyed on close.
- **Blast radius:** Modal open/close performance, noticeable on slower devices.

### [MEDIUM] AddChartSheet RecordMap groupedExercises computed without memoization
- **Location:** `src/components/AddChartSheet.tsx:252-261`
- **What:** The groupedExercises computation runs every render, converting the exercisesWithData array into a Map. While fast for small datasets, it's unnecessary work and creates new Map references on every render.
- **Why it matters:** When rendering the exercise select view (step === 'selectExercise'), the grouped output is iterated over (line 409-430). Without memoization, the Map is recreated every render even if exercisesWithData is unchanged.
- **Suggested fix:** Wrap in `useMemo` keyed on `exercisesWithData` only.
- **Blast radius:** Chart creation flow when selecting exercises, especially with large exercise lists.

### [MEDIUM] WorkoutSetRow weight input has local state without proper memoization
- **Location:** `src/components/WorkoutSetRow.tsx:102`
- **What:** `editingWeight` local state is managed to prevent the controlled input from destroying trailing decimals. However, the component receives `isRevealed` prop from parent and re-renders on every swipe coordinate change, even for non-revealed rows.
- **Why it matters:** When one set row is revealed (swiping), all other rows in that exercise card re-render. With 10-20 sets visible, this is 10-20 unnecessary re-renders per swipe.
- **Suggested fix:** Memoize `WorkoutSetRow` with `React.memo` comparing: `setNumber`, `weight`, `reps`, `isDone`, `isRevealed` (scalar checks). The callback props are stable from parent.
- **Blast radius:** Set row interactions, especially swipe gestures with multiple sets.

## LOW

### [LOW] useCharts comparison function could be more thorough
- **Location:** `src/hooks/useCharts.ts:17-28`
- **What:** The `chartsChanged` comparison skips the entire `exercises` object except for `exercises.name`. If the exercise reference changes but name stays the same, the comparison still returns false (no change), but if the nested object is different (e.g., category changes), it's undetected.
- **Why it matters:** While unlikely in practice (exercise data comes from Supabase directly), the comparison is fragile. A more robust deep equality or scalar-only comparison would be safer.
- **Suggested fix:** Either: (1) only compare scalars (id, order, metric_type, x_axis_mode), or (2) add deep equality check for the full exercises object. Option 1 is recommended per constitution (scalar comparisons only).
- **Blast radius:** Chart section re-renders when returning to dashboard, edge case with exercise metadata changes.

### [LOW] ProgressRing not memoized despite receiving stable props
- **Location:** `src/components/ProgressRing.tsx`
- **What:** ProgressRing is used in WorkoutExerciseCard header and receives `completed` and `total` props. If these are scalars (which they are), the component could be memoized to prevent re-renders on parent re-renders.
- **Why it matters:** Low impact (small component), but consistent with memoization strategy.
- **Suggested fix:** Wrap with `React.memo` with default shallow comparison (scalars don't need custom comparator).
- **Blast radius:** Minimal, small visual component.

### [LOW] Inline object creation in WorkoutSetRow styles
- **Location:** `src/components/WorkoutSetRow.tsx:211-214`
- **What:** The set number badge style object is created inline conditionally: `isDone && { backgroundColor: theme.colors.success }`. This is recreated on every render even if isDone hasn't changed.
- **Why it matters:** Low impact, but violates best practices. Reanimated styles are optimized for shared values, so this is a missed opportunity.
- **Suggested fix:** Extract to a computed style using conditional ternary or create a helper function.
- **Blast radius:** Minimal, per-set styling efficiency.

### [LOW] ExercisePickerModal category dropdown toggles state without memoization
- **Location:** `src/components/ExercisePickerModal.tsx:249-255, 281-290`
- **What:** The category dropdown toggle sets state without memoizing the callback. The dropdown modal is recreated from scratch every render.
- **Why it matters:** Dropdown open/close causes full component re-render, including the FlatList above.
- **Suggested fix:** Extract the dropdown to a sub-component and memoize it, or wrap the toggle callback in `useCallback`.
- **Blast radius:** Category selection UX in exercise picker, low visual impact.

---

## Summary

Total findings: 15 (1 Critical, 6 High, 4 Medium, 4 Low)

The **most impactful issues** are:
1. **WorkoutExerciseCard re-renders on every timer tick** — this is the single largest performance drain on the active workout screen
2. **useRestTimer callback dependencies** — underlying cause of many timer-related re-renders
3. **Exercise picker, chart sheet, timer props** — secondary impact but widespread
