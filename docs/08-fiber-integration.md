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
should use. Live-only surfaces (the **Preflight** page, **Verify on Fiber**) are
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
3. Dashboard shows the encoded invoice (`fibt1…`) and **Verify on Fiber**.
4. Optional: **Preflight** runs PayReady checks against `FIBER_RPC_URL`.
5. A payer node / wallet calls Fiber `send_payment` with that invoice.
6. Dashboard **Verify on Fiber** calls `get_invoice` by `payment_hash`; when status is `Paid`, FiberMeter credits the prepaid balance and emits `balance.funded`.

## RPC methods used

- `new_invoice` — create top-up invoice
- `get_invoice` — verify settlement
- `node_info` / `parse_invoice` / `list_peers` / `list_channels` / `send_payment` (dry_run) — Preflight module

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

## Still manual for a full live demo

Someone must **pay** the invoice from a **separate** Fiber node/wallet with
outbound liquidity (`send_payment`) — FiberMeter does not auto-pay itself. Local
two-node setup and RPC examples are in `finish.md`. None of this is needed in the
default `simulated` mode.
