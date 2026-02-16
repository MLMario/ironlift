---
status: diagnosed
trigger: "Dashboard doesn't show new template after save, but shows it after delete refresh"
created: 2026-02-13
updated: 2026-02-13
---

## ROOT CAUSE FOUND

**Root Cause:** Dashboard does not listen to focus events to refresh template data when the template editor modal closes. The `useTemplates()` hook loads templates once on mount and caches them. When the modal saves a new template and closes via `router.back()`, the dashboard stays mounted (it's the underlying screen), so `useEffect` in the hook never re-runs. The new template exists in Supabase but the dashboard's cache is stale.

The delete action works because it explicitly calls `refresh()` (line 54 of `app/index.tsx`), which manually refetches from Supabase and updates the cache. Save does not trigger this refresh.

## Evidence Summary

1. **Template Editor Save Flow** (`app/template-editor.tsx` lines 233-280)
   - After successful `createTemplate()` or `updateTemplate()`, immediately calls `router.back()` to close the modal
   - No call to refresh the dashboard's template cache
   - Modal presents as a modal (configured in `_layout.tsx` line 44), so dashboard stays in the stack

2. **Dashboard Load Logic** (`app/index.tsx` lines 29-33)
   - Uses `useTemplates()` hook to load templates
   - Has a `refresh()` function available (line 33)
   - `refresh()` is only called on delete (line 54) — NOT on modal close/return

3. **useTemplates Hook** (`src/hooks/useTemplates.ts` lines 76-78)
   - Calls `loadTemplates()` once in `useEffect([], [loadTemplates])` on mount
   - Hook doesn't know when navigation returns or modal closes
   - No integration with Expo Router's focus event (e.g., `useFocusEffect`)

4. **Navigation Context**
   - Modal presentation (Expo Router, `_layout.tsx` line 44) means dashboard stays in stack
   - When modal closes via `router.back()`, dashboard regains focus but component doesn't re-mount
   - No `useFocusEffect` hook in dashboard to detect focus and refetch

## Files Involved

| File | Issue |
|------|-------|
| `app/index.tsx` (Dashboard) | No `useFocusEffect` to refetch when modal closes and dashboard regains focus |
| `app/template-editor.tsx` | Save handler only closes modal, doesn't trigger dashboard refresh |
| `src/hooks/useTemplates.ts` | Hook loads once on mount, doesn't listen to navigation focus events |

## Suggested Fix Direction

1. **Option A (Recommended):** Add `useFocusEffect` to dashboard that calls `refresh()` when screen regains focus
2. **Option B:** After save succeeds in template editor, explicitly pass flag/data back to dashboard via navigation params, triggering refresh
3. **Option C:** Implement a global template cache invalidation service that both save and delete call

**Option A is simplest:** Use React Navigation's `useFocusEffect` hook (available in Expo Router) to call `refresh()` whenever the dashboard gains focus. This ensures templates are fresh whenever the user returns from any flow (edit, create, etc.).
