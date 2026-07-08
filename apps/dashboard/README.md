# @fibermeter/dashboard

The FiberMeter developer dashboard — services, pricing rules, customers,
prepaid balances, payment requests, usage events, and webhook deliveries for
usage-based billing on Fiber Network.

Built with React + React Router, Tailwind CSS, TanStack Query, and a
shadcn-style UI kit.

## Two data sources

The dashboard runs against either data source, selectable at the login screen:

- **Live** — authenticates a developer against the FiberMeter API (JWT) and
  reads/writes the real Express + PostgreSQL backend via TanStack Query.
- **Demo** — a fully in-browser billing engine (zustand). No backend required,
  so the entire metering → charge → fund → webhook flow is explorable offline.
  Ideal for the hackathon walkthrough.

A badge in the header always shows which mode is active.

## Getting started

```bash
pnpm install
pnpm --filter @fibermeter/dashboard dev
```

Then open the printed URL and either:

- **Sign in** with the seeded developer `demo@fibermeter.dev` / `password123`
  (requires the API running — see `apps/api`), or
- Click **Explore in demo mode**.

## Configuration

Copy `.env.example` to `.env` and set the API base URL if it differs:

```bash
VITE_API_URL=http://localhost:4000/api
```

## Notes

- The Demo Service page (`/demo-service`) simulates a third-party "AI Summary
  API" that meters usage through FiberMeter. In live mode it ingests usage with
  an API key created on the Quickstart page.
- Amounts are handled as decimal strings by the API and coerced to numbers in
  the UI data layer (`src/lib/live.ts`).
