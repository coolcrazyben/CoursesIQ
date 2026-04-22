# Twilio SMS Integration Research

**Project:** CoursesIQ — one-time SMS alerts when a college course seat opens
**Researched:** 2026-04-22
**Overall confidence:** HIGH (verified via official Twilio docs, GitHub, npm, and Context7)

---

## 1. Recommended npm Package

**Package:** `twilio`
**Current version:** 5.x (stable, use in production) — v6.0.0 released 2026-04-16 (major bump, treat as pre-adoption until migration guide is confirmed)

The package name is simply `twilio`, not `@twilio/sdk`. The `@twilio/voice-sdk` and similar scoped packages are for browser-side voice/video only — do not use them for server-side SMS.

```bash
npm install twilio
```

**TypeScript:** Types are bundled with the package (`index.d.ts`) — no `@types/twilio` needed.

**Import pattern:**

```typescript
// ESM / TypeScript (Next.js default)
import Twilio from 'twilio';

// CommonJS fallback
const Twilio = require('twilio');
```

**Sources:**
- [twilio-node GitHub (CHANGES.md)](https://github.com/twilio/twilio-node/blob/main/CHANGES.md) — v6.0.0 released 2026-04-16
- [twilio on npm](https://www.npmjs.com/package/twilio)

---

## 2. Sending SMS from a Next.js 15 API Route

Next.js 15 uses the App Router by default. The Twilio client must run **server-side only** — never import `twilio` in a Client Component or any file that can reach the browser bundle.

### Environment Variables (.env.local)

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567
```

### Singleton client pattern

Create a shared client module to avoid re-instantiating on every request:

```typescript
// lib/twilio.ts
import Twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken  = process.env.TWILIO_AUTH_TOKEN!;

if (!accountSid || !authToken) {
  throw new Error('Twilio credentials are not set in environment variables');
}

export const twilioClient = Twilio(accountSid, authToken);
```

### Core send function

```typescript
// lib/sms.ts
import { twilioClient } from './twilio';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

export type SmsResult =
  | { ok: true; sid: string }
  | { ok: false; error: string; code?: number; permanent: boolean };

/**
 * Normalizes a US phone number to E.164 and sends an SMS via Twilio.
 * Returns a typed result — never throws.
 */
export async function sendSms(
  rawTo: string,
  body: string,
): Promise<SmsResult> {
  // --- 1. Normalize to E.164 ---
  const e164 = toE164US(rawTo);
  if (!e164) {
    return { ok: false, error: 'Invalid phone number format', permanent: true };
  }

  // --- 2. Send ---
  try {
    const message = await twilioClient.messages.create({
      body,
      to: e164,
      from: process.env.TWILIO_PHONE_NUMBER!,
      // Optional: track delivery status via webhook
      // statusCallback: 'https://yourapp.com/api/sms/status',
    });
    return { ok: true, sid: message.sid };
  } catch (err: unknown) {
    return handleTwilioError(err);
  }
}

/** Coerce a raw US phone string to E.164 (+1XXXXXXXXXX). Returns null if unparseable. */
export function toE164US(raw: string): string | null {
  try {
    // Strip non-digit/non-plus characters before parsing
    const cleaned = raw.replace(/[^\d+]/g, '');
    // Try parsing with US as default country
    if (isValidPhoneNumber(cleaned, 'US')) {
      return parsePhoneNumber(cleaned, 'US').number; // e.g. "+12025551234"
    }
    return null;
  } catch {
    return null;
  }
}

function handleTwilioError(err: unknown): SmsResult {
  // Twilio SDK throws objects with .code and .message
  const twilioErr = err as { code?: number; message?: string; status?: number };
  const code    = twilioErr.code;
  const message = twilioErr.message ?? 'Unknown Twilio error';

  // Permanent failures — stop retrying, optionally mark number as bad
  const PERMANENT_CODES = new Set([
    21211, // Invalid 'To' phone number (malformed)
    21610, // Recipient has opted out (sent STOP)
    21614, // Not a valid mobile number (landline)
    21608, // Trial account: number not verified
  ]);

  const permanent = code !== undefined && PERMANENT_CODES.has(code);
  return { ok: false, error: message, code, permanent };
}
```

### Next.js 15 App Router route handler

```typescript
// app/api/sms/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendSms } from '@/lib/sms';

export const runtime = 'nodejs'; // Required: Twilio SDK needs Node.js runtime, not Edge

export async function POST(req: NextRequest) {
  const { phone, message } = await req.json();

  if (!phone || !message) {
    return NextResponse.json({ error: 'phone and message are required' }, { status: 400 });
  }

  const result = await sendSms(phone, message);

  if (!result.ok) {
    const status = result.permanent ? 422 : 502;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  return NextResponse.json({ sid: result.sid });
}
```

**CRITICAL:** Add `export const runtime = 'nodejs'` to any route that imports `twilio`. The Twilio SDK does not work in the Edge Runtime (no Node.js builtins like `crypto`). Without this directive, Next.js may attempt to run the route on the Edge and it will fail silently or throw at bundle time.

---

## 3. Phone Number Validation — E.164 Format

Twilio requires E.164 format: `+[country code][number]`, e.g. `+12025551234`.

**Recommended library:** `libphonenumber-js`

```bash
npm install libphonenumber-js
```

- Smaller than Google's `google-libphonenumber` (~145 kB vs ~550 kB)
- Tree-shakeable; use the `min` build for just parsing: `import { parsePhoneNumber } from 'libphonenumber-js/min'`
- TypeScript types included
- Handles US numbers entered in any common format:

| User input | Normalized output |
|------------|------------------|
| `(202) 555-1234` | `+12025551234` |
| `202-555-1234` | `+12025551234` |
| `2025551234` | `+12025551234` |
| `+12025551234` | `+12025551234` (passthrough) |
| `+44 20 7946 0958` | `+442079460958` (international) |

**Validation rule:** Always validate before calling Twilio. An invalid number still costs money starting September 30, 2024 (Twilio now bills for failed messages).

```typescript
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

// US number without country code
const phone = parsePhoneNumber('(202) 555-1234', 'US');
phone.number      // '+12025551234'
phone.isValid()   // true
phone.getType()   // 'FIXED_LINE_OR_MOBILE' (use to reject landlines before sending)
```

**Reject landlines proactively:** Call `phone.getType()` and reject `'FIXED_LINE'` type numbers before attempting to send. This avoids error 21614.

---

## 4. Twilio Trial Account Limitations

| Limitation | Trial | Upgraded (Paid) |
|------------|-------|-----------------|
| Send to unverified numbers | Blocked (error 21608) | Allowed |
| Message prefix | "Sent from a Twilio trial account - " prepended | None |
| Daily message limit | ~50 messages/day | No platform limit (carrier limits apply) |
| Number verification method | SMS verification only | N/A |
| A2P 10DLC registration required | No (trial bypasses registration) | Yes (for long codes) |

**Development workflow:**
1. Add team member phone numbers to Verified Caller IDs in the Twilio Console
2. Each number must be verified via SMS code before you can send to it
3. Messages arrive with the trial prefix — normal for development, disappears on upgrade

**Upgrading:** Add a credit card to remove all trial restrictions. Minimum top-up is typically $20 USD.

**Error 21608** specifically means you tried to send to an unverified number from a trial account. Add handling to detect this and surface a clear error in development:

```typescript
if (result.code === 21608) {
  console.error(
    `Trial account: add ${phone} to Verified Caller IDs at ` +
    'https://www.twilio.com/console/phone-numbers/verified'
  );
}
```

---

## 5. SMS Compliance: TCPA and A2P 10DLC

This section is **non-negotiable for production**. Ignoring it leads to carrier filtering, account suspension, and legal liability.

### TCPA (US federal law)

- Recipients must give **prior express written consent** to receive automated SMS messages
- Alerts for course availability are promotional/transactional — consent must be obtained at registration
- Required disclosures when collecting phone number:
  - Message frequency ("You'll receive one SMS when a seat opens")
  - Standard rates may apply ("Msg & data rates may apply")
  - How to opt out ("Reply STOP to unsubscribe")
  - Link to privacy policy

**Compliant opt-in copy example:**
> "Enter your phone number to receive an SMS alert when a seat becomes available. You'll receive no more than 1 message per course per alert cycle. Msg & data rates may apply. Reply STOP to unsubscribe."

### A2P 10DLC (Required for US long code SMS in production)

A2P = Application-to-Person. 10DLC = 10-digit long codes (your standard US phone number).

**You must register before sending production SMS. Unregistered traffic is filtered by carriers.**

Registration has two steps:
1. **Brand Registration** — your business identity (legal name, EIN, address, website). Takes 1-3 business days.
2. **Campaign Registration** — describes your use case ("Course seat availability alerts"), opt-in method, sample messages. Takes 2-7 business days (up to 10-15 days for review in 2025).

**Campaign type for CoursesIQ:** "Higher Education" or "Notifications/Alerts" use case.

**Costs (approximate, as of 2025):**
- Brand registration: one-time ~$4
- Campaign registration: one-time ~$15
- Monthly campaign fee: ~$10/month
- Per-message rates: standard Twilio rates (~$0.0079/SMS outbound to US)

**Alternatives to 10DLC long codes:**
- **Toll-free numbers (+1-8XX):** Simpler registration (no brand/campaign fee), faster approval, good for alert use cases. Throughput capped at 3 msg/sec. Recommended for CoursesIQ at low volume.
- **Short codes (5-6 digit):** High throughput, expensive (~$500-1000/month), overkill for course alerts.

**Recommendation for CoursesIQ:** Start with a **toll-free number** to reduce registration friction. Register for toll-free verification (separate process, simpler than 10DLC). Switch to 10DLC long code when volume or branding requires it.

### Twilio handles STOP/START automatically

When a user replies STOP, Twilio:
1. Sends an automatic "You have successfully been unsubscribed..." reply
2. Adds them to a block list for your sender number
3. Future sends to that number return error 21610

**Your responsibility:** When you receive error 21610, update your database to mark that user's phone as opted-out and stop attempting to send. Do not retry.

```typescript
// In your cron/alert runner
if (!result.ok && result.code === 21610) {
  await db.user.update({
    where: { phone: normalizedPhone },
    data: { smsOptedOut: true, smsOptedOutAt: new Date() },
  });
}
```

---

## 6. Rate Limiting — Preventing Duplicate SMS Sends

This is the most operationally critical part for CoursesIQ. If your seat-check cron runs every 5 minutes and a seat stays open for 30 minutes, you must not send 6 SMS messages.

### Strategy: Database-level "sent" flag (primary approach)

For each (user, courseSection) alert subscription, track whether an SMS has been sent for the current "seat open" event.

```typescript
// Schema concept (Prisma)
model AlertSubscription {
  id              String    @id @default(cuid())
  userId          String
  courseSectionId String
  phone           String

  smsSentAt       DateTime? // null = not yet sent
  smsSid          String?   // Twilio message SID for audit
  smsOptedOut     Boolean   @default(false)

  // Reset when course goes back to 0 seats (so user gets alerted again next time)
  alertResetAt    DateTime?
}
```

```typescript
// In your cron job / seat-checker
async function checkAndAlert(subscription: AlertSubscription, seatsAvailable: number) {
  // Skip if already sent for this seat-open event
  if (subscription.smsSentAt !== null) return;

  // Skip if opted out
  if (subscription.smsOptedOut) return;

  if (seatsAvailable > 0) {
    const result = await sendSms(
      subscription.phone,
      `A seat opened in ${subscription.courseSection.code}! Register now: https://yourapp.com/register`
    );

    if (result.ok) {
      await db.alertSubscription.update({
        where: { id: subscription.id },
        data: { smsSentAt: new Date(), smsSid: result.sid },
      });
    } else if (result.permanent) {
      // Don't retry permanent failures
      await db.alertSubscription.update({
        where: { id: subscription.id },
        data: {
          smsSentAt: new Date(), // mark sent to stop retrying
          smsOptedOut: result.code === 21610,
        },
      });
    }
    // Transient errors: leave smsSentAt null so next cron run retries
  }
}
```

### Strategy: Redis idempotency key (supplementary, for high-frequency crons)

If the cron runs very frequently (< 1 minute intervals) and you want belt-and-suspenders protection against race conditions:

```typescript
import { Redis } from '@upstash/redis'; // or ioredis for self-hosted

const redis = Redis.fromEnv();

async function acquireSendLock(subscriptionId: string): Promise<boolean> {
  // SET NX with 24-hour TTL — atomic, safe under concurrency
  const key = `sms:sent:${subscriptionId}`;
  const acquired = await redis.set(key, '1', { nx: true, ex: 86400 });
  return acquired !== null;
}
```

Use `acquireSendLock` before calling `sendSms`. If it returns `false`, another process already sent (or is sending) the SMS.

### Resetting alerts

When a course goes back to 0 seats (closed), reset `smsSentAt` so the user receives a new alert if it opens again later:

```typescript
// When seats → 0
await db.alertSubscription.updateMany({
  where: { courseSectionId: section.id, smsSentAt: { not: null } },
  data: { smsSentAt: null, smsSid: null, alertResetAt: new Date() },
});
```

---

## 7. Error Handling Reference

| Twilio Error Code | Meaning | Action | Permanent? |
|-------------------|---------|--------|-----------|
| 21211 | Invalid 'To' phone number (malformed) | Log, mark subscription invalid, stop retrying | Yes |
| 21610 | Recipient opted out (replied STOP) | Set `smsOptedOut = true` in DB | Yes |
| 21614 | Not a valid mobile number (landline) | Log, mark invalid, stop retrying | Yes |
| 21608 | Trial account: unverified number | Dev-only: add to Verified Caller IDs | Yes (dev) |
| 30003 | Unreachable destination handset | Retry up to 3x with backoff | No |
| 30005 | Unknown destination handset | Retry once, then mark permanent | Treat as permanent after 3x |
| 30008 | Unknown error (carrier) | Retry | No |
| 20003 | Authentication error (bad credentials) | Fix env vars, alert on-call | Yes |

**Key rule:** On permanent errors, always update the database to stop retrying. Twilio bills for failed messages as of September 2024.

### Complete error handler

```typescript
function handleTwilioError(err: unknown): SmsResult {
  const e = err as { code?: number; message?: string; status?: number };
  const code = e.code;

  const PERMANENT = new Set([21211, 21610, 21614, 21608, 20003]);
  const permanent = code !== undefined && PERMANENT.has(code);

  return {
    ok: false,
    error: e.message ?? 'Unknown Twilio error',
    code,
    permanent,
  };
}
```

---

## 8. Delivery Status Webhook (Optional but Recommended)

Add a `statusCallback` URL to track delivery receipts asynchronously:

```typescript
// In sendSms()
const message = await twilioClient.messages.create({
  body,
  to: e164,
  from: process.env.TWILIO_PHONE_NUMBER!,
  statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/status`,
});
```

```typescript
// app/api/sms/status/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Twilio POSTs application/x-www-form-urlencoded, NOT JSON
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const messageSid    = form.get('MessageSid') as string;
  const messageStatus = form.get('MessageStatus') as string; // sent | delivered | failed | undelivered

  if (messageStatus === 'failed' || messageStatus === 'undelivered') {
    const errorCode = form.get('ErrorCode') as string;
    // Log or update DB
    console.error(`SMS ${messageSid} failed with code ${errorCode}`);
  }

  // Twilio requires an empty 200 response (no TwiML needed for status callbacks)
  return new NextResponse(null, { status: 200 });
}
```

**Validate webhook signatures in production** using Twilio's `validateRequest` utility to prevent spoofed requests:

```typescript
import { validateRequest } from 'twilio';

const signature  = req.headers.get('X-Twilio-Signature') ?? '';
const url        = `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/status`;
const isValid    = validateRequest(
  process.env.TWILIO_AUTH_TOKEN!,
  signature,
  url,
  Object.fromEntries(form.entries()),
);

if (!isValid) return new NextResponse('Forbidden', { status: 403 });
```

---

## 9. Security Checklist

- [ ] Twilio credentials only in `.env.local` (never committed)
- [ ] Add `.env.local` to `.gitignore`
- [ ] `twilio` package only imported in server files (`lib/`, `app/api/`, never `app/` client components)
- [ ] `export const runtime = 'nodejs'` on every route importing Twilio
- [ ] Phone numbers stored hashed or encrypted at rest if PII regulations apply
- [ ] Webhook signature validation before processing status callbacks
- [ ] Rate-limit your own `/api/sms` endpoint to prevent abuse (e.g., 1 request/phone/hour)

---

## 10. Full Dependency List

```bash
# Production
npm install twilio libphonenumber-js

# Optional: Redis-backed idempotency (Upstash for serverless)
npm install @upstash/redis @upstash/ratelimit
```

| Package | Version (as of research) | Purpose |
|---------|--------------------------|---------|
| `twilio` | 5.x (stable) | SMS sending, webhook validation |
| `libphonenumber-js` | 1.x | E.164 phone normalization |
| `@upstash/redis` | 1.x | Serverless Redis for idempotency keys |
| `@upstash/ratelimit` | 2.x | Rate limiting API routes |

---

## Compliance Warning Summary

**Do not launch production SMS without:**
1. Explicit opt-in consent collected at time of phone number entry (with required disclosures)
2. A2P 10DLC registration OR toll-free number verification submitted to Twilio
3. STOP/opt-out handling reflected in your database
4. A mechanism to stop sending once the user's alert has been fulfilled (smsSentAt flag)

Failure to register for A2P 10DLC results in carrier filtering — messages are silently dropped. Failure to honor opt-outs is a TCPA violation with statutory damages of $500-$1,500 per message.

---

## Sources

- [twilio npm package](https://www.npmjs.com/package/twilio)
- [twilio-node GitHub repository](https://github.com/twilio/twilio-node)
- [twilio-node CHANGES.md](https://github.com/twilio/twilio-node/blob/main/CHANGES.md)
- [Twilio SMS Quickstart (official docs)](https://www.twilio.com/docs/messaging/quickstart)
- [Twilio Error Code 21211 — Invalid To Number](https://www.twilio.com/docs/api/errors/21211)
- [Twilio Error Code 21610 — Opted-out Recipient](https://www.twilio.com/docs/api/errors/21610)
- [Twilio Error Code 21614 — Not a Valid Mobile Number](https://www.twilio.com/docs/api/errors/21614)
- [Twilio Free Trial Limitations](https://help.twilio.com/articles/360036052753-Twilio-Free-Trial-Limitations)
- [A2P 10DLC Compliance Overview](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc)
- [A2P 10DLC Campaign Onboarding Guide](https://help.twilio.com/articles/11847054539547-A2P-10DLC-Campaign-Approval-Requirements)
- [Twilio SMS STOP Filtering / Opt-out Keywords](https://help.twilio.com/articles/223134027-Twilio-support-for-opt-out-keywords-SMS-STOP-filtering-)
- [Twilio Opt-in/Opt-out Best Practices Blog](https://www.twilio.com/en-us/blog/insights/compliance/opt-in-opt-out-text-messages)
- [libphonenumber-js npm](https://www.npmjs.com/package/libphonenumber-js)
- [libphonenumber-js GitHub](https://github.com/catamphetamine/libphonenumber-js)
- [Track Outbound Message Status — Twilio Docs](https://www.twilio.com/docs/messaging/guides/track-outbound-message-status)
- [Twilio Billing for Failed Messages (Sep 2024)](https://www.twilio.com/en-us/changelog/twilio-will-bill-for-failed-messages-starting-september-30--2024)
- [Upstash Rate Limiting for Next.js](https://upstash.com/blog/nextjs-ratelimiting)
- [Redis Data Deduplication Pattern](https://redis.io/tutorials/data-deduplication-with-redis/)
