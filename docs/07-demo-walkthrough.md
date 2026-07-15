# FiberMeter demo walkthrough

FiberMeter is reusable Fiber Network infrastructure for prepaid balances, service
metering, payment tracking, ledgering, and signed webhooks.

## What is working

- **API** — Express + Prisma, seed data, simulated Fiber payment requests, usage
  charging, insufficient-balance handling, append-only ledger entries, and webhook
  delivery records.
- **Dashboard** — polished React app covering services, pricing rules, customers,
  balances, payment requests, usage events, webhooks, and a developer quickstart.
  Runs against the **live API** (JWT) or a fully **in-browser demo** engine.
- **Demo Service** — an AI Summary API that meters usage through FiberMeter.
- **SDK** — TypeScript SDK; **Docker** PostgreSQL setup.

## Payment modes

The zero-setup walkthrough uses `SimulatedFiberPaymentProvider`, generating
`fiber-sim://` URIs and exposing **Simulate Paid**. The hosted live walkthrough
uses `LiveFiberPaymentProvider` to create real `fibt1...` invoices; an independent
payer node settles them, and FiberMeter credits the balance only after Fiber RPC
confirms payment. See [08-fiber-integration.md](08-fiber-integration.md).

## Two ways to demo

- **Live** — run the API (`pnpm dev` after seeding) and sign in at the dashboard
  with `demo@fibermeter.dev` / `password123`. Everything reads/writes PostgreSQL.
- **Demo (no backend)** — `pnpm --filter @fibermeter/dashboard dev`, then click
  **Explore in demo mode**. The whole flow runs client-side — perfect for a video.

The header badge always shows **Live** vs **Demo**.

## Demo script (2–3 minutes)

1. Open the dashboard. Note the mode badge (Live or Demo).
2. **Overview** — stat cards: funded, usage charged, customers, usage events.
3. **Services** — open _AI Summary API_; show the pricing rule **10 CKB per 1,000
   tokens** and copy the service slug.
4. **Customers** — _Ada Demo_ (`cus_demo_001`) with a **100 CKB** balance.
5. **Quickstart** — create an API key; copy it once.
6. Open the standalone **Demo Service** at `https://demo.fibermeter.toneflix.net`.
7. Paste text and click **Summarize** → usage is recorded.
8. FiberMeter calculates the charge and deducts the balance.
9. Back on **Usage Events**, the charge appears (filter by status = charged).
10. **Webhooks** — expand the `usage.charged` delivery payload.
11. In the demo app, submit a very large text that exceeds the balance.
12. See the **insufficient balance / payment required** response.
13. **Payment Requests** — create a request for the customer; copy the payment URI.
14. Click **Simulate Paid** (the simulated Fiber payment).
15. The balance is funded; a `balance.funded` webhook is emitted.
16. Retry the summary → it now succeeds.

## Production hardening

Live Fiber verification, queue-backed webhook retries, balance-locking review,
rate limits, audit logs, secrets management, and hosted deployments. See
[ROADMAP.md](../ROADMAP.md).
