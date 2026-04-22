# Technology Stack: CoursesIQ

**Project:** CoursesIQ — MSU Course Seat Alert System
**Researched:** 2026-04-22
**Overall confidence:** HIGH (all primary claims verified against official docs)

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15.x | Full-stack framework | App Router gives co-located API routes + Server Components; Vercel-native deployment |
| TypeScript | 5.x | Type safety | Required for `RouteContext<'/path'>` helper and `params as Promise` typing |
| Tailwind CSS | 4.x | Styling | Zero-runtime, utility-first; ships with Next.js 15 create template |
| React | 19.x | UI layer | Bundled with Next.js 15; required for App Router |

### Database & Backend

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase | hosted | Postgres DB + optional Auth | Managed Postgres, built-in RLS, JS SDK with SSR-aware client |
| @supabase/supabase-js | 2.x | Core Supabase client | Required base package |
| @supabase/ssr | latest | SSR-aware cookie handling | Replaces deprecated `@supabase/auth-helpers-nextjs`; handles cookie refresh in middleware |

### Deployment & Scheduling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel | Pro tier | Hosting + Cron | Free tier cron minimum is **once per day** — Pro tier minimum is **once per minute** |
| vercel.json | — | Cron configuration | Declarative `crons` array, tied to production deployment only |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| twilio | latest | SMS dispatch | Official Node SDK; use in server-only cron route |
| zod | 3.x | Runtime validation | Validate alert creation POST body before writing to DB |
| server-only | — | Import guard | Add to any module that must never ship to the browser |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Scheduling | Vercel Cron (Pro) | GitHub Actions / cron-job.org | Vercel Cron is zero-infra and co-located; external cron needs public endpoint security |
| Database | Supabase | PlanetScale / Prisma + Neon | Supabase bundles Postgres + RLS + dashboard without extra ORMs |
| SMS | Twilio | AWS SNS | Twilio has simpler SDK, better DX for small projects |
| Auth client | @supabase/ssr | @supabase/auth-helpers-nextjs | Auth Helpers package is deprecated; SSR is the current replacement |

---

## Installation

```bash
# Core
npx create-next-app@latest coursesiq --typescript --tailwind --app --src-dir

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# SMS
npm install twilio

# Validation
npm install zod

# Import guard for server-only modules
npm install server-only
```

---

## Critical Patterns

### 1. Next.js 15 App Router Route Handler Structure

Route handlers live in `app/api/**/route.ts`. **Never place a `route.ts` and a `page.ts` in the same segment directory.**

```ts
// app/api/alerts/route.ts  <-- POST: create a new alert
// app/api/cron/check-seats/route.ts  <-- GET: triggered by Vercel Cron
```

Basic GET handler shape (Next.js 15):

```typescript
// app/api/alerts/route.ts
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const phone = searchParams.get('phone')
  return Response.json({ phone })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  // validate with zod, then insert to Supabase
  return Response.json({ success: true }, { status: 201 })
}
```

Dynamic route segment with async params (Next.js 15 BREAKING CHANGE — params is now a Promise):

```typescript
// app/api/alerts/[id]/route.ts
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params   // <-- must await; sync access is deprecated
  // delete alert by id
  return new Response(null, { status: 204 })
}
```

Or use the `RouteContext` helper (requires running `next build` or `next typegen` first):

```typescript
import type { NextRequest } from 'next/server'

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/alerts/[id]'>
) {
  const { id } = await ctx.params
  return new Response(null, { status: 204 })
}
```

Reading headers in a route handler (Next.js 15 — `headers()` is async):

```typescript
import { headers } from 'next/headers'

export async function GET(request: NextRequest) {
  const headersList = await headers()           // <-- must await in Next.js 15
  const auth = headersList.get('authorization')
  // OR: const auth = request.headers.get('authorization')  -- direct, no await needed
}
```

**Gotcha — GET handlers are NOT cached by default in Next.js 15.** This changed from v14. If you need static/cached GET responses, opt in explicitly:

```typescript
export const dynamic = 'force-static'   // opt into caching
// or
export const revalidate = 60            // ISR-style revalidation
```

**Gotcha — Route handlers are dynamic by default now.** Accessing `request.headers`, `cookies()`, or `headers()` makes the route dynamic; do not add `export const dynamic = 'force-static'` to any route that reads cookies or auth headers.

---

### 2. Vercel Cron Job Configuration

#### Tier Limits (verified from official Vercel docs, April 2026)

| Plan | Max Cron Jobs | Minimum Interval | Timing Precision |
|------|--------------|-----------------|-----------------|
| Hobby (free) | 100 | Once per day | ±59 minutes |
| Pro ($20/mo) | 100 | Once per minute | Per-minute |
| Enterprise | 100 | Once per minute | Per-minute |

**CoursesIQ needs every 5 minutes — this requires Vercel Pro.** The Hobby plan will reject deployment with: `Hobby accounts are limited to daily cron jobs. This cron expression would run more than once per day.`

#### vercel.json Configuration

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

Key constraints:
- `path` must start with `/`
- Timezone is always **UTC** — no timezone override supported
- Cron jobs only trigger on **production** deployments, not preview deployments
- Vercel **does not retry** failed cron invocations
- Vercel **can trigger duplicate events** — design handlers to be idempotent
- Cron jobs do **not** follow HTTP redirects (3xx is treated as final)
- If cron runs longer than 5 minutes, a second instance can overlap — use a DB lock or idempotent check

---

### 3. Securing the Cron Endpoint with CRON_SECRET

Vercel automatically injects the `CRON_SECRET` value as a `Bearer` token in the `Authorization` header on every cron invocation. You must validate this header in your route handler.

```typescript
// app/api/cron/check-seats/route.ts
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Seat-checking logic here
  return Response.json({ ok: true })
}
```

Setup steps:
1. Generate a random string of at least 16 characters (use 1Password or `openssl rand -base64 32`)
2. Add it to Vercel project environment variables as `CRON_SECRET` (Production environment only)
3. Add it to local `.env.local` for testing with `curl -H "Authorization: Bearer <secret>" http://localhost:3000/api/cron/check-seats`

**Gotcha:** Do not put `CRON_SECRET` behind the `NEXT_PUBLIC_` prefix. It must remain server-only. Never log or return it in a response.

---

### 4. Supabase Client Setup for Next.js 15 App Router

Install both packages:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

**New key format (2025):** Supabase has deprecated the legacy `ANON_KEY` JWT in favor of a new publishable key format. Use:

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxx   # new format
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key             # server-only, never NEXT_PUBLIC_
```

The legacy `anon` key still works as a transition period, but migrate to the publishable key. Supabase documentation notes "legacy keys will be deprecated shortly."

#### Browser Client (Client Components only)

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

#### Server Client (Server Components, Route Handlers, Server Actions)

```typescript
// lib/supabase/server.ts
import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component — cookies are read-only there.
            // Middleware will handle the refresh; ignore the error here.
          }
        },
      },
    }
  )
}
```

#### Admin/Service Client (Cron Route Only — bypasses RLS)

```typescript
// lib/supabase/admin.ts
import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Use ONLY in server-side routes that need RLS bypass (e.g., cron job)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

**Gotcha:** The `service_role` key bypasses ALL RLS policies. Use it only in the cron handler where you need to read all alerts across all users. Never expose it to the browser or use it in client components.

#### Middleware (Session Refresh)

```typescript
// middleware.ts  (in project root, NOT inside /app)
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — do NOT use getSession() here; use getClaims()
  await supabase.auth.getClaims()

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**Critical Gotcha — getSession() vs getClaims():**
- `getSession()` does NOT revalidate the JWT on the server; it reads the session from the cookie as-is
- `getClaims()` validates the JWT signature against Supabase's published public keys on every call
- **Always use `getClaims()` for server-side auth checks.** Never use `getSession()` in server code to protect resources.

---

### 5. Row Level Security for the Alerts Table

The `alerts` table stores phone numbers — sensitive PII. RLS must be enabled.

#### Schema pattern

```sql
create table alerts (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  course_code text not null,
  section_number text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  notified_at timestamptz
);

-- Enable RLS immediately after table creation
alter table alerts enable row level security;
```

#### RLS strategy for CoursesIQ

CoursesIQ has two actors:

1. **Public users** — submit their phone number to create an alert (no account required)
2. **Cron job** — reads all active alerts (uses `service_role` key, bypasses RLS)

Since there is no per-user auth in the basic implementation, RLS serves primarily as a hardened default:

```sql
-- Allow INSERT from anonymous users (public alert creation via API route)
create policy "allow_anon_insert"
  on alerts
  for insert
  to anon
  with check (true);

-- Deny all SELECT/UPDATE/DELETE from anon role
-- (No SELECT policy = no public read access to phone numbers)

-- The cron job uses service_role key which bypasses RLS entirely
-- so no additional policy is needed for the cron reader
```

If Supabase Auth is added later (users log in to manage their alerts):

```sql
-- Users can only read/delete their own alerts
create policy "users_own_alerts"
  on alerts
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

**Critical RLS Gotchas:**

1. **RLS is NOT enabled by default** on tables created via SQL (only via the Table Editor). Always add `alter table X enable row level security;` immediately after `create table`.
2. **No SELECT policy = no rows returned** (not an error). If you forget to add a SELECT policy and wonder why queries return empty, this is why.
3. **`service_role` key bypasses all RLS.** This is intentional for the cron job, but it means if `SUPABASE_SERVICE_ROLE_KEY` is leaked, all data is exposed. Never put it in client code.
4. **`auth.uid()` returns null for unauthenticated requests**, and `null = uuid` is false, so policies using `auth.uid()` silently block anonymous users.
5. **Supabase now alerts you** via dashboard and email if you create tables with RLS disabled — treat these alerts as mandatory actions, not optional.

---

### 6. Environment Variables — Complete Reference

```env
# .env.local (development) — never commit this file

# Supabase — both are safe to expose to browser (NEXT_PUBLIC_)
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghij.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxx

# Supabase service role — SERVER ONLY, never NEXT_PUBLIC_
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Vercel cron security — SERVER ONLY
CRON_SECRET=randomly-generated-32-char-string

# Twilio — SERVER ONLY
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+15551234567
```

**Next.js 15 env variable rules:**

| Prefix | Available In | Notes |
|--------|-------------|-------|
| `NEXT_PUBLIC_` | Server + Client (browser) | Inlined at build time; visible in JS bundle |
| (no prefix) | Server only | Route handlers, Server Components, middleware |

**Gotcha:** Variables without `NEXT_PUBLIC_` are available in Server Components and API routes at runtime, but `undefined` in Client Components. TypeScript will not warn you — this is a runtime error. Use the `server-only` package to make it a build-time error:

```typescript
// lib/supabase/admin.ts
import 'server-only'  // throws at build time if imported in a client component
```

**Vercel environment variable scoping:** Add secrets in Vercel Dashboard > Project Settings > Environment Variables. Scope `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` to **Production** only (not Preview or Development) to limit exposure surface.

---

## Project File Structure

```
G:/MSU Course/
├── app/
│   ├── api/
│   │   ├── alerts/
│   │   │   └── route.ts          # POST: create alert
│   │   └── cron/
│   │       └── check-seats/
│   │           └── route.ts      # GET: seat check, secured by CRON_SECRET
│   ├── layout.tsx
│   └── page.tsx                  # Alert creation form
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # createBrowserClient (client components)
│   │   ├── server.ts             # createServerClient (server components/routes)
│   │   └── admin.ts              # service_role client (cron only)
│   └── twilio.ts                 # Twilio SDK wrapper (server-only)
├── middleware.ts                  # Session refresh (project root)
├── vercel.json                   # Cron schedule
└── .env.local                    # Never committed
```

---

## Sources

- [Next.js Route Handlers — Official Docs](https://nextjs.org/docs/app/getting-started/route-handlers) (verified 2026-04-21)
- [Next.js route.js API Reference](https://nextjs.org/docs/app/api-reference/file-conventions/route) (verified 2026-04-21)
- [Vercel Cron Jobs Overview](https://vercel.com/docs/cron-jobs) (verified 2026-04)
- [Vercel Cron Jobs — Usage & Pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) (verified 2026-04)
- [Vercel Cron Jobs — Managing & CRON_SECRET](https://vercel.com/docs/cron-jobs/manage-cron-jobs) (verified 2026-04)
- [Vercel Cron Quickstart](https://vercel.com/docs/cron-jobs/quickstart) (verified 2026-04)
- [Supabase SSR — Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) (verified 2026-04)
- [Supabase SSR — Creating a Client](https://supabase.com/docs/guides/auth/server-side/creating-a-client) (verified 2026-04)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) (verified 2026-04)
- [Supabase API Keys Guide](https://supabase.com/docs/guides/api/api-keys) (official docs)
- [Next.js 15 GET/POST Examples](https://www.wisp.blog/blog/nextjs-15-api-get-and-post-request-examples) (MEDIUM confidence — community source)
