# Phase 3: Alert System & Cron Worker — Pattern Map

**Mapped:** 2026-04-23
**Files analyzed:** 5 (4 new/modified source files + 1 migration)
**Analogs found:** 4 / 5 (vercel.json has no analog — new file type)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `lib/twilio.ts` | service | request-response | `lib/banner.ts` | role-match (singleton client + exported function) |
| `app/api/alerts/route.ts` | controller | request-response (POST) | `app/api/course/[crn]/route.ts` | exact (same route handler structure, Supabase write, error pattern) |
| `app/api/cron/check-seats/route.ts` | controller | batch / event-driven | `app/api/course/[crn]/route.ts` | role-match (same runtime declaration, NextRequest, adminClient usage) |
| `vercel.json` | config | — | none | no analog |
| `supabase/migrations/001_alerts_unique.sql` | migration | — | none | no analog (plain SQL DDL) |

---

## Pattern Assignments

### `lib/twilio.ts` (service, request-response)

**Analog:** `lib/banner.ts`
**Why:** Both are module-level singleton client patterns — banner.ts creates an axios client once at module scope; twilio.ts creates a Twilio client once at module scope. Both export a single primary async function.

**Singleton/client pattern from `lib/banner.ts`** (lines 1–18):
```typescript
import axios from 'axios'
import { CookieJar } from 'tough-cookie'
import { wrapper } from 'axios-cookiejar-support'
import { BANNER_BASE_URL, CURRENT_TERM_CODE } from './constants'

// Module-level cookie jar — persists JSESSIONID across calls within one process.
// In a serverless environment each cold-start gets a fresh jar, which is fine
// because getSeatsByCRN calls establishSession automatically when needed.
const jar = new CookieJar()
const client = wrapper(
  axios.create({
    jar,
    timeout: 10000,
    headers: {
      'User-Agent': 'CoursesIQ/1.0 (MSU seat availability monitor)',
    },
  })
)
```

**server-only guard from `lib/supabase/admin.ts`** (line 1):
```typescript
import 'server-only'
```

**Full pattern for `lib/twilio.ts`** — copy singleton + export structure from banner.ts, apply server-only guard from admin.ts:
```typescript
import 'server-only'
// IMPORTANT: Any API route importing this file must declare:
//   export const runtime = 'nodejs'
import Twilio from 'twilio'

// Module-level singleton — one instance per cold start (mirrors lib/banner.ts pattern)
const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

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

**Error code pattern from RESEARCH.md** — caller catches Twilio errors by `.code` property:
```typescript
try {
  const sid = await sendSeatAlert(alert.phone_number, courseName, alert.crn)
  // success path
} catch (err: unknown) {
  const code = (err as { code?: number }).code
  if (code === 21610) {
    // Opted out — set sms_opted_out = true; do NOT set sms_sent_at
  } else {
    console.error('[cron] Twilio error for alert', alert.id, err)
  }
}
```

---

### `app/api/alerts/route.ts` (controller, request-response — POST)

**Analog:** `app/api/course/[crn]/route.ts`
**Why:** Exact structural match. Both: (1) declare `export const runtime = 'nodejs'` first, (2) import NextRequest/NextResponse, (3) validate inputs and return 400 early, (4) call a lib/ module, (5) write to Supabase, (6) return structured JSON.

**Runtime declaration + imports from `app/api/course/[crn]/route.ts`** (lines 1–7):
```typescript
// Required: lib/banner.ts uses axios + tough-cookie (Node.js modules).
// Edge Runtime does not support these — must declare nodejs runtime explicitly.
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getSeatsByCRN } from '@/lib/banner'
import { createClient } from '@/lib/supabase/server'
```

**Validation + early-return pattern** (lines 24–30):
```typescript
if (!subject || !courseNumber) {
  return NextResponse.json(
    { error: 'subject and courseNumber query params are required' },
    { status: 400 }
  )
}
```

**Supabase write + error handling pattern** (lines 70–77):
```typescript
const supabase = await createClient()
const { error: upsertError } = await supabase
  .from('courses')
  .upsert(courseRow, { onConflict: 'crn' })

if (upsertError) {
  // Log but don't fail the request — seat data is still valid even if cache write fails.
  console.error('[api/course] Supabase upsert error:', upsertError.message)
}
```

**Structured 201 response pattern** (lines 80–87):
```typescript
return NextResponse.json({
  crn: courseRow.crn,
  course_name: courseRow.course_name,
  ...
})
// For POST /api/alerts — add { status: 201 }:
return NextResponse.json({ id: data.id }, { status: 201 })
```

**Full imports pattern for `app/api/alerts/route.ts`** — extend the analog with Zod and libphonenumber-js:
```typescript
export const runtime = 'nodejs'

import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { parsePhoneNumber } from 'libphonenumber-js'
import { adminClient } from '@/lib/supabase/admin'
import { CURRENT_TERM_CODE } from '@/lib/constants'
```

**Zod safeParse pattern** (from RESEARCH.md — no existing codebase analog):
```typescript
const AlertSchema = z.object({
  crn: z.string().min(1),
  subject: z.string().min(1),
  course_number: z.string().min(1),
  phone_number: z.string().min(1),
  email: z.string().email().optional(),
  course_name: z.string().optional(),
})

const body = await request.json()
const result = AlertSchema.safeParse(body)

if (!result.success) {
  return NextResponse.json(
    { error: 'Validation failed', issues: result.error.issues },
    { status: 400 }
  )
}
```

**Phone normalization + invalid-input guard** (from RESEARCH.md):
```typescript
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
```

**Duplicate check + 409 pattern** (from RESEARCH.md):
```typescript
const { data: existing } = await adminClient
  .from('alerts')
  .select('id')
  .eq('crn', crn)
  .eq('phone_number', e164)
  .maybeSingle()

if (existing) {
  return NextResponse.json(
    { error: 'Alert already exists for this CRN and phone number' },
    { status: 409 }
  )
}
```

**Insert + 23505 fallback pattern** (from RESEARCH.md):
```typescript
const { data, error } = await adminClient
  .from('alerts')
  .insert({ crn, subject, course_number, course_name: course_name ?? null,
            phone_number: e164, email: email ?? null,
            school: 'MSU', term_code: CURRENT_TERM_CODE })
  .select('id')
  .single()

if (error) {
  if (error.code === '23505') {
    return NextResponse.json({ error: 'Duplicate alert' }, { status: 409 })
  }
  console.error('[api/alerts] Supabase insert error:', error.message)
  return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
}

return NextResponse.json({ id: data.id }, { status: 201 })
```

---

### `app/api/cron/check-seats/route.ts` (controller, batch/event-driven — GET)

**Analog:** `app/api/course/[crn]/route.ts`
**Why:** Same runtime declaration, same NextRequest import, same try/catch error handling, same adminClient usage pattern. Structurally identical handler shape even though the logic is more complex.

**Runtime declaration** — copy exactly from `app/api/course/[crn]/route.ts` (line 1–3):
```typescript
// Required: lib/twilio.ts uses Twilio Node.js SDK.
export const runtime = 'nodejs'
```

**Imports pattern** (extend analog):
```typescript
export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { getSeatsByCRN, BannerSeatData } from '@/lib/banner'
import { sendSeatAlert } from '@/lib/twilio'
```

**CRON_SECRET auth guard** (from RESEARCH.md — no codebase analog):
```typescript
const authHeader = request.headers.get('authorization')
const cronSecret = process.env.CRON_SECRET

if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
  return new Response('Unauthorized', { status: 401 })
}
```

**Supabase fetch-active-alerts pattern** — mirrors the `.from().select().eq()` chain in `app/api/course/[crn]/route.ts` lines 70–72, extended with multiple filters:
```typescript
const { data: alerts, error } = await adminClient
  .from('alerts')
  .select('*')
  .eq('is_active', true)
  .is('sms_sent_at', null)      // NOTE: must use .is() not .eq() for NULL check
  .eq('sms_opted_out', false)

if (error) {
  console.error('[cron] Failed to fetch alerts:', error.message)
  return Response.json({ error: 'DB error' }, { status: 500 })
}

if (!alerts || alerts.length === 0) {
  return Response.json({ checked: 0, alerted: 0 })
}
```

**Grouping by (subject, course_number)** (from RESEARCH.md):
```typescript
const groups = new Map<string, typeof alerts>()
for (const alert of alerts) {
  const key = `${alert.subject}::${alert.course_number}`
  const group = groups.get(key) ?? []
  group.push(alert)
  groups.set(key, group)
}
```

**Banner call pattern** — mirrors `getSeatsByCRN` call from `app/api/course/[crn]/route.ts` lines 33–41, adapted for batch loop:
```typescript
// From app/api/course/[crn]/route.ts (lines 33-41):
let seatData
try {
  seatData = await getSeatsByCRN(crn, subject, courseNumber)
} catch (err) {
  console.error('[api/course] Banner fetch error:', err)
  return NextResponse.json(
    { error: 'Failed to reach MSU Banner — try again later' },
    { status: 503 }
  )
}
// In cron: use continue instead of return (must keep processing other groups)
```

**SMS dispatch + post-send DB update** (from RESEARCH.md):
```typescript
if (seatData.seatsAvailable > 0) {
  try {
    const sid = await sendSeatAlert(
      alert.phone_number,
      seatData.courseTitle || `${alert.subject} ${alert.course_number}`,
      crn
    )
    await adminClient
      .from('alerts')
      .update({ sms_sent_at: new Date().toISOString(), is_active: false, sms_sid: sid })
      .eq('id', alert.id)
    alerted++
  } catch (err: unknown) {
    const code = (err as { code?: number }).code
    if (code === 21610) {
      await adminClient
        .from('alerts')
        .update({ sms_opted_out: true })
        .eq('id', alert.id)
    } else {
      console.error('[cron] Twilio error for alert', alert.id, ':', err)
    }
  }
}
```

**Re-alert reset for seat closures** (from RESEARCH.md):
```typescript
// Second query for previously-notified alerts (re-alert reset)
const { data: sentAlerts } = await adminClient
  .from('alerts')
  .select('*')
  .not('sms_sent_at', 'is', null)
  .eq('sms_opted_out', false)

// If seat just closed: reset sms_sent_at so user is re-alerted on next opening
if (seatData.seatsAvailable === 0) {
  await adminClient
    .from('alerts')
    .update({ sms_sent_at: null, is_active: true, sms_sid: null,
              alert_reset_at: new Date().toISOString() })
    .eq('id', alert.id)
}
```

**Response pattern** — mirrors `return NextResponse.json({...})` from analog, using web Response for cron:
```typescript
return Response.json({ checked, alerted })
```

---

### `vercel.json` (config)

**Analog:** none — no existing vercel.json in codebase.

**Pattern from RESEARCH.md** (verified against Vercel docs):
```json
{
  "crons": [
    {
      "path": "/api/cron/check-seats",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Notes:**
- Requires Vercel Pro plan — Hobby plan only supports once-per-day cron intervals.
- File lives at repo root (`G:/MSU Course/vercel.json`).
- No other configuration needed — `next.config.ts` already has `serverExternalPackages: ['twilio']`.

---

### `supabase/migrations/001_alerts_unique.sql` (migration — Wave 0)

**Analog:** none — no existing migration files in codebase.

**Pattern from RESEARCH.md** (standard PostgreSQL DDL):
```sql
-- Run in Supabase Dashboard > SQL Editor BEFORE testing POST /api/alerts
ALTER TABLE public.alerts
  ADD CONSTRAINT alerts_crn_phone_unique UNIQUE (crn, phone_number);
```

**Notes:**
- Must be applied before any alert insertion tests.
- Enables race-condition-safe duplicate detection via `error.code === '23505'`.
- App-level SELECT check in the route is defense-in-depth on top of this constraint.

---

## Shared Patterns

### 1. Runtime Declaration (DEPL-04)

**Source:** `app/api/course/[crn]/route.ts` (lines 1–3)
**Apply to:** `app/api/alerts/route.ts`, `app/api/cron/check-seats/route.ts`
```typescript
// Required: lib/twilio.ts uses Twilio Node.js SDK (Node.js modules).
// Edge Runtime does not support these — must declare nodejs runtime explicitly.
export const runtime = 'nodejs'
```
**Critical:** This MUST be the first export in the file, before any import statements.

---

### 2. server-only Guard

**Source:** `lib/supabase/admin.ts` (line 1)
**Apply to:** `lib/twilio.ts`
```typescript
import 'server-only'
```

---

### 3. adminClient Usage (service-role, bypasses RLS)

**Source:** `lib/supabase/admin.ts` (lines 1–17)
**Apply to:** `app/api/alerts/route.ts`, `app/api/cron/check-seats/route.ts`

Both new routes use `adminClient` (not `createClient()` from server.ts). The alerts POST route uses `adminClient` because it needs to write across all users (no session context). The cron route uses it because it reads across all users. Never use `createClient()` from server.ts in routes that don't have a user session.

```typescript
import 'server-only'
import { createClient } from '@supabase/supabase-js'

export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
)
```

---

### 4. Try/Catch Error Handling with Console Logging

**Source:** `app/api/course/[crn]/route.ts` (lines 33–41, 74–77)
**Apply to:** All new route files

```typescript
// External call pattern:
try {
  result = await externalCall(...)
} catch (err) {
  console.error('[api/route-name] Description of failure:', err)
  return NextResponse.json(
    { error: 'Human-readable message' },
    { status: 503 }
  )
}

// DB error pattern:
if (error) {
  console.error('[api/route-name] Supabase error:', error.message)
  return NextResponse.json({ error: 'Failed to ...' }, { status: 500 })
}
```

---

### 5. Supabase NULL Filter

**Apply to:** `app/api/cron/check-seats/route.ts`

**Critical distinction** — use `.is()` for NULL, never `.eq()`:
```typescript
// CORRECT — PostgREST IS NULL
.is('sms_sent_at', null)

// WRONG — PostgREST = NULL (returns 0 rows; NULL != NULL in SQL)
.eq('sms_sent_at', null)
```

---

### 6. Path Alias Convention

**Source:** `app/api/course/[crn]/route.ts` (lines 5–7)
**Apply to:** All new files

```typescript
// Use @/ alias for all project imports:
import { getSeatsByCRN } from '@/lib/banner'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { CURRENT_TERM_CODE } from '@/lib/constants'
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `vercel.json` | config | static | No Vercel config file exists in the codebase yet |
| `supabase/migrations/001_alerts_unique.sql` | migration | DDL | No migration files exist in the codebase yet |

---

## Key Implementation Notes

### Note 1: export const runtime = 'nodejs' position
Must be the **first line** in both route files — before any import. Follow `app/api/course/[crn]/route.ts` exactly. ESLint will not catch ordering violations; this is a Next.js convention.

### Note 2: Use adminClient in both new routes
`lib/supabase/server.ts` createClient requires an active user session (cookie-based). Neither the alerts POST nor the cron route has a user session. Both must import `adminClient` from `@/lib/supabase/admin`.

### Note 3: Zod import
```typescript
import { z } from 'zod'  // CORRECT for zod@4 direct install
// NOT: import { z } from 'zod/v4'  (that is for v3-to-v4 migration path only)
```

### Note 4: Vercel cron sends GET requests only
Export `GET` from `app/api/cron/check-seats/route.ts`. Vercel Cron always makes GET requests — a POST export would return 405 silently.

### Note 5: course_name fallback in SMS
```typescript
// In cron sendSeatAlert call — always provide a fallback:
seatData?.courseTitle || alert.course_name || `${alert.subject} ${alert.course_number}`
```

---

## Metadata

**Analog search scope:** `G:/MSU Course/app/api/`, `G:/MSU Course/lib/`
**Files read:** 8 source files (`route.ts`, `admin.ts`, `server.ts`, `client.ts`, `banner.ts`, `twilio.ts`, `constants.ts`, `next.config.ts`)
**Pattern extraction date:** 2026-04-23
