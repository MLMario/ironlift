
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

---

## Pre-Task Context Loading (Required)

Before planning or writing any code for this project, you MUST first deploy a subagent (research/explore agent) with the following instructions:

1. **Receive the current objective/task** as context
2. **Read `docs/constitution.md`** and extract only the rules, constraints, and patterns directly relevant to the given task (e.g., if the task involves UI work, extract the UI & Styling and Allowed Libraries sections; if it involves data, extract Offline & Data and Backend sections)
3. **Read `docs/app_develop_decision.md`** and extract the decision rationale, sub-decisions, and implications from only the dimensions relevant to the task (e.g., if the task involves navigation, extract Decision 6 and its sub-decisions)
4. **Return a focused brief** containing: (a) the applicable rules/constraints from the constitution, and (b) the relevant historical decisions and their rationale that the implementing agent must respect

Use this brief as binding context for all subsequent planning and code generation. Do not assume defaults — defer to whatever the constitution and decision document specify. If the task spans multiple areas, the subagent must cover all relevant sections.

These two documents are the canonical source of truth for how this project is built. 

The main objective of this pre-context task is to add more detailed that is relevant to your #Overall Developement Instruction. You must use this context to add to your guidelines if and only if this context adds more details or relevant instructions to any the themes
---

# Overall Developement Instructions

## Theme 1: Web App as Visual Reference

When building any iOS screen or component, consult the web app at `Apps/exercise_tracker_app/` first. Match its colors, spacing, typography, layout proportions, and user flows. The web app's CSS custom properties and stylesheets are the source of truth for design tokens (translated into the native theme object). When in doubt about how a screen should look or behave, defer to the web app's existing implementation.

---

## Theme 2: Code Placement

| What | Where |
|------|-------|
| Screens (UI only) | `app/` (Expo Router file-based routing) |
| Business logic | `src/services/` |
| React hooks | `src/hooks/` |
| Reusable UI components | `src/components/` |
| TypeScript types | `src/types/` |
| Supabase client, utilities | `src/lib/` |
| SQL schema reference | `sql/` |

Screens in `app/` contain UI and navigation only — no business logic. Services handle all data operations.

---

## Theme 3: Dependency Rules

Do NOT install new third-party packages without asking first. The approved library list is in `docs/constitution.md` under "Allowed Libraries". Hand-roll all UI components — no component libraries (no Tamagui, NativeBase, RN Paper, NativeWind, styled-components, etc.).

Approved third-party libraries:
- `@gorhom/bottom-sheet` — settings menu bottom sheet
- `react-native-reanimated` — animations (Expo Go built-in)
- `react-native-gesture-handler` — gestures (Expo Go built-in)
- `react-native-gifted-charts` — charts (replaces Chart.js)
- `react-native-svg` — chart dependency (Expo Go built-in)
- `expo-linear-gradient` — gradient fills for charts

Everything else: ask before adding.

---

## Theme 4: Styling

- Use `StyleSheet.create()` for all styles — no CSS-in-JS libraries
- Access theme tokens via the `useTheme()` hook from `ThemeProvider` context
- Use semantic token names (`surface`, `textPrimary`, `border`) — never hardcode color values
- Dark mode only at launch; token structure supports future light mode (same keys, different values)
- System font (SF Pro) only — no custom fonts, no font loading
- No inline styles except for dynamic values that depend on props or state

---

## Theme 5: Data & Offline

- All data access goes through Supabase directly with RLS. No API layer, no Edge Functions, no middleware
- Cache exercise library, user exercises, templates, and workout history in AsyncStorage
- Charts are computed client-side from cached workout history — no separate chart data cache
- The core workout flow (pick template, log sets, finish) must work fully offline
- Only template editing, chart CRUD, and account management require connectivity
- Write queue with idempotency keys for offline workouts, synced on reconnect
- No manual pull-to-refresh. No polling

---

## Theme 6: Navigation

- Hub-and-spoke only — dashboard is the single home screen, all flows branch out and return
- No tab bar
- Expo Router (file-based routing) for all navigation
- Template editor presents as modal (slides up)
- Active workout presents as stack push (swipe-back disabled)
- Settings menu presents as bottom sheet (overlays dashboard)
- Settings sub-screens (My Exercises, History, Detail) present as stack push

---

## Theme 7: Testing

- Write Jest unit tests alongside feature code for: sync/cache logic, chart computation, timer logic, workout state management
- Skip tests for thin Supabase CRUD wrappers (pass-throughs)
- Use the official AsyncStorage mock + manual Jest mocks for Supabase query builder
- No coverage threshold — test what's high-risk, don't chase a number
- Run `npm test` locally on-demand. No pre-commit hooks, no CI gates
- All UI testing is manual on physical device via Expo Go

---

## Theme 8: Expo Go Compatibility

All code must run in Expo Go. Do not use features or libraries that require a custom dev client or native module linking. If a feature needs custom native code, flag it and stop — it belongs in Phase 2 (custom dev client + Mac).

---

## Theme 9: Do Not

- Add a tab bar — hub-and-spoke navigation only
- Add pull-to-refresh or polling
- Use custom fonts — system font only
- Add server-side push notifications — local only via `expo-notifications`
- Introduce an API layer or Edge Functions between the app and Supabase
- Add UI component libraries or CSS-in-JS libraries
- Create a monorepo structure — single standalone project
