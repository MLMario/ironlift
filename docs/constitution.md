# IronLift iOS — Development Constitution

Rules and constraints for writing code. Load this into context before any coding session.

---

## Stack

- **Runtime:** Expo (React Native), New Architecture (required by Expo Go since SDK 52; SDK 55 removes opt-out)
- **Language:** TypeScript
- **Backend:** Supabase direct (PostgreSQL + Auth + RLS). No API layer, no Edge Functions
- **iOS minimum:** 16
- **Package manager:** pnpm
- **Dev workflow:** Expo Go on physical iPhone over Wi-Fi (no simulator, no custom dev client)

## Project Structure

Standalone Expo project at `C:\Users\MarioPC\Apps\ironlift\`. Not a monorepo.

```
ironlift/
├── app/                # Expo Router screens (UI only)
│   ├── _layout.tsx     # Root stack navigator
│   ├── index.tsx       # Dashboard (home)
│   ├── workout.tsx     # Active Workout
│   ├── template-editor.tsx
│   └── settings/
│       ├── exercises.tsx
│       ├── history.tsx
│       └── [exerciseId].tsx
├── src/
│   ├── types/          # TypeScript types (database.ts, services.ts)
│   ├── services/       # Business logic (auth, exercises, templates, etc.)
│   ├── hooks/          # React Native hooks
│   ├── components/     # Reusable UI components
│   └── lib/            # Supabase client, utilities
├── sql/                # Schema reference
└── assets/             # Images, fonts
```

## Code Origin Rules

The app is built by migrating from the web app (`Apps/exercise_tracker_app/`):

| Strategy | What |
|----------|------|
| **Copy as-is** | Types (`database.ts`, `services.ts`), SQL schema files |
| **Copy and adapt** | Services — same business logic, swap Supabase client import and env vars |
| **Build from scratch** | All UI components, screens, navigation, hooks that are web-specific |
| **Discard** | CSS stylesheets, Preact components, Vite config, Chart.js integration, web-specific hooks (`useClickOutside`, `useAsyncOperation`) |

The web app is the **canonical reference** for screen layouts, user flows, and visual design — but the code is independent.

## Navigation

- **Pattern:** Hub-and-Spoke. Dashboard is the only persistent screen; all flows branch out and return
- **Library:** Expo Router (file-based routing)
- **No tab bar**
- Presentation styles:
  - Template editor → **modal** (slides up)
  - Active workout → **stack push** (swipe-back disabled to prevent accidental exits)
  - Settings menu → **bottom sheet** (`@gorhom/bottom-sheet`, overlays dashboard)
  - Settings sub-screens (My Exercises, History, Detail) → **stack push**

## UI & Styling

- **All components hand-rolled** with `StyleSheet.create()` — no UI component library
- **Theme:** `ThemeProvider` React Context + `useTheme()` hook
- **Tokens:** Semantic names (`surface`, `textPrimary`, `border`) — not literal color names
- **Dark mode only** at launch. Token structure supports future light mode (same keys, different values)
- **Font:** System font (SF Pro) — no custom fonts, no font loading
- **Web app CSS is the source of truth** for colors, spacing, typography scale, border radii, shadows, and proportions

### Allowed Libraries

Only use third-party libraries for genuinely complex gesture/physics work:

| Library | Purpose |
|---------|---------|
| `@gorhom/bottom-sheet` | Settings menu bottom sheet |
| `react-native-reanimated` | Animations (Expo Go built-in) |
| `react-native-gesture-handler` | Gestures (Expo Go built-in) |
| `react-native-gifted-charts` | Charts (replaces Chart.js) |
| `react-native-svg` | Chart dependency (Expo Go built-in) |
| `expo-linear-gradient` | Gradient fills for charts |

No other UI component libraries. Hand-roll buttons, inputs, cards, modals, lists, accordions.

## Offline & Data

- **Storage:** AsyncStorage (key-value JSON) for all local caching and the write queue
- **Cache everything:** exercise library, user exercises, templates, workout history
- **Charts:** Computed client-side from cached workout history — no separate chart data cache
- **Write queue:** Offline workouts saved locally with idempotency keys, synced when online
- **Sync triggers:** App foreground, after completing a write action, iOS background fetch
- **No** manual pull-to-refresh. **No** polling
- **Conflict resolution:** Last-write-wins by timestamp
- **Online required for:** Template editing, chart CRUD, account management
- **Offline works for:** Starting/completing workouts using cached templates, viewing history and charts
- Clear UI indicators for sync status ("saved locally, will sync when online")

## Auth

- Email/password only (mirrors web app)
- Tokens stored via `expo-sqlite/localStorage` adapter (Supabase-recommended; `expo-secure-store` has a ~2048-byte limit that can break Supabase sessions)
- Custom `storage` adapter using `expo-sqlite/localStorage` passed to Supabase client at init
- Session persists until explicit logout (auto-refreshes via refresh token)
- Password reset: deep link (`ironlift://reset-password`) returns user from Safari to native reset screen

## Notifications

- **Local only** via `expo-notifications` — no server push, no APNs setup
- **Sole use case:** Rest timer expiry alert when app is backgrounded
- Schedule notification when timer starts; cancel it if rest ends early, is skipped, or workout finishes
- Permission requested on first app launch

## Charts

- `react-native-gifted-charts` replaces Chart.js
- CRUD services (`getUserCharts`, `createChart`, `deleteChart`, `reorderCharts`) port as-is
- Rendering is declarative via `<LineChart>` / `<BarChart>` components — no imperative `renderChart`/`destroyChart`
- Chart data computed locally from cached workout history (works offline, includes unsynced workouts)

## Testing

- **Jest** for unit tests, written alongside feature code during development
- **Priority areas:** sync/cache logic > chart computation > timer logic > workout state management
- **Skip testing:** Thin CRUD service wrappers (Supabase pass-throughs)
- **Mocks:** Official AsyncStorage mock package + manual Jest mocks for Supabase query builder
- **No coverage threshold** — test what's high-risk, don't chase a number
- **Run:** `npm test` locally on-demand. No pre-commit hooks, no CI gates
- **UI testing:** Manual on physical device via Expo Go

## Distribution

- EAS Build + EAS Submit (cloud builds, no Mac needed)
- OTA updates via `expo-updates` — checked on every app launch
- TestFlight before production for every release
- Semver (`major.minor.patch`), build number auto-incremented by EAS
