# CoursesIQ — Session Memory

## Project

CoursesIQ: MSU course seat alert web app. Next.js 15, Supabase, Twilio, Vercel.

## Critical Technical Facts

- **Banner base URL**: `mybanner.msstate.edu` (not `mystudent.msstate.edu` — that host doesn't respond)
- **CRN filtering is broken** in MSU's Banner: must query by subject+courseNumber, filter client-side
- **Vercel cron 5min = Pro plan** ($20/mo). Hobby tier = once/day only
- **Twilio**: pin `twilio@^5`; v6 just dropped (April 2026), no migration guide yet
- **Next.js 15**: `params` is a Promise — must `await params` in all dynamic routes
- **Supabase**: use `@supabase/ssr`, not deprecated `auth-helpers-nextjs`. Use `getClaims()` not `getSession()`
- **TCPA**: consent copy required at phone input field
- **A2P 10DLC**: start toll-free verification immediately — 2-10 day lead time, launch blocker

## Planning Files

- `.planning/PROJECT.md` — project context
- `.planning/REQUIREMENTS.md` — 34 v1 requirements (INFRA, BANN, ALRT, UI, DEPL)
- `.planning/ROADMAP.md` — 5-phase v1 roadmap
- `.planning/STATE.md` — current state
- `.planning/research/` — BANNER, STACK, TWILIO, MARKET, SUMMARY

## Roadmap

Phase 1: Project Scaffold & Database
Phase 2: Banner API Integration
Phase 3: Alert System & Cron Worker
Phase 4: Frontend Pages
Phase 5: Deployment Config & Documentation
