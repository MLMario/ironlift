---
status: diagnosed
trigger: "Add Chart sheet CTA buttons still half-visible after round 1 fix"
created: 2026-02-15T00:00:00.000Z
updated: 2026-02-15T00:00:00.000Z
---

## Current Focus

hypothesis: CONFIRMED - The form content total height (~434pt) exceeds the available interior height (~344pt) of the 50%-height sheet, causing the button row to overflow and be clipped regardless of safe area padding.
test: Manual arithmetic of all child element heights + gaps vs available sheet interior
expecting: Content overflow explains the persistent CTA cutoff
next_action: Document root cause; no code changes (diagnose-only)

## Symptoms

expected: The "Add Chart" and "Cancel" CTA buttons should be fully visible at the bottom of the Add Chart bottom sheet
actual: The CTA buttons are half-visible / cut off at the bottom, even after the round 1 fix that added useSafeAreaInsets-based bottom padding
errors: None (visual layout issue)
reproduction: Open the Add Chart bottom sheet from the Charts dashboard
started: Since implementation; persisted through round 1 fix attempt

## Eliminated

- hypothesis: Missing safe area insets on bottom padding (round 1 diagnosis)
  evidence: |
    The round 1 fix was already applied. Current code (line 25, 164, 273) shows:
    - `useSafeAreaInsets` imported from react-native-safe-area-context
    - `const insets = useSafeAreaInsets()` called in component
    - `paddingBottom: theme.spacing.lg + insets.bottom` applied to sheet style
    Yet the buttons are still cut off. The safe area fix was necessary but insufficient.
  timestamp: 2026-02-15

## Evidence

- timestamp: 2026-02-15T00:01:00.000Z
  checked: Current code vs round 1 diagnosis recommended fix
  found: |
    The round 1 fix (Option 2: useSafeAreaInsets) is ALREADY APPLIED in the current code:
    - Line 25: `import { useSafeAreaInsets } from 'react-native-safe-area-context';`
    - Line 164: `const insets = useSafeAreaInsets();`
    - Line 273: `style={[styles.sheet, { paddingBottom: theme.spacing.lg + insets.bottom }]}`
    The fix was applied but did not resolve the issue.
  implication: The safe area insets were necessary but not the primary cause. The real issue is something else entirely.

- timestamp: 2026-02-15T00:02:00.000Z
  checked: Theme spacing values from src/theme/tokens.ts
  found: |
    spacing.xs = 4pt
    spacing.sm = 8pt
    spacing.md = 16pt
    spacing.lg = 24pt
    spacing.xl = 32pt
    typography.sizes.sm = 14pt
    typography.sizes.base = 16pt
    typography.sizes.lg = 18pt
    layout.minTapTarget = 44pt
  implication: These are the concrete pixel values used in all height calculations below.

- timestamp: 2026-02-15T00:03:00.000Z
  checked: Sheet height and available interior space calculation
  found: |
    SHEET_HEIGHT = Dimensions.get('window').height * 0.5

    For a typical modern iPhone (e.g., iPhone 15 Pro, 852pt logical height):
    - SHEET_HEIGHT = 852 * 0.5 = 426pt
    - paddingTop = theme.spacing.lg = 24pt
    - paddingBottom = theme.spacing.lg + insets.bottom = 24 + 34 = 58pt
    - paddingLeft/Right = 24pt (not relevant to vertical)

    Available interior height for formContainer (flex: 1):
    426 - 24 (top padding) - 58 (bottom padding) = 344pt

    For iPhone SE (3rd gen, 667pt logical height):
    - SHEET_HEIGHT = 667 * 0.5 = 333.5pt
    - paddingBottom = 24 + 0 = 24pt (no home indicator)
    - Available: 333.5 - 24 - 24 = 285.5pt (EVEN WORSE)
  implication: The available interior space varies from ~285pt (SE) to ~344pt (modern iPhone), depending on device.

- timestamp: 2026-02-15T00:04:00.000Z
  checked: Total content height inside formContainer
  found: |
    formContainer children (in order):
    1. Title <Text> "Add Chart" - fontSize 18pt, ~27pt rendered height
    2. fieldGroup <View> (Exercise Selector):
       - Label <Text>: fontSize 14, ~17pt
       - Gap (fieldGroup.gap = xs = 4pt)
       - Selector <Pressable>: minHeight 44pt, borderWidth 1 = ~46pt
       - Subtotal: ~67pt
    3. RadioGroup "Metric" (2 options):
       - Outer View gap: xs = 4pt (between all children)
       - Label <Text>: fontSize 14pt, ~17pt + marginBottom 4pt = effective ~21pt
       - Gap 4pt
       - Option 1 <Pressable>: minHeight 44pt
       - Gap 4pt
       - Option 2 <Pressable>: minHeight 44pt
       - Subtotal: ~117pt
    4. RadioGroup "X-Axis" (2 options):
       - Same structure as above
       - Subtotal: ~117pt
    5. buttonRow <View>:
       - minHeight 44pt, flexDirection row
       - Subtotal: 44pt

    formContainer gap (md = 16pt) between children:
    - 4 gaps between 5 children = 64pt

    TOTAL CONTENT HEIGHT = 27 + 67 + 117 + 117 + 44 + 64 = ~436pt
  implication: |
    Content height (~436pt) exceeds available space (~344pt on modern iPhone, ~285pt on SE) by 92pt to 151pt. The button row at the bottom is guaranteed to overflow.

- timestamp: 2026-02-15T00:05:00.000Z
  checked: formContainer layout behavior with overflow
  found: |
    formContainer (line 458-461):
    - flex: 1 (constrains to available height from parent)
    - gap: theme.spacing.md (16pt between children)

    This is a plain <View> with NO ScrollView wrapping.

    When content exceeds the flex: 1 container bounds:
    - React Native clips overflow by default (overflow: 'hidden' is implicit in many contexts)
    - The buttonRow with marginTop: 'auto' cannot push below the other content because
      there is no remaining space; 'auto' resolves to 0 when content already overflows
    - The last children (including buttonRow) simply render outside the visible area
      and get clipped by the parent sheet's bounds
  implication: |
    The buttons are not just "slightly" cut off due to safe area -- they are significantly
    outside the visible container. The ~90pt overflow means roughly the bottom half of
    the button row (44pt) plus ~46pt of other content is clipped.

- timestamp: 2026-02-15T00:06:00.000Z
  checked: Why the round 1 fix made it WORSE
  found: |
    The round 1 fix added insets.bottom (~34pt) to the paddingBottom:
    Before fix: paddingBottom = 24pt -> available = 426 - 24 - 24 = 378pt
    After fix:  paddingBottom = 58pt -> available = 426 - 24 - 58 = 344pt

    The fix REDUCED the available interior space by 34pt, making the overflow worse.
    Before the fix, content was already overflowing, but by ~58pt.
    After the fix, content overflows by ~92pt.

    The safe area padding was the correct thing to add for proper bottom insets,
    but it exacerbated the real problem: the sheet is too short for its content.
  implication: |
    The round 1 diagnosis was partially correct (safe area was missing) but missed
    the fundamental issue. Adding bottom padding without increasing the sheet height
    or making content scrollable just compressed the available space further.

## Resolution

root_cause: |
  **The sheet's fixed 50% height is too small for its content. The form content
  (~436pt) exceeds the available interior height (~344pt on modern iPhones, ~285pt
  on iPhone SE) by 92-151pt, causing the button row to overflow and be clipped.**

  The layout chain:
  1. `SHEET_HEIGHT = Dimensions.get('window').height * 0.5` (line 50) = ~426pt
  2. Padding consumes 82pt (24 top + 58 bottom with safe area)
  3. Available interior: ~344pt
  4. `formContainer` (flex: 1) is constrained to ~344pt
  5. Content inside formContainer totals ~436pt (title + exercise selector + 2 RadioGroups with 2 options each at 44pt min-height + 4 gaps at 16pt + button row at 44pt)
  6. Button row (last child) overflows the container and is clipped

  The round 1 fix (adding `insets.bottom` to paddingBottom) was directionally correct
  for safe area handling but actually made the overflow WORSE by reducing available
  interior space by ~34pt without addressing the fundamental height shortage.

  **Why this was missed in round 1:** The diagnosis focused on the safe area inset as
  the cause and did not calculate whether the content actually fits within the sheet
  even with correct insets. The total content height was never measured against
  available space.

fix: (not applied -- diagnose only)
verification: (not applied -- diagnose only)
files_changed: []

## Suggested Fix Directions

### Direction A: Increase sheet height (simplest)
Change `SHEET_HEIGHT` from 50% to 65-70% of window height. This gives ~550-600pt
of sheet height, which after padding leaves ~470-520pt -- enough for the ~436pt content
with some breathing room.

```tsx
const SHEET_HEIGHT = Dimensions.get('window').height * 0.65;
```

Risk: May look odd on smaller screens or feel like a full-screen modal rather than
a bottom sheet.

### Direction B: Make form content scrollable (most robust)
Wrap the form content (everything except the button row) in a ScrollView, and keep
the button row pinned at the bottom outside the scroll area. This handles any
content height regardless of device size.

```tsx
<View style={styles.formContainer}>
  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: theme.spacing.md }}>
    <Text style={styles.title}>Add Chart</Text>
    <View style={styles.fieldGroup}>...</View>
    <RadioGroup ... />
    <RadioGroup ... />
    {error && <Text>...</Text>}
  </ScrollView>
  <View style={styles.buttonRow}>
    ...buttons...
  </View>
</View>
```

Risk: Slightly more complex; need to ensure gap/spacing is correct between
ScrollView and buttonRow.

### Direction C: Reduce content height (least change, limited)
Reduce RadioGroup option heights (e.g., use compact radio buttons) or reduce gap
sizes to fit within current sheet height. This is fragile since it barely fits.

### Recommendation
Direction B (scrollable form content) is the most robust. It works on all device
sizes, handles the optional error message adding height, and follows the same
pattern as the exercise select view (which already uses ScrollView).
Alternatively, a combination of A + B (slightly taller sheet + scrollable content)
provides the best UX.
