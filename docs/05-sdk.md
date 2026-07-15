# FiberMeter JavaScript SDK

The FiberMeter SDK records metered usage, manages customers and payment
requests, reads balances, and verifies signed webhooks from Node.js and other
server-side JavaScript runtimes.

## Requirements

- Node.js 20 or another runtime with the standard `fetch` API
- A FiberMeter API origin, such as `https://api.fibermeter.example`
- An API key for usage ingestion, or a dashboard JWT for management methods

Keep API keys, JWTs, and webhook secrets on the server. Do not put them in
browser bundles or variables prefixed with `VITE_`, `NEXT_PUBLIC_`, or an
equivalent public prefix.

## Installation

```sh
pnpm add @fibermeter/sdk
```

In this monorepo, another workspace package can use:

```json
{
  "dependencies": {
    "@fibermeter/sdk": "workspace:^"
  }
}
```

## Create a client

Pass the API origin without `/api`; the SDK appends `/api` to every request.

### Usage-ingestion client

Use an API key created on the dashboard's **Quickstart** page:

```ts
import { FiberMeter } from '@fibermeter/sdk'

const meter = new FiberMeter({
  baseUrl: process.env.FIBERMETER_API_URL!,
  apiKey: process.env.FIBERMETER_API_KEY!,
})
```

### Management client

Customer, balance, and payment-request endpoints use a dashboard JWT:

```ts
const management = new FiberMeter({
  baseUrl: process.env.FIBERMETER_API_URL!,
  token: process.env.FIBERMETER_DASHBOARD_TOKEN!,
})
```

Use separate ingestion and management clients. If both credentials are added
to the same client, the `Authorization` header takes precedence when the API
authenticates a usage event.

## Record usage

```ts
const result = await meter.recordUsage({
  service: 'ai-summary',
  customer: 'cus_demo_001',
  metricKey: 'tokens',
  quantity: 1250,
  idempotencyKey: crypto.randomUUID(),
  metadata: {
    model: 'summary-v1',
    requestId: 'request_123',
  },
})
```

The fields are:

| Field | Meaning |
| --- | --- |
| `service` | Metered-service slug owned by the API-key developer. |
| `customer` | External customer ID, not the database UUID. |
| `metricKey` | Active pricing-rule metric, such as `tokens`. |
| `quantity` | Positive numeric usage quantity. |
| `idempotencyKey` | Unique operation key used to prevent duplicate charges. |
| `metadata` | Optional JSON metadata stored with the usage event. |

When the customer has sufficient prepaid balance:

```json
{
  "status": "charged",
  "usageEventId": "...",
  "customer": "cus_demo_001",
  "service": "ai-summary",
  "metricKey": "tokens",
  "quantity": 1250,
  "amount": "12.5",
  "asset": "CKB",
  "balanceRemaining": "87.5"
}
```

When the balance is insufficient, FiberMeter still records the rejected usage
attempt but does not return the protected service result:

```json
{
  "status": "insufficient_balance",
  "usageEventId": "...",
  "required": "12.5",
  "available": "5",
  "asset": "CKB",
  "paymentRequired": true
}
```

Treat `idempotencyKey` as part of the operation. Retrying the same operation
must reuse the same key; a genuinely new operation must use a new key.

## Create a customer

This management method requires a JWT client:

```ts
const customer = await management.createCustomer({
  externalId: 'cus_acme_001',
  name: 'Acme Labs',
  email: 'billing@acme.example',
  metadata: { plan: 'developer' },
})
```

`externalId` must be unique within the developer account. Save both returned
identifiers: usage calls use `externalId`, while balance and payment-request
methods use the returned database `id`.

## Create a payment request

```ts
const payment = await management.createPaymentRequest({
  customerId: customer.id,
  amount: '5',
  asset: 'CKB',
  metadata: { orderId: 'order_123' },
})

console.log(payment.paymentUri)
console.log(payment.expiresAt)
```

Amounts are decimal strings. `customerId` is the database ID returned by
`createCustomer` or `GET /api/customers`, not the external customer ID.

In live mode the returned URI is a real Fiber invoice. The balance is credited
only after the payment request is verified as paid.

## Read a balance

```ts
const balance = await management.getBalance(customer.id, 'CKB')

console.log(balance.availableBalance)
console.log(balance.totalFunded)
console.log(balance.totalSpent)
```

The asset defaults to `CKB`. Monetary values are returned as decimal strings;
do not convert them to floating-point numbers for accounting logic.

## Handle API errors

Non-2xx responses throw `FiberMeterError`. It preserves the HTTP status and the
parsed response body:

```ts
import { FiberMeterError } from '@fibermeter/sdk'

try {
  await meter.recordUsage(input)
} catch (error) {
  if (error instanceof FiberMeterError) {
    console.error(error.status)
    console.error(error.body)
  } else {
    // Network error, timeout, or runtime failure.
    throw error
  }
}
```

An insufficient balance is a successful metering response with
`status: 'insufficient_balance'`; it is not thrown as `FiberMeterError`.

## Webhooks

FiberMeter currently emits `usage.charged` to the webhook URL configured on the
metered service. Delivery uses these headers:

| Header | Meaning |
| --- | --- |
| `X-FiberMeter-Event` | Event type, currently `usage.charged`. |
| `X-FiberMeter-Timestamp` | Millisecond Unix timestamp used in the signature. |
| `X-FiberMeter-Signature` | Lowercase hexadecimal HMAC-SHA256 signature. |

The signed value is:

```text
HMAC_SHA256(webhookSecret, timestamp + "." + rawRequestBody)
```

An emitted `usage.charged` payload has this shape:

```json
{
  "usageEventId": "...",
  "customer": "cus_demo_001",
  "service": "ai-summary",
  "amount": "12.5",
  "asset": "CKB"
}
```

Verification must use the raw request body, before JSON parsing changes its
bytes. Register an Express raw-body route before any global `express.json()`
middleware:

```ts
import express from 'express'
import { verifyWebhookSignature } from '@fibermeter/sdk'

const app = express()
const fiveMinutes = 5 * 60 * 1000

app.post(
  '/webhooks/fibermeter',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const payload = req.body.toString('utf8')
    const signature = String(req.headers['x-fibermeter-signature'] ?? '')
    const timestamp = String(req.headers['x-fibermeter-timestamp'] ?? '')
    const event = String(req.headers['x-fibermeter-event'] ?? '')
    const timestampNumber = Number(timestamp)

    const current =
      Number.isFinite(timestampNumber) &&
      Math.abs(Date.now() - timestampNumber) <= fiveMinutes

    const valid =
      current &&
      verifyWebhookSignature(
        payload,
        signature,
        process.env.FIBERMETER_WEBHOOK_SECRET!,
        timestamp,
      )

    if (!valid) {
      return res.status(401).json({ error: 'invalid signature' })
    }

    const body = JSON.parse(payload)

    if (event === 'usage.charged') {
      console.log(body.usageEventId, body.amount, body.asset)
    }

    return res.status(200).json({ received: true })
  },
)

// Register JSON parsing after the raw webhook route.
app.use(express.json())
```

For Fetch-compatible server runtimes, read `await request.text()` once and pass
that exact string to `verifyWebhookSignature` before calling `JSON.parse`.

Return a 2xx response only after authentication and durable acceptance. Failed
deliveries are recorded by FiberMeter and can be retried from the dashboard.
Retries use the service's current webhook URL and secret.

## Security checklist

- Store API keys, JWTs, and webhook secrets only in server-side secret storage.
- Use HTTPS for the API and webhook target.
- Reject stale webhook timestamps to reduce replay risk.
- Verify the signature before parsing or acting on a webhook.
- Make webhook handlers idempotent using a stable event identifier from the
  payload, such as `usageEventId`.
- Acknowledge quickly and move slow downstream work to your own queue.

## Local development

Build and test the SDK from the repository root:

```sh
pnpm --filter @fibermeter/sdk build
pnpm --filter @fibermeter/sdk test
```

The SDK test suite covers typed usage responses, structured API errors, valid
webhook signatures, and malformed-signature handling.
