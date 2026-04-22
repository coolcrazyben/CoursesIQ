# Phase 1: Project Scaffold & Database - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Create the Next.js 15 project directly in the current working directory (`G:/MSU Course`), install all required dependencies, deliver the Supabase schema as a raw SQL migration file, configure RLS policies, and create all stub lib/ modules. No business logic implemented — phase ends when the project boots, schema is applied, and all stubs are importable.

</domain>

<decisions>
## Implementation Decisions

### Project Setup
- **D-01:** Run `npx create-next-app .` in `G:/MSU Course` — project files go directly in the current directory (no subfolder).
- **D-02:** create-next-app options: TypeScript ✓, Tailwind CSS ✓, App Router ✓, ESLint ✓, no src/ directory, default import alias (`@/*`).

### Supabase
- **D-03:** No Supabase project exists yet. Phase tasks must include: create Supabase project at supabase.com, retrieve `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, and create `.env.local` before any lib/ modules can be tested.
- **D-04:** Schema migration delivered as a single raw SQL file at `supabase/schema.sql` — copy-paste into Supabase Dashboard SQL Editor. No Supabase CLI or Docker required.

### Claude's Discretion
- Migration format chosen: raw SQL file (no CLI tooling) — simplest path for a solo developer starting fresh.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — INFRA-01 through INFRA-05 define all Phase 1 deliverables
- `.planning/ROADMAP.md` — Phase 1 Key Deliverables and Success Criteria (prescriptive dependency list, column names, lib file paths, RLS policies)

No external specs — requirements fully captured in decisions and roadmap above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code.

### Established Patterns
- None — this phase establishes the baseline patterns all future phases will follow.

### Integration Points
- All future phases depend on the lib/ stubs created here as the integration contract.

</code_context>

<specifics>
## Specific Ideas

- `alerts` table must include `last_seats_avail`, `sms_sid`, and `alert_reset_at` columns — specified in ROADMAP.md Phase 1 deliverables (more detailed than REQUIREMENTS.md INFRA-02; ROADMAP takes precedence).
- `lib/supabase/admin.ts` must include `import 'server-only'` to prevent accidental client-side imports.
- Tailwind custom color token: `maroon: '#5D1725'` in `tailwind.config.ts`.
- Pin `twilio@^5` — v6.0.0 released April 16, 2026 with no migration guide yet.
- All three Supabase client modules must use `@supabase/ssr` (not deprecated `auth-helpers-nextjs`).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-project-scaffold-database*
*Context gathered: 2026-04-22*
