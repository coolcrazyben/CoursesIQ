# CoursesIQ — Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22)

**Core value:** Students get an SMS the moment a seat opens — before anyone else knows.
**Current focus:** Phase 1 — executing Plan 2 (Supabase schema + lib/ clients)

## Current Status

- Milestone: v1.0 MVP
- Phase: 1 — Plan 1 complete
- Current Plan: 2 of 2 (Phase 1)
- Last action: Phase 1 Plan 1 executed — Next.js 15 scaffold complete (2026-04-23)
- Resume file: .planning/phases/01-project-scaffold-database/01-2-supabase-schema-clients.md

## Progress

| Phase | Plans Complete | Status |
|-------|----------------|--------|
| 1. Project Scaffold & Database | 1/2 | In progress |
| 2. Banner API Integration | 0/? | Not started |
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

## Decisions Made

- D-01: Scaffold into temp dir `coursesiq/` then move to `G:/MSU Course/` root — directory name invalid as npm package name (spaces + capitals)
- D-02: twilio pinned at ^5.13.1 (v6.0.0 breaking — no migration guide)
- D-03: Tailwind v4 CSS-first config — @theme block in globals.css, no tailwind.config.ts
- D-04: serverExternalPackages: ['twilio'] in next.config.ts — explicit (twilio not in Next.js built-in list)

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 1 | 1 | 373s | 4/4 | 17 |

## Key Flags

- Vercel Pro required for 5-minute cron (Hobby = once/day)
- Start Twilio toll-free verification NOW — 2-10 business day lead time
- Banner base URL: mybanner.msstate.edu (not mystudent.msstate.edu)
- CRN filtering broken in Banner — store subject + course_number per alert
- Pin twilio@^5 (v6.0.0 released April 16, 2026 — no migration guide yet)
- New Supabase projects (post-Nov 2025): use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not NEXT_PUBLIC_SUPABASE_ANON_KEY

## Last Session

- Timestamp: 2026-04-23T03:58:49Z
- Stopped at: Completed Phase 1 Plan 1 — scaffold + dependencies
- Resume file: .planning/phases/01-project-scaffold-database/01-2-supabase-schema-clients.md
