---
phase: 1
plan: 1
subsystem: scaffold
tags: [nextjs, tailwind, typescript, eslint, dependencies]
dependency_graph:
  requires: []
  provides: [package.json, next.config.ts, app/globals.css, postcss.config.mjs, tsconfig.json]
  affects: [all-future-phases]
tech_stack:
  added:
    - next@15.5.15
    - react@19.1.0
    - typescript@^5
    - tailwindcss@^4
    - "@tailwindcss/postcss@^4"
    - "@supabase/ssr@^0.10.2"
    - "@supabase/supabase-js@^2.104.0"
    - twilio@^5.13.1
    - libphonenumber-js@^1.12.41
    - zod@^4.3.6
    - axios@^1.15.2
    - tough-cookie@^6.0.1
    - axios-cookiejar-support@^6.0.5
  patterns:
    - Next.js 15 App Router with Turbopack
    - Tailwind v4 CSS-first configuration via @theme in globals.css
    - serverExternalPackages for Twilio Node.js native module isolation
key_files:
  created:
    - package.json
    - next.config.ts
    - app/globals.css
    - app/layout.tsx
    - app/page.tsx
    - postcss.config.mjs
    - tsconfig.json
    - eslint.config.mjs
    - .gitignore
  modified: []
decisions:
  - "D-01: Scaffolded into temp subdirectory coursesiq/ then moved files to G:/MSU Course root (directory name contains space + capitals, invalid for npm package name)"
  - "D-02: Turbopack enabled as default dev bundler (--turbopack flag, Next.js 15 default)"
  - "D-03: twilio pinned at ^5.13.1 (NOT latest v6.0.0 which has breaking Node.js version requirement)"
  - "D-04: @theme block added between @import and :root block, preserving all existing scaffold CSS"
metrics:
  duration: "373 seconds (~6 minutes)"
  completed: "2026-04-23"
  tasks_completed: 4
  files_created: 17
---

# Phase 1 Plan 1: Project Scaffold Summary

**One-liner:** Next.js 15.5.15 App Router project scaffolded with Tailwind v4, TypeScript, ESLint, Turbopack, all 8 Phase 1 runtime dependencies installed, MSU maroon color token registered, and Twilio externals configured.

## Tasks Completed

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | Scaffold Next.js 15 project | Done | 8ad5a5d |
| 2 | Install Phase 1 dependencies | Done | 8ad5a5d |
| 3 | Configure next.config.ts and app/globals.css | Done | 8ad5a5d |
| 4 | Verify scaffold | Done | 8ad5a5d |

## Installed Dependency Versions

### Runtime Dependencies (package.json `dependencies`)

| Package | Version (range) | Installed |
|---------|----------------|-----------|
| next | 15.5.15 | 15.5.15 |
| react | 19.1.0 | 19.1.0 |
| react-dom | 19.1.0 | 19.1.0 |
| @supabase/ssr | ^0.10.2 | 0.10.2 |
| @supabase/supabase-js | ^2.104.0 | 2.104.0 |
| twilio | ^5.13.1 | 5.13.1 |
| libphonenumber-js | ^1.12.41 | 1.12.41 |
| zod | ^4.3.6 | 4.3.6 |
| axios | ^1.15.2 | 1.15.2 |
| tough-cookie | ^6.0.1 | 6.0.1 |
| axios-cookiejar-support | ^6.0.5 | 6.0.5 |

### Dev Dependencies (package.json `devDependencies`)

| Package | Version (range) |
|---------|----------------|
| typescript | ^5 |
| @types/node | ^20 |
| @types/react | ^19 |
| @types/react-dom | ^19 |
| tailwindcss | ^4 |
| @tailwindcss/postcss | ^4 |
| eslint | ^9 |
| eslint-config-next | 15.5.15 |
| @eslint/eslintrc | ^3 |

## Key File Contents

### next.config.ts (final)

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Twilio uses Node.js native modules not in Next.js built-in externals list.
  // Must be explicit here AND routes must export `const runtime = 'nodejs'`.
  serverExternalPackages: ['twilio'],
}

export default nextConfig
```

### app/globals.css — @theme block (inserted after @import)

```css
@import "tailwindcss";

@theme {
  --color-maroon: #5D1725;
}

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
```

Note: The scaffold generated an `@theme inline` block for background/foreground colors and an `@import "tailwindcss"` with double quotes. The plan specified single quotes but both are valid CSS. The `--color-maroon: #5D1725` was inserted in a separate `@theme` block immediately after the import line.

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| TypeScript compile | `npx tsc --noEmit` | Exit 0, no errors |
| ESLint | `npm run lint` | Exit 0, no errors |
| Dev server | `npm run dev` | Ready in 1315ms (Turbopack) |
| twilio version | package.json check | ^5.13.1 (v5 confirmed) |
| All 8 deps present | package.json check | All present |
| next.config.ts | grep serverExternalPackages | Found: ['twilio'] |
| globals.css | grep --color-maroon | Found: #5D1725 |
| No tailwind.config.ts | file check | Confirmed absent (Tailwind v4) |

## npm run dev Output

```
▲ Next.js 15.5.15 (Turbopack)
- Local:        http://localhost:3000
- Network:      http://130.18.182.53:3000

✓ Starting...
✓ Ready in 1315ms
```

## Deviations from Plan

### Deviation 1: Scaffold via temp directory (Rule 3 — Blocking Issue)

- **Found during:** Task 1
- **Issue:** `npx create-next-app@15 . --typescript ...` failed with: "Could not create a project called 'MSU Course' because of npm naming restrictions: name can only contain URL-friendly characters / name can no longer contain capital letters". The directory name "MSU Course" has spaces and capitals which are invalid npm package names. create-next-app v15 derives the package name from the directory name; there is no `--name` override flag.
- **Fix:** Scaffolded to `_scaffold_tmp/coursesiq/` (valid npm name), then moved all generated files to `G:/MSU Course/` root. The `package.json` name field is `coursesiq` which is a valid npm-compatible name for a project in a space-containing directory.
- **Files modified:** All scaffold files (moved from temp dir)
- **Commit:** 8ad5a5d

### Deviation 2: @theme inline block already present in scaffold

- **Found during:** Task 3
- **Issue:** The create-next-app scaffold generated an `@theme inline` block in globals.css (for background/foreground CSS custom properties). The plan anticipated a simpler globals.css with just `@import 'tailwindcss'`.
- **Fix:** Added the `@theme { --color-maroon: #5D1725; }` block between the `@import` line and the existing `:root` block. The existing `@theme inline` block was preserved. Both `@theme` and `@theme inline` are valid Tailwind v4 directives that coexist correctly.
- **Impact:** None — both theme blocks are valid; `bg-maroon` utility class is registered; no build errors.
- **Commit:** 8ad5a5d

### Deviation 3: Double quotes in @import (cosmetic)

- **Found during:** Task 3
- **Issue:** Scaffold generated `@import "tailwindcss"` (double quotes). Plan showed `@import 'tailwindcss'` (single quotes).
- **Fix:** None required — both are valid CSS. Single vs double quotes in CSS @import are equivalent. The existing double-quote style was preserved to avoid unnecessary diff.
- **Impact:** None — functionally identical.

## Threat Model — T-01-01 Mitigation Verified

Threat T-01-01 (Tampering: twilio version) is mitigated. `package.json` shows `"twilio": "^5.13.1"` which pins to the v5 range. The installed version is 5.13.1 (not v6.0.0 which was released 2026-04-16 with breaking Node.js version changes).

## Known Stubs

None — this plan only establishes project infrastructure. No business logic stubs created in this plan (those are in plan 01-2).

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced in this plan.

## Self-Check: PASSED

- [x] `G:/MSU Course/package.json` exists and contains all 8 Phase 1 deps
- [x] `G:/MSU Course/next.config.ts` exists and contains `serverExternalPackages: ['twilio']`
- [x] `G:/MSU Course/app/globals.css` exists and contains `--color-maroon: #5D1725`
- [x] `G:/MSU Course/postcss.config.mjs` exists
- [x] `G:/MSU Course/tsconfig.json` exists
- [x] No `G:/MSU Course/tailwind.config.ts` exists
- [x] Commit 8ad5a5d exists in git log
- [x] `npx tsc --noEmit` exits 0
- [x] `npm run lint` exits 0
- [x] `npm run dev` produced "Ready" message
