# CoursesIQ

## What This Is

CoursesIQ is a web app for MSU students that monitors course seat availability and sends instant SMS alerts when a seat opens in a full class. Starting with Mississippi State University, it gives students the split-second advantage they need during peak registration periods. Future versions will add professor ratings and grade distribution data to help students make smarter course decisions, not just faster ones.

## Core Value

Students get an SMS the moment a seat opens — before anyone else knows.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

**Infrastructure**
- [ ] Next.js 15 App Router project with TypeScript and Tailwind CSS
- [ ] Supabase database with `alerts` and `courses` tables + RLS enabled from day one
- [ ] Three Supabase client modules: browser, server (RSC/routes), admin (cron, service_role)
- [ ] Environment variable configuration for all external services

**Banner Integration**
- [ ] Session-based MSU Banner SSB API client using axios + tough-cookie
- [ ] Fetch seat availability by subject + course number, filter to CRN client-side
- [ ] Term code detection (current/upcoming term)
- [ ] Handle session expiry (re-establish JSESSIONID on `totalCount: 0` response)

**Alert System**
- [ ] `POST /api/alerts` — create alert with CRN, subject, course number, phone, optional email
- [ ] Phone number validation and E.164 normalization via libphonenumber-js
- [ ] `GET /api/cron/check-seats` — Vercel cron endpoint secured with CRON_SECRET header
- [ ] Seat change detection: trigger when `seatsAvailable` transitions 0 → positive
- [ ] Twilio SMS send with deduplication via `sms_sent_at` DB flag
- [ ] `GET /api/course/[crn]` — fetch and cache course info for a given CRN
- [ ] TCPA-compliant opt-in consent text at phone number input

**Frontend**
- [ ] Homepage (`/`) — hero, CRN + phone input form, live alert counter
- [ ] Dashboard (`/dashboard`) — view and cancel alerts by phone number lookup
- [ ] About page (`/about`) — one paragraph description
- [ ] Mobile-first Tailwind design with MSU maroon (#5D1725) color scheme

**Deployment**
- [ ] Vercel deployment with `vercel.json` cron config (5-minute interval, requires Pro plan)
- [ ] README with full environment variable setup instructions

### Out of Scope

- Rate My Professor integration — deferred to v2; requires RMP API research and caching strategy
- Grade distribution data — deferred to v2; msugrades.com CSV available when ready
- Freemium/payments — deferred to v2; gate will be on alert quantity, not speed
- User accounts/auth — deferred to v2; phone-based lookup only in v1
- Multi-school support — MSU only in v1; architecture should remain extensible

## Context

- **Banner API**: MSU uses `mybanner.msstate.edu` (not `mystudent.msstate.edu`). Public JSON API, no auth. Session via POST to `/term/search`, seat data via GET `/searchResults/searchResults`. CRN filtering is broken — must query by subject+courseNumber and filter client-side.
- **Term codes**: `YYYYTT` format where 10=Spring, 20=Summer, 30=Fall. Fall 2026 = 202630.
- **Market timing**: State News is actively covering MSU seat shortages (April 2026). July 2026 report due. Pre-Fall-2026-registration launch is ideal.
- **Competitors**: Coursicle is vulnerable (major UX regression in October 2024 update). No MSU-specific tools exist. This is whitespace.
- **Vercel cron**: 5-minute polling requires Vercel Pro ($20/mo). Hobby tier is once/day. Must be documented clearly.
- **Twilio**: Pin to `twilio@^5` (v6.0.0 just released April 16, 2026 — no migration guide yet). All routes importing twilio need `export const runtime = 'nodejs'`. A2P 10DLC / toll-free verification is a launch blocker — start immediately.

## Constraints

- **Tech stack**: Next.js 15 (App Router), Supabase, Twilio, Vercel, Tailwind CSS, TypeScript — fixed
- **Database**: Supabase; alerts table must have RLS from creation (phone numbers are PII)
- **Hosting**: Vercel; cron requires Pro plan for sub-daily intervals
- **Phone compliance**: TCPA opt-in required; A2P 10DLC or toll-free verification required before production SMS
- **Next.js 15**: Dynamic route `params` is a Promise — must `await params` everywhere
- **Supabase**: Use `@supabase/ssr` (not deprecated `auth-helpers-nextjs`); use `getClaims()` not `getSession()` server-side

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| axios + tough-cookie for Banner | Banner SSB is pure JSON — no browser automation needed | — Pending |
| Store subject + course_number per alert | CRN filtering is broken in MSU's Banner deployment | — Pending |
| Twilio toll-free number (not long code) | Faster A2P registration, simpler compliance, cheaper | — Pending |
| Freemium gates on alert count, not speed | Never degrade alert latency — that's the core value | — Pending |
| Vercel Pro required | 5-min cron is a hard product requirement, Hobby can't do it | — Pending |
| `sms_sent_at` DB flag for deduplication | Prevents duplicate SMS if seat stays open across multiple polls | — Pending |

---
*Last updated: 2026-04-22 after initial project creation*
