# Market Research: Course Seat Alert Tools — Competitive Landscape

**Project:** CoursesIQ (MSU-focused)
**Researched:** 2026-04-22
**Confidence:** MEDIUM-HIGH (primary source verification on most claims; some pricing details LOW confidence due to site inaccessibility)

---

## Executive Summary

The course seat alert market is fragmented across two tiers: one dominant generalist (Coursicle, 1,100+ universities, 2M+ users) and a growing swarm of single-university specialists (Courseer, SeatSignal, SeatSnag, ASUClassFinder, ClassRabbit, PickMyClass) — nearly all concentrated at ASU. No strong MSU-specific competitor exists beyond Coursicle's generic coverage. That is CoursesIQ's opening.

The market has a clear, proven freemium playbook: one free tracked class, $4-9/month or $5/semester for more. Conversion drivers are the quantity-of-tracked-classes limit and notification speed tiers, not feature richness. The tools that fail do so from alert latency (seats gone before notification arrives), polling architecture that can't keep up, or university blocks triggered by aggressive scraping.

v2 features — professor ratings and grade distributions — are validated differentiators. No MSU tool combines seat alerts + RMP-style data + grade distributions in one place. MSU Grades (FOIA-sourced) and the MSUScheduleGrades Chrome extension prove MSU student appetite for this data exists; neither has alerts.

---

## 1. Competitor Profiles

### 1.1 Coursicle (Primary Competitor)

**Scale:** 1,100+ universities, 2M+ users, iOS + Android + web.

**Core features:**
- Seat tracking with push/email alerts when a class opens
- Schedule builder with conflict detection
- LMS sync (Canvas, Blackboard, Brightspace, Moodle, Sakai, Google Classroom)
- Professor reviews (self-reported by students, not scraped from RMP)
- Assignment tracking and class group chats
- Google Calendar export

**Pricing (MEDIUM confidence — verified via multiple app store and review sources):**
- Free: Track 1 class per semester
- Premium: $4.99/semester for unlimited tracking
- Referral unlock: Refer 3 friends → free premium semester

**How seat alerts work:**
Coursicle scrapes each university's public-facing registration system (schedule.msu.edu equivalent) on a polling interval. The exact interval is not published, but users report 45-60 second delays in best cases, with some reports of several-minute delays. The app does NOT auto-register — it notifies, then the student must act.

**What users like:**
- Notification timing when it works ("got notified the moment a seat opened, sometimes just one spot")
- $5 pricing ("less than a Starbucks coffee")
- Referral unlock as a zero-cost alternative
- Customer support responsiveness

**What users dislike (HIGH confidence — multiple review sources):**
- Notification delays: "slightly delayed — the class opens a few minutes before I get the notification"
- Missed alerts: "I never got notified that the class opened" despite active tracking
- One-class free limit frustrates students with 3-4 target courses
- Coursicle 4.0 (October 2024): app went down for multiple days during rollout; navigation degraded from 1-click to 3-click; calendar scrolling replaced single-view dashboard; online courses became invisible; users called it "an alpha or beta version"

**Institutional relationship risk:**
After the February 2022 incident (founder Joe Puccio sent erratic push notifications during a mental health crisis), UNC blocked Coursicle campus-wide citing lack of "administrative and development controls minimally required to deliver a production service." UNC's block was not about scraping but about governance — though the episode exposed how fragile third-party scraping relationships are when institutional trust breaks down.

**MSU support:** Confirmed. Coursicle has a dedicated MSU page (coursicle.com/msu/) with Fall 2026 course listings and seat tracking. MSU is not a special-case integration — it uses the same scraping pipeline as all 1,100+ schools.

---

### 1.2 Courseer (ASU-only)

**Scale:** ASU only, 2,600+ students served since January 2023.

**Pricing (HIGH confidence — directly verified from courseer.co):**
- Maroon (Free): Track 1 class, delayed notifications (up to 14 minutes)
- Gold ($4/month): Track up to 4 classes, priority notifications
- Sparky ($9/month): Track up to 8 classes, instant notifications (under 1 minute)

**Key insight:** Courseer explicitly monetizes notification speed — the free tier is intentionally slow (14-minute delay). This is a proven conversion lever: students who lose seats because they got a slow alert will upgrade. This is the most direct freemium hook in the market.

---

### 1.3 SeatSignal (ASU-only)

**Scale:** ASU only, launched 2023.

**Pricing (HIGH confidence — verified from seatsignal.com):**
- 1 slot: $2/semester
- 2 slots: $3/semester
- 5 slots: $5/semester

**How it works:** Checks ASU course catalog every 1 minute. Sends email or SMS with a direct registration link when a seat opens.

**Key insight:** Slot-based pricing (not tier-based) is more flexible. Slots can be reassigned during the semester. The direct link to the registration page in the alert SMS is a strong UX detail — students click the link and land at the exact registration action without searching.

---

### 1.4 SeatSnag (ASU-only)

**Scale:** ASU only, built by ASU students.

**Pricing (HIGH confidence — verified from seatsnag.app):**
- Free: Monitor 1 class indefinitely
- Standard: $3/month (4 classes)
- Premium: $7/month (unlimited, 30-second checking speed)

**Delivery channel:** Discord DM (not SMS, not email). This is unusual — the insight is that Discord is where many students already live, so a DM arrives in an active notification stream.

**Key insight:** Check frequency is explicitly tiered in the premium plan (2-minute vs. 30-second). This suggests polling speed is marketed as a premium feature to students who understand the competitive advantage of faster alerts.

---

### 1.5 ASUClassFinder

**Scale:** ASU only. Tracks 21K+ Fall 2026 classes.

**Features:** Email + SMS alerts the moment a seat opens, 24/7 monitoring.

**Key insight:** No pricing visible on homepage; implied freemium or paid. Uses email + text (not push notification app install required). Lower friction for alert delivery.

---

### 1.6 PickMyClass (ASU-only, open source)

**Scale:** ASU only, free.

**How it works:** Checks ASU's class search every 30 minutes (self-throttled to respect ASU servers — caps at 5 concurrent scraper instances). Sends email notifications. Dashboard updates live.

**Key insight:** The 30-minute polling interval is an explicit tradeoff for server politeness. The open-source author documents this transparently. This is important: aggressive polling is the technical path to fast alerts, but it creates university blocking risk. Responsible rate limiting is a design constraint, not just a preference.

---

### 1.7 SeatAlert.ca (McGill/McMaster — Canadian example)

**Scale:** McGill and McMaster (Canadian universities).

**Delivery:** Text and email alerts. Checks every 15 seconds.

**Business model:** Fully paid (no visible free tier). The site includes a "Why is Seat Alert paid?" explanation, indicating they've faced the question and defend the decision.

**Ecosystem play:** Links to companion site ratemyschedule.ca for professor ratings — this is the exact v2 play CoursesIQ is planning, and it exists in the Canadian market already. SeatAlert and RateMySchedule are separate products but cross-linked.

---

### 1.8 ClassRabbit

**Scale:** Launched July 2023, 560+ students, 1,000+ notifications sent. Multi-university.

**Features:** Watchlist management, real-time notifications, visual timetable creator for conflict detection.

---

## 2. Failure Modes

### 2.1 Alert Latency (CRITICAL)

**What goes wrong:** The notification arrives after the seat is already gone. Students click through and find the class full again.

**Root causes:**
- Polling interval too long (10-30 minutes on free tiers)
- Queue depth: if many classes are being tracked, each scrape cycle takes longer
- SMS delivery lag adds on top of polling delay
- The university's registration system itself updates on a lag (U of Illinois: 10-minute sync cycle from SIS to public-facing portal)

**Compounding factor:** A dropped seat can re-fill in under 60 seconds during peak registration periods. A 14-minute delayed alert is effectively useless for high-demand sections.

**Evidence:** Coursicle reviews consistently report this. Courseer uses 14-minute delays on free tier explicitly as a conversion mechanic. Premium tiers advertise "under 1 minute" as a selling point (SeatSignal, Courseer Sparky).

**Prevention for CoursesIQ:** Design the polling architecture for sub-60-second cycles on all tiers, even free. Differentiate paid tiers on number of tracked courses, not on alert speed. Speed degradation on the free tier destroys trust.

---

### 2.2 False Positives / Ghost Seat Alerts

**What goes wrong:** The alert fires but the course has no real open seat when the student checks.

**Root causes:**
- Seat briefly opened and closed between poll cycle and notification delivery
- Waitlist movement that doesn't result in a registerable seat
- Data sync issues between the registrar's internal SIS (Banner) and the public-facing schedule portal

**Evidence:** Indirectly reported — Coursicle users note "the app said a class was full even after the class had opened." The inverse (alert fires, class is still full) is the ghost seat problem.

**Prevention for CoursesIQ:** Double-check availability at alert-send time (a second API call immediately before firing the notification). Include a timestamp in the SMS: "Seat detected at 2:34pm — click now." This manages expectations even if the seat is gone.

---

### 2.3 University Blocking

**What goes wrong:** The university's IT detects automated scraping traffic and blocks the app's IP range. All tracking ceases silently.

**Root causes:**
- No user-agent rotation
- Consistent request intervals (easily fingerprinted as a bot)
- High request volume across all tracked courses from a single IP pool

**Evidence:** UNC blocked Coursicle in 2022 (triggered by the founder incident, but the block justified on lack of "administrative controls," which implies IT was already watching). PickMyClass explicitly caps at 5 concurrent scraper instances and chose 30-minute polling to be "respectful of ASU's servers."

**Prevention for CoursesIQ:** Use respectful polling (under 60 seconds, not under 5 seconds). Rotate request headers. If MSU provides any API endpoint (schedule.msu.edu serves JSON to its own frontend — inspectable via browser devtools), prefer that over HTML scraping. Explore whether MSU's IT or Registrar office will grant a formal data feed — being a student-built MSU-specific tool is a credibility advantage Coursicle doesn't have.

---

### 2.4 Founder-Risk / Single-Point-of-Failure Operations

**What goes wrong:** Small team (often 1-2 people) can't maintain reliability during stress, incidents, or major product changes.

**Evidence:** Coursicle 4.0 took the app down for multiple days and shipped in broken condition. Coursicle's 2022 incident was literally one person's mental health crisis breaking the entire service. Multiple ASU tools are built by 1-2 student developers who may graduate and abandon the project.

**Prevention for CoursesIQ:** For v1, document the scraping pipeline and alerting architecture so it's not tribal knowledge. Write runbooks. Design the polling worker as a stateless background job (not dependent on a single process staying alive).

---

### 2.5 App Update Regression (UX Degradation)

**What goes wrong:** A major update breaks core workflows that users relied on. The new UX adds friction to the primary action (finding and tracking a course).

**Evidence:** Coursicle 4.0 is the canonical case. Navigation went from 1-click to 3-click for core actions. Users who had built habits around the old UX churned or posted negative reviews. The app was described as "standing on thin ice" by student press.

**Prevention for CoursesIQ:** In v1, ruthlessly protect the primary flow (find course → start tracking → receive alert → register). Any feature addition in v2 must not add clicks to this path. Test with real MSU students before releasing updates.

---

## 3. Data Sources

### 3.1 Course Availability (Seat Counts)

**Source:** Public-facing schedule portal at schedule.msu.edu.

The schedule.msu.edu site is a JavaScript-rendered app that calls backend endpoints to load course data. These endpoints return JSON (verifiable via browser devtools network inspection — this is standard for modern SPA registration systems running Banner or Ellucian Colleague). MSU runs Banner via Ellucian.

**Scraping approach used by all competitors:** Poll the schedule endpoint for each tracked course at regular intervals. Compare seat count. Fire alert on change from 0 to >0.

**Risk:** MSU has not publicly documented an API. All tools use undocumented endpoints. A Banner upgrade or frontend refactor can break the scraper. Build in monitoring that alerts the developer when scraper returns unexpected data.

**Precedent:** The MSUScheduleGrades Chrome extension runs on schedule.msu.edu and injects data from msugrades.com into the page — confirming the site is inspectable and injectable. The schedule.msu.edu endpoints are reachable from JavaScript in the browser context.

---

### 3.2 Grade Distribution Data (for v2)

**Primary source: FOIA requests to MSU.**

MSU Grades (msugrades.com) is an existing third-party site that obtained grade distributions via FOIA requests and publishes them as a downloadable CSV (all-grades.csv). The data includes per-course, per-instructor letter grade distributions.

**FOIA process realities (MEDIUM confidence, sourced from Austin Walters' 100-university FOIA analysis):**
- ~30% of universities positively respond to FOIA requests for grade data
- MSU has already responded (msugrades.com exists) — so the data is obtainable
- Common formats: CSV, PDF, web portal. MSU provides CSV (downloadable from msugrades.com)
- Response time can be weeks to months; payments of <$250 are sometimes required
- Data excludes sections with <10 students (FERPA)

**Practical path for CoursesIQ v2:**
1. Download and integrate the existing msugrades.com CSV immediately (it's public, FOIA-derived, free to use)
2. File your own FOIA with MSU Registrar to get newer semesters and a direct data relationship
3. Build a pipeline that processes the CSV into a queryable database (course + instructor → grade distribution)

**Existing MSU ecosystem:** The MSUScheduleGrades Chrome extension (github.com/lahaiery/MSUScheduleGrades) already pulls from msugrades.com to inject GPA overlays into schedule.msu.edu. This proves the data is usable and students want it — and it is a browser extension, not a first-class integrated product.

**FOIA data limitations:**
- Updated only when a new request is filed (not real-time)
- Excludes small sections (FERPA)
- Historical, not current-semester

---

### 3.3 Professor Ratings (for v2)

**Option A: Rate My Professors (RMP) scraping**

RMP has no public API. All integrations use undocumented GraphQL endpoints or scraping wrappers. Several open-source libraries exist (Python: `RateMyProfessorAPI` on PyPI; TypeScript: `rate-my-professor-api-ts` on npm; Rust crate). These use RMP's internal GraphQL API, which is accessible without login for public data.

**Legal status (MEDIUM confidence):** Recent case law (Meta v. Bright Data) supports scraping public, non-login-gated content. RMP's professor pages are publicly accessible without account creation. However, RMP's ToS prohibits scraping, and they have actively restricted third-party API use in the past. Risk is moderate for a small student tool; risk increases if CoursesIQ scales and RMP notices.

**Practical mitigation:** Cache aggressively. Don't poll RMP in real-time — batch-fetch MSU professor data, store locally, refresh weekly. Present RMP data as sourced from RMP with attribution. This reduces both scraping volume and legal exposure.

**Option B: Build MSU-native professor reviews**

Coursicle already does this — "reviews written by verified students at your school." The advantage: no RMP dependency, no legal risk, more recent data. The disadvantage: cold start problem — CoursesIQ v1 will have zero reviews.

**Recommendation:** Use scraped/cached RMP data for v2 launch to have immediate content. Build toward MSU-native reviews as the long-term moat. The SeatAlert + RateMySchedule two-product model (Canada) is a precedent, but CoursesIQ should integrate both in one experience rather than split them.

**Option C: Partner with msugrades.com**

msugrades.com explicitly lists "derivative works" — they encourage use of their data. A formal acknowledgment or data-sharing arrangement is plausible for a student project. This gives grade distribution data without FOIA overhead.

---

## 4. SMS Alert Mechanics

### What Students Expect

**Channel preference (HIGH confidence — multiple higher-ed SMS studies):**
- SMS: 98% open rate, typically read within 5 minutes
- Push notification: high open rate but requires app install and permission grant
- Email: ~20-42% open rate; too slow for seat alerts

**Student preference:** 76% of 18-34 year-olds prefer text for time-sensitive updates. For a seat alert — which has a sub-60-second action window — SMS is the only channel that reliably reaches students in time.

**What works in alert message design:**
- Under 160 characters (single SMS segment, no splitting)
- Lead with the course identifier: "CSE 231 seat opened"
- Include timestamp to calibrate freshness: "(2:34pm)"
- Direct link to registration page (not to CoursesIQ — directly to MSU's registration action)
- No fluff, no branding, no marketing language

**Example template (HIGH confidence by analogy to best-practice patterns):**
```
CoursesIQ: CSE 231-001 seat opened (2:34pm). Register now: [direct MSU link]. Reply STOP to cancel.
```

**What not to do:**
- Do not include the course name in addition to the code — too long
- Do not require the student to log in to CoursesIQ before getting to registration
- Do not send a second "still open" follow-up (noise, and likely not true)
- Do not batch multiple seat alerts into one SMS — each deserves its own message with its own timestamp

**Twilio / SMS infrastructure note:** For v1, Twilio is the standard choice ($0.0079/SMS in the US). A/B test SMS vs. push notification early — push requires app, SMS works from a website. Start with SMS, add push in v2.

---

## 5. Freemium Model Precedents

### Market Consensus Model

Every successful single-university tool converges on the same structure:

| Tier | Price | Tracked Courses | Alert Speed |
|------|-------|-----------------|-------------|
| Free | $0 | 1 | Standard (or delayed) |
| Paid | $3-9/mo or $5/semester | 4-unlimited | Standard or faster |

The Coursicle model ($4.99/semester) is perceived as extremely cheap by students who have used it. The Courseer model ($4/mo Gold, $9/mo Sparky) generates higher monthly revenue but requires ongoing subscription commitment.

**Semester vs. monthly pricing:** Semester pricing aligns with student behavior (they care about registration season, then disengage). Monthly pricing generates more revenue but higher churn. For CoursesIQ v1, semester pricing is more natural and reduces perceived risk for students trying a new tool.

### Conversion Levers (What Actually Converts)

1. **Quantity limit:** Needing to track 3-4 courses but being limited to 1 is the strongest conversion driver. Students picking between 3 sections of the same course need multi-tracking.

2. **Speed tier (used by Courseer):** Free tier gets 14-minute delay. Student misses a seat. They upgrade. This is psychologically brutal but it works. Use with caution — it can permanently damage trust if a student misses a critical seat on the free tier and blames the product.

3. **Referral unlock (Coursicle model):** Refer 3 friends → free premium. This is viral growth mechanics. Each referral is also a new user. CoursesIQ should consider this as an acquisition strategy: "Refer 2 MSU friends, get unlimited tracking free." Lower bar than Coursicle's 3.

4. **What does NOT convert:** Feature richness, UI aesthetics, grade distribution access as a paywall. Students pay for the core alert action, not for surrounding features.

### Pricing Recommendation for CoursesIQ

- **Free:** Track 1 course, SMS alerts, standard speed (sub-60 seconds on all tiers)
- **Spartan ($3.99/semester):** Track up to 5 courses
- **Unlimited ($7.99/semester):** Unlimited tracking + early access to v2 grade/professor features
- **Referral:** Refer 2 friends → one free semester upgrade

Do not paywall notification speed. Do not paywall SMS — it's the core value prop. Paywall course quantity.

---

## 6. v2 Feature Validation (Grade Distribution + Professor Ratings)

### Market Evidence That This Works

- GradeToday.com (nation-wide): combines grade distributions and professor ratings in one search
- SeatAlert.ca + RateMySchedule.ca (Canada): two linked products from same team
- MSUScheduleGrades Chrome extension: MSU-specific, shows student GPA overlays on schedule.msu.edu — organic tool with no marketing, proves demand
- Multiple MSU Reddit threads about "best professor for CSE 231" confirm students actively seek this information during registration

### What Students Actually Do During Registration

1. Look up course on schedule.msu.edu
2. Google "Professor [name] MSU Reddit" or check RMP
3. Check grade distribution on msugrades.com if they know it exists
4. Try to get into the section with the best professor + highest GPA distribution
5. Fail because the class is full by the time they decide
6. Refresh the registration page repeatedly

CoursesIQ can collapse steps 1-6 into a single interface.

### Sequencing Recommendation

**v1 (seat alerts only):** Get this right first. MSU students need to trust the alert system before they'll trust anything else the product says. A late alert that costs a student a seat will poison the v2 launch.

**v2 add-on order:**
1. Grade distribution first (data is available now from msugrades.com, no scraping required, no legal risk)
2. Professor ratings second (RMP scraping with caching, or partner with RMP data aggregators)
3. Native MSU reviews third (long-term moat, requires user base first)

---

## 7. MSU-Specific Context

### Current Pain Points at MSU (April 2026)

The State News (statenews.com, April 2026) reports MSU is actively investigating seat availability problems:
- Classes over-concentrated in 10am-2pm window create scheduling conflicts
- Limited Friday offerings further constrain student options
- Undergrads averaging 15 credits/semester struggle to find seats in required courses
- MSU's Student Undergraduate Experience Strategy Team is collecting data; report due July 2026

**Implication:** MSU students are unusually motivated right now. The problem CoursesIQ solves is actively in the campus news cycle. A well-timed launch (before Fall 2026 registration opens) could get organic press coverage in The State News.

### MSU Registration System

MSU uses schedule.msu.edu (public) and the MSU SIS portal for actual registration. The schedule.msu.edu site is a JavaScript app (inspectable). MSU's registration runs on Ellucian Banner (standard for large public universities). The public-facing seat count data is the target for scraping.

The MSUScheduleGrades extension (GitHub: lahaiery/MSUScheduleGrades) runs on schedule.msu.edu and pulls from msugrades.com — confirming that the site's JavaScript environment is injectable and that msugrades.com data is suitable for building on.

---

## 8. Key Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| MSU blocks scraper IP | HIGH | Respectful polling intervals (45-60s), rotate user-agents, explore official data feed request to MSU Registrar |
| Alert arrives after seat fills | HIGH | Sub-60s polling on all tiers; double-check availability at send time; timestamp every alert |
| RMP blocks scraping in v2 | MEDIUM | Cache aggressively (weekly refresh), low request volume, attribution, pivot to native reviews if blocked |
| Coursicle adds MSU-specific features | MEDIUM | Moat is local MSU identity + grade data + professor ratings integration — Coursicle is too generic to replicate quickly |
| FOIA request denied or delayed | LOW | msugrades.com data already exists and is downloadable; use it for v2 MVP, file your own FOIA in parallel |
| University ban (UNC-Coursicle scenario) | LOW-MEDIUM | Being MSU-affiliated student project reduces political risk; don't send erratic notifications; maintain institutional goodwill |
| SMS costs at scale | LOW | Twilio at $0.0079/SMS; 10,000 alerts = $79. Manageable until significant paid user base |

---

## Sources

- Coursicle product overview: [coursicle.com/blog/what-is-coursicle](https://www.coursicle.com/blog/what-is-coursicle/)
- Coursicle MSU page: [coursicle.com/msu](https://www.coursicle.com/msu/)
- Coursicle user reviews (2025-2026): [justuseapp.com](https://justuseapp.com/en/app/1187418307/coursicle/reviews)
- Coursicle 4.0 backlash: [ULM Hawkeye](https://ulmhawkeyeonline.com/34929/opinion/coursicle-4-0-update-worsens-platform-ruins-experience/)
- Coursicle 2022 incident: [Carolina Connection](https://carolinaconnection.org/2022/04/08/after-bizarre-notifications-unc-blocks-access-to-the-coursicle-scheduling-app)
- Coursicle founder apology: [NYU News](https://nyunews.com/news/2023/02/14/coursicle-joe-puccio-apology/)
- Courseer (ASU): [courseer.co](https://courseer.co/)
- SeatSignal (ASU): [seatsignal.com](https://seatsignal.com/)
- SeatSnag (ASU): [seatsnag.app](https://seatsnag.app/)
- ASUClassFinder: [asuclassfinder.com](https://www.asuclassfinder.com/)
- PickMyClass open-source: [PickMyClass blog](https://divkix.me/blog/pickmyclass-never-miss-your-dream-class/)
- ClassRabbit: [classrabbitapp.com](https://classrabbitapp.com/)
- SeatAlert.ca (McGill): [seatalert.ca/mcgill](https://seatalert.ca/mcgill/)
- MSU Grades (FOIA data): [msugrades.com](https://msugrades.com/)
- MSUScheduleGrades extension: [GitHub](https://github.com/lahaiery/MSUScheduleGrades)
- FOIA requesting 100 universities: [Austin Walters](https://austingwalters.com/foia-requesting-100-universities/)
- MSU seat availability news (April 2026): [The State News](https://statenews.com/article/2026/04/msu-to-address-issues-with-course-scheduling-and-seat-availability-in-classes)
- RMP API wrappers: [PyPI RateMyProfessorAPI](https://pypi.org/project/RateMyProfessorAPI/), [npm rate-my-professor-api-ts](https://www.npmjs.com/package/rate-my-professor-api-ts)
- SMS open rate data: [Mobile Text Alerts](https://mobile-text-alerts.com/articles/sms-for-universities), [OneSignal](https://onesignal.com/blog/6-ways-universities-and-schools-are-using-push-notifications/)
- SaaS freemium conversion benchmarks: [First Page Sage](https://firstpagesage.com/seo-blog/saas-freemium-conversion-rates/)
