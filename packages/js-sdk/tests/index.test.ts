import { afterEach, describe, expect, it, vi } from 'vitest'

import { createHmac } from 'node:crypto'

import { FiberMeter, FiberMeterError, verifyWebhookSignature } from '../src/index.js'

describe('FiberMeter SDK', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns typed usage results', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({ status: 'charged', usageEventId: 'evt_1', amount: '1', asset: 'CKB' }),
      ),
    )

    const client = new FiberMeter({ baseUrl: 'https://meter.example/', apiKey: 'secret' })
    const result = await client.recordUsage({
      service: 'summary',
      customer: 'cus_1',
      metricKey: 'tokens',
      quantity: 10,
      idempotencyKey: 'usage_1',
    })

    expect(result.status).toBe('charged')
    expect(result.usageEventId).toBe('evt_1')
  })

  it('exposes structured API errors without losing the response body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({ error: { code: 'not_found', message: 'Service not found' } }, { status: 404 }),
      ),
    )

    const client = new FiberMeter({ baseUrl: 'https://meter.example', apiKey: 'secret' })

    await expect(
      client.recordUsage({
        service: 'missing',
        customer: 'cus_1',
        metricKey: 'tokens',
        quantity: 10,
        idempotencyKey: 'usage_2',
      }),
    ).rejects.toMatchObject<Partial<FiberMeterError>>({
      name: 'FiberMeterError',
      status: 404,
      body: { error: { code: 'not_found', message: 'Service not found' } },
    })
  })

  it('verifies webhook signatures without throwing on malformed input', () => {
    const payload = '{"ok":true}'
    const timestamp = '1721000000000'
    const secret = 'webhook_secret'
    const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')

    expect(verifyWebhookSignature(payload, signature, secret, timestamp)).toBe(true)
    expect(verifyWebhookSignature(payload, 'invalid', secret, timestamp)).toBe(false)
  })
})
