---
phase: 1
plan: 2
type: scaffold
wave: 2
depends_on:
  - "01-1-project-scaffold.md"
files_modified:
  - .env.local
  - supabase/schema.sql
  - lib/supabase/client.ts
  - lib/supabase/server.ts
  - lib/supabase/admin.ts
  - lib/banner.ts
  - lib/twilio.ts
autonomous: false
requirements:
  - INFRA-02
  - INFRA-03
  - INFRA-04
  - INFRA-05

must_haves:
  truths:
    - "supabase/schema.sql exists and contains both tables with all specified columns and RLS policies"
    - "Both tables are visible in Supabase Dashboard Table Editor with RLS enabled"
    - "anon INSERT succeeds on alerts table; anon SELECT on alerts is blocked by RLS"
    - "lib/supabase/client.ts, server.ts, and admin.ts all exist and TypeScript compiles clean"
    - "admin.ts throws at build time if imported in a Client Component (server-only guard)"
    - "lib/banner.ts exports establishSession and getSeatsByCRN with correct signatures"
    - "lib/twilio.ts exports sendSeatAlert with correct signature"
    - "npx tsc --noEmit exits 0 across all new lib/ modules"
  artifacts:
    - path: "supabase/schema.sql"
      provides: "Full database schema with tables and RLS policies"
      contains: "create table if not exists public.alerts"
    - path: ".env.local"
      provides: "Runtime secrets for Supabase and Twilio"
      contains: "NEXT_PUBLIC_SUPABASE_URL"
    - path: "lib/supabase/client.ts"
      provides: "Browser Supabase client for Client Components"
      exports: ["createClient"]
    - path: "lib/supabase/server.ts"
      provides: "Server Supabase client for RSC and Route Handlers"
      exports: ["createClient"]
    - path: "lib/supabase/admin.ts"
      provides: "Service-role Supabase client for cron (bypasses RLS)"
      exports: ["adminClient"]
    - path: "lib/banner.ts"
      provides: "Phase 2 stub with correct function signatures"
      exports: ["establishSession", "getSeatsByCRN"]
    - path: "lib/twilio.ts"
      provides: "Phase 3 stub with correct function signature"
      exports: ["sendSeatAlert"]
  key_links:
    - from: "lib/supabase/admin.ts"
      to: "server-only package"
      via: "import 'server-only'"
      pattern: "import 'server-only'"
    - from: "lib/supabase/admin.ts"
      to: "@supabase/supabase-js createClient"
      via: "direct import (NOT @supabase/ssr)"
      pattern: "from '@supabase/supabase-js'"
    - from: "lib/supabase/server.ts"
      to: "next/headers cookies()"
      via: "await cookies() — async in Next.js 15"
      pattern: "await cookies()"
    - from: "supabase/schema.sql"
      to: "Supabase Dashboard SQL Editor"
      via: "manual paste by developer"
      pattern: "anon_insert_alerts"
---

<objective>
Create the Supabase project, apply the database schema with RLS policies, and write all lib/ integration modules (three Supabase clients + banner and twilio stubs). This plan requires two manual steps: creating the Supabase project at supabase.com and running the SQL migration in the Dashboard.

Purpose: Establishes the database foundation and all integration contracts that Phase 2 and Phase 3 implement against. Getting the client module patterns correct now — especially the admin client using direct @supabase/supabase-js rather than @supabase/ssr — prevents subtle RLS bypass failures in production.

Output: .env.local populated with Supabase credentials; supabase/schema.sql applied to a live Supabase project; lib/supabase/{client,server,admin}.ts ready for import; lib/banner.ts and lib/twilio.ts stubs with exportable function signatures.
</objective>

<execution_context>
@G:/MSU Course/.planning/phases/01-project-scaffold-database/RESEARCH.md
</execution_context>

<context>
@G:/MSU Course/.planning/ROADMAP.md
@G:/MSU Course/.planning/REQUIREMENTS.md
@G:/MSU Course/.planning/phases/01-project-scaffold-database/01-CONTEXT.md
@G:/MSU Course/.planning/phases/01-project-scaffold-database/01-1-SUMMARY.md

## Decision traceability:
- D-03: No Supabase project exists yet. Phase includes manual step to create it.
- D-04: Schema delivered as raw SQL at supabase/schema.sql — paste into Dashboard SQL Editor. No CLI required.

## Critical patterns from research:

### Admin client MUST use @supabase/supabase-js, NOT @supabase/ssr
The SSR client forwards user session cookies. If initialized with service_role key, the
cookie-based session overwrites the Authorization header, causing RLS to apply and stripping
service_role privileges. Use `createClient` from `@supabase/supabase-js` directly.

### New Supabase projects use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
Projects created after November 2025 provision a `sb_publishable_xxx` key, NOT a JWT-format
anon key. The env var name is NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY everywhere.
CONTEXT.md references the old name — use the new name per RESEARCH.md findings.

### cookies() is async in Next.js 15
server.ts must await cookies(): `const cookieStore = await cookies()`

### alerts table columns (ROADMAP.md takes precedence over REQUIREMENTS.md for column list):
id, crn, subject, course_number, course_name, phone_number, email, school, term_code,
is_active, created_at, sms_sent_at, sms_opted_out, last_seats_avail, sms_sid, alert_reset_at
(16 columns — last_seats_avail, sms_sid, alert_reset_at are in ROADMAP but not REQUIREMENTS.md)
</context>

<tasks>

<task type="checkpoint:human-action">
  <name>Task 1: [MANUAL STEP] Create Supabase project and populate .env.local</name>
  <what-built>
Nothing automated precedes this step. The Supabase project does not exist yet (D-03).
  </what-built>
  <how-to-verify>
1. Go to https://supabase.com and sign in (or create an account).

2. Click "New project". Fill in:
   - Organization: select or create one
   - Project name: coursesiq (or similar)
   - Database password: generate a strong password and save it somewhere
   - Region: US East (or closest to Mississippi)
   - Click "Create new project" and wait for provisioning (~2 minutes)

3. Once provisioned, go to Project Settings > API (left sidebar).

4. Locate and copy these three values:
   - **Project URL**: `https://xxxx.supabase.co`
   - **Publishable key** (format: `sb_publishable_xxxx`): This is the NEW key name for projects created after November 2025. It is NOT a JWT. Look for it in the "Project API keys" section — it may be labeled "Publishable" or "anon/public". The format will start with `sb_publishable_`.
   - **service_role key** (labeled "service_role secret"): This is a JWT. Keep this secret — never expose it client-side.

5. Create the file `G:/MSU Course/.env.local` with these exact contents (replace placeholder values):

```
# Supabase — from: supabase.com > Project Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxx

# Supabase service role — NEVER prefix with NEXT_PUBLIC_; server-only
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Twilio — from: console.twilio.com (set up in Phase 3; use placeholder now)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

# Cron security — any strong random string (e.g., openssl rand -hex 32)
CRON_SECRET=your_random_secret_for_cron_endpoint
```

Note: Twilio and CRON_SECRET can be placeholders for now — they are not needed until Phase 3.
Note: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NOT NEXT_PUBLIC_SUPABASE_ANON_KEY — the old name does not work with new Supabase projects.
  </how-to-verify>
  <resume-signal>Type "env ready" once .env.local exists with real Supabase URL and publishable key values (not placeholders).</resume-signal>
</task>

<task type="auto">
  <name>Task 2: Write supabase/schema.sql</name>
  <files>supabase/schema.sql</files>
  <action>
Create the directory `G:/MSU Course/supabase/` if it does not exist, then create `G:/MSU Course/supabase/schema.sql` with the following exact content:

```sql
-- CoursesIQ Database Schema
-- Paste into: Supabase Dashboard > SQL Editor > New Query > Run
-- Source: ROADMAP.md Phase 1 deliverables + REQUIREMENTS.md INFRA-02, INFRA-03, INFRA-04

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

-- alerts: anon role can INSERT new seat watch requests
-- No SELECT policy for anon — phone numbers are PII
create policy "anon_insert_alerts"
  on public.alerts
  for insert
  to anon
  with check (true);

-- courses: anon role can SELECT course info (not sensitive data)
-- Required for /api/course/[crn] route which uses the publishable-key server client
create policy "anon_select_courses"
  on public.courses
  for select
  to anon
  using (true);

-- Note: service_role bypasses RLS automatically (BYPASSRLS privilege in Postgres)
-- No explicit policy needed for service_role — admin.ts uses service_role for all
-- alert reads, seat updates, and sms_sent_at writes in the cron handler
```

Column count verification:
- alerts: 16 columns (id, crn, subject, course_number, course_name, phone_number, email, school, term_code, is_active, created_at, sms_sent_at, sms_opted_out, last_seats_avail, sms_sid, alert_reset_at)
- courses: 7 columns (crn, course_name, section, professor, seats_total, seats_available, last_checked)
  </action>
  <verify>
    <automated>cd "G:/MSU Course" && node -e "const fs = require('fs'); const sql = fs.readFileSync('supabase/schema.sql','utf8'); const required = ['create table if not exists public.alerts','create table if not exists public.courses','enable row level security','anon_insert_alerts','anon_select_courses','last_seats_avail','sms_sid','alert_reset_at']; required.forEach(r => { if (!sql.includes(r)) throw new Error('schema.sql missing: ' + r); }); console.log('schema.sql contains all required elements');"</automated>
  </verify>
  <done>
- supabase/schema.sql exists
- Contains both CREATE TABLE statements
- alerts table has all 16 columns including last_seats_avail, sms_sid, alert_reset_at
- Both tables have `enable row level security`
- anon_insert_alerts policy exists on alerts
- anon_select_courses policy exists on courses
  </done>
</task>

<task type="checkpoint:human-action">
  <name>Task 3: [MANUAL STEP] Apply SQL migration in Supabase Dashboard</name>
  <what-built>
supabase/schema.sql has been written by Task 2 with the full schema and RLS policies.
  </what-built>
  <how-to-verify>
1. Open the Supabase Dashboard for your project.

2. Click "SQL Editor" in the left sidebar.

3. Click "New query".

4. Open `G:/MSU Course/supabase/schema.sql` in a text editor. Copy the entire contents.

5. Paste into the Supabase SQL Editor query box.

6. Click "Run" (or press Cmd+Enter / Ctrl+Enter).

7. Verify success:
   - The query output should show no errors
   - Click "Table Editor" in the left sidebar — both `alerts` and `courses` tables should appear
   - Click each table to verify columns match the schema (alerts: 16 columns; courses: 7 columns)
   - Click "Authentication" > "Policies" in the left sidebar — both tables should show "RLS enabled"
   - Under alerts policies, `anon_insert_alerts` should be listed
   - Under courses policies, `anon_select_courses` should be listed

8. Optionally, run this INSERT test in the SQL Editor to confirm RLS allows anon inserts:
```sql
INSERT INTO public.alerts (crn, subject, course_number, phone_number, school, term_code)
VALUES ('12345', 'CSE', '1011', '+16015551234', 'MSU', '202630');
```
Expected: "Success. 1 row affected."

Then run:
```sql
SELECT count(*) FROM public.alerts;
```
Expected: returns 1 (or more if run multiple times). If RLS is blocking this, it means you're running as service_role in the SQL editor (which bypasses RLS — so the count will work). That is expected and correct.
  </how-to-verify>
  <resume-signal>Type "schema applied" once both tables appear in the Table Editor with RLS enabled and the anon_insert_alerts policy visible.</resume-signal>
</task>

<task type="auto">
  <name>Task 4: Write lib/supabase client modules</name>
  <files>lib/supabase/client.ts, lib/supabase/server.ts, lib/supabase/admin.ts</files>
  <action>
Create the directory `G:/MSU Course/lib/supabase/` and write all three client modules.

**File 1: lib/supabase/client.ts**
Browser client for use in `'use client'` components only. Uses NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (new key name for post-November 2025 Supabase projects).

```typescript
'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

**File 2: lib/supabase/server.ts**
Server client for RSC and Route Handlers. `cookies()` MUST be awaited — it is async in Next.js 15.

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  // cookies() is async in Next.js 15 — must await
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
            // Silently fail when called from a Server Component.
            // Cookies can only be set in Route Handlers and Server Actions.
          }
        },
      },
    }
  )
}
```

NOTE: Every call site must `await createClient()` since this function returns a Promise.

**File 3: lib/supabase/admin.ts**
Service-role client for cron operations only. CRITICAL implementation details:

1. `import 'server-only'` — prevents accidental client-side import; causes build-time error if used in Client Component
2. Uses `createClient` from `@supabase/supabase-js` DIRECTLY — NOT `createServerClient` from `@supabase/ssr`
3. `persistSession: false, autoRefreshToken: false, detectSessionInUrl: false` — server environment has no browser storage; prevents session cookie interference with service_role privileges

```typescript
import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS.
// ONLY use in cron routes (GET /api/cron/check-seats).
// Never import this in Client Components or pages.
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

WHY NOT @supabase/ssr for admin: The SSR client is designed to read user session cookies from
the request. If initialized with the service_role key, the cookie-based user session can
override the Authorization header and strip service_role privileges, causing RLS to apply.
The direct `createClient` from `supabase-js` has no cookie handling and maintains the
service_role key throughout its lifetime.
  </action>
  <verify>
    <automated>cd "G:/MSU Course" && node -e "const fs = require('fs'); ['lib/supabase/client.ts','lib/supabase/server.ts','lib/supabase/admin.ts'].forEach(f => { if (!fs.existsSync(f)) throw new Error('Missing: ' + f); }); const admin = fs.readFileSync('lib/supabase/admin.ts','utf8'); if (!admin.includes(\"import 'server-only'\")) throw new Error('admin.ts missing server-only import'); if (!admin.includes(\"from '@supabase/supabase-js'\")) throw new Error('admin.ts must use supabase-js not @supabase/ssr'); if (!admin.includes('persistSession: false')) throw new Error('admin.ts missing persistSession: false'); const server = fs.readFileSync('lib/supabase/server.ts','utf8'); if (!server.includes('await cookies()')) throw new Error('server.ts must await cookies()'); console.log('All three Supabase client modules exist and pass structural checks');"</automated>
  </verify>
  <done>
- lib/supabase/client.ts exists; uses createBrowserClient; references NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- lib/supabase/server.ts exists; uses createServerClient; awaits cookies()
- lib/supabase/admin.ts exists; has `import 'server-only'`; uses createClient from @supabase/supabase-js; has persistSession: false
  </done>
</task>

<task type="auto">
  <name>Task 5: Write lib/banner.ts and lib/twilio.ts stubs</name>
  <files>lib/banner.ts, lib/twilio.ts</files>
  <action>
Create the stub modules that establish the integration contracts for Phase 2 and Phase 3.

The function signatures MUST match exactly — Phase 2 and Phase 3 will implement against these contracts. Do not simplify or change the parameter names.

**File 1: lib/banner.ts**

The plan description specifies `establishSession` and `getSeatsByCRN` as the exported function names (from the plan prompt). Use these exact names:

```typescript
// Phase 1 stub — full implementation in Phase 2
// establishSession: POSTs to MSU Banner SSB /term/search, stores JSESSIONID
// getSeatsByCRN: GETs /searchResults/searchResults, filters by courseReferenceNumber client-side

export async function establishSession(): Promise<string> {
  throw new Error('Not implemented — Phase 2')
}

export async function getSeatsByCRN(
  _crn: string,
  _subject: string,
  _courseNumber: string,
  _termCode: string
): Promise<unknown> {
  throw new Error('Not implemented — Phase 2')
}
```

**File 2: lib/twilio.ts**

Routes that import this file MUST also declare `export const runtime = 'nodejs'` — this comment
is in the stub as a reminder to Phase 3 implementers:

```typescript
// Phase 1 stub — full implementation in Phase 3
// IMPORTANT: Any API route importing this file must also declare:
//   export const runtime = 'nodejs'
// Twilio requires Node.js native modules; it cannot run in the Edge Runtime.

export async function sendSeatAlert(
  _phone: string,
  _courseName: string,
  _crn: string
): Promise<string> {
  throw new Error('Not implemented — Phase 3')
}
```
  </action>
  <verify>
    <automated>cd "G:/MSU Course" && node -e "const fs = require('fs'); const banner = fs.readFileSync('lib/banner.ts','utf8'); if (!banner.includes('establishSession')) throw new Error('banner.ts missing establishSession'); if (!banner.includes('getSeatsByCRN')) throw new Error('banner.ts missing getSeatsByCRN'); const twilio = fs.readFileSync('lib/twilio.ts','utf8'); if (!twilio.includes('sendSeatAlert')) throw new Error('twilio.ts missing sendSeatAlert'); if (!twilio.includes('runtime')) throw new Error('twilio.ts missing runtime comment/warning'); console.log('banner.ts and twilio.ts stubs exist with correct exports');"</automated>
  </verify>
  <done>
- lib/banner.ts exists; exports establishSession and getSeatsByCRN with correct TypeScript signatures
- lib/twilio.ts exists; exports sendSeatAlert; includes comment warning about `export const runtime = 'nodejs'`
  </done>
</task>

<task type="auto">
  <name>Task 6: Verify all lib/ modules compile</name>
  <files></files>
  <action>
Run TypeScript and lint checks to confirm all new modules are error-free:

```bash
cd "G:/MSU Course"
npx tsc --noEmit
npm run lint
```

Common issues to fix if they arise:

1. **"Cannot find module 'server-only'"** — install it: `npm install server-only`
2. **TypeScript error in admin.ts about createClient overload** — ensure the import is `import { createClient } from '@supabase/supabase-js'` (not from @supabase/ssr)
3. **Unused parameter warnings for _crn, _subject, etc.** — the underscore prefix is the TypeScript convention for intentionally unused params; ESLint should not flag these. If it does, the no-unused-vars rule may need `"argsIgnorePattern": "^_"` — but this is typically pre-configured in create-next-app's ESLint config.
4. **"cookies() was called outside a request scope"** — this is a runtime warning, not a compile error. It will not appear in `npx tsc --noEmit`.

If `npm run lint` produces errors (not warnings) from the generated create-next-app boilerplate (e.g., unescaped HTML entities in app/page.tsx), fix those too. The scaffold page can be simplified to:

```tsx
// app/page.tsx — Phase 4 stub
export default function Home() {
  return (
    <main>
      <h1>CoursesIQ</h1>
    </main>
  )
}
```
  </action>
  <verify>
    <automated>cd "G:/MSU Course" && npx tsc --noEmit && npm run lint</automated>
  </verify>
  <done>
- npx tsc --noEmit exits 0 — all lib/ modules compile without TypeScript errors
- npm run lint exits 0 — no ESLint errors across the entire project
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| lib/supabase/admin.ts → Supabase service_role | Service-role key must never reach the browser; crosses from server to Supabase API |
| .env.local → Next.js runtime | Secrets injected at runtime; NEXT_PUBLIC_ vars reach browser bundle |
| anon role → alerts table | RLS boundary: anon may INSERT but never SELECT (phone PII protection) |
| supabase.com Dashboard → developer machine | Manual credential retrieval; cannot be automated |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-04 | Disclosure | SUPABASE_SERVICE_ROLE_KEY in .env.local | mitigate | Never prefix with NEXT_PUBLIC_; `import 'server-only'` in admin.ts causes build error if imported client-side; .env.local is gitignored by create-next-app |
| T-01-05 | Elevation | admin.ts using @supabase/ssr instead of @supabase/supabase-js | mitigate | Enforced by Task 4 structural check: verifies `from '@supabase/supabase-js'`; RESEARCH.md documents why SSR client can override service_role with user cookies |
| T-01-06 | Disclosure | phone_number in alerts table exposed via anon SELECT | mitigate | No SELECT policy on alerts for anon role; only anon INSERT policy exists; enforced by schema.sql RLS setup in Task 2 and Task 3 |
| T-01-07 | Disclosure | NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in browser bundle | accept | Publishable key is intended to be public (replaces the old "anon" key which was also public). The key only enables RLS-filtered access; service_role key is separate and never exposed. |
| T-01-08 | Tampering | SQL injection via Supabase client | accept | @supabase/supabase-js uses parameterized queries internally; raw SQL is only in schema.sql (developer-controlled migration, not user input) |
</threat_model>

<verification>
After all tasks complete (including the two manual steps), verify from G:/MSU Course:

```bash
# 1. All lib/ files exist
ls lib/supabase/client.ts lib/supabase/server.ts lib/supabase/admin.ts lib/banner.ts lib/twilio.ts supabase/schema.sql

# 2. TypeScript compiles all modules
npx tsc --noEmit

# 3. Lint clean
npm run lint

# 4. Structural verification of critical patterns
node -e "
const fs = require('fs');
const admin = fs.readFileSync('lib/supabase/admin.ts','utf8');
const server = fs.readFileSync('lib/supabase/server.ts','utf8');
const banner = fs.readFileSync('lib/banner.ts','utf8');
const twilio = fs.readFileSync('lib/twilio.ts','utf8');
const schema = fs.readFileSync('supabase/schema.sql','utf8');

console.log('admin has server-only:', admin.includes(\"import 'server-only'\"));
console.log('admin uses supabase-js:', admin.includes(\"from '@supabase/supabase-js'\"));
console.log('server awaits cookies:', server.includes('await cookies()'));
console.log('banner has establishSession:', banner.includes('establishSession'));
console.log('banner has getSeatsByCRN:', banner.includes('getSeatsByCRN'));
console.log('twilio has sendSeatAlert:', twilio.includes('sendSeatAlert'));
console.log('schema has alerts table:', schema.includes('create table if not exists public.alerts'));
console.log('schema has courses table:', schema.includes('create table if not exists public.courses'));
console.log('schema has RLS:', schema.includes('enable row level security'));
console.log('schema has anon_insert_alerts:', schema.includes('anon_insert_alerts'));
"
```

All values must print `true`.

Manual verification (Supabase Dashboard):
- Both `alerts` and `courses` tables visible in Table Editor
- alerts table has 16 columns; courses table has 7 columns
- Both tables show RLS enabled in Authentication > Policies
- `anon_insert_alerts` policy visible on alerts
- `anon_select_courses` policy visible on courses
</verification>

<success_criteria>
1. `supabase/schema.sql` exists with both tables (alerts: 16 columns; courses: 7 columns), RLS enabled on both, `anon_insert_alerts` and `anon_select_courses` policies defined
2. Supabase Dashboard Table Editor shows both tables with correct columns and RLS enabled — verified by developer after Task 3 manual step
3. `lib/supabase/client.ts` uses `createBrowserClient` with `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. `lib/supabase/server.ts` uses `createServerClient` with `await cookies()` (Next.js 15 async requirement)
5. `lib/supabase/admin.ts` uses `createClient` from `@supabase/supabase-js` (NOT @supabase/ssr), has `import 'server-only'`, and has `persistSession: false`
6. `lib/banner.ts` exports `establishSession(): Promise<string>` and `getSeatsByCRN(_crn, _subject, _courseNumber, _termCode): Promise<unknown>`
7. `lib/twilio.ts` exports `sendSeatAlert(_phone, _courseName, _crn): Promise<string>` with a comment warning about `export const runtime = 'nodejs'`
8. `npx tsc --noEmit` exits 0 — all six new lib/ files compile without errors
9. `npm run lint` exits 0 — no ESLint errors
</success_criteria>

<output>
After completion, create `.planning/phases/01-project-scaffold-database/01-2-SUMMARY.md` documenting:
- Supabase project URL (non-secret; for reference in future phases)
- Confirmation that both tables exist with RLS enabled
- Exact env var names used in .env.local (names only, not values)
- Any deviations from planned function signatures in banner.ts or twilio.ts
- Confirmation that npx tsc --noEmit and npm run lint both pass
- Note whether `server-only` package required manual installation
</output>
