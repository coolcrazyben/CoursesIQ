# Phase 4: Frontend Pages — Pattern Map

**Mapped:** 2026-04-23
**Files analyzed:** 7 new/modified files
**Analogs found:** 7 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/page.tsx` (replace) | page/server-component | request-response + Supabase read | `app/page.tsx` (current boilerplate) | role-match (same file, different content) |
| `app/dashboard/page.tsx` | page/server-component | request-response + Supabase read | `app/page.tsx` (current boilerplate) | role-match |
| `app/about/page.tsx` | page/server-component | static | `app/page.tsx` (current boilerplate) | role-match |
| `components/AlertForm.tsx` | client-component | request-response (POST) | `app/api/alerts/route.ts` (defines the API this calls) | data-flow match |
| `components/DashboardAlerts.tsx` | client-component | CRUD (cancel via PATCH) | `app/api/cron/check-seats/route.ts` (Supabase update pattern) | partial match |
| `app/api/alerts/[id]/route.ts` | route handler | request-response (PATCH) | `app/api/course/[crn]/route.ts` | exact |
| `app/layout.tsx` (update) | layout | static | `app/layout.tsx` (current) | exact (same file, additive change) |

---

## Pattern Assignments

### `app/page.tsx` — Server Component with Supabase Read

**Analog:** `app/page.tsx` (current boilerplate, lines 1–103) — same file, content replaced entirely.
**Supabase client:** `adminClient` from `@/lib/supabase/admin` (service-role, bypasses RLS, correct for public server component counting active alerts with no user context).

**Imports pattern** — combine boilerplate font wiring with adminClient:
```typescript
// app/page.tsx — no 'use client' directive (server component)
import { adminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
// AlertForm is a client component — imported and rendered here
import AlertForm from '@/components/AlertForm'
```

**Supabase fetch pattern** — sourced from `app/api/alerts/route.ts` lines 58–68 (adminClient select):
```typescript
// Fetch live active alert count — runs server-side at request time
const { data, error } = await adminClient
  .from('alerts')
  .select('id', { count: 'exact', head: true })
  .eq('is_active', true)

// Non-fatal: render 0 if query fails — never throw from a page
const alertCount = error ? 0 : (data?.length ?? 0)
```

**Tailwind / brand pattern** — sourced from `app/globals.css` lines 3–5:
```css
/* --color-maroon: #5D1725 is registered in globals.css @theme block */
/* Use Tailwind v4 utility: bg-maroon  text-maroon  border-maroon */
/* No tailwind.config.ts — CSS-first config (D-03) */
```

**Divergences from analog:**
- Replaces all boilerplate JSX; removes Next.js logo, Vercel links.
- Adds async function signature (`export default async function Home()`) — the current boilerplate is synchronous.
- Renders `<AlertForm />` (client component) as a child — server component can embed client components.
- Renders live `alertCount` stat from Supabase.

---

### `app/dashboard/page.tsx` — Server Component with searchParams

**Analog:** `app/page.tsx` (current boilerplate) — same role (Next.js App Router page), but this file is new.
**Secondary analog:** `app/api/course/[crn]/route.ts` lines 20–22 — pattern for consuming URL params server-side:
```typescript
// Route handler analog for reading URL-provided values
const { searchParams } = request.nextUrl
const subject = searchParams.get('subject')
```
In App Router pages the equivalent is the `searchParams` prop (also a Promise in Next.js 15):
```typescript
// Next.js 15 — searchParams is async
interface PageProps {
  searchParams: Promise<{ phone?: string }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { phone } = await searchParams
  // ...
}
```

**Supabase client:** `adminClient` from `@/lib/supabase/admin` — phone lookup is server-side with no user session; service-role is appropriate and consistent with how `app/page.tsx` reads alert counts.

**Supabase fetch pattern** — sourced from `app/api/cron/check-seats/route.ts` lines 18–23 (select with filter):
```typescript
const { data: alerts, error: fetchError } = await adminClient
  .from('alerts')
  .select('id, crn, subject, course_number, course_name, is_active, created_at')
  .eq('phone_number', normalizedPhone)
  .eq('is_active', true)
```

**Error handling pattern** (non-fatal, page never throws):
```typescript
if (fetchError) {
  console.error('[dashboard] Supabase fetch error:', fetchError.message)
  // Render empty state — never throw from a page component
}
```

**Divergences from analog:**
- Uses `searchParams` prop (Next.js 15 async); no equivalent in current codebase pages.
- Renders `<DashboardAlerts />` client component passing alerts as props.
- Must normalize phone before query — reuse `parsePhoneNumber` from `libphonenumber-js` (already a dep, used in `app/api/alerts/route.ts` lines 44–52).

---

### `app/about/page.tsx` — Simple Static Server Component

**Analog:** `app/page.tsx` (current boilerplate) — simplest analog; same role, no data fetching.

**Imports pattern:**
```typescript
// app/about/page.tsx — no 'use client', no data fetching
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About — CoursesIQ',
  description: 'CoursesIQ sends MSU students an SMS the moment a seat opens.',
}

export default function AboutPage() {
  return (
    <main className="...">
      {/* one paragraph about CoursesIQ */}
    </main>
  )
}
```

**Metadata pattern** — sourced from `app/layout.tsx` lines 15–18:
```typescript
export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
}
```

**Divergences from analog:**
- No data fetching — function is synchronous (not async).
- Exports its own `metadata` object (layout.tsx holds root metadata; individual pages can override).

---

### `components/AlertForm.tsx` — 'use client' Form Component

**Analog:** `app/api/alerts/route.ts` (lines 1–103) — defines the POST /api/alerts contract this component calls. The API schema and validation mirror what the form must collect and send.

**'use client' directive pattern** — sourced from `lib/supabase/client.ts` line 1:
```typescript
'use client'
// Only file in codebase currently using 'use client' — confirms the directive is supported
```

**Form fields to collect** — sourced from `app/api/alerts/route.ts` lines 12–20 (AlertSchema):
```typescript
// AlertSchema drives the form's required fields:
// crn: string (required)
// subject: string (required)  — e.g. "CSE"
// course_number: string (required)  — e.g. "1011"
// phone_number: string (required)
// email: string (optional)
```

**Client-side phone validation** — sourced from `app/api/alerts/route.ts` lines 43–52:
```typescript
// Mirror server-side logic on client before fetch — avoids API round-trip on bad input
// libphonenumber-js is already a dep; safe to import in client bundle (pure JS, no Node modules)
import { parsePhoneNumber } from 'libphonenumber-js'

const parsed = parsePhoneNumber(phoneNumber, 'US')
if (!parsed || !parsed.isValid()) {
  setPhoneError('Enter a valid US phone number')
  return
}
const e164 = parsed.number
```

**API call pattern** — native `fetch` (no axios; axios requires Node.js in some configs):
```typescript
const res = await fetch('/api/alerts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ crn, subject, course_number, phone_number: e164 }),
})

if (res.status === 409) {
  setError('You already have an alert for this course.')
  return
}
if (!res.ok) {
  setError('Something went wrong. Try again.')
  return
}
// success
```

**Error response shape** — sourced from `app/api/alerts/route.ts` lines 28–37:
```typescript
// API returns { error: string } on failure, { id: string } on 201
// Handle: 400 (validation), 409 (duplicate), 500 (server error)
```

**TCPA consent text** (LOCKED per UI-10, from CONTEXT.md):
```typescript
// Must render this exact text below submit button:
// "By submitting, you consent to receive SMS alerts.
//  Message & data rates may apply. Reply STOP to unsubscribe."
```

**Divergences from analog:**
- Client component with `useState` for form state, loading, error, success.
- Uses React controlled inputs — no server action, no form library.
- `libphonenumber-js` is imported in browser bundle (pure JS — confirmed safe, no Node.js modules needed).
- No Supabase client needed in this component — only calls the REST API.

---

### `components/DashboardAlerts.tsx` — Component with Cancel Action

**Analog:** `app/api/cron/check-seats/route.ts` lines 79–86 — the existing `.update()` pattern on the `alerts` table:
```typescript
// Server-side analog: update alerts row
await adminClient
  .from('alerts')
  .update({
    sms_sent_at: new Date().toISOString(),
    is_active: false,
    sms_sid: sid,
  })
  .eq('id', alert.id)
```
The client component mirrors this via a PATCH fetch call to `/api/alerts/[id]` instead of direct Supabase.

**'use client' pattern** — sourced from `lib/supabase/client.ts` line 1 (same directive):
```typescript
'use client'
```

**Cancel action pattern** (two-click confirm from CONTEXT.md):
```typescript
// State: pendingCancelId tracks which alert is awaiting confirmation
const [pendingCancelId, setPendingCancelId] = useState<string | null>(null)

async function handleCancel(id: string) {
  if (pendingCancelId !== id) {
    // First click: arm the confirm
    setPendingCancelId(id)
    return
  }
  // Second click: fire PATCH
  const res = await fetch(`/api/alerts/${id}`, { method: 'PATCH' })
  if (res.ok) {
    // Optimistic removal: filter alert out of local state
    setAlerts((prev) => prev.filter((a) => a.id !== id))
    setPendingCancelId(null)
  }
}
```

**Props pattern** — receives alerts from server component parent:
```typescript
interface Alert {
  id: string
  crn: string
  subject: string
  course_number: string
  course_name: string | null
  created_at: string
}

interface Props {
  alerts: Alert[]
}
```

**Divergences from analog:**
- Client component (cron route is a server-only route handler).
- Uses `fetch` to PATCH `/api/alerts/[id]` — does NOT import adminClient or Supabase directly.
- Manages local `alerts` state initialized from server-rendered props for optimistic UI.

---

### `app/api/alerts/[id]/route.ts` — PATCH Endpoint (Cancel Alert)

**Analog:** `app/api/course/[crn]/route.ts` (lines 1–88) — exact structural match:
- Same dynamic route segment pattern (`[id]` vs `[crn]`)
- Same `RouteParams` interface with `Promise<{ param: string }>` (Next.js 15)
- Same `export const runtime = 'nodejs'` declaration
- Same `NextRequest` / `NextResponse` imports
- Same `await params` pattern before accessing the segment value

**Imports pattern** — adapted from `app/api/course/[crn]/route.ts` lines 1–7:
```typescript
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
// Note: use adminClient (not server createClient) — no user session in v1 (CONTEXT.md cancel decision)
```

**RouteParams / params pattern** — sourced from `app/api/course/[crn]/route.ts` lines 9–18:
```typescript
interface RouteParams {
  params: Promise<{ id: string }>   // id instead of crn
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params   // Next.js 15: must await params
```

**Supabase update pattern** — sourced from `app/api/cron/check-seats/route.ts` lines 79–85:
```typescript
const { data, error } = await adminClient
  .from('alerts')
  .update({ is_active: false })
  .eq('id', id)
  .select('id')
  .single()

if (error || !data) {
  return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
}

return NextResponse.json({ id: data.id }, { status: 200 })
```

**Error handling pattern** — sourced from `app/api/alerts/route.ts` lines 65–68:
```typescript
if (error) {
  console.error('[api/alerts/[id]] Supabase update error:', error.message)
  return NextResponse.json({ error: 'Failed to cancel alert' }, { status: 500 })
}
```

**Divergences from analog:**
- HTTP method is `PATCH` not `GET` — export `PATCH` function not `GET`.
- No query params needed — only the `id` path segment.
- Uses `adminClient` (same as `app/api/alerts/route.ts`), not `createClient()` from server.ts.
- Returns 404 if row not found (`.single()` returns error when no row matches).

---

### `app/layout.tsx` — Root Layout (Update: Add Header/Nav)

**Analog:** `app/layout.tsx` (current, lines 1–34) — same file, additive change only.

**Existing pattern to preserve** (lines 1–34):
```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Create Next App",       // UPDATE: "CoursesIQ"
  description: "Generated by create next app",  // UPDATE: proper description
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* ADD: <header> with maroon background here */}
        {children}
      </body>
    </html>
  )
}
```

**Brand/color pattern** — sourced from `app/globals.css` lines 3–5:
```css
/* --color-maroon: #5D1725 maps to Tailwind utility bg-maroon, text-maroon */
/* Tailwind v4 CSS-first — use utility class directly, no config file */
```

**Header JSX to add** (inline in layout, not a separate component file):
```tsx
<header className="bg-maroon text-white px-4 py-3 flex items-center justify-between">
  <a href="/" className="font-semibold text-lg">CoursesIQ</a>
  <nav className="flex gap-4 text-sm">
    <a href="/" className="hover:underline">Home</a>
    <a href="/dashboard" className="hover:underline">Dashboard</a>
  </nav>
</header>
```

**Divergences from analog:**
- `metadata.title` and `metadata.description` updated to CoursesIQ values.
- `<header>` element inserted between `<body>` opening and `{children}`.
- No new imports required — `Link` from `next/link` is optional (plain `<a>` works for layout nav).

---

## Shared Patterns

### Supabase Client Selection
**Rule:** Choose the right client per context — mixing clients causes RLS and session bugs.

| Context | Client | Import |
|---|---|---|
| Server component / page (no user session) | `adminClient` | `import { adminClient } from '@/lib/supabase/admin'` |
| Route handler with user session (future auth) | `createClient()` | `import { createClient } from '@/lib/supabase/server'` |
| Client component (browser) | `createClient()` | `import { createClient } from '@/lib/supabase/client'` — `'use client'` required |

**Source:** `lib/supabase/admin.ts` lines 4–6 (comment), `lib/supabase/server.ts`, `lib/supabase/client.ts`

**Phase 4 usage:**
- `app/page.tsx` — adminClient (server component, no session)
- `app/dashboard/page.tsx` — adminClient (server component, no session)
- `app/api/alerts/[id]/route.ts` — adminClient (no auth in v1)
- `components/AlertForm.tsx` — NO Supabase client (calls REST API via fetch)
- `components/DashboardAlerts.tsx` — NO Supabase client (calls REST API via fetch)

---

### Runtime Declaration for Route Handlers
**Source:** `app/api/alerts/route.ts` line 1, `app/api/course/[crn]/route.ts` line 3

```typescript
export const runtime = 'nodejs'
// Required when importing Node.js-only modules (libphonenumber-js, axios, twilio, server-only)
// New PATCH route uses adminClient which imports 'server-only' — declare nodejs runtime
```

**Apply to:** `app/api/alerts/[id]/route.ts` — adminClient imports `server-only`.

---

### Error Handling in Route Handlers
**Source:** `app/api/alerts/route.ts` lines 93–100

```typescript
if (error) {
  // Log with route prefix for easy grepping in Vercel logs
  console.error('[api/alerts/[id]] Supabase error:', error.message)
  return NextResponse.json({ error: 'Human-readable message' }, { status: 500 })
}
```

Pattern: `console.error('[route/path] Description:', error.message)` then `NextResponse.json({ error: '...' }, { status: N })`.

**Apply to:** `app/api/alerts/[id]/route.ts`

---

### Tailwind v4 CSS-First (D-03)
**Source:** `app/globals.css` lines 1–5, `STATE.md` decision D-03

```css
@import "tailwindcss";

@theme {
  --color-maroon: #5D1725;
}
```

- No `tailwind.config.ts` — never create one.
- Custom token `maroon` is already registered. Use `bg-maroon`, `text-maroon`, `border-maroon`.
- Dark mode vars exist in globals.css (`prefers-color-scheme: dark`) but CONTEXT.md decision strips dark mode for v1 brand clarity — do not add `dark:` variants in Phase 4 components.

**Apply to:** All JSX/TSX files with Tailwind classes.

---

### Next.js 15 Async Params
**Source:** `app/api/course/[crn]/route.ts` lines 17–18

```typescript
// Next.js 15: params is a Promise — MUST await before accessing properties
const { crn } = await params
```

**Apply to:** `app/api/alerts/[id]/route.ts` — same dynamic segment pattern, same await requirement.

Also applies to `app/dashboard/page.tsx` searchParams (also a Promise in Next.js 15):
```typescript
const { phone } = await searchParams
```

---

## No Analog Found

No files in this phase are without a partial or role-match analog. All patterns have existing codebase references.

---

## Metadata

**Analog search scope:** `app/`, `lib/`, `components/` (components/ is empty — no existing component analogs)
**Files scanned:** 9 source files read
**Pattern extraction date:** 2026-04-23
**Key dependency notes:**
- `libphonenumber-js` — pure JS, safe in browser bundle (AlertForm client component)
- `zod` — used server-side only in existing routes; NOT needed in client components (use manual validation or mirror logic)
- No UI component library installed — all styling is Tailwind v4 utility classes
