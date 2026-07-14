# FiberMeter webhooks

FiberMeter is reusable Fiber Network infrastructure for prepaid balances, service metering, payment tracking, ledgering, and signed webhooks.

FiberMeter emits the same signed billing events in simulated and live payment
modes. In live mode, `balance.funded` is emitted only after Fiber RPC confirms
that the invoice is paid; simulated mode is explicitly marked and intended for
local evaluation.

Webhook payloads are signed with HMAC-SHA256. Delivery attempts are recorded and
can be inspected or retried from the dashboard. Queue-backed exponential retry
and dead-letter handling remain production-hardening work.
