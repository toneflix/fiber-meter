import bcrypt from 'bcryptjs'

import { prisma } from '../src/db/prisma.js'
import { calculateCharge } from '../src/utils/money.js'

async function main() {
  const developer = await prisma.developer.upsert({
    where: { email: 'demo@fibermeter.dev' },
    update: {},
    create: {
      name: 'Demo Developer',
      email: 'demo@fibermeter.dev',
      passwordHash: await bcrypt.hash('password123', 10),
    },
  })

  const service = await prisma.meteredService.upsert({
    where: {
      developerId_slug: {
        developerId: developer.id,
        slug: 'ai-summary',
      },
    },
    update: {},
    create: {
      developerId: developer.id,
      name: 'AI Summary API',
      slug: 'ai-summary',
      webhookUrl: 'http://localhost:9000/webhooks/fibermeter',
      webhookSecret: 'demo_webhook_secret',
      description: 'Fake AI summary API metered by tokens',
    },
  })

  const pricingRule =
    (await prisma.pricingRule.findFirst({ where: { serviceId: service.id, metricKey: 'tokens' } })) ??
    (await prisma.pricingRule.create({
      data: {
        serviceId: service.id,
        name: 'Tokens',
        metricKey: 'tokens',
        unitName: 'token',
        pricingModel: 'per_1000_units',
        price: '10',
        asset: 'CKB',
      },
    }))

  const customer = await prisma.customer.upsert({
    where: {
      developerId_externalId: {
        developerId: developer.id,
        externalId: 'cus_demo_001',
      },
    },
    update: {},
    create: {
      developerId: developer.id,
      externalId: 'cus_demo_001',
      name: 'Ada Demo',
      email: 'ada@example.com',
    },
  })

  await prisma.balance.upsert({
    where: {
      customerId_asset: {
        customerId: customer.id,
        asset: 'CKB',
      },
    },
    update: {},
    create: {
      customerId: customer.id,
      asset: 'CKB',
      availableBalance: '100',
      totalFunded: '100',
    },
  })

  console.log({
    email: developer.email,
    password: 'password123',
    service: service.slug,
    customer: customer.externalId,
    exampleCharge: calculateCharge(pricingRule.pricingModel, pricingRule.price, 1250).toString(),
  })
}

main().finally(() => prisma.$disconnect())
