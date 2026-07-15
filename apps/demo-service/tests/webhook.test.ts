import { createHmac } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import webhook from '../netlify/functions/fibermeter-webhook'

const secret = 'test_webhook_secret'
const payload = JSON.stringify({ usageEventId: 'evt_123', amount: '1', asset: 'CKB' })

const makeRequest = (signature: string, timestamp = Date.now().toString()) =>
  new Request('https://demo.example/api/webhooks/fibermeter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-FiberMeter-Event': 'usage.charged',
      'X-FiberMeter-Signature': signature,
      'X-FiberMeter-Timestamp': timestamp,
    },
    body: payload,
  })

describe('FiberMeter webhook receiver', () => {
  beforeEach(() => {
    process.env.FIBERMETER_WEBHOOK_SECRET = secret
  })

  afterEach(() => {
    vi.useRealTimers()
    delete process.env.FIBERMETER_WEBHOOK_SECRET
  })

  it('accepts a current, correctly signed event', async () => {
    const timestamp = Date.now().toString()
    const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')

    const response = await webhook(makeRequest(signature, timestamp))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true, event: 'usage.charged' })
  })

  it('rejects an invalid signature', async () => {
    const response = await webhook(makeRequest('invalid'))

    expect(response.status).toBe(401)
  })

  it('rejects a signed event with a stale timestamp', async () => {
    const timestamp = (Date.now() - 10 * 60 * 1_000).toString()
    const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')

    const response = await webhook(makeRequest(signature, timestamp))

    expect(response.status).toBe(401)
  })
})
