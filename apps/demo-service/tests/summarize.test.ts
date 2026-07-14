import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import summarize from '../netlify/functions/summarize'

const request = (text = 'FiberMeter records usage. It charges a prepaid balance.') =>
  new Request('https://demo.example/api/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      requestId: '123e4567-e89b-12d3-a456-426614174000',
    }),
  })

describe('metered summary function', () => {
  beforeEach(() => {
    process.env.FIBERMETER_API_URL = 'https://meter.example'
    process.env.FIBERMETER_API_KEY = 'fm_test_secret'
    process.env.FIBERMETER_CUSTOMER_ID = 'cus_demo_001'
    process.env.FIBERMETER_SERVICE_SLUG = 'ai-summary'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a summary only after the SDK records a charge', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        status: 'charged',
        usageEventId: 'evt_123',
        amount: '0.14000000',
        asset: 'CKB',
        balanceRemaining: '99.86000000',
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const response = await summarize(request())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      summary: 'FiberMeter records usage. It charges a prepaid balance.',
      metering: { status: 'charged', usageEventId: 'evt_123' },
    })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://meter.example/api/usage-events')

    const options = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(options.headers).toMatchObject({ 'x-api-key': 'fm_test_secret' })
    expect(JSON.parse(options.body as string)).toMatchObject({
      service: 'ai-summary',
      customer: 'cus_demo_001',
      metricKey: 'tokens',
      idempotencyKey: 'demo_summary_123e4567-e89b-12d3-a456-426614174000',
    })
  })

  it('returns payment required without delivering a summary', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          status: 'insufficient_balance',
          usageEventId: 'evt_124',
          required: '2.00000000',
          available: '1.00000000',
          asset: 'CKB',
          paymentRequired: true,
        }),
      ),
    )

    const response = await summarize(request())
    const payload = await response.json()

    expect(response.status).toBe(402)
    expect(payload.summary).toBeUndefined()
    expect(payload).toMatchObject({
      error: { code: 'payment_required' },
      metering: { required: '2.00000000', available: '1.00000000', asset: 'CKB' },
    })
  })

  it('rejects oversized input before calling the SDK', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await summarize(request('x'.repeat(2_001)))

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
