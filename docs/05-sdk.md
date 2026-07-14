# FiberMeter sdk

FiberMeter is reusable Fiber Network infrastructure for prepaid balances, service metering, payment tracking, ledgering, and signed webhooks.

The TypeScript SDK records usage, creates customers and payment requests, reads
balances, and verifies webhook signatures. Client integration is provider
agnostic: the FiberMeter API selects simulated or live settlement through
`FIBER_PROVIDER`.

The package currently ships from this workspace and has not yet been published
to npm; publishing and additional language SDKs are tracked in the roadmap.
