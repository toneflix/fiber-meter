import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { env } from '../src/config/env.js'
import { paymentRequestService } from '../src/modules/payment-requests/payment-request.service.js'

const original = {
  enabled: env.fiberDemoAutopay,
  currency: env.fiberCurrency,
  max: env.fiberDemoMaxPaymentCkb,
}

describe('hosted demo payment guardrails', () => {
  beforeEach(() => {
    env.fiberDemoAutopay = true
    env.fiberCurrency = 'Fibt'
    env.fiberDemoMaxPaymentCkb = 5
  })

  afterEach(() => {
    env.fiberDemoAutopay = original.enabled
    env.fiberCurrency = original.currency
    env.fiberDemoMaxPaymentCkb = original.max
  })

  it('rejects requests above the configured CKB cap before creating an invoice', async () => {
    await expect(
      paymentRequestService.create('dev_test', {
        customerId: 'cus_test',
        amount: '5.01',
        asset: 'CKB',
      }),
    ).rejects.toMatchObject({ code: 'demo_payment_limit', status: 400 })
  })

  it('refuses to run the automated payer outside Fiber testnet', async () => {
    env.fiberCurrency = 'Fibb'

    await expect(
      paymentRequestService.create('dev_test', {
        customerId: 'cus_test',
        amount: '1',
        asset: 'CKB',
      }),
    ).rejects.toMatchObject({ code: 'demo_testnet_only', status: 403 })
  })

  it('rejects non-positive amounts in every provider mode', async () => {
    env.fiberDemoAutopay = false

    await expect(
      paymentRequestService.create('dev_test', {
        customerId: 'cus_test',
        amount: '0',
        asset: 'CKB',
      }),
    ).rejects.toMatchObject({ code: 'validation_error', status: 400 })
  })
})
