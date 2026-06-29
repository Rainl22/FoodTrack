# FoodTrack — Claude Context Document

> **Protocol for new sessions:** Read this file first. Then inspect the repository with `find src -type f | sort` and `npx tsc --noEmit`. Verify this document matches the code. Update it if there is drift. Then continue from **Next Milestone**.
>
> **Permanent architectural source:** `ARCHITECTURE.md` in the project root describes system design, layering, component composition rules, health sync target architecture, and dependency direction. Read it when making architectural decisions. Update it only when the architecture changes — it is not a milestone log.

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

**Tests — 75 passing, 0 type errors (verified 2026-06-28 after M6)**
- `src/lib/nutrition/__tests__/bmr.test.ts` — 5 tests: BMR formula, TDEE multipliers
- `src/lib/nutrition/__tests__/totals.test.ts` — 4 tests: sumItems, sumEntries, roundTotals
- `src/lib/firestore/__tests__/mappers.test.ts` — 10 tests: round-trips for all three doc types; verifies targets flattened to top-level fields, adjustedTargets flattened, optional fields preserved/omitted
- `src/repositories/__tests__/mockRepositories.test.ts` — 14 tests: EntryRepository full CRUD, computed totals always derived from items (not passable by callers), day recompute triggered on every mutation, idempotent delete, copySlot with date change; DayRepository getRange date filtering, setActivity computing adjusted targets; ProfileRepository create/get/update without clobber/setLastSyncAt
- `src/lib/ai/__tests__/mealAnalysis.test.ts` — 15 tests: Zod schema accepts/rejects AI responses, mapper converts snake_case to camelCase FoodItem, overallConfidence derived as lowest-item confidence, request builders set correct fields

**AI service** (`src/lib/ai/`) — provider-agnostic architecture
- `providers/IAIProvider.ts` — provider interface (`AIProviderRequest`, `AIProviderResponse`, `IAIProvider`)
- `providers/AnthropicProvider.ts` — Anthropic SDK implementation; model defaulting to `claude-sonnet-4-6`
- `prompts/mealAnalysis.ts` — system prompt, `buildPhotoRequest`, `buildTextRequest`, `mapResponse` (snake_case → FoodItem), `analyzeMealPhoto`, `analyzeMealText`; `MealAnalysisResult` type
- `service.ts` — `AIService` class; dispatches by `AICapability`; assembles `AIMeta` from provider response; `handleRequest(AIRequest) → MealAnalysisServiceResult`
- `src/app/api/ai/route.ts` — POST handler; validates with `AIRequestSchema`; Anthropic key server-side only; returns `{ ok, capability, result }`

**Zustand stores**
- `src/store/useUserStore.ts` — `status` ('loading'|'authenticated'|'unauthenticated'), `user`, `profile`, `driveToken` (runtime only, never persisted); `clear()` on sign-out (sets status='unauthenticated')
- `src/store/useDayStore.ts` — `activeDate` (init: today), `entries`, `day`, `isLoading`, `error`
- `src/store/useSyncStore.ts` — `SyncPhase` enum, `progress`, `lastSyncAt`, `error`, `reset()`

**Hooks**
- `src/hooks/useAuth.ts` — subscribes to `subscribeToAuthState`; sets `status`, populates/clears `useUserStore`; call once at app root
- `src/hooks/useProfile.ts` — loads profile from `profileRepository` on mount; `saveProfile()` handles create vs update
- `src/hooks/useDayData.ts` — loads entries + day aggregate for `activeDate`; re-fetches on uid or date change
- `src/hooks/useHealthSync.ts` — reads `useUserStore` + `useSyncStore`; `startSync()` calls `healthSyncService.sync()`, handles token refresh via `signInWithGoogle()`, maps `HealthSyncPhase` → `SyncPhase`, classifies errors into user-readable messages
- `src/hooks/useWeekData.ts` — loads last 7 days' `DayAggregate[]` from `dayRepository.getRange`; used by Today and Week screens
- `src/hooks/useEntryActions.ts` — `createEntry(input)` and `deleteEntry(id, date)`; calls repository then refreshes store

**Firestore config**
- `firestore.rules` — path-based rule: `users/{uid}/**` gated on `request.auth.uid == uid`
- `firestore.indexes.json` — two composite indexes: `(date ASC, timestamp ASC)` and `(date ASC, slot ASC)` on `entries`

---

**UI primitives** (`src/components/ui/`) — all pure, zero Firestore/Zustand coupling
- `Button` — CVA variants: primary/secondary/ghost/danger; sizes sm/md/lg; fullWidth; 44px minimum tap target
- `Card` — padding (none/sm/md/lg) + shadow (none/sm/default/md) variants; `rounded-card bg-surface-card`
- `Input` — controlled; label, error, helper; `useId` for accessible IDs; `rounded-input bg-surface-input`
- `Chip` — pill filter/tag; selected/unselected states; `aria-pressed`; `rounded-chip`
- `Badge` — count or status; default/brand/success/warning/error variants; size sm/md/lg
- `Avatar` — circular; image with initials fallback; size sm/md/lg/xl
- `ProgressBar` — fill bar; accepts Tailwind `bg-*` class as `color` prop; animated variant
- `Ring` — SVG donut segment; value/size/strokeWidth/color props; children slot for center content
- `Slider` — styled `<input type="range">`; optional label + formatted value display
- `BottomSheet` — controlled (open/onClose); `createPortal`; Escape key + body-scroll lock; drag handle
- `Dialog` — controlled modal; `createPortal`; Escape key + backdrop click; focus management
- `Spinner` — animated ring; size sm/md/lg/xl; color brand/white/muted; `role="status"`
- `Toast` — notification card; severity info/success/warning/error; dismiss button; `role="alert"`
- `Stepper` — dot progress indicator; current step widens; past steps tinted brand-300
- `src/components/ui/index.ts` — barrel export for all primitives

**Utility**
- `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)

**Providers**
- `src/components/Providers.tsx` — `'use client'` wrapper; calls `useAuth()` at app root

**Navigation**
- `src/components/navigation/BottomNav.tsx` — 5-tab nav (Today/Week/Log/Insights/Profile); Log tab is a FAB; active state from `usePathname`; inline SVG icons; safe-area bottom padding
- `src/components/navigation/TopBar.tsx` — fixed header 56px; title + left/right slots; `static` prop for flow positioning

**App shell**
- `src/app/layout.tsx` — root layout wraps body with `<Providers>`
- `src/app/(app)/layout.tsx` — authenticated chrome: `<AuthGuard>` (status-based redirect) + `<BottomNav />`; pages render their own TopBar
- `src/components/AuthGuard.tsx` — `'use client'`; reads `useUserStore.status`; shows spinner while loading, redirects to `/login` if unauthenticated
- `src/lib/ai/client.ts` — client-side helper: `callAI(request)` → fetch('/api/ai') → `MealAnalysisServiceResult`

**AI client**
- `src/lib/ai/client.ts` — wraps POST to `/api/ai`; throws on error; used by `PhotoLogger` and `TextLogger`

**Nutrition components** (`src/components/nutrition/`)
- `MacroRings` — 3× `Ring` SVGs for protein / carbs / fat with macro color tokens
- `CalorieSummary` — large calorie number, remaining/over label, `ProgressBar`
- `DayStrip` — horizontal scroll strip of last 7 `DayTile`s
- `DayTile` — single day button; active state = `bg-brand-500`; dot if has data
- `MealSlot` — named meal slot (breakfast/lunch/dinner/snacks) with `FoodItemRow` list + "Add food" button
- `FoodItemRow` — entry display row: name, macro summary, optional delete
- `TrainingBanner` — training day card with adjusted calorie target
- `NutritionStatCard` — label / value / unit / optional `ProgressBar` target comparison

**Logging components** (`src/components/logging/`)
- `LogMethodPicker` — three tap targets: photo / text / barcode
- `PhotoLogger` — `<input capture="environment">` → base64 → `callAI` → `onResult`
- `TextLogger` — textarea → `callAI` → `onResult`
- `BarcodeLogger` — `react-zxing` `useZxing` hook → Open Food Facts API → `onResult`
- `MealConfirmCard` — AI result review: item list, totals, slot `Chip` picker, confirm/discard

**Onboarding components** (`src/components/onboarding/`)
- `StepPersonal` — RHF + Zod: name, dateOfBirth, sex Chip selector
- `StepBody` — RHF + Zod: heightCm, weightKg (coerce.number)
- `StepGoal` — goal card picker (fat_loss / maintain / muscle_gain)
- `StepActivity` — activity level card picker + weeklyTrainingDays `Slider`
- `StepHealthConnect` — enable/skip Health Connect toggle

**Sync components** (`src/components/sync/`)
- `SyncButton` — calls `useHealthSync().startSync()`; disabled while busy
- `SyncProgress` — reads `phase`, `progress`, `lastSyncAt`, `error` from `useHealthSync()`

**Full app screens** (Milestone 5)
- `src/app/(auth)/login/page.tsx` — functional: `signInWithGoogle()`, store `driveToken`, check profile, redirect to `/today` or `/onboarding`
- `src/app/onboarding/page.tsx` — 5-step form; accumulates data; computes `bmr`/`tdee`/`targets` at end; calls `saveProfile()`; redirects to `/today`
- `src/app/(app)/today/page.tsx` — `DayStrip`, `CalorieSummary`, `MacroRings`, `TrainingBanner` (if training day), 4× `MealSlot`; reads `useDayStore`/`useUserStore`; "Add food" navigates to `/log?slot=X`
- `src/app/(app)/week/page.tsx` — 7-day averages grid of `NutritionStatCard`; reads `useWeekData()`
- `src/app/(app)/log/page.tsx` — phase machine (pick→capture→confirm→saving); `Suspense` wrapper for `useSearchParams`; on confirm calls `useEntryActions().createEntry()`
- `src/app/(app)/profile/page.tsx` — profile targets display, `SyncButton`/`SyncProgress`, sign-out `BottomSheet`

**Health Connect sync pipeline** (`src/lib/healthSync/`) — Milestone 6
- `errors.ts` — typed error classes: `DriveAuthError`, `DriveDownloadError`, `ParseError`, `PersistenceError`
- `GoogleDriveClient.ts` — `findHealthConnectFile(token)` + `downloadZip(token, fileId)`; throws `DriveAuthError` on 401, `DriveDownloadError` on network/HTTP errors; no parsing logic
- `HealthConnectParser.ts` — wraps `openHealthConnectZip` + `parseHealthConnect` from existing wearable lib; returns `WearableDayRecord[]`; always closes DB (in finally); throws `ParseError`; pure (no network, no Firestore)
- `HealthSyncService.ts` — orchestrates full pipeline: find → download → parse → `wearableRecordsToDayActivities` → `dayRepo.setActivity()` per day → `profileRepo.setLastSyncAt()`; defines local `HealthSyncPhase` type for callbacks (no upward store import); retries once after `DriveAuthError` via `onTokenRefresh` callback; wraps Firestore errors as `PersistenceError`
- `index.ts` — singleton `healthSyncService` (mirrors `lib/firestore/index.ts`); re-exports error classes and `HealthSyncPhase`
- `__tests__/GoogleDriveClient.test.ts` — 11 tests: 401→`DriveAuthError`, non-401→`DriveDownloadError`, network failure, success, Authorization header, URL shape
- `__tests__/HealthConnectParser.test.ts` — 6 tests: mocks wearable modules (avoids WASM in Jest); success, parse failure→`ParseError`, db always closed
- `__tests__/HealthSyncService.test.ts` — 10 tests: phase sequence, `setActivity`/`setLastSyncAt` called, token refresh + retry, `DriveAuthError` if refresh returns null, all four error classes propagated correctly

**Note on `lib/wearable/syncDrive.ts`:** This file is **legacy/reference-only** after M6. It is not called by the new sync path (`GoogleDriveClient` + `HealthConnectParser` + `HealthSyncService` replaces it). It is preserved unchanged because it was adapted from the Peri codebase. It can be deleted in a future cleanup pass once there is confidence the new pipeline covers all its functionality.

**PWA assets**
- `public/manifest.json` — start_url `/today`, display `standalone`, theme `#1aa8a1`
- `public/icons/icon-192.svg` — placeholder teal tile with "FT" logotype
- `public/icons/icon-512.svg` — same, maskable-safe

**Cleanup**
- Deleted `src/dataconnect-generated/` — unrelated Firebase Data Connect boilerplate
- Removed `"@dataconnect/generated"` from `package.json`

---

### 🔄 In Progress
Nothing currently in progress.

---

### ⬜ Not Started

**Firebase project config**
- Firestore security rules: `firestore.rules` written — **deploy with `firebase deploy --only firestore:rules`**
- Firestore composite indexes: `firestore.indexes.json` written — **deploy with `firebase deploy --only firestore:indexes`**
- Firebase Storage rules deployed

**Deployment**
- Netlify site created and linked to GitHub repo
- Environment variables set in Netlify dashboard (`ANTHROPIC_API_KEY` required for `/api/ai`)

**Health Connect / Drive sync** (Milestone 6 — see below)

---

## Open Decisions Requiring Owner Input

None currently open.

*Resolved decisions are in the Decision Log below.*

---

## Known Issues / Technical Debt

1. **`outputFileTracingRoot` in `next.config.ts` is an absolute path** (`/Users/piovella/Documents/AI projects/FoodTrack`). Will break on other machines. Acceptable for single-developer project; replace with `path.resolve(__dirname)` if CI is added.

2. **Firestore indexes not yet deployed.** `firestore.indexes.json` is written. Run `firebase deploy --only firestore:indexes` before the week strip range query and slot queries will work at scale.

3. **Firestore security rules not yet deployed.** `firestore.rules` is written. Run `firebase deploy --only firestore:rules` before the app is accessible to real users. Required before Milestone 4 testing.

3a. **`ANTHROPIC_API_KEY` not yet set.** Placeholder exists in `.env.local`. Must be populated before `/api/ai` route will function. Also set in Netlify dashboard before deploying.

4. **Google OAuth token (Drive access) expires in ~1 hour.** The token returned by `signInWithGoogle()` is stored in Zustand (runtime only). If a user tries to sync after an hour without re-authenticating, the Drive call will return 401. `HealthSyncService` (Milestone 6) will detect `DriveAuthError`, re-trigger `signInWithGoogle()`, and retry once.

5. **Mock `DayRepository.recompute()` does not query entries** — it preserves whatever totals were seeded. Full recompute logic is only tested via the Firestore implementation. Emulator-based integration tests are deferred but recommended before production.

---

## Next Milestone

**Milestone 7: Production readiness**

Scope: deployment, verification, and release. No new features.

Order of work:
1. Fix `outputFileTracingRoot` absolute path in `next.config.ts` (replace with `path.resolve(__dirname)`)
2. Deploy Firestore security rules: `firebase deploy --only firestore:rules`
3. Deploy Firestore composite indexes: `firebase deploy --only firestore:indexes`
4. Populate `ANTHROPIC_API_KEY` in `.env.local`; set all env vars in Netlify dashboard
5. Deploy to Netlify and verify the build succeeds (check WASM Content-Type header for sql-wasm.wasm)
6. PWA install test: install to Android home screen; confirm standalone display; verify icons load
7. Production smoke test: sign in → onboarding → log a meal via photo → log via text → check week screen → sync Health Connect (if Drive export available) → sign out → sign in again (profile persists)
8. Performance review: Lighthouse mobile score; bundle-size check; verify sql-wasm.wasm is not included in the main JS bundle
9. Accessibility review: keyboard navigation through onboarding and log flow; screen-reader label audit
10. Final cleanup: remove any `console.log` or placeholder comments; confirm no `.env.local` secrets in git
11. Decide whether to delete `src/lib/wearable/syncDrive.ts` (legacy/reference-only after M6)
12. Update `CLAUDE_CONTEXT.md` with release notes and deployed URL

---

**Milestone 7: Production readiness**

Scope: deployment, verification, and release. No new features.

Order of work:
1. Set Netlify environment variables: `ANTHROPIC_API_KEY`, Firebase config vars
2. Deploy Firestore security rules: `firebase deploy --only firestore:rules`
3. Deploy Firestore composite indexes: `firebase deploy --only firestore:indexes`
4. Deploy to Netlify and verify the build succeeds
5. PWA install test: install to Android home screen, confirm offline splash, verify `manifest.json` icons
6. Production smoke test: sign in → onboarding → log a meal via photo → log a meal via text → check week screen → sign out → sign in again (profile persists)
7. Performance review: Lighthouse mobile score; identify any obvious bundle-size issues
8. Accessibility review: keyboard navigation through onboarding and log flow; screen-reader label audit
9. Fix `outputFileTracingRoot` absolute path in `next.config.ts` (replace with `path.resolve(__dirname)`)
10. Final cleanup: remove any `console.log` or placeholder comments; confirm no `.env.local` secrets in git
11. Update `CLAUDE_CONTEXT.md` with release notes and deployed URL

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

### [2026-06-28] Provider-agnostic AI layer
**Decision:** `AIService` depends on `IAIProvider`, not on the Anthropic SDK directly. `AnthropicProvider` implements the interface. Future providers (OpenAI, Gemini, local models) require only a new implementation file — no changes to `AIService`, prompt modules, or the API route.  
**Alternatives considered:** Coupling `AIService` directly to `@anthropic-ai/sdk` (simpler, less indirection).  
**Why this:** Model vendor changes are a real operational risk (pricing, capability gaps, rate limits). The interface costs two files and zero runtime overhead; the coupling would cost a refactor touching every capability.

### [2026-06-28] `useHealthSync` as contract-only stub
**Decision:** `useHealthSync` exposes the full `{ phase, progress, lastSyncAt, error, startSync }` contract but `startSync` only sets an error string. Drive download, sql.js parsing, and `DayRepository.setActivity` wiring are deferred to Milestone 4.  
**Why this:** The sync flow requires the sync UI (progress feedback, error recovery, Drive token refresh prompt). Building it without the UI would produce untestable, unreachable code. The stub gives Milestone 4 a clean, tested contract to implement against without any rework to the store shape.

### [2026-06-28] Health Connect sync split into its own milestone (M6)
**Decision:** Health Connect / Google Drive integration (Drive download, SQL.js parse, token refresh, activity merge, error handling) is Milestone 6. Milestone 5 covers all user-facing UI. The Profile screen calls `useHealthSync()` and renders sync state; it does not own the implementation.  
**Alternatives considered:** Including sync in Milestone 5 alongside the full UI (original plan).  
**Why this:** The sync pipeline has distinct failure modes (401 token expiry, ZIP parse errors, network timeouts) that need careful error handling and UI feedback. Building it at the same time as every other screen adds test surface that is hard to isolate. The `useHealthSync` contract (already a stub with the right shape) gives M5 a clean seam — the Profile screen is fully buildable and testable without Drive being real. M6 then targets only the sync pipeline with focused scope.

### [2026-06-28] (app) route group for shared authenticated chrome
**Decision:** Main app screens (`/today`, `/week`, `/log`, `/insights`, `/profile`) live under `src/app/(app)/` with a shared `layout.tsx` that renders `<BottomNav />`. Login and onboarding are outside this group and are chrome-free.  
**Alternatives considered:** Conditional BottomNav in the root layout based on `usePathname` (simpler but adds runtime branching in a Server Component; requires client boundary at the layout level).  
**Why this:** Route groups are the App Router's intended mechanism for this pattern. The (app) layout stays a Server Component — only `BottomNav` (which needs `usePathname`) is a client component. No conditional logic at the layout level.

### [2026-06-28] Deleted src/dataconnect-generated/
**Decision:** Removed `src/dataconnect-generated/` directory and `"@dataconnect/generated"` from `package.json`.  
**Why this:** Firebase Data Connect auto-generated boilerplate from a movie-reviews tutorial, created during initial Firebase CLI setup. Nothing in FoodTrack imported it. Leaving it caused noise in `find src -type f` output and an orphaned package.json entry pointing to a local file path.

### [2026-06-28] cn() utility in src/lib/utils.ts
**Decision:** Added `cn(...)` helper (clsx + tailwind-merge) to `src/lib/utils.ts`. All components import from here.  
**Why this:** Both `clsx` and `tailwind-merge` were already installed. `cn` is the standard pattern for conditional + conflict-safe Tailwind class merging. Centralising it means components never duplicate the merge call and callers can safely pass arbitrary `className` overrides.

### [2026-06-28] Inline SVG icons in BottomNav (no icon library)
**Decision:** Nav icons are small inline SVGs defined directly in `BottomNav.tsx`. No icon package installed.  
**Alternatives considered:** `lucide-react` or `@heroicons/react` (not in the original package.json).  
**Why this:** Only 5 icons are needed for navigation. Adding a full icon library for 5 paths is unnecessary dependency weight for a PWA. If Milestone 5 needs more icons (e.g., camera, barcode, checkmark), a library can be added then with clear justification.

### [2026-06-28] ARCHITECTURE.md as permanent system-design document
**Decision:** Created `ARCHITECTURE.md` in the project root as a living architectural reference. `CLAUDE_CONTEXT.md` handles milestone progress; `ARCHITECTURE.md` handles system design.
**Why this:** CLAUDE_CONTEXT.md grows with each milestone and becomes hard to scan for architectural rules. A separate permanent document keeps design decisions stable and easy to reference in future sessions.

### [2026-06-28] AuthStatus in useUserStore prevents flash of unauthenticated content
**Decision:** Added `status: 'loading' | 'authenticated' | 'unauthenticated'` to `useUserStore`. `useAuth` sets `status` after Firebase auth resolves. `AuthGuard` waits for `status !== 'loading'` before routing.
**Why this:** Firebase auth state restores asynchronously from IndexedDB. Without a loading state, the guard incorrectly redirects to `/login` for ~200ms on every page load, causing a visible flash and navigation churn.

### [2026-06-28] Login page calls profileRepository directly for bootstrap routing
**Decision:** The login page calls `profileRepository.get(user.uid)` directly (not via `useProfile`) to decide whether to redirect to `/today` or `/onboarding` immediately after sign-in.
**Why this:** `useProfile` loads lazily on hook mount and doesn't expose the profile immediately. The login page needs the result synchronously within the sign-in handler before any re-render. This is the one permitted exception to the "hooks call repositories, not components" rule — justified because it's a one-time bootstrap check, not a recurring data access pattern.

### [2026-06-28] Log page wrapped in Suspense for useSearchParams
**Decision:** `LogPage` exports a `Suspense`-wrapped `LogContent` component because `useSearchParams()` requires a Suspense boundary in Next.js App Router.
**Why this:** Next.js throws a build-time error if `useSearchParams` is used outside a Suspense boundary in a page that is statically generated. The wrapper prevents this with zero behaviour change.

### [2025-06-28] SWC for Jest instead of ts-jest
**Decision:** `@swc/jest` for test transforms.  
**Alternatives considered:** `ts-jest` (standard, slower), Babel.  
**Why this:** SWC is significantly faster for large test suites. Next.js already uses SWC for its build. No type checking during tests (handled by `tsc --noEmit`).
