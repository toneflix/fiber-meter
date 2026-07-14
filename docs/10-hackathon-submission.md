# FiberMeter — Hackathon Submission

**Usage-based billing and prepaid service-metering infrastructure for Fiber Network.**

## Project summary

FiberMeter lets developers and service providers meter usage and collect payments
on Fiber Network without rebuilding billing from scratch. It provides reusable
primitives — prepaid balances, pricing rules, usage metering, payment requests,
an append-only ledger, and signed webhooks — so anyone can launch paid APIs, AI
tools, webhook products, subscriptions, and pay-as-you-go services on top of Fiber.

Think **Stripe Billing + usage metering + prepaid wallet credits, but Fiber-native
and open-source.**

## Category

Merchant, Liquidity, LSP, and Multi-Asset Infrastructure. FiberMeter is reusable
infrastructure for merchants, services, wallets, and developers — not a
consumer-facing payment app.

## Run it (for judges) — one command, zero external deps

```bash
docker compose up          # Postgres + API + dashboard + demo service
```

- Dashboard → http://localhost:5173  ·  Demo app → http://localhost:5174  ·  API → http://localhost:4000
- Dashboard login: `demo@fibermeter.dev` / `password123`, or click **Explore in demo mode**.

Defaults to the **simulated** Fiber provider, so the entire flow works with no
Fiber node, faucet, or channels. (Script alternative: `pnpm bootstrap && pnpm dev`.)

**Want real testnet settlement?** The optional **hosted live demo** lets a judge
click *Fund via Fiber* and watch a real `fibt1…` invoice settle end-to-end — an
auto-payer plays the customer, and the dashboard links the on-chain channel
funding tx on the CKB testnet explorer for independent verification. Setup:
[11-live-hosted-demo.md](11-live-hosted-demo.md).

## Demo flow

See [07-demo-walkthrough.md](07-demo-walkthrough.md) for the full script. In short:
a metered **AI Summary API** service is priced at 10 CKB / 1,000 tokens; a customer
holds a prepaid balance; the demo app reports usage; FiberMeter calculates the
charge, deducts the balance, writes a ledger entry, and emits webhooks. Insufficient
balance triggers a payment-required response; a payment request funds the balance;
usage then succeeds.

## What is real vs simulated (honest boundary)

- **Fully working:** developer auth (JWT) + hashed API keys, metered services,
  pricing rules, customers, prepaid balances, payment requests, usage metering with
  decimal-safe money and idempotency, PostgreSQL transactions, append-only ledger,
  signed (HMAC-SHA256) webhook delivery + retries, dashboard CRUD, demo service,
  TypeScript SDK, and an automated test suite.
- **Simulated by default:** Fiber payments via `SimulatedFiberPaymentProvider`
  (`fiber-sim://` URIs + Simulate Paid) — so the product is demoable with zero infra.
- **Real Fiber, proven:** `LiveFiberPaymentProvider` issues real `fibt…` testnet
  invoices via a Fiber node and verifies settlement with `get_invoice`. We completed
  a real end-to-end testnet payment (node→node, invoice **Paid**, balances shifted),
  plus a **Preflight** tool that checks node health, invoice validity, peers,
  liquidity, and route before paying.
- **Live demo, judge-triggerable:** an optional hosted setup
  ([11-live-hosted-demo.md](11-live-hosted-demo.md)) adds an **auto-payer** so a
  judge clicks *Fund via Fiber* and watches a real testnet invoice settle with no
  terminal. The dashboard exposes each channel's **on-chain funding tx with a CKB
  testnet explorer link** (`GET /api/fiber/live-proof`) — the balance is credited
  only after Fiber confirms settlement, and anyone can verify the channel is real.
- **Needs production hardening:** rate limiting, API-key scopes/rotation, secrets
  management, inbound Fiber settlement webhooks, and a hosted-node/LSP adapter for
  nodeless operation. Tracked in [ROADMAP.md](../ROADMAP.md).

## Technical breakdown

pnpm-workspace monorepo: Express/TypeScript API, PostgreSQL/Prisma (migrations +
idempotent seed), a polished React + Tailwind dashboard (TanStack Query over the
live API with an in-browser demo fallback), a React AI-Summary demo service, a
TypeScript SDK, full Docker/`docker compose` support, and Markdown docs. Clean
service-class architecture (PaymentRequest / UsageMetering / Ledger / Webhook /
FiberPaymentProvider), Zod validation, and a consistent error envelope.

## Fiber infrastructure gap addressed

Fiber gives builders a fast payment rail, but every merchant/service otherwise has
to re-implement balance accounting, usage metering, idempotency, payment-state
tracking, and webhook notifications. FiberMeter turns Fiber payments into reusable
billing infrastructure so developers can monetize APIs, AI tools, and microservices
on Fiber without building the money plumbing themselves.

## Alignment with judging

- **Infrastructure, not an app:** reusable billing/metering primitives + an SDK.
- **Works out of the box:** one command, seeded, zero external dependencies.
- **Honest:** clear simulated-vs-live boundary; real Fiber settlement demonstrated.
- **Quality:** typed end-to-end, decimal-safe money, idempotent ingestion,
  transactional balance updates, automated tests, and a phased roadmap.

## Team members

TBD — _fill in before submission._

## Links

- GitHub repository: TBD
- Hosted demo (simulated, zero-setup): TBD
- Hosted **live** demo (real testnet settlement + explorer proof): TBD — see [11-live-hosted-demo.md](11-live-hosted-demo.md)
- Sample on-chain channel funding tx (CKB testnet explorer): TBD
- Video demo: TBD

## AI tooling note

AI tooling was used as an execution accelerator for scaffolding, integration, and
documentation. The architecture, code, and submission are open-source and
developer-focused.

## Future roadmap

Live Fiber provider hardening (inbound settlement webhooks, hosted-node/LSP
adapter), multi-asset settlement, subscriptions and tiered pricing, real-time
analytics, an SDK ecosystem, and scale/observability. Full phased plan in
[ROADMAP.md](../ROADMAP.md).
