import 'server-only'
import { Resend } from 'resend'

/**
 * Send a seat-open email alert to a subscriber.
 *
 * @param email - Recipient email address
 * @param courseName - Human-readable course name (e.g. 'Intro to Computer Science')
 * @param crn - Course Reference Number (e.g. '31352')
 * @returns The Resend email ID
 * @throws on Resend API errors — callers are responsible for catching
 */
export async function sendSeatAlert(
  email: string,
  courseName: string,
  crn: string
): Promise<string> {
  const resend = new Resend(process.env.RESEND_API_KEY!)
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: `Seat opened in ${courseName} (${crn})!`,
    html: `<p>🎉 A seat just opened in <strong>${courseName} (${crn})</strong>! Register now before it fills up: <a href="https://mybanner.msstate.edu">mybanner.msstate.edu</a> — CoursesIQ</p>`,
  })

  if (error) throw error
  return data!.id
}
