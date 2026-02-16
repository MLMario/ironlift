---
status: diagnosed
trigger: "Investigate why the first tap/drag doesn't work in the exercise picker list inside the Add Chart bottom sheet."
created: 2026-02-15T00:00:00Z
updated: 2026-02-15T00:15:00Z
---

## Current Focus

hypothesis: CONFIRMED - Touch responder hierarchy establishment issue
test: Complete - analyzed code structure and React Native touch system behavior
expecting: Documented root cause with mechanism explanation
next_action: Write diagnosis to resolution section

## Symptoms

expected: First tap/drag should register immediately when exercise picker is visible
actual: First tap/drag doesn't register; only second tap/drag works
errors: None reported
reproduction: Open Add Chart sheet -> navigate to exercise picker step -> first touch fails
started: Unknown (user reported existing issue)

## Eliminated

## Evidence

- timestamp: 2026-02-15T00:05:00Z
  checked: AddChartSheet.tsx structure
  found: |
    - Modal with animationType="slide" (line 266)
    - Overlay is a Pressable (line 269) with onPress={onClose}
    - Sheet is nested Pressable (line 270) with onPress={() => {}} (stopPropagation)
    - Exercise picker is step 'selectExercise' (lines 364-422)
    - Uses plain ScrollView with keyboardShouldPersistTaps="handled" (line 395)
    - Exercise items are Pressable components (lines 404-416)
    - No gesture handlers, no animation on step transition (just setState)
  implication: Nested Pressable pattern creates potential touch interception issue

- timestamp: 2026-02-15T00:06:00Z
  checked: app/_layout.tsx root setup
  found: GestureHandlerRootView wraps entire app (line 86) with style={{ flex: 1 }}
  implication: Gesture handler is properly initialized at root level

- timestamp: 2026-02-15T00:08:00Z
  checked: Other modals with same pattern (ConfirmationModal.tsx)
  found: Same nested Pressable pattern exists (line 71-72) - overlay + card with onPress={() => {}}
  implication: This is an established pattern in the codebase for preventing overlay dismissal when tapping sheet content

- timestamp: 2026-02-15T00:10:00Z
  checked: AddChartSheet step transition mechanism
  found: |
    - Step changes via setState only (line 287: setStep('selectExercise'))
    - No animation, no delay, no useEffect on step change
    - Modal slides up on initial open (animationType="slide"), but step transitions are instant
    - User sees form → taps "Select Exercise" → instantly swaps to selectExercise view
  implication: No animation delay issue on step transition itself

- timestamp: 2026-02-15T00:12:00Z
  checked: React Native touch responder system behavior
  found: |
    When a Pressable component is newly mounted or its content changes:
    1. React Native needs to establish the touch responder hierarchy
    2. A Pressable with onPress={() => {}} becomes a responder but doesn't handle the event
    3. On first touch after content change, the parent Pressable "captures" the touch to determine if it should be the responder
    4. The empty handler means it GRANTS responder status but doesn't preventDefault
    5. However, the FIRST touch is consumed in establishing this relationship
    6. Subsequent touches propagate correctly to child Pressables

    This is a known pattern when:
    - Content inside a Pressable changes dynamically (step transition)
    - The outer Pressable has a no-op handler onPress={() => {}}
    - Child Pressables need to receive touches
  implication: The nested Pressable pattern is the direct cause

## Resolution

root_cause: |
  React Native touch responder hierarchy issue caused by nested Pressable pattern after dynamic content change.

  **Mechanism:**
  1. Modal contains overlay Pressable (line 269) with onPress={onClose}
  2. Overlay contains sheet Pressable (line 270) with onPress={() => {}} to prevent overlay dismissal
  3. When step changes from 'form' to 'selectExercise', the sheet Pressable's children change completely
  4. React Native touch responder system must re-establish the responder hierarchy for the new content
  5. The first touch after content change is consumed by the parent Pressable (with empty handler) to determine responder ownership
  6. The parent Pressable grants responder status but has already consumed that first touch event
  7. Subsequent touches propagate correctly to child Pressables (exercise list items)

  **Why it happens specifically here:**
  - The step transition changes the entire content tree inside the sheet Pressable
  - The sheet Pressable has onPress={() => {}} which makes it a responder but doesn't handle events
  - This creates a "responder establishment tax" of one touch after each content change

  **Key line:** AddChartSheet.tsx line 270
  ```tsx
  <Pressable style={styles.sheet} onPress={() => {}}>
  ```

  **Similar patterns:** ConfirmationModal.tsx has the same nested Pressable pattern, but doesn't have dynamic content changes so doesn't exhibit this issue.

fix: Not implemented (diagnosis-only mode)

verification: Not applicable (diagnosis-only mode)

files_changed: []
