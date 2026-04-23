---
phase: 02-banner-api-integration
plan: 01
subsystem: banner-client
tags: [banner, ssb, axios, tough-cookie, session-management, typescript]
dependency_graph:
  requires: [lib/banner.ts (Phase 1 stub), package.json (axios, tough-cookie, axios-cookiejar-support)]
  provides: [lib/constants.ts, lib/banner.ts (full implementation)]
  affects: [app/api/seats (Plan 02-02), cron worker, alert system]
tech_stack:
  added: []
  patterns:
    - Module-level CookieJar singleton for JSESSIONID persistence across calls in one process
    - axios-cookiejar-support wrapper pattern for automatic cookie injection on all requests
    - Client-side CRN filter (Banner txt_courseReferenceNumber param is broken at MSU)
    - Session expiry detection via totalCount === 0 with single retry guard (isRetry flag)
    - resetDataForm POST before each GET to clear server-side subject filter bleed
key_files:
  created:
    - lib/constants.ts
  modified:
    - lib/banner.ts
decisions:
  - "D-02-01: establishSession returns Promise<void> not Promise<string> — the plan stub returned string but the implementation has nothing meaningful to return; void is the correct type for a side-effecting session setup call"
metrics:
  duration: "81 seconds (~1.5 minutes)"
  completed: "2026-04-23"
  tasks_completed: 2
  files_created: 1
  files_modified: 1
---

# Phase 2 Plan 01: Banner SSB Client Summary

**One-liner:** Module-level CookieJar axios client targeting mybanner.msstate.edu with JSESSIONID session management, client-side CRN filtering, and totalCount===0 session expiry recovery.

## Tasks Completed

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | Create lib/constants.ts with term code and Banner base URL | Done | 2fcac2c |
| 2 | Replace lib/banner.ts with full Banner SSB client | Done | 2fcac2c |

## Files Created / Modified

### lib/constants.ts (new)

```typescript
export const BANNER_BASE_URL =
  'https://mybanner.msstate.edu/StudentRegistrationSsb/ssb'

export const CURRENT_TERM_CODE = '202630'
```

### lib/banner.ts (full replacement of Phase 1 stub)

**Exports:**

```typescript
export interface BannerSeatData {
  courseReferenceNumber: string
  courseNumber: string
  subject: string
  sequenceNumber: string
  courseTitle: string
  maximumEnrollment: number
  enrollment: number
  seatsAvailable: number
  waitCount: number
  waitAvailable: number
  openSection: boolean
  faculty: Array<{
    displayName: string
    primaryIndicator: boolean
  }>
}

export async function establishSession(
  termCode: string = CURRENT_TERM_CODE
): Promise<void>

export async function getSeatsByCRN(
  crn: string,
  subject: string,
  courseNumber: string,
  termCode: string = CURRENT_TERM_CODE
): Promise<BannerSeatData | null>
```

**Internal (not exported):**

```typescript
async function resetDataForm(): Promise<void>

async function fetchWithRecovery(
  crn: string,
  subject: string,
  courseNumber: string,
  termCode: string,
  isRetry: boolean
): Promise<BannerSeatData | null>
```

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| File existence | ls lib/constants.ts lib/banner.ts | Both present |
| TypeScript compile | npx tsc --noEmit | Exit 0, no errors — first attempt |
| BANNER_BASE_URL correct | structural check | mybanner.msstate.edu confirmed |
| CURRENT_TERM_CODE | structural check | '202630' confirmed |
| No stub throws | structural check | "Not implemented" absent |
| BannerSeatData exported | structural check | Present |
| establishSession exported | structural check | Present |
| getSeatsByCRN exported | structural check | Present |
| Client-side CRN filter | structural check | courseReferenceNumber === crn present |
| Session expiry check | structural check | totalCount === 0 present |
| isRetry guard | structural check | isRetry present |
| resetDataForm | structural check | Present |
| 10s timeout | structural check | timeout: 10000 present |
| CookieJar | structural check | CookieJar present |

**npx tsc --noEmit passed on first attempt — no fixes required.**

## Deviations from Plan

### Deviation 1: establishSession returns Promise<void> instead of Promise<string>

- **Found during:** Task 2 implementation
- **Issue:** The Phase 1 stub declared `export async function establishSession(): Promise<string>` but the function has no meaningful string value to return. The Banner POST to /term/search responds with `{"fwdURL": "/StudentRegistrationSsb/ssb/classSearch/classSearch"}` — that redirect URL has no use in the client. The JSESSIONID is managed automatically by the CookieJar. Returning it would require extracting it from the jar and expose an internal implementation detail.
- **Fix:** Changed return type to `Promise<void>`. This is the correct type for a side-effecting session setup operation with no meaningful return value.
- **Impact:** None for downstream code — callers use getSeatsByCRN which manages session internally. Plan 02-02 (API route) only calls getSeatsByCRN directly; it does not call establishSession.
- **Rule applied:** Rule 1 (bug fix — returning `Promise<string>` when there is no string to return would require either returning undefined cast as string or an arbitrary value, both incorrect).
- **Commit:** 2fcac2c

## Requirements Addressed

| Requirement | Description | Status |
|-------------|-------------|--------|
| BANN-01 | Session establishment via POST /term/search | Done |
| BANN-02 | Seat data fetch via GET /searchResults/searchResults | Done |
| BANN-03 | Client-side CRN filter (Banner param broken at MSU) | Done |
| BANN-04 | Session expiry detection + single retry | Done |
| BANN-06 | CURRENT_TERM_CODE as default termCode | Done |

## Implementation Notes for Plan 02-02 (API Route)

Plan 02-02 can import from lib/banner.ts and lib/constants.ts as follows:

```typescript
import { getSeatsByCRN, BannerSeatData } from '@/lib/banner'
import { CURRENT_TERM_CODE } from '@/lib/constants'
```

The API route does NOT need to call `establishSession` directly — `getSeatsByCRN` handles session setup automatically before every call.

Error handling: `getSeatsByCRN` throws `AxiosError` on network failure or HTTP error. The API route should catch `AxiosError` and return a 503 response (T-02-02 mitigation).

## Threat Model — T-02-01 and T-02-02 Mitigations Verified

- **T-02-01 (Parameter injection):** axios `params` object URL-encodes all values automatically. Subject, courseNumber, and termCode cannot inject raw URL fragments.
- **T-02-02 (MSU Banner timeout):** `timeout: 10000` set on the axios instance. Caller (API route) receives AxiosError on timeout and can return 503.

## Known Stubs

None — all exported functions are fully implemented. No placeholder text, hardcoded empty values, or TODO markers in lib/constants.ts or lib/banner.ts.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced in this plan. The outbound HTTP calls to mybanner.msstate.edu are covered by the plan's threat model (T-02-01, T-02-02).

## Self-Check: PASSED

- [x] `G:/MSU Course/lib/constants.ts` exists and contains BANNER_BASE_URL and CURRENT_TERM_CODE
- [x] `G:/MSU Course/lib/banner.ts` exists and contains all 5 required exports (BannerSeatData, establishSession, getSeatsByCRN) plus internal helpers (resetDataForm, fetchWithRecovery)
- [x] Commit 2fcac2c exists in git log
- [x] `npx tsc --noEmit` exits 0 (first attempt, no fixes needed)
- [x] No "Not implemented" strings remain in lib/banner.ts
- [x] CURRENT_TERM_CODE defined in exactly one file: lib/constants.ts
