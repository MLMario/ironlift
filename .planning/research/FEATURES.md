# Feature Research

**Domain:** iOS strength/weight training workout tracker
**Researched:** 2026-02-11
**Confidence:** HIGH (based on competitor analysis of Strong, Hevy, JEFIT, FitNotes, StrengthLog + web app reference code)

## Competitor Landscape

Before categorizing features, here is what the top competitors offer. This informs what users expect.

| Feature | Strong | Hevy | JEFIT | FitNotes | IronLift v1 Planned |
|---------|--------|------|-------|----------|---------------------|
| Log sets/reps/weight | Yes | Yes | Yes | Yes | Yes |
| Workout templates/routines | Yes (3 free) | Yes (unlimited free) | Yes | Yes | Yes |
| Rest timer (auto/manual) | Yes (inline) | Yes (auto) | Yes | Yes | Yes (countdown bar) |
| Exercise library | ~300 | ~350+ | ~1400 | ~800+ | ~1000 system |
| Custom exercises | Yes | Yes | Yes | Yes | Yes |
| Progress charts | Yes (advanced) | Yes | Yes | Yes | Yes (total sets, max volume) |
| Workout history | Yes | Yes | Yes | Yes | Yes (paginated) |
| Personal records (PR) tracking | Yes (auto) | Yes (live notification) | Yes | Yes | No |
| 1RM calculation | Yes | Yes (projected) | Yes | Yes | No |
| Supersets | Yes | Yes | Yes | Yes | No |
| Previous workout values shown | Yes | Yes (PREVIOUS column) | Yes | Yes | No (has recent data pre-fill) |
| Apple Health integration | Yes | Yes | Yes | Yes | No |
| Apple Watch app | Yes | No | Yes | Yes | No |
| Body measurements tracking | Yes | Yes | Yes | Yes | No |
| Workout duration tracking | Yes | Yes | Yes | Yes | No (has started_at only) |
| CSV/data export | Yes | Yes | No | Yes | No |
| Offline support | Yes (full) | Partial | Yes | Yes (local-first) | Yes (read cache + offline logging) |
| Social/community feed | No | Yes (core) | Yes | No | No (out of scope) |
| RPE/RIR tracking | Yes | Yes | No | Yes (RIR) | No |
| Warm-up set calculator | Yes | Yes | No | No | No |
| Plate calculator | Yes | Yes | No | No | No |
| Set type labels (warmup/drop/failure) | No | Yes | No | Yes | No |
| Workout notes | Yes | Yes | Yes | Yes | No |
| Dark mode | Yes | Yes | Yes | Partial | Yes (only mode) |
| Biometric auth (Face ID) | Yes | Yes | No | No | No (out of scope) |
| Apple Sign-In | Yes | Yes | Yes | No | No (out of scope) |

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these means the product feels incomplete compared to Strong/Hevy/JEFIT.

| Feature | Why Expected | Complexity | IronLift v1 Status | Notes |
|---------|--------------|------------|---------------------|-------|
| Log sets with weight/reps | Core purpose of the app -- this IS the product | MEDIUM | Planned | Already in web app schema. Per-set weight/reps with done checkbox |
| Workout templates | Every competitor has them. Users create routines and reuse them | MEDIUM | Planned | Full CRUD with ordered exercises and default sets |
| Exercise library (system + custom) | Users need exercises to pick from. ~300+ minimum for credibility | LOW | Planned | ~1000 system exercises. Custom exercise CRUD |
| Rest timer with notification | Users rest between sets. Timer is universal. Background notification is critical | MEDIUM | Planned | Countdown bar with +/-10s adjustment, local notification on background |
| Progress charts | Users want to see they are improving. Visual proof of progress | HIGH | Planned | Line charts for total_sets and max_volume_set with date/session modes |
| Workout history with detail drill-down | Users want to review past workouts. Every competitor shows a timeline | MEDIUM | Planned | Paginated list with summary stats, drill-down to workout detail |
| Previous workout values displayed during logging | Users need to know what they did last time to decide what to do now. Strong and Hevy both show this prominently | LOW | Partial | Has `getRecentExerciseData` for pre-fill, but does NOT show previous values inline during workout. GAP |
| Workout duration tracking | Users want to know how long they trained. Every competitor shows this | LOW | Partial | Has `started_at` but no `finished_at` or duration display. GAP |
| Personal records (PR) detection | Users want to know when they hit a new best. Strong and Hevy auto-detect PRs. Hevy even shows live PR notifications | MEDIUM | Not planned | SIGNIFICANT GAP -- this is table stakes in 2026. Every major competitor does it |
| Supersets / exercise grouping | Extremely common training pattern. Strong, Hevy, JEFIT, FitNotes all support it. Users who superset (most intermediate+ lifters) will be frustrated without it | MEDIUM | Not planned | GAP -- not blocking for MVP but notable absence |
| Offline workout logging | Gyms have poor connectivity. Core flow must work offline | HIGH | Planned | Write queue with idempotency keys. Good coverage |
| Authentication (email/password) | Account required to store data | LOW | Planned | Email/password with Keychain storage, persistent session |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not expected at launch, but valued when present.

| Feature | Value Proposition | Complexity | IronLift v1 Status | Notes |
|---------|-------------------|------------|---------------------|-------|
| True offline-first with cached reads | Most competitors (especially Hevy) require internet. Strong is offline-capable. Being fully offline-capable is a genuine differentiator for gym use | HIGH | Planned | Read cache + write queue. Charts computed locally. Strong advantage over Hevy |
| Template change detection on finish | Detects when a workout deviated from the template and offers to update template defaults. No competitor does this well | MEDIUM | Planned | Unique feature -- compare logged workout to template, prompt user to save changes |
| Hub-and-spoke navigation (no tab bar) | Simpler, more focused UX than the tab-bar-heavy competitors. Opinionated but clean | LOW | Planned | Different from Strong/Hevy's tab bar approach. Reduces cognitive overhead |
| No subscription paywall for core features | Strong limits free tier to 3 routines. Hevy upsells aggressively. A fully free, no-paywall tracker is differentiated | N/A | Planned (personal app) | Not a commercial product but still a UX advantage |
| 1RM estimation / projected max | Calculated from logged data, shows estimated 1RM per exercise. Strong, Hevy, StrengthLog all have this. Relatively low effort but high perceived value | LOW | Not planned | Could be added easily -- pure calculation (Epley/Brzycki formula) from existing set data |
| RPE / RIR tracking per set | Track perceived exertion alongside weight/reps. Growing in popularity for intermediate/advanced lifters | LOW | Not planned | Adds one field per set. Schema change needed |
| Warm-up set calculator | Auto-generate warm-up sets based on working weight. Strong and Hevy both offer this | LOW | Not planned | Pure calculation feature. Nice-to-have |
| Plate calculator | Shows which plates to load on barbell for a given weight | LOW | Not planned | Pure UI utility. Popular in Strong and Hevy |
| Set type labels (warmup/drop/failure) | Distinguish between working sets, warm-up sets, and drop sets. Hevy and FitNotes have this | LOW | Not planned | Adds a `set_type` field. Helps with PR calculation accuracy |
| Body measurements tracking | Track bodyweight, body fat, circumferences over time | MEDIUM | Not planned | Separate data domain. Requires new tables, UI, charts |
| CSV/data export | Export workout data for external analysis or backup | LOW | Not planned | Users value data portability. Strong's top-cited feature |
| Workout notes (per-workout and per-exercise) | Free-text notes for context (e.g., "felt tired", "new PR attempt") | LOW | Not planned | Simple text field. Small effort, meaningful for journaling users |
| Apple Health integration | Sync workout data (calories, duration) with Apple Health ecosystem | MEDIUM | Not planned (out of scope v1) | Requires HealthKit (custom dev client). Phase 2 feature |
| Apple Watch companion | Log sets from wrist during workout. Strong and JEFIT have this | HIGH | Not planned | Requires watchOS development. Phase 2+ |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. Deliberately NOT building these.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Social feed / community | Hevy's core differentiator. Users see friends' workouts | Massive scope. Requires moderation, privacy controls, feed algorithms. Distracts from core tracking mission. Users cite Hevy's social feed as distracting. Solo project cannot maintain social infrastructure | Skip entirely. IronLift is a personal tool, not a social network. If sharing is wanted later, export/screenshot is simpler |
| AI workout generation / recommendations | JEFIT and newer apps (SensAI, PonteFuerte) add AI-generated programs | Requires ML infrastructure, quality training data, and ongoing model maintenance. AI recommendations without domain expertise can be harmful. Significant scope creep | Users create their own templates. The template system is the "program." |
| Calorie/nutrition tracking | Users want all-in-one fitness. MyFitnessPal-style food logging | Completely different domain (food database, barcode scanning, meal planning). Massive scope. Existing apps (MFP, Cronometer) do this better. Causes the "information overload" users hate | Stay focused on workout tracking. Apple Health integration (Phase 2) can bridge to nutrition apps |
| Gamification (streaks, badges, XP) | Hevy has streaks. JEFIT has challenges and leaderboards | Research shows gamification loses motivational power quickly and can create anxiety ("must not break streak"). Ineffective long-term | The chart showing progress IS the motivation. PRs are the real badges. Simple, authentic |
| Real-time multiplayer workouts | Train with friends in real time | Requires WebSocket infrastructure, presence tracking, synchronization. Enormous complexity for niche use case | Not applicable for a personal tracker |
| Video exercise demonstrations | JEFIT and Hevy show exercise demo videos | Requires hosting video content, significant storage, or licensing from content providers. Most users already know exercises they select | Text instructions field exists in schema. Link to external resources if needed |
| Body part heat map / muscle map | JEFIT shows which muscles were worked visually | Requires anatomy illustrations, exercise-to-muscle mapping at detail level, custom rendering. Moderate effort for low practical value | Category-based exercise organization (Chest, Back, Shoulders, etc.) provides the same info textually |
| Scheduled workout reminders (server push) | "Remind me to workout at 6pm" | Requires APNs setup, server-side scheduling, Edge Functions -- violates the "no server infrastructure" constraint. Local scheduled notifications are limited on iOS | Local notifications for rest timer only. Users set their own phone alarms for workout timing |
| Tab bar navigation | Standard iOS pattern. Strong and Hevy use it | IronLift has a hub-and-spoke architecture decision. Tab bar adds persistent navigation state, implies multiple co-equal sections. IronLift's dashboard-centric model is simpler | Hub-and-spoke with bottom sheet settings. Already decided in constitution |
| Light mode | Some users prefer light themes | Adds theme maintenance burden (two complete theme objects, testing both). Dark mode is the fitness app standard. Can be added later with the existing semantic token architecture | Dark mode only at launch. Token structure supports future light mode |

## Feature Dependencies

```
[Authentication]
    |
    +---> [Exercise Library] (need user context for custom exercises)
    |         |
    |         +---> [Templates] (require exercises to reference)
    |         |         |
    |         |         +---> [Active Workout] (started from template)
    |         |         |         |
    |         |         |         +---> [Rest Timer] (triggered during workout)
    |         |         |         |
    |         |         |         +---> [Workout Logging/Save] (on finish)
    |         |         |         |         |
    |         |         |         |         +---> [Workout History] (displays saved logs)
    |         |         |         |         |         |
    |         |         |         |         |         +---> [Workout Detail] (drill-down)
    |         |         |         |         |
    |         |         |         |         +---> [Charts] (computed from workout history)
    |         |         |         |
    |         |         |         +---> [Template Change Detection] (compare workout to template on finish)
    |         |         |
    |         |         +---> [Previous Workout Values] (requires workout history + template context)
    |         |
    |         +---> [Custom Exercises CRUD] (My Exercises management)
    |
    +---> [Offline Cache Layer] (caches exercises, templates, history)
    |         |
    |         +---> [Write Queue / Sync] (offline workout -> sync on reconnect)
    |
    +---> [Settings] (account management, My Exercises, History access)

[Personal Records] --requires--> [Workout History] (computed from logged data)
[1RM Calculation] --requires--> [Workout History] (uses max weight/reps logged)
[Supersets] --enhances--> [Active Workout] (grouping exercises during logging)
[Supersets] --enhances--> [Templates] (defining superset groups in template)
```

### Dependency Notes

- **Active Workout requires Templates + Exercise Library:** Cannot start a workout without selecting a template and its exercises being available (cached for offline)
- **Charts require Workout History:** Charts are computed from logged workout data. No data = empty charts. Charts should be introduced after workout logging is functional
- **Previous Workout Values require History:** The "PREVIOUS" column during workout logging needs at least one prior workout logged for that exercise
- **Personal Records require History:** PR detection is a computation over all historical workout data for an exercise
- **Template Change Detection requires both Active Workout and Templates:** Compares the just-completed workout against the source template
- **Offline Cache sits between Auth and everything else:** All read operations go through cache. Cache must be populated before any offline feature works

## MVP Definition

### Launch With (v1)

Minimum viable product -- what is needed to validate the core workout tracking loop.

- [x] Authentication (email/password, Keychain, persistent session, password reset) -- gate to everything
- [x] Exercise library with ~1000 system exercises + custom exercise CRUD -- foundation for templates
- [x] Template CRUD (create/edit/delete with ordered exercises, default sets, default rest) -- the workout program
- [x] Active Workout flow (pick template, log sets, rest timer with background notification, add/remove exercises mid-workout, swipe-to-delete sets) -- the core product
- [x] Workout save with template change detection -- the feedback loop for improving templates
- [x] Workout history with paginated timeline and drill-down detail -- proof the data is saved
- [x] Progress charts (total sets, max volume per exercise, date/session x-axis) -- the motivational hook
- [x] Offline support (cached reads, offline workout logging, write queue sync) -- gym reliability
- [x] Settings (My Exercises management, Workout History access, Logout)

**GAPS to address before launch (currently missing from v1 plan):**

- [ ] **Previous workout values displayed inline during active workout** -- show what the user did last time next to each exercise/set. The `getRecentExerciseData` service exists but needs to be surfaced in the workout UI as a "PREVIOUS" column or similar. This is LOW complexity and HIGH user value
- [ ] **Workout duration tracking** -- add `finished_at` timestamp to workout_logs (or compute from `created_at - started_at`). Display duration in history list and detail view. LOW complexity, expected by users
- [ ] **Personal record detection** -- compute and display when user hits new bests (heaviest weight, most reps at a weight, highest volume set). MEDIUM complexity but table stakes in 2026. At minimum, calculate and store on workout save. Live notification during workout is ideal but can be Phase 1.x

### Add After Validation (v1.x)

Features to add once core workout loop is proven solid.

- [ ] **Supersets / exercise grouping** -- group 2-3 exercises together in templates and during active workout. Auto-advance to next exercise in group when set is marked done. Trigger: users requesting superset support or app feeling limiting for intermediate lifters
- [ ] **1RM estimation** -- calculate estimated one-rep max from logged sets using Epley/Brzycki formula. Display on exercise history/charts. Pure computation, no schema change needed
- [ ] **Workout notes** -- free-text notes per workout and per exercise. Simple text field additions to workout_logs and workout_log_exercises tables
- [ ] **Set type labels** -- tag sets as working/warmup/drop/failure. Adds `set_type` field to workout_log_sets. Improves PR calculation accuracy
- [ ] **CSV data export** -- export workout history as CSV. Users value data portability highly. Low complexity
- [ ] **RPE/RIR tracking** -- optional perceived exertion field per set. Growing in popularity. Low complexity
- [ ] **Warm-up set calculator** -- auto-generate warm-up sets from working weight. Pure math
- [ ] **Plate calculator** -- show which plates to load. Pure UI utility

### Future Consideration (v2+)

Features to defer until product-market fit is established and/or custom dev client is available.

- [ ] **Apple Health integration** -- sync workouts to Health app. Requires HealthKit permission (custom dev client needed)
- [ ] **Apple Watch companion** -- log sets from wrist. Requires watchOS development (custom dev client + Mac)
- [ ] **Body measurements tracking** -- bodyweight, body fat, circumferences. New data domain
- [ ] **Biometric unlock (Face ID/Touch ID)** -- convenience auth after initial login. Requires custom dev client for some implementations
- [ ] **Apple Sign-In** -- alternative auth provider. Only required if other social providers are added
- [ ] **Light mode** -- second theme. Token architecture already supports it
- [ ] **Progress photos** -- camera integration, photo storage. Significant scope
- [ ] **Workout sharing** -- generate shareable workout summary image/link. Nice social feature without full social network

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Status |
|---------|------------|---------------------|----------|--------|
| Log sets/reps/weight | HIGH | MEDIUM | P1 | Planned |
| Workout templates CRUD | HIGH | MEDIUM | P1 | Planned |
| Rest timer + background notification | HIGH | MEDIUM | P1 | Planned |
| Exercise library (system + custom) | HIGH | LOW | P1 | Planned |
| Progress charts | HIGH | HIGH | P1 | Planned |
| Workout history + detail | HIGH | MEDIUM | P1 | Planned |
| Offline workout logging | HIGH | HIGH | P1 | Planned |
| Previous workout values (inline) | HIGH | LOW | P1 | **GAP -- add to v1** |
| Workout duration | MEDIUM | LOW | P1 | **GAP -- add to v1** |
| Personal record detection | HIGH | MEDIUM | P1 | **GAP -- add to v1** |
| Template change detection | MEDIUM | MEDIUM | P1 | Planned |
| Supersets | MEDIUM | MEDIUM | P2 | v1.x |
| 1RM estimation | MEDIUM | LOW | P2 | v1.x |
| Workout notes | MEDIUM | LOW | P2 | v1.x |
| Set type labels | LOW | LOW | P2 | v1.x |
| CSV export | MEDIUM | LOW | P2 | v1.x |
| RPE/RIR tracking | LOW | LOW | P3 | v1.x |
| Warm-up calculator | LOW | LOW | P3 | v1.x |
| Plate calculator | LOW | LOW | P3 | v1.x |
| Apple Health | MEDIUM | MEDIUM | P3 | v2+ |
| Apple Watch | MEDIUM | HIGH | P3 | v2+ |
| Body measurements | LOW | MEDIUM | P3 | v2+ |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature Category | Strong | Hevy | JEFIT | FitNotes | IronLift Approach |
|------------------|--------|------|-------|----------|-------------------|
| **Core logging UX** | Fast, minimal. Optimized for speed between sets | Clean with previous values column. Social sharing after workout | Feature-rich but busier UI | Simple, no-frills. Pure logging | Dashboard-centric hub-and-spoke. Clean, focused on the workout. No social distractions |
| **Templates** | 3 free, unlimited paid. Structured programs | Unlimited free. Folders. Routine library from community | Guided onboarding. AI-generated plans | Templates/routines. Simple | Full CRUD, unlimited. Template change detection (unique). No program feature yet |
| **Rest timer** | Inline by default. Per-exercise customization | Auto-start on set completion. Configurable | Basic timer | Timer with notification | Countdown bar with +/-10s. Background notification. Per-template-exercise defaults |
| **Charts/analytics** | Volume, 1RM progression, advanced stats | Per-exercise graphs. Monthly report. Sets per muscle group | AI analytics (NSPI). Progressive overload tracking | Progress graphs per exercise | Per-exercise charts (total sets, max volume). Two x-axis modes (date/session). Locally computed (works offline) |
| **Offline** | Full offline. Local storage | Partial -- cloud-first. Requires internet for many features | Offline download for workouts | Local-first. Full offline | Strong offline: read cache + write queue. Charts computed locally. DIFFERENTIATOR vs Hevy |
| **PR tracking** | Automatic detection | Live PR notification during workout. Celebrate screen | Automatic | Automatic | NOT YET PLANNED -- table stakes gap |
| **Monetization** | Freemium ($5/mo). Free = 3 routines | Freemium ($3/mo). Free = generous but ads and upsells | Freemium | Free, no ads | Personal app. No monetization. Full features always |
| **Navigation** | Tab bar (5 tabs) | Tab bar (5 tabs) | Tab bar | Tab bar | Hub-and-spoke. No tab bar. Opinionated simplicity |

## IronLift Gap Analysis Summary

**Covered well (no action needed):**
- Core workout logging (sets, reps, weight, done checkbox)
- Templates with full CRUD
- Rest timer with background notification
- Large exercise library (~1000 system exercises)
- Custom exercises
- Progress charts
- Workout history with detail
- Offline capability (strong compared to competitors)

**Gaps to close for v1 launch (table stakes in 2026):**
1. **Previous workout values displayed inline** -- every competitor shows this. `getRecentExerciseData` exists but needs UI integration in active workout screen
2. **Workout duration** -- add `finished_at` to schema or compute duration. Display in history
3. **Personal record detection** -- auto-detect and highlight new bests. At minimum on workout save; ideally live during workout

**Gaps acceptable to defer (v1.x):**
- Supersets (common but not blocking for MVP)
- 1RM estimation (popular but calculable externally)
- Set type labels, RPE, notes (nice-to-have enrichments)
- CSV export (data portability)
- Warm-up/plate calculators (utility features)

**Gaps properly deferred (v2+, requires custom dev client):**
- Apple Health, Apple Watch, biometrics

## Sources

- [Strong Workout Tracker - App Store](https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577) [HIGH confidence - primary source]
- [Strong.app Official Site](https://www.strong.app/) [HIGH confidence]
- [Hevy App Features Page](https://www.hevyapp.com/features/) [HIGH confidence - primary source]
- [Hevy Previous Workout Values Feature](https://www.hevyapp.com/features/track-exercises/) [HIGH confidence]
- [Hevy Live PR Notification](https://www.hevyapp.com/features/live-pr/) [HIGH confidence]
- [Hevy Warm-up Set Calculator](https://www.hevyapp.com/features/warm-up-set-calculator/) [HIGH confidence]
- [JEFIT Official Site](https://www.jefit.com) [HIGH confidence]
- [JEFIT App Store](https://apps.apple.com/us/app/jefit-workout-plan-gym-tracker/id449810000) [HIGH confidence]
- [FitNotes iOS](https://getfitnotes.com/) [HIGH confidence]
- [FitNotes 2 - App Store](https://apps.apple.com/us/app/fitnotes-2-gym-workout-log/id1538896016) [HIGH confidence]
- [Strong vs Hevy Comparison 2026](https://gymgod.app/blog/strong-vs-hevy) [MEDIUM confidence - third-party review]
- [Hevy App Review 2026 - PRPath](https://www.prpath.app/blog/hevy-app-review-2026.html) [MEDIUM confidence]
- [Best Workout Tracker App 2026 - Hevy Blog](https://www.hevyapp.com/best-workout-tracker-app/) [MEDIUM confidence - Hevy-published]
- [15 Must-Have Features for Fitness App 2026](https://codetheorem.co/blogs/features-for-fitness-app/) [MEDIUM confidence]
- [7 Things People Hate in Fitness Apps](https://www.ready4s.com/blog/7-things-people-hate-in-fitness-apps) [MEDIUM confidence]
- [Best Workout Tracker Apps 2026 - JEFIT Comparison](https://www.jefit.com/wp/general-fitness/10-best-workout-tracker-apps-in-2026-complete-comparison-guide/) [MEDIUM confidence - JEFIT-published]
- IronLift web app source code at `C:\Users\MarioPC\Apps\exercise_tracker_app\` [HIGH confidence - primary source]
- IronLift constitution at `C:\Users\MarioPC\Apps\ironlift\docs\constitution.md` [HIGH confidence - primary source]
- IronLift decisions at `C:\Users\MarioPC\Apps\ironlift\docs\app_develop_decision.md` [HIGH confidence - primary source]

---
*Feature research for: iOS strength/weight training workout tracker*
*Researched: 2026-02-11*
