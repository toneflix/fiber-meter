# PayReady → FiberMeter transfer

PayReady's Fiber preflight layer now lives inside FiberMeter on branch `payready`.

## What landed

| Piece | Location |
|-------|----------|
| Fiber RPC client | `apps/api/src/modules/preflight/rpc.ts` |
| Preflight engine | `apps/api/src/modules/preflight/preflight.ts` |
| Error translator | `apps/api/src/modules/preflight/errors.ts` |
| API routes | `GET /api/fiber/health`, `POST /api/fiber/preflight`, `POST /api/fiber/translate-error` |
| Dashboard UI | **Preflight** nav → `/preflight` |

## Env

In `apps/api/.env`:

```env
FIBER_RPC_URL=http://127.0.0.1:8227
```

## Next steps (for you)

1. **Run FiberMeter** (Postgres + API + dashboard)
2. **Point `FIBER_RPC_URL`** at your Fiber node
3. Login live → open **Preflight** → paste a real `fibt1…` invoice → Run preflight
4. Demo story: Payment Requests (create top-up) → Preflight (can I pay?) → Simulate Paid → Usage Events
5. Stretch: wire `LiveFiberPaymentProvider` so top-ups use real Fiber invoices instead of `fiber-sim://`
