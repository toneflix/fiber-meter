# FiberMeter roadmap

FiberMeter is reusable Fiber Network infrastructure for prepaid balances, service metering, payment tracking, ledgering, and signed webhooks.

The current MVP includes both a zero-dependency simulated payment path and a
live provider that creates real Fiber invoices and verifies settlement through
node RPC. The remaining work is product hardening and expansion, not replacing
a provider placeholder.

The maintained phased checklist lives in [ROADMAP.md](../ROADMAP.md). Its next
priorities are rate limiting, scoped credentials, reconciliation, observability,
multi-tenant access control, deeper pricing models, and a hosted-node/LSP adapter.
