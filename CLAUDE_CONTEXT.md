# FoodTrack — Claude Context Document

> **Protocol for new sessions:** Read this file first. Then inspect the repository with `find src -type f | sort` and `npx tsc --noEmit`. Verify this document matches the code. Update it if there is drift. Then continue from **Next Milestone**.

---

## Project Overview

FoodTrack is a personal nutrition tracking Progressive Web App (PWA). Users log meals by uploading a photo or describing what they ate in text. Claude vision analyzes the meal and estimates macros. The app tracks daily and weekly nutrition, adjusts targets based on training activity pulled from Samsung Health via Health Connect, and supports Google-authenticated users with fully isolated data.

**Target platform:** Mobile-first PWA, installable to Android/iOS home screen.  
**Owner:** Single user (personal app, multi-account-ready via Firebase Auth).

---

## Agreed Architecture

### Core principles (non-negotiable, established in session)

1. **Entry is the core object** — not "meal". `Entry` has a `type` field (`meal | drink | supplement | snack | recipe`). Slot (`breakfast | lunch | dinner | snacks`) is optional metadata. New tracking types extend the enum, not the schema.

2. **Entries are the source of truth.** `days/{date}` is a recomputable aggregate cache. If both diverge, entries win. The day cache must never be written directly by UI code.

3. **Domain layer is persistence-agnostic.** Types in `src/types/` and logic in `src/lib/nutrition/` have zero Firestore or React imports. They are pure TypeScript.

4. **Repository layer separates persistence from app logic.** Components and hooks call repository interfaces. They never import from `lib/firestore/` directly. This allows the backend to be swapped without touching UI.

5. **No `userId` in Firestore documents.** Ownership is the path `uid`. Security rules are path-based: `match /users/{uid}/{document=**} { allow read, write: if request.auth != null && request.auth.uid == uid; }`. Denormalized `userId` fields cause drift — do not add them.

6. **Business logic free of React.** Nutrition engine, wearable processing, target calculations, AI response mapping — all pure TypeScript modules with co-located unit tests.

7. **Reuse before creating.** Check `src/components/ui/` first. Add a `cva` variant before creating a new component. Create a new component only when the pattern is genuinely not a variant of anything existing.

8. **Zod validates all external data.** Claude API responses, Firestore writes, and user form inputs all pass through Zod schemas before touching domain logic. Never trust raw AI output.

9. **No localStorage as source of truth.** Firestore is source of truth. Firestore IndexedDB offline cache is acceptable as temporary offline cache only. Zustand state is runtime-only, never persisted.

10. **Wearable data flow:** Samsung Health → Health Connect → user exports ZIP → stores in Google Drive → app downloads ZIP → parses in-browser (sql.js) → writes parsed `DayActivity` to Firestore `days/{date}`. The ZIP never touches our servers.

---

## Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) | Latest stable |
| Deployment | Netlify + `@netlify/plugin-nextjs` | Consistent with Peri app |
| Auth | Firebase Authentication (Google Sign-In) | Specified; Google scope also covers Drive |
| Database | Firebase Firestore | Specified; offline persistence via IndexedDB |
| File storage | Firebase Storage | Meal photos only |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) | Server-side API route only; key never in client bundle |
| Health data | Google Drive → sql.js in-browser parse | Follows Peri pattern exactly |
| State | Zustand | Cross-component state without prop drilling |
| Forms | React Hook Form + `@hookform/resolvers` | Onboarding and meal editing |
| Validation | Zod | All external data boundaries |
| Styling | Tailwind CSS v4 + `class-variance-authority` | Design tokens in `tailwind.config.ts` |
| PWA | `@ducanh2912/next-pwa` | Maintained fork; Next.js 15 + Netlify compatible |
| Barcode | `react-zxing` + Open Food Facts API | No API key required |
| Testing | Jest + SWC | Fast TypeScript test runner |

### Key dependency versions (as installed)
- `next`: ^15.3.3
- `react` / `react-dom`: ^19.1.0
- `firebase`: ^11.9.0
- `@anthropic-ai/sdk`: ^0.52.0
- `zustand`: ^5.0.5
- `zod`: ^3.25.67
- `tailwindcss`: ^4.1.10
- `@ducanh2912/next-pwa`: ^10.2.9

---

## Folder Structure

```
src/
├── app/                        # Next.js App Router pages
│   ├── layout.tsx              # Root layout (providers, fonts, PWA meta)
│   ├── page.tsx                # Redirects to /today
│   ├── (auth)/login/           # Google Sign-In screen
│   ├── onboarding/             # Multi-step onboarding flow
│   ├── today/                  # Daily summary + meal slots
│   ├── week/                   # Weekly overview
│   ├── log/                    # Meal logging flow
│   ├── insights/               # Placeholder (Phase 2)
│   ├── profile/                # Profile + sync controls
│   └── api/ai/                 # Generic AI API route (server-side, key never in client)
│
├── components/
│   ├── ui/                     # Reusable primitives (Button, Card, Ring, etc.)
│   ├── navigation/             # BottomNav, TopBar
│   ├── nutrition/              # App-specific nutrition UI
│   ├── logging/                # Meal logging flow components
│   ├── onboarding/             # Onboarding step components
│   └── sync/                   # Health Connect sync UI
│
├── config/
│   ├── features.ts             # Feature flags (boolean, all safe-default)
│   └── constants.ts            # Nutrition constants, multipliers, app-wide values
│
├── lib/
│   ├── firebase/               # Firebase init, auth helpers, storage helpers
│   ├── firestore/              # Firestore implementations of repository interfaces
│   │   └── schema.ts           # Collection paths, field names, index docs (source of truth)
│   ├── nutrition/              # Pure nutrition engine (bmr, targets, adjust, totals)
│   ├── validation/             # Zod schemas for all external data
│   ├── wearable/               # Health Connect parsing (ported from Peri, adapted)
│   └── ai/                     # Generic AI service + prompts
│
├── repositories/               # Repository interfaces + mock implementations
│   ├── IProfileRepository.ts
│   ├── IEntryRepository.ts
│   ├── IDayRepository.ts
│   ├── index.ts
│   └── mock/                   # In-memory implementations for tests/Storybook
│       ├── MockProfileRepository.ts
│       ├── MockEntryRepository.ts
│       ├── MockDayRepository.ts
│       └── index.ts
│
├── store/                      # Zustand stores (Milestone 3)
│   ├── useUserStore.ts
│   ├── useDayStore.ts
│   └── useSyncStore.ts
│
├── hooks/                      # Custom React hooks (Milestone 3)
│   ├── useAuth.ts
│   ├── useProfile.ts
│   ├── useDayData.ts
│   └── useHealthSync.ts
│
├── types/                      # Shared domain types (no Firestore, no React)
│   ├── user.ts                 # UserProfile, Goal, ActivityLevel, MacroTargets
│   ├── nutrition.ts            # Entry, FoodItem, DayAggregate, DayActivity, etc.
│   ├── wearable.ts             # Re-exports from lib/wearable (swap-safe)
│   ├── firestore.ts            # Firestore document shapes (used only by repositories)
│   └── index.ts                # Barrel export (excludes firestore.ts)
│
└── styles/
    └── globals.css             # Tailwind directives + global resets
```

---

## Firestore Schema

### Security rule
```
match /users/{uid}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```
No `userId` field in any document. Path `uid` is the owner.

### `users/{uid}/profile/main` (singleton)
```
name, dateOfBirth (YYYY-MM-DD), sex, heightCm, weightKg,
goal, activityLevel, weeklyTrainingDays,
bmr, tdee,
calorieTarget, proteinTargetG, carbsTargetG, fatTargetG,  ← targets flattened
healthConnectEnabled, lastSyncAt,
onboardingComplete, createdAt, updatedAt
```

### `users/{uid}/entries/{entryId}` — SOURCE OF TRUTH
```
id, type (meal|drink|supplement|snack|recipe),
slot (breakfast|lunch|dinner|snacks)?,
name, date (YYYY-MM-DD), timestamp (ISO),
items: [{ name, portionDescription, quantityG, calories, proteinG, carbsG, fatG,
          confidence?, barcode?, brand? }],
totalCalories, totalProteinG, totalCarbsG, totalFatG,  ← cached from items
inputMethod (photo|text|barcode|manual),
photoUrl?, notes?,
aiMeta?: { model, confidence, notes, handReference },
createdAt, updatedAt
```

### `users/{uid}/days/{YYYY-MM-DD}` — AGGREGATE CACHE (recomputable from entries)
```
date,
calorieTotal, proteinTotalG, carbsTotalG, fatTotalG,  ← sum of entries
adjustedCalorieTarget?, adjustedProteinTargetG?,
adjustedCarbsTargetG?, adjustedFatTargetG?,           ← set after wearable sync
activity?: { steps, activeCaloriesKcal, trainingDay,
             trainingType, workoutCount, totalDurationMin },
lastComputedAt
```

### Required Firestore indexes (composite)
- `entries`: `(date ASC, timestamp ASC)`
- `entries`: `(date ASC, slot ASC)`
- `entries`: `(timestamp DESC)`
- `days`: `(date ASC)` (for week strip range query)

### Invariants enforced by repository layer
- Any entry create/update/delete **must** trigger `DayRepository.recompute()` for that date.
- `days/{date}` is **never** written directly from UI code.
- `totalCalories` etc. on entries are always computed from `items` before saving.

---

## Storage / Source-of-Truth Rules

| Data | Source of truth | Notes |
|---|---|---|
| Nutrition data (entries, days) | **Firestore** | IndexedDB cache for offline only |
| Meal photos | **Firebase Storage** | URL stored in entry doc |
| Wearable exports | **Google Drive** (user-owned) | Never stored by FoodTrack |
| Parsed wearable data | **Firestore** `days/{date}.activity` | Written by sync flow |
| App state | **Zustand** (runtime only) | Never persisted to localStorage |

---

## Implementation Status

### ✅ Completed

**Scaffold & config**
- `package.json` with all dependencies at latest stable versions
- `tsconfig.json` + `tsconfig.test.json` (strict, `@/*` alias, tests excluded from main check)
- `next.config.ts` — PWA configured, `outputFileTracingRoot` set
- `netlify.toml` — `@netlify/plugin-nextjs`, WASM Content-Type header
- `jest.config.mjs` — SWC transform, path aliases
- `.env.local` — Firebase keys populated; `ANTHROPIC_API_KEY` placeholder
- `.env.local.example` — template for new developers
- `.gitignore` — env files, PWA build artifacts, Next.js build output

**Design tokens**
- `tailwind.config.ts` — complete design system:
  - Colors: brand teal, accent periwinkle, surface, text, semantic, macro ring colors, CTA navy
  - Spacing (4px base), typography scale, border-radius aliases, box-shadow scale
  - Motion (durations + easing), z-index scale

**Domain types** (`src/types/`)
- `user.ts` — `UserProfile`, `Goal`, `ActivityLevel`, `MacroTargets`, `OnboardingData`
- `nutrition.ts` — `Entry`, `EntryType`, `MealSlot`, `FoodItem`, `AIMeta`, `DayAggregate`, `DayActivity`, `MacroTotals`, `AdjustedTargets`, `BarcodeProduct`
- `wearable.ts` — re-exports from `lib/wearable/` (swap-safe indirection layer)
- `firestore.ts` — `ProfileDocument`, `EntryDocument`, `DayDocument` (used only by repositories)
- `index.ts` — barrel export (excludes firestore.ts)

**Config**
- `src/config/features.ts` — feature flags with safe defaults
- `src/config/constants.ts` — all nutrition constants (BMR coefficients, activity multipliers, goal offsets, macro ratios, adjustment caps)

**Zod validation schemas** (`src/lib/validation/`)
- `profile.ts` — `OnboardingSchema` (with age validation), `ProfileUpdateSchema`
- `nutrition.ts` — `FoodItemSchema`, `AIMetaSchema`, `EntrySchema`, `DayActivitySchema`, `CreateEntryInputSchema`
- `mealAnalysis.ts` — `MealAnalysisResponseSchema`, `AICapabilitySchema`, `AIRequestSchema`

**Firestore schema**
- `src/lib/firestore/schema.ts` — collection path functions, field name constants, index requirements, invariant documentation

**Repository interfaces** (`src/repositories/`)
- `IProfileRepository.ts` — `get`, `create`, `update`, `setLastSyncAt`
- `IEntryRepository.ts` — `getById`, `list`, `create`, `update`, `delete`, `copySlot`; `EntryQuery` type
- `IDayRepository.ts` — `get`, `getRange`, `recompute`, `setActivity`
- `index.ts` — barrel export

**Wearable library** (`src/lib/wearable/`)
- `types.ts` — ported from Peri (unmodified; no Peri-specific types)
- `dbAdapter.ts` — ported from Peri (generic interface, no app assumptions)
- `sqlJsAdapter.ts` — ported from Peri (generic sql.js wrapper)
- `parseHealthConnect.ts` — ported from Peri (pure HC parsing, no Peri Entry references)
- `workoutNormalization.ts` — ported from Peri; `Entry` import removed, `getNormalizedWorkouts` signature changed to accept `WearableData | undefined`
- `syncDrive.ts` — **adapted** from Peri's `syncHealthConnect.ts`; removed Entry/Peri types, removed Drive save step, returns `WearableDayRecord[]` only
- `mergeActivity.ts` — **written fresh** for FoodTrack; converts `WearableDayRecord` → `DayActivity`

**Nutrition engine** (`src/lib/nutrition/`) — all pure functions, zero React/Firestore
- `bmr.ts` — Mifflin-St Jeor BMR + TDEE
- `targets.ts` — goal + TDEE → `MacroTargets`
- `adjust.ts` — `DayActivity` → `AdjustedTargets` with calorie cap
- `totals.ts` — `sumItems`, `sumEntries`, `roundTotals`

**Minimal app shell**
- `src/app/layout.tsx` — root layout with Inter font, PWA meta
- `src/app/page.tsx` — redirects to `/today`
- `src/styles/globals.css` — Tailwind v4 directives, PWA resets

**Firebase layer** (`src/lib/firebase/`)
- `app.ts` — Firebase app singleton (`getApps()` guard, safe for Next.js hot-reload)
- `firestore.ts` — Firestore instance with `persistentLocalCache` + `persistentMultipleTabManager` for offline support
- `auth.ts` — `signInWithGoogle` (requests Drive readonly scope at sign-in), `signOut`, `subscribeToAuthState`, `getCurrentUser`
- `storage.ts` — `uploadMealPhoto` (returns Firebase Storage URL), `blobToBase64` (for Claude API)

**Firestore mappers** (`src/lib/firestore/mappers.ts`)
- Bidirectional mappers: `toProfileDocument` / `fromProfileDocument` (flattens targets), `toEntryDocument` / `fromEntryDocument`, `toDayDocument` / `fromDayDocument` (flattens adjustedTargets)

**Repository implementations** (`src/lib/firestore/`)
- `DayRepository.ts` — `get`, `getRange`, `recompute` (queries entries, sums, preserves activity/adjusted fields), `setActivity` (computes adjusted targets via `adjustTargetsForTraining`)
- `EntryRepository.ts` — full CRUD + `copySlot` (batch write); every mutation calls `dayRepo.recompute()` automatically; `update` recomputes totals from items; date-change on update triggers recompute on both dates
- `ProfileRepository.ts` — `get`, `create`, `update`, `setLastSyncAt`
- `index.ts` — factory: creates singleton instances, injects DayRepository into EntryRepository

**Mock repository implementations** (`src/repositories/mock/`)
- `MockDayRepository`, `MockEntryRepository`, `MockProfileRepository` — in-memory, implement full interface contracts, support seeding for tests

**Public assets**
- `public/sql-wasm.wasm` — copied from `node_modules/sql.js/dist/` (648KB); required by Health Connect parser

**Tests — 33 passing, 0 type errors (verified 2026-06-28)**
- `src/lib/nutrition/__tests__/bmr.test.ts` — 5 tests: BMR formula, TDEE multipliers
- `src/lib/nutrition/__tests__/totals.test.ts` — 4 tests: sumItems, sumEntries, roundTotals
- `src/lib/firestore/__tests__/mappers.test.ts` — 10 tests: round-trips for all three doc types; verifies targets flattened to top-level fields, adjustedTargets flattened, optional fields preserved/omitted
- `src/repositories/__tests__/mockRepositories.test.ts` — 14 tests: EntryRepository full CRUD, computed totals always derived from items (not passable by callers), day recompute triggered on every mutation, idempotent delete, copySlot with date change; DayRepository getRange date filtering, setActivity computing adjusted targets; ProfileRepository create/get/update without clobber/setLastSyncAt

---

### 🔄 In Progress
Nothing currently in progress.

---

### ⬜ Not Started

**AI service**
- `src/lib/ai/service.ts` — generic AI dispatcher
- `src/lib/ai/prompts/mealAnalysis.ts` — system prompt + mapper to domain `FoodItem[]`
- `src/app/api/ai/route.ts` — server API route (Anthropic key server-side only)

**Zustand stores**
- `src/store/useUserStore.ts`
- `src/store/useDayStore.ts`
- `src/store/useSyncStore.ts`

**Hooks**
- `src/hooks/useAuth.ts`
- `src/hooks/useProfile.ts`
- `src/hooks/useDayData.ts`
- `src/hooks/useHealthSync.ts`

**UI primitives** (`src/components/ui/`)
- Button, Card, Input, Chip, Badge, Avatar, ProgressBar, Ring, Slider, BottomSheet, Dialog, Spinner, Toast, Stepper

**Navigation**
- `src/components/navigation/BottomNav.tsx`
- `src/components/navigation/TopBar.tsx`

**App screens**
- `/login` — Google Sign-In
- `/onboarding` — multi-step (Personal → Body → Goal → Activity → Health Connect)
- `/today` — daily summary with week strip, macro rings, meal slots
- `/week` — weekly overview
- `/log` — meal logging flow (photo / text / barcode)
- `/insights` — placeholder
- `/profile` — profile editing + sync controls

**App-specific components**
- `MacroRings`, `CalorieSummary`, `DayStrip`, `DayTile`, `MealSlot`, `FoodItemRow`, `MealConfirmCard`, `TrainingBanner`, `NutritionStatCard`
- `LogMethodPicker`, `PhotoLogger`, `TextLogger`, `BarcodeLogger`
- `StepPersonal`, `StepBody`, `StepGoal`, `StepActivity`, `StepHealthConnect`
- `SyncButton`, `SyncProgress`

**PWA assets**
- `public/manifest.json`
- `public/icons/` (192px, 512px, maskable)

**Firebase project config**
- Firestore security rules deployed
- Firestore composite indexes created
- Firebase Storage rules deployed

**Deployment**
- Netlify site created and linked to GitHub repo
- Environment variables set in Netlify dashboard

---

## Open Decisions Requiring Owner Input

None currently open.

*Resolved decisions are in the Decision Log below.*

---

## Known Issues / Technical Debt

1. **`outputFileTracingRoot` in `next.config.ts` is an absolute path** (`/Users/piovella/Documents/AI projects/FoodTrack`). Will break on other machines. Acceptable for single-developer project; replace with `path.resolve(__dirname)` if CI is added.

2. **No Firestore indexes deployed yet.** Composite indexes documented in `schema.ts` must be created in the Firebase console (or via `firestore.indexes.json`) before the week strip range query and slot queries will work at scale. Will surface as a Firestore console warning on first compound query.

3. **No Firestore security rules deployed yet.** The path-based rule in `schema.ts` must be deployed to Firebase before the app is accessible to real users. Milestone 3 prerequisite.

4. **Google OAuth token (Drive access) expires in ~1 hour.** The token returned by `signInWithGoogle()` is stored in Zustand (runtime only). If a user tries to sync after an hour without re-authenticating, the Drive call will return 401. A re-authentication prompt is needed in the sync flow. Deferred to Milestone 4 (Health Connect sync UI).

5. **Mock `DayRepository.recompute()` does not query entries** — it preserves whatever totals were seeded. Full recompute logic is only tested via the Firestore implementation. Emulator-based integration tests are deferred but recommended before production.

---

## Next Milestone

**Milestone 3: AI service + Zustand stores + hooks**

Order of work:
1. `src/lib/ai/prompts/mealAnalysis.ts` — system prompt + response-to-domain mapper
2. `src/lib/ai/service.ts` — generic AI dispatcher (capability enum → prompt selector)
3. `src/app/api/ai/route.ts` — server API route; validates `AIRequest`, calls Anthropic SDK, returns Zod-validated response
4. `src/store/useUserStore.ts` — auth user + profile; persists `driveToken` in memory (never localStorage)
5. `src/store/useDayStore.ts` — active date, entries for that date, daily totals
6. `src/store/useSyncStore.ts` — Health Connect sync state + step progress
7. `src/hooks/useAuth.ts` — subscribes to Firebase auth, populates `useUserStore`
8. `src/hooks/useProfile.ts` — loads profile from `profileRepository`, writes on onboarding complete
9. `src/hooks/useDayData.ts` — loads entries + day aggregate for active date from `entryRepository` / `dayRepository`
10. Tests for AI response validation (Zod parse + mapper)
11. Deploy Firestore security rules
12. Deploy Firestore composite indexes (`firestore.indexes.json`)
13. Update `CLAUDE_CONTEXT.md`

**Note:** Do not begin Milestone 4 (UI primitives + screens) until Milestone 3 stores and hooks are complete and verified.

---

## Decision Log

### [2025-06-28] Generic Entry model over Meal model
**Decision:** Core object is `Entry` with a `type` field, not a `Meal`.  
**Alternatives considered:** `Meal` as core type (simpler initially).  
**Why this:** Drinks, supplements, snacks, and recipes don't fit a "meal" mental model. Adding them later would require schema migration. A `type` field costs nothing now and avoids future churn.

### [2025-06-28] Entries as source of truth, days as aggregate cache
**Decision:** `entries` collection is source of truth. `days/{date}` is a maintained cache recomputed on every entry mutation.  
**Alternatives considered:** Storing day totals independently (simpler reads); always computing totals from entries at query time (simpler writes).  
**Why this:** Independent storage risks divergence (correctness bug). Always computing from entries requires a collection query on every render of the week strip (performance issue on mobile). Cache-with-recompute gives correctness guarantees and fast reads.

### [2025-06-28] No userId in Firestore documents
**Decision:** Documents under `users/{uid}/` do not contain a `userId` field. Security rules use path-based ownership.  
**Alternatives considered:** Denormalized `userId` on every document (common pattern for collection-group queries).  
**Why this:** FoodTrack has no collection-group queries (all data is per-user, accessed via `users/{uid}/`). Denormalized fields can drift from the path uid and create security surface. The path uid is always correct.

### [2025-06-28] Repository interface layer before implementation
**Decision:** Define `IProfileRepository`, `IEntryRepository`, `IDayRepository` interfaces first. Implementations are in `src/lib/firestore/`.  
**Alternatives considered:** Direct Firestore calls in hooks (simpler, less code).  
**Why this:** Allows future backend swap (e.g. different database) without touching UI. Enables unit testing with mock implementations. Keeps domain logic independent of persistence.

### [2025-06-28] Generic AI service, not meal-specific
**Decision:** API route is `/api/ai/` accepting `{ capability, payload }`. Capabilities include `analyze_meal_photo`, `analyze_meal_text`, and future types.  
**Alternatives considered:** `/api/analyze-meal/` single-purpose route.  
**Why this:** A meal-specific route becomes a second route immediately (barcode interpretation, recipe estimation). Generic service costs nothing extra now.

### [2025-06-28] @ducanh2912/next-pwa over serwist
**Decision:** Using `@ducanh2912/next-pwa`.  
**Alternatives considered:** `serwist` (more TypeScript-native, newer), manual Workbox config.  
**Why this:** Least friction for Next.js 15 + Netlify. Same author as `serwist`. Migration path exists if needed.

### [2025-06-28] Wearable files adapted, not blindly copied
**Decision:** Peri files with generic logic (`types.ts`, `dbAdapter.ts`, `sqlJsAdapter.ts`, `parseHealthConnect.ts`) are copied. Files with Peri-specific types are adapted: `workoutNormalization.ts` had `Entry` import removed; `syncHealthConnect.ts` was rewritten as `syncDrive.ts` (no Drive save, returns `WearableDayRecord[]`); `mergeSleep.ts` was replaced by `mergeActivity.ts` (FoodTrack-specific).  
**Why this:** Respects the contract "do not modify Peri files" while not importing Peri-specific assumptions into FoodTrack.

### [2025-06-28] Tailwind CSS v4 + CVA for design system
**Decision:** Tailwind v4 with design tokens in `tailwind.config.ts`. `class-variance-authority` for component variants.  
**Alternatives considered:** CSS Modules with CSS custom properties.  
**Why this:** Tailwind config is the single source of truth for tokens. CVA gives typed variant APIs without runtime overhead. Faster to build with than CSS Modules at this stage.

### [2025-06-28] DayRepository.recompute() queries entries directly (no circular dep)
**Decision:** `DayRepository.recompute()` queries the Firestore `entries` collection directly rather than calling `IEntryRepository.list()`.  
**Alternatives considered:** Pass `IEntryRepository` into `DayRepository` (more testable but creates tight coupling); compute totals in a shared service (extra abstraction with no clear benefit at this stage).  
**Why this:** `DayRepository` and `EntryRepository` are in the same persistence layer — a direct Firestore query is appropriate. Passing `IEntryRepository` into `DayRepository` creates a bidirectional dependency (DayRepo injected into EntryRepo, EntryRepo injected into DayRepo). Direct query avoids this cleanly.

### [2025-06-28] `setActivity` accepts optional `MacroTargets` to compute adjusted targets
**Decision:** `IDayRepository.setActivity(uid, date, activity, baselineTargets?)` accepts optional baseline targets. Adjusted targets are computed at write time and stored in the day document.  
**Alternatives considered:** Compute adjusted targets lazily in the UI (no storage, always derived); store raw activity only and compute in a separate step.  
**Why this:** The wearable sync flow already has the profile in scope, so passing targets costs nothing. Storing the result means the UI reads a single pre-computed value rather than re-running adjustment logic on every render.

### [2025-06-28] SWC for Jest instead of ts-jest
**Decision:** `@swc/jest` for test transforms.  
**Alternatives considered:** `ts-jest` (standard, slower), Babel.  
**Why this:** SWC is significantly faster for large test suites. Next.js already uses SWC for its build. No type checking during tests (handled by `tsc --noEmit`).
