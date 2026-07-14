# FiberMeter fiber integration

FiberMeter is reusable Fiber Network infrastructure for prepaid balances, service metering, payment tracking, ledgering, and signed webhooks.

## Modes

| `FIBER_PROVIDER` | Create payment | Confirm payment |
|------------------|----------------|-----------------|
| `simulated` **(default)** | `fiber-sim://…` URI | `POST /api/payment-requests/:id/simulate-paid` |
| `live` | Fiber RPC `new_invoice` → `fibt1…` | Pay invoice, then `POST /api/payment-requests/:id/verify` |

**`simulated` is the default and requires no Fiber node, faucet, or channels.**
The entire product (payment requests, Simulate Paid, balance funding, metering,
ledger, webhooks) works end-to-end in this mode — it's the path judges/evaluators
should use. Live-only surfaces (the **Preflight** page and **Fund via Fiber**) are
hidden by the dashboard when the API reports `simulated`.

There are three ways to operate against Fiber:

1. **Simulated** — default, zero infrastructure (above).
2. **Self-hosted live node** — run one `fnn` node you control as the merchant
   (payee) and point `FIBER_RPC_URL` at it. Covered below.
3. **Hosted node / LSP** *(future)* — point the provider at a managed Fiber
   node/LSP with an API, for nodeless operation. Not yet available in the Fiber
   ecosystem, but the `FiberPaymentProvider` interface is ready for a
   `HostedFiberProvider` adapter (see [ROADMAP.md](../ROADMAP.md), Phase 1).

## Live env

```env
FIBER_PROVIDER=live
FIBER_RPC_URL=http://127.0.0.1:8227
FIBER_CURRENCY=Fibt
FIBER_INVOICE_EXPIRY_SECS=3600
```

## Live flow

1. Dashboard creates a payment request (CKB amount).
2. API calls Fiber `new_invoice` (amount in shannons hex, currency `Fibt` on testnet).
3. Dashboard opens **Fund via Fiber** with the encoded invoice (`fibt1…`), QR,
   and payer-node instructions.
4. Optional: **Preflight** runs PayReady checks against `FIBER_RPC_URL`.
5. A payer node / wallet calls Fiber `send_payment` with that invoice.
6. The funding dialog periodically calls the verification endpoint. It uses
   `get_invoice` by `payment_hash`; when status is `Paid`, FiberMeter credits the
   prepaid balance and emits `balance.funded`.

## RPC methods used

- `new_invoice` — create top-up invoice
- `get_invoice` — verify settlement
- `node_info` / `parse_invoice` / `list_peers` / `list_channels` / `send_payment` (dry_run) — Preflight module
- `list_channels` — `GET /api/fiber/live-proof` (on-chain channel funding tx + explorer link)
- `send_payment` — auto-payer (`scripts/autopay.mjs`) settles live invoices from the payer node

## Files

- `apps/api/src/providers/fiber/fiber-provider.ts` — simulated + live providers
- `apps/api/src/modules/preflight/` — PayReady RPC / preflight / errors
- `POST /api/payment-requests/:id/verify`
- `GET /api/fiber/config` — current provider mode

## Payer vs payee (avoid self-payment)

In the live funding flow FiberMeter is the **payee** — the API issues the invoice
on **its own** node (`FIBER_RPC_URL`). The **customer** is the **payer** and settles
it from **their own** node/wallet. These must be **different** nodes:

- **Preflight** ("can I pay this invoice?") is a **payer-side** tool. Running it
  against FiberMeter's own node for FiberMeter's own invoice asks that node to pay
  itself → the node rejects it with `allow_self_payment is not enabled`.
- To demo a real payment you therefore need **two** nodes (or a wallet): the
  merchant/payee node behind the API, and a separate customer/payer node that runs
  `send_payment`. A single node cannot pay its own invoice without a circular route.

## Paying the invoice: manual, or automated

Someone must **pay** the invoice from a **separate** Fiber node/wallet with
outbound liquidity (`send_payment`) — FiberMeter's own node does not pay itself.

For the **hands-off hosted live demo**, `scripts/autopay.mjs` (npm: `pnpm autopay`)
plays the customer: it watches the API for live pending payment requests and
settles each from a second (payer) node, so a judge can click "Fund via Fiber"
and watch real settlement with nobody at a terminal. Full droplet runbook:
[11-live-hosted-demo.md](11-live-hosted-demo.md). None of this is needed in the
default `simulated` mode. The dashboard renders the real invoice and watches
settlement automatically; a local-node command remains available as a technical
fallback.

## Verifiable on-chain proof

A Fiber payment is off-chain and not on any explorer, but the **channel** it
settles through is a real on-chain CKB transaction. `GET /api/fiber/live-proof`
returns each open channel's funding tx with a CKB testnet explorer link, surfaced
on the dashboard **Preflight** page so anyone can independently verify the node
runs a real, funded testnet channel.
