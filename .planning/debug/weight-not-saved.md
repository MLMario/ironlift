---
status: investigating
trigger: "weight changes in template editor NOT saved when user saves template"
created: 2026-02-13T00:00:00Z
updated: 2026-02-13T00:00:00Z
---

## Current Focus

hypothesis: Weight TextInput uses a local editingWeight buffer that only calls onWeightChange on blur. If user taps Save while weight field is still focused, onBlur may not fire before handleSave reads state, so parent never receives the new weight value.
test: Trace the data flow from SetRow weight input -> ExerciseEditorCard -> template-editor save
expecting: Confirm that handleWeightChange in SetRow only fires on blur, not on text change
next_action: Analyze the code paths in all three files

## Symptoms

expected: Changing weight in template editor and saving should persist the new weight value
actual: All other changes (add/delete set, reps, add/delete exercise, timer) save correctly, but weight changes are lost
errors: No errors reported — save appears to succeed, weight just reverts
reproduction: Edit a template, change a weight value, tap Save — weight reverts to old value
started: After recent fix adding local editingWeight text buffer to SetRow.tsx

## Eliminated

## Evidence

- timestamp: 2026-02-13T00:01:00Z
  checked: SetRow.tsx weight handling
  found: |
    Weight uses a local `editingWeight` state buffer (useState<string | null>).
    - onFocus: sets editingWeight to formatted weight string
    - onChangeText: ONLY updates local editingWeight string — does NOT call onWeightChange
    - onBlur: parses editingWeight, calls onWeightChange(number), clears editingWeight
    This means the parent ONLY receives weight updates when the field is blurred.
  implication: If user types a weight and taps Save without blurring, parent state still has old weight.

- timestamp: 2026-02-13T00:01:30Z
  checked: ExerciseEditorCard.tsx handleWeightChange
  found: |
    handleWeightChange(setIndex, value) correctly updates the exercise sets and calls onUpdate.
    handleRepsChange works identically but reps DON'T have the local buffer pattern —
    reps call onRepsChange directly in onChangeText (line 73-76 of SetRow).
  implication: Reps work because they propagate on every keystroke. Weight does not.

- timestamp: 2026-02-13T00:02:00Z
  checked: template-editor.tsx handleSave
  found: |
    handleSave reads editingTemplate.exercises state at call time.
    If onWeightChange was never called (because blur never fired), editingTemplate still has old weight.
    The save function itself correctly maps set.weight — the data is just stale.
  implication: Confirms root cause is in SetRow, not in save pipeline.

- timestamp: 2026-02-13T00:02:30Z
  checked: ScrollView keyboardShouldPersistTaps setting
  found: |
    ScrollView has keyboardShouldPersistTaps="handled" (line 361).
    This means tapping on the Save button (a Pressable) will fire the press handler
    WITHOUT first dismissing the keyboard / blurring the focused TextInput.
    With "always", blur also doesn't fire. With "handled", the button's press fires
    but blur does NOT automatically fire on the focused input.
  implication: This is the mechanism. keyboardShouldPersistTaps="handled" prevents blur from firing when Save is tapped.

## Resolution

root_cause: |
  SetRow.tsx weight TextInput uses a local `editingWeight` buffer that only calls
  `onWeightChange` on blur. Combined with `keyboardShouldPersistTaps="handled"` on
  the ScrollView, tapping Save does NOT blur the weight field, so the parent state
  never receives the updated weight value. The save function then persists the stale
  (old) weight. Reps work because they call `onRepsChange` directly on every keystroke
  in `onChangeText` — no blur dependency.
fix:
verification:
files_changed: []
