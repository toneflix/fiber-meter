# FiberMeter Roadmap

**FiberMeter — usage-based billing and prepaid service-metering infrastructure for Fiber Network.**

This roadmap takes FiberMeter from a validated MVP to production-grade,
reusable billing infrastructure. Phases are ordered by dependency and value:
**Phase 0** establishes the product baseline; **Phases 1–8** are the path to a
service developers can build real businesses on.

Legend: `[ ]` planned · `[x]` done. Check items off as they land.

---

## Phase 0 — MVP Completion & Dashboard Integration

Goal: a polished, honest, end-to-end demo. The dashboard, API, demo service,
SDK, and docs all tell one story.

- [x] Replace the placeholder dashboard with the polished dashboard
- [x] Live (real API) + Demo (in-browser) data sources with a mode toggle
- [x] Developer login (JWT) + demo-mode entry + route guard
- [x] Pricing-rule management surfaced per service in the dashboard
- [x] Real API-key create/list on the Quickstart page
- [x] Usage-event filters (service / customer / status)
- [x] Webhook payload inspection + manual retry
- [x] Wire the Demo Service to record usage via the live API in Live mode
- [x] Global toast notifications for mutations (success/error)
- [x] Loading skeletons + empty states on every page in Live mode
- [x] Verify the seed matches the dashboard/demo contracts (dev, service, rule, customer, balance)
- [x] Root README polish: dashboard modes, architecture diagram, roadmap link
- [x] Demo walkthrough script updated for the live/demo dashboard (`docs/07`)
- [x] Product guide updated (`docs/10-product-guide.md`)
- [x] Capture dashboard + demo screenshots (in `docs/screenshots/`)
- [x] Backend test suite: pricing, webhook signature, balance funding, usage charging, insufficient balance, idempotency
- [x] Document and record the product walkthrough (`docs/07-demo-walkthrough.md`)
- [x] Document repository, hosted services, and walkthrough links
- [x] Run the live stack once (Postgres + seed) to confirm end-to-end in Live mode

## Phase 1 — Live Fiber Integration

Goal: connect the billing flow to real Fiber settlement.

- [x] Implement `LiveFiberPaymentProvider` against the Fiber Network node/API
- [x] Generate real Fiber payment URIs / invoices (replace `fiber-sim://`)
- [x] Verify payments through on-demand `get_invoice` polling
- [ ] Add inbound Fiber settlement notifications
- [x] Reconcile confirmed payments → balance funding in a single transaction
- [x] Configurable payment expiry, cancellation, and failure handling
  - Expiry checked on verify; cancel_invoice RPC still optional
- [x] Testnet end-to-end test: fund a balance with a real Fiber payment
- [x] Document the live-vs-simulated boundary in `docs/08-fiber-integration.md`
- [ ] `HostedFiberProvider` / LSP adapter for nodeless live operation (no self-run node)

## Phase 2 — Production Hardening & Security

Goal: safe to run with real money and real customers.

- [ ] Per-key and per-IP rate limiting on ingestion + auth endpoints
- [ ] Idempotency hardening (conflict detection, replay-safe responses)
- [ ] API-key scopes (ingest-only vs full) + rotation + revocation UX
- [ ] Signed, timestamped requests option for server-to-server calls
- [ ] Secrets management (webhook secrets, JWT secret) via env/vault, not defaults
- [ ] Append-only ledger integrity checks + balance reconciliation job
- [ ] Structured request logging (pino) shipped to a sink + request IDs
- [ ] Error tracking (Sentry) across API + dashboard
- [ ] `/health` + `/ready` probes; graceful shutdown; DB connection pooling
- [ ] Zod validation coverage on every write endpoint + consistent error envelope
- [ ] Security review + dependency audit in CI

## Phase 3 — Multi-Tenancy, Teams & RBAC

Goal: teams, not just single developers.

- [ ] Organizations as the top-level tenant; developers belong to orgs
- [ ] Team members with roles (owner / admin / developer / viewer)
- [ ] Permission checks enforced in middleware across all resources
- [ ] Per-organization API keys and webhook secrets
- [ ] Member invitations + email verification
- [ ] OAuth / SSO login (GitHub, Google) alongside password auth
- [ ] Org-scoped audit log of sensitive actions

## Phase 4 — Billing Depth & Metering Features

Goal: cover the pricing models real services need.

- [ ] Subscriptions / recurring plans (interval billing on top of metering)
- [ ] Tiered, volume, and graduated pricing models
- [ ] Free tiers, promotional credits, and grant balances
- [ ] Spending limits, budget alerts, and auto-suspend on exhaustion
- [ ] `balance.low` / `balance.exhausted` threshold events wired end-to-end
- [ ] Prepaid **and** postpaid (invoice-at-period-end) modes
- [ ] Invoicing: line items, PDF export, tax fields
- [ ] Refunds and manual adjustments with dashboard UI + ledger entries
- [ ] Usage aggregation windows + metric rollups for high-volume metrics
- [ ] Multi-asset balances with FX display

## Phase 5 — Real-time & Observability

Goal: a dashboard that feels live and analytics developers act on.

- [ ] Real-time dashboard updates via WebSocket/SSE (no manual refresh)
- [ ] Analytics with Recharts: revenue over time, top customers, usage trends
- [ ] Per-service and per-customer usage/revenue breakdowns
- [ ] Webhook delivery retries with exponential backoff + dead-letter queue
- [ ] Alerting on failed webhooks, low balances, and error spikes
- [ ] CSV / JSON export for usage, ledger, and payments
- [ ] Prometheus metrics + Grafana dashboards for the API

## Phase 6 — Developer Experience & SDK Ecosystem

Goal: make FiberMeter trivial to adopt.

- [ ] Publish `@fibermeter/sdk` to npm with semver + changelog
- [ ] Official Python and Go SDKs
- [ ] `fibermeter` CLI (create keys, tail usage, replay webhooks)
- [ ] OpenAPI spec generated from the API + hosted reference docs
- [ ] Postman / Insomnia collection
- [ ] Hosted sandbox environment with reset-able demo data
- [ ] Embeddable pricing table + checkout/fund widgets
- [ ] Framework examples (Next.js, Express, Hono, Cloudflare Workers)

## Phase 7 — Deployment & Scale

Goal: run reliably under load.

- [x] Production Docker images for api / dashboard / demo-service
- [x] Full `docker-compose` stack (Postgres + all apps) for one-command local run
- [x] `pnpm bootstrap` script (install + Postgres + migrate + seed) as a non-Docker path
- [x] API auto-migrates + seeds on boot; ships `simulated` by default (zero external deps)
- [ ] Kubernetes manifests / Helm chart
- [ ] CI/CD: lint, typecheck, test, migrate, build, deploy
- [ ] Background job queue (BullMQ) for webhook delivery + aggregation
- [ ] Redis caching for hot reads (balances, pricing rules)
- [ ] Read replicas + connection pooling (PgBouncer) for scale
- [ ] Load testing + documented capacity/SLO targets

## Phase 8 — Compliance & Go-to-Market

Goal: something a business can safely depend on and adopt.

- [ ] Data retention policy + GDPR export/delete for customer data
- [ ] SOC 2 readiness posture + security documentation
- [ ] Public status page + incident process
- [ ] Customer-facing billing portal (view balance, top up, history)
- [ ] Documentation site (versioned) + guides and tutorials
- [ ] Marketing landing page with clear infrastructure positioning
- [ ] Pricing/packaging for FiberMeter itself (self-host vs hosted)

---

### How the phases map to product maturity

- **Phase 0** is the product baseline — reusable infrastructure, a clear
  simulated-vs-live boundary, and an end-to-end working flow.
- **Phase 1** is the single most credible "next step": swap the simulated
  provider for real Fiber settlement behind the existing `FiberPaymentProvider`
  interface — no rewrites required.
- **Phases 2–8** develop FiberMeter into durable infrastructure,
  not a one-off app.
