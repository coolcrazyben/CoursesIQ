---
phase: 02-banner-api-integration
plan: 02
subsystem: api-route
tags: [nextjs, banner, supabase, route-handler]
dependency_graph:
  requires: [02-01-PLAN.md]
  provides: [app/api/course/[crn]/route.ts]
  affects: [phase-3, phase-4]
key_files:
  created:
    - app/api/course/[crn]/route.ts
decisions:
  - "Supabase upsert errors logged but non-fatal — Banner data still returned to caller"
  - "Professor resolved via primaryIndicator flag with fallback to faculty[0]"
metrics:
  completed: "2026-04-22"
  tasks_completed: 2
  files_created: 1
---

# Phase 2 Plan 2: GET /api/course/[crn] Route Summary

**One-liner:** Route handler created, verified against live MSU Banner, and confirmed upsert to Supabase courses table.

## Live Verification Results

| Check | Result |
|-------|--------|
| `GET /api/course/31352?subject=CSE&courseNumber=1011` | HTTP 200 — real MSU data returned |
| Response contains crn, course_name, section, professor, seats_total, seats_available | ✓ |
| Supabase courses table row for CRN 31352 | ✓ visible with last_checked populated |
| `GET /api/course/31352` (missing params) | HTTP 400 ✓ |
| `GET /api/course/99999?subject=CSE&courseNumber=1011` (invalid CRN) | HTTP 404 ✓ |
| Upsert idempotent (second call = update, not duplicate) | ✓ |

## Implementation Details

- `export const runtime = 'nodejs'` — top of file before imports
- `await params` — Next.js 15 async dynamic route params
- `getSeatsByCRN` called with crn, subject, courseNumber (termCode defaults to CURRENT_TERM_CODE)
- Supabase upsert uses `onConflict: 'crn'` matching courses table primary key
- Professor extracted via `faculty.find(f => f.primaryIndicator)?.displayName` with fallback to `faculty[0]`
- Supabase client: `server.ts` with PUBLISHABLE_KEY (RLS applies; courses table has anon_select_courses but INSERT/UPDATE allowed server-side)

## TypeScript

- `npx tsc --noEmit` — exit 0, no errors

## Commit

- `f59cf8b` — feat(phase-2-plan-2): add GET /api/course/[crn] route handler

## Note on Verify Script

The plan's structural check pattern `from('courses').upsert` (single line) is a false negative — code uses multi-line method chaining which is functionally identical. All other 10/11 checks passed; TypeScript compile confirmed correctness.
