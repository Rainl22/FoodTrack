# FoodTrack — Architecture

This is the permanent system-design reference for FoodTrack. Update it when the architecture changes. For project progress and milestone status, see `CLAUDE_CONTEXT.md`.

---

## Overview

FoodTrack is a mobile-first PWA built on Next.js 15 (App Router). Users log meals by photo, text, or barcode; an AI vision model estimates macros; the app tracks nutrition against personalised daily targets optionally adjusted for training activity from Health Connect.

Three external integrations:
- **Firebase** — Authentication, Firestore (offline-first), Storage
- **Anthropic Claude API** — meal analysis (server-side only, key never in client bundle)
- **Google Drive + Health Connect** — wearable data sync (client-side, user-owned data, Milestone 6)

---

## Layering and Dependency Direction

Dependency runs strictly downward. No layer may import from a layer above it.

```
┌────────────────────────────────────────────────────────┐
│  App Pages (Next.js App Router)                        │  route-level; call hooks, render components
├────────────────────────────────────────────────────────┤
│  Feature Components (nutrition/, logging/, etc.)       │  screens & forms; call hooks; no repo imports
├────────────────────────────────────────────────────────┤
│  Primitive Components (components/ui/)                 │  stateless; zero app coupling; tokens only
├────────────────────────────────────────────────────────┤
│  Hooks (useAuth, useProfile, useDayData, …)            │  bridge: repositories ↔ stores
│  Stores (Zustand: useUserStore, useDayStore, …)        │  runtime state; never persisted
├────────────────────────────────────────────────────────┤
│  Repository interfaces (IXxxRepository)                │  persistence contracts
│  Repository implementations (lib/firestore/)           │  call Firebase SDK
├────────────────────────────────────────────────────────┤
│  Domain layer (types/, lib/nutrition/, lib/ai/)        │  zero React / Firebase / app imports
└────────────────────────────────────────────────────────┘
```

**Hard rules:**
- **Components** may import from `ui/`, `hooks/`, `store/`, `types/`. They may **not** import from `lib/firestore/` or `repositories/`.
- **Hooks** import from `lib/firestore` (the singleton factory index) and update stores. They do not render.
- **Domain layer** has no React, no Firebase, no Firestore. It is pure TypeScript and can be unit-tested without mocking.
- **API route** (`app/api/ai/route.ts`) is the only place the Anthropic key is used. It never reaches the client bundle.

---

## Core Design Principles

1. **Entry is the core object.** `Entry.type` is the primary classifier (`meal | drink | supplement | snack | recipe`). `Entry.slot` is optional presentation metadata. New categories extend the enum, not the schema.

2. **Entries are the source of truth.** `days/{date}` is a recomputable aggregate cache. When entries and day aggregates diverge, entries win. Day documents are never written from UI code.

3. **Domain layer is persistence-agnostic.** Types in `src/types/` and computation in `src/lib/nutrition/` have zero Firestore or React imports. They are pure TypeScript with co-located unit tests.

4. **Repository layer decouples persistence from app logic.** Hooks call repository interfaces defined in `src/repositories/`. The Firestore implementation lives entirely in `src/lib/firestore/`. Swapping the backend touches only that directory.

5. **No `userId` in Firestore documents.** Ownership is the path uid. Security rules are path-based. Denormalised `userId` fields can drift; path ownership cannot.

6. **Business logic is free of React.** Nutrition engine, target calculations, AI response mapping, wearable parsing — all pure TypeScript modules.

7. **Reuse before creating.** Check `src/components/ui/` first. Add a CVA variant before a new component. Create a new component only when the pattern is genuinely not a variant of anything existing.

8. **Zod validates all external data.** Claude API responses, Firestore writes, and user form inputs all pass through Zod schemas before touching domain logic.

9. **No localStorage as source of truth.** Firestore is source of truth. Zustand is runtime-only. The Firestore offline IndexedDB cache is an acceptable temporary offline layer only.

10. **Wearable data is user-owned.** Samsung Health → Health Connect → Google Drive → FoodTrack client. Raw exports never touch FoodTrack servers. Parsed `DayActivity` is written to Firestore by the client.

---

## Source-of-Truth Rules

| Data                  | Source of truth                       | Notes                                          |
|-----------------------|---------------------------------------|------------------------------------------------|
| Nutrition entries     | Firestore `users/{uid}/entries/`      | IndexedDB for offline reads                    |
| Daily aggregates      | Firestore `users/{uid}/days/`         | Derived cache; always recomputable from entries |
| Meal photos           | Firebase Storage                      | URL stored on the entry document               |
| Wearable exports      | Google Drive (user-owned)             | Never stored by FoodTrack servers              |
| Parsed wearable data  | Firestore `days/{date}.activity`      | Written by the sync pipeline client-side       |
| User profile          | Firestore `users/{uid}/profile/main`  | Targets stored flattened for direct reads      |
| Runtime app state     | Zustand (never persisted)             | Rehydrates from Firestore on auth              |
| Drive token           | Zustand `useUserStore.driveToken`     | Runtime only; never localStorage or Firestore  |

---

## Firestore Architecture

### Security model

All user data lives under `users/{uid}/`. No document contains a `userId` field.

```
match /users/{uid}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

### Collections

| Path                           | Type        | Notes                                        |
|--------------------------------|-------------|----------------------------------------------|
| `users/{uid}/profile/main`     | singleton   | Targets flattened to top-level fields        |
| `users/{uid}/entries/{id}`     | collection  | Source of truth; totals cached from items    |
| `users/{uid}/days/{YYYY-MM-DD}`| collection  | Maintained aggregate cache                   |

### Repository pattern

```
IProfileRepository  ←  FirestoreProfileRepository
IEntryRepository    ←  FirestoreEntryRepository
IDayRepository      ←  FirestoreDayRepository
```

Hooks import from `src/lib/firestore/index.ts` (the singleton factory). Individual implementation files are never imported directly outside that directory.

### Invariants

- Any entry create / update / delete triggers `DayRepository.recompute()` for that date.
- `days/{date}` is never written from UI code.
- Entry `totalCalories` (and other totals) are always computed from `items` by the repository before saving.

### Composite indexes

- `entries`: `(date ASC, timestamp ASC)` — used by date-range listing
- `entries`: `(date ASC, slot ASC)` — used by slot filtering

---

## Domain Model

```
UserProfile
  ├── personal: name, dateOfBirth, sex
  ├── body: heightCm, weightKg
  ├── preferences: goal, activityLevel, weeklyTrainingDays
  ├── computed: bmr, tdee
  ├── targets: MacroTargets { calorieTarget, proteinTargetG, carbsTargetG, fatTargetG }
  └── sync: healthConnectEnabled, lastSyncAt, onboardingComplete

Entry  (source of truth)
  ├── type: 'meal' | 'drink' | 'supplement' | 'snack' | 'recipe'
  ├── slot?: 'breakfast' | 'lunch' | 'dinner' | 'snacks'
  ├── items: FoodItem[]   ← each item has calories, proteinG, carbsG, fatG, portionDescription
  ├── totalCalories, totalProteinG, totalCarbsG, totalFatG  ← cached from items
  ├── inputMethod: 'photo' | 'text' | 'barcode' | 'manual'
  └── aiMeta?: AIMeta { model, confidence, notes, handReference }

DayAggregate  (derived cache; recomputed on every entry mutation)
  ├── totals: MacroTotals   ← sum of all entries for the date
  ├── adjustedTargets?: AdjustedTargets   ← set after wearable sync
  └── activity?: DayActivity { steps, activeCaloriesKcal, trainingDay, trainingType, … }
```

`Entry.date` is the accounting day (YYYY-MM-DD). `Entry.timestamp` is the actual log time. An entry logged at 00:30 still belongs to the previous calendar day via `date`.

---

## AI Architecture

### Provider abstraction

```
src/lib/ai/
  providers/
    IAIProvider.ts          ← interface: complete(request) → response
    AnthropicProvider.ts    ← implements IAIProvider via @anthropic-ai/sdk
  prompts/
    mealAnalysis.ts         ← system prompt, request builders, response mapper
  service.ts                ← AIService: capability dispatch → provider → Zod parse → domain result
  client.ts                 ← client-side helper: fetch('/api/ai', …)
```

`AIService` depends on `IAIProvider`. Swapping from Anthropic to another model requires only a new `IAIProvider` implementation — no changes to `AIService`, prompt modules, or the API route.

### Capability model

Capabilities (`analyze_meal_photo`, `analyze_meal_text`) are defined in `src/lib/validation/mealAnalysis.ts`. Each capability maps to a prompt module that builds the request and parses the response.

### API route

`src/app/api/ai/route.ts` is the only server-side entry point. The Anthropic API key (`ANTHROPIC_API_KEY`) never leaves the server. The client POSTs `{ capability, payload }` via `src/lib/ai/client.ts` and receives `{ ok, capability, result }`.

---

## Health Sync Architecture

### Target design (Milestone 6)

The sync pipeline follows strict layer separation:

```
┌───────────────────────────────────────────────────────────────┐
│  Profile screen / SyncButton  (UI)                            │
│  ↓ startSync()                                                │
├───────────────────────────────────────────────────────────────┤
│  useHealthSync  (hook)                                        │
│  Exposes: { phase, progress, lastSyncAt, error, startSync }   │
│  Reads from useSyncStore; calls HealthSyncService             │
│  No business logic                                            │
├───────────────────────────────────────────────────────────────┤
│  HealthSyncService  (lib/healthSync/HealthSyncService.ts)     │
│  Orchestrates the pipeline; owns retry logic, error class.    │
│  Emits progress via useSyncStore                              │
├───────────────────────────────────────────────────────────────┤
│  GoogleDriveClient  (lib/healthSync/GoogleDriveClient.ts)     │
│  Drive file listing, ZIP download, token refresh              │
├───────────────────────────────────────────────────────────────┤
│  HealthConnectParser  (lib/healthSync/HealthConnectParser.ts) │
│  SQL.js parse → WearableDayRecord[] → DayActivity (pure)      │
├───────────────────────────────────────────────────────────────┤
│  DayRepository.setActivity(uid, date, activity, targets)      │
└───────────────────────────────────────────────────────────────┘
```

**Layer responsibilities:**
- `useHealthSync` — state and action dispatch only; zero business logic
- `HealthSyncService` — orchestration, retry, progress emission
- `GoogleDriveClient` — Drive API calls and token management
- `HealthConnectParser` — pure parsing; no network, no Firestore; unit-testable
- `DayRepository` — persistence (already implemented)

The hook's public contract (`{ phase, progress, lastSyncAt, error, startSync }`) is stable. UI components that consume `useHealthSync` are unaffected when the implementation changes in Milestone 6.

### Current status (Milestone 5)

`useHealthSync` is a contract-only stub. `startSync()` sets an error message. Milestone 6 replaces the stub body without changing the exported interface.

---

## State Management

### Zustand stores (runtime only — never persisted)

| Store          | State                                                      |
|----------------|------------------------------------------------------------|
| `useUserStore` | `status`, `user`, `profile`, `driveToken`                  |
| `useDayStore`  | `activeDate`, `entries`, `day`, `isLoading`, `error`       |
| `useSyncStore` | `phase`, `progress`, `lastSyncAt`, `error`                 |

### Hook pattern

Hooks are the bridge between repositories and stores:
- Load data from repositories on mount / when dependencies change
- Write data to repositories on user action
- Set store state after successful reads/writes
- Own no duplicated logic — components call hooks, not repositories

### Auth state lifecycle

```
App mounts
  → useAuth() subscribes to Firebase auth (in Providers.tsx)
  → useUserStore.status = 'loading'
  → Firebase resolves:
      user found  → status = 'authenticated',  setUser(user)
      no user     → status = 'unauthenticated', clear()
  → AuthGuard reads status and routes:
      loading         → spinner (prevents flash)
      unauthenticated → redirect to /login
      authenticated   → render children
```

---

## UI Architecture

### Design tokens

All visual values come from `tailwind.config.ts`. Components must never use hardcoded colors, spacing, radii, shadows, or typography.

Key token groups:
- **Colors**: `brand-*`, `accent-*`, `surface-*`, `text-*`, `macro-{protein,carbs,fat}-*`, `cta`, `success`, `warning`, `error`, `info`
- **Spacing**: `nav-height` (68px), `topbar-height` (56px), `safe-bottom`, `safe-top`
- **Radii**: `rounded-card`, `rounded-chip`, `rounded-input`, `rounded-btn`
- **Shadows**: `shadow-card`, `shadow-sheet`

### Primitive components (`src/components/ui/`)

Stateless, typed, zero app coupling. Accept `className` for overrides. Built with `class-variance-authority` for typed variants. `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge) is the standard for class composition.

Available primitives: `Button`, `Card`, `Input`, `Chip`, `Badge`, `Avatar`, `ProgressBar`, `Ring`, `Slider`, `Spinner`, `Toast`, `Stepper`, `BottomSheet`, `Dialog`.

### Composition rules

```
pages         call hooks, render feature components
feature       call hooks, compose primitives; no direct repository imports
primitives    use design tokens only; no hooks, no stores, no repositories
```

### Route groups

| Group        | Chrome           | Auth guard |
|--------------|------------------|------------|
| `(app)/`     | BottomNav        | Yes        |
| `(auth)/`    | None             | No         |
| `onboarding/`| None             | Soft (redirects to /today if already onboarded) |

### TopBar convention

TopBar is rendered inside each page, not in the shared layout. This gives each page control over title and action buttons. Pages add `pt-[56px]` padding to the first content block.

---

## Folder Conventions

```
src/
  app/                    Next.js App Router — pages and API routes only
    (app)/                Authenticated screens; shared BottomNav
    (auth)/               Chrome-free auth screens
    api/ai/               Server-side AI route (key never in client)

  components/
    ui/                   Reusable primitives (zero app coupling)
    navigation/           BottomNav, TopBar
    nutrition/            App-specific nutrition UI
    logging/              Meal logging flow components
    onboarding/           Onboarding step forms
    sync/                 Health Connect sync UI

  config/                 Constants, feature flags (no React)
  hooks/                  Custom React hooks (repositories ↔ stores bridge)
  lib/
    ai/                   Provider abstraction, prompts, client helper
    firebase/             Firebase init, auth helpers, Storage helpers
    firestore/            Repository implementations, mappers, schema
    healthSync/           (Milestone 6) Sync service, Drive client, parser
    nutrition/            Pure nutrition engine (BMR, TDEE, targets, adjust, totals)
    validation/           Zod schemas for all external data
    wearable/             Health Connect ZIP/SQL parser (Milestone 6)
  repositories/           Repository interfaces + mock implementations
  store/                  Zustand stores
  styles/                 globals.css
  types/                  Domain types (no React, no Firebase)
```

---

## Testing Philosophy

- **Domain layer**: exhaustively unit-tested. Pure functions; no mocks.
- **Repository layer**: tested via mock implementations in `src/repositories/mock/`. Mocks enforce the same interface contracts as Firestore, making them trustworthy test doubles.
- **Validation schemas**: tested with valid and invalid fixtures to document boundary behaviour.
- **AI mapper**: tested by parsing known fixture AI responses through the Zod schema and mapper.
- **Component layer**: not unit-tested at this stage. Correctness is verified by running the app. No Firebase or AI SDK mocking in tests — network-dependent tests fail silently and give false confidence.

---

## Dependency Summary

```
pages
  → feature components → primitive components (tokens only)
  → hooks → repositories (IXxx interfaces) → Firestore implementations
  → stores (Zustand, runtime)

src/app/api/ai/route.ts
  → AIService → IAIProvider → AnthropicProvider (@anthropic-ai/sdk)

hooks → lib/firestore/index.ts  (singleton factory; the only entry point from hooks)
      → lib/nutrition/          (pure functions)

types/         ← no dependencies
lib/nutrition/ ← types/ only
lib/ai/        ← types/, lib/validation/
lib/firestore/ ← types/, lib/validation/, lib/nutrition/
```
