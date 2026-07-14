# FiberMeter overview

FiberMeter is reusable Fiber Network infrastructure for prepaid balances, service metering, payment tracking, ledgering, and signed webhooks.

## What is working

- Express API, Prisma/PostgreSQL data model, usage charging, insufficient-balance responses, append-only ledger entries, and signed webhook delivery.
- React dashboard, AI Summary demo service, TypeScript SDK, and Docker deployment.
- Live Fiber invoice creation and settlement verification, plus payer-side preflight checks and on-chain channel-funding proof.

## Payment modes

`SimulatedFiberPaymentProvider` is the zero-dependency default and generates
`fiber-sim://` payment URIs. `LiveFiberPaymentProvider` calls a real Fiber node
to create `fibt1...` invoices and credits balances only after `get_invoice`
confirms settlement. Live operation requires funded Fiber nodes and channels;
see [08-fiber-integration.md](08-fiber-integration.md).

## Production hardening

Rate limiting, scoped API keys, secrets management, queue-backed webhook retries,
audit logs, and a hosted-node/LSP adapter remain roadmap items.
