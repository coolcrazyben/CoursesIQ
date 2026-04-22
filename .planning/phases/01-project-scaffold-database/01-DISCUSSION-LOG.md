# Phase 1: Project Scaffold & Database - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 01-project-scaffold-database
**Areas discussed:** Project location, Supabase readiness, Migration format

---

## Project Location

| Option | Description | Selected |
|--------|-------------|----------|
| Current directory | `create-next-app .` in `G:/MSU Course` — project files at root | ✓ |
| Subfolder | `create-next-app coursesiq/` — project nested under current dir | |

**User's choice:** Current directory
**Notes:** Project files (package.json, app/, etc.) live directly in `G:/MSU Course`.

---

## Supabase Readiness

| Option | Description | Selected |
|--------|-------------|----------|
| Project exists | Supabase URL + keys already available | |
| Not yet | Needs to be created as part of this phase | ✓ |

**User's choice:** No Supabase project yet
**Notes:** Phase plan must include step to create Supabase project and retrieve credentials.

---

## Migration Format

| Option | Description | Selected |
|--------|-------------|----------|
| Raw SQL file | Single `supabase/schema.sql` for Dashboard SQL Editor | ✓ (Claude's discretion) |
| Supabase CLI migration | `supabase/migrations/` files, requires supabase CLI + Docker | |
| Both | Raw SQL + CLI migration files | |

**User's choice:** "Whatever is best" → Claude chose raw SQL file
**Notes:** No CLI tooling needed; simpler for solo developer starting from scratch.

---

## Claude's Discretion

- Migration format: raw SQL file at `supabase/schema.sql`

## Deferred Ideas

None.
