#!/usr/bin/env node
/*
 * FiberMeter auto-payer — turns the "someone must manually pay the invoice"
 * step of the live Fiber flow into a hands-off service.
 *
 * It logs into the FiberMeter API as the seeded developer, watches for LIVE
 * payment requests that are still `pending`, and pays each one from a SECOND
 * Fiber node (the customer/payer node) via `send_payment`. The API's own
 * `/verify` endpoint then confirms settlement and credits the balance.
 *
 * This supports repeatable hosted product testing: a user can click "Fund via
 * Fiber" and watch a real testnet invoice settle without operating a wallet.
 *
 *   API_URL       FiberMeter API base, incl. /api  (default http://localhost:4000/api)
 *   API_EMAIL     dashboard login                  (default demo@fibermeter.dev)
 *   API_PASSWORD  dashboard password               (default password123)
 *   PAYER_RPC_URL payer node Fiber RPC             (default http://127.0.0.1:8247)
 *   POLL_MS       poll interval                    (default 4000)
 *   MAX_PAYMENT_CKB hard cap per automated request (default 5)
 *
 * The payer node MUST be a DIFFERENT node from the one behind the API
 * (FIBER_RPC_URL). A node cannot pay its own invoice. See docs/08-fiber-integration.md.
 */

const API_URL = (process.env.API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '')
const API_EMAIL = process.env.API_EMAIL ?? 'demo@fibermeter.dev'
const API_PASSWORD = process.env.API_PASSWORD ?? 'password123'
const PAYER_RPC_URL = process.env.PAYER_RPC_URL ?? 'http://127.0.0.1:8247'
const POLL_MS = Number(process.env.POLL_MS ?? 4000)
const MAX_PAYMENT_CKB = Number(process.env.MAX_PAYMENT_CKB ?? 5)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const ts = () => new Date().toISOString()
const log = (...a) => console.log(`[autopay ${ts()}]`, ...a)
const warn = (...a) => console.warn(`[autopay ${ts()}]`, ...a)

/** payment-request ids we've already attempted, so we never double-pay. */
const handled = new Set()
let rpcId = 1

async function apiLogin() {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: API_EMAIL, password: API_PASSWORD }),
  })
  if (!res.ok) throw new Error(`login failed: HTTP ${res.status} ${await res.text()}`)
  const body = await res.json()
  const token = body.token ?? body.accessToken ?? body.jwt
  if (!token) throw new Error(`login response had no token: ${JSON.stringify(body)}`)
  return token
}

async function apiGet(path, token) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) throw new Error('unauthorized')
  if (!res.ok) throw new Error(`GET ${path} → HTTP ${res.status}`)
  return res.json()
}

async function apiPost(path, token) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
  })
  const text = await res.text()
  let body
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    body = { raw: text }
  }
  return { ok: res.ok, status: res.status, body }
}

async function payerRpc(method, params = {}) {
  const res = await fetch(PAYER_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: rpcId++, method, params: [params] }),
  })
  if (!res.ok) throw new Error(`payer RPC ${method} → HTTP ${res.status}`)
  const payload = await res.json()
  if (payload.error) throw new Error(`payer RPC ${method}: ${payload.error.message}`)
  return payload.result
}

/** Pay one live invoice from the payer node, then poll the API's /verify. */
async function settle(pr, token) {
  handled.add(pr.id)
  const amount = Number(pr.amount)
  if (pr.asset !== 'CKB' || !Number.isFinite(amount) || amount <= 0 || amount > MAX_PAYMENT_CKB) {
    warn(`refusing request ${pr.id}: demo limit is ${MAX_PAYMENT_CKB} CKB`)
    return
  }
  const invoice = pr.paymentUri
  log(`paying request ${pr.id} (${pr.amount} ${pr.asset}) invoice ${String(invoice).slice(0, 24)}…`)

  try {
    const result = await payerRpc('send_payment', { invoice })
    log(`send_payment accepted for ${pr.id}: payment_hash=${result?.payment_hash ?? '?'} status=${JSON.stringify(result?.status)}`)
  } catch (err) {
    warn(`send_payment failed for ${pr.id}: ${err.message} — will retry on next poll`)
    handled.delete(pr.id) // allow a later retry (e.g. transient no-route)
    return
  }

  // Poll the API's own verify endpoint until it confirms Paid.
  for (let i = 0; i < 15; i++) {
    await sleep(2000)
    const { ok, body } = await apiPost(`/payment-requests/${pr.id}/verify`, token)
    const paid = ok && (body?.verification?.paid || body?.paymentRequest?.status === 'paid')
    if (paid) {
      log(`✔ request ${pr.id} settled on Fiber and balance credited`)
      return
    }
  }
  warn(`request ${pr.id} sent but not confirmed Paid after ~30s (check node logs / liquidity)`)
}

async function tick(token) {
  const requests = await apiGet('/payment-requests', token)
  const pending = requests.filter(
    (pr) => pr.provider === 'live' && pr.status === 'pending' && !handled.has(pr.id),
  )
  for (const pr of pending) {
    await settle(pr, token)
  }
}

async function main() {
  log(`starting — API=${API_URL} payer=${PAYER_RPC_URL} poll=${POLL_MS}ms`)
  let token = await apiLogin()
  log('authenticated with FiberMeter API')

  for (;;) {
    try {
      await tick(token)
    } catch (err) {
      if (err.message === 'unauthorized') {
        warn('token expired — re-authenticating')
        token = await apiLogin()
      } else {
        warn(`poll error: ${err.message}`)
      }
    }
    await sleep(POLL_MS)
  }
}

main().catch((err) => {
  console.error(`[autopay] fatal: ${err.stack ?? err.message}`)
  process.exit(1)
})
