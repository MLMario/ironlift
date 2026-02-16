---
status: diagnosed
trigger: "Investigate why the kebab menu dropdown on chart cards appears at the top of the dashboard instead of next to the three-dot icon."
created: 2026-02-15T00:00:00Z
updated: 2026-02-15T00:00:00Z
---

## Root Cause

**The `KebabMenu` component uses hardcoded absolute positioning (`top: 80`) for the dropdown menu within a full-screen Modal, rather than measuring the trigger button's position.**

**Affected file:** `src/components/KebabMenu.tsx`
**Affected lines:** 94-99 (dropdownAnchor style)

## Evidence

### KebabMenu.tsx Lines 94-99
```typescript
dropdownAnchor: {
  position: 'absolute',
  top: 80,  // HARDCODED — ignores trigger button position
  right: theme.spacing.lg,
  alignItems: 'flex-end',
},
```

The dropdown is positioned absolutely at `top: 80` pixels from the top of the Modal (which renders full-screen). This fixed value:
- Works only if the kebab menu trigger happens to be at `y=80` on the screen
- Ignores the actual position of the three-dot icon that was tapped
- Results in the menu appearing at the top when the ChartCard (and its kebab menu) is scrolled down the page

### How KebabMenu is Used (ChartCard.tsx Line 148)
```tsx
<KebabMenu onDelete={handleKebabDelete} />
```

The KebabMenu is rendered inline in the ChartCard header. Each ChartCard can appear anywhere in the dashboard's ScrollView, but the Modal always renders full-screen, and the dropdown always appears at `top: 80`.

## Why This Happens

React Native's `Modal` component renders into a separate layer that overlays the entire screen. The dropdown menu inside the Modal has no awareness of where the trigger button actually exists in the underlying screen layout.

The `position: 'absolute', top: 80` is a static guess that only works if:
1. The kebab menu trigger is near the top of the screen, OR
2. All ChartCards appear at exactly the same vertical position

When ChartCards are scrolled or appear lower in the list, the trigger button's screen position changes, but the dropdown's `top: 80` does not.

## Technical Mechanism

**Current flow:**
1. User taps kebab icon in a ChartCard (e.g., at screen `y=400`)
2. `setMenuVisible(true)` opens the Modal
3. Modal renders full-screen overlay
4. Dropdown menu renders inside Modal at `position: 'absolute', top: 80` (from top of Modal, not from trigger)
5. Dropdown appears at `y=80` on screen (top of dashboard), nowhere near the tapped icon at `y=400`

## Suggested Fix

**Option 1: Measure trigger button position (correct solution)**

Use `View.measure()` or `onLayout` to capture the trigger button's absolute screen coordinates when tapped, then position the dropdown relative to those measured coordinates.

```typescript
// Pseudocode approach:
const [triggerPosition, setTriggerPosition] = useState<{x: number, y: number} | null>(null);
const triggerRef = useRef<View>(null);

const handleOpenMenu = () => {
  triggerRef.current?.measure((x, y, width, height, pageX, pageY) => {
    setTriggerPosition({ x: pageX, y: pageY });
    setMenuVisible(true);
  });
};

// In dropdown style:
dropdownAnchor: {
  position: 'absolute',
  top: triggerPosition?.y ?? 0,
  right: screenWidth - (triggerPosition?.x ?? 0) - triggerWidth,
  // ...
}
```

**Option 2: Use a library (not aligned with project constraints)**

Use `@gorhom/bottom-sheet` or a dedicated menu/popover library. **Not recommended** — project mandates hand-rolled UI, and `@gorhom/bottom-sheet` is only approved for the settings menu.

**Option 3: Replace Modal with relative-positioned View (may not work across ScrollView boundaries)**

Render the dropdown as a sibling to the trigger button with `position: 'absolute'` relative to the parent container. **May not work** if the dropdown needs to render outside the ChartCard's clipping boundaries.

## Recommendation

**Implement Option 1** (measure trigger position). This aligns with the project's hand-rolled UI philosophy and solves the root cause: the dropdown doesn't know where the trigger button is.

**Implementation steps:**
1. Add `useRef` for the trigger Pressable
2. Replace `onPress={() => setMenuVisible(true)}` with a handler that measures the trigger's position
3. Store measured `{ x, y, width, height }` in state
4. Update `dropdownAnchor` style to use measured position instead of hardcoded `top: 80`
5. Handle edge cases: dropdown near screen edges (adjust left/right/top positioning to keep menu on-screen)

## Files Involved

- **Primary:** `src/components/KebabMenu.tsx` (lines 94-99: dropdownAnchor style; lines 34-47: trigger Pressable needs ref and measure logic)
- **Secondary (no changes needed):** `src/components/ChartCard.tsx` (usage is correct; KebabMenu is the problem)
