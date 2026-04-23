import 'server-only'
// IMPORTANT: Any API route importing this file must declare:
//   export const runtime = 'nodejs'
// Twilio requires Node.js native modules; Edge Runtime is not supported.
import twilio from 'twilio'

// Module-level singleton — one Twilio client instance per cold start.
// Mirrors the lib/banner.ts module-level client pattern.
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

/**
 * Send a seat-open SMS alert to a subscriber.
 *
 * @param phone - E.164 phone number (e.g., '+16015551234')
 * @param courseName - Human-readable course name (e.g., 'Intro to Computer Science')
 * @param crn - Course Reference Number (e.g., '31352')
 * @returns The Twilio message SID (e.g., 'SMxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
 * @throws RestException on Twilio API errors — callers are responsible for catching
 *   error code 21610 (opted out) and setting sms_opted_out = true
 */
export async function sendSeatAlert(
  phone: string,
  courseName: string,
  crn: string
): Promise<string> {
  const message = await twilioClient.messages.create({
    body: `🎉 A seat just opened in ${courseName} (${crn})! Register now before it fills up: mybanner.msstate.edu — CoursesIQ`,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to: phone,
  })
  return message.sid
}
