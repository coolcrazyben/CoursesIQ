---
phase: 1
plan: 1
type: scaffold
wave: 1
depends_on: []
files_modified:
  - package.json
  - next.config.ts
  - app/globals.css
  - postcss.config.mjs
  - tsconfig.json
  - app/layout.tsx
  - app/page.tsx
autonomous: true
requirements:
  - INFRA-01

must_haves:
  truths:
    - "npm run dev starts without errors and the default Next.js page loads at localhost:3000"
    - "npx tsc --noEmit exits 0 — no TypeScript compilation errors"
    - "npm run lint exits 0 — no ESLint errors"
    - "next.config.ts contains serverExternalPackages: ['twilio']"
    - "app/globals.css contains @theme { --color-maroon: #5D1725; } — bg-maroon utility class is registered"
    - "package.json lists all Phase 1 runtime dependencies at correct versions"
  artifacts:
    - path: "package.json"
      provides: "Project manifest with all Phase 1 dependencies"
      contains: "@supabase/ssr"
    - path: "next.config.ts"
      provides: "Next.js configuration with Twilio external packages"
      contains: "serverExternalPackages"
    - path: "app/globals.css"
      provides: "Tailwind v4 CSS with MSU maroon color token"
      contains: "--color-maroon: #5D1725"
    - path: "postcss.config.mjs"
      provides: "PostCSS config for Tailwind v4"
      contains: "@tailwindcss/postcss"
  key_links:
    - from: "app/globals.css"
      to: "Tailwind v4 engine"
      via: "@import 'tailwindcss' + @theme"
      pattern: "@theme.*--color-maroon"
    - from: "next.config.ts"
      to: "Twilio Node.js modules"
      via: "serverExternalPackages"
      pattern: "serverExternalPackages.*twilio"
---

<objective>
Scaffold the CoursesIQ Next.js 15 project in G:/MSU Course with TypeScript, Tailwind v4, ESLint, and App Router. Install all Phase 1 dependencies in a single pass. Apply the MSU maroon color token and configure next.config.ts for Twilio compatibility. Verify the project boots and TypeScript compiles clean.

Purpose: Establishes the entire project structure that all subsequent phases build upon. Getting the scaffold right — correct flags, correct dependency versions, correct Tailwind v4 patterns — prevents rework in every later phase.

Output: A booting Next.js 15 project at G:/MSU Course with all dependencies installed, maroon color token defined, and Twilio externals configured.
</objective>

<execution_context>
@G:/MSU Course/.planning/phases/01-project-scaffold-database/RESEARCH.md
</execution_context>

<context>
@G:/MSU Course/.planning/ROADMAP.md
@G:/MSU Course/.planning/REQUIREMENTS.md
@G:/MSU Course/.planning/phases/01-project-scaffold-database/01-CONTEXT.md

## Key version constraints from research (2026-04-22):
- Next.js: pin to v15 via `create-next-app@15`
- Tailwind: v4 is scaffolded by default — NO tailwind.config.ts generated
- twilio: pin `twilio@^5` — v6.0.0 released 2026-04-16, no migration guide yet
- All other deps: install at latest (verified stable as of 2026-04-22)

## Decision traceability:
- D-01: Run create-next-app in G:/MSU Course (no subfolder)
- D-02: Flags: TypeScript, Tailwind, App Router, ESLint, no src/ directory, @/* import alias
</context>

<tasks>

<task type="auto">
  <name>Task 1: Scaffold Next.js 15 project</name>
  <files>package.json, next.config.ts, tsconfig.json, app/layout.tsx, app/page.tsx, app/globals.css, postcss.config.mjs, .eslintrc.json (or eslint.config.mjs), .gitignore</files>
  <action>
Run the following command from G:/MSU Course (per D-01, D-02):

```bash
npx create-next-app@15 . --typescript --tailwind --eslint --app --import-alias "@/*" --use-npm
```

Flags breakdown:
- `.` — installs into current directory, no subfolder (D-01)
- `--typescript` — TypeScript support (D-02)
- `--tailwind` — Tailwind CSS v4 (D-02); scaffolds @import 'tailwindcss' in globals.css, postcss.config.mjs with @tailwindcss/postcss, NO tailwind.config.ts
- `--eslint` — ESLint config (D-02)
- `--app` — App Router, not Pages Router (D-02)
- `--import-alias "@/*"` — default import alias (D-02)
- `--use-npm` — use npm, not yarn/pnpm
- No `--src-dir` flag — files go directly in root (app/, lib/, etc.)

If create-next-app prompts interactively (some versions ignore CLI flags in certain environments), answer:
- Would you like to use TypeScript? Yes
- Would you like to use ESLint? Yes
- Would you like to use Tailwind CSS? Yes
- Would you like your code inside a `src/` directory? No
- Would you like to use App Router? Yes
- Would you like to use Turbopack for `next dev`? Yes
- Would you like to customize the import alias? No (accept @/* default)
- Would you like to use AGENTS.md? No

IMPORTANT: create-next-app with --tailwind scaffolds Tailwind v4. The generated globals.css will contain `@import 'tailwindcss'` (not @tailwind directives). There is NO tailwind.config.ts file. This is correct — do not create one.
  </action>
  <verify>
    <automated>cd "G:/MSU Course" && ls package.json next.config.ts app/globals.css postcss.config.mjs</automated>
  </verify>
  <done>All scaffold files exist: package.json, next.config.ts, app/globals.css, postcss.config.mjs, tsconfig.json. No tailwind.config.ts present (v4 does not use one).</done>
</task>

<task type="auto">
  <name>Task 2: Install Phase 1 dependencies</name>
  <files>package.json, package-lock.json</files>
  <action>
Run from G:/MSU Course:

```bash
npm install @supabase/ssr @supabase/supabase-js twilio@^5 libphonenumber-js zod axios tough-cookie axios-cookiejar-support
```

CRITICAL: `twilio@^5` — NOT `twilio` (which would install v6.0.0, released 2026-04-16, with breaking Node.js version changes and no migration guide). The `^5` range pins to the latest v5.x.x (5.13.1 as of research date).

After install, verify package.json dependencies section contains:
- `@supabase/ssr` (should be ~0.10.2)
- `@supabase/supabase-js` (should be ~2.104.0)
- `twilio` with version starting with `^5` or `5.`
- `libphonenumber-js`
- `zod`
- `axios`
- `tough-cookie`
- `axios-cookiejar-support`
  </action>
  <verify>
    <automated>cd "G:/MSU Course" && node -e "const p = require('./package.json'); ['@supabase/ssr','@supabase/supabase-js','twilio','libphonenumber-js','zod','axios','tough-cookie','axios-cookiejar-support'].forEach(d => { if (!p.dependencies[d]) throw new Error('Missing: ' + d); }); const tv = p.dependencies['twilio']; if (!tv.startsWith('^5') && !tv.startsWith('5.')) throw new Error('twilio must be v5: ' + tv); console.log('All dependencies present and twilio is v5');"</automated>
  </verify>
  <done>All 8 dependencies appear in package.json. twilio version string starts with "^5" or "5." (not "^6" or "6.").</done>
</task>

<task type="auto">
  <name>Task 3: Configure next.config.ts and app/globals.css</name>
  <files>next.config.ts, app/globals.css</files>
  <action>
**Part A — next.config.ts:**

Replace the contents of next.config.ts with:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Twilio uses Node.js native modules not in Next.js built-in externals list.
  // Must be explicit here AND routes must export `const runtime = 'nodejs'`.
  serverExternalPackages: ['twilio'],
}

export default nextConfig
```

Note: `serverExternalPackages` is the stable Next.js 15 name (was `serverComponentsExternalPackages` in earlier versions — do not use the old name).

**Part B — app/globals.css:**

Find the existing globals.css. It will contain `@import 'tailwindcss'` at the top (Tailwind v4 pattern). Insert the `@theme` block immediately after that import line:

```css
@import 'tailwindcss';

@theme {
  --color-maroon: #5D1725;
}
```

Keep any existing CSS that create-next-app generated below the @theme block. Do NOT remove `@import 'tailwindcss'` — it is the Tailwind v4 replacement for the old @tailwind directives.

This generates utility classes: `bg-maroon`, `text-maroon`, `border-maroon`, `ring-maroon`, etc.

Do NOT create a tailwind.config.ts file — Tailwind v4 uses CSS-first configuration exclusively.
  </action>
  <verify>
    <automated>cd "G:/MSU Course" && node -e "const fs = require('fs'); const cfg = fs.readFileSync('next.config.ts','utf8'); if (!cfg.includes('serverExternalPackages')) throw new Error('next.config.ts missing serverExternalPackages'); if (!cfg.includes('twilio')) throw new Error('next.config.ts missing twilio in serverExternalPackages'); const css = fs.readFileSync('app/globals.css','utf8'); if (!css.includes('@import')) throw new Error('globals.css missing @import tailwindcss'); if (!css.includes('--color-maroon: #5D1725')) throw new Error('globals.css missing --color-maroon token'); console.log('next.config.ts and globals.css correctly configured');"</automated>
  </verify>
  <done>
- next.config.ts exports NextConfig with serverExternalPackages: ['twilio']
- app/globals.css contains @import 'tailwindcss' followed by @theme { --color-maroon: #5D1725; }
- No tailwind.config.ts file exists in the project root
  </done>
</task>

<task type="auto">
  <name>Task 4: Verify scaffold</name>
  <files></files>
  <action>
Run verification commands from G:/MSU Course:

1. TypeScript compile check:
```bash
npx tsc --noEmit
```
Expected: exits 0, no output (or only informational messages). If there are type errors, fix them before proceeding.

2. ESLint check:
```bash
npm run lint
```
Expected: exits 0, no errors. Warnings are acceptable but errors must be resolved.

3. Development server start (run for ~10 seconds to confirm boot, then Ctrl+C):
```bash
npm run dev
```
Expected: Turbopack starts, "Ready" message appears, no runtime errors. The server does not need to stay running — just confirm it starts without crashing.

Note: Do NOT run `npm run dev` in the background if it blocks. Use a timeout approach or start and immediately verify the "Ready" output appears before terminating.
  </action>
  <verify>
    <automated>cd "G:/MSU Course" && npx tsc --noEmit && npm run lint</automated>
  </verify>
  <done>
- npx tsc --noEmit exits 0
- npm run lint exits 0
- npm run dev produces a "Ready" or "started server" message without crashing
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Developer machine → npm registry | Package downloads; resolved versions must match pinned ranges |
| Developer machine → Next.js process | Local dev server; no external trust boundary in this plan |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Tampering | package.json — twilio version | mitigate | Pin `twilio@^5` explicitly; npm install without pin resolves to v6.0.0 which has breaking changes. Verified by Task 2 automated check. |
| T-01-02 | Disclosure | .gitignore | accept | create-next-app generates .gitignore with .env.local listed; no secrets in scaffold. Acceptable at this stage. |
| T-01-03 | Tampering | next.config.ts — serverExternalPackages | accept | Config file is developer-controlled; no user input touches this. Low risk. |
</threat_model>

<verification>
After all four tasks complete, run from G:/MSU Course:

```bash
# 1. TypeScript clean
npx tsc --noEmit

# 2. Lint clean
npm run lint

# 3. Dependency check
node -e "const p = require('./package.json'); console.log('twilio:', p.dependencies.twilio, '| @supabase/ssr:', p.dependencies['@supabase/ssr']);"

# 4. Config checks
node -e "const fs = require('fs'); console.log('next.config has twilio:', fs.readFileSync('next.config.ts','utf8').includes('twilio')); console.log('globals.css has maroon:', fs.readFileSync('app/globals.css','utf8').includes('#5D1725'));"
```

All commands must exit 0. The twilio version in package.json must begin with "5." or "^5.".
</verification>

<success_criteria>
1. `npm run dev` starts without errors and the default Next.js landing page loads at localhost:3000 — Turbopack bundler active
2. `npx tsc --noEmit` exits 0 — no TypeScript compilation errors in the scaffold
3. `npm run lint` exits 0 — no ESLint errors
4. `next.config.ts` exports `serverExternalPackages: ['twilio']` — verified by grep
5. `app/globals.css` contains `@theme { --color-maroon: #5D1725; }` after `@import 'tailwindcss'` — bg-maroon utility class is registered
6. `package.json` lists twilio at `^5.x.x` (NOT `^6.x.x`) and all 8 Phase 1 dependencies are present
7. No `tailwind.config.ts` file exists in the project root — Tailwind v4 CSS-first configuration is used
</success_criteria>

<output>
After completion, create `.planning/phases/01-project-scaffold-database/01-1-SUMMARY.md` documenting:
- Exact versions of all installed dependencies (from package.json)
- Any deviations from the plan (e.g., if create-next-app was interactive or generated unexpected files)
- The exact contents of next.config.ts and the @theme block in globals.css as they now stand
- Confirmation that npm run dev started successfully
</output>
