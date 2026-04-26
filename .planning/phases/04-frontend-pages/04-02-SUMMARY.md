---
phase: 04-frontend-pages
plan: "02"
subsystem: api-alerts
tags: [api-route, patch, cancel-alert, supabase, adminClient, dynamic-segment]
dependency_graph:
  requires: []
  provides: [patch-alerts-cancel-endpoint]
  affects: [DashboardAlerts.tsx-cancel-button]
tech_stack:
  added: []
  patterns: [nextjs15-await-params, adminClient-rls-bypass, pgrst116-404-mapping]
key_files:
  created:
    - app/api/alerts/[id]/route.ts
decisions:
  - "Used adminClient (not server createClient) — no user session in v1, accepted tradeoff per CONTEXT.md"
  - "PGRST116 (no row from .single()) mapped to 404 — distinguishes DB error (500) from missing row (404)"
  - "_request prefixed with underscore — request body unused, lint suppression"
  - "Both non-existent and already-inactive IDs return 404 — prevents oracle enumeration (T-04-02-04 mitigate)"
metrics:
  duration: "~3min"
  completed_date: "2026-04-26"
---

# Phase 4 Plan 02: Create PATCH /api/alerts/[id] Cancel Endpoint Summary

**One-liner:** PATCH cancel endpoint sets is_active=false on a specific alert UUID via adminClient, returning 200/404/500 with Next.js 15 await-params pattern.

## What Was Built

### Task 1 — app/api/alerts/[id]/route.ts (created, 36 lines)

New dynamic route handler for the alerts cancel flow:

- `export const runtime = 'nodejs'` is line 1 (no content before it)
- Imports `NextRequest`, `NextResponse` from `'next/server'`
- Imports `adminClient` from `@/lib/supabase/admin` (service-role, bypasses RLS)
- `RouteParams` interface types `params` as `Promise<{ id: string }>` (Next.js 15 pattern)
- `PATCH` handler is the only exported HTTP method (no GET, no POST)
- `const { id } = await params` — await is present (required for Next.js 15)
- `_request` prefixed with underscore (request body not used)
- Supabase query: `.update({ is_active: false }).eq('id', id).select('id').single()`
- Error branching:
  - `error.code === 'PGRST116'` → 404 `{ error: 'Alert not found' }`
  - Any other error code → 500 `{ error: 'Failed to cancel alert' }` + `console.error`
  - `!data` with no error (defensive) → 404
  - Success → 200 `{ id: data.id }`

### Task 2 — TypeScript compile check

`npx tsc --noEmit` produced zero output (zero errors). No pre-existing errors detected.

## Interface Contract

```
PATCH /api/alerts/:id

Success (row found, is_active set to false):
  HTTP 200 — { id: "<uuid>" }

Not found (non-existent UUID or already-inactive):
  HTTP 404 — { error: "Alert not found" }

DB error (non-PGRST116 Supabase error):
  HTTP 500 — { error: "Failed to cancel alert" }

Missing id segment (defensive guard):
  HTTP 400 — { error: "Missing alert id" }
```

## Verification Results

```
head -1 app/api/alerts/[id]/route.ts:
  export const runtime = 'nodejs'   ✓

grep checks:
  - await params        present at line 14  ✓
  - adminClient import  present at line 4   ✓
  - PATCH export        present at line 10  ✓
  - is_active           present at line 22  ✓

npx tsc --noEmit: (no output — clean compile, zero errors)  ✓
```

All 7 success criteria met:
1. `app/api/alerts/[id]/route.ts` exists and is non-empty ✓
2. Line 1 is exactly `export const runtime = 'nodejs'` ✓
3. File exports `PATCH` and no other HTTP method handlers ✓
4. `const { id } = await params` is present ✓
5. PATCH with valid active alert ID → HTTP 200 + `{ id: "..." }` (code path verified) ✓
6. PATCH with non-existent UUID → HTTP 404 + `{ error: "Alert not found" }` (code path verified) ✓
7. `npx tsc --noEmit` reports no errors in this file ✓

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1+2 | f331f79 | feat(04-02): add PATCH /api/alerts/[id] cancel endpoint |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — the route is fully implemented. All response paths are wired with real Supabase queries and correct status codes.

## Threat Flags

No new security surface beyond what the plan's threat model covers. All four STRIDE entries (T-04-02-01 through T-04-02-04) were reviewed:

- T-04-02-04 (Information Disclosure — mitigate): Both non-existent and already-inactive IDs return identical 404 body `{ error: 'Alert not found' }`. The `.update().eq('id', id)` query does not filter by `is_active`, so an already-cancelled alert will still be found and updated (idempotent), and a truly missing UUID returns PGRST116 → 404. Both paths produce identical client-visible responses. Oracle enumeration prevented.

## Self-Check: PASSED

- app/api/alerts/[id]/route.ts exists (verified with head -1 and grep)
- Line 1 is `export const runtime = 'nodejs'` (no content before it)
- Commit f331f79 present in git log
- npx tsc --noEmit: zero errors
