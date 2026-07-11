# FiberMeter fiber integration

FiberMeter is reusable Fiber Network infrastructure for prepaid balances, service metering, payment tracking, ledgering, and signed webhooks.

## Modes

| `FIBER_PROVIDER` | Create payment | Confirm payment |
|------------------|----------------|-----------------|
| `simulated` | `fiber-sim://…` URI | `POST /api/payment-requests/:id/simulate-paid` |
| `live` | Fiber RPC `new_invoice` → `fibt1…` | Pay invoice, then `POST /api/payment-requests/:id/verify` |

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

## Still manual for a full demo

Someone must **pay** the invoice from a Fiber node with liquidity (`send_payment`). FiberMeter does not auto-pay itself.
