import bcrypt from 'bcryptjs'

import { prisma } from '../src/db/prisma.js'
import { calculateCharge } from '../src/utils/money.js'

async function main() {
  const demoEmail = process.env.DEMO_EMAIL ?? 'demo@fibermeter.dev'
  const demoPassword = process.env.DEMO_PASSWORD ?? 'password123'

  const developer = await prisma.developer.upsert({
    where: { email: demoEmail },
    update: { passwordHash: await bcrypt.hash(demoPassword, 10) },
    create: {
      name: 'Demo Developer',
      email: demoEmail,
      passwordHash: await bcrypt.hash(demoPassword, 10),
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
    service: service.slug,
    customer: customer.externalId,
    exampleCharge: calculateCharge(pricingRule.pricingModel, pricingRule.price, 1250).toString(),
  })
}

main().finally(() => prisma.$disconnect())
