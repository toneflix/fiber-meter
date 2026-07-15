# PayReady → FiberMeter transfer

PayReady's Fiber preflight layer now lives inside FiberMeter as an operator-facing
diagnostics API. It is intentionally not a step in the primary payment flow.

## What landed

| Piece                 | Location                                                                                |
| --------------------- | --------------------------------------------------------------------------------------- |
| Fiber RPC client      | `apps/api/src/modules/preflight/rpc.ts`                                                 |
| Preflight engine      | `apps/api/src/modules/preflight/preflight.ts`                                           |
| Error translator      | `apps/api/src/modules/preflight/errors.ts`                                              |
| API routes            | `GET /api/fiber/health`, `POST /api/fiber/preflight`, `POST /api/fiber/translate-error` |
| Optional dashboard UI | Payment dialog → **Preflight Diagnostics**                                              |
| Dashboard proof       | **Overview** → live channel funding transaction                                         |

## Env

In `apps/api/.env`:

```env
FIBER_RPC_URL=http://127.0.0.1:8227
FIBER_PREFLIGHT_RPC_URL=http://127.0.0.1:8247
```

## Operator check

1. **Run FiberMeter** (Postgres + API + dashboard)
2. Point `FIBER_RPC_URL` at the payee and `FIBER_PREFLIGHT_RPC_URL` at the payer.
3. Open **Preflight Diagnostics** from a pending payment dialog, or call
   `POST /api/fiber/preflight` with `{ "invoice": "fibt1…" }` directly.

The hosted audit flow is shorter: create a Payment Request, watch the bounded
demo payer settle it, inspect the confirmation and explorer proof, then record
usage against the credited balance.
