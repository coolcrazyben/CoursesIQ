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

/**
 * Send a welcome email with the Registration Rescue Pack to a new lead.
 */
export async function sendLeadWelcomeEmail(email: string, firstName?: string): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY!)
  const greeting = firstName ? `Hi ${firstName}` : 'Hi there'
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: 'Your MSU Registration Rescue Pack 🎓',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111">
        <div style="background:#5D1725;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center">
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:900">MSU Registration Rescue Pack</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:8px 0 0">From CoursesIQ</p>
        </div>

        <p style="font-size:16px;margin-bottom:24px">${greeting},</p>
        <p style="margin-bottom:24px">Here are 3 proven strategies to get into full courses at Mississippi State:</p>

        <div style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:16px">
          <p style="font-weight:700;margin:0 0 6px;color:#5D1725">1. Hit the waitlist the moment registration opens</p>
          <p style="font-size:14px;color:#555;margin:0">Waitlist spots fill within minutes. Set your alarm and be the first on the list — your position matters more than you think.</p>
        </div>

        <div style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:16px">
          <p style="font-weight:700;margin:0 0 6px;color:#5D1725">2. Track seat availability in real time</p>
          <p style="font-size:14px;color:#555;margin:0">Use <a href="https://coursesiq.com" style="color:#5D1725">CoursesIQ</a> to monitor open seats and your waitlist position. Early drops happen — be ready to register the second one appears.</p>
        </div>

        <div style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:24px">
          <p style="font-weight:700;margin:0 0 6px;color:#5D1725">3. Email the professor directly</p>
          <p style="font-size:14px;color:#555;margin:0">A polite, brief email explaining why you need the course works more often than students expect. Check grade data on CoursesIQ to identify which sections are most accessible.</p>
        </div>

        <a href="https://coursesiq.com/dashboard" style="display:block;background:#5D1725;color:#fff;text-align:center;padding:14px;border-radius:10px;font-weight:700;text-decoration:none;font-size:15px">
          Start tracking your courses →
        </a>

        <p style="font-size:12px;color:#999;margin-top:24px;text-align:center">
          CoursesIQ · Mississippi State University · <a href="https://coursesiq.com" style="color:#999">coursesiq.com</a>
        </p>
      </div>
    `,
  })
  if (error) throw error
}
