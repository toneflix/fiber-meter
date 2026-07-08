You are acting as a senior full-stack engineer, product architect, and hackathon execution partner.

We are building **FiberMeter**, an open-source service-metering and prepaid billing infrastructure layer for **Fiber Network**.

The goal is to create a polished MVP for the **Gone in 60ms: Fiber Network Infrastructure Hackathon**.

The hackathon is focused on **Fiber infrastructure**, not consumer products. FiberMeter should fit the category:

**Merchant, Liquidity, LSP, and Multi-Asset Infrastructure**

Specifically, FiberMeter targets service-metering infrastructure for:

- pay-as-you-go products
- subscriptions
- API access
- micropayments
- AI tools
- webhook billing
- digital services
- usage-based infrastructure

## Product Summary

FiberMeter allows developers and service providers to meter usage and collect payments using Fiber Network.

Instead of charging per request directly with an HTTP 402 gateway, FiberMeter focuses on prepaid balances, usage tracking, pricing rules, billing events, webhook notifications, and developer analytics.

Think of it as:

**Stripe Billing + usage metering + prepaid wallet credits, but Fiber-native and open-source.**

## Core MVP Goal

Build a working MVP that demonstrates this flow:

1. A developer creates a metered service.
2. The developer defines pricing rules.
3. A customer funds their balance using a Fiber payment request.
4. The service records usage through an API endpoint.
5. FiberMeter calculates the charge.
6. FiberMeter deducts the cost from the customer’s prepaid balance.
7. FiberMeter emits webhook events.
8. The dashboard shows services, customers, usage, balances, payments, and webhook delivery status.
9. A demo app shows a fake metered service, such as an AI Summary API, charging users based on usage.

## Important Hackathon Positioning

This must be presented as reusable infrastructure, not a normal app.

The project should clearly answer:

“How does this help future developers, wallets, merchants, services, or users interact with Fiber more easily?”

The answer:

FiberMeter gives developers reusable billing, metering, prepaid balance, payment tracking, and webhook infrastructure so they can build paid APIs, AI tools, merchant services, microservices, subscriptions, and pay-as-you-go products on top of Fiber without building all payment infrastructure from scratch.

## Tech Stack

Use this stack:

- Monorepo using pnpm workspaces
- Backend: Express + TypeScript
- Frontend dashboard: React + React Router
- Demo app: React + React Router
- UI: shadcn/ui + Tailwind CSS
- Database: PostgreSQL
- ORM/query layer: Prisma preferred
- SDK: TypeScript package
- Documentation: Markdown in `/docs`
- Docker support for PostgreSQL and local development

## Expected Monorepo Structure

Create this structure:

```txt
fibermeter/
  apps/
    api/
    dashboard/
    demo-service/
  packages/
    js-sdk/
    shared/
  docs/
  examples/
  README.md
  pnpm-workspace.yaml
```

If starting from an existing repo, adapt this structure carefully without destroying working code.

## Backend API Requirements

Build an Express + TypeScript API with PostgreSQL.

Use Prisma unless there is a strong reason not to.

Recommended backend packages:

- express
- cors
- helmet
- morgan
- zod
- dotenv
- prisma
- @prisma/client
- jsonwebtoken
- bcryptjs
- crypto
- axios or undici
- pino or winston
- vitest or jest
- supertest

Backend folder structure:

```txt
apps/api/
  src/
    config/
    db/
    middleware/
    modules/
      auth/
      services/
      pricing-rules/
      customers/
      balances/
      payment-requests/
      usage-events/
      ledger/
      webhooks/
      dashboard/
    providers/
      fiber/
    utils/
    app.ts
    server.ts
  prisma/
    schema.prisma
    seed.ts
  package.json
  tsconfig.json
```

## API Design Style

Use:

- REST API
- JSON responses
- Zod request validation
- consistent error format
- API key auth for usage ingestion
- dashboard auth using JWT
- PostgreSQL transactions for billing operations
- idempotency keys for usage events
- decimal-safe money handling

Use string/Decimal types for amounts. Avoid floating-point money errors.

Standard error response:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid request payload",
    "details": {}
  }
}
```

## Database Models

Create Prisma models for:

- Developer
- ApiKey
- MeteredService
- PricingRule
- Customer
- Balance
- PaymentRequest
- UsageEvent
- LedgerEntry
- WebhookDelivery

Use UUID primary keys.

Use createdAt and updatedAt where appropriate.

### Developer

Fields:

- id
- name
- email
- passwordHash
- createdAt
- updatedAt

### ApiKey

Fields:

- id
- developerId
- name
- keyHash
- keyPrefix
- lastUsedAt
- active
- createdAt
- updatedAt

### MeteredService

Fields:

- id
- developerId
- name
- slug
- description
- status: active/inactive
- webhookUrl
- webhookSecret
- defaultAsset, e.g. CKB
- createdAt
- updatedAt

### PricingRule

Fields:

- id
- serviceId
- name
- metricKey
- unitName
- pricingModel: fixed_per_request/per_unit/per_1000_units
- price
- asset
- active
- createdAt
- updatedAt

### Customer

Fields:

- id
- developerId
- externalId
- name
- email
- metadata JSON
- createdAt
- updatedAt

### Balance

Fields:

- id
- customerId
- asset
- availableBalance
- reservedBalance
- totalFunded
- totalSpent
- createdAt
- updatedAt

### PaymentRequest

Fields:

- id
- developerId
- customerId
- asset
- amount
- status: pending/paid/expired/cancelled/failed
- paymentUri
- provider: simulated/fiber
- providerReference
- expiresAt
- paidAt
- metadata JSON
- createdAt
- updatedAt

### UsageEvent

Fields:

- id
- developerId
- serviceId
- customerId
- pricingRuleId
- metricKey
- quantity
- unitName
- calculatedAmount
- asset
- status: accepted/charged/rejected/insufficient_balance
- idempotencyKey
- metadata JSON
- occurredAt
- createdAt
- updatedAt

Add uniqueness on developerId + idempotencyKey.

### LedgerEntry

Fields:

- id
- developerId
- customerId
- serviceId nullable
- type: balance_funded/usage_charged/refund/adjustment
- direction: credit/debit
- amount
- asset
- balanceAfter
- referenceType
- referenceId
- metadata JSON
- createdAt

### WebhookDelivery

Fields:

- id
- developerId
- serviceId nullable
- eventType
- payload JSON
- targetUrl
- status: pending/sent/failed
- attempts
- lastAttemptAt
- responseStatus
- responseBody
- signature
- createdAt
- updatedAt

## Backend Modules

Build the following backend modules.

### 1. Auth / API Keys

Implement simple developer authentication suitable for MVP.

Support:

- developer registration
- developer login
- JWT auth for dashboard APIs
- API key generation
- API key authentication for usage ingestion
- hashed API keys in database
- show API key only once after creation

Endpoints:

```txt
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
POST /api/api-keys
GET /api/api-keys
DELETE /api/api-keys/:id
```

### 2. Services

Developers can create services they want to meter.

Endpoints:

```txt
GET /api/services
POST /api/services
GET /api/services/:id
PUT /api/services/:id
DELETE /api/services/:id
```

### 3. Pricing Rules

Each service can have pricing rules.

Support:

- fixed price per request
- price per unit
- price per 1,000 units

Examples:

- 1 CKB per request
- 0.01 CKB per token
- 5 CKB per 1,000 API calls
- 2 CKB per webhook event

Endpoints:

```txt
GET /api/services/:serviceId/pricing-rules
POST /api/services/:serviceId/pricing-rules
PUT /api/pricing-rules/:id
DELETE /api/pricing-rules/:id
```

### 4. Customers

Developers can create customers for their services.

Endpoints:

```txt
GET /api/customers
POST /api/customers
GET /api/customers/:id
PUT /api/customers/:id
DELETE /api/customers/:id
```

### 5. Balances

Customers have prepaid balances per asset.

Endpoints:

```txt
GET /api/customers/:customerId/balances
GET /api/customers/:customerId/balances/:asset
```

### 6. Fiber Payment Requests

Implement a payment request system.

For the MVP, support both:

- simulated payment mode
- Fiber integration adapter interface

Do not block the MVP on full live Fiber integration. Build the architecture so live Fiber can be plugged in cleanly.

Endpoints:

```txt
POST /api/payment-requests
GET /api/payment-requests
GET /api/payment-requests/:id
POST /api/payment-requests/:id/simulate-paid
```

The simulated payment endpoint is important for the hackathon demo.

When a payment is marked as paid:

- increase customer available balance
- update totalFunded
- create a transaction ledger entry
- emit webhook event: `balance.funded`

### 7. Usage Events

Developers can report usage.

Endpoint:

```txt
POST /api/usage-events
```

This endpoint must authenticate with API key.

Request body:

```json
{
  "service": "ai-summary",
  "customer": "customer-external-id",
  "metricKey": "tokens",
  "quantity": 1250,
  "idempotencyKey": "unique-request-id",
  "metadata": {
    "requestId": "req_123",
    "model": "demo-ai"
  }
}
```

The system should:

1. authenticate the developer using API key
2. find the service by slug
3. find the customer by externalId
4. find the active pricing rule for the metric
5. calculate the charge
6. check customer balance
7. deduct balance if sufficient
8. create ledger entry
9. store usage event
10. emit webhook event: `usage.charged`
11. return the charge result

Example successful response:

```json
{
  "status": "charged",
  "usageEventId": "use_xxx",
  "customer": "cus_123",
  "service": "ai-summary",
  "metricKey": "tokens",
  "quantity": 1250,
  "amount": "12.5",
  "asset": "CKB",
  "balanceRemaining": "87.5"
}
```

If balance is insufficient, return:

```json
{
  "status": "insufficient_balance",
  "required": "12.5",
  "available": "4.2",
  "asset": "CKB",
  "paymentRequired": true
}
```

### 8. Ledger

Implement an append-only transaction ledger.

Ledger must be used for:

- funding balances
- usage deductions

Do not update or delete ledger entries after creation in normal flows.

### 9. Webhooks

Implement webhook delivery.

Webhook event types:

- `balance.funded`
- `usage.charged`
- `usage.rejected`
- `balance.low`
- `balance.exhausted`
- `payment.request.created`
- `payment.request.paid`

Webhook requirements:

- sign payloads with HMAC SHA-256 using service webhook secret
- include headers:
  - `X-FiberMeter-Event`
  - `X-FiberMeter-Signature`
  - `X-FiberMeter-Timestamp`

- retry failed delivery manually for MVP
- expose dashboard view for webhook delivery logs

Endpoints:

```txt
GET /api/webhook-deliveries
POST /api/webhook-deliveries/:id/retry
```

### 10. Dashboard Summary API

Endpoint:

```txt
GET /api/dashboard/summary
```

Return:

- total services
- total customers
- total funded
- total spent
- total usage events
- recent payments
- recent usage events
- recent webhook deliveries
- low balance customers

## Fiber Payment Provider Architecture

Create a provider interface:

```ts
interface FiberPaymentProvider {
  createPaymentRequest(input: {
    amount: string;
    asset: string;
    customerId: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    paymentUri: string;
    providerReference: string;
    expiresAt: Date;
  }>;

  verifyPayment(providerReference: string): Promise<{
    paid: boolean;
    paidAt?: Date;
    raw?: unknown;
  }>;
}
```

Implement:

```txt
SimulatedFiberPaymentProvider
LiveFiberPaymentProvider placeholder
```

The simulated provider should generate payment URIs like:

```txt
fiber-sim://pay?amount=100&asset=CKB&ref=sim_xxx
```

The live provider can be a documented placeholder with a clean interface and TODOs.

## Frontend Dashboard Requirements

Build a polished React dashboard using:

- React
- React Router
- TypeScript
- shadcn/ui
- Tailwind CSS
- TanStack Query
- React Hook Form
- Zod
- Recharts if charts are useful

Dashboard folder structure:

```txt
apps/dashboard/
  src/
    components/
    components/ui/
    lib/
    routes/
    services/
    hooks/
    types/
    app.tsx
    main.tsx
```

Pages:

### 1. Overview

Show cards:

- Total services
- Total customers
- Total funded
- Total usage charged
- Usage events
- Failed webhooks
- Low balance customers

Show recent activity:

- recent payment requests
- recent usage events
- recent webhook deliveries

### 2. Services

Allow developer to:

- list services
- create service
- edit service
- view service details
- configure webhook URL
- copy service slug
- see service pricing rules

### 3. Pricing Rules

Allow developer to:

- create pricing rule
- edit pricing rule
- enable/disable rule
- choose pricing model
- set metric key
- set price and asset

### 4. Customers

Allow developer to:

- list customers
- create customer
- view customer detail
- view balances
- view usage history
- create payment request for customer

### 5. Payment Requests

Allow developer to:

- create payment request
- view payment request details
- copy payment URI
- simulate payment as paid
- see paid/pending/expired states

### 6. Usage Events

Allow developer to:

- view usage events
- filter by service/customer/status
- inspect charge calculation
- see insufficient balance events

### 7. Webhooks

Allow developer to:

- view webhook deliveries
- inspect payload
- inspect response status/body
- retry failed webhook

### 8. Developer Quickstart

Add an in-app quickstart page showing:

- API key
- example SDK usage
- example curl usage
- webhook verification example

## Dashboard UI Quality Bar

Make the dashboard visually polished.

Use:

- shadcn/ui cards
- shadcn/ui tables
- shadcn/ui dialogs
- shadcn/ui forms
- sidebar navigation
- status badges
- loading skeletons
- empty states
- copy buttons
- toast notifications
- responsive layout

The UI should look good enough for a hackathon demo video.

## Demo Service Requirements

Build a demo app/service using:

- React
- React Router
- TypeScript
- shadcn/ui
- Tailwind CSS

Recommended demo:

**AI Summary API Demo**

Flow:

1. Customer has a prepaid balance.
2. User submits text to summarize.
3. Demo service calculates token/character usage.
4. Demo service sends usage event to FiberMeter.
5. If charged successfully, it returns a fake/generated summary.
6. If insufficient balance, it returns a payment-required style response and link to fund balance.
7. Dashboard updates immediately.

The demo does not need real AI. A deterministic fake summary is okay for MVP.

The important thing is to demonstrate:

- service metering
- usage reporting
- balance deduction
- payment funding
- insufficient balance handling
- webhooks

## JS/TS SDK Requirements

Create a small TypeScript SDK in `packages/js-sdk`.

SDK usage should look like:

```ts
import { FiberMeter } from '@fibermeter/sdk';

const meter = new FiberMeter({
  apiKey: process.env.FIBERMETER_API_KEY,
  baseUrl: 'https://api.example.com',
});

const result = await meter.recordUsage({
  service: 'ai-summary',
  customer: 'cus_123',
  metricKey: 'tokens',
  quantity: 1250,
  idempotencyKey: 'req_123',
  metadata: {
    model: 'demo-ai',
  },
});
```

SDK should include:

- recordUsage
- createCustomer
- createPaymentRequest
- getBalance
- verifyWebhookSignature helper

## Documentation Requirements

Create strong docs from day one.

Add:

```txt
docs/
  01-overview.md
  02-architecture.md
  03-quickstart.md
  04-api-reference.md
  05-sdk.md
  06-webhooks.md
  07-demo-walkthrough.md
  08-fiber-integration.md
  09-roadmap.md
  10-hackathon-submission.md
```

Docs must explain:

- what FiberMeter is
- why it is infrastructure
- what Fiber infrastructure gap it solves
- how to run locally
- how to use the SDK
- how payment simulation works
- how live Fiber integration would work
- what is fully working
- what is simulated
- what needs production hardening
- future roadmap

## README Requirements

The root README should be polished and hackathon-ready.

Include:

- project name and tagline
- problem statement
- solution
- architecture diagram using Mermaid
- MVP features
- demo flow
- local setup
- API examples
- SDK examples
- webhook examples
- screenshots placeholders
- hackathon category fit
- judging criteria alignment
- roadmap
- license

Tagline:

**FiberMeter — usage-based billing and prepaid service-metering infrastructure for Fiber Network.**

## Architecture Requirements

Use clean, pragmatic architecture.

Backend should have service classes like:

- PaymentRequestService
- BalanceService
- UsageMeteringService
- PricingService
- LedgerService
- WebhookService
- ApiKeyService
- FiberPaymentProvider
- SimulatedFiberPaymentProvider
- LiveFiberPaymentProvider placeholder

Important:

- Keep business logic out of route handlers.
- Use Prisma migrations and seed data.
- Use Zod for validation.
- Use TypeScript types consistently.
- Use idempotency for usage events.
- Use database transactions when updating balances and ledger.
- Avoid overengineering.
- Prioritise working demo, clear code, and strong docs.

## Seed Data

Create seed data for a complete demo.

Developer:

- name: Demo Developer
- email: [demo@fibermeter.dev](mailto:demo@fibermeter.dev)
- password: password123

Service:

- name: AI Summary API
- slug: ai-summary
- webhookUrl: http://localhost:9000/webhooks/fibermeter

Pricing rule:

- metricKey: tokens
- unitName: token
- pricingModel: per_1000_units
- price: 10
- asset: CKB

Customer:

- externalId: cus_demo_001
- name: Ada Demo
- email: [ada@example.com](mailto:ada@example.com)

Initial balance:

- 100 CKB

Demo usage events:

- charged event
- insufficient balance event
- webhook event

## Docker Requirements

Add Docker support for local development.

At minimum:

```txt
docker-compose.yml
```

with:

- PostgreSQL
- optional API service
- optional dashboard service
- optional demo-service

Include `.env.example` files.

## Testing Requirements

Add basic tests for:

- pricing calculation
- balance funding
- usage charging
- insufficient balance handling
- idempotency
- webhook signature generation

Use Vitest or Jest.

## MVP Priorities

Build in this order:

1. Monorepo setup
2. PostgreSQL + Prisma schema
3. Backend models, migrations, seed
4. Auth and API keys
5. Usage metering and balance deduction
6. Payment request simulation and balance funding
7. Webhook delivery and signing
8. Dashboard overview and CRUD pages
9. Demo service
10. JS SDK
11. Documentation and README polish
12. Docker/local setup
13. Screenshots/demo script

If time is short, prioritise:

- working backend flow
- clean dashboard
- demo service
- docs
- video-friendly walkthrough

## Non-Negotiables

The project must be:

- new
- open-source ready
- easy to run
- easy to demo
- clearly infrastructure-focused
- honest about simulated vs live Fiber parts
- useful to developers building on Fiber
- not a clone of Fiber402
- not only a consumer-facing payment app

## Hackathon Submission Deliverables

Prepare the project so we can submit:

- project summary
- selected category
- team members placeholder
- GitHub repository link placeholder
- hosted demo link placeholder
- video demo link placeholder
- technical breakdown
- Fiber infrastructure gap addressed
- future roadmap
- AI tooling allowance note if needed

Add these to:

```txt
docs/10-hackathon-submission.md
```

## Demo Script

Create a short demo script in docs.

The script should show:

1. Open dashboard overview.
2. Show AI Summary API service.
3. Show pricing rule: 10 CKB per 1,000 tokens.
4. Show customer balance: 100 CKB.
5. Open demo AI Summary app.
6. Submit text.
7. Demo app records usage.
8. FiberMeter deducts balance.
9. Dashboard shows usage charged.
10. Show webhook delivery.
11. Submit larger usage that exceeds balance.
12. Show insufficient balance.
13. Create payment request.
14. Simulate Fiber payment.
15. Show balance funded.
16. Retry usage successfully.

## Implementation Style

Work iteratively.

For each major step:

1. inspect existing repo state
2. explain the change briefly
3. implement the smallest complete version
4. run tests/builds where possible
5. fix errors
6. update docs

Do not leave broken code.

Do not make unnecessary large rewrites.

Do not rename established variables, folders, or logic unless required.

Prefer simple, readable code over clever abstractions.

Use block comments instead of excessive inline comments.

## Final Expected Outcome

By the end, the repo should contain a working MVP of FiberMeter:

- Express + TypeScript API
- PostgreSQL database
- Prisma schema, migrations, and seed data
- React Router dashboard
- shadcn/ui interface
- React Router demo service
- TypeScript SDK
- docs
- README
- simulated Fiber payment flow
- usage billing flow
- balance deduction
- webhook delivery
- hackathon submission writeup

The final product should be polished enough that judges immediately understand:

FiberMeter is reusable Fiber infrastructure for service metering, prepaid balances, API billing, micropayments, and developer monetisation.
