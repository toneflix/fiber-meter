# FiberMeter documentation

This directory contains the product, integration, deployment, and operations
documentation for FiberMeter. Start with the path that matches what you are
trying to do.

## Choose a path

| Goal | Start here | Continue with |
| --- | --- | --- |
| Understand FiberMeter | [Overview](01-overview.md) | [Architecture](02-architecture.md) |
| Run it locally | [Quickstart](03-quickstart.md) | [Demo walkthrough](07-demo-walkthrough.md) |
| Integrate a service | [API reference](04-api-reference.md) | [JavaScript SDK](05-sdk.md), [Webhooks](06-webhooks.md) |
| Operate real Fiber settlement | [Fiber integration](08-fiber-integration.md) | [Hosted live demo](11-live-hosted-demo.md) |
| Understand product capabilities | [Product guide](10-product-guide.md) | [Demo walkthrough](07-demo-walkthrough.md), [Hosted live demo](11-live-hosted-demo.md) |
| Plan future work | [Roadmap summary](09-roadmap.md) | [Maintained roadmap](../ROADMAP.md) |

## Documentation index

### Product and setup

1. [FiberMeter overview](01-overview.md) — product scope, working capabilities,
   payment modes, and remaining production hardening.
2. [Architecture](02-architecture.md) — provider boundary, billing engine, and
   hosted payee/payer topology.
3. [Quickstart](03-quickstart.md) — local setup with or without Docker, database
   initialization, seed data, and application startup.

### Developer integration

4. [API reference](04-api-reference.md) — REST authentication, payment modes,
   and live-provider API boundaries.
5. [JavaScript SDK](05-sdk.md) — installation, API-key and JWT clients, usage
   metering, customers, balances, payment requests, errors, and idempotency.
6. [Webhooks](06-webhooks.md) — delivery headers, HMAC verification, timestamp
   policy, failure inspection, and retry behavior.

### Demonstration and Fiber operations

7. [Demo walkthrough](07-demo-walkthrough.md) — guided dashboard, funding,
   metering, ledger, and webhook flow.
8. [Fiber integration](08-fiber-integration.md) — simulated and live providers,
   node configuration, RPC boundaries, channels, and settlement verification.
9. [Roadmap summary](09-roadmap.md) — current delivery status and links to the
   actively maintained project roadmap.
10. [Product guide](10-product-guide.md) — product positioning, supported flows,
    current capabilities, technical architecture, and product boundaries.

### Hosted deployment and transfer notes

- [Hosted live demo](11-live-hosted-demo.md) — persistent testnet
  deployment, auto-payer flow, and on-chain channel-funding evidence.
- [PayReady transfer](11-payready-transfer.md) — provenance and integration map
  for the operator-facing Fiber preflight diagnostics.
- [Native Ubuntu deployment](../deploy/native/README.md) — reusable systemd,
  PostgreSQL, Nginx, and native Fiber-node deployment guide.

## Supporting material

- [Screenshot catalog](screenshots/README.md) — maintained dashboard and demo
  captures used by the project documentation.
- [Repository README](../README.md) — project entry point, feature summary, and
  common commands.
- [Project roadmap](../ROADMAP.md) — phased implementation and hardening plan.

## Documentation conventions

- Examples use `http://localhost:4000` as the API origin unless a hosted URL is
  explicitly required. The JavaScript SDK appends `/api` itself.
- Monetary values are decimal strings. Avoid floating-point arithmetic for
  accounting and settlement logic.
- API keys, dashboard JWTs, node credentials, and webhook secrets are
  server-side secrets and must not be embedded in browser bundles.
- Simulated mode is the default local path. Live-mode instructions are marked
  explicitly and require funded Fiber nodes and an available channel.
