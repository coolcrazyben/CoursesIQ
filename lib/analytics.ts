import posthog from 'posthog-js'

// ─── UTM ────────────────────────────────────────────────────────────────────

export interface UTMParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

export function captureUTM(): UTMParams | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const utm: UTMParams = {}
  const keys: (keyof UTMParams)[] = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
  let found = false
  for (const k of keys) {
    const v = params.get(k)
    if (v) { utm[k] = v; found = true }
  }
  if (found) {
    try { sessionStorage.setItem('utm', JSON.stringify(utm)) } catch { /* ignore */ }
    return utm
  }
  return null
}

export function getStoredUTM(): UTMParams | null {
  try {
    const raw = sessionStorage.getItem('utm')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

// ─── Event helpers ───────────────────────────────────────────────────────────

export function trackPublicPageView(params: {
  page_type: 'course' | 'professor' | 'department'
  slug: string
  subject?: string
  course_number?: string
  professor?: string
}) {
  posthog.capture('public_page_view', params)
}

export function trackGuideDownload(params: { email: string; source: string }) {
  posthog.capture('guide_download', params)
}

export function trackCompareClick(params: { course: string }) {
  posthog.capture('compare_click', params)
}

export function trackSignupComplete(params: { method: string; referred_by?: string | null }) {
  posthog.capture('signup_complete', params)
}

export function trackFirstAlertCreated(params: { subject: string; course_number: string }) {
  posthog.capture('first_alert_created', params)
}

export function trackFirstScheduleSaved() {
  posthog.capture('first_schedule_saved')
}

export function trackAlertClicked(params: { alert_id: string; crn: string }) {
  posthog.capture('alert_clicked', params)
}

export function trackCheckoutStarted(params: { plan: string }) {
  posthog.capture('checkout_started', params)
}

export function trackPurchaseCompleted(params: { plan: string; amount: number }) {
  posthog.capture('purchase_completed', params)
}

export function trackDidYouGetInResponse(params: { outcome: string; alert_id: string }) {
  posthog.capture('did_you_get_in_response', params)
}

export function trackReferredSignup(params: { referrer_code: string }) {
  posthog.capture('referred_signup', params)
}

export function trackTemplateSurveySubmitted() {
  // placeholder — no-op until survey feature is built
}
