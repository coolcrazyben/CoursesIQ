# CoursesIQ — Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22)

**Core value:** Students get an SMS the moment a seat opens — before anyone else knows.
**Current focus:** Phase 3 — Alert System & Cron Worker

## Current Status

- Milestone: v1.0 MVP
- Phase: 2 — COMPLETE
- Next Phase: 3 — Alert System & Cron Worker
- Last action: Phase 2 Plan 2 executed — GET /api/course/[crn] live verified against MSU Banner (2026-04-22)

## Progress

| Phase | Plans Complete | Status |
|-------|----------------|--------|
| 1. Project Scaffold & Database | 2/2 | Complete ✓ |
| 2. Banner API Integration | 2/2 | Complete ✓ |
| 3. Alert System & Cron Worker | 0/? | Not started |
| 4. Frontend Pages | 0/? | Not started |
| 5. Deployment Config & Documentation | 0/? | Not started |

## Planning Artifacts

| Artifact | Status |
|----------|--------|
| PROJECT.md | ✓ Created |
| REQUIREMENTS.md | ✓ Created (34 v1 requirements) |
| ROADMAP.md | ✓ Created (5 phases) |
| research/BANNER.md | ✓ Created |
| research/STACK.md | ✓ Created |
| research/TWILIO.md | ✓ Created |
| research/MARKET.md | ✓ Created |
| research/SUMMARY.md | ✓ Created |
| phases/01-project-scaffold-database/01-1-SUMMARY.md | ✓ Created |
| phases/01-project-scaffold-database/01-2-SUMMARY.md | ✓ Created |
| phases/02-banner-api-integration/02-01-SUMMARY.md | ✓ Created |
| phases/02-banner-api-integration/02-02-SUMMARY.md | ✓ Created |

## Decisions Made

- D-01: Scaffold into temp dir `coursesiq/` then move to `G:/MSU Course/` root — directory name invalid as npm package name (spaces + capitals)
- D-02: twilio pinned at ^5.13.1 (v6.0.0 breaking — no migration guide)
- D-03: Tailwind v4 CSS-first config — @theme block in globals.css, no tailwind.config.ts
- D-04: serverExternalPackages: ['twilio'] in next.config.ts — explicit (twilio not in Next.js built-in list)
- D-02-01: establishSession returns Promise<void> not Promise<string> — stub had wrong return type; void is correct for a side-effecting session setup with no meaningful return value

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 1 | 1 | 373s | 4/4 | 17 |
| 1 | 2 | — | 5/5 | 6 |
| 2 | 1 | 81s | 2/2 | 2 |
| 2 | 2 | — | 2/2 | 1 |

## Key Flags

- Vercel Pro required for 5-minute cron (Hobby = once/day)
- Start Twilio toll-free verification NOW — 2-10 business day lead time
- Banner base URL: mybanner.msstate.edu (not mystudent.msstate.edu)
- CRN filtering broken in Banner — store subject + course_number per alert
- Pin twilio@^5 (v6.0.0 released April 16, 2026 — no migration guide yet)
- New Supabase projects (post-Nov 2025): use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not NEXT_PUBLIC_SUPABASE_ANON_KEY
- getSeatsByCRN manages session internally — API route should NOT call establishSession directly

## Last Session

- Timestamp: 2026-04-23T04:42:20Z
- Stopped at: Completed Phase 2 Plan 1 — lib/constants.ts + lib/banner.ts Banner SSB client
- Resume file: .planning/phases/02-banner-api-integration/02-01-SUMMARY.md
