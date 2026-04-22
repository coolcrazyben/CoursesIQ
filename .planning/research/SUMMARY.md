# CoursesIQ — Research Synthesis
**Synthesized:** 2026-04-22
**Sources:** BANNER.md, STACK.md, TWILIO.md, MARKET.md
**Confidence:** HIGH across all four files (all primary claims live-verified or official-doc-verified)

---

## Executive Summary

CoursesIQ is an MSU-specific course seat alert service: a student registers a CRN, the system polls MSU's Banner SSB API on a regular interval, and fires an SMS the moment `seatsAvailable` transitions from 0 to positive. The technical foundation is well-understood and low-risk — MSU's Banner SSB JSON API is publicly accessible, requires only a lightweight session cookie (no student credentials), and has no observed rate limiting or anti-bot measures. The polling worker is a server-side HTTP client problem, not a browser automation problem.

The market is ready for a well-executed MSU-native tool. Coursicle is the only real competitor at MSU, and its generic 1,100-university architecture means it will never be as fast, relevant, or trusted as a purpose-built MSU product. The single-university specialist playbook (Courseer, SeatSignal, SeatSnag at ASU) is proven: a freemium model gated on number of tracked courses — not on alert speed — with semester pricing aligned to student behavior. MSU students are unusually motivated right now: The State News covered seat availability problems in April 2026, and Fall 2026 registration is approaching.

The critical risks are operational, not architectural. Duplicate SMS sends (cron overlaps), alert latency that loses seats to other students, and missing A2P 10DLC compliance before production launch are the three issues that can sink the product before it gains trust. The technical path is clear; the discipline to implement these safeguards correctly in v1 is what separates a working product from one that damages its own reputation.

---

## Top 10 Cross-Cutting Findings

### 1. The Banner API is clean JSON — no Playwright needed
MSU's `mybanner.msstate.edu` SSB9 returns full seat data (`seatsAvailable`, `openSection`, `enrollment`, `waitCount`) as structured JSON from `/searchResults/searchResults`. A single POST to `/term/search` establishes a JSESSIONID session cookie; all subsequent seat queries use that cookie. No browser automation, no HTML parsing required. This is a `fetch` + cookie jar problem. The `getEnrollmentInfo` endpoint returns only enrollment actual/max in HTML and cannot substitute for `searchResults/searchResults` as the primary polling target.

### 2. CRN filtering is broken — store subject + courseNumber
`txt_courseReferenceNumber` is accepted as a query param but does NOT filter results (verified live: returns all sections regardless of CRN value). The correct pattern is: query by `txt_subject` + `txt_courseNumber`, receive all sections for that course, then filter client-side by `courseReferenceNumber`. This means the data model must store `subject` and `courseNumber` alongside each CRN, collected at alert-creation time or resolved via a one-time scan.

### 3. Vercel Pro is non-negotiable for 5-minute polling
Vercel Hobby (free) enforces a once-per-day minimum cron interval. Every-5-minute polling requires Vercel Pro ($20/month). This is a hard cost the project must budget for. The cron runs `/api/cron/check-seats` and must be secured with `CRON_SECRET` (Bearer token in Authorization header) to prevent public invocation. Vercel does not retry failed cron runs and can fire duplicate events — the handler must be idempotent.

### 4. The `smsSentAt` flag is the lynchpin of the entire alert system
If a seat stays open for 30 minutes and the cron runs every 5 minutes, that is 6 potential SMS sends per user per course. The database-level `smsSentAt` field on each alert subscription is what prevents this. Set it on successful send; leave it null on transient Twilio errors (so the next cron cycle retries); reset it when `seatsAvailable` drops back to 0 (so the user is notified again if the seat reopens). This field must be checked before every Twilio call, not after.

### 5. Twilio v5 is stable; v6 dropped April 2026 — hold for now
`twilio` npm package v5.x is the production-stable choice. v6.0.0 was released April 16, 2026 — too new to adopt without migration guide validation. The SDK requires `export const runtime = 'nodejs'` on every Next.js route that imports it; the Edge Runtime lacks Node.js built-ins that Twilio depends on. TypeScript types are bundled — no `@types/twilio` needed.

### 6. A2P 10DLC registration is a launch blocker, not a nice-to-have
Unregistered US long-code SMS traffic is silently filtered by carriers. Production SMS requires either: (a) toll-free number verification (simpler, recommended for v1), or (b) A2P 10DLC Brand + Campaign registration (more complex, 2-10 day approval window, ~$29 one-time + $10/month). Start the toll-free verification process in parallel with development — it cannot be done the day before launch. Twilio also bills for failed messages as of September 2024, so validating phone numbers to E.164 with `libphonenumber-js` before calling the API is required cost control.

### 7. Sub-60-second polling on all tiers is the core competitive moat
The market's most consistent failure mode is alert latency. Coursicle reports 2-minute delays. Courseer's free tier is intentionally 14 minutes slow. A dropped seat at MSU can refill in under 60 seconds during registration peaks. CoursesIQ must not tier by speed — every user on every tier gets fast alerts. The freemium gate is number of tracked courses, not polling speed. Differentiating on speed would permanently damage trust if a free-tier user loses a seat.

### 8. Double-check before sending — never trust a single poll result
Between the moment a seat is detected as open and the moment the Twilio call completes, the seat may have been claimed by another student. A second API call immediately before firing the SMS (or at minimum, including a timestamp in the message body) manages user expectations. Alert copy should read: "CSE 231-001 seat detected at 2:34pm — act now." This is both honest and actionable.

### 9. Supabase new key format requires migration awareness
Supabase has deprecated the legacy `ANON_KEY` JWT in favor of a `sb_publishable_xxxx` format. Use `@supabase/ssr` (not the deprecated `@supabase/auth-helpers-nextjs`). The `service_role` key — needed by the cron job to bypass RLS and read all subscriptions across all users — must never be prefixed with `NEXT_PUBLIC_` and must be scoped to Production environment only in Vercel. Use `getClaims()` not `getSession()` for server-side auth validation (`getSession()` does not verify the JWT signature).

### 10. MSU is an unusually good market right now
The State News (April 2026) is actively covering MSU's seat availability crisis. MSU's Student Undergraduate Experience Strategy Team has a report due July 2026. Fall 2026 registration is the target launch window. A student-built MSU tool with a clear launch timing story has a credible path to organic press coverage — something Coursicle (a 1,100-school generic product) cannot leverage.

---

## Key Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Duplicate SMS sends from cron overlap | CRITICAL | `smsSentAt` flag checked before every send; Vercel cron idempotency built in at handler level |
| A2P 10DLC / toll-free not registered at launch | CRITICAL | Start toll-free verification immediately; it gates production launch |
| Session expires mid-poll cycle | HIGH | Detect `totalCount: 0` when results are expected; auto-re-establish JSESSIONID; maintain persistent cookie jar |
| Alert arrives after seat is gone | HIGH | Sub-60-second polling on all tiers; double-check API before send; timestamp every SMS |
| Banner SSB endpoint changes | HIGH | Monitor for unexpected `totalCount: 0` or schema changes; maintain the legacy `bwckschd` HTML endpoint as a fallback |
| `service_role` key leaks to client | HIGH | `import 'server-only'` in `lib/supabase/admin.ts`; Vercel scoped to Production environment only |
| Twilio bills for failed messages | MEDIUM | Validate all phone numbers to E.164 with `libphonenumber-js` before calling Twilio; handle error 21211/21614 as permanent |
| MSU blocks scraper IP | MEDIUM | 45-60 second respectful polling intervals; rotate headers; explore official Registrar data feed request |
| Opted-out users receive SMS after STOP | MEDIUM | Error 21610 must set `smsOptedOut = true` in DB and permanently suppress future sends |
| Cron runs longer than 5 minutes, overlaps | MEDIUM | Design handler to be idempotent; optionally use a DB-level lock row or Supabase advisory lock |

---

## Architecture Decisions Implied by Research

### Data Model (minimum required fields per alert subscription)

```
alerts table:
  id              uuid PK
  phone_number    text        -- stored, normalized E.164
  crn             text        -- e.g. "31352"
  term_code       text        -- e.g. "202630"
  subject         text        -- e.g. "CSE"   (required for Banner API query)
  course_number   text        -- e.g. "1011"  (required for Banner API query)
  course_title    text        -- display only
  last_seats_avail int        -- tracks 0→N transition
  sms_sent_at     timestamptz -- null = not sent; set on send; reset when seats → 0
  sms_sid         text        -- Twilio message SID for audit
  sms_opted_out   boolean     -- permanent; never send again if true
  alert_reset_at  timestamptz -- records when smsSentAt was last cleared
  is_active       boolean     -- user can deactivate
  created_at      timestamptz
```

RLS: `anon` role gets INSERT only (alert creation via public API route). No SELECT policy for anon. Cron uses `service_role` key (bypasses RLS). If user accounts added in v2, add `auth.uid() = user_id` policies.

### Polling Architecture

```
Vercel Cron (*/5 * * * *) -- UTC, Production only
  → GET /api/cron/check-seats
      → Validate CRON_SECRET Bearer token
      → supabaseAdmin: fetch all active, non-opted-out subscriptions
      → For each unique (term_code, subject, course_number) group:
          → POST /term/search  (establish/refresh JSESSIONID)
          → GET /searchResults/searchResults (subject + courseNumber filter)
          → Filter data[] by CRN client-side
          → For each matched section:
              → If seatsAvailable > 0 AND subscription.sms_sent_at IS NULL:
                  → sendSms() → Twilio
                  → On success: set sms_sent_at, sms_sid
                  → On permanent error: set sms_sent_at (suppress retries), sms_opted_out if 21610
              → If seatsAvailable == 0 AND sms_sent_at IS NOT NULL:
                  → Reset sms_sent_at (seat closed; user should be alerted if it reopens)
      → Return { checked: N, alerted: M }
```

### File Structure (confirmed from STACK.md)

```
G:/MSU Course/
├── app/
│   ├── api/
│   │   ├── alerts/route.ts          -- POST: create subscription (public)
│   │   └── cron/check-seats/route.ts -- GET: polling worker (CRON_SECRET protected)
│   └── page.tsx                     -- Alert creation form
├── lib/
│   ├── supabase/
│   │   ├── client.ts                -- createBrowserClient (client components)
│   │   ├── server.ts                -- createServerClient (server components/routes)
│   │   └── admin.ts                 -- service_role client (cron only); import 'server-only'
│   ├── banner.ts                    -- Banner SSB session + seat fetch; import 'server-only'
│   ├── sms.ts                       -- sendSms(), toE164US(), error handling
│   └── twilio.ts                    -- Singleton twilioClient; import 'server-only'
├── middleware.ts                    -- Supabase session refresh (getClaims, not getSession)
├── vercel.json                      -- {"crons": [{"path": "/api/cron/check-seats", "schedule": "*/5 * * * *"}]}
└── .env.local                       -- Never committed
```

### Key Implementation Constraints

- All routes importing `twilio` or Banner fetch logic need `export const runtime = 'nodejs'` (not Edge)
- Next.js 15: dynamic route params are `Promise<{id: string}>` — must `await params`
- Next.js 15: `headers()` and `cookies()` are async — must `await` them
- Next.js 15: GET handlers are NOT cached by default (changed from v14) — no action needed for cron route
- Banner: batch CRNs by (subject, courseNumber) to minimize total API calls per cron cycle
- Banner: session cookie lifetime is ~30 minutes; re-establish when `totalCount: 0` is unexpectedly returned

---

## v2 Opportunities Discovered

These are validated by market research and MSU-specific data availability — not speculative.

### 1. Grade Distribution Integration (Low-lift, high-value)
`msugrades.com` publishes FOIA-derived MSU grade distributions as a downloadable CSV, free to use. The `MSUScheduleGrades` Chrome extension already proves student demand for this data in the MSU context. Ingesting the CSV into Supabase and displaying per-instructor grade distributions on course detail pages requires no new data acquisition — it's a database + UI problem. File a direct FOIA with MSU Registrar in parallel to get newer semesters. Do not paywall this feature; use it to increase time-on-site and differentiation.

### 2. Professor Ratings via Cached RMP Data
RMP has no public API but its GraphQL endpoints are accessible without login. Batch-fetch MSU professor data weekly (not per-page-view), cache in Supabase, display with RMP attribution. Legal risk is moderate but manageable at student-project scale. Long-term, build MSU-native reviews (Coursicle's model) as the moat — but use RMP data to avoid the cold-start problem at v2 launch.

### 3. Direct Registration Link in SMS
SeatSignal (ASU) includes a direct link to the registration action in their alert SMS. For MSU, this would be a deep link into `mybanner.msstate.edu` or `reg.msstate.edu` that lands the student at the specific course registration action, not at a search page. Research the exact URL structure at implementation time — but include it in v2 if not v1.

### 4. Push Notifications (App or PWA)
SMS has 98% open rate but costs money and requires phone number collection. A PWA with push notifications is zero cost per alert and works from the web. Market research shows SMS outperforms push for time-sensitive actions with students, but push notifications as a supplement (free-tier users get push, paid users get SMS) could reduce Twilio costs while maintaining coverage. Defer to v2 — SMS must work reliably first.

### 5. Semester-Aligned Waitlist Awareness
MSU Banner exposes `waitCount`, `waitCapacity`, and `waitAvailable`. A v2 feature: alert when a waitlist spot opens (not just when a main seat opens). This is separately valuable for courses where waitlists exist and the university honors them. Model as a separate subscription type.

### 6. Multi-Term Support
The Banner `getTerms` endpoint lists all available terms (Spring, Summer, Fall). Fall 2026 is the launch target, but the architecture should not hardcode a term code. Allow users to select the active term at subscription time. The term code format is deterministic: `YYYYTT` where `10=Spring`, `20=Summer`, `30=Fall`.

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| Banner API endpoints | HIGH | Live-tested against `mybanner.msstate.edu` on 2026-04-22; response structures verified |
| Stack choices | HIGH | Official Next.js 15, Vercel, and Supabase docs verified April 2026 |
| Twilio SDK | HIGH | Official docs + npm CHANGES.md; v6 flag is a precaution, v5 is confirmed stable |
| Market freemium model | HIGH | Multiple competitor pricing pages directly verified |
| Coursicle MSU latency | MEDIUM | User reviews (not controlled measurement); directionally reliable |
| A2P 10DLC costs/timeline | MEDIUM | Official Twilio docs; approval timelines vary and can change |
| RMP legal risk | MEDIUM | Case law analysis is current but legal landscape can shift; no definitive ruling for this use case |
| MSU Registrar data feed availability | LOW | Speculative; no contact made; worth attempting given MSU-student-project framing |

**Overall: HIGH confidence on the technical execution path. MEDIUM confidence on compliance timelines and competitive positioning details.**

---

## Recommended Phase Sequence (for Roadmap)

**Phase 1 — Core Infrastructure**
Set up Next.js 15 App Router project, Supabase (schema + RLS), environment variables, and the `lib/` module structure (banner.ts, twilio.ts, sms.ts, supabase/admin.ts). Get Banner session establishment and seat fetch working end-to-end in isolation. No UI yet.

**Phase 2 — Alert Subscription API**
`POST /api/alerts` with Zod validation: accepts phone, CRN, term, subject, courseNumber. Normalizes phone to E.164. Writes to Supabase. Returns subscription ID. This is the public-facing intake.

**Phase 3 — Polling Cron Worker**
`GET /api/cron/check-seats` with CRON_SECRET guard. Fetches active subscriptions. Runs Banner polling loop. Sends Twilio SMS on seat open. Sets `sms_sent_at`. Resets on seat close. Handles permanent Twilio errors. Deploy to Vercel Pro with vercel.json cron config.

**Phase 4 — User Interface**
Alert creation form: phone input (with E.164 normalization preview), CRN + subject + course number input (or course search UI backed by Banner's `get_subject` and `searchResults` endpoints), term selector backed by `getTerms`. Confirmation page. Basic alert status view ("Monitoring CSE 231-001 for Fall 2026").

**Phase 5 — Production Hardening**
A2P toll-free number verification submitted before this phase. Session re-establishment on `totalCount: 0`. Request timeout handling (10s recommended for Banner). Cron run logging to Supabase for observability. Rate limiting on `/api/alerts` (prevent phone number spam). Webhook signature validation on `/api/sms/status` if status callbacks added.

**Phase 6 (v2) — Grade Distributions**
Ingest msugrades.com CSV into Supabase. Add course detail page with per-instructor grade distribution chart. No paywall. File MSU FOIA for newer data.

**Phase 7 (v2) — Professor Ratings**
Batch-fetch + cache RMP data for MSU professors. Display on course detail page alongside grade distributions. Attribution to RMP. Weekly refresh job.

---

## Sources (Aggregated)

- Live API testing against `mybanner.msstate.edu` (2026-04-22)
- Next.js Route Handlers Official Docs (verified 2026-04-21)
- Vercel Cron Jobs — Usage & Pricing (verified 2026-04)
- Supabase SSR — Server-Side Auth for Next.js (verified 2026-04)
- Supabase Row Level Security (verified 2026-04)
- twilio npm package + CHANGES.md (verified 2026-04-22)
- Twilio A2P 10DLC Compliance Overview (official docs)
- Twilio SMS Billing for Failed Messages (Sep 2024)
- libphonenumber-js (npm, verified 2026-04-22)
- Coursicle, Courseer, SeatSignal, SeatSnag, ASUClassFinder, PickMyClass, SeatAlert.ca (direct site verification 2026-04-22)
- MSU Grades: msugrades.com (FOIA-derived CSV, public)
- MSUScheduleGrades extension: github.com/lahaiery/MSUScheduleGrades
- The State News — MSU seat availability article (April 2026)
- NU Banner API documentation: jennydaman.gitlab.io/nubanned
