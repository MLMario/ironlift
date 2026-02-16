---
status: diagnosed
trigger: "KebabMenu delete button flashes at top of dashboard on dismiss"
created: 2026-02-15T00:00:00Z
updated: 2026-02-15T00:00:00Z
---

## Current Focus

hypothesis: handleClose() nullifies triggerPos in the same call that begins the Modal fade-out, causing the dropdown to jump to the fallback position (top: 80) for the duration of the fade animation
test: trace the code path from handleClose through re-render during Modal fade-out
expecting: dropdown position falls through to hardcoded fallback of 80 while Modal is still visible
next_action: diagnosis complete, return findings

## Symptoms

expected: When pressing outside the KebabMenu to dismiss it, the menu should fade away in place (at its current position next to the kebab icon)
actual: The delete button briefly flashes at the top of the dashboard (near top: 80) before the Modal fade-out animation completes
errors: none (visual bug only)
reproduction: Open any chart card kebab menu, then tap outside the menu to dismiss. The "Delete" option visibly jumps to the top of the screen during the fade-out.
started: After the measure()-based positioning fix was applied (commit ce68113). The positioning when open is now correct, but dismiss behavior introduced this regression.

## Eliminated

(none -- single hypothesis confirmed on first investigation)

## Evidence

- timestamp: 2026-02-15T00:00:00Z
  checked: KebabMenu.tsx handleClose function (lines 36-39)
  found: handleClose calls both setMenuVisible(false) and setTriggerPos(null) synchronously in the same function body
  implication: React batches these two state updates into a single re-render. The component re-renders with menuVisible=false AND triggerPos=null simultaneously. However, the Modal with animationType="fade" does NOT unmount instantly -- it plays a fade-out animation over approximately 300ms.

- timestamp: 2026-02-15T00:00:00Z
  checked: KebabMenu.tsx dropdown positioning expression (line 74)
  found: "top: triggerPos ? triggerPos.y + triggerPos.height : 80" -- a ternary that falls back to 80 when triggerPos is null
  implication: When triggerPos is set to null by handleClose, the dropdown's top position immediately changes from the measured position (e.g., y=350) to the fallback value of 80. This positional jump happens on the re-render BEFORE the Modal's fade-out animation completes.

- timestamp: 2026-02-15T00:00:00Z
  checked: React Native Modal animationType="fade" behavior
  found: The Modal with animationType="fade" plays a fade-out animation when visible transitions from true to false. During this animation, the Modal's children are still rendered and visible (progressively becoming transparent). Any state changes to children during this fade-out period are visually reflected.
  implication: The dropdown is still visible during the ~300ms fade-out, and during that window, it renders at top: 80 instead of its measured position.

- timestamp: 2026-02-15T00:00:00Z
  checked: ConfirmationModal.tsx for comparison (same Modal pattern, no flash reported)
  found: ConfirmationModal uses justifyContent: 'center' and alignItems: 'center' on its overlay. It has no dynamic coordinate-based positioning and no position state to reset.
  implication: ConfirmationModal is immune to this class of bug because its layout is CSS-centered, not coordinate-driven. KebabMenu is the only component that combines Modal fade animation with dynamic absolute positioning from measured coordinates.

## Resolution

root_cause: |
  The `handleClose` function in KebabMenu.tsx (line 36-39) calls `setTriggerPos(null)` at the same time as `setMenuVisible(false)`. React batches these into a single re-render.

  The Modal's `animationType="fade"` means the Modal does not disappear instantly when `visible` becomes `false` -- it fades out over ~300ms. During that fade-out animation, the Modal's children are still rendered and visible.

  The dropdown position is computed as:
  ```
  top: triggerPos ? triggerPos.y + triggerPos.height : 80
  ```

  When `triggerPos` becomes `null` (due to `handleClose`), this expression evaluates to the fallback value `80`. So the dropdown instantly jumps from its correct measured position (e.g., `top: 350`) to `top: 80` (near the top of the screen) while the Modal is still visually fading out.

  The user sees: the delete button suddenly appears at the top of the screen for a brief moment before the fade-out completes and the Modal fully disappears.

fix: |
  (not applied -- diagnosis only)

  There are several viable approaches to fix this:

  **Option A (simplest): Do NOT null out triggerPos on close.**
  Remove `setTriggerPos(null)` from handleClose entirely. The position state is harmless when the Modal is not visible, and it will be re-measured fresh on the next open via handleOpenMenu's measure() call. This preserves the correct position throughout the fade-out animation.

  ```typescript
  const handleClose = () => {
    setMenuVisible(false);
    // Do NOT reset triggerPos here -- let it persist through fade-out
    // It will be re-measured on next handleOpenMenu call
  };
  ```

  **Option B: Use animationType="none" instead of "fade".**
  If the Modal disappears instantly, there is no window for the position jump to be visible. However, this removes the fade animation entirely, which may feel less polished.

  **Option C: Delay the triggerPos reset until after the fade completes.**
  Use a setTimeout to delay setTriggerPos(null) by the fade duration (~300ms). This is fragile (depends on knowing the exact animation duration) and not recommended.

  **Recommended: Option A.** It is the simplest, most robust fix. There is no reason to eagerly null out triggerPos -- the value is inert when the Modal is closed, and it gets freshly measured every time the menu opens.

verification: (not performed -- diagnosis only)
files_changed: []
