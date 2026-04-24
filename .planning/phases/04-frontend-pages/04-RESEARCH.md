# Phase 4: Frontend Pages — Research

**Researched:** 2026-04-23
**Domain:** Next.js 15 App Router, Tailwind CSS v4, React 19, Supabase SSR
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Dashboard access: zero-friction phone lookup — no verification gate in v1
- TCPA consent text (exact): "By submitting, you consent to receive SMS alerts. Message & data rates may apply. Reply STOP to unsubscribe."
- Cancel endpoint uses adminClient (service_role) — no auth in v1
- Cancel endpoint returns 200 on success, 404 if alert not found
- Navigation: maroon (`bg-maroon`) header, white text, CoursesIQ brand left, Home + Dashboard links right

### Claude's Discretion
- Hero copy — punchy + MSU-specific; subtext mentions instant SMS, no account needed, free
- AlertForm helper note below form explaining CRN/Subject/Course Number fields and where to find them in Banner
- Cancel confirmation UX — either two-click ("Confirm cancel?") or optimistic removal; keep simple
- Dark mode — strip entirely; go full light/maroon-only

### Deferred Ideas (OUT OF SCOPE)
- Phone verification / auth on dashboard (AUTH-01, AUTH-02 — v2)
- Course search / CRN lookup UI (v2)
- Dark mode (stripped for v1)
- Rate limiting on alert creation (PREM-01 — v2)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | Homepage hero with value proposition headline and subtext | Hero section in server component; no async needed |
| UI-02 | Homepage form: CRN, subject, course number, phone (required), optional email | AlertForm client component; useState + fetch pattern |
| UI-03 | Homepage live count of active alerts (server-fetched) | adminClient in RSC; count query pattern documented below |
| UI-04 | Form submits to POST /api/alerts, shows success/error feedback | Client-side fetch in AlertForm; inline state pattern |
| UI-05 | Dashboard phone lookup returns alerts for that number | searchParams prop (async Promise in Next.js 15) |
| UI-06 | Dashboard cancel button sets is_active = false | PATCH /api/alerts/[id] — new route this phase |
| UI-07 | About page with one paragraph description | Simple RSC, no async needed |
| UI-08 | Tailwind with dark maroon (#5D1725) primary color | bg-maroon works from @theme token already in globals.css |
| UI-09 | Mobile-first, correct rendering at 375px | Tailwind mobile-first defaults; no extra config needed |
| UI-10 | TCPA consent text at phone input | Static text in AlertForm; exact wording locked |
</phase_requirements>

---

## Summary

This phase builds three pages (Home, Dashboard, About) and two interactive client components (AlertForm, DashboardAlerts) on top of a complete Phase 3 backend. The stack is Next.js 15.5 with React 19, Tailwind v4 CSS-first, and Supabase via adminClient. All API endpoints that the UI calls already exist except PATCH /api/alerts/[id], which must be created in this phase.

The dominant architectural decision is component boundary placement. Pages are server components that fetch data directly from Supabase (no extra API hop for read operations). Interactive mutations (form submit, cancel button) live in `'use client'` components that call Route Handler endpoints via fetch — this keeps form state local and avoids Server Action complexity for what are simple fire-and-respond mutations. The existing POST /api/alerts route is already implemented and verified; the only new API surface is the PATCH cancel endpoint.

Tailwind v4's CSS-first approach means `--color-maroon: #5D1725` is already defined in `globals.css` inside `@theme`, so `bg-maroon`, `text-maroon`, and `border-maroon` all work as utility classes with no further configuration.

**Primary recommendation:** Use server components for data reads (alert count, dashboard phone lookup), `useState` + `fetch` client components for mutations (form submit, cancel). Create `components/AlertForm.tsx`, `components/DashboardAlerts.tsx`, and `app/api/alerts/[id]/route.ts` as the three new files with the most substance. The remaining pages are thin wrappers.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Live alert count | API / Backend (RSC + adminClient) | — | Bypasses RLS; must stay server-side |
| Alert creation form | Browser / Client | API / Backend (POST /api/alerts) | Form state is client-only; mutation via existing Route Handler |
| Phone lookup + alert list | Frontend Server (RSC) | — | searchParams triggers dynamic rendering; Supabase query in RSC |
| Alert cancellation | Browser / Client | API / Backend (PATCH /api/alerts/[id]) | Button interaction is client-side; mutation via Route Handler |
| Navigation / layout | Frontend Server (RSC) | — | Shared layout.tsx is an RSC; no interactivity needed |
| About page | Frontend Server (RSC) | — | Static content; no data fetching |

---

## Key Findings

1. **searchParams is async in Next.js 15.** The `searchParams` prop on a page component is `Promise<{ [key: string]: string | string[] | undefined }>`. You must `await searchParams` before reading keys. This is a breaking change from Next.js 14. [VERIFIED: nextjs.org/docs]

2. **params is also async in Next.js 15 Route Handlers.** `PATCH(request, { params }: { params: Promise<{ id: string }> })` — `const { id } = await params`. The same requirement applies to dynamic `page.tsx` files. [VERIFIED: nextjs.org/docs]

3. **Tailwind v4 `@theme` generates utility classes directly.** `--color-maroon: #5D1725` in the `@theme` block (already present in `globals.css`) generates `bg-maroon`, `text-maroon`, `border-maroon`, `ring-maroon`, etc. No `tailwind.config.ts` needed or desired (D-03 decision). [VERIFIED: tailwindcss.com/docs]

4. **`@theme inline` vs `@theme` distinction.** The project uses both: the `--color-maroon` custom color sits in plain `@theme {}`, while `--color-background`, `--font-sans`, etc. sit in `@theme inline {}` (which resolves `var()` references inline). Custom colors should stay in `@theme {}`, not `@theme inline {}`. The current `globals.css` is already correct. [VERIFIED: tailwindcss.com/docs]

5. **Dark mode must be stripped.** `globals.css` has a `@media (prefers-color-scheme: dark)` block that changes `--background` and `--foreground`. Per CONTEXT.md, dark mode is stripped for v1. Remove this block and hardcode light values. The maroon header is light-mode-only branding. [VERIFIED: existing code + CONTEXT.md decision]

6. **Client-side fetch to Route Handler is the right pattern for AlertForm.** Server Actions use `'use server'` and FormData — they require either a separate actions file or an inline async function in an RSC. For a `'use client'` form component that needs fine-grained inline success/error state, `useState` + `fetch('/api/alerts', { method: 'POST', body: JSON.stringify(...) })` is simpler, already aligns with how the existing POST route is structured (JSON body, not FormData), and does not require any new plumbing. [VERIFIED: nextjs.org/docs/app/getting-started/mutating-data]

7. **adminClient (service_role) must be used for the live alert count.** The `alerts` table has RLS that blocks anon SELECT. The server component in `app/page.tsx` runs server-side and can safely use adminClient. The `server-only` guard in `lib/supabase/admin.ts` prevents accidental client-side import. [VERIFIED: existing code]

8. **Dashboard phone lookup uses URL search params and causes dynamic rendering.** Using `searchParams` opts the page into dynamic rendering at request time — no static pre-rendering. This is expected and correct behavior for a phone lookup page. [VERIFIED: nextjs.org/docs]

9. **No test framework is installed.** Phase 4 will create the first user-facing pages but has no test infrastructure. Wave 0 of planning should include a decision: skip automated testing for UI components (consistent with the yolo_mode: true config) or add a minimal smoke-test setup. Given `yolo_mode: true` in config.json, no test framework setup is recommended — mark all validation as manual.

10. **Zod 4 is installed.** `package.json` has `zod: "^4.3.6"`. The PATCH route can use Zod for body validation or simply validate the UUID format inline. Zod 4 has a breaking API change from v3 (`.string().uuid()` is now `.string().uuid()` — same API, but some helper methods changed). [VERIFIED: package.json]

---

## Next.js 15 Patterns

### Server Component Data Fetching (app/page.tsx — live alert count)

```typescript
// Source: nextjs.org/docs — Server Components can use async/await directly
// app/page.tsx — this is a server component (no 'use client')
import { adminClient } from '@/lib/supabase/admin'

export default async function HomePage() {
  // adminClient uses service_role — bypasses RLS; safe because this is server-only
  const { count } = await adminClient
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .then(r => ({ count: r.count ?? 0 }))

  return (
    <main>
      {/* hero, AlertForm, count display */}
      <p>{count} active alerts</p>
    </main>
  )
}
```

**Key:** `{ count: 'exact', head: true }` — Supabase returns only the count, no rows. This is more efficient than `.select('id')` + `.length`. [ASSUMED — Supabase client API; verified against known Supabase JS docs pattern]

### searchParams in Dashboard Page (Next.js 15)

```typescript
// Source: nextjs.org/docs/app/api-reference/file-conventions/page
// CRITICAL: searchParams is a Promise in Next.js 15 — must await
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>
}) {
  const { phone } = await searchParams

  // If no phone in URL, render lookup form only
  if (!phone) {
    return <PhoneLookupForm />
  }

  // Fetch alerts for this phone from Supabase (server-side)
  const { data: alerts } = await adminClient
    .from('alerts')
    .select('id, crn, subject, course_number, course_name, created_at')
    .eq('phone_number', phone)  // Note: phone from URL must be E.164 to match stored format
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return <DashboardAlerts alerts={alerts ?? []} />
}
```

**Phone format gotcha:** Stored numbers are E.164 (`+16015551234`). The phone lookup form must submit the phone in a format that either (a) matches exactly, or (b) is normalized before querying. The dashboard form can do a simple client-side pass-through — users are likely to type their number in any format. Two approaches:
- **Simple (recommended for v1):** Pass the phone as-is in the URL; query with `.ilike()` or normalize in the RSC using `parsePhoneNumber` before the Supabase query
- **Complex:** Client-side normalization in the lookup form before navigation

Recommendation: normalize in the RSC using the already-installed `libphonenumber-js` before querying. This avoids a mismatch between what users type and what is stored. [ASSUMED — libphonenumber-js is already a dependency]

### Dynamic Route Handler with await params — PATCH /api/alerts/[id]

```typescript
// Source: nextjs.org/docs/app/api-reference/file-conventions/route
// app/api/alerts/[id]/route.ts
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params  // MUST await — params is a Promise in Next.js 15

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
}
```

**Note on runtime:** PATCH /api/alerts/[id] imports `adminClient` which imports `@supabase/supabase-js`. Supabase JS works on Edge runtime, but to be consistent with the rest of the project (and because `server-only` is imported in admin.ts, which is a Node.js idiom), keep `export const runtime = 'nodejs'` as first line. [VERIFIED: existing project pattern]

### Passing Server Data to Client Components

Server components can pass data to client components as props. The DashboardAlerts component receives its alert list as a prop from the server component; it does not fetch on the client.

```typescript
// app/dashboard/page.tsx (server component)
import DashboardAlerts from '@/components/DashboardAlerts'

export default async function DashboardPage({ searchParams }) {
  const alerts = await fetchAlertsForPhone(phone)
  return <DashboardAlerts alerts={alerts} />
}

// components/DashboardAlerts.tsx (client component)
'use client'
import { useState } from 'react'

type Alert = { id: string; crn: string; course_name: string | null; /* ... */ }

export default function DashboardAlerts({ alerts: initial }: { alerts: Alert[] }) {
  const [alerts, setAlerts] = useState(initial)
  // cancel logic mutates local state optimistically
}
```

**Important:** Initial prop from server → local state initialized with `useState(initial)` is the standard pattern for optimistic UI in client components. [VERIFIED: React 19 / Next.js docs pattern]

---

## Tailwind v4 Patterns

### How bg-maroon Works

```css
/* app/globals.css — already correct */
@import "tailwindcss";

@theme {
  --color-maroon: #5D1725;  /* generates bg-maroon, text-maroon, border-maroon, etc. */
}
```

The `@theme` block defines CSS custom properties in the `--color-*` namespace. Tailwind v4 automatically generates all color utility classes from this namespace: `bg-maroon`, `text-maroon`, `border-maroon`, `ring-maroon`, `fill-maroon`, `stroke-maroon`, `from-maroon`, `to-maroon`, etc. [VERIFIED: tailwindcss.com/docs/theme]

**No tailwind.config.ts needed or wanted.** D-03 decision is locked: CSS-first only.

### Removing Dark Mode

The current `globals.css` has a dark mode media query that changes `--background` to near-black. Strip it per CONTEXT.md decision:

```css
/* REMOVE this entire block: */
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}
```

Replace hardcoded `--background: #ffffff` and `--foreground: #171717` as the only values. [VERIFIED: existing globals.css]

### Mobile-First Tailwind Patterns (375px)

Tailwind is mobile-first by default. The base styles apply at all widths; responsive prefixes (`sm:`, `md:`, `lg:`) apply at breakpoints upward. For a 375px target:

```html
<!-- Stack elements on mobile, side-by-side on sm+ -->
<div class="flex flex-col sm:flex-row gap-4">

<!-- Full-width inputs on mobile -->
<input class="w-full px-4 py-3 rounded border">

<!-- Comfortable tap targets (min 44px height on mobile) -->
<button class="w-full py-3 text-base">Submit</button>
```

**No horizontal scroll rule:** Use `max-w-full overflow-x-hidden` on the root or `min-w-0` on flex children that might overflow. The layout container should use `px-4` (16px side padding) on mobile with `max-w-lg mx-auto` for content width. [ASSUMED — standard Tailwind mobile-first convention]

### Key Tailwind v4 Class Name Changes (v3 vs v4)

These apply if any Tailwind v3 class names are referenced in scaffolded code:

| v3 class | v4 class | Note |
|----------|----------|------|
| `shadow` | `shadow-sm` | Default shadow renamed |
| `shadow-sm` | `shadow-xs` | Sizing scale shifted |
| `rounded-sm` | `rounded-xs` | Sizing scale shifted |
| `outline-none` | `outline-hidden` | Renamed |

The existing `app/page.tsx` uses `dark:invert` which will not apply (dark mode stripped). Remove that class during the page rewrite. [VERIFIED: tailwindcss.com/docs/upgrade-guide]

---

## Form Patterns

### AlertForm — useState + fetch (Recommended)

**Why not Server Action:** Server Actions use FormData and `'use server'` — they work well for full-page navigations and cache invalidation patterns. For this form:
- The POST /api/alerts endpoint expects JSON body (already implemented and verified in Phase 3)
- We need fine-grained inline success/error state management without a page reload (UI-04 requirement)
- Client-side phone validation before any API call (UI-04: "no API call is made" on invalid phone)
- The form is already a `'use client'` component

`useState + fetch` is the correct pattern. [VERIFIED: nextjs.org/docs/app/getting-started/mutating-data — "if you need parallel data fetching, use Route Handler"]

```typescript
// components/AlertForm.tsx
'use client'

import { useState } from 'react'
import { parsePhoneNumber } from 'libphonenumber-js'

type FormState = 'idle' | 'submitting' | 'success' | 'error'

export default function AlertForm() {
  const [crn, setCrn] = useState('')
  const [subject, setSubject] = useState('')
  const [courseNumber, setCourseNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<FormState>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage('')

    // Client-side phone validation (UI-04: no API call on invalid phone)
    try {
      const parsed = parsePhoneNumber(phone, 'US')
      if (!parsed.isValid()) throw new Error('invalid')
    } catch {
      setErrorMessage('Please enter a valid US phone number.')
      return  // Stop here — no API call made
    }

    setStatus('submitting')

    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crn, subject, course_number: courseNumber, phone_number: phone, email: email || undefined }),
    })

    if (res.status === 201) {
      setStatus('success')
    } else {
      const body = await res.json()
      setErrorMessage(body.error ?? 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return <p>You're signed up! We'll text you when a seat opens.</p>
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* fields */}
      {/* TCPA consent below phone field (UI-10 — LOCKED) */}
      <p>By submitting, you consent to receive SMS alerts. Message &amp; data rates may apply. Reply STOP to unsubscribe.</p>
      {errorMessage && <p role="alert">{errorMessage}</p>}
      <button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Setting up alert...' : 'Alert Me'}
      </button>
    </form>
  )
}
```

**Phone validation note:** `parsePhoneNumber` is already used in `app/api/alerts/route.ts` (Phase 3). Using the same library client-side ensures consistent behavior. It's already in `package.json`. [VERIFIED: existing route.ts]

---

## Dashboard Patterns

### Phone Lookup Form — URL Navigation (No AJAX)

The dashboard phone lookup should submit via a plain HTML form with `method="GET"` and `action="/dashboard"`. This causes a full page navigation that adds `?phone=XXXX` to the URL, which the server component reads from `searchParams`. This is simpler than client-side AJAX and works without JavaScript.

```typescript
// components/PhoneLookupForm.tsx (can be server component — no state needed)
export default function PhoneLookupForm() {
  return (
    <form method="GET" action="/dashboard">
      <input type="tel" name="phone" placeholder="(601) 555-1234" required />
      <button type="submit">Look up my alerts</button>
    </form>
  )
}
```

**Why not useState + router.push:** The server component needs to re-fetch data on phone change. URL navigation triggers a new server render — no client state management needed. [ASSUMED — standard Next.js App Router convention for search-param-driven server pages]

### DashboardAlerts — Optimistic Cancel

The DashboardAlerts component is a `'use client'` component that receives the initial alerts list as a prop and manages local state for cancellations.

**Two-click confirm pattern (recommended per CONTEXT.md):**

```typescript
'use client'

import { useState } from 'react'

type Alert = { id: string; crn: string; course_name: string | null; subject: string; course_number: string }

export default function DashboardAlerts({ alerts: initial }: { alerts: Alert[] }) {
  const [alerts, setAlerts] = useState(initial)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  async function handleCancel(id: string) {
    if (confirmingId !== id) {
      // First click: show confirmation
      setConfirmingId(id)
      return
    }
    // Second click: fire PATCH
    setConfirmingId(null)
    setAlerts(prev => prev.filter(a => a.id !== id))  // optimistic removal

    const res = await fetch(`/api/alerts/${id}`, { method: 'PATCH' })
    if (!res.ok) {
      // Rollback: refetch or restore
      // For v1 simplicity, show a toast/message — no complex rollback needed
      setAlerts(initial)  // restore from prop (simplest rollback)
    }
  }

  if (alerts.length === 0) {
    return <p>No active alerts found for this number.</p>
  }

  return (
    <ul>
      {alerts.map(alert => (
        <li key={alert.id}>
          <span>{alert.course_name ?? `${alert.subject} ${alert.course_number}`} — CRN {alert.crn}</span>
          <button onClick={() => handleCancel(alert.id)}>
            {confirmingId === alert.id ? 'Confirm cancel?' : 'Cancel alert'}
          </button>
        </li>
      ))}
    </ul>
  )
}
```

**No PATCH body needed.** The PATCH endpoint only sets `is_active = false` — no request body required. The client sends an empty PATCH. [VERIFIED: CONTEXT.md decision + route design]

---

## PATCH /api/alerts/[id] Route

### File Location
`app/api/alerts/[id]/route.ts`

This is a new dynamic route segment. The directory `[id]` must be created inside `app/api/alerts/`.

**CRITICAL: Does not conflict with `app/api/alerts/route.ts`.** In Next.js App Router, `app/api/alerts/route.ts` handles `/api/alerts` (no segment) and `app/api/alerts/[id]/route.ts` handles `/api/alerts/:id`. They coexist. [VERIFIED: Next.js App Router file conventions]

### Complete Implementation

```typescript
// app/api/alerts/[id]/route.ts
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params  // Next.js 15: params is a Promise

  if (!id) {
    return NextResponse.json({ error: 'Missing alert id' }, { status: 400 })
  }

  const { data, error } = await adminClient
    .from('alerts')
    .update({ is_active: false })
    .eq('id', id)
    .select('id')
    .single()

  if (error) {
    // PGRST116 = "no rows returned" from PostgREST (single() with no match)
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }
    console.error('[api/alerts/[id]] Supabase update error:', error.message)
    return NextResponse.json({ error: 'Failed to cancel alert' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id }, { status: 200 })
}
```

**Error code note:** Supabase `.single()` returns error code `PGRST116` when no rows match. This maps to our 404 response. [ASSUMED — standard PostgREST error code; consistent with adminClient patterns in this project]

**No runtime = 'nodejs' for Edge note:** The PATCH route imports `adminClient` which has `import 'server-only'`. While `server-only` is a Next.js convention (not a runtime restriction), we keep `runtime = 'nodejs'` for consistency with all other API routes in this project. [VERIFIED: existing project convention]

---

## Risks & Gotchas

### Gotcha 1: searchParams is async — common source of TypeScript errors
**What goes wrong:** Writing `const { phone } = searchParams` (without `await`) works in Next.js 14 but produces a type error in Next.js 15 where `searchParams` is `Promise<...>`. The page component must be `async` and use `await searchParams`.
**Prevention:** Always declare the page as `async function` and `const { phone } = await searchParams`. [VERIFIED: nextjs.org/docs]

### Gotcha 2: params is async in Route Handlers — silent wrong ID
**What goes wrong:** Writing `const { id } = params` (without `await`) returns the Promise object, not the string. The Supabase query runs with `id = [object Promise]` and returns no rows (404). This fails silently at the query level, not at parse time.
**Prevention:** `const { id } = await params` is mandatory. [VERIFIED: nextjs.org/docs]

### Gotcha 3: Phone number format mismatch in dashboard query
**What goes wrong:** User types `601-555-1234` in the phone lookup form. URL becomes `?phone=601-555-1234`. Supabase query runs `.eq('phone_number', '601-555-1234')`. Stored value is `+16015551234`. Zero results returned even though the alert exists.
**Prevention:** Normalize the phone from the URL in the RSC before querying:
```typescript
import { parsePhoneNumber } from 'libphonenumber-js'
try {
  const parsed = parsePhoneNumber(phone, 'US')
  if (parsed.isValid()) queryPhone = parsed.number  // '+16015551234'
} catch { /* invalid input — show no results */ }
```
[VERIFIED: existing POST route uses same normalization; consistent treatment required]

### Gotcha 4: adminClient and 'server-only' in server components
**What goes wrong:** If `AlertForm.tsx` accidentally imports `adminClient` (e.g., by importing from a module that re-exports it), the `import 'server-only'` guard throws at build time. Client components cannot use adminClient.
**Prevention:** Only pages (`app/page.tsx`, `app/dashboard/page.tsx`) and API routes import from `lib/supabase/admin.ts`. Client components call API routes via fetch. [VERIFIED: lib/supabase/admin.ts structure]

### Gotcha 5: Tailwind v4 shadow/rounded class name shifts
**What goes wrong:** Using `shadow-sm` when you mean the default box shadow — in Tailwind v4, `shadow-sm` is a smaller shadow than in v3 (sizing scale shifted).
**Prevention:** Use `shadow-md` for visible card shadows. Use `rounded-lg` for standard rounded corners. Avoid relying on v3 mental model for these specific utilities. [VERIFIED: tailwindcss.com/docs/upgrade-guide]

### Gotcha 6: Dark mode classes from scaffolded page.tsx
**What goes wrong:** The existing `app/page.tsx` has `dark:invert` on images and `dark:bg-white/[.06]` on code elements. These classes are benign (no-op without dark mode media query) but should be removed for clean v1 output.
**Prevention:** Rewrite `app/page.tsx` completely — it is currently the create-next-app placeholder with no CoursesIQ content. [VERIFIED: existing app/page.tsx]

### Gotcha 7: `export const runtime = 'nodejs'` must be the first line
**What goes wrong:** The Phase 3 Plan 02 summary documents that the must_haves checker verifies `runtime` is line 1. Putting a comment before the export causes a verification failure.
**Prevention:** First line of every API route file: `export const runtime = 'nodejs'` — no comments above it. [VERIFIED: 03-02-SUMMARY.md]

### Gotcha 8: PATCH /api/alerts/[id] directory must not shadow POST /api/alerts
**What goes wrong:** Developer creates `app/api/alerts/[id]/route.ts` but accidentally adds methods to `app/api/alerts/route.ts` thinking it handles both.
**Prevention:** These are separate files. `app/api/alerts/route.ts` handles `POST /api/alerts`. `app/api/alerts/[id]/route.ts` handles `PATCH /api/alerts/:id`. Do not add PATCH to the first file. [VERIFIED: Next.js file conventions]

---

## Component Architecture

### Files to Create

| File | Type | Purpose |
|------|------|---------|
| `app/page.tsx` | RSC (async) | Hero + alert count + `<AlertForm>` |
| `app/dashboard/page.tsx` | RSC (async) | Phone lookup + `<DashboardAlerts>` |
| `app/about/page.tsx` | RSC (sync) | Single paragraph |
| `components/AlertForm.tsx` | Client component | Form with validation + POST submit |
| `components/DashboardAlerts.tsx` | Client component | Alert list + cancel button |
| `app/api/alerts/[id]/route.ts` | Route Handler | PATCH — set is_active=false |

### Files to Modify

| File | Change |
|------|--------|
| `app/layout.tsx` | Add shared header/nav + update metadata + strip dark mode |
| `app/globals.css` | Strip dark mode media query |

### Recommended Project Structure After Phase 4

```
app/
  layout.tsx          # updated: header/nav added, metadata updated
  globals.css         # updated: dark mode stripped
  page.tsx            # new: hero + alert count + AlertForm
  dashboard/
    page.tsx          # new: phone lookup + DashboardAlerts
  about/
    page.tsx          # new: one paragraph
  api/
    alerts/
      route.ts        # existing: POST (no change)
      [id]/
        route.ts      # new: PATCH
components/
  AlertForm.tsx       # new: 'use client' form
  DashboardAlerts.tsx # new: 'use client' alert list
```

---

## Validation Architecture

`nyquist_validation` is absent from `.planning/config.json` — treat as **enabled**. However, no test framework is installed and `yolo_mode: true` is set. There are no test files in the project. For this phase, all validation is **manual** (browser-based).

### Test Framework Status

| Property | Value |
|----------|-------|
| Framework | None installed |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements Validation Map

| Req ID | Behavior | Test Type | Verification Method |
|--------|----------|-----------|---------------------|
| UI-01 | Hero section renders headline + subtext | Manual | Open `localhost:3000`, confirm headline visible |
| UI-02 | Form has all 5 fields (CRN, subject, course_number, phone, email optional) | Manual | Inspect form fields in browser |
| UI-03 | Alert count shows live number (not hardcoded 0) | Manual | Submit a new alert, refresh homepage, count increments |
| UI-04 | Success message on 201, error on 4xx, no API call on invalid phone | Manual | Test with valid phone, invalid phone, duplicate CRN+phone |
| UI-05 | Dashboard phone lookup returns correct alerts | Manual | Query with a phone that has active alerts |
| UI-06 | Cancel removes alert from list and sets is_active=false in Supabase | Manual | Cancel alert, check Supabase dashboard |
| UI-07 | About page has one paragraph | Manual | Open `localhost:3000/about` |
| UI-08 | Maroon (#5D1725) visible in header, buttons, brand elements | Manual | Visual check; can verify hex with browser devtools color picker |
| UI-09 | No horizontal scroll at 375px viewport | Manual | DevTools responsive mode at 375px width |
| UI-10 | TCPA consent text present below phone field with exact wording | Manual | Read text on form; compare to locked text in CONTEXT.md |

### Wave 0 Gaps

No test framework to install. Manual verification checklist suffices for this phase per `yolo_mode: true`.

---

## Code Examples

### Supabase Count Query (server component)

```typescript
// Source: Supabase JS client docs pattern — count with head:true
const { count, error } = await adminClient
  .from('alerts')
  .select('*', { count: 'exact', head: true })
  .eq('is_active', true)

const activeCount = count ?? 0
```

`head: true` tells Supabase to return only the count in the response header, not the rows. `count: 'exact'` uses SQL `COUNT(*)`. The `count` property is `number | null` — use `?? 0` for null safety. [ASSUMED — Supabase JS v2 client API; consistent with adminClient usage in project]

### Supabase Alert Fetch for Dashboard

```typescript
// app/dashboard/page.tsx
import { parsePhoneNumber } from 'libphonenumber-js'
import { adminClient } from '@/lib/supabase/admin'

async function fetchAlertsForPhone(rawPhone: string) {
  let e164: string
  try {
    const parsed = parsePhoneNumber(rawPhone, 'US')
    if (!parsed.isValid()) return []
    e164 = parsed.number
  } catch {
    return []
  }

  const { data } = await adminClient
    .from('alerts')
    .select('id, crn, subject, course_number, course_name, created_at')
    .eq('phone_number', e164)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return data ?? []
}
```

### Navigation Header (layout.tsx)

```typescript
// app/layout.tsx — shared header added to RootLayout
import Link from 'next/link'

// Inside the <body>:
<header className="bg-maroon text-white px-4 py-3 flex items-center justify-between">
  <Link href="/" className="font-bold text-lg">CoursesIQ</Link>
  <nav className="flex gap-4">
    <Link href="/" className="hover:underline">Home</Link>
    <Link href="/dashboard" className="hover:underline">Dashboard</Link>
  </nav>
</header>
```

### Inline Validation Error Display Pattern

```typescript
// Accessible inline error — role="alert" causes screen readers to announce it
{errorMessage && (
  <p role="alert" className="text-red-600 text-sm mt-1">
    {errorMessage}
  </p>
)}
```

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `{ count: 'exact', head: true }` returns `count` as `number \| null` on the Supabase JS v2 client | Code Examples / Key Findings | Wrong property name or count=null when 0 rows — would show undefined instead of 0; low risk with `?? 0` guard |
| A2 | Supabase PostgREST error code `PGRST116` is "no rows returned" from `.single()` | PATCH Route | Different error code means 404 not returned on missing ID — fallback: check `!data` after error |
| A3 | `parsePhoneNumber` from libphonenumber-js is safe to import in a `'use client'` component (browser-compatible) | AlertForm pattern | If it has Node.js-only internals, client bundle would fail — but libphonenumber-js is known to be universal |
| A4 | Phone lookup form using `method="GET"` navigation triggers a new server render with fresh searchParams | Dashboard Patterns | If Next.js caches the page, data would be stale — but `searchParams` usage forces dynamic rendering |

**A2 mitigation:** Check both `error` AND `!data` in the PATCH route:
```typescript
if (error || !data) {
  return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
}
```
This handles the case regardless of the exact error code.

---

## Open Questions

1. **Phone lookup UX — what happens with inactive alerts?**
   - What we know: Dashboard queries `is_active = true` alerts only
   - What's unclear: Should we also show recently cancelled alerts? Or only active?
   - Recommendation: Active only for v1 (simpler query, cleaner UX — "no active alerts" is informative enough)

2. **Alert count caching — should the homepage revalidate?**
   - What we know: The homepage is a server component using adminClient. By default, Next.js 15 does NOT cache Route Handler responses but DOES cache RSC renders.
   - What's unclear: Will the count go stale between deploys?
   - Recommendation: Add `export const revalidate = 60` to `app/page.tsx` to refresh the count every 60 seconds, or `export const dynamic = 'force-dynamic'` to always fetch fresh. Force-dynamic is simpler and correct for a live counter. [ASSUMED — Next.js cache behavior for server components with external data]

3. **DashboardAlerts rollback on PATCH failure**
   - What we know: Optimistic removal from local state, rollback to `initial` prop on failure
   - What's unclear: `initial` prop doesn't update after cancel — rollback restores the cancelled item
   - Recommendation: Accept this limitation for v1. If the PATCH fails, the user sees their alert restored. Correct behavior; simple implementation.

---

## Environment Availability

This phase has no new external dependencies beyond what Phases 1-3 already require. All libraries used are already in `package.json`.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| next | All pages | Yes | 15.5.15 | — |
| react | Client components | Yes | 19.1.0 | — |
| tailwindcss | Styling | Yes | ^4 | — |
| @supabase/supabase-js | adminClient queries | Yes | ^2.104.0 | — |
| libphonenumber-js | Phone normalization in RSC + client | Yes | ^1.12.41 | — |
| zod | Optional: PATCH body validation | Yes | ^4.3.6 | Inline validation |

**No new packages needed for Phase 4.**

---

## Sources

### Primary (HIGH confidence)
- `nextjs.org/docs/app/api-reference/file-conventions/page` — searchParams as async Promise, v15 breaking change
- `nextjs.org/docs/app/api-reference/file-conventions/route` — PATCH handler signature, await params pattern
- `nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes` — dynamic segment typing
- `nextjs.org/docs/app/getting-started/mutating-data` — Server Actions vs client fetch tradeoffs
- `tailwindcss.com/docs/theme` — @theme directive, --color-* namespace, utility generation
- `tailwindcss.com/docs/upgrade-guide` — v3→v4 class name changes, @theme vs @theme inline

### Secondary (MEDIUM confidence)
- Existing project files: `app/api/alerts/route.ts`, `lib/supabase/admin.ts`, `lib/supabase/server.ts`, `app/globals.css`, `app/layout.tsx`, `package.json` — verified current project state
- `.planning/phases/03-alert-system-cron-worker/03-02-SUMMARY.md` — POST /api/alerts interface confirmed

### Tertiary (LOW / ASSUMED)
- Supabase JS v2 count query syntax (`count: 'exact', head: true`) — standard Supabase docs pattern
- PostgREST error code PGRST116 for no-rows-returned from `.single()` — mitigated by `!data` check
- libphonenumber-js browser compatibility in client components

---

## Metadata

**Confidence breakdown:**
- Next.js 15 patterns: HIGH — verified from official docs (April 2026)
- Tailwind v4 @theme: HIGH — verified from official docs
- Form patterns (useState + fetch): HIGH — docs + project convention match
- Supabase query patterns: MEDIUM — consistent with existing project code; count query ASSUMED
- PATCH error codes: MEDIUM — standard PostgREST behavior; mitigated by dual check

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (30 days — stable frameworks)

---

## RESEARCH COMPLETE

**Phase:** 4 — Frontend Pages
**Confidence:** HIGH

### Key Findings

1. `searchParams` and `params` are both async Promises in Next.js 15 — `await` is mandatory. This is the most likely source of runtime bugs if missed.
2. `bg-maroon` already works — `--color-maroon: #5D1725` is in the existing `globals.css` `@theme` block. No additional config needed.
3. Use `useState + fetch` for AlertForm (not Server Action) — the POST endpoint expects JSON, client validation must prevent API calls, and inline state management is simpler.
4. The only new API surface in this phase is `PATCH /api/alerts/[id]` — everything else already exists.
5. Phone normalization with `parsePhoneNumber` must happen in the dashboard RSC before the Supabase query — raw user input won't match stored E.164 format.

### Files Created
`G:/MSU Course/.planning/phases/04-frontend-pages/04-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Next.js 15 patterns | HIGH | Verified from official docs (April 2026) |
| Tailwind v4 @theme | HIGH | Verified from official docs; existing globals.css confirmed |
| Form patterns | HIGH | Docs + existing project API contract confirmed |
| Supabase queries | MEDIUM | Pattern consistent with project; count syntax assumed |
| PATCH error codes | MEDIUM | Standard PostgREST; mitigated by dual check |

### Open Questions
- Whether `force-dynamic` or `revalidate = 60` is better for the homepage alert count
- Whether to show inactive alerts in the dashboard (recommendation: active only)

### Ready for Planning
Research complete. Planner can now create PLAN.md files for Phase 4.
