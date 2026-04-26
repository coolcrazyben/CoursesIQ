---
phase: 04-frontend-pages
plan: "03"
subsystem: frontend
tags: [react, next.js, forms, phone-validation, tailwind, supabase]
dependency_graph:
  requires:
    - "04-01"  # layout.tsx with bg-maroon token
    - "04-02"  # POST /api/alerts and PATCH cancel endpoint
  provides:
    - components/AlertForm.tsx
    - app/page.tsx (homepage)
  affects:
    - app/layout.tsx (AlertForm renders inside layout)
tech_stack:
  added:
    - libphonenumber-js (phone number parsing and E.164 normalization, client-safe)
  patterns:
    - React useState for multi-field form state management
    - Client-side phone validation before network request (UI-04)
    - Server component fetching Supabase count + rendering client component child
    - export const dynamic = 'force-dynamic' for uncached server render
key_files:
  created:
    - components/AlertForm.tsx (198 lines)
  modified:
    - app/page.tsx (47 lines, rewritten from scaffold)
    - package.json (libphonenumber-js added)
decisions:
  - libphonenumber-js was not in package.json — installed as Rule 3 auto-fix (blocking tsc)
  - TCPA text placed immediately below phone input, before phone error message
  - success state replaces entire form (conditional render before form return)
metrics:
  duration: "~155s"
  completed: "2026-04-26"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 2
---

# Phase 4 Plan 03: AlertForm Component + Homepage Summary

**One-liner:** Client-side AlertForm with libphonenumber-js E.164 validation + async server homepage with live Supabase alert count and maroon hero.

## What Was Built

### Task 1 — components/AlertForm.tsx (198 lines)

A `'use client'` React form component that handles the full alert registration flow:

- **Five fields:** CRN (required), Subject (required, auto-uppercased on change), Course Number (required), Phone Number (required, type="tel"), Email (optional, type="email")
- **Phone validation:** `parsePhoneNumber(phone, 'US')` from `libphonenumber-js` fires BEFORE any `fetch()` call — if invalid or throws, `setPhoneError` is called and the function returns without making a network request
- **E.164 normalization:** `parsed.number` (not raw user input) is sent as `phone_number` in the POST body
- **Success state:** Replaced the entire form with a green confirmation div — form is not kept visible
- **Error handling:** 201 → success state; 409 → "already have active alert" message; other errors → server error message; network failure → connection error message
- **TCPA text (locked):** "By submitting, you consent to receive SMS alerts. Message & data rates may apply. Reply STOP to unsubscribe." — appears immediately below the phone input
- **Submit button:** `bg-maroon` class, disabled during `submitting` state
- **Mobile-first:** All inputs `w-full` with `py-3` tap targets
- **Helper note:** Links to `mybanner.msstate.edu` explaining where to find CRN/Subject/Course Number

### Task 2 — app/page.tsx (47 lines, complete rewrite)

An async server component replacing the Next.js create-next-app scaffold:

- **`export const dynamic = 'force-dynamic'`** at module scope — prevents caching, ensures live count on every request
- **Live count query:** `adminClient.from('alerts').select('*', { count: 'exact', head: true }).eq('is_active', true)`
- **Graceful fallback:** `activeCount = error ? 0 : (count ?? 0)` — never crashes on Supabase errors
- **Count conditional:** `{activeCount > 0 && ...}` — hides counter on fresh deploy with zero alerts
- **Hero section:** `bg-maroon` full-bleed with white text
  - Headline: "Never miss an open seat at MSU."
  - Subtext: "We text you the second a seat opens in your course — before anyone else knows. No account. No app. Completely free."
- **Singular/plural:** `{activeCount === 1 ? 'student is' : 'students are'}`
- **Number formatting:** `.toLocaleString()` for comma-separated thousands
- **AlertForm** imported from `@/components/AlertForm` as client component child

## Hero Copy Used

**Headline:** "Never miss an open seat at MSU."

**Subtext:** "We text you the second a seat opens in your course — before anyone else knows. No account. No app. Completely free."

**Count line (when activeCount > 0):** "{n} student(s) is/are watching for open seats right now."

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing libphonenumber-js package**
- **Found during:** TypeScript check after Task 2 commit
- **Issue:** `components/AlertForm.tsx` imports `parsePhoneNumber` from `libphonenumber-js`, but the package was not listed in `package.json`. `tsc --noEmit` reported `error TS2307: Cannot find module 'libphonenumber-js'`.
- **Fix:** `npm install libphonenumber-js` — package installed and `package.json`/`package-lock.json` updated
- **Files modified:** `package.json`, `package-lock.json`
- **Commit:** `617b363`

No other deviations — implementation followed the plan spec exactly.

## Verification Results

### TypeScript Check

```
npx tsc --noEmit
(no output — clean pass)
```

### Grep Verification

```
grep -n "force-dynamic" app/page.tsx
4:export const dynamic = 'force-dynamic'

grep -n "use client" components/AlertForm.tsx
1:'use client'

grep -c "STOP to unsubscribe" components/AlertForm.tsx
1
```

## Key Interfaces

### AlertForm

```typescript
// No props — standalone component
export default function AlertForm(): JSX.Element

// Internal state:
// crn, subject, courseNumber, phone, email: string
// status: 'idle' | 'submitting' | 'success' | 'error'
// errorMessage: string
// phoneError: string
```

### app/page.tsx

```typescript
export const dynamic = 'force-dynamic'
export default async function HomePage(): Promise<JSX.Element>
// No props — server component, fetches its own data
```

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | `4a0e81d` | feat(04-03): create AlertForm client component with phone validation and TCPA text |
| Task 2 | `84f29ca` | feat(04-03): replace app/page.tsx with homepage — hero, live alert count, AlertForm |
| Fix | `617b363` | chore(04-03): install libphonenumber-js — required by AlertForm phone validation |

## Known Stubs

None — both components are fully wired:
- AlertForm posts to live `/api/alerts` endpoint (created in Plan 02)
- app/page.tsx queries live Supabase `alerts` table via `adminClient`

## Threat Flags

No new threat surface beyond what the plan's threat model covers. `adminClient` import in `app/page.tsx` is server-only guarded. AlertForm sends user input through React state (no `dangerouslySetInnerHTML`).

## Self-Check: PASSED

- `components/AlertForm.tsx` exists: FOUND
- `app/page.tsx` exists: FOUND
- Commit `4a0e81d` exists: FOUND
- Commit `84f29ca` exists: FOUND
- Commit `617b363` exists: FOUND
- `tsc --noEmit`: no errors
