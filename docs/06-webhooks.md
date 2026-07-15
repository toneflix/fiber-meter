# FiberMeter webhooks

FiberMeter is reusable Fiber Network infrastructure for prepaid balances, service metering, payment tracking, ledgering, and signed webhooks.

FiberMeter emits the same signed billing events in simulated and live payment
modes. In live mode, `balance.funded` is emitted only after Fiber RPC confirms
that the invoice is paid; simulated mode is explicitly marked and intended for
local evaluation.

## Delivery contract

The current service event is `usage.charged`. FiberMeter sends its JSON payload
with:

- `X-FiberMeter-Event`
- `X-FiberMeter-Signature`
- `X-FiberMeter-Timestamp`

The signature is the lowercase hexadecimal HMAC-SHA256 of
`timestamp + "." + rawRequestBody`, using the metered service's
`webhookSecret`. Receivers must verify the exact raw body before parsing JSON.

```ts
import { verifyWebhookSignature } from '@fibermeter/sdk'

const valid = verifyWebhookSignature(
  rawBody,
  signature,
  process.env.FIBERMETER_WEBHOOK_SECRET!,
  timestamp,
)
```

The SDK helper performs constant-time signature comparison and safely returns
`false` for malformed signatures. Timestamp freshness is an application policy;
receivers should reject timestamps older than five minutes.

The complete Express receiver, Fetch-runtime guidance, payload examples, and
security checklist are in the
[JavaScript SDK guide](05-sdk.md#webhooks).

## Delivery lifecycle

Delivery attempts and receiver responses are stored in `WebhookDelivery` and
can be inspected or retried from the dashboard. Each attempt is signed using
the timestamp actually transmitted. A retry uses the service's current webhook
URL and secret, which allows endpoint or secret rotation before retrying.

Return a 2xx response only after verifying and durably accepting the event.
Non-2xx responses and network failures are marked `failed`. Queue-backed
exponential retry and dead-letter handling remain production-hardening work.
