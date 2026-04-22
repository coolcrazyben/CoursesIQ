# MSU Banner SSB API Research

**Project:** CoursesIQ — MSU Course Seat Availability Monitor
**Researched:** 2026-04-22
**Confidence:** HIGH — All endpoints verified by live API calls against mybanner.msstate.edu

---

## Executive Summary

MSU's Banner Student Self-Service (SSB) system is a standard Ellucian Banner 9 deployment
accessible at `https://mybanner.msstate.edu/StudentRegistrationSsb/ssb/`. The course search
endpoints are **publicly accessible without student authentication** — they only require a
lightweight server-side session established via a single POST request. All seat availability
data (seatsAvailable, enrollment, maximumEnrollment, waitCount, waitCapacity) is returned as
JSON from one endpoint. Direct CRN-only filtering is not supported; you must provide subject +
course number, or paginate and filter client-side. This is a server-side scraping problem, not
a browser automation problem.

---

## Base URL

```
https://mybanner.msstate.edu/StudentRegistrationSsb/ssb/
```

The project brief references `mystudent.msstate.edu` but live testing shows that domain is
not reachable externally. The correct production hostname is `mybanner.msstate.edu`. Both
are/were used for different Banner modules; `mybanner.msstate.edu` is the active SSB host.

---

## MSU Term Code Format

Term codes follow the pattern `YYYYTT`:

| Code   | Term             |
|--------|------------------|
| 202610 | Spring 2026      |
| 202620 | Summer 2026      |
| 202630 | Fall 2026        |
| 202530 | Fall 2025        |
| 202510 | Spring 2025      |

Digit suffixes: `10` = Spring, `20` = Summer, `30` = Fall.

Confirmed live from:
```
GET /classSearch/getTerms?searchTerm=&offset=1&max=10
```
Response included codes 202330 through 202630 (10 terms).

---

## Session Establishment (REQUIRED)

The `searchResults/searchResults` endpoint returns `{"success":true,"totalCount":0,"data":null}`
without a valid session. You must POST to `term/search` first to get a `JSESSIONID` cookie.

### Step 1 — POST to establish session

```
POST https://mybanner.msstate.edu/StudentRegistrationSsb/ssb/term/search?mode=search
Content-Type: application/x-www-form-urlencoded
X-Requested-With: XMLHttpRequest

term=202630&studyPath=&studyPathText=&startDatepicker=&endDatepicker=
```

**Response:**
```json
{
  "fwdURL": "/StudentRegistrationSsb/ssb/classSearch/classSearch"
}
```

The server sets `JSESSIONID` in a `Set-Cookie` header. Reuse this cookie for all
subsequent requests. The session does not require a student login — this is the public
course search mode.

### Step 2 (Optional) — Reset form state

If reusing a session across multiple queries, POST to reset server-side filter state:

```
POST https://mybanner.msstate.edu/StudentRegistrationSsb/ssb/classSearch/resetDataForm
X-Requested-With: XMLHttpRequest
```

Response: `true`

This prevents a previous subject filter from polluting subsequent queries.

---

## Endpoint Reference (Verified on mybanner.msstate.edu)

### GET /classSearch/getTerms

Lists available academic terms. **No session required.**

```
GET /StudentRegistrationSsb/ssb/classSearch/getTerms?searchTerm=&offset=1&max=20
```

**Response (JSON array):**
```json
[
  { "code": "202630", "description": "Fall Semester 2026" },
  { "code": "202620", "description": "Summer Semester 2026" },
  { "code": "202610", "description": "Spring Semester 2026 (View Only)" }
]
```

### GET /classSearch/get_subject

Lists subjects for a term. **Session recommended.**

```
GET /StudentRegistrationSsb/ssb/classSearch/get_subject?term=202630&offset=0&max=100&searchTerm=
```

**Response (JSON array):**
```json
[
  { "code": "CSE", "description": "Computer Science & Engineering" },
  { "code": "ACC", "description": "Accounting" }
]
```

### GET /searchResults/searchResults

**Primary endpoint for seat availability.** Returns full course section data including
live seat counts. Requires session cookie from `term/search` POST.

```
GET /StudentRegistrationSsb/ssb/searchResults/searchResults
  ?txt_term=202630
  &txt_subject=CSE
  &txt_courseNumber=1011
  &pageOffset=0
  &pageMaxSize=500
X-Requested-With: XMLHttpRequest
Cookie: JSESSIONID=...
```

**Parameters:**

| Parameter           | Type   | Description                                      |
|---------------------|--------|--------------------------------------------------|
| `txt_term`          | string | Term code (e.g., `202630`)                       |
| `txt_subject`       | string | Subject code (e.g., `CSE`, `ACC`) — optional     |
| `txt_courseNumber`  | string | Course number (e.g., `1011`) — optional          |
| `pageOffset`        | int    | Pagination offset, starts at 0                   |
| `pageMaxSize`       | int    | Results per page, max 500                        |
| `sortColumn`        | string | Optional sort field                              |
| `sortDirection`     | string | `asc` or `desc`                                  |

**Important:** `txt_courseReferenceNumber` does NOT filter results by CRN in this
implementation (tested — returns all results regardless). To target a specific CRN,
query by `txt_subject` + `txt_courseNumber` and filter client-side.

**Verified JSON response structure:**
```json
{
  "success": true,
  "totalCount": 1,
  "data": [
    {
      "id": 634383,
      "term": "202630",
      "termDesc": "Fall Semester 2026",
      "courseReferenceNumber": "31352",
      "partOfTerm": "1",
      "courseNumber": "1011",
      "subject": "CSE",
      "subjectDescription": "Computer Science & Engineering",
      "sequenceNumber": "01",
      "campusDescription": "Starkville",
      "scheduleTypeDescription": "Lecture",
      "courseTitle": "Introduction to CSE",
      "creditHours": 1,
      "maximumEnrollment": 245,
      "enrollment": 12,
      "seatsAvailable": 233,
      "waitCapacity": 99,
      "waitCount": 0,
      "waitAvailable": 99,
      "crossList": null,
      "crossListCapacity": null,
      "crossListCount": null,
      "crossListAvailable": null,
      "openSection": true,
      "isSectionLinked": false,
      "subjectCourse": "CSE1011",
      "instructionalMethod": "F",
      "instructionalMethodDescription": "Face to face",
      "faculty": [
        {
          "bannerId": "243819",
          "displayName": "George Trawick",
          "emailAddress": "gjt25@msstate.edu",
          "primaryIndicator": true,
          "term": "202630",
          "courseReferenceNumber": "31352"
        }
      ],
      "meetingsFaculty": [
        {
          "meetingTime": {
            "beginTime": "1530",
            "endTime": "1620",
            "building": "OLMAIN",
            "room": "1030",
            "monday": true,
            "tuesday": false,
            "wednesday": false,
            "thursday": false,
            "friday": false,
            "saturday": false,
            "sunday": false,
            "startDate": "08/19/2026",
            "endDate": "12/10/2026",
            "term": "202630"
          }
        }
      ],
      "sectionAttributes": [],
      "reservedSeatSummary": null
    }
  ],
  "pageOffset": 0,
  "pageMaxSize": 500,
  "sectionsFetchedCount": 1,
  "pathMode": null,
  "searchResultsConfigs": [ ... ]
}
```

**Key seat availability fields:**

| Field                | Type    | Description                                 |
|----------------------|---------|---------------------------------------------|
| `courseReferenceNumber` | string | CRN (e.g., `"31352"`)                    |
| `seatsAvailable`     | int     | Seats open right now (main signal to watch) |
| `enrollment`         | int     | Current enrolled student count              |
| `maximumEnrollment`  | int     | Section capacity                            |
| `waitCount`          | int     | Students on waitlist                        |
| `waitCapacity`       | int     | Waitlist capacity                           |
| `waitAvailable`      | int     | Open waitlist spots                         |
| `openSection`        | bool    | `true` if seatsAvailable > 0               |

### POST /searchResults/getEnrollmentInfo

Returns HTML fragment with enrollment actual + maximum. **Does NOT return seatsAvailable.**
Useful only as a lightweight ping; prefer `searchResults/searchResults` for full data.

```
POST /StudentRegistrationSsb/ssb/searchResults/getEnrollmentInfo
Content-Type: application/x-www-form-urlencoded
X-Requested-With: XMLHttpRequest

term=202630&courseReferenceNumber=31352
```

**Response (HTML):**
```html
<section aria-labelledby="enrollmentInfo">
    <span class="status-bold">Enrollment Actual:</span> <span dir="ltr">12</span><br/>
    <span class="status-bold">Enrollment Maximum:</span> <span dir="ltr">245</span><br/>
</section>
```

### GET /searchResults/getFacultyMeetingTimes

Returns meeting times and faculty for a CRN. **No session required** (tested without cookie).

```
GET /StudentRegistrationSsb/ssb/searchResults/getFacultyMeetingTimes
  ?term=202630
  &courseReferenceNumber=31352
```

**Response:** JSON with `fmt` array containing faculty + meetingTime objects.

### Other /searchResults/* Endpoints (HTML responses)

These all require POST with `term` + `courseReferenceNumber`. They return HTML fragments,
not JSON. Not useful for seat monitoring.

| Endpoint                              | Returns                         |
|---------------------------------------|---------------------------------|
| `/searchResults/getClassDetails`      | Class details HTML              |
| `/searchResults/getCourseDescription` | Course description HTML         |
| `/searchResults/getRestrictions`      | Prerequisites/restrictions HTML |
| `/searchResults/getSectionAttributes` | Section attributes HTML         |
| `/searchResults/getSectionPrerequisites` | Prerequisites JSON           |
| `/searchResults/getXlstSections`      | Cross-listed sections HTML      |

---

## Recommended Polling Flow for CoursesIQ

### For a Known CRN (seatsAvailable check)

If the user registers a CRN for monitoring, you need subject + course number alongside it
(collect from user at registration time, or do a one-time lookup and store them).

```
Step 1: POST /term/search?mode=search  — body: term=202630
        Store JSESSIONID cookie

Step 2: GET /searchResults/searchResults
        ?txt_term=202630
        &txt_subject=CSE
        &txt_courseNumber=1011
        &pageOffset=0
        &pageMaxSize=20
        + Cookie: JSESSIONID=...

Step 3: Filter data[] array by courseReferenceNumber === targetCRN
Step 4: Extract seatsAvailable (or openSection === true)
Step 5: If seatsAvailable > 0 and was 0 last check → trigger SMS alert
```

### Alternative: Pure CRN Lookup (no subject required)

Paginate through all term results with `pageMaxSize=500`. Fall 2026 has ~5969 sections.
That is 12 pages of 500. At one request/second, a full scan takes ~12 seconds.
For a polling service this is fine if scan frequency is every 5 minutes.

```
GET /searchResults/searchResults?txt_term=202630&pageOffset=0&pageMaxSize=500
GET /searchResults/searchResults?txt_term=202630&pageOffset=500&pageMaxSize=500
... (repeat until sectionsFetchedCount < pageMaxSize)
```

Filter each page client-side for tracked CRNs. This approach works for all CRNs without
needing subject/course number stored separately.

### Session Lifetime

MSU's Banner SSB sets JSESSIONID with `HttpOnly` and no explicit `Max-Age`, meaning it is a
session cookie that expires when the TCP connection closes or the server-side session times out
(typically 30 minutes for Banner). The polling worker must re-establish the session if it gets
a `totalCount: 0` response when results are expected. Maintain a persistent cookie jar.

---

## CORS and Anti-Scraping Findings

### CORS Policy

Banner SSB is a **server-rendered Java application (Spring/Grails)**. CORS only matters
for browser-to-server requests. A Next.js API route or background Node.js worker calling
these endpoints from a server is **not subject to CORS**. No browser extension or
client-side fetch is needed.

HTTP headers observed:
```
Vary: Origin
Vary: Access-Control-Request-Method
Vary: Access-Control-Request-Headers
x-content-type-options: nosniff
X-XSS-Protection: 1; mode=block
```

No `Access-Control-Allow-Origin: *` header is sent — confirming CORS would block
browser-originated cross-origin requests. **Server-side fetch is the correct approach.**

### Rate Limiting

5 rapid requests in succession all returned HTTP 200. No rate limiting was observed in
testing. MSU's Banner does not appear to implement aggressive IP-based rate limiting on
the public course search endpoints. This is consistent with community reports — Banner
institutions generally do not rate-limit their public-facing course search.

**Recommended polling interval:** 2-5 minutes per CRN. This is conservative and avoids
any risk of triggering institutional network protections.

### Anti-Bot Measures

No evidence of:
- CAPTCHA or bot detection
- WAF challenges (Cloudflare, Akamai, etc.)
- User-Agent enforcement
- Request fingerprinting

The server returns a standard `JSESSIONID` session cookie with no additional challenge tokens.
The `synchronizerToken` in the classSearch HTML page is only needed for POST form submissions
(registration actions), not for the read-only course search API endpoints.

### Authentication

Course search is **public**. Only registration (adding/dropping courses) requires MSU
student authentication (NetID + NetPassword via SSO). The polling service does not need
student credentials.

---

## Implementation Approach: Fetch vs Playwright

### Recommendation: Server-side fetch (axios or native fetch)

Use Node.js `fetch` or `axios` with a cookie jar. This is simpler, faster, and more
reliable than browser automation for this use case.

**Why NOT Playwright/Puppeteer:**
- No JavaScript rendering is needed — all seat data is available as pure JSON
- Browser automation adds 2-5 seconds of overhead per poll cycle
- Headless browsers consume significantly more memory (important for a Next.js server)
- The endpoints work with plain HTTP requests

**Why fetch/axios IS sufficient:**
- All seat data endpoints return JSON
- Session is established with one POST
- No JavaScript execution required to get data
- Works from any Next.js API route or background job

### Minimal Working Node.js Implementation

```typescript
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

const jar = new CookieJar();
const client = wrapper(axios.create({ jar }));

const BASE = 'https://mybanner.msstate.edu/StudentRegistrationSsb/ssb';

async function establishSession(termCode: string): Promise<void> {
  await client.post(
    `${BASE}/term/search?mode=search`,
    `term=${termCode}&studyPath=&studyPathText=&startDatepicker=&endDatepicker=`,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
      },
    }
  );
}

interface SeatData {
  courseReferenceNumber: string;
  seatsAvailable: number;
  enrollment: number;
  maximumEnrollment: number;
  waitCount: number;
  waitAvailable: number;
  openSection: boolean;
}

async function getSeatsByCRN(
  termCode: string,
  subject: string,
  courseNumber: string,
  crn: string
): Promise<SeatData | null> {
  const resp = await client.get(`${BASE}/searchResults/searchResults`, {
    params: {
      txt_term: termCode,
      txt_subject: subject,
      txt_courseNumber: courseNumber,
      pageOffset: 0,
      pageMaxSize: 500,
    },
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });

  const data = resp.data?.data ?? [];
  return data.find((s: SeatData) => s.courseReferenceNumber === crn) ?? null;
}

// Usage
await establishSession('202630');
const seat = await getSeatsByCRN('202630', 'CSE', '1011', '31352');
// seat.seatsAvailable, seat.openSection
```

**Dependencies:** `axios`, `axios-cookiejar-support`, `tough-cookie`

### Alternative: Stateless Approach (No Cookie Jar)

If you need a truly stateless approach (e.g., serverless functions), you can establish a
fresh session on every poll:

```typescript
async function pollCRN(termCode: string, subject: string, courseNumber: string, crn: string) {
  // 1. Establish session (get JSESSIONID)
  const sessionResp = await fetch(
    `${BASE}/term/search?mode=search`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: `term=${termCode}`,
    }
  );
  const jsessionid = sessionResp.headers
    .get('set-cookie')
    ?.match(/JSESSIONID=([^;]+)/)?.[1];

  // 2. Fetch seat data
  const url = new URL(`${BASE}/searchResults/searchResults`);
  url.searchParams.set('txt_term', termCode);
  url.searchParams.set('txt_subject', subject);
  url.searchParams.set('txt_courseNumber', courseNumber);
  url.searchParams.set('pageOffset', '0');
  url.searchParams.set('pageMaxSize', '500');

  const dataResp = await fetch(url.toString(), {
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'Cookie': `JSESSIONID=${jsessionid}`,
    },
  });

  const json = await dataResp.json();
  return json.data?.find((s: any) => s.courseReferenceNumber === crn) ?? null;
}
```

---

## Legacy Banner SSB (bwckschd) Endpoints

MSU also runs a legacy Banner 8 SSB interface. This HTML endpoint shows seat data in
a parseable table format — useful as a fallback if the SSB9 JSON API becomes unavailable.

```
GET https://mybanner.msstate.edu/prod/bwckschd.p_disp_detail_sched
  ?term_in=202630
  &crn_in=31352
```

**Response:** HTML page containing a table with:
```
Capacity | Actual | Remaining
   245   |   12   |   233
```

Parse with `cheerio`. This endpoint requires no session. However, it is slower to parse
and may be deprecated eventually. Use the SSB9 JSON API as the primary approach.

---

## Data to Store Per Monitored CRN

To support polling, store the following in your database:

| Field           | Type    | Source                          | Purpose                          |
|-----------------|---------|---------------------------------|----------------------------------|
| crn             | string  | User input                      | Course Reference Number          |
| termCode        | string  | User selects / derived          | e.g., `202630`                   |
| subject         | string  | User input or one-time lookup   | e.g., `CSE`                      |
| courseNumber    | string  | User input or one-time lookup   | e.g., `1011`                     |
| courseTitle     | string  | From searchResults response     | Display name                     |
| lastSeatsAvail  | int     | From last poll                  | Detect transitions 0 → N         |
| lastCheckedAt   | datetime| App                             | Polling state                    |
| alertSentAt     | datetime| App                             | Prevent duplicate SMS alerts     |

**Why subject + courseNumber are needed:** The searchResults endpoint requires at least
one filter. Subject + courseNumber is the most precise filter that returns only the
relevant section. You can collect these from the user at subscription time or do a
one-time full-term scan to build a CRN → {subject, courseNumber} lookup table.

---

## Known Limitations and Pitfalls

### 1. CRN Parameter Does Not Filter

`txt_courseReferenceNumber` is accepted as a parameter but does NOT filter results in
MSU's Banner SSB deployment (totalCount remains the same regardless of CRN value).
Always use `txt_subject` + `txt_courseNumber` to scope results, then filter client-side
by `courseReferenceNumber`.

### 2. Session Required for searchResults

Without a `JSESSIONID` from the `term/search` POST, `searchResults/searchResults`
returns `totalCount: 0`. Always establish session first. Monitor for this condition
in production and re-establish session when detected.

### 3. Session State Carries Filter Context

If you use the same session for different subject queries back-to-back, the server-side
state may carry over from the previous query. Always call `resetDataForm` POST between
queries if reusing sessions, OR pass all filter params in the URL on every request.

### 4. No seatsAvailable in getEnrollmentInfo

The `getEnrollmentInfo` POST endpoint returns only `Enrollment Actual` and
`Enrollment Maximum` in HTML. It does NOT include `seatsAvailable`. The only endpoint
that exposes `seatsAvailable` as a field is `searchResults/searchResults`.

### 5. MSU Banner Term Data Window

Terms marked `(View Only)` in getTerms are historical and may have stale/archived seat
data. Always verify you are polling an active (non-view-only) term.

### 6. Server Infrastructure

MSU's Banner SSB is a Java Spring/Grails application hosted on Tomcat. It is not a
high-availability public API — it experiences slowdowns during registration peaks
(typically the first week of each semester). Add timeout handling (10-second timeout
recommended) and retry logic.

---

## Alternative Approaches (Not Recommended)

### Playwright / Puppeteer

Not needed. All data available as JSON via server-side fetch. Browser automation adds
latency, memory overhead, and complexity with no benefit for this use case.

### Ellucian Ethos API

Ellucian's official cloud integration platform. Requires institutional API keys that
MSU would have to grant. Not available for external developers. Not viable.

### alec-rabold/UnofficialEllucianBannerApi (collegeplanner.io)

A wrapper API that scrapes Banner data. Adds latency and a dependency on a third party.
Calling MSU's Banner directly is more reliable and faster.

---

## Sources

- Live API testing against `mybanner.msstate.edu` (2026-04-22)
- NU Banner API documentation: https://jennydaman.gitlab.io/nubanned/
- TRU-Datasets Banner SSB endpoint documentation: https://github.com/Evantm/TRU-Datasets
- UnofficialEllucianBannerApi: https://github.com/alec-rabold/UnofficialEllucianBannerApi
- Live endpoint: `mybanner.msstate.edu/StudentRegistrationSsb/ssb/classSearch/getTerms`
- Live endpoint: `mybanner.msstate.edu/StudentRegistrationSsb/ssb/searchResults/searchResults`
- Live endpoint: `mybanner.msstate.edu/StudentRegistrationSsb/ssb/searchResults/getEnrollmentInfo`
- Live endpoint: `mybanner.msstate.edu/StudentRegistrationSsb/ssb/searchResults/getFacultyMeetingTimes`
