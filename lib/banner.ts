import axios from 'axios'
import { CookieJar } from 'tough-cookie'
import { wrapper } from 'axios-cookiejar-support'
import { BANNER_BASE_URL, CURRENT_TERM_CODE } from './constants'

// Module-level cookie jar — persists JSESSIONID across calls within one process.
// In a serverless environment each cold-start gets a fresh jar, which is fine
// because getSeatsByCRN calls establishSession automatically when needed.
const jar = new CookieJar()
const client = wrapper(
  axios.create({
    jar,
    timeout: 10000,
    headers: {
      'User-Agent': 'CoursesIQ/1.0 (MSU seat availability monitor)',
    },
  })
)

export interface MeetingTime {
  beginTime: string | null
  endTime: string | null
  monday: boolean
  tuesday: boolean
  wednesday: boolean
  thursday: boolean
  friday: boolean
  saturday: boolean
  sunday: boolean
  building: string | null
  buildingDescription: string | null
  room: string | null
  meetingTypeDescription: string | null
}

export interface MeetingsFaculty {
  meetingTime: MeetingTime
}

export interface BannerSeatData {
  courseReferenceNumber: string
  courseNumber: string
  subject: string
  sequenceNumber: string
  courseTitle: string
  maximumEnrollment: number
  enrollment: number
  seatsAvailable: number
  waitCount: number
  waitAvailable: number
  openSection: boolean
  faculty: Array<{
    displayName: string
    primaryIndicator: boolean
  }>
  meetingsFaculty?: MeetingsFaculty[]
}

/**
 * Establish a Banner SSB session for the given term.
 * POSTs to /term/search?mode=search — Banner sets JSESSIONID in Set-Cookie.
 * Must be called before getSeatsByCRN; getSeatsByCRN calls this automatically
 * on first use and on session expiry.
 */
export async function establishSession(
  termCode: string = CURRENT_TERM_CODE
): Promise<void> {
  await client.post(
    `${BANNER_BASE_URL}/term/search?mode=search`,
    `term=${termCode}&studyPath=&studyPathText=&startDatepicker=&endDatepicker=`,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
      },
    }
  )
}

/**
 * Reset Banner SSB server-side filter state between queries.
 * Prevents subject filter from a prior query bleeding into the next.
 * Must be called before each GET to searchResults/searchResults.
 */
async function resetDataForm(): Promise<void> {
  await client.post(`${BANNER_BASE_URL}/classSearch/resetDataForm`, null, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  })
}

/**
 * Fetch seat availability for a specific CRN.
 *
 * @param crn - Course Reference Number (e.g., '31352')
 * @param subject - Subject code (e.g., 'CSE')
 * @param courseNumber - Course number string (e.g., '1011')
 * @param termCode - Banner term code; defaults to CURRENT_TERM_CODE ('202630')
 * @returns BannerSeatData for the matched CRN, or null if not found
 */
export async function getSeatsByCRN(
  crn: string,
  subject: string,
  courseNumber: string,
  termCode: string = CURRENT_TERM_CODE
): Promise<BannerSeatData | null> {
  // Ensure session exists (no-op if jar already has JSESSIONID)
  await establishSession(termCode)

  return fetchWithRecovery(crn, subject, courseNumber, termCode, false)
}

/**
 * Fetch all sections for a course (no CRN filter).
 * Used by /api/sections to populate the section picker in the planner.
 */
export async function getSectionsByCourse(
  subject: string,
  courseNumber: string,
  termCode: string = CURRENT_TERM_CODE
): Promise<BannerSeatData[]> {
  await establishSession(termCode)
  return fetchAllSections(subject, courseNumber, termCode, false)
}

async function fetchAllSections(
  subject: string,
  courseNumber: string,
  termCode: string,
  isRetry: boolean
): Promise<BannerSeatData[]> {
  await resetDataForm()

  const response = await client.get(
    `${BANNER_BASE_URL}/searchResults/searchResults`,
    {
      params: {
        txt_term: termCode,
        txt_subject: subject,
        txt_courseNumber: courseNumber,
        pageOffset: 0,
        pageMaxSize: 500,
      },
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    }
  )

  const body = response.data as {
    success: boolean
    totalCount: number
    data: BannerSeatData[] | null
  }

  if (body.totalCount === 0 && !isRetry) {
    await establishSession(termCode)
    return fetchAllSections(subject, courseNumber, termCode, true)
  }

  return body.data ?? []
}

async function fetchWithRecovery(
  crn: string,
  subject: string,
  courseNumber: string,
  termCode: string,
  isRetry: boolean
): Promise<BannerSeatData | null> {
  // Clear server-side filter state before each query
  await resetDataForm()

  const response = await client.get(
    `${BANNER_BASE_URL}/searchResults/searchResults`,
    {
      params: {
        txt_term: termCode,
        txt_subject: subject,
        txt_courseNumber: courseNumber,
        pageOffset: 0,
        pageMaxSize: 500,
      },
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    }
  )

  const body = response.data as {
    success: boolean
    totalCount: number
    data: BannerSeatData[] | null
  }

  // BANN-04: Session expiry detection.
  // totalCount === 0 with data: null means JSESSIONID is expired (or was never set).
  // Re-establish session and retry once. On the retry, totalCount === 0 means the
  // course genuinely has no sections — return null rather than throwing.
  if (body.totalCount === 0 && !isRetry) {
    await establishSession(termCode)
    return fetchWithRecovery(crn, subject, courseNumber, termCode, true)
  }

  const sections = body.data ?? []

  // BANN-03: txt_courseReferenceNumber param is broken in MSU's Banner deployment.
  // Filter client-side by courseReferenceNumber.
  const match = sections.find((s) => s.courseReferenceNumber === crn)

  return match ?? null
}
