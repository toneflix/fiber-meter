import { describe, expect, it } from 'vitest'

import { createWebhookAuth, signWebhook } from '../src/modules/webhooks/webhook.service.js'

describe('webhook signing', () => {
  it('pairs the transmitted timestamp with its signature', () => {
    const body = JSON.stringify({ event: 'usage.charged' })
    const secret = 'webhook_secret'
    const auth = createWebhookAuth(body, secret, '1721000000000')

    expect(auth).toEqual({
      timestamp: '1721000000000',
      signature: signWebhook(body, secret, '1721000000000'),
    })
  })
})
