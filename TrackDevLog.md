## CKB Builder Track Dev Log (Week 12)

- Name: Chioma Christopher
- Week ending: 15-07-2026
- Project: **FiberMeter**
- Focus: **Merchant billing, prepaid service metering, and Fiber payment infrastructure**

---

### What this week was about

Week 11 was orientation on Fiber. Week 12 was about taking FiberMeter from a
simulated billing product to a hosted, independently verifiable Fiber testnet
deployment.

The result is a complete live loop:

1. FiberMeter creates a real `fibt1…` invoice on a merchant/payee node.
2. A separate, funded payer node settles it through a ready Fiber channel.
3. FiberMeter verifies settlement on the payee node before crediting the
   customer balance.
4. A metered service reports usage through the REST API or SDK.
5. FiberMeter calculates the charge, updates the prepaid balance, appends a
   ledger entry, and emits signed webhooks.

FiberMeter is the billing layer between Fiber payments and paid services. It is
not a wallet, an exchange, or an LSP.

---

### Product model

**Problem.** Fiber provides fast off-chain payments, but a merchant or service
operator still needs:

- customer balances and top-ups
- payment requests and settlement tracking
- usage-based pricing and idempotent metering
- ledger entries and reconciliation data
- signed webhook notifications

Reimplementing those controls for every paid API, AI tool, or webhook product is
expensive and error-prone.

**Solution.** FiberMeter provides reusable, Fiber-native billing infrastructure:

1. Customers fund prepaid balances with Fiber invoices.
2. Services submit usage with an API key or the TypeScript SDK.
3. FiberMeter prices usage and deducts the correct balance transactionally.
4. Operators inspect services, customers, payments, usage, and webhooks from the
   dashboard.
5. Optional **Preflight Diagnostics** checks payer health, invoice validity,
   peers, liquidity, and a dry-run route when troubleshooting is needed.

| Role | Interface | Responsibility |
| --- | --- | --- |
| Merchant / developer | Dashboard, REST API, TypeScript SDK | Configure services, issue invoices, meter usage, inspect balances and webhooks |
| Customer | Fiber-capable wallet or payer node | Pay the merchant's `fibt1…` invoice |
| Hosted demo payer | Bounded testnet service | Settle small auditor-triggered invoices without collecting wallet keys |
| Auditor | Hosted dashboard and CKB Explorer | Trigger a payment, observe verified credit, and inspect channel-funding proof |

The simulated provider remains available for local development and offline
evaluation, but the hosted deployment now uses the live provider.

---

## What I implemented and verified

### 1. Hosted application topology

The final deployment does not use Docker. The static applications run on
Netlify, while a small Ubuntu VPS runs the stateful services:

| Component | Location |
| --- | --- |
| Dashboard | `https://app.fibermeter.toneflix.net` (Netlify) |
| Demo service | `https://demo.fibermeter.toneflix.net` (Netlify) |
| API | `https://api.fibermeter.toneflix.net` (VPS behind TinyCP/Nginx) |
| PostgreSQL | VPS, localhost only |
| Fiber payee node | VPS, RPC `127.0.0.1:8237`, P2P `8238` |
| Fiber payer node | VPS, RPC `127.0.0.1:8247`, P2P `8248` |
| Bounded auto-payer | VPS systemd service |

The API listens only on `127.0.0.1:4000`. TinyCP includes a repository-managed
Nginx location fragment and proxies public HTTPS traffic to that local origin.
PostgreSQL and both Fiber RPC ports remain private.

The VPS has 3.8 GiB RAM and a 4 GiB swapfile. Application code, secrets, and
persistent Fiber state are separated:

```text
/var/www/api.fibermeter.toneflix.net   application checkout
/etc/fibermeter                       environment and node configuration
/var/lib/fibermeter/payee              payee state and encrypted key
/var/lib/fibermeter/payer              payer state and encrypted key
```

### 2. Native Fiber nodes

Installed the official Fiber `fnn` v0.8.1 Linux binary and ran two independent
testnet nodes under systemd:

- **payee**: the merchant node used by the API to call `new_invoice` and
  `get_invoice`
- **payer**: the customer-side node used by the bounded auto-payer to call
  `send_payment`

Each node has its own CKB key, database, RPC port, P2P port, and public key. Both
connect to Fiber testnet peers, and the payer is directly peered with the payee
over localhost. RPC stays bound to localhost; no browser receives node keys or
direct RPC access.

### 3. Funding and opening the live channel

The payer CKB account was funded from the Nervos testnet faucet. The first
channel attempt failed with:

```text
capacity not enough: need more capacity, value=99.0
```

That exposed an important CKB channel rule: even a one-way channel needs the
acceptor's 99 CKB settlement reserve. After funding the payee account, we opened
a fresh private, one-way channel:

- payer funding request: **499 CKB**
- payer spendable outbound balance after reserve: **400 CKB**
- payee spendable initial balance: **0 CKB**
- channel mode: private and one-way, payer → payee
- final state on both nodes: **`ChannelReady`**
- channel ID: `0x0f87745b…c51b149`
- funding transaction: `0x2137649181497e6ced6fbff4f95061780b95b35693b01dcf2885f0462ea758e2`

The dashboard exposes the funding transaction through CKB Explorer. The UI
labels this carefully: Fiber payments are off-chain, so the explorer link proves
the real on-chain channel used for settlement, not an individual payment
transaction.

### 4. Correct payer/payee RPC separation

The live configuration uses separate RPC responsibilities:

```env
FIBER_PROVIDER=live
FIBER_RPC_URL=http://127.0.0.1:8237
FIBER_PREFLIGHT_RPC_URL=http://127.0.0.1:8247
FIBER_CURRENCY=Fibt
FIBER_DEMO_AUTOPAY=true
FIBER_DEMO_MAX_PAYMENT_CKB=5
```

`FIBER_RPC_URL` must remain the payee because it creates and verifies merchant
invoices. Preflight is a payer-side question, so `FIBER_PREFLIGHT_RPC_URL` points
to the funded payer. This prevents the false `allow_self_payment is not enabled`
diagnostic that occurs when the merchant node dry-runs payment of its own
invoice.

Preflight remains available as an advanced **Preflight Diagnostics** action. It
is not a required step in the primary payment flow and is no longer a sidebar
destination.

### 5. Automatic live payment and verification

The hosted test flow is now automatic and bounded:

1. An auditor creates a payment request of at most 5 CKB.
2. The API creates a real Fiber testnet invoice on the payee.
3. `fibermeter-autopay` detects the pending live request.
4. It pays from the separate payer RPC on `8247`.
5. It polls FiberMeter's verification endpoint.
6. The API confirms `Paid` using `get_invoice` on the payee.
7. FiberMeter credits the balance and emits `balance.funded`.

The successful payment dialog remains open until the user closes it. It shows
the amount credited and links to the channel-funding transaction on CKB
Explorer. A manual JSON-RPC payment command remains available as a fallback for
operators using another funded node.

### 6. Metering after settlement

After the live top-up, the seeded demo service can charge the funded customer:

1. Create or use a dashboard API key.
2. Submit `POST /api/usage-events` directly or through `@fibermeter/sdk`.
3. Resolve the matching service, customer, and pricing rule.
4. Deduct the calculated amount transactionally.
5. Store the usage event and ledger entry.
6. Emit the signed webhook event.

Insufficient balance and duplicate idempotency keys are handled explicitly.

---

## Current capability matrix

| Capability | Current state |
| --- | --- |
| Simulated billing (`fiber-sim://`, Simulate Paid) | Working; default for local/offline use |
| Live Fiber `new_invoice` / `get_invoice` | Working on hosted testnet deployment |
| Separate native payer and payee nodes | Working under systemd |
| Private one-way CKB channel | `ChannelReady` |
| Bounded automatic payer | Working; maximum 5 CKB per request |
| Automatic settlement verification and balance credit | Working |
| Preflight Diagnostics against payer RPC | Working; optional operator tool |
| CKB Explorer channel-funding proof | Visible on Overview and payment confirmation |
| Usage metering, balances, ledger, and webhooks | Working |
| Dashboard and demo service | Deployed on Netlify |
| Customer wallet custody | Not built; intentionally out of scope |
| Hosted LSP / nodeless merchant adapter | Roadmap |
| Multi-asset live settlement | Roadmap |
| Inbound settlement webhooks from Fiber | Roadmap; verification currently polls |

---

## Operational lessons

- A node cannot pay its own invoice in the normal flow; payer and payee must be
  distinct.
- `open_channel` returning a temporary ID means negotiation started, not that the
  channel is ready.
- Pending negotiations require `list_channels` with `only_pending: true`.
- CKB channel participants each need settlement reserve capacity, including the
  acceptor of a one-way channel.
- Fiber payments are off-chain. The channel funding outpoint is the correct
  public blockchain proof.
- Browser-facing applications should never receive a raw Fiber RPC endpoint or
  private key.
- On a small VPS, swap and strict service isolation make two native nodes plus
  the API and PostgreSQL practical.
- Keeping secrets in `/etc/fibermeter` and state in `/var/lib/fibermeter` makes
  upgrades and later cleanup safer than mixing them into the Git checkout.

---

## Next improvements

Short term:

- Add rate limiting and stronger validation to public API surfaces.
- Add reconciliation and structured operational alerts.
- Improve demo reset tooling so repeated auditor sessions start from a known
  state.
- Add automated browser coverage for the live payment dialog.

Medium term:

- Receive asynchronous Fiber settlement events instead of relying only on
  polling.
- Add scoped API keys, rotation, and organization-level access controls.
- Publish and version the TypeScript SDK.
- Add richer accounting and webhook export tools.

Longer term:

- Implement a `HostedFiberProvider` when suitable hosted-node or LSP APIs are
  available.
- Add supported UDT and multi-asset balances.
- Add subscriptions, tiered pricing, real-time analytics, and reconciliation
  workflows.

---

## Verification checklist

- [x] Two distinct Fiber testnet nodes running persistently
- [x] Both nodes connected to public peers and directly peered to each other
- [x] Private one-way CKB channel confirmed `ChannelReady`
- [x] Real `fibt1…` invoice issued by the payee
- [x] Invoice paid from the separate payer
- [x] API verified `Paid` before crediting balance
- [x] Metered usage charged against the live-funded balance
- [x] Channel funding transaction linked on CKB Explorer
- [x] Hosted dashboard, demo service, and API available over HTTPS
- [x] Fiber RPC, PostgreSQL, keys, and application origin ports kept private

---

### Reflection

The most important result this week was not simply getting an invoice to return
`Paid`. It was proving the complete boundary between payment infrastructure and
service billing: a separate payer transfers value over Fiber, the merchant
independently verifies settlement, FiberMeter credits a prepaid balance, and a
service consumes that balance through metered usage.

That separation is what makes FiberMeter reusable. Product teams can focus on
their API, AI tool, or service while FiberMeter handles payment state, balances,
pricing, ledgering, idempotency, and webhooks.

Earlier local-development screenshots remain under [`./images/`](./images/).
They document the path to the final system; the current reference deployment is
the native VPS and Netlify topology described above.
