import 'server-only'
import { PostHog } from 'posthog-node'

let _client: PostHog | null = null

function getClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return null
  if (!_client) {
    _client = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    })
  }
  return _client
}

export async function captureAlertFired(params: {
  email: string
  subject: string
  course_number: string
  crn: string
}) {
  const client = getClient()
  if (!client) return
  client.capture({
    distinctId: params.email,
    event: 'alert_fired',
    properties: { subject: params.subject, course_number: params.course_number, crn: params.crn },
  })
  await client.flush()
}
