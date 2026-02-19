## Project Overview

**IronLift iOS** — a native iOS exercise tracker app built with Expo (React Native) + TypeScript, backed by Supabase (PostgreSQL + Auth + RLS). No API layer.

This is a **port of an existing web app** (`Apps/exercise_tracker_app/`, Preact/TypeScript) to a standalone iOS app at `Apps/ironlift/`. The web app is abandoned but preserved as the **canonical reference** for screen layouts, user flows, visual design, and design tokens.

**Key architectural choices:**

- Standalone Expo project (not a monorepo). Types and SQL copied as-is from web; services adapted; all UI built from scratch
- Hub-and-spoke navigation — dashboard is the sole persistent screen, all flows branch out and return
- Offline-capable — cached reads + offline workout logging via AsyncStorage write queue, synced on reconnect
- Hand-rolled UI with `StyleSheet.create()` — no component libraries. Dark mode only. Semantic theme tokens via `useTheme()` hook
- Direct Supabase with RLS — no Edge Functions, no intermediary API
- Expo Go dev workflow on physical iPhone over Wi-Fi (no simulator, no custom dev client)
- Local notifications only (`expo-notifications`) for rest timer alerts
- EAS Build + Submit for distribution; OTA updates via `expo-updates`

## Testing

When asked to write, fix, or review any test file, **always invoke the `react-native-testing` skill first** before writing code. This loads the correct RNTL API reference for our installed version and prevents outdated patterns from training data.

- **Framework:** Jest + `jest-expo` + `@testing-library/react-native`
- **Scope:** Unit tests (pure functions, hooks, components). No E2E.
- **Mocking:** Mock all native modules (`expo-notifications`, `expo-haptics`, `expo-audio`, `AsyncStorage`, `NetInfo`, Supabase client). Tests run in Node, never on device.
- **Query priority:** `getByRole` > `getByLabelText` > `getByPlaceholderText` > `getByText` > `getByTestId` (last resort)
- **Interactions:** Prefer `userEvent` over `fireEvent`
- **Test location:** `__tests__/` directories colocated with source (e.g., `src/lib/__tests__/`, `src/hooks/__tests__/`)
