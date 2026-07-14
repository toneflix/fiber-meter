# FiberMeter architecture

FiberMeter is reusable Fiber Network infrastructure for prepaid balances, service metering, payment tracking, ledgering, and signed webhooks.

## Provider boundary

The billing engine depends on a `FiberPaymentProvider` interface. The simulated
provider supplies a zero-infrastructure local path; the live provider calls
Fiber `new_invoice` and `get_invoice` RPC methods. Both converge on the same
transactional balance, ledger, usage, and webhook services.

The hosted audit topology uses separate payee and payer nodes. FiberMeter
issues invoices on the payee; the bounded auto-payer settles them from the payer;
the API credits a balance only after the payee reports the invoice as paid. See
[08-fiber-integration.md](08-fiber-integration.md) and
[11-live-hosted-demo.md](11-live-hosted-demo.md).

## Production hardening

Rate limiting, scoped API keys, secrets management, queue-backed webhook retries,
audit logs, and a hosted-node/LSP adapter remain roadmap items.
