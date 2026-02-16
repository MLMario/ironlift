---
status: diagnosed
trigger: "Investigate why the Add Chart bottom sheet's CTA button is cut off / only half visible at the bottom."
created: 2026-02-15T00:00:00.000Z
updated: 2026-02-15T00:00:01.000Z
---

## Current Focus

hypothesis: The formContainer uses `flex: 1` with `gap: theme.spacing.md`, and the buttonRow uses `marginTop: 'auto'` to push to bottom, but the sheet height is fixed at 50% of screen height without accounting for safe area insets or proper padding, causing the bottom button row to be cut off by the sheet's padding or device notch area.
test: examining the layout structure and style properties
expecting: to find that the sheet height calculation or formContainer layout doesn't reserve proper space for the button row at the bottom
next_action: confirm root cause and document

## Symptoms

expected: The "Add Chart" CTA button should be fully visible at the bottom of the half-height bottom sheet
actual: The CTA button is cut off / only half visible at the bottom
errors: None (visual layout issue)
reproduction: Open the Add Chart bottom sheet from the dashboard
started: Unknown (likely since implementation)

## Eliminated

(None yet)

## Evidence

- timestamp: 2026-02-15T00:00:00.000Z
  checked: src/components/AddChartSheet.tsx lines 434-607 (styles)
  found: |
    Sheet container (line 444-450):
    - height: SHEET_HEIGHT (50% of window height)
    - padding: theme.spacing.lg applied to all sides

    formContainer (line 453-456):
    - flex: 1 (fills available space)
    - gap: theme.spacing.md (spacing between children)

    buttonRow (line 501-505):
    - marginTop: 'auto' (pushes to bottom of flex container)
    - flexDirection: 'row'
    - gap: theme.spacing.sm
  implication: The buttonRow is positioned at the bottom using marginTop: 'auto' within a flex: 1 container, but it's INSIDE the formContainer which itself is padded by the sheet's padding. The button row gets pushed to the absolute bottom of the flex container, which means it sits against the bottom padding of the sheet.

- timestamp: 2026-02-15T00:00:00.001Z
  checked: Sheet height calculation (line 49)
  found: SHEET_HEIGHT = Dimensions.get('window').height * 0.5
  implication: Uses 50% of window height without considering safe area insets (bottom notch/home indicator on modern iPhones). The sheet padding is applied to all sides equally, but the bottom content may be obscured by device UI elements.

- timestamp: 2026-02-15T00:00:00.002Z
  checked: Form layout structure (lines 275-359)
  found: |
    <View style={styles.formContainer}>  <!-- flex: 1, gap: md -->
      <Text>Title</Text>
      <View>Exercise Selector</View>
      <RadioGroup>Metric</RadioGroup>
      <RadioGroup>X-Axis</RadioGroup>
      {error && <Text>Error</Text>}
      <View style={styles.buttonRow}>  <!-- marginTop: auto -->
        <Pressable>Cancel</Pressable>
        <Pressable>Add Chart</Pressable>
      </View>
    </View>
  implication: The buttonRow is the last child in a flex column with gap spacing. With marginTop: 'auto', it gets pushed to the very bottom of the container, leaving no additional space below it except the sheet's bottom padding.

- timestamp: 2026-02-15T00:00:00.003Z
  checked: Theme spacing values (not in file, but standard practice)
  found: theme.spacing.lg is typically 16-24px for padding
  implication: If the bottom padding is 16-24px and device safe area insets add another 20-34px on iPhone models with home indicator, the button row could be positioned where it's partially obscured by the sheet's bottom edge or visually cut off.

- timestamp: 2026-02-15T00:00:00.004Z
  checked: Safe area handling in similar component (src/components/ExercisePickerModal.tsx)
  found: ExercisePickerModal uses <SafeAreaView> wrapper (line 176) to properly handle safe area insets
  implication: AddChartSheet does NOT use SafeAreaView, meaning it doesn't automatically adjust for device notches or home indicator areas. This is a critical difference between the two modal patterns.

## Resolution

root_cause: |
  **Missing SafeAreaView wrapper causing CTA button to be cut off by device safe area insets.**

  The AddChartSheet component does not wrap its content in a SafeAreaView (unlike ExercisePickerModal which does), causing the bottom button row to render into the device's unsafe area (home indicator zone on modern iPhones).

  Contributing factors:

  1. **No SafeAreaView wrapper** (line 270): The sheet content is wrapped in a plain <Pressable>, not <SafeAreaView>, so React Native doesn't automatically adjust for device notches/home indicator.

  2. **Fixed sheet height without safe area adjustment** (line 49): SHEET_HEIGHT = 50% of window.height, but this doesn't account for the ~34px bottom safe area inset on iPhone models with home indicators.

  3. **buttonRow pushed to absolute bottom** (lines 501-505): Using `marginTop: 'auto'` in a flex container pushes the button row to the very bottom of the available space, which on a device with a home indicator means the buttons render partially behind the unsafe area.

  4. **Pattern inconsistency**: ExercisePickerModal (a similar full-screen modal) correctly uses SafeAreaView wrapper (line 176), but AddChartSheet (half-height modal) does not.

  **Result**: On devices with bottom safe area insets (iPhone X and newer), the bottom ~20-34px of the button row is obscured by the home indicator area, making the "Add Chart" CTA appear cut off.

fix: |
  **Option 1: Add SafeAreaView wrapper (RECOMMENDED)**

  Wrap the sheet content in SafeAreaView to automatically handle safe area insets:

  ```tsx
  // Line 15: Add import
  import {
    Modal,
    View,
    Text,
    Pressable,
    ScrollView,
    ActivityIndicator,
    Dimensions,
    StyleSheet,
    SafeAreaView,  // <-- ADD
  } from 'react-native';

  // Line 270: Replace <Pressable style={styles.sheet}> with SafeAreaView wrapper
  <Pressable style={styles.overlay} onPress={onClose}>
    <SafeAreaView style={styles.sheetSafeArea}>
      <Pressable style={styles.sheet} onPress={() => {}}>
        {/* existing content */}
      </Pressable>
    </SafeAreaView>
  </Pressable>

  // Styles: Add sheetSafeArea style
  sheetSafeArea: {
    backgroundColor: theme.colors.bgSurface,
    borderTopLeftRadius: theme.radii.lg,
    borderTopRightRadius: theme.radii.lg,
  },

  // Update sheet style to remove background/radius (now on parent)
  sheet: {
    height: SHEET_HEIGHT,
    padding: theme.spacing.lg,
  },
  ```

  **Option 2: Add bottom padding using useSafeAreaInsets hook**

  Use the `useSafeAreaInsets` hook from `react-native-safe-area-context` to add explicit bottom padding:

  ```tsx
  // Import
  import { useSafeAreaInsets } from 'react-native-safe-area-context';

  // In component
  const insets = useSafeAreaInsets();

  // Update sheet style to include bottom inset
  <Pressable
    style={[styles.sheet, { paddingBottom: theme.spacing.lg + insets.bottom }]}
    onPress={() => {}}
  >
  ```

  **Recommendation**: Option 1 (SafeAreaView wrapper) is preferred because:
  - Matches the pattern used in ExercisePickerModal
  - Automatically handles all safe area insets (top, bottom, sides)
  - Simpler implementation
  - No additional dependencies (SafeAreaView is built into React Native)

verification: |
  Test on iPhone model with home indicator (iPhone X or newer):
  1. Open Add Chart bottom sheet
  2. Verify "Add Chart" button is fully visible above home indicator
  3. Verify button has proper padding/spacing from bottom edge
  4. Test on older iPhone models (8, SE) to ensure no regression
  5. Test rotation (if supported) to verify safe areas in landscape

files_changed:
  - src/components/AddChartSheet.tsx (lines 15-24 for import, lines 270-424 for wrapper, lines 444-450 for styles)
