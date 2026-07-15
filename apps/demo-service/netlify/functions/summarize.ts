import { FiberMeter, FiberMeterError, type UsageRecordResult } from '@fibermeter/sdk'

import { MAX_TEXT_LENGTH, createExtractiveSummary, estimateTokens } from '../../src/lib/summary'

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

  let body: { text?: unknown; requestId?: unknown }
  try {
    body = await request.json()
  } catch {
    return json({ error: { code: 'invalid_json', message: 'Request body must be valid JSON.' } }, 400)
  }

  const text = typeof body.text === 'string' ? body.text.trim() : ''
  const requestId = typeof body.requestId === 'string' ? body.requestId : ''

  if (!text) {
    return json({ error: { code: 'validation_error', message: 'Enter some text to summarize.' } }, 400)
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return json(
      { error: { code: 'validation_error', message: `Text cannot exceed ${MAX_TEXT_LENGTH.toLocaleString()} characters.` } },
      400,
    )
  }
  if (!/^[0-9a-f-]{20,64}$/i.test(requestId)) {
    return json({ error: { code: 'validation_error', message: 'A valid request ID is required.' } }, 400)
  }

  const apiUrl = (process.env.FIBERMETER_API_URL || 'http://127.0.0.1:4000').replace(/\/$/, '')
  const apiKey = process.env.FIBERMETER_API_KEY
  const customer = process.env.FIBERMETER_CUSTOMER_ID || 'cus_demo_001'
  const service = process.env.FIBERMETER_SERVICE_SLUG || 'ai-summary'

  if (!apiKey) {
    console.error('FIBERMETER_API_KEY is not configured')
    return json(
      { error: { code: 'service_unavailable', message: 'The demo metering service is not configured.' } },
      503,
    )
  }

  const fiberMeter = new FiberMeter({ baseUrl: apiUrl, apiKey })
  let usage: UsageRecordResult

  try {
    usage = await fiberMeter.recordUsage({
      service,
      customer,
      metricKey: 'tokens',
      quantity: estimateTokens(text),
      idempotencyKey: `demo_summary_${requestId}`,
      metadata: {
        source: 'demo-service',
        characters: text.length,
      },
    })
  } catch (error) {
    if (error instanceof FiberMeterError) {
      const details = error.body as { error?: { message?: string } } | null
      console.error('FiberMeter rejected demo usage', error.status, details?.error?.message)
      return json(
        {
          error: {
            code: 'metering_error',
            message: details?.error?.message || 'FiberMeter rejected the usage event.',
          },
        },
        error.status >= 400 && error.status < 500 ? error.status : 502,
      )
    }

    console.error('FiberMeter SDK request failed', error)
    return json(
      { error: { code: 'upstream_unavailable', message: 'FiberMeter could not be reached. Please try again.' } },
      502,
    )
  }
  if (usage.status === 'insufficient_balance') {
    return json(
      {
        error: {
          code: 'payment_required',
          message: 'The demo customer balance is too low for this request.',
        },
        metering: {
          required: usage.required,
          available: usage.available,
          asset: usage.asset,
        },
      },
      402,
    )
  }

  if (usage.status !== 'charged') {
    return json({ error: { code: 'metering_error', message: 'The usage event was not charged.' } }, 502)
  }

  return json({
    summary: createExtractiveSummary(text),
    metering: usage,
  })
}
