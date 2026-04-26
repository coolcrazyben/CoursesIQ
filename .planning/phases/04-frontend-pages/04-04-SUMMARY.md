---
phase: 04-frontend-pages
plan: "04"
subsystem: frontend
tags: [dashboard, cancel-flow, phone-lookup, server-component, client-component]
dependency_graph:
  requires: ["04-01", "04-02", "04-03"]
  provides: ["dashboard-page", "dashboard-alerts-component"]
  affects: ["app/dashboard/page.tsx", "components/DashboardAlerts.tsx"]
tech_stack:
  added: []
  patterns:
    - "RSC passes server-fetched data as prop to client component"
    - "Next.js 15 searchParams as Promise — must await"
    - "Optimistic UI removal with rollback on failure"
    - "Two-click confirm pattern for destructive actions"
    - "Plain GET form for zero-JS server-side navigation"
key_files:
  created:
    - path: components/DashboardAlerts.tsx
      lines: 101
      description: "'use client' component — renders alert list with two-click cancel and optimistic removal"
    - path: app/dashboard/page.tsx
      lines: 87
      description: "Async server component — phone lookup form, E.164 normalization, Supabase query, DashboardAlerts render"
  modified: []
decisions:
  - "Rollback on PATCH failure restores full initial prop (simplest v1 approach per RESEARCH.md Q3)"
  - "Plain GET form (no useState/router.push) — server component re-runs on submission, zero JS required"
  - "Alert type declared in both files independently — no shared types module exists yet"
  - "handleCancelClick wrapper resets confirmingId when user switches to a different alert's cancel button"
metrics:
  duration: 76s
  completed: "2026-04-26"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Phase 4 Plan 04: Dashboard Alerts Page Summary

**One-liner:** Dashboard server page with E.164-normalized phone lookup feeding a two-click optimistic-cancel client component.

## What Was Built

### components/DashboardAlerts.tsx (101 lines)

A `'use client'` component that receives `alerts: Alert[]` as a prop from the server component. Manages local state for the alerts list (initialized from prop), `confirmingId` (which alert's cancel button is armed), and `cancelError` (error banner on PATCH failure).

**Two-click cancel flow:**
1. First click on "Cancel alert" → `setConfirmingId(id)`, button text changes to "Confirm cancel?", button turns red (`bg-red-600`)
2. Second click on same button → optimistic `setAlerts(prev.filter(a => a.id !== id))` fires immediately (before fetch resolves), then `fetch('/api/alerts/${id}', { method: 'PATCH' })`
3. On PATCH failure (non-ok response or network error) → `setAlerts(initial)` restores the full original prop
4. Clicking a different alert's cancel while one is armed → `confirmingId` resets to the new alert's id

**Empty state:** Renders `<p>No active alerts found for this number.</p>` (not an empty `<ul>`) when `alerts.length === 0`.

**Display:** `course_name ?? \`${subject} ${course_number}\`` with CRN below. Mobile-first layout: `flex-col` stacking on small screens, `flex-row` on `sm+`.

### app/dashboard/page.tsx (87 lines)

An async server component (no `'use client'`). Reads `searchParams` via `const { phone } = await searchParams` — the `await` is mandatory in Next.js 15 where searchParams is a Promise.

**Phone normalization:** `fetchAlertsForPhone(rawPhone)` wraps `parsePhoneNumber(rawPhone, 'US')` from libphonenumber-js. Input like "601-555-1234" or "(601) 555-1234" normalizes to "+16015551234" before the Supabase `.eq('phone_number', e164)` call. Invalid or unparseable input returns `[]` immediately (no query runs).

**Supabase query:** Selects `id, crn, subject, course_number, course_name, created_at` where `phone_number = e164 AND is_active = true`, ordered by `created_at DESC`. Logs errors to console but returns `[]` — page never throws.

**Phone lookup form:** Plain `<form method="GET" action="/dashboard">` — causes full-page server navigation that re-runs the async component. No JavaScript required. `defaultValue={phone ?? ''}` pre-fills the input with the current lookup value.

**Results section:** Guarded by `hasSearched = Boolean(phone)` — not shown until form is submitted. Passes `alerts` to `<DashboardAlerts alerts={alerts} />`.

## Interface Contract

```typescript
// DashboardAlerts props
interface Props {
  alerts: Alert[]
}

type Alert = {
  id: string
  crn: string
  subject: string
  course_number: string
  course_name: string | null
  created_at: string
}

// DashboardPage export
export default async function DashboardPage({ searchParams }: PageProps): Promise<JSX.Element>
```

## Phone Normalization Behavior

| Input | Result |
|-------|--------|
| "601-555-1234" | "+16015551234" (normalized, query runs) |
| "(601) 555-1234" | "+16015551234" (normalized, query runs) |
| "6015551234" | "+16015551234" (normalized, query runs) |
| "+16015551234" | "+16015551234" (already E.164, query runs) |
| "abc" | `[]` returned (no query) |
| "123" | `[]` returned (invalid, no query) |
| "" | `fetchAlertsForPhone` not called (phone is falsy) → `[]` |

## Deviations from Plan

None — plan executed exactly as written. Both files match the spec verbatim.

## Verification Results

**TypeScript check (`npx tsc --noEmit`):** Zero errors — clean output.

**Content verification:**
- `components/DashboardAlerts.tsx` line 1: `'use client'`
- `app/dashboard/page.tsx` line 45: `const { phone } = await searchParams`
- `parsePhoneNumber` called at line 21 before Supabase query at line 28
- `DashboardAlerts` imported and rendered at line 82 with `alerts={alerts}` prop
- No `adminClient` import in DashboardAlerts.tsx
- No `'use client'` in app/dashboard/page.tsx

**Commits:**
- `c6a4eb3` feat(04-04): create DashboardAlerts client component with two-click cancel
- `ede6f88` feat(04-04): create dashboard page with phone lookup and alert list

## Known Stubs

None — both components are fully wired. DashboardAlerts renders real prop data; dashboard/page.tsx queries real Supabase data via adminClient.

## Threat Flags

No new threat surface beyond what is documented in the plan's threat model. Phone input sanitized via parsePhoneNumber (T-04-04-02 mitigated). Course data rendered as React text nodes (T-04-04-05 mitigated).

## Self-Check: PASSED

- `components/DashboardAlerts.tsx` — FOUND
- `app/dashboard/page.tsx` — FOUND
- Commit `c6a4eb3` — FOUND
- Commit `ede6f88` — FOUND
- `npx tsc --noEmit` — zero errors
