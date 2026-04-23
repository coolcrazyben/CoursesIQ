# Phase 1: Project Scaffold & Database - Research

**Researched:** 2026-04-22
**Domain:** Next.js 15 App Router scaffold, Supabase SSR client setup, Tailwind CSS v4, SQL schema + RLS
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Run `npx create-next-app .` in `G:/MSU Course` — project files go directly in the current directory (no subfolder).
- **D-02:** create-next-app options: TypeScript, Tailwind CSS, App Router, ESLint, no src/ directory, default import alias (`@/*`).
- **D-03:** No Supabase project exists yet. Phase tasks must include: create Supabase project at supabase.com, retrieve `NEXT_PUBLIC_SUPABASE_URL`, publishable key (see Research note), and `SUPABASE_SERVICE_ROLE_KEY`, and create `.env.local` before any lib/ modules can be tested.
- **D-04:** Schema migration delivered as a single raw SQL file at `supabase/schema.sql` — copy-paste into Supabase Dashboard SQL Editor. No Supabase CLI or Docker required.

### Claude's Discretion
- Migration format chosen: raw SQL file (no CLI tooling) — simplest path for a solo developer starting fresh.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | Next.js 15 App Router project initializes with TypeScript, Tailwind CSS, and ESLint | create-next-app CLI flags documented |
| INFRA-02 | Supabase `alerts` table with all required columns | Exact SQL schema provided |
| INFRA-03 | Supabase `courses` table as cache | Exact SQL schema provided |
| INFRA-04 | RLS enabled on both tables; anon INSERT only on alerts; service_role bypass | RLS SQL policies documented |
| INFRA-05 | Three Supabase client modules: client.ts, server.ts, admin.ts | All three patterns verified with source code |
</phase_requirements>

---

## Summary

Phase 1 scaffolds the entire foundation for CoursesIQ: a Next.js 15 project wired to Supabase with RLS-enforced tables and three typed client modules. The research surface is primarily well-documented APIs — create-next-app, @supabase/ssr, Tailwind CSS v4 — but there are two significant version-transition gotchas that would burn a developer relying on cached knowledge.

**Gotcha 1 — Tailwind v4 is the scaffold default.** As of the current Next.js docs (version 16.2.4 documentation, reflecting the canonical state), `create-next-app` with `--tailwind` scaffolds Tailwind CSS v4, not v3. There is no `tailwind.config.ts` generated. Custom colors go in `globals.css` using `@theme { --color-maroon: #5D1725; }`. The postcss config uses `@tailwindcss/postcss` not the legacy `tailwindcss` plugin.

**Gotcha 2 — Supabase publishable key replaces anon key for new projects.** Projects created after November 1, 2025 use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (format: `sb_publishable_xxx`) instead of `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The variable name in `.env.local` and all client code must use the new name. Legacy anon keys are no longer provisioned on new projects.

**Primary recommendation:** Scaffold with the exact flags below, install all dependencies in one pass, write the three Supabase client modules using `@supabase/ssr` + `createClient` from `supabase-js` (admin only), and deliver the SQL migration file for manual paste — no CLI tooling needed.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Supabase browser client | Browser / Client | — | Runs in Client Components; uses browser cookies |
| Supabase server client | API / Backend (RSC + Route Handlers) | — | Reads request cookies; must be created per-request |
| Supabase admin client | API / Backend (cron routes only) | — | service_role bypasses RLS; must never reach browser |
| Database schema + RLS | Database / Storage | — | Pure Postgres SQL; no app-tier involvement |
| Tailwind CSS config | Frontend Server (build-time) | — | PostCSS transform at build; @theme in globals.css |
| Environment variables | All tiers (build + runtime) | — | NEXT_PUBLIC_ vars reach browser; others server-only |
| lib/ stubs | API / Backend | Browser / Client | Stubs establish import contracts for future phases |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.x (latest patch) | Framework; App Router, RSC, routing | Required by project |
| @supabase/ssr | 0.10.2 | SSR-safe Supabase clients (createBrowserClient, createServerClient) | Official replacement for deprecated auth-helpers-nextjs |
| @supabase/supabase-js | 2.104.0 | Core Supabase client; used directly for admin (service_role) | Required by @supabase/ssr as peer dep |
| tailwindcss | 4.2.4 | Utility CSS framework (v4, CSS-first config) | Scaffolded by create-next-app |
| @tailwindcss/postcss | (bundled with tailwindcss v4) | PostCSS plugin for Tailwind v4 | v4 requires this instead of legacy tailwindcss postcss plugin |
| typescript | 5.x | Type safety | Required by project |
| zod | 4.3.6 | Schema validation for API inputs | Standard for Next.js API validation |

### Supporting (Phase 1 stubs; implemented in later phases)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| twilio | ^5.13.1 (pin at v5) | SMS sending | Phase 3 — stub only in Phase 1 |
| libphonenumber-js | 1.12.41 | E.164 phone normalization | Phase 3 — stub only |
| axios | 1.15.2 | HTTP client for Banner scraper | Phase 2 — stub only |
| tough-cookie | 6.0.1 | Cookie jar for axios session management | Phase 2 — stub only |
| axios-cookiejar-support | 6.0.5 | Integrates tough-cookie with axios | Phase 2 — stub only |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @supabase/ssr | auth-helpers-nextjs | auth-helpers-nextjs is deprecated; @supabase/ssr is the official replacement |
| twilio@^5 | twilio@^6 | v6.0.0 released 2026-04-16; breaking change: Node.js minimum raised from 14 to 20; no migration guide published yet — pin v5 |
| zod@4 | yup, joi | zod v4 has improved performance and TypeScript inference; standard in Next.js ecosystem |

**Installation command (all Phase 1 deps in one pass):**
```bash
npm install @supabase/ssr @supabase/supabase-js twilio@^5 libphonenumber-js zod axios tough-cookie axios-cookiejar-support
```

**Version verification (performed 2026-04-22):**
```
@supabase/ssr:      0.10.2  (npm registry)
@supabase/supabase-js: 2.104.0  (npm registry)
twilio latest v5:   5.13.1  (npm registry — v6.0.0 is latest tag)
libphonenumber-js:  1.12.41 (npm registry)
zod:                4.3.6   (npm registry)
axios:              1.15.2  (npm registry)
tough-cookie:       6.0.1   (npm registry)
axios-cookiejar-support: 6.0.5 (npm registry)
tailwindcss:        4.2.4   (npm registry — v4 is current latest)
next latest v15:    15.x.x  (use npx create-next-app@15 for v15 pin)
```

---

## Architecture Patterns

### System Architecture Diagram

```
create-next-app . (scaffold)
        │
        ▼
┌──────────────────────────────────────────────────────┐
│  Next.js 15 App Router (G:/MSU Course/)              │
│                                                      │
│  app/                                                │
│  ├── layout.tsx ──────────────────────────────────── │─► globals.css (@import tailwindcss + @theme)
│  ├── page.tsx (stub)                                 │
│  └── api/ (stub route handlers)                     │
│                                                      │
│  lib/                                                │
│  ├── supabase/                                       │
│  │   ├── client.ts ──► createBrowserClient()        │─► Browser (Client Components)
│  │   ├── server.ts ──► createServerClient()         │─► RSC + Route Handlers (reads cookies)
│  │   └── admin.ts  ──► createClient(service_role)   │─► Cron routes only (bypasses RLS)
│  ├── banner.ts (stub)                               │
│  ├── twilio.ts (stub)                               │
│  └── validators.ts (stub)                           │
└──────────────────────────────────────────────────────┘
        │                         │
        ▼                         ▼
   .env.local                supabase/schema.sql
   (secrets)                 (manual paste → Dashboard)
        │
        ▼
┌──────────────────────┐
│  Supabase Project    │
│  ├── alerts table    │
│  │   └── RLS: anon  │
│  │       INSERT only │
│  └── courses table   │
│      └── RLS: no     │
│          anon access │
└──────────────────────┘
```

### Recommended Project Structure
```
G:/MSU Course/
├── app/
│   ├── layout.tsx          # Root layout, imports globals.css
│   ├── page.tsx            # Homepage stub
│   ├── globals.css         # @import tailwindcss + @theme maroon color
│   └── api/                # Route handler stubs (Phase 2+)
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # createBrowserClient (Client Components)
│   │   ├── server.ts       # createServerClient (RSC + Route Handlers)
│   │   └── admin.ts        # createClient with service_role (cron only)
│   ├── banner.ts           # Stub — implemented Phase 2
│   ├── twilio.ts           # Stub — implemented Phase 3
│   └── validators.ts       # Stub — implemented Phase 3
├── supabase/
│   └── schema.sql          # Full schema + RLS, paste into Dashboard
├── .env.local              # Secrets (gitignored)
├── .env.example            # Documented keys with placeholders
├── next.config.ts          # Minimal Next.js config
├── postcss.config.mjs      # @tailwindcss/postcss plugin
├── tsconfig.json           # Generated by create-next-app
└── package.json
```

### Pattern 1: create-next-app Scaffold (Non-Interactive)
**What:** Single command that scaffolds everything with correct flags, skipping interactive prompts
**When to use:** Initial project creation in current directory

```bash
# Source: https://nextjs.org/docs/app/api-reference/cli/create-next-app
# Run from G:/MSU Course — installs into current directory
npx create-next-app@15 . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --import-alias "@/*" \
  --use-npm
# Note: --no-src-dir is the default (src/ directory is opt-in via --src-dir)
# Note: --app selects App Router (not Pages Router)
# Note: omitting --src-dir means files go directly in root (app/, lib/, etc.)
```

**v15-specific prompts (if running interactively):**
```
Would you like to use the recommended Next.js defaults?
  → "Yes, use recommended defaults" (TypeScript, ESLint, Tailwind CSS, App Router, AGENTS.md)
  OR choose "No, customize settings" and answer:
    TypeScript? Yes
    Linter? ESLint
    React Compiler? No
    Tailwind CSS? Yes
    src/ directory? No
    App Router? Yes
    Customize import alias? No (accepts default @/*)
    AGENTS.md? No (not needed)
```

**What create-next-app generates with Tailwind:**
- `postcss.config.mjs` using `@tailwindcss/postcss` (Tailwind v4)
- `app/globals.css` with `@import 'tailwindcss'` (no @tailwind directives)
- NO `tailwind.config.ts` — this is the v4 CSS-first architecture
- Turbopack enabled as default dev bundler

### Pattern 2: Tailwind v4 Custom Color Token
**What:** Add MSU maroon color as a CSS custom property via @theme
**When to use:** After scaffold — edit globals.css

```css
/* Source: https://tailwindcss.com/docs/theme (Tailwind v4 CSS-first config) */
/* app/globals.css */
@import 'tailwindcss';

@theme {
  --color-maroon: #5D1725;
}
```

This generates utility classes: `bg-maroon`, `text-maroon`, `border-maroon`, `ring-maroon`, etc.

**v3 alternative (for reference only — NOT what create-next-app scaffolds in 2026):**
```typescript
// tailwind.config.ts (v3 only — does NOT exist in v4 scaffolds)
import type { Config } from 'tailwindcss'
export default {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { maroon: '#5D1725' }
    }
  }
} satisfies Config
```

### Pattern 3: Supabase Client — Browser (client.ts)
**What:** Client-side Supabase client for use in `'use client'` components
**When to use:** Client Components that need Supabase (real-time subscriptions, user-interactive queries)

```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
// lib/supabase/client.ts
'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

**Note on env var name:** New Supabase projects (created after November 2025) use
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (format: `sb_publishable_xxx`), NOT
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. The CONTEXT.md references the old name — use the
new name for a fresh project. Both work identically at the SDK level.

### Pattern 4: Supabase Client — Server (server.ts)
**What:** Server-side client for RSC and Route Handlers; reads/writes cookies for session management
**When to use:** Server Components, API routes, Server Actions that need Supabase with user context

```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  // cookies() is async in Next.js 15 — must await
  // Source: https://nextjs.org/docs/app/api-reference/functions/cookies
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
            // Silently fail when called from a Server Component
            // (cookies can only be set in Route Handlers / Server Actions)
          }
        },
      },
    }
  )
}
```

**Critical:** `createClient()` must be called `await createClient()` at every call site
because `cookies()` is async in Next.js 15. This function returns a Promise, not a client directly.

### Pattern 5: Supabase Client — Admin (admin.ts)
**What:** Service-role client that bypasses RLS; for cron/background operations only
**When to use:** `GET /api/cron/check-seats` — reading all active alerts, writing sms_sent_at

```typescript
// Source: https://adrianmurage.com/posts/supabase-service-role-secret-key/
// Source: https://github.com/orgs/supabase/discussions/30739
// lib/supabase/admin.ts
import 'server-only'  // Prevents this module from being imported client-side
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

**Why `createClient` from `supabase-js`, NOT `createServerClient` from `@supabase/ssr`:**
The SSR client is designed to read user sessions from cookies. If initialized with the
service_role key, the cookie-based user session can override the Authorization header and
strip the service_role privileges. The direct `createClient` from `supabase-js` is the
correct pattern for admin operations.

**Why `import 'server-only'`:** Guarantees a build-time error if this module is accidentally
imported in a Client Component. The service_role key must never reach the browser.

**Why `persistSession: false` / `autoRefreshToken: false`:** Server environment has no browser
storage; session persistence and refresh are meaningless and can cause errors.

### Pattern 6: async params in Next.js 15 Dynamic Routes
**What:** params prop is now a Promise in Next.js 15; must be awaited
**When to use:** Any file at `app/api/course/[crn]/route.ts` or `app/[slug]/page.tsx`

```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/page
// app/api/course/[crn]/route.ts (Phase 2 stub)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ crn: string }> }
) {
  const { crn } = await params  // MUST await — params is a Promise in Next.js 15
  // stub: return NextResponse.json({ crn })
}
```

**Same pattern applies to searchParams:**
```typescript
// page.tsx
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { phone } = await searchParams  // Also async in Next.js 15
}
```

### Pattern 7: next.config.ts Baseline
**What:** Minimal Next.js 15 config; Turbopack is default, no special settings needed for this phase

```typescript
// Source: https://nextjs.org/docs/app/api-reference/config/next-config-js
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Twilio uses Node.js native modules — exclude from bundler
  // Not in Next.js built-in serverExternalPackages list; must be explicit
  serverExternalPackages: ['twilio'],
}

export default nextConfig
```

**Why `serverExternalPackages: ['twilio']`:** Twilio is not in Next.js's built-in
externals list and uses Node.js native features. Adding it here (plus `export const runtime = 'nodejs'`
in each importing route) prevents Edge Runtime bundling errors.

### Anti-Patterns to Avoid
- **Using `createServerClient` for admin operations:** SSR client designed for user sessions; cookie-based sessions can override service_role key. Use `createClient` from `supabase-js` for admin.
- **Importing `admin.ts` in Client Components:** `import 'server-only'` prevents this at build time, but the pattern must be enforced architecturally.
- **Using `NEXT_PUBLIC_SUPABASE_ANON_KEY` for new projects:** New Supabase projects (post-November 2025) don't have an anon key; use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Not awaiting `cookies()` in Next.js 15:** `cookies()` is async in Next.js 15; calling it synchronously still works (backwards compat) but will be deprecated.
- **Not awaiting `params` in Next.js 15:** Same as above — synchronous access is deprecated.
- **Using Tailwind v3 config patterns with v4:** There is no `tailwind.config.ts` in v4 scaffolds. Custom colors go in `@theme {}` in `globals.css`.
- **Installing `twilio@latest` (v6):** `npm install twilio` resolves to v6.0.0. Must pin explicitly: `npm install twilio@^5`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Phone normalization | Custom regex for E.164 | `libphonenumber-js` | International format edge cases, carrier variations, country codes |
| API input validation | Manual type checks | `zod` | Type inference, error messages, nested schemas |
| Supabase cookie management | Custom cookie read/write | `@supabase/ssr` createServerClient cookie handlers | Token refresh, SameSite, Secure flags, auth token format |
| SMS sending | Direct HTTP to Twilio REST | `twilio` SDK | Status callbacks, error codes, retry logic, A2P compliance |
| HTTP session management | Manual cookie parsing | `tough-cookie` + `axios-cookiejar-support` | RFC 6265 compliance, domain scoping, expiry |

**Key insight:** The Supabase SSR cookie handling (getAll/setAll) looks trivial but handles
auth token refresh, response header injection, and Server Component limitations. Custom
implementations consistently break token refresh or leak session data.

---

## SQL Schema

### alerts table
```sql
-- Source: ROADMAP.md Phase 1 deliverables + CONTEXT.md specifics
-- Confirmed column types match Supabase Postgres (uuid, text, bool, timestamptz, int)

create table if not exists public.alerts (
  id               uuid        primary key default gen_random_uuid(),
  crn              text        not null,
  subject          text        not null,
  course_number    text        not null,
  course_name      text,
  phone_number     text        not null,
  email            text,
  school           text        not null default 'MSU',
  term_code        text        not null,
  is_active        boolean     not null default true,
  created_at       timestamptz not null default now(),
  sms_sent_at      timestamptz,
  sms_opted_out    boolean     not null default false,
  last_seats_avail integer,
  sms_sid          text,
  alert_reset_at   timestamptz
);
```

### courses table
```sql
-- Source: REQUIREMENTS.md INFRA-03 + ROADMAP.md Phase 1 deliverables

create table if not exists public.courses (
  crn              text        primary key,
  course_name      text,
  section          text,
  professor        text,
  seats_total      integer,
  seats_available  integer,
  last_checked     timestamptz
);
```

### RLS Policies
```sql
-- Source: REQUIREMENTS.md INFRA-04: anon INSERT only on alerts; no anon SELECT; service_role bypasses

-- Enable RLS on both tables
alter table public.alerts  enable row level security;
alter table public.courses enable row level security;

-- alerts: anon role may INSERT (create alert) but NOT SELECT (phone numbers are PII)
create policy "anon_insert_alerts"
  on public.alerts
  for insert
  to anon
  with check (true);

-- alerts: no SELECT policy for anon — phone numbers are PII
-- service_role bypasses RLS automatically (no policy needed)

-- courses: no anon access (read/write only via service_role in cron)
-- If API route /api/course/[crn] needs to read courses table using server client
-- (publishable key, not service_role), add a SELECT policy:
create policy "anon_select_courses"
  on public.courses
  for select
  to anon
  using (true);

-- Note: The cron handler uses service_role (admin.ts) which bypasses RLS entirely.
-- The /api/course/[crn] public endpoint uses server.ts (publishable key) so needs
-- the anon_select_courses policy above if courses data is publicly readable.
-- If courses should only be read by service_role, remove this policy.
```

**RLS policy design note:** The CONTEXT.md states "service_role bypasses" — this is automatic
in Supabase (service_role has `BYPASSRLS` privilege at the Postgres level). No explicit
service_role policy is needed. Only anon-role policies require explicit `CREATE POLICY` statements.

### Full supabase/schema.sql (ready to paste into Dashboard SQL Editor)
```sql
-- CoursesIQ Database Schema
-- Paste into: Supabase Dashboard > SQL Editor > New Query > Run

-- ===== TABLES =====

create table if not exists public.alerts (
  id               uuid        primary key default gen_random_uuid(),
  crn              text        not null,
  subject          text        not null,
  course_number    text        not null,
  course_name      text,
  phone_number     text        not null,
  email            text,
  school           text        not null default 'MSU',
  term_code        text        not null,
  is_active        boolean     not null default true,
  created_at       timestamptz not null default now(),
  sms_sent_at      timestamptz,
  sms_opted_out    boolean     not null default false,
  last_seats_avail integer,
  sms_sid          text,
  alert_reset_at   timestamptz
);

create table if not exists public.courses (
  crn              text        primary key,
  course_name      text,
  section          text,
  professor        text,
  seats_total      integer,
  seats_available  integer,
  last_checked     timestamptz
);

-- ===== ROW LEVEL SECURITY =====

alter table public.alerts  enable row level security;
alter table public.courses enable row level security;

-- alerts: anon role can INSERT new alerts (create a seat watch)
-- No SELECT for anon — phone numbers are PII
create policy "anon_insert_alerts"
  on public.alerts
  for insert
  to anon
  with check (true);

-- courses: anon role can SELECT (course info is not sensitive)
-- Required for /api/course/[crn] route using publishable key client
create policy "anon_select_courses"
  on public.courses
  for select
  to anon
  using (true);

-- service_role bypasses RLS automatically — no policy needed
-- Cron handler (admin.ts) uses service_role for all alert reads and updates
```

---

## Common Pitfalls

### Pitfall 1: Tailwind v4 — No tailwind.config.ts Generated
**What goes wrong:** Developer adds custom colors to a `tailwind.config.ts` file that doesn't exist, or expects `@tailwind base` / `@tailwind components` / `@tailwind utilities` directives in globals.css.
**Why it happens:** Tailwind v4 changed to CSS-first configuration; all tutorials and Stack Overflow answers from before mid-2025 show the v3 pattern.
**How to avoid:** After scaffold, check `globals.css` — if it starts with `@import 'tailwindcss'`, you're on v4. Add custom colors via `@theme { --color-maroon: #5D1725; }`.
**Warning signs:** Build errors about unknown Tailwind directives; `tailwind.config.ts` doesn't exist but was expected.

### Pitfall 2: Supabase Anon Key Does Not Exist on New Projects
**What goes wrong:** Developer looks for `SUPABASE_ANON_KEY` in the Supabase dashboard and can't find it; copies `sb_publishable_xxx` but uses wrong env var name `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
**Why it happens:** Supabase changed key naming for projects created after November 2025. The old variable name in all existing docs/tutorials is `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
**How to avoid:** For new projects, use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` and in all three client modules.
**Warning signs:** "Invalid API key" errors on client initialization; dashboard shows `sb_publishable_xxx` format key, not a JWT.

### Pitfall 3: Admin Client Using @supabase/ssr — Service Role Gets Overridden
**What goes wrong:** Developer uses `createServerClient` from `@supabase/ssr` with the service_role key. The cookie-based user session in the request overwrites the Authorization header, causing RLS to apply anyway.
**Why it happens:** The SSR client is explicitly designed to forward user session cookies. That feature conflicts with service_role usage.
**How to avoid:** Admin client must use `createClient` from `@supabase/supabase-js` directly, with `persistSession: false`.
**Warning signs:** RLS policy denials even with service_role key; queries only return user-scoped data.

### Pitfall 4: Not Awaiting cookies() or params in Next.js 15
**What goes wrong:** Synchronous access to `cookies()` or dynamic `params` — code runs without error in dev (backwards compat preserved) but TypeScript and the Next.js compiler will warn, and the behavior is deprecated.
**Why it happens:** Next.js 15 made these APIs async; the sync access path is kept for migration but flagged as deprecated.
**How to avoid:** Always `const cookieStore = await cookies()` and `const { crn } = await params`.
**Warning signs:** TypeScript error: "Type 'Promise<...>' is not assignable to type '...'"; Next.js deprecation warnings in console.

### Pitfall 5: Installing twilio Without Version Pin
**What goes wrong:** `npm install twilio` resolves to v6.0.0 (current `latest` tag as of April 2026). v6 breaks if Node.js < 20, and there is no published migration guide.
**Why it happens:** npm resolves `twilio` to `latest` which is v6.0.0.
**How to avoid:** Always `npm install twilio@^5` to pin to the v5 range (latest: 5.13.1).
**Warning signs:** Unexpected peer dependency errors; `package.json` shows `"twilio": "^6.0.0"`.

### Pitfall 6: Missing `export const runtime = 'nodejs'` on Twilio Routes
**What goes wrong:** Twilio imports fail in the Edge Runtime with "module not found" or native module errors.
**Why it happens:** Next.js defaults to Edge Runtime for API routes; Twilio requires Node.js native modules. `twilio` is not in Next.js's built-in `serverExternalPackages` list.
**How to avoid:** Two-part fix: (1) add `serverExternalPackages: ['twilio']` to `next.config.ts`, AND (2) add `export const runtime = 'nodejs'` at the top of every route that imports twilio.
**Warning signs:** Edge runtime errors mentioning `twilio`; "Cannot use native module in Edge Runtime".

---

## Code Examples

### Verified: globals.css for Tailwind v4 + Maroon
```css
/* Source: https://nextjs.org/docs/app/getting-started/css */
/* Source: https://tailwindcss.com/docs/theme */
@import 'tailwindcss';

@theme {
  --color-maroon: #5D1725;
}
```

### Verified: postcss.config.mjs for Tailwind v4
```javascript
/* Source: https://nextjs.org/docs/app/getting-started/css */
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

### Verified: next.config.ts baseline
```typescript
/* Source: https://nextjs.org/docs/app/api-reference/config/next-config-js */
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['twilio'],
}

export default nextConfig
```

### Verified: .env.local template
```bash
# Supabase — get from: supabase.com/dashboard > Project Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxx
SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret_here

# Twilio — get from: console.twilio.com
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

# Security
CRON_SECRET=your_random_secret_for_cron_endpoint
```

### Verified: lib/banner.ts stub (Phase 2 placeholder)
```typescript
// Phase 1 stub — full implementation in Phase 2
export async function getBannerSession(): Promise<string> {
  throw new Error('Not implemented — Phase 2')
}

export async function fetchSeatsBySubject(
  _subject: string,
  _courseNumber: string,
  _termCode: string
): Promise<unknown[]> {
  throw new Error('Not implemented — Phase 2')
}
```

### Verified: lib/twilio.ts stub (Phase 3 placeholder)
```typescript
// Phase 1 stub — full implementation in Phase 3
// export const runtime = 'nodejs'  ← Add to API routes that import this
export async function sendSmsAlert(
  _to: string,
  _message: string
): Promise<string> {
  throw new Error('Not implemented — Phase 3')
}
```

### Verified: lib/validators.ts stub (Phase 3 placeholder)
```typescript
// Phase 1 stub — implemented in Phase 3
import { z } from 'zod'

export const alertSchema = z.object({
  crn: z.string().min(1),
  subject: z.string().min(1),
  courseNumber: z.string().min(1),
  phoneNumber: z.string().min(1),
  email: z.string().email().optional(),
  termCode: z.string().min(1),
})

export type AlertInput = z.infer<typeof alertSchema>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `auth-helpers-nextjs` | `@supabase/ssr` | 2023 (deprecated auth-helpers) | createServerComponentClient → createServerClient with explicit cookie handlers |
| `supabase.auth.getSession()` server-side | `supabase.auth.getClaims()` | Late 2024 | getSession relies on client-side cache; getClaims verifies server-side |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | November 2025 | New Supabase projects no longer have an anon key |
| `tailwind.config.ts` | `@theme {}` in globals.css | Tailwind v4 (2024-2025) | No config file in v4; CSS-first configuration |
| `@tailwind base/components/utilities` | `@import 'tailwindcss'` | Tailwind v4 | Single import replaces three directives |
| `cookies()` synchronous | `await cookies()` | Next.js 15 RC | cookies() and params are now Promise-returning |
| `params` synchronous prop | `params: Promise<{...}>` | Next.js 15 RC | Must await params in all dynamic routes |
| `serverComponentsExternalPackages` | `serverExternalPackages` | Next.js 15 stable | Renamed and stabilized (no longer experimental) |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Officially deprecated; do not use. [VERIFIED: supabase.com/docs]
- `tailwind.config.ts` patterns in v4 scaffolds: Does not exist; all config in CSS. [VERIFIED: nextjs.org/docs]
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Not provisioned on new Supabase projects (post-November 2025). [VERIFIED: github.com/orgs/supabase/discussions/40300]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The courses table should have `anon SELECT` access via policy (for `/api/course/[crn]` using publishable-key server client) | SQL Schema — RLS Policies | If courses should only be readable via service_role, remove the `anon_select_courses` policy. Low risk — policy can be added/removed after initial migration. |
| A2 | `twilio` is not in Next.js built-in `serverExternalPackages` list | next.config.ts Pattern | If twilio was added to the built-in list in a recent Next.js release, the explicit entry in `serverExternalPackages` is harmless (redundant but not breaking). [VERIFIED: nextjs.org docs list checked — twilio not present as of 2026-04-22] |

---

## Open Questions

1. **Supabase publishable key vs anon key env var name**
   - What we know: CONTEXT.md says `NEXT_PUBLIC_SUPABASE_ANON_KEY`; Supabase docs for new projects say `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - What's unclear: The CONTEXT.md was written before the key migration was fully understood. The actual Supabase dashboard for a new project will show a `sb_publishable_xxx` key.
   - Recommendation: Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in all code and `.env.local`. When the Supabase project is created, copy the publishable key (not a JWT-format anon key). The SDK accepts both formats identically — only the env var name differs.

2. **Tailwind v4 color hex vs oklch**
   - What we know: Tailwind v4 docs show `oklch()` format for color values; `#5D1725` is a valid CSS hex value
   - What's unclear: Whether hex values work correctly in `@theme` without conversion
   - Recommendation: `--color-maroon: #5D1725` is valid CSS and will work. oklch is an alternative, not a requirement. Use hex for simplicity.

---

## Environment Availability

> This section confirms what needs to exist before Phase 1 can run.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js ≥ 20.9 | Next.js 15 minimum | Check at runtime | Verify with `node -v` | Install via nvm/fnm |
| npm | Package install | Standard | Verify with `npm -v` | — |
| Supabase project | .env.local credentials | Not yet (D-03) | Must create at supabase.com | None — blocking |
| Supabase Dashboard access | SQL migration paste | Not yet | Manual step | None — blocking |
| Git (optional) | Version control | Likely available | — | Phase works without git |

**Missing dependencies with no fallback:**
- Supabase project (cloud): Must be created at supabase.com before `.env.local` can be populated and any `supabase` client module can be tested.

---

## Validation Architecture

> Phase 1 delivers stubs + infrastructure. There is no business logic to unit test in this phase.
> The "tests" for this phase are verification commands, not automated test suites.

### Phase Gate Checklist (manual verification)
| Check | Command | Expected Result |
|-------|---------|-----------------|
| Project boots | `npm run dev` | Localhost:3000 loads without error |
| TypeScript compiles | `npx tsc --noEmit` | No type errors |
| Lint passes | `npm run lint` | No ESLint errors |
| Supabase client imports | Check imports in lib/ | No module not found errors |
| Tables exist | Supabase Dashboard > Table Editor | `alerts` and `courses` visible |
| RLS enabled | Dashboard > Authentication > Policies | Both tables show RLS enabled |
| Anon INSERT works | Dashboard > SQL Editor: `INSERT INTO alerts (crn, subject, course_number, phone_number, school, term_code) VALUES ('test','CS','1234','+16015551234','MSU','202630');` | Row inserted |
| Service role bypass | Run same INSERT via admin client in a test script | Success without policy |

### Wave 0 Gaps
- No automated test framework configured in Phase 1 — this is intentional (greenfield scaffold).
- Phase 2+ will add test infrastructure when business logic is implemented.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (Phase 1 — no auth) | n/a |
| V3 Session Management | No (Phase 1 — no sessions) | n/a |
| V4 Access Control | Yes — RLS | Postgres RLS + service_role isolation |
| V5 Input Validation | Stub only | zod (implemented Phase 3) |
| V6 Cryptography | No | n/a |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Service role key leaked to client | Disclosure | `import 'server-only'` in admin.ts; never prefix with NEXT_PUBLIC_ |
| Phone numbers queried by anon | Disclosure | No SELECT policy on alerts table; anon can only INSERT |
| SQL injection via CRN input | Tampering | Supabase JS client uses parameterized queries automatically |
| Direct database access bypassing app | Elevation | RLS enabled on all tables from creation; not added later |

---

## Sources

### Primary (HIGH confidence)
- [nextjs.org/docs/app/api-reference/cli/create-next-app](https://nextjs.org/docs/app/api-reference/cli/create-next-app) — CLI flags, interactive prompts, defaults (version 16.2.4 docs, 2026-04-21)
- [nextjs.org/docs/app/api-reference/functions/cookies](https://nextjs.org/docs/app/api-reference/functions/cookies) — async cookies() in Next.js 15 (version 16.2.4 docs)
- [nextjs.org/docs/app/api-reference/file-conventions/page](https://nextjs.org/docs/app/api-reference/file-conventions/page) — async params/searchParams in Next.js 15
- [nextjs.org/docs/app/getting-started/css](https://nextjs.org/docs/app/getting-started/css) — Tailwind v4 setup with @tailwindcss/postcss, @import 'tailwindcss'
- [nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages) — twilio not in built-in list; confirmed 2026-04-22
- [supabase.com/docs/guides/auth/server-side/nextjs](https://supabase.com/docs/guides/auth/server-side/nextjs) — createServerClient, createBrowserClient with cookie handlers; NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- [tailwindcss.com/docs/theme](https://tailwindcss.com/docs/theme) — @theme directive for custom colors; no tailwind.config.ts in v4
- npm registry — all package versions verified 2026-04-22

### Secondary (MEDIUM confidence)
- [adrianmurage.com/posts/supabase-service-role-secret-key/](https://adrianmurage.com/posts/supabase-service-role-secret-key/) — createClient pattern for service_role with persistSession: false + import 'server-only'
- [github.com/orgs/supabase/discussions/40300](https://github.com/orgs/supabase/discussions/40300) — Supabase publishable key migration; new projects post-November 2025 have no legacy anon key
- [github.com/twilio/twilio-node/blob/main/CHANGES.md](https://github.com/twilio/twilio-node/blob/main/CHANGES.md) — v6.0.0 released 2026-04-16; breaking change: Node.js minimum raised to 20; no migration guide

### Tertiary (LOW confidence)
None — all claims in this research are verified or cited from official sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack versions: HIGH — all verified via npm view against npm registry 2026-04-22
- create-next-app CLI flags: HIGH — verified against official Next.js docs (v16.2.4 docs, updated 2026-04-21)
- Tailwind v4 config pattern: HIGH — verified against official Next.js CSS guide + tailwindcss.com/docs/theme
- Supabase client patterns: HIGH — verified against official Supabase SSR docs; admin pattern cross-referenced with GitHub discussion
- Publishable key rename: HIGH — verified against GitHub discussion #40300 and current Supabase docs
- SQL schema: HIGH — column types match PostgreSQL/Supabase standard; RLS pattern is standard Postgres
- Twilio v5 pin: HIGH — npm registry confirms v6.0.0 is latest; CHANGES.md confirms breaking Node.js version bump
- Async params/cookies: HIGH — verified against official Next.js page.js and cookies() docs

**Research date:** 2026-04-22
**Valid until:** 2026-07-22 (90 days — stable APIs, but Supabase key transition may finalize; Tailwind v4 patch releases expected)

---

## RESEARCH COMPLETE
