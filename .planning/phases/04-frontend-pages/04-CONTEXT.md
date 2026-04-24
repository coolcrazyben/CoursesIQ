# Phase 4: Frontend Pages — Context

**Gathered:** 2026-04-23
**Status:** Ready for planning
**Source:** /gsd-discuss-phase 4 (user approved all gray areas)

<domain>
## Phase Boundary

Three application pages (Home, Dashboard, About) + two client components (AlertForm, DashboardAlerts) matching the mobile-first MSU maroon design spec. All pages render live data from the Phase 3 backend. Students can subscribe to seat alerts and cancel them through functional, validated forms.

**In scope:** app/page.tsx, app/dashboard/page.tsx, app/about/page.tsx, components/AlertForm.tsx, components/DashboardAlerts.tsx, shared nav/header, PATCH /api/alerts/[id] cancel endpoint, globals.css refinements.

**Out of scope:** Authentication, accounts, professor ratings, grade distributions, payment tiers (v2 backlog).

</domain>

<decisions>
## Implementation Decisions

### Hero Copy & Tone
- **Claude's Discretion** — user approved; aim for punchy + MSU-specific. Something like: "Never miss an open seat at MSU." / "We text you the second a seat opens — before anyone else knows."
- Subtext should mention: instant SMS alerts, no account needed, free.

### AlertForm — 3-Field UX (CRN + Subject + Course Number)
- **Claude's Discretion** — All three fields are required (Banner API limitation; CRN filter is broken, subject+course_number needed for lookup)
- Add a helper note below the form explaining what each field is and where to find it in Banner (e.g., "Find your CRN in the MSU class schedule")
- Field labels should be clear: "CRN (Course Reference Number)", "Subject (e.g., CSE)", "Course Number (e.g., 1011)"
- Client-side phone validation before API call (ALRT-02 / UI-04 requirement: "shows inline validation error — no API call is made")

### Dashboard Access Model
- **LOCKED: Zero-friction phone lookup — no verification gate in v1**
- User types their phone number → server fetches their alerts → renders list
- No SMS verification code, no login, no friction
- Accepted tradeoff: anyone who knows your phone number can view/cancel your alerts
- This is intentional for v1 simplicity; auth deferred to v2 (AUTH-01, AUTH-02)

### Cancel Confirmation
- **Claude's Discretion** — simple inline confirm (e.g., button text changes to "Confirm cancel?" on first click, then fires PATCH on second click) OR immediate cancel with optimistic UI removal. Keep it simple for v1.

### Cancel Endpoint
- Needs `PATCH /api/alerts/[id]` (or equivalent) to set `is_active = false`
- Must be created as part of this phase (not in Phase 3 scope)
- Use adminClient (service_role) — no auth in v1
- Return 200 on success, 404 if alert not found

### Dark Mode
- **Claude's Discretion** — globals.css has dark mode vars from scaffold; strip dark mode and go full light/maroon-only for MSU brand clarity. The maroon header with white text is the brand identity — dark mode complicates this.

### Navigation
- Shared header in layout.tsx: maroon (`bg-maroon`) background, white text, CoursesIQ brand name on left, nav links (Home, Dashboard) on right
- Mobile: same header, links stack or use a simple horizontal row (no hamburger needed for 2 links)

### Component Architecture
- `AlertForm` — `'use client'` component; manages form state, calls POST /api/alerts, shows success/error inline
- `DashboardAlerts` — can be server component for initial render; cancel action needs client interactivity (either a separate `CancelButton` client component or make `DashboardAlerts` a client component)
- `app/page.tsx` — server component; fetches live alert count from Supabase adminClient
- `app/dashboard/page.tsx` — server component with search params for phone lookup

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/REQUIREMENTS.md` — UI-01 through UI-10 (all Phase 4 requirements)
- `.planning/ROADMAP.md` — Phase 4 key deliverables and success criteria

### Prior Phase Context (APIs this phase calls)
- `.planning/phases/03-alert-system-cron-worker/03-02-SUMMARY.md` — POST /api/alerts interface (201+UUID, 409 duplicate, 400 bad phone)
- `.planning/phases/03-alert-system-cron-worker/03-03-SUMMARY.md` — vercel.json, cron route
- `.planning/phases/02-banner-api-integration/02-02-SUMMARY.md` — GET /api/course/[crn] interface

### Project State
- `.planning/STATE.md` — Key decisions: D-03 (Tailwind v4 CSS-first), maroon token, stack decisions

### Existing Code
- `app/globals.css` — Tailwind v4 `@theme` with `--color-maroon: #5D1725` already defined
- `app/layout.tsx` — Root layout (needs nav/header added)
- `lib/supabase/admin.ts` — adminClient for server-side alert count + cancel
- `lib/supabase/server.ts` — serverClient for SSR if needed

</canonical_refs>

<specifics>
## Specific Ideas

- Live alert count on homepage: `SELECT count(*) FROM alerts WHERE is_active = true` via adminClient in server component
- TCPA consent text (LOCKED per UI-10): "By submitting, you consent to receive SMS alerts. Message & data rates may apply. Reply STOP to unsubscribe."
- Maroon brand hex: `#5D1725` — already in globals.css as `--color-maroon`
- Tailwind v4 CSS-first: use `bg-maroon` (no tailwind.config.ts)
- Mobile-first: min-width 375px, no horizontal scroll (UI-09)
- About page: one paragraph about CoursesIQ (minimal — just describe what it does and who it's for)

</specifics>

<deferred>
## Deferred Ideas

- Phone verification / auth on dashboard (AUTH-01, AUTH-02 — v2)
- Course search / CRN lookup UI (would require a proper course search page — v2 feature)
- Dark mode (stripped for v1 brand clarity)
- Rate limiting on alert creation (PREM-01 — v2 freemium)

</deferred>

---

*Phase: 04-frontend-pages*
*Context gathered: 2026-04-23 via /gsd-discuss-phase 4*
