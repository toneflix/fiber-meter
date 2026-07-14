import crypto from 'node:crypto'

import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { z } from 'zod'

import { prisma } from './db/prisma.js'
import { requireApiKey, requireJwt } from './middleware/auth.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { preflightRouter } from './modules/preflight/preflight.routes.js'
import { paymentRequestService } from './modules/payment-requests/payment-request.service.js'
import { usageMeteringService } from './modules/usage-events/usage-metering.service.js'
import { webhookService } from './modules/webhooks/webhook.service.js'
import { env } from './config/env.js'
import { fiberProvider } from './providers/fiber/fiber-provider.js'
import { ApiError, errorHandler } from './utils/errors.js'
import { validate } from './utils/validation.js'

export const app = express()

app.use(helmet())
app.use(cors({ origin: env.corsOrigins.length > 0 ? env.corsOrigins : '*' }))
app.use(express.json())
app.use(morgan('dev'))

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    name: 'FiberMeter API',
    fiberProvider: fiberProvider.name,
    fiberCurrency: env.fiberCurrency,
    demoAutopay: env.fiberDemoAutopay,
  })
})

app.get('/api/fiber/config', (_req, res) => {
  res.json({
    provider: fiberProvider.name,
    currency: env.fiberCurrency,
    rpcUrl: env.fiberRpcUrl,
    invoiceExpirySecs: env.fiberInvoiceExpirySecs,
    demoAutopay: env.fiberDemoAutopay,
    demoMaxPaymentCkb: env.fiberDemoMaxPaymentCkb,
  })
})

app.use('/api', authRouter)
app.use('/api/fiber', preflightRouter)

app.get('/api/services', requireJwt, async (req, res) => {
  const services = await prisma.meteredService.findMany({
    where: { developerId: req.developerId! },
    include: { pricingRules: true },
  })

  res.json(services)
})

app.post('/api/services', requireJwt, async (req, res) => {
  const service = await prisma.meteredService.create({
    data: {
      developerId: req.developerId!,
      name: req.body.name,
      slug: req.body.slug,
      description: req.body.description,
      webhookUrl: req.body.webhookUrl,
      webhookSecret: req.body.webhookSecret ?? crypto.randomUUID(),
      defaultAsset: req.body.defaultAsset ?? 'CKB',
    },
  })

  res.status(201).json(service)
})

app.get('/api/services/:id', requireJwt, async (req, res) => {
  const service = await prisma.meteredService.findFirstOrThrow({
    where: { id: req.params.id, developerId: req.developerId! },
    include: { pricingRules: true, usageEvents: true },
  })

  res.json(service)
})

app.put('/api/services/:id', requireJwt, async (req, res) => {
  const service = await prisma.meteredService.update({
    where: { id: req.params.id },
    data: req.body,
  })

  res.json(service)
})

app.delete('/api/services/:id', requireJwt, async (req, res) => {
  await prisma.meteredService.delete({ where: { id: req.params.id } })
  res.status(204).end()
})

app.get('/api/services/:serviceId/pricing-rules', requireJwt, async (req, res) => {
  const pricingRules = await prisma.pricingRule.findMany({
    where: {
      serviceId: req.params.serviceId,
      service: { developerId: req.developerId! },
    },
  })

  res.json(pricingRules)
})

app.post('/api/services/:serviceId/pricing-rules', requireJwt, async (req, res) => {
  const pricingRule = await prisma.pricingRule.create({
    data: {
      serviceId: req.params.serviceId,
      name: req.body.name,
      metricKey: req.body.metricKey,
      unitName: req.body.unitName,
      pricingModel: req.body.pricingModel,
      price: req.body.price,
      asset: req.body.asset ?? 'CKB',
    },
  })

  res.status(201).json(pricingRule)
})

app.put('/api/pricing-rules/:id', requireJwt, async (req, res) => {
  const pricingRule = await prisma.pricingRule.update({
    where: { id: req.params.id },
    data: req.body,
  })

  res.json(pricingRule)
})

app.delete('/api/pricing-rules/:id', requireJwt, async (req, res) => {
  await prisma.pricingRule.delete({ where: { id: req.params.id } })
  res.status(204).end()
})

app.get('/api/customers', requireJwt, async (req, res) => {
  const customers = await prisma.customer.findMany({
    where: { developerId: req.developerId! },
    include: { balances: true },
  })

  res.json(customers)
})

app.post('/api/customers', requireJwt, async (req, res) => {
  const customer = await prisma.customer.create({
    data: {
      developerId: req.developerId!,
      externalId: req.body.externalId,
      name: req.body.name,
      email: req.body.email,
      metadata: req.body.metadata,
    },
  })

  res.status(201).json(customer)
})

app.get('/api/customers/:id', requireJwt, async (req, res) => {
  const customer = await prisma.customer.findFirstOrThrow({
    where: { id: req.params.id, developerId: req.developerId! },
    include: { balances: true, usageEvents: true },
  })

  res.json(customer)
})

app.put('/api/customers/:id', requireJwt, async (req, res) => {
  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: req.body,
  })

  res.json(customer)
})

app.delete('/api/customers/:id', requireJwt, async (req, res) => {
  await prisma.customer.delete({ where: { id: req.params.id } })
  res.status(204).end()
})

app.get('/api/customers/:customerId/balances', requireJwt, async (req, res) => {
  const balances = await prisma.balance.findMany({
    where: {
      customerId: req.params.customerId,
      customer: { developerId: req.developerId! },
    },
  })

  res.json(balances)
})

app.get('/api/customers/:customerId/balances/:asset', requireJwt, async (req, res) => {
  const balance = await prisma.balance.findUnique({
    where: {
      customerId_asset: {
        customerId: req.params.customerId,
        asset: req.params.asset,
      },
    },
  })

  res.json(balance)
})

app.post('/api/payment-requests', requireJwt, async (req, res, next) => {
  try {
    const paymentRequest = await paymentRequestService.create(req.developerId!, req.body)
    res.status(201).json(paymentRequest)
  } catch (err) {
    next(err)
  }
})

app.get('/api/payment-requests', requireJwt, async (req, res) => {
  const paymentRequests = await prisma.paymentRequest.findMany({
    where: { developerId: req.developerId! },
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  })

  res.json(paymentRequests)
})

app.get('/api/payment-requests/:id', requireJwt, async (req, res) => {
  const paymentRequest = await prisma.paymentRequest.findFirstOrThrow({
    where: { id: req.params.id, developerId: req.developerId! },
  })

  res.json(paymentRequest)
})

app.post('/api/payment-requests/:id/verify', requireJwt, async (req, res, next) => {
  try {
    const result = await paymentRequestService.verify(req.developerId!, req.params.id)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

app.post('/api/payment-requests/:id/simulate-paid', requireJwt, async (req, res, next) => {
  try {
    if (fiberProvider.name === 'live') {
      throw new ApiError(
        'forbidden',
        'Simulate paid is disabled when FIBER_PROVIDER=live. Use POST /api/payment-requests/:id/verify after paying the Fiber invoice.',
        403,
      )
    }
    const paymentRequest = await paymentRequestService.markPaid(
      req.developerId!,
      req.params.id,
    )
    res.json(paymentRequest)
  } catch (err) {
    next(err)
  }
})

app.post(
  '/api/usage-events',
  requireApiKey,
  validate(
    z.object({
      service: z.string(),
      customer: z.string(),
      metricKey: z.string(),
      quantity: z.number().positive(),
      idempotencyKey: z.string(),
      metadata: z.record(z.unknown()).optional(),
    }),
  ),
  async (req, res) => {
    const result = await usageMeteringService.record(req.developerId!, req.body)
    res.json(result)
  },
)

app.get('/api/usage-events', requireJwt, async (req, res) => {
  const usageEvents = await prisma.usageEvent.findMany({
    where: { developerId: req.developerId! },
    include: { service: true, customer: true },
    orderBy: { createdAt: 'desc' },
  })

  res.json(usageEvents)
})

app.get('/api/webhook-deliveries', requireJwt, async (req, res) => {
  const webhookDeliveries = await prisma.webhookDelivery.findMany({
    where: { developerId: req.developerId! },
    orderBy: { createdAt: 'desc' },
  })

  res.json(webhookDeliveries)
})

app.post('/api/webhook-deliveries/:id/retry', requireJwt, async (req, res) => {
  await webhookService.deliver(req.params.id)
  res.json({ ok: true })
})

app.get('/api/dashboard/summary', requireJwt, async (req, res) => {
  const developerId = req.developerId!
  const [
    services,
    customers,
    usageEvents,
    recentPayments,
    recentUsageEvents,
    recentWebhookDeliveries,
    balances,
  ] = await Promise.all([
    prisma.meteredService.count({ where: { developerId } }),
    prisma.customer.count({ where: { developerId } }),
    prisma.usageEvent.count({ where: { developerId } }),
    prisma.paymentRequest.findMany({ where: { developerId }, take: 5, orderBy: { createdAt: 'desc' } }),
    prisma.usageEvent.findMany({
      where: { developerId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { customer: true, service: true },
    }),
    prisma.webhookDelivery.findMany({ where: { developerId }, take: 5, orderBy: { createdAt: 'desc' } }),
    prisma.balance.findMany({ where: { customer: { developerId } }, include: { customer: true } }),
  ])

  res.json({
    totals: {
      services,
      customers,
      usageEvents,
      totalFunded: balances.reduce((sum, balance) => sum + Number(balance.totalFunded), 0).toString(),
      totalSpent: balances.reduce((sum, balance) => sum + Number(balance.totalSpent), 0).toString(),
      failedWebhooks: recentWebhookDeliveries.filter((webhook) => webhook.status === 'failed').length,
      lowBalanceCustomers: balances.filter((balance) => Number(balance.availableBalance) < 10).length,
    },
    recentPayments,
    recentUsageEvents,
    recentWebhookDeliveries,
    lowBalanceCustomers: balances.filter((balance) => Number(balance.availableBalance) < 10),
  })
})

app.use(errorHandler)
