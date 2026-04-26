# CoursesIQ — Roadmap

**Project:** CoursesIQ
**Core Value:** Students get an SMS the moment a seat opens — before anyone else knows.
**Milestone:** v1.0 MVP
**Target:** Pre-Fall-2026 registration (July 2026)
**Stack:** Next.js 15 App Router, Supabase, Twilio, Vercel, Tailwind CSS, TypeScript

---

## Phases

- [x] **Phase 1: Project Scaffold & Database** — Working Next.js 15 project with Supabase schema, RLS, and all lib/ modules stubbed
- [x] **Phase 2: Banner API Integration** — Working MSU Banner scraper that returns seat availability for any CRN
- [x] **Phase 3: Alert System & Cron Worker** — Complete alert creation flow + working cron that checks seats and sends SMS
- [x] **Phase 4: Frontend Pages** — Three pages matching the design spec — mobile-first, maroon brand, functional forms
- [ ] **Phase 5: Deployment Config & Documentation** — Production-ready deployment with cron, README, and all config files

---

## Phase Details

### Phase 1: Project Scaffold & Database

**Goal**: A working Next.js 15 project exists with Supabase connected, schema migrated, RLS enforced, and all lib/ integration modules present as stubs — ready for implementation work without any structural rework.

**Depends on**: Nothing (first phase)

**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05

**Key Deliverables**:
- `npx create-next-app` with TypeScript, Tailwind CSS, App Router, ESLint
- Dependencies installed: `@supabase/ssr`, `@supabase/supabase-js`, `twilio@^5`, `axios`, `tough-cookie`, `axios-cookiejar-support`, `libphonenumber-js`, `zod`
- Supabase SQL migration: `alerts` table (id, crn, subject, course_number, course_name, phone_number, email, school, term_code, is_active, created_at, sms_sent_at, sms_opted_out, last_seats_avail, sms_sid, alert_reset_at) + `courses` table (crn, course_name, section, professor, seats_total, seats_available, last_checked)
- RLS policies: anon role gets INSERT only on alerts; no anon SELECT; service_role bypasses all policies
- `lib/supabase/client.ts` — `createBrowserClient` for client components
- `lib/supabase/server.ts` — `createServerClient` for RSC and API routes
- `lib/supabase/admin.ts` — service_role client with `import 'server-only'`
- `lib/banner.ts` — stub with exported function signatures (`establishSession`, `getSeatsByCRN`)
- `lib/twilio.ts` — stub singleton twilioClient with `import 'server-only'`
- Tailwind config extended with `maroon: '#5D1725'` custom color token
- `next.config.ts` baseline setup

**Success Criteria** (what must be TRUE):
  1. `npm run dev` starts without errors and the default Next.js page loads at localhost:3000
  2. Running the Supabase migration script creates both tables with the correct columns and RLS enabled — verifiable via Supabase dashboard table inspector
  3. A test import of `lib/supabase/admin.ts` from a server route returns a Supabase client without throwing; the same import from a client component throws due to `server-only`
  4. All three lib/ modules (`banner.ts`, `twilio.ts`, `lib/supabase/*.ts`) are importable and export their intended function signatures without runtime errors
  5. `tailwind.config.ts` includes the `maroon` color token and `bg-maroon` renders the correct hex in a test element

**Plans**: 2 plans
Plans:
- [x] 01-1-project-scaffold.md — Scaffold Next.js 15, install all dependencies, configure Tailwind maroon token and next.config.ts
- [x] 01-2-supabase-schema-clients.md — Create Supabase project, apply schema migration, write all lib/ client modules and stubs

**UI hint**: yes

---

### Phase 2: Banner API Integration

**Goal**: The Banner scraper can establish a session with MSU's SSB API, fetch seat availability by subject and course number, filter to a specific CRN, detect session expiry and recover, and return structured seat data — all verified against live MSU infrastructure.

**Depends on**: Phase 1

**Requirements**: BANN-01, BANN-02, BANN-03, BANN-04, BANN-05, BANN-06

**Key Deliverables**:
- `lib/banner.ts` fully implemented: `establishSession()` POSTs to `/term/search`, stores JSESSIONID via tough-cookie jar; `getSeatsByCRN(crn, subject, courseNumber, termCode)` GETs `/searchResults/searchResults`, filters by `courseReferenceNumber` client-side
- Session expiry detection: if `totalCount === 0` when results are expected, re-establish JSESSIONID and retry once
- Term code constant or config: `202630` (Fall 2026) as default, defined in a single location (e.g., `lib/constants.ts`)
- `GET /api/course/[crn]` route handler: accepts `subject` and `courseNumber` as query params, calls Banner, upserts into `courses` table, returns `{ crn, course_name, section, professor, seats_total, seats_available }`
- `export const runtime = 'nodejs'` on the `/api/course/[crn]` route (Banner lib uses Node.js modules)
- `await params` pattern used correctly in dynamic route (Next.js 15 requirement)
- Manual verification: calling `/api/course/[crn]?subject=CSE&courseNumber=1011` returns real live data from MSU

**Success Criteria** (what must be TRUE):
  1. Calling `getSeatsByCRN` with a known live CRN, subject, and course number returns an object with `seatsAvailable`, `seatsTotal`, and `courseReferenceNumber` populated from live MSU data
  2. If the Banner session is expired (simulated by clearing the cookie jar), the client re-establishes the session automatically and returns valid data without throwing
  3. `GET /api/course/[crn]?subject=CSE&courseNumber=1011` returns a JSON response with course name, professor, and seat counts — and the result is upserted into the `courses` table in Supabase
  4. An invalid CRN (one not matching any section in the course results) returns a structured error response, not an unhandled exception
  5. The term code `202630` (Fall 2026) is used by default and is defined in exactly one place in the codebase

**Plans**: 2 plans
Plans:
- [x] 02-01-PLAN.md — Implement lib/constants.ts + lib/banner.ts: session establishment, seat fetch, CRN filter, session expiry recovery
- [x] 02-02-PLAN.md — Create GET /api/course/[crn] route: Banner fetch, Supabase upsert, structured response + live verification

---

### Phase 3: Alert System & Cron Worker

**Goal**: A student can subscribe to a seat alert via API, and the cron worker correctly identifies seat openings, sends exactly one SMS per opening event, and handles TCPA opt-out and deduplication — making the core product loop functional end-to-end.

**Depends on**: Phase 2

**Requirements**: ALRT-01, ALRT-02, ALRT-03, ALRT-04, ALRT-05, ALRT-06, ALRT-07, ALRT-08, ALRT-09, ALRT-10, ALRT-11, DEPL-04

**Key Deliverables**:
- `POST /api/alerts` route: Zod schema validates `crn`, `subject`, `course_number`, `phone_number` (required), `email` (optional); normalizes phone to E.164 via libphonenumber-js; checks for duplicate (same CRN + phone) and returns 409 if found; inserts to Supabase `alerts` table; returns created alert ID
- `GET /api/cron/check-seats` route: validates `Authorization: Bearer <CRON_SECRET>` header (returns 401 if missing or wrong); uses service_role Supabase client to fetch all active alerts (`is_active = true, sms_sent_at IS NULL, sms_opted_out = false`); groups by `(subject, course_number)` to batch Banner API calls; for each group, calls Banner and filters results by CRN; for each matched alert, if `seatsAvailable > 0`, sends SMS; returns `{ checked: N, alerted: M }`
- Seat transition logic: send SMS only when `seatsAvailable > 0` AND `sms_sent_at IS NULL`; reset `sms_sent_at` to NULL when seat closes (`seatsAvailable === 0`) so user is re-alerted if seat reopens
- `lib/twilio.ts`: fully implemented singleton twilioClient; `sendSeatAlert(phone, courseName, crn)` sends SMS with message: `"A seat just opened in [COURSE NAME] ([CRN])! Register now before it fills up: mybanner.msstate.edu — CoursesIQ"`
- After successful SMS: set `sms_sent_at = now()`, `is_active = false` for that alert record; store `sms_sid` for audit
- Twilio error 21610 handling: catch on send; set `sms_opted_out = true`; do not set `sms_sent_at` (let flag suppress all future sends permanently)
- `export const runtime = 'nodejs'` on both `/api/alerts/route.ts` and `/api/cron/check-seats/route.ts`
- `vercel.json` with cron config: `{ "crons": [{ "path": "/api/cron/check-seats", "schedule": "*/5 * * * *" }] }`

**Success Criteria** (what must be TRUE):
  1. `POST /api/alerts` with a valid CRN, subject, course number, and US phone number returns 201 and a record appears in the Supabase `alerts` table with the phone stored in E.164 format
  2. A second identical `POST /api/alerts` request (same CRN + phone) returns 409 — no duplicate row is created in the database
  3. `POST /api/alerts` with a malformed phone number (e.g., "not-a-phone") returns 400 with a validation error — no Supabase insert occurs
  4. Calling `GET /api/cron/check-seats` without the correct `CRON_SECRET` header returns 401 — no Banner calls or Twilio sends occur
  5. For a test alert where `seatsAvailable > 0`, the cron handler sends exactly one SMS and sets `sms_sent_at` in the database — a second cron invocation does not send a second SMS
  6. If Twilio returns error 21610 for a phone number, `sms_opted_out` is set to `true` in the database and subsequent cron runs skip that phone permanently

**Plans**: 3 plans
Plans:
- [ ] 03-01-PLAN.md — Apply unique constraint migration + implement lib/twilio.ts (Twilio v5 singleton + sendSeatAlert)
- [ ] 03-02-PLAN.md — Create POST /api/alerts: Zod validation, E.164 phone normalization, duplicate rejection (409), Supabase insert
- [ ] 03-03-PLAN.md — Create GET /api/cron/check-seats: auth guard, Banner batching, SMS dispatch, opt-out handling + vercel.json

---

### Phase 4: Frontend Pages

**Goal**: All three application pages exist, match the mobile-first MSU maroon design spec, render live data from the backend, and allow students to create and cancel seat alerts through functional, validated forms.

**Depends on**: Phase 3

**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09, UI-10

**Key Deliverables**:
- `app/page.tsx` — server component: renders hero section with value proposition headline + subtext; fetches live count of active alerts from Supabase and displays it; renders `<AlertForm>` client component
- `components/AlertForm.tsx` — client component: form fields for CRN, subject, course number, phone number (required), email (optional); submits to `POST /api/alerts`; shows inline success message on 201; shows inline error message on 4xx/5xx; displays TCPA consent text below phone field: "By submitting, you consent to receive SMS alerts. Message & data rates may apply. Reply STOP to unsubscribe."
- `app/dashboard/page.tsx` — phone number lookup input; on submit, fetches alerts for that phone from Supabase server-side; renders `<DashboardAlerts>` with the results
- `components/DashboardAlerts.tsx` — renders list of active alerts with course name, CRN, and cancel button; cancel action calls `PATCH /api/alerts/[id]` or equivalent to set `is_active = false`
- `app/about/page.tsx` — single paragraph describing CoursesIQ and its purpose
- `app/globals.css` — Tailwind base imports; MSU maroon (`#5D1725`) applied as primary brand color via CSS custom property or Tailwind config; light-gray/white backgrounds for readability
- All pages: mobile-first layout, minimum 375px viewport width, no horizontal scroll at 375px
- Navigation: shared header or nav with links between pages (at minimum: Home, Dashboard)

**Success Criteria** (what must be TRUE):
  1. On a 375px viewport, all three pages render without horizontal scroll and all interactive elements are reachable by thumb — verified by resizing browser devtools
  2. The homepage displays a live number of active alerts (not a hardcoded placeholder) that increments after a new alert is submitted
  3. Submitting the alert form with a valid CRN, subject, course number, and US phone number shows a success message without a page reload — and a new row appears in Supabase
  4. Submitting the alert form with an invalid phone number shows an inline validation error — no API call is made
  5. The dashboard phone lookup returns the correct alerts for a phone number that has active subscriptions, and clicking Cancel removes that alert from the list
  6. All pages use the dark maroon (`#5D1725`) primary color consistently — visible in the header background, primary buttons, and brand elements

**Plans**: 4 plans
Plans:
- [x] 04-01-PLAN.md — Update app/layout.tsx (maroon header + nav + metadata) + strip dark mode from globals.css + create app/about/page.tsx
- [x] 04-02-PLAN.md — Create PATCH /api/alerts/[id] cancel endpoint (adminClient, await params, 200/404/500)
- [x] 04-03-PLAN.md — Create components/AlertForm.tsx (client form, phone validation, TCPA text) + replace app/page.tsx (hero + live count + AlertForm)
- [x] 04-04-PLAN.md — Create components/DashboardAlerts.tsx (two-click cancel, optimistic removal) + create app/dashboard/page.tsx (searchParams phone lookup, E.164 normalization, Supabase query)

**UI hint**: yes

---

### Phase 5: Deployment Config & Documentation

**Goal**: CoursesIQ is deployed to Vercel with the cron job running on a 5-minute schedule, all environment variables are documented for any developer to reproduce the setup, and a README covers everything needed to go from zero to production.

**Depends on**: Phase 4

**Requirements**: INFRA-06, ALRT-11, DEPL-01, DEPL-02, DEPL-03

**Key Deliverables**:
- `vercel.json` finalized: `{ "crons": [{ "path": "/api/cron/check-seats", "schedule": "*/5 * * * *" }] }` — confirmed working in Vercel Pro project dashboard
- `.env.example` with all 6 environment variables and plain-English descriptions of where to obtain each value:
  - `NEXT_PUBLIC_SUPABASE_URL` — from Supabase project Settings > API
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase project Settings > API
  - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project Settings > API (never expose client-side)
  - `TWILIO_ACCOUNT_SID` — from Twilio Console > Account Info
  - `TWILIO_AUTH_TOKEN` — from Twilio Console > Account Info
  - `TWILIO_PHONE_NUMBER` — toll-free number in E.164 format (e.g., `+18005550100`)
  - `CRON_SECRET` — any strong random string; set same value in Vercel environment and vercel.json cron Authorization header
- `README.md` with:
  - Project description (what CoursesIQ does, who it is for)
  - Environment variable table with purpose and source for each variable
  - Local development setup (clone, install, `.env.local` setup, `npm run dev`)
  - Supabase schema setup instructions (migration file location, how to run)
  - Vercel deployment steps (connect repo, set env vars, deploy)
  - Vercel Pro plan note: cron runs every 5 minutes, requires Pro ($20/month); Hobby plan only supports once-per-day
  - Twilio toll-free verification note: must be completed before production SMS delivery; start process early (approval window: days to weeks)
- Final smoke test checklist (inline in README or as a separate `CHECKLIST.md`):
  - [ ] Supabase tables created with correct columns
  - [ ] RLS enabled; anon INSERT works, anon SELECT blocked
  - [ ] Banner API returns live seat data for a test CRN
  - [ ] `POST /api/alerts` creates a record in Supabase
  - [ ] Cron endpoint returns 401 without CRON_SECRET
  - [ ] Cron endpoint runs and returns `{ checked: N, alerted: M }`
  - [ ] SMS received on real phone when seat is open (requires Twilio registration)
  - [ ] All three pages load on mobile viewport

**Success Criteria** (what must be TRUE):
  1. A developer with no prior context can follow the README, set up `.env.local` from `.env.example`, run `npm run dev`, and reach a working local instance — all steps complete without requiring Slack/Discord clarification
  2. The Vercel cron job appears in the Vercel dashboard Crons tab, runs on schedule, and logs `{ checked: N, alerted: M }` in Vercel Function Logs
  3. `.env.example` contains every environment variable the application reads — no variable is used in code that is absent from `.env.example`
  4. The README Vercel Pro note and Twilio toll-free verification note are present and clearly communicate the dependency and timing risk

**Plans**: TBD

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Project Scaffold & Database | 2/2 | Complete ✓ | 2026-04-22 |
| 2. Banner API Integration | 2/2 | Complete ✓ | 2026-04-22 |
| 3. Alert System & Cron Worker | 3/3 | Complete ✓ | 2026-04-26 |
| 4. Frontend Pages | 4/4 | Complete ✓ | 2026-04-26 |
| 5. Deployment Config & Documentation | 0/? | Not started | - |

---

## Coverage

**v1 requirements:** 34 total
**Mapped:** 34/34 ✓
**Unmapped:** 0

| Requirement | Phase | Description |
|-------------|-------|-------------|
| INFRA-01 | Phase 1 | Next.js 15 App Router project with TypeScript, Tailwind, ESLint |
| INFRA-02 | Phase 1 | Supabase `alerts` table with all required columns |
| INFRA-03 | Phase 1 | Supabase `courses` table as cache |
| INFRA-04 | Phase 1 | RLS enabled on both tables from creation |
| INFRA-05 | Phase 1 | Three Supabase client modules (browser, server, admin) |
| INFRA-06 | Phase 5 | All env vars documented in `.env.example` and README |
| BANN-01 | Phase 2 | Banner SSB session via POST to `/term/search`, stores JSESSIONID |
| BANN-02 | Phase 2 | Fetch seat availability via GET `/searchResults/searchResults` |
| BANN-03 | Phase 2 | Client-side filter by `courseReferenceNumber` |
| BANN-04 | Phase 2 | Session expiry detection (`totalCount: 0`) and re-establishment |
| BANN-05 | Phase 2 | `GET /api/course/[crn]` fetches and caches course info |
| BANN-06 | Phase 2 | Term code configured for correct registration period |
| ALRT-01 | Phase 3 | `POST /api/alerts` with field validation and Supabase insert |
| ALRT-02 | Phase 3 | Phone normalization to E.164 via libphonenumber-js |
| ALRT-03 | Phase 3 | Duplicate alert (same CRN + phone) rejected gracefully |
| ALRT-04 | Phase 3 | Cron endpoint protected by CRON_SECRET Bearer token |
| ALRT-05 | Phase 3 | Cron fetches active, non-opted-out alerts via service_role client |
| ALRT-06 | Phase 3 | Cron groups by (subject, course_number) to batch Banner calls |
| ALRT-07 | Phase 3 | SMS triggered on `seatsAvailable` 0-to-positive transition |
| ALRT-08 | Phase 3 | SMS message format includes course name, CRN, and registration link |
| ALRT-09 | Phase 3 | `sms_sent_at` set and `is_active` cleared after successful SMS |
| ALRT-10 | Phase 3 | Twilio error 21610 sets `sms_opted_out = true` permanently |
| ALRT-11 | Phase 5 | `vercel.json` cron config at `*/5 * * * *` |
| UI-01 | Phase 4 | Homepage hero with value proposition headline and subtext |
| UI-02 | Phase 4 | Homepage form: CRN, subject, course number, phone, optional email |
| UI-03 | Phase 4 | Homepage live count of active alerts (server-fetched) |
| UI-04 | Phase 4 | Form submits to `POST /api/alerts`, shows success/error feedback |
| UI-05 | Phase 4 | Dashboard phone lookup returns alerts for that number |
| UI-06 | Phase 4 | Dashboard cancel button sets `is_active = false` |
| UI-07 | Phase 4 | About page with one paragraph description |
| UI-08 | Phase 4 | Tailwind with dark maroon (`#5D1725`) primary color |
| UI-09 | Phase 4 | Mobile-first, correct rendering at 375px viewport |
| UI-10 | Phase 4 | TCPA consent text displayed at phone input |
| DEPL-01 | Phase 5 | README documents all env vars with purpose and source |
| DEPL-02 | Phase 5 | README includes local dev and Vercel deployment steps |
| DEPL-03 | Phase 5 | `.env.example` with all required keys and placeholder values |
| DEPL-04 | Phase 3 | All Twilio-importing routes include `export const runtime = 'nodejs'` |

---

## v2 — Future Phases (Not Planned)

These features are validated by market research and MSU-specific data availability. They are not scheduled. When v1.0 ships and gains users, revisit this section.

### Professor Ratings (PROF-01, PROF-02, PROF-03)
Batch-fetch MSU professor data from Rate My Professor's GraphQL endpoints weekly. Cache in Supabase. Display RMP rating alongside course details with attribution. Legal risk is moderate at student-project scale. Do not block v1 on this.

### Grade Distributions (GRADE-01, GRADE-02, GRADE-03)
Ingest msugrades.com FOIA-derived MSU grade distribution CSV into Supabase. Display per-instructor grade distribution (A/B/C/D/F/W breakdown and average GPA) on course detail pages. No paywall — use it for differentiation and time-on-site. File FOIA with MSU Registrar for newer semesters.

### Freemium / Payments (PREM-01, PREM-02, PREM-03)
Free tier: 1 active alert per phone number. Premium tier ($5/semester): unlimited active alerts. Gate is on alert count, never on alert speed — degrading alert latency for free users would destroy the product's core value. Stripe integration handles payment and subscription state.

### Accounts (AUTH-01, AUTH-02)
User accounts with email sign-up; phone number becomes primary identifier. Session persistence eliminates phone re-entry on dashboard. Supabase Auth with RLS `auth.uid() = user_id` policies. Defer until freemium tier creates retention incentive.

---

## Key Technical Constraints (For Reference)

These are not phases — they are implementation rules that apply across all phases.

| Constraint | Rule |
|------------|------|
| Next.js 15 dynamic params | Must `await params` in all dynamic routes — it is a `Promise` |
| Next.js 15 async APIs | `headers()` and `cookies()` are async — must `await` them |
| Twilio + Edge Runtime | All routes importing `twilio` need `export const runtime = 'nodejs'` |
| Supabase SSR | Use `@supabase/ssr` — not the deprecated `auth-helpers-nextjs` |
| Supabase auth | Use `getClaims()` not `getSession()` server-side (getSession does not verify JWT) |
| service_role key | Never prefix with `NEXT_PUBLIC_`; scope to Production env in Vercel only |
| admin.ts | Include `import 'server-only'` to prevent client-side import |
| Twilio version | Pin to `twilio@^5` — v6.0.0 released April 16, 2026 has no migration guide yet |
| Banner CRN filter | `txt_courseReferenceNumber` query param is broken — filter by `courseReferenceNumber` client-side after fetching by subject + courseNumber |
| Vercel cron | Requires Vercel Pro for sub-daily intervals; Hobby plan = once/day maximum |
| A2P compliance | Toll-free number verification must be submitted before production SMS; start immediately — approval is not instantaneous |

---

*Roadmap created: 2026-04-22*
*Milestone: v1.0 MVP*
*Total v1 requirements: 34 | Phases: 5 | Coverage: 100%*
