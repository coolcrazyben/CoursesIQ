// CoursesIQ — shared constants
// Single source of truth for Banner SSB configuration.

/** MSU Banner SSB base URL — verified 2026-04-22. mybanner.msstate.edu is correct;
 *  mystudent.msstate.edu is NOT reachable externally. */
export const BANNER_BASE_URL =
  'https://mybanner.msstate.edu/StudentRegistrationSsb/ssb'

/** Current registration term code. Fall 2026 = 202630.
 *  Term code format: YYYYTT where TT is 10=Spring, 20=Summer, 30=Fall.
 *  Update this value each semester before registration opens. */
export const CURRENT_TERM_CODE = '202630'
