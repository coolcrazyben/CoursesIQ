# Phase 3: Alert System & Cron Worker — Research

**Researched:** 2026-04-23
**Domain:** Next.js 15 App Router API routes, Twilio Node.js SDK v5, libphonenumber-js, Zod v4, Supabase service-role client, Vercel Cron
**Confidence:** HIGH

---

## Summary

Phase 3 implements the core product loop: a student POSTs their phone number and CRN to create an alert, and a scheduled cron worker periodically checks Banner for open seats, sends one SMS per opening event, and handles TCPA opt-out permanently. All infrastructure from Phases 1 and 2 is in place — the schema has the right columns (`sms_sent_at`, `sms_opted_out`, `sms_sid`, `last_seats_avail`, `alert_reset_at`), the Banner client is fully operational, and the Twilio singleton is stubbed and awaiting implementation.

The two new routes — `POST /api/alerts` and `GET /api/cron/check-seats` — follow the established pattern in `app/api/course/[crn]/route.ts` exactly. Both require `export const runtime = 'nodejs'` because they import from `lib/twilio.ts`. The cron route also imports `lib/supabase/admin.ts` (service-role, bypasses RLS) to read alerts across all users.

One schema gap requires attention: the `alerts` table has no unique constraint on `(crn, phone_number)`. The 409-duplicate requirement (ALRT-03) therefore needs either a `ALTER TABLE` migration to add the constraint (enabling Supabase's `upsert + ignoreDuplicates` pattern) or an explicit SELECT-then-INSERT application-level check. The migration approach is cleaner and race-condition-safe. A migration SQL file should be created as a Wave 0 task.

**Primary recommendation:** Implement `lib/twilio.ts` first (replaces stub), then `POST /api/alerts`, then `GET /api/cron/check-seats`, then `vercel.json`. The unique-constraint migration runs before any alert insertions are tested.

---

## User Constraints

No CONTEXT.md exists for Phase 3. The following constraints come from STATE.md locked decisions and project flags.

### Locked Decisions (from STATE.md)

| Decision | Rule |
|----------|------|
| D-02 | `twilio` pinned at `^5.13.1` — v6.0.0 released April 16, 2026, only breaking change is Node >=20 requirement; v5 remains correct per project pin |
| D-03 | Tailwind v4 CSS-first config — not relevant to Phase 3 |
| D-04 | `serverExternalPackages: ['twilio']` in `next.config.ts` — already configured |
| D-02-01 | `establishSession` returns `Promise<void>` not `Promise<string>` |

### Project Flags (from ROADMAP.md and STATE.md)

| Flag | Impact on Phase 3 |
|------|-------------------|
| `twilio` in `serverExternalPackages` | Both new routes MUST have `export const runtime = 'nodejs'` at top |
| New Supabase projects use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `lib/supabase/admin.ts` uses `NEXT_PUBLIC_SUPABASE_URL` (correct) + `SUPABASE_SERVICE_ROLE_KEY` (correct) — no change needed |
| `getSeatsByCRN` manages session internally | Cron handler calls `getSeatsByCRN` directly — never calls `establishSession` |
| Vercel Pro required for `*/5 * * * *` | `vercel.json` cron config will be rejected on Hobby plan |
| Twilio toll-free verification needed | Start immediately; code can ship without it; SMS will not deliver in production until verified |
| Pin `twilio@^5` | Do NOT run `npm update twilio` — `^5` is locked by the pin |

### Deferred (OUT OF SCOPE for Phase 3)

- `vercel.json` is technically listed under ALRT-11 which the ROADMAP.md traceability table shows as Phase 5. However, the Phase 3 goal description explicitly includes `vercel.json` as a deliverable. Include it in Phase 3 as the ROADMAP.md Phase 3 section takes precedence.
- No Redis/idempotency keys — database-level `sms_sent_at IS NULL` filter is sufficient at 5-minute cron intervals
- No status callback webhook — out of scope for v1
- Dashboard cancel endpoint — Phase 4

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ALRT-01 | `POST /api/alerts` accepts crn, subject, course_number, phone_number, optional email; validates; stores in Supabase | Zod v4 schema pattern; Supabase insert via server client |
| ALRT-02 | Phone numbers normalized to E.164 (`+1XXXXXXXXXX`) via libphonenumber-js | `parsePhoneNumber(raw, 'US').number` — verified against official docs |
| ALRT-03 | Duplicate alert (same CRN + phone) rejected gracefully with 409 | Requires unique constraint on `(crn, phone_number)` — schema migration needed; OR app-level SELECT check |
| ALRT-04 | `GET /api/cron/check-seats` protected by `Authorization: Bearer <CRON_SECRET>` | Vercel official pattern: `request.headers.get('authorization') !== \`Bearer ${process.env.CRON_SECRET}\`` |
| ALRT-05 | Cron fetches active alerts (`is_active=true, sms_sent_at IS NULL, sms_opted_out=false`) | `adminClient.from('alerts').select(...).eq('is_active', true).is('sms_sent_at', null).eq('sms_opted_out', false)` |
| ALRT-06 | Cron groups by `(subject, course_number)` to batch Banner API calls | JavaScript Map or reduce — one `getSeatsByCRN` call per unique `(subject, course_number)` pair |
| ALRT-07 | SMS triggered on `seatsAvailable > 0` transition (currently `sms_sent_at IS NULL`) | Check `seatData.seatsAvailable > 0` per matched alert; `sms_sent_at IS NULL` in DB query is the gate |
| ALRT-08 | SMS message format: emoji + course name + CRN + mybanner.msstate.edu link | Hardcoded template string in `sendSeatAlert` |
| ALRT-09 | After successful SMS: set `sms_sent_at = now()`, `is_active = false`, store `sms_sid` | Single Supabase UPDATE on alert row by ID |
| ALRT-10 | Twilio error 21610 sets `sms_opted_out = true` permanently | `instanceof RestException` check or `(err as { code?: number }).code === 21610` |
| ALRT-11 | `vercel.json` cron at `*/5 * * * *` (Vercel Pro required) | Verified format from Vercel docs |
| DEPL-04 | All Twilio-importing routes have `export const runtime = 'nodejs'` | Applies to both `app/api/alerts/route.ts` and `app/api/cron/check-seats/route.ts` |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Alert creation (POST /api/alerts) | API / Backend | Database / Storage | Business logic (normalize phone, deduplicate, insert) lives server-side; never in browser |
| Phone normalization (E.164) | API / Backend | — | libphonenumber-js runs in Node.js route handler at insert time; stored normalized in DB |
| Duplicate detection (ALRT-03) | Database / Storage | API / Backend | Unique constraint is the authoritative gate; app-level check is secondary confirmation |
| Cron seat check (GET /api/cron/check-seats) | API / Backend | Database / Storage | Serverless Node.js function; reads from DB, calls Banner, writes back to DB |
| SMS dispatch | API / Backend | — | Twilio SDK is Node.js-only; lives in cron route via lib/twilio.ts |
| CRON_SECRET validation | API / Backend | — | Header check at start of cron route handler before any work proceeds |
| sms_sent_at deduplication | Database / Storage | — | NULL-check in the Supabase query; the DB is the source of truth, not in-process state |
| vercel.json cron scheduling | CDN / Static | — | Build artifact consumed by Vercel infrastructure; no runtime code involved |

---

## Standard Stack

All packages are already installed. No new dependencies required for Phase 3.

### Core (Already Installed)

| Library | Installed Version | Purpose | Why Standard |
|---------|------------------|---------|--------------|
| twilio | 5.13.1 | Send SMS via Twilio Messages API | Official Node.js SDK; bundled TypeScript types; singleton pattern |
| libphonenumber-js | 1.12.41 | Parse and normalize phone to E.164 | Google's libphonenumber rewrite; 145 kB vs 550 kB; handles all US input formats |
| zod | 4.3.6 | Validate POST /api/alerts request body | TypeScript-first schema; safeParse returns discriminated union; used consistently in project |
| @supabase/supabase-js | 2.104.0 | Supabase data operations | Already wired in admin.ts (service-role) and server.ts |
| @supabase/ssr | 0.10.2 | SSR-aware Supabase client for POST /api/alerts | createServerClient with cookies for the alerts route |
| next | 15.5.15 | App Router route handlers | Existing framework |

### Latest Registry Versions (verified 2026-04-23 via npm view)

| Package | Installed (pinned) | Latest on npm | Notes |
|---------|-------------------|---------------|-------|
| twilio | 5.13.1 (`^5.13.1`) | 6.0.0 | v6 only raises Node min to >=20; API unchanged per UPGRADE.md. Project pins v5 per D-02. |
| libphonenumber-js | 1.12.41 (`^1.12.41`) | 1.12.42 | Patch version; no action needed |
| zod | 4.3.6 (`^4.3.6`) | 4.3.6 | Current |

**Installation:** No new installs needed. All dependencies already in `node_modules`.

---

## Architecture Patterns

### System Architecture Diagram

```
[POST /api/alerts]
  |
  +-> Zod safeParse (validate body)
  |     |-- invalid --> 400 response
  |
  +-> parsePhoneNumber(raw, 'US').number  (libphonenumber-js)
  |     |-- invalid --> 400 response
  |
  +-> adminClient.from('alerts').select  (check duplicate: crn + phone_number)
  |     OR: unique constraint violation on insert (error.code '23505')
  |     |-- duplicate --> 409 response
  |
  +-> adminClient.from('alerts').insert  (write new row)
  |
  +-> 201 { id: uuid }


[GET /api/cron/check-seats]  <-- invoked by Vercel Cron every 5 min
  |
  +-> CRON_SECRET header check
  |     |-- invalid --> 401 response (no further work)
  |
  +-> adminClient.from('alerts').select(*)
  |    .eq('is_active', true)
  |    .is('sms_sent_at', null)
  |    .eq('sms_opted_out', false)
  |
  +-> Group alerts by (subject, course_number) using Map<string, Alert[]>
  |
  +-> For each unique (subject, course_number) group:
  |    |
  |    +-> getSeatsByCRN(crn, subject, courseNumber)  [Banner API]
  |    |    [CRN is taken from the first alert in group; all alerts in group have same subject+courseNumber]
  |    |    Actually: need to call once per unique CRN within the group (see note below)
  |    |
  |    +-> For each alert in group:
  |         |
  |         +-> Find matching BannerSeatData by alert.crn
  |         |    [getSeatsByCRN returns data for one CRN — call once per unique CRN]
  |         |
  |         +-> if seatData.seatsAvailable > 0:
  |              |
  |              +-> sendSeatAlert(phone, courseName, crn)  [lib/twilio.ts]
  |              |    |
  |              |    +-- success --> adminClient UPDATE: sms_sent_at=now(), is_active=false, sms_sid=sid
  |              |    +-- error 21610 --> adminClient UPDATE: sms_opted_out=true (no sms_sent_at)
  |              |    +-- other error --> log, skip (next cron run will retry)
  |              |
  |              else if seatData.seatsAvailable === 0 AND alert.sms_sent_at IS NOT NULL:
  |                   --> adminClient UPDATE: sms_sent_at=null, alert_reset_at=now()  (re-alert reset)
  |
  +-> return { checked: N, alerted: M }
```

**Note on grouping vs. CRN lookup:** `getSeatsByCRN` fetches all sections of a subject+courseNumber, then filters client-side by CRN. So the correct batching strategy is: group alerts by `(subject, course_number)` to reduce Banner API calls. Each unique `(subject, course_number)` pair requires one Banner call. Within that result, filter by `crn` to find each alert's seat data. This avoids N Banner calls when N students watch the same course.

### Recommended Project Structure

New files in Phase 3:

```
G:/MSU Course/
├── app/
│   └── api/
│       ├── alerts/
│       │   └── route.ts              # POST /api/alerts (new)
│       └── cron/
│           └── check-seats/
│               └── route.ts          # GET /api/cron/check-seats (new)
├── lib/
│   └── twilio.ts                     # Replace stub with full implementation (existing)
├── vercel.json                       # Create: cron config (new)
└── supabase/
    └── migrations/
        └── 001_alerts_unique.sql     # ALTER TABLE: add unique constraint (new — Wave 0)
```

### Pattern 1: lib/twilio.ts — Singleton Client + sendSeatAlert

**What:** Replace the Phase 1 stub with a real Twilio client singleton and typed `sendSeatAlert` function.

**Source:** Verified against `github.com/twilio/twilio-node` README and existing `research/TWILIO.md`

```typescript
// lib/twilio.ts
import 'server-only'
// IMPORTANT: Any API route importing this file must declare:
//   export const runtime = 'nodejs'
import Twilio, { RestException } from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID!
const authToken = process.env.TWILIO_AUTH_TOKEN!

// Singleton: module-level instantiation avoids re-creating client per request.
// In Next.js serverless functions, each cold start creates one instance.
const twilioClient = Twilio(accountSid, authToken)

/**
 * Send a seat-opened SMS alert.
 * Returns the Twilio message SID on success.
 * Throws { code: 21610 } when the recipient has opted out (STOP).
 * Throws other errors for transient Twilio/network failures.
 */
export async function sendSeatAlert(
  phone: string,
  courseName: string,
  crn: string
): Promise<string> {
  const message = await twilioClient.messages.create({
    body: `\uD83C\uDF89 A seat just opened in ${courseName} (${crn})! Register now before it fills up: mybanner.msstate.edu \u2014 CoursesIQ`,
    to: phone,
    from: process.env.TWILIO_PHONE_NUMBER!,
  })
  return message.sid
}
```

**Error handling in the caller (cron route):**
```typescript
try {
  const sid = await sendSeatAlert(alert.phone_number, alert.course_name ?? alert.crn, alert.crn)
  // success path: update sms_sent_at, is_active, sms_sid
} catch (err: unknown) {
  const code = (err as { code?: number }).code
  if (code === 21610) {
    // Opted out — set sms_opted_out = true, do NOT set sms_sent_at
  } else {
    // Transient error — log it, leave row unchanged so next cron run retries
    console.error('[cron] Twilio error for alert', alert.id, err)
  }
}
```

**Alternative RestException import:**
```typescript
import Twilio, { RestException } from 'twilio'
// then: err instanceof RestException && err.code === 21610
```
Both approaches work with twilio@5. [VERIFIED: github.com/twilio/twilio-node README]

### Pattern 2: POST /api/alerts — Zod v4 Validation

**What:** Validate the request body with Zod before touching the database.

**Source:** Verified against zod.dev v4 docs + existing `research/STACK.md`

```typescript
// app/api/alerts/route.ts
export const runtime = 'nodejs'

import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { parsePhoneNumber } from 'libphonenumber-js'
import { adminClient } from '@/lib/supabase/admin'
import { CURRENT_TERM_CODE } from '@/lib/constants'

const AlertSchema = z.object({
  crn: z.string().min(1),
  subject: z.string().min(1),
  course_number: z.string().min(1),
  phone_number: z.string().min(1),
  email: z.string().email().optional(),
  course_name: z.string().optional(),  // optional — may be passed from frontend
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json()
  const result = AlertSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: result.error.issues },
      { status: 400 }
    )
  }

  const { crn, subject, course_number, phone_number, email, course_name } = result.data

  // Normalize phone to E.164
  let e164: string
  try {
    const parsed = parsePhoneNumber(phone_number, 'US')
    if (!parsed || !parsed.isValid()) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }
    e164 = parsed.number  // E.164 string e.g. "+12025551234"
  } catch {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
  }

  // Check for duplicate (crn + phone_number)
  // This is the 409 path — see Schema section for constraint-based alternative
  const { data: existing } = await adminClient
    .from('alerts')
    .select('id')
    .eq('crn', crn)
    .eq('phone_number', e164)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Alert already exists for this CRN and phone number' }, { status: 409 })
  }

  const { data, error } = await adminClient
    .from('alerts')
    .insert({
      crn,
      subject,
      course_number,
      course_name: course_name ?? null,
      phone_number: e164,
      email: email ?? null,
      school: 'MSU',
      term_code: CURRENT_TERM_CODE,
    })
    .select('id')
    .single()

  if (error) {
    // Handle unique constraint violation as fallback (race condition protection)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Duplicate alert' }, { status: 409 })
    }
    console.error('[api/alerts] Supabase insert error:', error.message)
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}
```

### Pattern 3: GET /api/cron/check-seats — Batched Banner + SMS

**What:** Auth check, fetch active alerts, group by (subject, course_number), call Banner once per group, send SMS for open seats.

```typescript
// app/api/cron/check-seats/route.ts
export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { getSeatsByCRN, BannerSeatData } from '@/lib/banner'
import { sendSeatAlert } from '@/lib/twilio'

export async function GET(request: NextRequest): Promise<Response> {
  // ALRT-04: CRON_SECRET validation
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // ALRT-05: Fetch all alerts that have not yet been notified
  const { data: alerts, error } = await adminClient
    .from('alerts')
    .select('*')
    .eq('is_active', true)
    .is('sms_sent_at', null)
    .eq('sms_opted_out', false)

  if (error) {
    console.error('[cron] Failed to fetch alerts:', error.message)
    return Response.json({ error: 'DB error' }, { status: 500 })
  }

  if (!alerts || alerts.length === 0) {
    return Response.json({ checked: 0, alerted: 0 })
  }

  // ALRT-06: Group by (subject, course_number) to batch Banner calls
  const groups = new Map<string, typeof alerts>()
  for (const alert of alerts) {
    const key = `${alert.subject}::${alert.course_number}`
    const group = groups.get(key) ?? []
    group.push(alert)
    groups.set(key, group)
  }

  let checked = 0
  let alerted = 0

  for (const [key, groupAlerts] of groups) {
    const [subject, courseNumber] = key.split('::')

    // Collect unique CRNs in this group
    const uniqueCrns = [...new Set(groupAlerts.map((a) => a.crn))]

    for (const crn of uniqueCrns) {
      let seatData: BannerSeatData | null = null
      try {
        seatData = await getSeatsByCRN(crn, subject, courseNumber)
      } catch (err) {
        console.error(`[cron] Banner error for ${subject} ${courseNumber} CRN ${crn}:`, err)
        continue
      }

      // Find all alerts for this specific CRN
      const crnAlerts = groupAlerts.filter((a) => a.crn === crn)
      checked += crnAlerts.length

      for (const alert of crnAlerts) {
        if (!seatData) continue  // CRN not found in Banner results

        if (seatData.seatsAvailable > 0) {
          // ALRT-07/08: Seat open — send SMS
          try {
            const sid = await sendSeatAlert(
              alert.phone_number,
              seatData.courseTitle || `${subject} ${courseNumber}`,
              crn
            )
            // ALRT-09: Mark alert as fulfilled
            await adminClient
              .from('alerts')
              .update({ sms_sent_at: new Date().toISOString(), is_active: false, sms_sid: sid })
              .eq('id', alert.id)
            alerted++
          } catch (err: unknown) {
            const code = (err as { code?: number }).code
            if (code === 21610) {
              // ALRT-10: Permanent opt-out — mark phone but do NOT set sms_sent_at
              await adminClient
                .from('alerts')
                .update({ sms_opted_out: true })
                .eq('id', alert.id)
            } else {
              console.error('[cron] Twilio error for alert', alert.id, ':', err)
              // Leave row unchanged — next cron run will retry
            }
          }
        } else if (seatData.seatsAvailable === 0 && alert.last_seats_avail !== null && alert.last_seats_avail > 0) {
          // Seat just closed — this path resets sms_sent_at for re-alert
          // Only reached if sms_sent_at was set (seat was open, SMS sent, now closed again)
          // The current query already filters sms_sent_at IS NULL so this path
          // only applies to alerts that were already reset. See re-alert note below.
        }
      }
    }
  }

  return Response.json({ checked, alerted })
}
```

### Pattern 4: Seat Reset Logic (Re-alert on Reopening)

**What:** When seats close to 0, reset `sms_sent_at` to NULL so the user can be re-alerted on the next opening.

**When:** This is a SEPARATE cron operation on alerts where `sms_sent_at IS NOT NULL` AND `is_active = false`. The current query only touches `sms_sent_at IS NULL` alerts. Re-alert reset requires either a second query or including those rows too.

**Recommended approach for Phase 3:** Add a second query in the cron handler for "previously notified" alerts to check if the seat has since closed:

```typescript
// After main loop, check for seat closures to enable re-alerting
const { data: sentAlerts } = await adminClient
  .from('alerts')
  .select('*')
  .not('sms_sent_at', 'is', null)  // previously notified
  .eq('sms_opted_out', false)

// For each sentAlert, if seat is now 0, reset sms_sent_at for re-alert
// (Group + Banner call pattern same as above)
if (seatData.seatsAvailable === 0) {
  await adminClient
    .from('alerts')
    .update({
      sms_sent_at: null,
      is_active: true,
      sms_sid: null,
      alert_reset_at: new Date().toISOString(),
    })
    .eq('id', alert.id)
}
```

**Note:** The ROADMAP.md Phase 3 description says "reset `sms_sent_at` to NULL when seat closes (`seatsAvailable === 0`) so user is re-alerted if seat reopens." This implies the cron should handle re-alert reset on every run. Plan this as part of the cron implementation.

### Pattern 5: Unique Constraint Migration (Wave 0)

**What:** The `alerts` table has no unique constraint on `(crn, phone_number)`. This must be added to enable race-condition-safe duplicate detection.

```sql
-- supabase/migrations/001_alerts_unique.sql
-- Run in Supabase Dashboard > SQL Editor before testing POST /api/alerts
ALTER TABLE public.alerts
  ADD CONSTRAINT alerts_crn_phone_unique UNIQUE (crn, phone_number);
```

**Execution:** Manual — paste into Supabase Dashboard SQL Editor and run before any Phase 3 plan execution. [VERIFIED: standard PostgreSQL syntax; Supabase supports ALTER TABLE constraints]

**Application-level check is still needed:** Even with the constraint, the `INSERT` path can hit `error.code === '23505'` in a race. The dual-check pattern (SELECT first + catch 23505) is defense in depth and produces better error messages.

### Anti-Patterns to Avoid

- **Calling `establishSession()` from cron route:** `getSeatsByCRN` manages session internally. Direct call causes double-establishment and is unnecessary.
- **Using `createClient()` (server.ts) in the cron route:** The server client requires cookies; the cron route has no user session. Always use `adminClient` from `lib/supabase/admin.ts` in the cron.
- **Setting `sms_sent_at` when Twilio returns 21610:** The opted-out flag suppresses future sends. Setting `sms_sent_at` would also suppress re-alert logic if the flag were ever cleared. Keep them separate.
- **Using `import 'server-only'` in lib/twilio.ts:** The stub already has this pattern in comments. The full implementation SHOULD include `import 'server-only'` to prevent accidental browser import.
- **String comparison for CRON_SECRET:** The `authHeader !== \`Bearer ${cronSecret}\`` pattern is adequate for cron routes. Timing-safe comparison (`crypto.timingSafeEqual`) is a best practice for secrets but is not required for this use case — Vercel injects the header only on server-side, not from the public internet. [ASSUMED: timing-safe comparison omission is acceptable here]
- **Forgetting `export const runtime = 'nodejs'` before imports:** The runtime declaration MUST be the first export in the file, before any imports. ESLint may not catch this — it's a Next.js convention, not a JS rule.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Phone parsing + E.164 normalization | Custom regex | libphonenumber-js `parsePhoneNumber` | 800+ region formats; handles `(555) 123-4567`, `5551234567`, `+15551234567` identically |
| Input validation with TS types | Manual type guards | Zod `safeParse` | Returns discriminated union; infers TypeScript type; error objects have structured `.issues` |
| Twilio error code checking | String parsing on error.message | `(err as { code?: number }).code` or `instanceof RestException` | Twilio SDK guarantees `.code` property on all API errors |
| Duplicate detection | Application-level lock | DB unique constraint + `error.code === '23505'` catch | Atomic, race-condition-safe |
| Batching Banner calls | One call per alert | Group by (subject, course_number) first | getSeatsByCRN hits Banner's API — unbatched N-calls for N-alerts on same course |

**Key insight:** The cron handler's grouping logic is the most error-prone part. The temptation is to call `getSeatsByCRN` once per alert (simple loop). This would make 50 Banner API calls for 50 students watching the same 5 courses. The grouping Map reduces this to 5 Banner calls regardless of subscriber count.

---

## Common Pitfalls

### Pitfall 1: sms_sent_at Query Filter — Fetching Already-Notified Alerts

**What goes wrong:** If the Supabase query does NOT filter by `sms_sent_at IS NULL`, every alert (including previously sent ones) gets re-processed on every cron run, sending duplicate SMS.
**Why it happens:** The `is_active` flag is set to `false` after send, but a developer might think `is_active = true` alone is sufficient to prevent duplicates.
**How to avoid:** Always include `.is('sms_sent_at', null)` in the cron's alert fetch query. The `sms_sent_at IS NULL` guard is the primary deduplication mechanism.
**Warning signs:** Duplicate SMS received by a test phone number; `alerted` count in the response exceeds the number of active distinct alerts.

### Pitfall 2: Zod v4 Import — `from 'zod'` vs `from 'zod/v4'`

**What goes wrong:** Zod v4 is installed as `zod@4.x` but some community examples still show `from 'zod/v4'` (a v4-from-v3-package migration path). In a project that directly installs `zod@4`, the correct import is `from 'zod'`.
**Why it happens:** Zod published a backward-compat package where v3 users can import v4 via `zod/v4`. This is irrelevant when zod@4 is directly installed.
**How to avoid:** Use `import { z } from 'zod'` — verified against zod.dev documentation.

### Pitfall 3: libphonenumber-js — parsePhoneNumber vs parsePhoneNumberFromString

**What goes wrong:** `parsePhoneNumber(raw, 'US')` throws a `ParseError` if the string is completely unparseable. `parsePhoneNumberFromString(raw, 'US')` returns `undefined` instead of throwing. Using the wrong variant causes unhandled exceptions.
**Why it happens:** Both functions are exported from `libphonenumber-js` and do the same thing on valid input, but error behavior differs.
**How to avoid:** Wrap `parsePhoneNumber` in try/catch (as shown in Pattern 2 above), or use `parsePhoneNumberFromString` with a null check. Either works; try/catch with `parsePhoneNumber` is more explicit.
**Warning signs:** Unhandled promise rejection in the POST route when a user submits a garbage phone string like "not-a-phone".

### Pitfall 4: Supabase `.is('sms_sent_at', null)` vs `.eq('sms_sent_at', null)`

**What goes wrong:** In Supabase's PostgREST client, filtering for NULL values requires `.is('column', null)` not `.eq('column', null)`. Using `.eq` against NULL returns no rows (NULL ≠ NULL in SQL).
**Why it happens:** SQL NULL comparison semantics — `WHERE col = NULL` is always false; must use `IS NULL`.
**How to avoid:** Always use `.is('column', null)` for IS NULL checks in Supabase queries.
**Warning signs:** Query returns 0 rows even though the table has rows with `sms_sent_at = null`.

### Pitfall 5: Cron Route GET vs POST

**What goes wrong:** Vercel Cron always makes GET requests to the configured path. If the route handler exports `POST` instead of `GET`, cron invocations receive a 405 Method Not Allowed and fail silently.
**Why it happens:** Developers may intuitively write cron handlers as POST because they "do things". But Vercel's cron scheduler only sends GET.
**How to avoid:** Export `GET` from `app/api/cron/check-seats/route.ts`. [VERIFIED: Vercel docs — "Vercel makes an HTTP GET request to your project's production deployment URL"]

### Pitfall 6: course_name NULL in alerts table

**What goes wrong:** The `alerts` table's `course_name` column is nullable. The cron SMS message requires a course name. If `course_name` is NULL, the SMS body will contain "undefined" or "null".
**Why it happens:** Phase 3's POST /api/alerts insert does not require `course_name` from the client. The cron uses `seatData.courseTitle` from Banner as the authoritative source — but if Banner returns null for that CRN, the fallback must be `\`${subject} ${course_number}\``.
**How to avoid:** In `sendSeatAlert` call within cron: `seatData?.courseTitle || alert.course_name || \`${alert.subject} ${alert.course_number}\``.

### Pitfall 7: Node.js runtime declaration position

**What goes wrong:** `export const runtime = 'nodejs'` placed after import statements causes a build warning or silently fails in some Next.js versions.
**Why it happens:** Next.js evaluates the runtime directive before executing the module. It must appear at the top of the file.
**How to avoid:** Make `export const runtime = 'nodejs'` the first line in both new route files, before any imports. Follow the pattern in `app/api/course/[crn]/route.ts`.

---

## Code Examples

### Twilio Singleton (Verified Pattern)

```typescript
// Source: github.com/twilio/twilio-node README + research/TWILIO.md
import Twilio from 'twilio'

const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

// Send SMS
const message = await twilioClient.messages.create({
  body: 'Your message here',
  to: '+12025551234',
  from: process.env.TWILIO_PHONE_NUMBER!,
})
const sid = message.sid  // e.g. "SM1234567890abcdef"
```

### libphonenumber-js E.164 Normalization (Verified Pattern)

```typescript
// Source: catamphetamine/libphonenumber-js GitHub README
import { parsePhoneNumber } from 'libphonenumber-js'

try {
  const parsed = parsePhoneNumber('(202) 555-1234', 'US')
  if (parsed.isValid()) {
    const e164 = parsed.number  // "+12025551234"
  }
} catch {
  // ParseError thrown for completely unparseable input
}
```

### Zod v4 safeParse in Route Handler (Verified Pattern)

```typescript
// Source: zod.dev + verified pattern from research/STACK.md
import { z } from 'zod'

const Schema = z.object({
  crn: z.string().min(1),
  phone_number: z.string().min(1),
  email: z.string().email().optional(),
})

const result = Schema.safeParse(await request.json())
if (!result.success) {
  return NextResponse.json(
    { error: 'Validation failed', issues: result.error.issues },
    { status: 400 }
  )
}
// result.data is fully typed
```

### CRON_SECRET Validation (Verified Pattern from Vercel Official Docs)

```typescript
// Source: vercel.com/docs/cron-jobs/manage-cron-jobs
import type { NextRequest } from 'next/server'

export function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  // proceed...
}
```

### Supabase NULL Filter (Verified Pattern)

```typescript
// Source: Supabase PostgREST docs — IS NULL requires .is() not .eq()
const { data } = await adminClient
  .from('alerts')
  .select('*')
  .eq('is_active', true)
  .is('sms_sent_at', null)       // NOT .eq('sms_sent_at', null)
  .eq('sms_opted_out', false)
```

### vercel.json Cron Config (Verified Pattern from Vercel Docs)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/check-seats",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Nov 2025 (Supabase) | New Supabase projects use new key format — project already uses PUBLISHABLE_KEY per Phase 1 |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 (deprecated) | Project uses `@supabase/ssr` already — no action |
| `zod@3` | `zod@4` | Stable April 2025 | Project installs `zod@4.3.6` — use `from 'zod'` not `from 'zod/v4'` |
| `twilio@5` | `twilio@6` | April 16, 2026 | v6 only raises Node min to >=20; no API changes. Project pins v5 per D-02 — no action. |
| `import twilio from 'twilio'` then `new twilio.Twilio(sid, token)` | `import Twilio from 'twilio'` then `Twilio(sid, token)` (factory call) | N/A — v5 always used factory | Project's existing research uses factory pattern — follow it |

**Deprecated/outdated:**
- `getSession()` on the server: Use `getClaims()` for server-side auth checks — but cron handler has no auth context; use `adminClient` (service-role) directly.
- `z.ZodError` issue format changed in Zod v4: `result.error.issues` is still valid; `result.error.format()` output structure changed slightly. Use `.issues` array directly for the 400 response body.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Timing-safe comparison for CRON_SECRET is not required (basic string equality is sufficient) | Anti-Patterns | Low — Vercel sends CRON_SECRET server-side only; not exposed to public HTTP in practice |
| A2 | twilio@5 `import Twilio from 'twilio'; const client = Twilio(sid, token)` factory pattern works without `new` keyword | Standard Stack / Pattern 1 | Medium — if `new` is required, constructor call changes; verified against TWILIO.md research but not re-run against installed package in this session |
| A3 | `seatData.courseTitle` is the correct field name for the Banner API course name in SMS body | Pattern 3 (cron handler) | Low — `courseTitle` is defined in `BannerSeatData` interface in `lib/banner.ts` (verified by reading file) |
| A4 | The re-alert reset (seat closes → `sms_sent_at = null`) should be implemented in the same cron route | Architecture | Medium — ROADMAP mentions the behavior but does not specify if it should be a separate query; splitting it into the same handler is the simplest approach |

---

## Open Questions (RESOLVED)

1. **Should `POST /api/alerts` use `adminClient` (service-role) or `createClient()` (server.ts with publishable key)?**
   - RESOLVED: Use `adminClient` — avoids cookie-handling overhead; both work due to `anon_insert_alerts` RLS policy, but `adminClient` is simpler since the route has no user session context. Implemented in 03-02-PLAN.md.

2. **Does the `alerts` table unique constraint on `(crn, phone_number)` conflict with any existing data?**
   - RESOLVED: Developer must check Supabase dashboard for duplicate rows before running migration (03-01 Task 2 includes verification SQL to check for duplicates and cleanup guidance in the threat model). Migration includes documentation of the deduplication step if needed.

3. **SMS message exact text — emoji encoding in TypeScript source**
   - RESOLVED: Use REQUIREMENTS.md version with the 🎉 emoji (U+1F389) pasted directly as UTF-8 in the TypeScript source. REQUIREMENTS.md is the authoritative requirements document; ROADMAP omitted the emoji incidentally. Implemented in 03-01-PLAN.md Task 3.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js >= 18 | twilio@5 runtime | Yes | v22.21.0 | — |
| twilio@5 package | lib/twilio.ts | Yes | 5.13.1 (installed) | — |
| libphonenumber-js | POST /api/alerts | Yes | 1.12.41 (installed) | — |
| zod@4 | POST /api/alerts | Yes | 4.3.6 (installed) | — |
| TWILIO_ACCOUNT_SID | lib/twilio.ts | Yes | set in .env.local per Phase 1 summary | — |
| TWILIO_AUTH_TOKEN | lib/twilio.ts | Yes | set in .env.local per Phase 1 summary | — |
| TWILIO_PHONE_NUMBER | sendSeatAlert | Placeholder | set as placeholder; real number pending toll-free verification | SMS will fail until real number is provisioned |
| CRON_SECRET | cron route | Yes | set in .env.local per Phase 1 summary | — |
| Vercel Pro plan | `*/5 * * * *` cron | Unknown | Cannot verify from codebase | Hobby plan: cron degrades to once/day |
| Supabase unique constraint on alerts | ALRT-03 | No | Not in schema.sql | Application-level SELECT check (already in Pattern 2) |

**Missing dependencies with no fallback:**
- `TWILIO_PHONE_NUMBER`: Production SMS delivery is blocked until toll-free number is provisioned and verified. Development can use a Twilio trial number to send to verified numbers.

**Missing dependencies with fallback:**
- Supabase unique constraint: Application-level SELECT-then-INSERT handles this, plus `error.code === '23505'` catch. Migration is strongly recommended for race-condition safety but is not blocking.
- Vercel Pro: `vercel.json` can still be written; it will fail deployment if on Hobby plan. The cron route itself works correctly at any frequency when manually invoked.

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` — treat as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no jest.config, vitest.config, or pytest.ini found in project |
| Config file | None — Wave 0 must add test infrastructure if automated testing is required |
| Quick run command | N/A |
| Full suite command | N/A |

**Assessment:** The project has no automated test infrastructure. Phase 3 success criteria are verified manually (per existing Phase 1 and Phase 2 pattern — both phases used structural checks + manual API calls rather than automated tests). Phase 3 plans should follow the same manual verification pattern established in Phases 1 and 2.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Verification Method |
|--------|----------|-----------|---------------------|
| ALRT-01 | POST /api/alerts creates row in Supabase | manual smoke | `curl -X POST .../api/alerts` + check Supabase dashboard |
| ALRT-02 | Phone stored as E.164 | manual smoke | Inspect `phone_number` column value in Supabase |
| ALRT-03 | Second identical POST returns 409 | manual smoke | Repeat same curl call, verify 409 status |
| ALRT-04 | Cron without CRON_SECRET returns 401 | manual smoke | `curl /api/cron/check-seats` without header |
| ALRT-05/06 | Cron fetches + groups alerts | manual smoke | `curl -H "Authorization: Bearer <secret>" /api/cron/check-seats` with live test data |
| ALRT-07/08/09 | SMS sent + sms_sent_at set | live integration | Requires Twilio trial number or real number |
| ALRT-10 | Error 21610 sets sms_opted_out | live integration | Requires a Twilio opt-out simulation |

### Wave 0 Gaps

- No test framework installed — plans should not add one unless the project owner requests it (outside Phase 3 scope)
- Manual verification steps should be documented in each PLAN.md file's verification section, following the pattern from 02-02-SUMMARY.md

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No user auth in Phase 3 |
| V3 Session Management | No | Cron uses service-role key (not sessions) |
| V4 Access Control | Yes | CRON_SECRET header validation; RLS on alerts table (service-role bypasses intentionally) |
| V5 Input Validation | Yes | Zod schema on POST /api/alerts; libphonenumber-js for phone |
| V6 Cryptography | No | No crypto operations; CRON_SECRET is a random string (do not hand-roll comparison timing) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cron endpoint called without auth | Spoofing | CRON_SECRET Bearer check — returns 401 before any DB or Banner operations |
| Bulk alert insertion (phone harvesting / abuse) | Denial of Service | Rate limiting is out of scope for Phase 3; ALRT-01 Zod validation prevents malformed inserts |
| Phone number stored in plaintext | Information Disclosure | Acceptable for v1 per design; RLS blocks anon SELECT on alerts table |
| Twilio credentials leaked via client bundle | Information Disclosure | `import 'server-only'` in lib/twilio.ts; `serverExternalPackages: ['twilio']` in next.config.ts |
| Duplicate SMS from concurrent cron invocations | Tampering | `sms_sent_at IS NULL` DB filter is the idempotency gate; checked atomically per Supabase row |

---

## Sources

### Primary (HIGH confidence)

- `research/TWILIO.md` (this project) — Twilio v5 SDK patterns, E.164 normalization, error code reference, sms_sent_at deduplication strategy (verified 2026-04-22 against official Twilio docs)
- `research/STACK.md` (this project) — Next.js 15 route handler patterns, CRON_SECRET validation, vercel.json format, Supabase client patterns (verified 2026-04-22)
- `vercel.com/docs/cron-jobs/manage-cron-jobs` — CRON_SECRET Authorization header pattern, exact code sample (verified 2026-04-23)
- `github.com/twilio/twilio-node` README — messages.create() API, RestException import, SID capture (verified 2026-04-23)
- `github.com/twilio/twilio-node` UPGRADE.md — v5 to v6: only breaking change is Node >=20 (verified 2026-04-23)
- `catamphetamine/libphonenumber-js` GitHub README — parsePhoneNumber, `.number` property for E.164, try/catch behavior (verified 2026-04-23)
- `zod.dev` v4 — safeParse, z.object, z.string, .optional(), Next.js integration pattern (verified 2026-04-23)
- `supabase.com/docs/reference/javascript/upsert` — ignoreDuplicates, onConflict parameters (verified 2026-04-23)
- `supabase/schema.sql` (this project) — authoritative column list for alerts table (read directly)
- `lib/banner.ts` (this project) — BannerSeatData interface, getSeatsByCRN signature (read directly)
- `lib/supabase/admin.ts` (this project) — adminClient export pattern (read directly)
- `app/api/course/[crn]/route.ts` (this project) — canonical route handler pattern for Phase 3 to follow (read directly)
- `npm view twilio version` — latest version 6.0.0 confirmed (verified 2026-04-23)
- `npm list twilio` — installed version 5.13.1 confirmed (verified 2026-04-23)

### Secondary (MEDIUM confidence)

- `vercel.com/docs/cron-jobs` — cron expression format, UTC timezone, Hobby vs Pro limits (verified 2026-04-23 against official Vercel docs)
- `vercel.com/docs/cron-jobs/quickstart` — vercel.json cron array format (verified 2026-04-23)
- Supabase community pattern — `error.code === '23505'` for unique constraint violation in JS client (multiple sources; standard PostgreSQL behavior)

### Tertiary (LOW confidence)

- None — all Phase 3 critical claims are verified against official docs or this project's own existing code.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages installed and versions verified via npm
- Architecture: HIGH — patterns follow established project conventions (Phases 1+2) + verified official docs
- Pitfalls: HIGH — most from direct code reading + verified official docs; A1 assumption is LOW risk

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (stable libraries; Vercel and Twilio APIs are stable)

---

*Phase 3 research complete. Planner can now create PLAN.md files.*
