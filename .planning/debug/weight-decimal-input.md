---
status: diagnosed
trigger: "doesnt pass, field doesn allow for .5 decimal"
created: 2026-02-13
updated: 2026-02-13
---

## Current Focus

hypothesis: The controlled input loop (value -> formatWeight -> display) immediately converts the user's intermediate typing state. When user types "72.", parseFloat("72.") returns 72, formatWeight(72) returns "72", and the trailing decimal point is erased before the user can type the "5".
test: Trace the exact sequence: user types "72." -> handleWeightChange("72.") -> parseFloat("72.") = 72 -> onWeightChange(72) -> parent updates weight to 72 -> re-render -> value={formatWeight(72)} = "72" -> decimal point gone
expecting: This is a classic controlled numeric input problem where intermediate states like "72." or "72.0" get destroyed by the number->string->number round trip
next_action: Confirm by checking if there's any text state buffer or if the TextInput value is purely derived from the numeric prop

## Symptoms

expected: User can type "72.5" in the weight field using the decimal keyboard
actual: Field does not allow decimal values -- likely the decimal point disappears as soon as typed
errors: None reported (no crash, just UX failure)
reproduction: Open template editor, tap weight field, type a decimal value like "72.5"
started: Since the keyboardType fix was applied in 04-06 (the keyboard now shows decimal key, but typing decimal doesn't stick)

## Eliminated

## Evidence

- timestamp: 2026-02-13
  checked: SetRow.tsx keyboardType
  found: keyboardType="decimal-pad" is correctly set on line 73
  implication: The keyboard shows a decimal key -- this part of the fix is correct

- timestamp: 2026-02-13
  checked: SetRow.tsx data flow architecture
  found: TextInput is a fully controlled component. value={formatWeight(weight)} where weight is a number prop. handleWeightChange parses text to float, rounds, and calls onWeightChange(number). Parent stores as number and passes back.
  implication: The number->string->number round trip destroys intermediate typing states

- timestamp: 2026-02-13
  checked: JavaScript parseFloat behavior with trailing decimals
  found: parseFloat("72.") returns 72, parseFloat("72.0") returns 72, String(72) returns "72", String(72.0) returns "72"
  implication: Both "72." and "72.0" intermediate states are destroyed by the number round-trip, making it impossible to type any decimal value

- timestamp: 2026-02-13
  checked: RestTimerInline.tsx (sibling component) for comparison pattern
  found: RestTimerInline uses a local editingText string state (useState<string | null>(null)) that buffers user input during editing. On focus, it sets editingText to the formatted value. During editing, onChangeText goes to setEditingText (local string state, no parsing). On blur, it parses to number and calls parent callback. This is the correct pattern.
  implication: The same codebase already has the correct pattern implemented -- SetRow just needs to adopt it

- timestamp: 2026-02-13
  checked: ExerciseEditorCard.tsx parent data flow
  found: handleWeightChange(setIndex, value: number) receives a number and stores it in EditingSet.weight (typed as number). No additional rounding or parseInt in the parent chain.
  implication: The problem is entirely in SetRow.tsx -- the parent chain correctly handles decimal numbers once they arrive as numbers

## Resolution

root_cause: Classic controlled numeric input problem. SetRow.tsx uses a fully controlled TextInput where the value is derived from a numeric prop (value={formatWeight(weight)}). Every keystroke triggers: text -> parseFloat -> number -> parent state -> re-render -> formatWeight(number) -> string displayed. When user types "72.", parseFloat("72.") returns 72, which formats back to "72" -- the trailing decimal point is destroyed before the user can type the next digit. Same for "72.0" which would also collapse to "72". The fix applied in 04-06 correctly changed keyboardType to "decimal-pad" (showing the decimal key on iOS), but did not address the controlled input loop that prevents intermediate decimal states.
fix:
verification:
files_changed: []
