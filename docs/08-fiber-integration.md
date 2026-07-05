# FiberMeter fiber integration

FiberMeter is reusable Fiber Network infrastructure for prepaid balances, service metering, payment tracking, ledgering, and signed webhooks.

## What is working

- Express API, Prisma schema, seed data, simulated Fiber payment requests, usage charging, insufficient-balance responses, ledger entries, and webhook delivery records.
- React dashboard shell, AI Summary demo shell, TypeScript SDK, Docker PostgreSQL setup.

## What is simulated

The MVP uses `SimulatedFiberPaymentProvider`, generating `fiber-sim://pay?...` URIs and a `/simulate-paid` endpoint. The `LiveFiberPaymentProvider` is a clean placeholder for wallet/node RPC settlement verification.

## Production hardening

Add live Fiber verification, queue-backed webhook retries, row-level balance locking strategy review, rate limits, audit logs, secrets management, and hosted deployments.
