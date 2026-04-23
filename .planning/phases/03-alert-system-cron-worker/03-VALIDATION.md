---
phase: 03
slug: alert-system-cron-worker
date: 2026-04-23
---

# Phase 3 Validation Strategy

## Approach

No automated test framework is installed in this project (established pattern from Phases 1 and 2). Validation uses structural checks + TypeScript compilation + manual API smoke tests.

## Automated Checks (per plan verify blocks)

| Check | Command | Plans |
|-------|---------|-------|
| TypeScript compile | `npx tsc --noEmit` | 03-01, 03-02, 03-03 |
| Lint | `npm run lint` | 03-01, 03-02, 03-03 |
| Structural (node -e) | See each plan's `<verify><automated>` block | 03-01, 03-02, 03-03 |
| vercel.json JSON validity | `node -e "JSON.parse(...)"` | 03-03 |

## Manual Smoke Tests

| Req | Test | Expected |
|-----|------|----------|
| ALRT-01 | `POST /api/alerts` valid body | 201 + `{id: uuid}`, row in Supabase |
| ALRT-02 | Check `phone_number` column in Supabase | E.164 format `+1XXXXXXXXXX` |
| ALRT-03 | Identical POST twice | Second returns 409 |
| ALRT-04 | `GET /api/cron/check-seats` no header | 401 |
| ALRT-04 | `GET /api/cron/check-seats` wrong secret | 401 |
| ALRT-04 | `GET /api/cron/check-seats` correct secret | 200 `{checked, alerted}` |
| ALRT-07/08/09 | Insert alert with open CRN, trigger cron | SMS received; `sms_sent_at` set, `is_active=false`, `sms_sid` populated |
| ALRT-10 | Simulate opted-out phone (Twilio test) | `sms_opted_out=true`, `sms_sent_at` null |
| ALRT-11 | `vercel.json` deployed to Vercel | Cron visible in Vercel dashboard |
| DEPL-04 | `grep "export const runtime" app/api/alerts/route.ts app/api/cron/check-seats/route.ts` | Both files contain it as first line |

## Live Integration Requirements

ALRT-07, ALRT-08, ALRT-09, ALRT-10 require live Twilio credentials. Use Twilio trial account + verified phone number for development testing. Production SMS delivery requires toll-free number verification (2–10 business day lead time — start immediately).
