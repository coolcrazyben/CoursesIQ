# Requirements: CoursesIQ

**Defined:** 2026-04-22
**Core Value:** Students get an SMS the moment a seat opens — before anyone else knows.

## v1 Requirements

### Infrastructure

- [x] **INFRA-01**: Next.js 15 App Router project initializes with TypeScript, Tailwind CSS, and ESLint
- [ ] **INFRA-02**: Supabase `alerts` table exists with columns: `id`, `crn`, `subject`, `course_number`, `course_name`, `phone_number`, `email`, `school`, `term_code`, `is_active`, `created_at`, `sms_sent_at`, `sms_opted_out`
- [ ] **INFRA-03**: Supabase `courses` table exists as a cache with columns: `crn`, `course_name`, `section`, `professor`, `seats_total`, `seats_available`, `last_checked`
- [ ] **INFRA-04**: Row Level Security is enabled on both tables from creation; anon role may INSERT into alerts but not SELECT; cron uses service_role bypass
- [ ] **INFRA-05**: Three Supabase client modules exist: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (RSC/API routes), `lib/supabase/admin.ts` (service_role for cron)
- [ ] **INFRA-06**: All required environment variables are documented in `.env.example` and README

### Banner Integration

- [ ] **BANN-01**: `lib/banner.ts` establishes a Banner SSB session via POST to `/term/search` and stores JSESSIONID
- [ ] **BANN-02**: `lib/banner.ts` fetches seat availability via GET `/searchResults/searchResults` with subject + courseNumber params
- [ ] **BANN-03**: Banner client filters results client-side by `courseReferenceNumber` to find a specific CRN
- [ ] **BANN-04**: Banner client detects session expiry (`totalCount: 0`) and re-establishes session before retrying
- [ ] **BANN-05**: `GET /api/course/[crn]` fetches and caches course info in the `courses` table, returning course name, professor, seats
- [ ] **BANN-06**: Term code (e.g., `202630` for Fall 2026) is detected or configured to target the correct registration period

### Alert Management

- [ ] **ALRT-01**: `POST /api/alerts` accepts `crn`, `subject`, `course_number`, `phone_number`, and optional `email`; validates all fields; stores in Supabase
- [ ] **ALRT-02**: Phone numbers are normalized to E.164 format (`+1XXXXXXXXXX`) using libphonenumber-js before storage
- [ ] **ALRT-03**: Duplicate alert submissions (same CRN + phone) are rejected or deduplicated gracefully
- [ ] **ALRT-04**: `GET /api/cron/check-seats` is protected by `Authorization: Bearer <CRON_SECRET>` header validation
- [ ] **ALRT-05**: Cron handler fetches all active alerts (`is_active = true, sms_sent_at IS NULL, sms_opted_out = false`) using service_role client
- [ ] **ALRT-06**: Cron groups subscriptions by `(subject, course_number)` to batch Banner API calls (avoid redundant requests for same course)
- [ ] **ALRT-07**: When `seatsAvailable` transitions from 0 to any positive number, Twilio SMS is sent to subscriber's phone
- [ ] **ALRT-08**: SMS message format: `"🎉 A seat just opened in [COURSE NAME] ([CRN])! Register now before it fills up: mybanner.msstate.edu — CoursesIQ"`
- [ ] **ALRT-09**: After successful SMS send, `sms_sent_at` is set and `is_active` is set to false for that alert record
- [ ] **ALRT-10**: Twilio error 21610 (opted out) sets `sms_opted_out = true` permanently for that phone number
- [ ] **ALRT-11**: `vercel.json` configures the cron job at `*/5 * * * *` (requires Vercel Pro)

### Frontend

- [ ] **UI-01**: Homepage (`/`) renders hero section with value proposition headline and subtext
- [ ] **UI-02**: Homepage has a form with CRN input, subject input, course number input, phone number input, and optional email input
- [ ] **UI-03**: Homepage shows a live count of currently active alerts (fetched server-side)
- [ ] **UI-04**: Homepage form submits to `POST /api/alerts` and shows success/error feedback
- [ ] **UI-05**: Dashboard (`/dashboard`) accepts a phone number and displays all alerts for that number
- [ ] **UI-06**: Dashboard allows canceling individual alerts (sets `is_active = false`)
- [ ] **UI-07**: About page (`/about`) contains one paragraph describing CoursesIQ
- [ ] **UI-08**: All pages use Tailwind CSS with dark maroon (`#5D1725`) primary color and white/light-gray backgrounds
- [ ] **UI-09**: All pages are mobile-first and render correctly on 375px viewport
- [ ] **UI-10**: Phone number input shows TCPA-compliant consent text: "By submitting, you consent to receive SMS alerts. Message & data rates may apply. Reply STOP to unsubscribe."

### Deployment

- [ ] **DEPL-01**: `README.md` documents all environment variables, their purpose, and where to obtain them
- [ ] **DEPL-02**: `README.md` includes setup steps for local development and Vercel deployment
- [ ] **DEPL-03**: `.env.example` contains all required keys with placeholder values
- [ ] **DEPL-04**: All Twilio-importing API routes include `export const runtime = 'nodejs'`

## v2 Requirements

### Professor Ratings

- **PROF-01**: Rate My Professor data is fetched weekly per professor and cached locally
- **PROF-02**: Professor rating is displayed on course detail view and search results
- **PROF-03**: Attribution to RMP is displayed alongside ratings

### Grade Distributions

- **GRADE-01**: MSU grade distribution data (from msugrades.com FOIA CSV) is ingested into Supabase
- **GRADE-02**: Average GPA is displayed per professor per course section
- **GRADE-03**: Grade distribution chart (A/B/C/D/F/W percentages) is shown on course detail

### Freemium

- **PREM-01**: Free tier allows 1 active alert at a time per phone number
- **PREM-02**: Premium tier ($5/semester) allows unlimited active alerts
- **PREM-03**: Stripe integration handles payment and subscription state

### Accounts

- **AUTH-01**: User can create account with email; phone number becomes primary identifier
- **AUTH-02**: User session persists; dashboard does not require re-entering phone number

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-school support | MSU only for v1 — architecture stays extensible but no UI for school selection |
| Real-time seat updates (WebSockets) | Polling is sufficient; real-time adds complexity without product value |
| iOS/Android app | Web-first, mobile-responsive; native app deferred indefinitely |
| Email alerts | SMS is faster and higher-engagement; email is secondary at best |
| OAuth login | Phone-based lookup sufficient for v1; no auth system needed |
| Alert speed tiering | Core value is instant alerts — never degrade speed for free tier |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Pending |
| INFRA-04 | Phase 1 | Pending |
| INFRA-05 | Phase 1 | Pending |
| INFRA-06 | Phase 5 | Pending |
| BANN-01 | Phase 2 | Pending |
| BANN-02 | Phase 2 | Pending |
| BANN-03 | Phase 2 | Pending |
| BANN-04 | Phase 2 | Pending |
| BANN-05 | Phase 2 | Pending |
| BANN-06 | Phase 2 | Pending |
| ALRT-01 | Phase 3 | Pending |
| ALRT-02 | Phase 3 | Pending |
| ALRT-03 | Phase 3 | Pending |
| ALRT-04 | Phase 3 | Pending |
| ALRT-05 | Phase 3 | Pending |
| ALRT-06 | Phase 3 | Pending |
| ALRT-07 | Phase 3 | Pending |
| ALRT-08 | Phase 3 | Pending |
| ALRT-09 | Phase 3 | Pending |
| ALRT-10 | Phase 3 | Pending |
| ALRT-11 | Phase 5 | Pending |
| UI-01 | Phase 4 | Pending |
| UI-02 | Phase 4 | Pending |
| UI-03 | Phase 4 | Pending |
| UI-04 | Phase 4 | Pending |
| UI-05 | Phase 4 | Pending |
| UI-06 | Phase 4 | Pending |
| UI-07 | Phase 4 | Pending |
| UI-08 | Phase 4 | Pending |
| UI-09 | Phase 4 | Pending |
| UI-10 | Phase 4 | Pending |
| DEPL-01 | Phase 5 | Pending |
| DEPL-02 | Phase 5 | Pending |
| DEPL-03 | Phase 5 | Pending |
| DEPL-04 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-22*
*Last updated: 2026-04-22 after initial definition*
