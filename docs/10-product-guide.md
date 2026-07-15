# FiberMeter product guide

FiberMeter is usage-based billing and prepaid service-metering infrastructure
for Fiber Network.

## Product summary

FiberMeter lets developers and service providers meter usage and collect
payments on Fiber Network without rebuilding billing primitives for every
product. It combines prepaid balances, pricing rules, usage metering, payment
requests, append-only ledger entries, and signed webhooks so teams can build
paid APIs, AI tools, webhook products, and other pay-as-you-go services.

Conceptually, FiberMeter provides Stripe Billing-style usage metering and
prepaid credits with Fiber-native settlement. It is infrastructure for
merchants, service developers, wallet teams, and node or LSP operators rather
than a consumer wallet.

## Core product flow

1. A developer creates a metered service, pricing rule, and customer.
2. The customer funds a prepaid balance through a payment request.
3. The service records usage through the REST API or JavaScript SDK.
4. FiberMeter calculates the charge and atomically deducts the balance.
5. The usage event and ledger entry provide an accounting trail.
6. A signed `usage.charged` webhook notifies the service's backend.
7. If the balance is insufficient, FiberMeter returns a structured
   payment-required result without delivering the protected service output.

The standalone AI Summary application demonstrates this flow at
<https://demo.fibermeter.toneflix.net>.

## Payment modes

### Simulated provider

`SimulatedFiberPaymentProvider` is the default local-development provider. It
creates `fiber-sim://` payment requests and exposes **Simulate Paid**, allowing
developers to exercise funding, metering, ledger, and webhook behavior without
a Fiber node, faucet funds, or a payment channel.

### Live provider

`LiveFiberPaymentProvider` creates real `fibt1…` invoices through a merchant
Fiber node and verifies settlement using `get_invoice`. The customer pays from
a separate Fiber node or wallet. FiberMeter credits the prepaid balance only
after the payee node confirms that the invoice is paid.

The optional hosted topology runs a payee node and a separate, bounded testnet
payer. The payer automates customer-side settlement for product testing while
the dashboard exposes the channel's on-chain CKB funding transaction. See the
[hosted live deployment runbook](11-live-hosted-demo.md).

## Current capabilities

- Developer registration and JWT authentication.
- Hashed API keys for usage ingestion.
- Metered services, customers, pricing rules, and per-asset balances.
- Decimal-safe, idempotent usage charging.
- Atomic balance and ledger updates in PostgreSQL transactions.
- Simulated and live Fiber payment providers.
- Real Fiber testnet invoice creation and settlement verification.
- Payment expiry and bounded testnet auto-payment safeguards.
- Signed, timestamped `usage.charged` webhook delivery and manual retry.
- Fiber node, invoice, peer, channel-liquidity, and route diagnostics.
- CKB explorer links for channel-funding transactions.
- React dashboard with live API and in-browser sandbox modes.
- Standalone metered demo service and server-side JavaScript SDK integration.
- Docker Compose and native Ubuntu/systemd deployment options.
- Automated lint, build, unit, and PostgreSQL integration tests.

## Technical architecture

FiberMeter is a pnpm workspace containing:

- An Express and TypeScript API.
- PostgreSQL with Prisma migrations and seed data.
- A React and Tailwind dashboard using TanStack Query.
- A standalone React demo service with Netlify server functions.
- The `@fibermeter/sdk` server-side JavaScript SDK.
- Simulated and live implementations of `FiberPaymentProvider`.
- Native systemd and Docker deployment assets.

Both payment providers converge on the same payment-request, balance, ledger,
usage-metering, and webhook services. Switching payment providers changes the
settlement boundary without replacing the billing engine.

## Local development

Start PostgreSQL, the API, dashboard, and demo service with:

```bash
docker compose up
```

Or use the pnpm workflow:

```bash
pnpm bootstrap
pnpm dev
```

The dashboard is available at `http://localhost:5173`, the standalone demo at
`http://localhost:5174`, and the API at `http://localhost:4000`.

The standard workspace command starts the demo's Vite interface only. Run the
demo through Netlify Dev when testing its server-side metering and webhook
functions; see the [demo service README](../apps/demo-service/README.md).

See the [quickstart](03-quickstart.md) for database setup and the
[demo walkthrough](07-demo-walkthrough.md) for a guided product flow.

## Hosted services

- Dashboard: <https://app.fibermeter.toneflix.net>
- Demo application: <https://demo.fibermeter.toneflix.net>
- API: <https://api.fibermeter.toneflix.net>
- Source: <https://github.com/toneflix/fibermeter>

## Product boundaries

The simulated provider is intended for development and integration testing.
The live provider has completed real Fiber testnet settlement, but production
operation still requires additional controls such as scoped credentials, rate
limiting, automated reconciliation, managed secrets, durable background jobs,
and a hosted-node or LSP adapter.

The maintained implementation plan is in [ROADMAP.md](../ROADMAP.md).
