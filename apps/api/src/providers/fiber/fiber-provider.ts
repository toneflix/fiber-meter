import crypto from 'node:crypto'

import { env } from '../../config/env.js'
import { ApiError } from '../../utils/errors.js'
import { FiberRpcClientError, getInvoice, newInvoice } from '../../modules/preflight/rpc.js'

export interface FiberPaymentProvider {
  readonly name: 'simulated' | 'live'

  createPaymentRequest(input: {
    amount: string
    asset: string
    customerId: string
    metadata?: Record<string, unknown>
  }): Promise<{
    paymentUri: string
    providerReference: string
    expiresAt: Date
  }>

  verifyPayment(providerReference: string): Promise<{
    paid: boolean
    paidAt?: Date
    raw?: unknown
  }>
}

/** Convert decimal CKB string (e.g. "1.5") to shannon hex for Fiber RPC. */
export function ckbAmountToShannonsHex(amount: string): string {
  const trimmed = amount.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new ApiError('validation_error', `Invalid CKB amount: ${amount}`)
  }
  const [whole, frac = ''] = trimmed.split('.')
  const fracPadded = `${frac}00000000`.slice(0, 8)
  const shannons = BigInt(whole || '0') * BigInt(100_000_000) + BigInt(fracPadded)
  if (shannons <= BigInt(0)) {
    throw new ApiError('validation_error', 'Amount must be greater than zero')
  }
  return `0x${shannons.toString(16)}`
}

function randomPreimage(): string {
  return `0x${crypto.randomBytes(32).toString('hex')}`
}

function statusKey(status: unknown): string {
  if (typeof status === 'string') return status
  if (status && typeof status === 'object') {
    return Object.keys(status as Record<string, unknown>)[0] ?? ''
  }
  return ''
}

export class SimulatedFiberPaymentProvider implements FiberPaymentProvider {
  readonly name = 'simulated' as const

  async createPaymentRequest(input: {
    amount: string
    asset: string
    metadata?: object
    customerId: string
  }) {
    const providerReference = `sim_${crypto.randomUUID()}`

    return {
      paymentUri: `fiber-sim://pay?amount=${input.amount}&asset=${input.asset}&ref=${providerReference}`,
      providerReference,
      expiresAt: new Date(Date.now() + 30 * 60_000),
    }
  }

  async verifyPayment() {
    return {
      paid: true,
      paidAt: new Date(),
      raw: { simulated: true },
    }
  }
}

export class LiveFiberPaymentProvider implements FiberPaymentProvider {
  readonly name = 'live' as const

  async createPaymentRequest(input: {
    amount: string
    asset: string
    customerId: string
    metadata?: Record<string, unknown>
  }) {
    if (input.asset.toUpperCase() !== 'CKB') {
      throw new ApiError(
        'unsupported_asset',
        `Live Fiber invoices currently support CKB only (got ${input.asset})`,
        400,
      )
    }

    const amountHex = ckbAmountToShannonsHex(input.amount)
    const expirySecs = env.fiberInvoiceExpirySecs
    const description =
      typeof input.metadata?.description === 'string'
        ? input.metadata.description
        : `FiberMeter top-up for customer ${input.customerId}`

    try {
      const result = await newInvoice({
        amount: amountHex,
        currency: env.fiberCurrency,
        description,
        expiry: `0x${expirySecs.toString(16)}`,
        payment_preimage: randomPreimage(),
        hash_algorithm: 'sha256',
      })

      const paymentHash = result.invoice.data.payment_hash
      if (!paymentHash) {
        throw new ApiError('fiber_error', 'Fiber new_invoice returned no payment_hash', 502)
      }

      return {
        paymentUri: result.invoice_address,
        providerReference: paymentHash,
        expiresAt: new Date(Date.now() + expirySecs * 1000),
      }
    } catch (err) {
      if (err instanceof ApiError) throw err
      const message =
        err instanceof FiberRpcClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to create Fiber invoice'
      throw new ApiError('fiber_error', message, 502)
    }
  }

  async verifyPayment(providerReference: string) {
    try {
      const result = await getInvoice(providerReference)
      const key = statusKey(result.status)
      const paid = key.toLowerCase() === 'paid'

      return {
        paid,
        paidAt: paid ? new Date() : undefined,
        raw: result,
      }
    } catch (err) {
      const message =
        err instanceof FiberRpcClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to verify Fiber invoice'
      throw new ApiError('fiber_error', message, 502)
    }
  }
}

export function createFiberPaymentProvider(): FiberPaymentProvider {
  return env.fiberProvider === 'live'
    ? new LiveFiberPaymentProvider()
    : new SimulatedFiberPaymentProvider()
}

export const fiberProvider = createFiberPaymentProvider()
