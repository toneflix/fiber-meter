# FiberMeter demo walkthrough

FiberMeter is reusable Fiber Network infrastructure for prepaid balances, service metering, payment tracking, ledgering, and signed webhooks.

## What is working

- Express API, Prisma schema, seed data, simulated Fiber payment requests, usage charging, insufficient-balance responses, ledger entries, and webhook delivery records.
- React dashboard shell, AI Summary demo shell, TypeScript SDK, Docker PostgreSQL setup.

## What is simulated

The MVP uses `SimulatedFiberPaymentProvider`, generating `fiber-sim://pay?...` URIs and a `/simulate-paid` endpoint. The `LiveFiberPaymentProvider` is a clean placeholder for wallet/node RPC settlement verification.

## Production hardening

Add live Fiber verification, queue-backed webhook retries, row-level balance locking strategy review, rate limits, audit logs, secrets management, and hosted deployments.

## Demo script

1. Open dashboard overview.
2. Show AI Summary API service.
3. Show pricing rule: 10 CKB per 1,000 tokens.
4. Show customer balance: 100 CKB.
5. Open demo AI Summary app.
6. Submit text.
7. Demo app records usage.
8. FiberMeter deducts balance.
9. Dashboard shows usage charged.
10. Show webhook delivery.
11. Submit larger usage that exceeds balance.
12. Show insufficient balance.
13. Create payment request.
14. Simulate Fiber payment.
15. Show balance funded.
16. Retry usage successfully.
