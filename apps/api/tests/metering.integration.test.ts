import crypto from 'node:crypto'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { prisma } from '../src/db/prisma.js'
import { paymentRequestService } from '../src/modules/payment-requests/payment-request.service.js'
import { usageMeteringService } from '../src/modules/usage-events/usage-metering.service.js'

/*
 * Integration tests for the core money flows against a real PostgreSQL:
 * balance funding, usage charging, insufficient-balance handling, and
 * idempotency. They create fully isolated data (unique ids per run) and clean
 * up after. If no database is reachable (e.g. CI without Postgres), the whole
 * suite skips rather than failing — run `docker compose up -d postgres` first,
 * or point DATABASE_URL at any migrated FiberMeter database.
 */
const rid = () => crypto.randomUUID().slice(0, 8)
const suffix = rid()
const serviceSlug = `svc-${suffix}`

let dbOk = false
let developerId = ''
let serviceId = ''

async function makeCustomer(availableBalance: number) {
  const externalId = `cus-${rid()}`
  const customer = await prisma.customer.create({
    data: { developerId, externalId, name: 'Test Customer', email: 't@example.com' },
  })
  await prisma.balance.create({
    data: {
      customerId: customer.id,
      asset: 'CKB',
      availableBalance: String(availableBalance),
      totalFunded: String(availableBalance),
    },
  })
  return { id: customer.id, externalId }
}

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`
    const developer = await prisma.developer.create({
      data: { name: 'Test Dev', email: `test-${suffix}@fibermeter.test`, passwordHash: 'x' },
    })
    developerId = developer.id
    const service = await prisma.meteredService.create({
      data: { developerId, name: 'Test Service', slug: serviceSlug, defaultAsset: 'CKB' },
    })
    serviceId = service.id
    await prisma.pricingRule.create({
      data: {
        serviceId,
        name: 'Tokens',
        metricKey: 'tokens',
        unitName: 'token',
        pricingModel: 'per_1000_units',
        price: '10',
        asset: 'CKB',
      },
    })
    dbOk = true
  } catch (err) {
    dbOk = false
    if (process.env.DEBUG_TESTS) console.error('[integration] DB setup failed:', err)
  }
})

afterAll(async () => {
  if (dbOk && developerId) {
    // onDelete: Cascade cleans up services, customers, balances, events, ledger.
    await prisma.developer.delete({ where: { id: developerId } }).catch(() => undefined)
  }
  await prisma.$disconnect().catch(() => undefined)
})

describe('metering + balance flows (integration)', () => {
  it('funds a prepaid balance and writes a ledger entry', async (ctx) => {
    if (!dbOk) return ctx.skip()
    const customer = await makeCustomer(0)
    const paymentRequest = await prisma.paymentRequest.create({
      data: {
        developerId,
        customerId: customer.id,
        asset: 'CKB',
        amount: '100',
        paymentUri: 'fiber-sim://test',
        providerReference: `ref-${crypto.randomUUID()}`,
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    })

    await paymentRequestService.markPaid(developerId, paymentRequest.id)

    const balance = await prisma.balance.findUnique({
      where: { customerId_asset: { customerId: customer.id, asset: 'CKB' } },
    })
    expect(Number(balance?.availableBalance)).toBe(100)
    expect(Number(balance?.totalFunded)).toBe(100)

    const paid = await prisma.paymentRequest.findUnique({ where: { id: paymentRequest.id } })
    expect(paid?.status).toBe('paid')

    const ledger = await prisma.ledgerEntry.findFirst({
      where: { referenceId: paymentRequest.id, type: 'balance_funded' },
    })
    expect(ledger).not.toBeNull()
    expect(ledger?.direction).toBe('credit')
  })

  it('charges usage and deducts the balance (per_1000_units)', async (ctx) => {
    if (!dbOk) return ctx.skip()
    const customer = await makeCustomer(100)

    const result: any = await usageMeteringService.record(developerId, {
      service: serviceSlug,
      customer: customer.externalId,
      metricKey: 'tokens',
      quantity: 1250,
      idempotencyKey: `k-${crypto.randomUUID()}`,
    })

    expect(result.status).toBe('charged')
    expect(result.amount).toBe('12.5') // 10 CKB / 1000 tokens * 1250

    const balance = await prisma.balance.findUnique({
      where: { customerId_asset: { customerId: customer.id, asset: 'CKB' } },
    })
    expect(Number(balance?.availableBalance)).toBe(87.5)
    expect(Number(balance?.totalSpent)).toBe(12.5)
  })

  it('rejects usage when the balance is insufficient (no deduction)', async (ctx) => {
    if (!dbOk) return ctx.skip()
    const customer = await makeCustomer(5)

    const result: any = await usageMeteringService.record(developerId, {
      service: serviceSlug,
      customer: customer.externalId,
      metricKey: 'tokens',
      quantity: 1250, // costs 12.5 CKB > 5 available
      idempotencyKey: `k-${crypto.randomUUID()}`,
    })

    expect(result.status).toBe('insufficient_balance')
    expect(result.paymentRequired).toBe(true)

    const balance = await prisma.balance.findUnique({
      where: { customerId_asset: { customerId: customer.id, asset: 'CKB' } },
    })
    expect(Number(balance?.availableBalance)).toBe(5) // unchanged
  })

  it('is idempotent: a repeated idempotencyKey charges only once', async (ctx) => {
    if (!dbOk) return ctx.skip()
    const customer = await makeCustomer(100)
    const idempotencyKey = `k-${crypto.randomUUID()}`

    const first: any = await usageMeteringService.record(developerId, {
      service: serviceSlug,
      customer: customer.externalId,
      metricKey: 'tokens',
      quantity: 1250,
      idempotencyKey,
    })
    const second: any = await usageMeteringService.record(developerId, {
      service: serviceSlug,
      customer: customer.externalId,
      metricKey: 'tokens',
      quantity: 1250,
      idempotencyKey,
    })

    expect(first.status).toBe('charged')
    expect(second.idempotent).toBe(true)
    expect(second.usageEventId).toBe(first.usageEventId)

    const balance = await prisma.balance.findUnique({
      where: { customerId_asset: { customerId: customer.id, asset: 'CKB' } },
    })
    expect(Number(balance?.availableBalance)).toBe(87.5) // charged once, not twice
  })
})
