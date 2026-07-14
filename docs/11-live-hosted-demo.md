# Hosted live demo — real testnet settlement, zero judge setup

This is the **standout** path: a persistent demo where a judge clicks **Fund via
Fiber** and watches a **real Fiber testnet invoice settle end-to-end**, then
verifies the underlying channel on a public block explorer — with nobody at a
terminal.

It complements (does not replace) the turnkey **simulated** path
(`docker compose up`), which judges can still run themselves from scratch.

---

## What judges can independently verify

A Fiber payment is **off-chain** — an HTLC update inside a payment channel. It
does not appear on any block explorer, by design. What *is* on-chain and
publicly verifiable is the **channel funding transaction**. So the honest,
checkable proof we surface is:

1. The dashboard **Preflight** page shows the node's open channel(s) with a
   **CKB testnet explorer link** to each channel's on-chain funding tx
   (`GET /api/fiber/live-proof`).
2. Clicking **Fund via Fiber** issues a real `fibt1…` invoice; the balance is
   credited **only after** the API's `/verify` confirms Fiber settled it.

Judges verify: *"this is a real, funded channel on CKB testnet, and the balance
moved only after real settlement."*

---

## Why this can't be fully hands-off from a judge's laptop

Going live needs two funded testnet nodes + an open channel. Funding comes from
the CKB faucet (external, rate-limited) and a channel open needs on-chain
confirmation — no `docker compose up` can conjure faucet CKB. So **we** do that
one-time bootstrap ahead of time and keep it running; judges just click.

---

## Topology

```
┌─────────────── your droplet ───────────────┐
│  Docker:  postgres · api(live) · dashboard  │
│           · demo-service · autopay          │
│                                             │
│  Host:    fnn payee node  RPC :8237  ◄── api (issues invoices)
│           fnn payer node  RPC :8247  ◄── autopay (pays invoices)
└─────────────────────────────────────────────┘
        │                    │
        └─ public CKB testnet RPC (testnet.ckbapp.dev) ─┘
```

- **payee** = the merchant. The API issues invoices on it.
- **payer** = the customer. `autopay` settles invoices from it.
- They must be **two different nodes** — a node cannot pay its own invoice
  (`allow_self_payment` off). See [08-fiber-integration.md](08-fiber-integration.md).

---

## Requirements

- A droplet with **~2 GB free RAM** and Docker + docker compose. The two `fnn`
  nodes use a **public CKB RPC**, so you do **not** sync a full CKB node — disk
  stays small.
- Two Linux `fnn` + `fnn-cli` binaries from the
  [Fiber releases](https://github.com/nervosnetwork/fiber/releases).
- A little testnet CKB from the [Nervos faucet](https://faucet.nervos.org/).

---

## One-time bootstrap

### 1. Prepare two node data dirs

Give each node its own directory, config, and CKB key. Use distinct ports so
they can coexist and the containers can reach each:

| Node  | Fiber P2P | Fiber RPC | data dir      |
|-------|-----------|-----------|---------------|
| payee | `8238`    | `8237`    | `./fiber-payee` |
| payer | `8248`    | `8247`    | `./fiber-payer` |

In each `config.yml`, set `chain: testnet`, point `ckb.rpc_url` at a public
testnet RPC (`https://testnet.ckbapp.dev/`), and set `rpc.listening_addr` to the
port above. **Keep RPC bound to `127.0.0.1`** — it is dangerous to expose.
(The repo's `fiber-payee/config.yml` is a working reference.)

### 2. Start both nodes on the host

```bash
FIBER_SECRET_KEY_PASSWORD='password' ./fiber-payee/fnn -c ./fiber-payee/config.yml -d ./fiber-payee &
FIBER_SECRET_KEY_PASSWORD='password' ./fiber-payer/fnn -c ./fiber-payer/config.yml -d ./fiber-payer &
```

Confirm each responds:

```bash
curl -s -X POST http://127.0.0.1:8237 -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"node_info","params":[{}]}' | jq .result.node_id
curl -s -X POST http://127.0.0.1:8247 -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"node_info","params":[{}]}' | jq .result.node_id
```

### 3. Fund the payer node from the faucet

The **payer** funds the channel (its balance is what gets pushed to the payee on
each top-up), so it needs on-chain CKB. Get the payer node's CKB address (via
`ckb-cli` / your wallet against the node's `ckb/key`) and request testnet CKB at
<https://faucet.nervos.org/>. Fund with enough for the channel + fees (e.g.
300+ CKB).

### 4. Peer the nodes and open a channel (payer → payee)

Use `fnn-cli` against each node — it tracks the current RPC parameter shapes
across `fnn` versions, so prefer it over hand-rolled JSON:

```bash
# connect payer → payee (payee multiaddr = /ip4/127.0.0.1/tcp/8238/p2p/<payee node_id>)
./fiber-payer/fnn-cli --rpc http://127.0.0.1:8247 connect-peer <payee-multiaddr>

# open a funded channel from payer → payee (gives the payee inbound capacity to receive top-ups)
./fiber-payer/fnn-cli --rpc http://127.0.0.1:8247 open-channel --peer <payee-node-id> --funding-amount 20000000000
```

Wait until the channel is **ChannelReady**:

```bash
curl -s -X POST http://127.0.0.1:8247 -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"list_channels","params":[{}]}' | jq '.result.channels[].state'
```

> Exact `fnn-cli` subcommand names/flags can differ by release — run
> `./fnn-cli --help`. The RPC methods are `connect_peer`, `open_channel`,
> `list_channels`. This is the only manual, on-chain step; everything after is
> automated.

### 5. Start the app tier (live) with the auto-payer

```bash
docker compose -f docker-compose.yml -f docker-compose.live.yml up -d
```

This runs postgres + **API in live mode** (→ payee `:8237`) + dashboard +
demo-service + **autopay** (→ payer `:8247`). The API auto-migrates and seeds on
boot.

---

## The judge experience

1. Open the dashboard, log in (`demo@fibermeter.dev` / `password123`).
2. **Preflight** page → **On-chain settlement proof** shows the channel with a
   CKB testnet explorer link. Click it — real funding tx on testnet. ✅
3. Create a **Payment Request** for a customer → a real `fibt1…` invoice.
4. Within a few seconds **autopay** settles it from the payer node; the request
   flips to **Paid**, the balance is credited, a `balance.funded` webhook fires.
5. Run the demo service / record usage → the live-funded balance is charged.

No terminal, no manual `send_payment`.

---

## The auto-payer

`scripts/autopay.mjs` (npm: `pnpm autopay`) logs into the API, polls
`GET /api/payment-requests`, and for each **live + pending** request calls
`send_payment` on the **payer** node, then polls the API's `/verify` until Fiber
confirms. Config via env (see the file header): `API_URL`, `API_EMAIL`,
`API_PASSWORD`, `PAYER_RPC_URL`, `POLL_MS`, `MAX_PAYMENT_CKB`. It never pays the
same request twice.

---

## Security & operations

- **Never expose `:8237` / `:8247` (Fiber RPC) publicly.** Only the containers
  (via `host.docker.internal`) and localhost should reach them.
- Keep `FIBER_DEMO_AUTOPAY=true` restricted to `Fibt` testnet. The API and payer
  independently enforce `FIBER_DEMO_MAX_PAYMENT_CKB` / `MAX_PAYMENT_CKB` (5 CKB
  in the supplied Compose overlay).
- **Persist and back up** `./fiber-payee` and `./fiber-payer` — they hold node
  keys and channel state; losing them can strand channel funds.
- Publicly expose only the dashboard/API/demo ports, ideally behind your
  existing reverse proxy + TLS.
- If the droplet restarts, restart the two nodes; channel state persists and
  funds are safe (the live demo is briefly unavailable until they're back).
- Put the hosted URL + a sample channel explorer link in
  [10-hackathon-submission.md](10-hackathon-submission.md).
