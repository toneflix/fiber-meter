import { verifyWebhookSignature } from '@fibermeter/sdk'

const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1_000

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })

export default async (request: Request) => {
  if (request.method !== 'POST') {
    return json({ error: { code: 'method_not_allowed', message: 'Use POST for this endpoint.' } }, 405)
  }

  const secret = process.env.FIBERMETER_WEBHOOK_SECRET
  if (!secret) {
    console.error('FIBERMETER_WEBHOOK_SECRET is not configured')
    return json({ error: { code: 'service_unavailable', message: 'Webhook receiver is not configured.' } }, 503)
  }

  const event = request.headers.get('x-fibermeter-event') || 'unknown'
  const signature = request.headers.get('x-fibermeter-signature') || ''
  const timestamp = request.headers.get('x-fibermeter-timestamp') || ''
  const timestampNumber = Number(timestamp)
  const payload = await request.text()

  if (
    !Number.isFinite(timestampNumber) ||
    Math.abs(Date.now() - timestampNumber) > MAX_TIMESTAMP_AGE_MS ||
    !verifyWebhookSignature(payload, signature, secret, timestamp)
  ) {
    return json({ error: { code: 'invalid_signature', message: 'Webhook signature is invalid.' } }, 401)
  }

  let parsedPayload: unknown
  try {
    parsedPayload = JSON.parse(payload)
  } catch {
    return json({ error: { code: 'invalid_payload', message: 'Webhook payload must be valid JSON.' } }, 400)
  }

  console.info('FiberMeter webhook received', {
    event,
    timestamp,
    payload: parsedPayload,
  })

  return json({ received: true, event })
}
