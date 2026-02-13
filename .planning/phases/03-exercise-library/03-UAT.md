---
status: complete
phase: 03-exercise-library
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md]
started: 2026-02-13T20:00:00Z
updated: 2026-02-13T20:08:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Open Exercise Picker Modal
expected: Tap "Exercises" button on dashboard. Modal slides up from bottom as near-full sheet. Shows search bar, horizontal category chips (All, Chest, Back, Shoulders, Arms, Legs, Core, Olympic), and scrollable exercise list.
result: pass

### 2. Browse and Scroll Exercise List
expected: Exercise list shows many exercises (system library of ~1000). Each row displays the exercise name and its category. List scrolls smoothly. User-created exercises (if any) appear before system exercises.
result: pass

### 3. Search Exercises by Name
expected: Type a search term (e.g., "bench") in the search bar. List filters in real-time to show only exercises whose name matches the query. Clear search to restore full list.
result: pass

### 4. Filter by Category
expected: Tap a category chip (e.g., "Chest"). Only exercises in that category are shown. The selected chip is visually highlighted. Tap "All" to see all exercises again. No "Cardio" category exists.
result: pass

### 5. Create Custom Exercise
expected: Tap "Create New Exercise" area to reveal an inline form. Enter a name, select a category from a dropdown, and submit. The new exercise is created and appears in the list with a green "CUSTOM" badge.
result: pass

### 6. Duplicate Name Rejection
expected: Try creating another exercise with the same name as an existing one. An error message appears (something like "already exists"). The exercise is not created.
result: pass

### 7. Auto-Select on Create
expected: After successfully creating a custom exercise, the modal automatically closes and the dashboard shows the newly created exercise's name as the selected exercise.
result: pass

### 8. State Reset on Reopen
expected: Close the picker modal, then reopen it. The search bar is empty, category is reset to "All", the create form is hidden, and the full exercise list is shown.
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
