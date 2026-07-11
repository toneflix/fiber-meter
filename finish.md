# finish.md — End-to-end real Fiber (not simulated)

Complete checklist to finish **FiberMeter + PayReady preflight** as a **live Fiber Network** product.  
Nothing here assumes `fiber-sim://` or **Simulate Paid** as the happy path.

Work on branch: `payready`  
Repo root: `fiber-meter/`

---

## What to do next (start here)

Phase **C is done in code** (live `new_invoice` + `verify` via `get_invoice`, dashboard **Verify on Fiber**).  
What remains is **running a real node and proving one live payment**.

### 1. Finish local FiberMeter (Phase A) — today
- [ ] `cd fiber-meter` → `pnpm install` (if not done)
- [ ] `cp apps/api/.env.example apps/api/.env`
- [ ] Confirm `.env` has:
  ```env
  FIBER_PROVIDER=live
  FIBER_RPC_URL=http://127.0.0.1:8227
  FIBER_CURRENCY=Fibt
  ```
- [ ] Start Postgres → `prisma generate` → `migrate` → `seed` → `pnpm dev`
- [ ] Login **Live**: `demo@fibermeter.dev` / `password123`
- [ ] Confirm sidebar has **Preflight** and **Payment Requests**

### 2. Run / connect a Fiber testnet node (Phase B) — required for live
- [ ] Start Fiber node (Docker `nervos/fiber` or `fnn`) with RPC on `8227`
- [ ] Peers connected + at least one **ChannelReady** with outbound CKB
- [ ] Dashboard → **Preflight** → Refresh → green node status (version / peers / channels)
- [ ] If health fails: fix `FIBER_RPC_URL`, RPC bind `0.0.0.0:8227` in node config, firewall

### 3. First live invoice from FiberMeter (Phase D/E start)
- [ ] Payment Requests → **Create Request** (customer + amount in **CKB**, e.g. `1`)
- [ ] Confirm URI is `fibt1…` (not `fiber-sim://`) and provider badge is **live**
- [ ] Click **Preflight** → Run preflight → aim for ready (or fix liquidity/peers from suggestions)
- [ ] Copy the invoice

### 4. Pay it from a Fiber payer (still manual)
- [ ] From a **funded** Fiber node (second node or same machine CLI), run `send_payment` with that invoice  
  Docs: https://www.fiber.world/docs/quick-start/run-a-node
- [ ] Back in FiberMeter → **Verify on Fiber**
- [ ] Expect: status `paid`, customer balance ↑, webhook `balance.funded`

### 5. Prove metering still works
- [ ] Quickstart → create API key  
- [ ] Demo Service (or curl usage) → charge succeeds against the new balance  
- [ ] Usage Events + Webhooks show the charge

### 6. Hackathon wrap (Phase H) — after one live success
- [ ] Update demo walkthrough video to use Verify (not Simulate Paid)
- [ ] Screenshots: Preflight pass, `fibt1…` request, paid balance, usage
- [ ] Fill `docs/10-hackathon-submission.md` links (repo / demo / video)
- [ ] Commit + push `payready` branch / open PR

### Blocked until step 2 works
You **cannot** finish live E2E without a reachable Fiber node.  
Until then you can still demo billing with `FIBER_PROVIDER=simulated` (Simulate Paid) — but that is **not** the submission story you want.

### Optional stretch (after E works)
- [ ] Background poller for pending live payment requests (auto-verify)
- [ ] `cancel_invoice` when a request expires / is cancelled in UI
- [ ] Wire `LiveFiberPaymentProvider` inbound settlement webhook if Fiber exposes one
- [ ] Hosted demo (API + dashboard) with private node

---

## Legend

- `[ ]` = not done
- Do steps **in order** unless marked optional
- “Live” means: real Fiber node RPC, real invoice (`fibt1…`), real `send_payment` / settlement verify

---

## Phase A — Local stack (baseline)

### A1. Install tooling
- [ ] Install Node 20+ and `pnpm`
- [ ] Install Docker (for Postgres) **or** local PostgreSQL 15+
- [ ] Confirm Docker Desktop is running (Windows)

### A2. Install deps and database
- [ ] `cd fiber-meter`
- [ ] `pnpm install`
- [ ] `docker compose up -d postgres`  
  **or** create DB/user `fibermeter` / password matching `DATABASE_URL`
- [ ] `cp apps/api/.env.example apps/api/.env`
- [ ] Set in `apps/api/.env`:
  ```env
  DATABASE_URL=postgresql://fibermeter:fibermeter@localhost:5432/fibermeter?schema=public
  JWT_SECRET=<long-random-string>
  PORT=4000
  FIBER_PROVIDER=live
  FIBER_RPC_URL=http://127.0.0.1:8227
  FIBER_CURRENCY=Fibt
  FIBER_INVOICE_EXPIRY_SECS=3600
  ```
- [ ] `pnpm --filter @fibermeter/api prisma:generate`
- [ ] `pnpm --filter @fibermeter/api prisma:migrate`
- [ ] `pnpm --filter @fibermeter/api seed`
- [ ] `pnpm dev` — API on `:4000`, dashboard on Vite port (often `:5173`)
- [ ] Login **Live** mode: `demo@fibermeter.dev` / `password123`
- [ ] Confirm Overview / Services / Customers load from Postgres (not Demo mode)

### A3. Confirm PayReady transfer already present
- [x] API files exist under `apps/api/src/modules/preflight/`
- [x] Routes mounted: `GET /api/fiber/health`, `POST /api/fiber/preflight`, `POST /api/fiber/translate-error`
- [x] Dashboard nav has **Preflight** → `/preflight`
- [ ] Curl health:  
  `curl http://localhost:4000/api/fiber/health`  
  (will fail until Fiber node is up — that’s expected)

---

## Phase B — Run a real Fiber node (testnet)

### B1. Choose how you run the node
- [ ] Prefer: Docker image `nervos/fiber` **or** native `fnn` binary  
  Docs: https://www.fiber.world/docs/quick-start/run-a-node  
  Repo: https://github.com/nervosnetwork/fiber

### B2. Node data + key
- [ ] Create a node data directory (e.g. `fiber-node/`)
- [ ] Place CKB private key at `fiber-node/ckb/key` (export via `ckb-cli` or wallet)
- [ ] Copy testnet `config.yml` into the data dir
- [ ] Set `FIBER_SECRET_KEY_PASSWORD` for the node process
- [ ] **If using Docker:** set `rpc.listening_addr` to `0.0.0.0:8227` in config so host can reach RPC, and publish `-p 8227:8227`

### B3. Start node and join network
- [ ] Start `fnn` / Docker container against **testnet**
- [ ] Confirm RPC responds:
  ```bash
  curl -X POST http://127.0.0.1:8227 -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"node_info\",\"params\":[{}]}"
  ```
- [ ] `connect_peer` to at least one public Fiber testnet relay / bootnode
- [ ] Confirm `list_peers` returns ≥ 1 peer
- [ ] Fund the node’s CKB address from a **testnet faucet**
- [ ] `open_channel` with enough CKB for demo top-ups + fees
- [ ] Wait until channel state is **ChannelReady**
- [ ] Confirm `list_channels` shows ready channel(s) with outbound liquidity

### B4. Point FiberMeter at the node
- [ ] `FIBER_RPC_URL=http://127.0.0.1:8227` in `apps/api/.env`
- [ ] Restart API
- [ ] Open dashboard **Preflight** → Refresh → see version, peers, channels (not error)

---

## Phase C — Implement live Fiber payment provider ✅ DONE

Implemented on branch `payready`. Details below kept for reference.

### C1–C4 (done)
- [x] `LiveFiberPaymentProvider.createPaymentRequest` → Fiber `new_invoice` (`fibt1…`)
- [x] Amount conversion CKB → shannons hex
- [x] `verifyPayment` → Fiber `get_invoice` by payment hash; `Paid` → credit balance
- [x] Factory: `FIBER_PROVIDER=live|simulated`
- [x] Persist `provider`, `paymentUri`, `providerReference`
- [x] `POST /api/payment-requests/:id/verify`
- [x] Simulate Paid **disabled** when live
- [x] Dashboard: **Verify on Fiber** + Preflight handoff
- [x] `docs/08-fiber-integration.md` updated

---

## Phase D — Wire PayReady into the top-up flow

### D1. Preflight before create / before pay
- [x] After creating a live payment request, button: **Preflight** on Payment Requests (copies invoice into Preflight page)
- [x] `POST /api/fiber/preflight` with `{ invoice: paymentUri }`
- [x] Show checks on `/preflight` page
- [ ] Optional: block “ready to fund” messaging if `ready === false` — show suggestions inline on Payment Requests

### D2. Paying the invoice (real money movement)
Pick **one** clear demo path and document it:

**Path 1 — Second Fiber node (best demo)**  
- [ ] Run a **second** testnet Fiber node (payer) with peers + outbound liquidity  
- [ ] On payer node: `send_payment` with the merchant invoice from FiberMeter  
- [ ] On FiberMeter: **Verify** until paid → balance funded  

**Path 2 — Same machine / CLI**  
- [ ] Use `fnn-cli` / RPC `send_payment` from a funded node against FiberMeter’s invoice  
- [ ] Same verify step in dashboard  

**Path 3 — Wallet UI (if available)**  
- [ ] Pay `fibt1…` from a Fiber-capable wallet  
- [ ] Verify in FiberMeter  

- [ ] Do **not** mark paid without Fiber confirming settlement

### D3. Error translation on failure
- [x] `POST /api/fiber/translate-error` exists
- [ ] If `send_payment` / verify fails, surface translate-error title + suggestions in dashboard toast / panel

---

## Phase E — End-to-end live billing path (must work)

Run this once successfully before recording video:

1. [ ] Fiber node online; Preflight health green  
2. [ ] Dashboard Live login  
3. [ ] Customer exists (seed Ada or create new) with low/zero balance  
4. [ ] Create **Payment Request** → get real `fibt1…` invoice  
5. [ ] **Preflight** on that invoice → all critical checks pass (or fix node/liquidity until they do)  
6. [ ] Pay invoice from payer node / wallet (`send_payment`)  
7. [ ] **Verify** in FiberMeter → status `paid`, balance increases, ledger `balance_funded`, webhook `balance.funded`  
8. [ ] Create API key on Quickstart  
9. [ ] Demo Service (or curl) `recordUsage` → charge succeeds, balance decreases, ledger + `usage.charged` webhook  
10. [ ] Force insufficient balance → clear error / payment-required behavior  
11. [ ] Create another top-up → preflight → pay → verify → usage works again  

If any step uses Simulate Paid, it is **not** finished for live Fiber.

---

## Phase F — Amount / asset correctness

- [ ] Confirm unit conversion: dashboard “CKB” ↔ Fiber invoice amount (shannons / hex) is correct  
- [ ] Confirm testnet currency / chain matches node config (e.g. Fibt / testnet)  
- [ ] Reject or warn on UDT invoices until UDT channels are supported in demo  
- [ ] Expiry: expired invoices cannot be marked paid; UI shows expired  
- [ ] Idempotent verify: calling verify twice does not double-credit balance  

---

## Phase G — SDK + docs (reuse story for judges)

- [ ] Add SDK methods (or document HTTP):
  - [ ] `preflightInvoice(invoice)`
  - [ ] `translateError(message)`
  - [ ] `createPaymentRequest` (already)
  - [ ] `verifyPaymentRequest(id)` (new)
- [ ] Update `docs/08-fiber-integration.md`:
  - [ ] Live vs simulated boundary
  - [ ] Env vars
  - [ ] RPC methods used
  - [ ] How verify works
- [ ] Update `docs/07-demo-walkthrough.md` — **remove Simulate Paid as primary**; use live pay + verify  
- [ ] Update `docs/10-hackathon-submission.md` with honest live demo steps  
- [ ] Update root README: “Live Fiber top-up + PayReady preflight”  
- [ ] Mark Phase 1 items in `ROADMAP.md` as done when complete  

---

## Phase H — Polish, honesty, deliverables

### H1. Product polish
- [ ] Preflight page works in Live mode when node is up  
- [ ] Clear banner if `FIBER_PROVIDER=simulated` (“payments are simulated”) vs live  
- [ ] Loading / error states for verify + preflight  
- [ ] Screenshots: Overview, Preflight pass, Payment Request with `fibt1…`, Usage charged (`docs/screenshots/`)

### H2. Demo video (2–3 min)
- [ ] Script from updated walkthrough (live only)  
- [ ] Show forced **failure** once (e.g. bad invoice / no route) → Preflight / translate explains it  
- [ ] Show **success**: preflight pass → pay → verify → usage  
- [ ] Say the one-liner: *“Prepaid billing on Fiber, with payment confidence before send.”*

### H3. Hosting (optional but stronger)
- [ ] Deploy API + Postgres (Railway/Fly/Render/etc.)  
- [ ] Deploy dashboard  
- [ ] Secure secrets; do **not** expose Fiber RPC publicly without auth  
- [ ] Hosted demo may still use a private Fiber node you control, or document “bring your own `FIBER_RPC_URL`”

### H4. Submission pack
- [ ] Public GitHub repo (this branch merged or PR linked)  
- [ ] Category: Merchant / Liquidity / LSP / Multi-Asset (+ mention payment UX / preflight)  
- [ ] Repo URL, demo URL, video URL filled in `docs/10`  
- [ ] Short technical write-up: architecture diagram (customer → invoice → preflight → pay → verify → balance → usage → webhook)  

---

## Phase I — Explicitly out of scope for “finished live MVP”

Do **not** block the live demo on these (post-hackathon / ROADMAP Phase 2+):

- Multi-org RBAC, OAuth SSO  
- Queue-backed webhook retries / DLQ  
- Subscriptions, tiered pricing, PDF invoices  
- Mainnet production hardening, rate limits, Sentry  
- WASM browser Fiber node as the merchant backend  

---

## Phase J — Final acceptance test (sign-off)

Print this and check only when **true**:

- [ ] No demo depends on **Simulate Paid** for the winning story  
- [ ] Payment request URI is a real Fiber invoice (`fibt1…`)  
- [ ] Preflight talks to a real Fiber node and returns real checks  
- [ ] Balance increases only after Fiber confirms payment  
- [ ] Usage metering deducts that live-funded balance  
- [ ] Webhooks fire for fund + charge  
- [ ] Docs and video match what actually runs  
- [ ] Teammate can reproduce from this file + `.env.example` alone  

---

## Quick command cheat sheet

```powershell
# FiberMeter
cd c:\Users\chiom\Desktop\spore\fiber-meter
pnpm install
docker compose up -d postgres
cp apps\api\.env.example apps\api\.env
# edit FIBER_PROVIDER=live and FIBER_RPC_URL
pnpm --filter @fibermeter/api prisma:generate
pnpm --filter @fibermeter/api prisma:migrate
pnpm --filter @fibermeter/api seed
pnpm dev

# Fiber node health (from host)
curl http://localhost:4000/api/fiber/health

# Preflight
curl -X POST http://localhost:4000/api/fiber/preflight `
  -H "Content-Type: application/json" `
  -d "{\"invoice\":\"fibt1...\"}"
```

---

## Current status snapshot (as of Phase C)

| Area | Status |
|------|--------|
| Billing API, dashboard, usage, webhooks, SDK shell | Done |
| PayReady preflight module + `/preflight` UI | Done (needs live node) |
| `LiveFiberPaymentProvider` (`new_invoice`) | **Done** |
| Verify instead of Simulate Paid (`get_invoice`) | **Done** |
| Real payer `send_payment` demo path | **Manual — Phase D/E** |
| Live docs / video / screenshots | Partial (docs updated) |

**Next concrete task:** Phase **B** (run Fiber node) + Phase **E** (pay a real invoice, then Verify).

---

## Phase C checklist (implemented)

- [x] C1 `LiveFiberPaymentProvider` — `new_invoice` + `get_invoice`
- [x] C2 Provider factory via `FIBER_PROVIDER`
- [x] C3 Persist `provider` + real `paymentUri` / `providerReference`
- [x] C4 `POST /api/payment-requests/:id/verify`; simulate gated when live
- [x] Dashboard **Verify on Fiber** + Preflight handoff
- [x] `docs/08-fiber-integration.md` updated
