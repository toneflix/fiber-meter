# FiberMeter api reference

FiberMeter is reusable Fiber Network infrastructure for prepaid balances, service metering, payment tracking, ledgering, and signed webhooks.

The API supports both payment modes. Simulated mode exposes the development-only
`simulate-paid` action; live mode creates real Fiber invoices and exposes
`verify`, preflight, node-health, and live-proof endpoints. The balance is
credited through the same transactional service in both modes.

Live-provider setup and the exact RPC boundary are documented in
[08-fiber-integration.md](08-fiber-integration.md).
