import crypto from 'node:crypto'

export type FiberMeterOptions = {
  apiKey?: string
  token?: string
  baseUrl: string
}

export type UsageRecordResult = {
  status: 'charged' | 'insufficient_balance'
  usageEventId: string
  amount?: string
  asset: string
  balanceRemaining?: string
  quantity?: number
  required?: string
  available?: string
  paymentRequired?: boolean
  idempotent?: boolean
}

export class FiberMeterError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message)
    this.name = 'FiberMeterError'
  }
}

export class FiberMeter {
  constructor(private options: FiberMeterOptions) {}

  // Keep the default for existing untyped SDK methods while individual methods
  // adopt explicit response contracts incrementally.
  private async request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = {
      'content-type': 'application/json',
      ...(this.options.apiKey ? { 'x-api-key': this.options.apiKey } : {}),
      ...(this.options.token ? { authorization: `Bearer ${this.options.token}` } : {}),
      ...(init.headers as object),
    }

    const response = await fetch(`${this.options.baseUrl.replace(/\/$/, '')}/api${path}`, {
      ...init,
      headers,
    })

    const text = await response.text()
    let body: unknown = null

    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        body = text
      }
    }

    if (!response.ok) {
      throw new FiberMeterError(`FiberMeter request failed with status ${response.status}`, response.status, body)
    }

    return body as T
  }

  recordUsage(input: {
    service: string
    customer: string
    metricKey: string
    quantity: number
    idempotencyKey: string
    metadata?: Record<string, unknown>
  }): Promise<UsageRecordResult> {
    return this.request<UsageRecordResult>('/usage-events', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  createCustomer(input: { externalId: string; name?: string; email?: string; metadata?: Record<string, unknown> }) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  createPaymentRequest(input: { customerId: string; amount: string; asset: string; metadata?: Record<string, unknown> }) {
    return this.request('/payment-requests', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  getBalance(customerId: string, asset = 'CKB') {
    return this.request(`/customers/${customerId}/balances/${asset}`)
  }
}

export function verifyWebhookSignature(payload: string, signature: string, secret: string, timestamp: string) {
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')

  if (!/^[0-9a-f]{64}$/i.test(signature) || signature.length !== expected.length) {
    return false
  }

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}
