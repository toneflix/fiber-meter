# FiberMeter Hackathon Submission

## Project summary

FiberMeter is usage-based billing and prepaid service-metering infrastructure for Fiber Network. It helps developers launch paid APIs, AI tools, webhook products, merchant services, and usage-based infrastructure without rebuilding balance accounting, payment requests, metering, ledgering, and webhooks.

## Category

Merchant, Liquidity, LSP, and Multi-Asset Infrastructure.

## Team members

TBD.

## Links

- GitHub repository: TBD
- Hosted demo: TBD
- Video demo: TBD

## Technical breakdown

Monorepo with Express/TypeScript API, PostgreSQL/Prisma, a polished React
dashboard (TanStack Query over the live API, with an in-browser demo fallback),
a React AI-Summary demo service, a TypeScript SDK, Docker PostgreSQL, and
Markdown docs. The dashboard authenticates developers via JWT and manages hashed
API keys, services, pricing rules, customers, prepaid balances, payment requests,
metered usage, an append-only ledger, and signed webhook deliveries.

## Fiber infrastructure gap addressed

FiberMeter turns Fiber payments into reusable billing primitives: prepaid balances, service pricing rules, payment tracking, metered usage, ledger entries, and signed webhook notifications.

## AI tooling note

AI tooling was used as an execution accelerator for scaffolding and documentation; project architecture and final submission are open-source and developer-focused.

## Future roadmap

Live Fiber provider integration, multi-asset settlement, wallet UX, queue-backed
webhooks, hosted SaaS option, and richer analytics. The full phased plan (Phase 0
hackathon MVP through production, multi-tenancy, subscriptions, real-time
analytics, SDK ecosystem, scale, and go-to-market) is in
[ROADMAP.md](../ROADMAP.md).
