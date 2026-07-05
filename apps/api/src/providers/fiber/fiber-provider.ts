import crypto from 'node:crypto'

export interface FiberPaymentProvider {
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

export class SimulatedFiberPaymentProvider implements FiberPaymentProvider {
  async createPaymentRequest(input: { amount: string; asset: string; customerId: string }) {
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
  async createPaymentRequest(): Promise<{
    paymentUri: string
    providerReference: string
    expiresAt: Date
  }> {
    throw new Error('Live Fiber provider placeholder: wire Fiber node / wallet RPC here')
  }

  async verifyPayment() {
    return {
      paid: false,
      raw: { todo: 'Implement live Fiber settlement verification' },
    }
  }
}

export const fiberProvider = new SimulatedFiberPaymentProvider()
