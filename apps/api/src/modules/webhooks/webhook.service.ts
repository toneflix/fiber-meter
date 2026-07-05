import crypto from 'node:crypto'
import { request } from 'undici'

import { prisma } from '../../db/prisma.js'

export function signWebhook(body: string, secret: string, timestamp = Date.now().toString()) {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
}

export class WebhookService {
  async enqueue(input: {
    developerId: string
    serviceId?: string
    eventType: string
    payload: unknown
    targetUrl?: string | null
    secret?: string | null
  }) {
    if (!input.targetUrl) {
      return null
    }

    const body = JSON.stringify(input.payload)
    const signature = signWebhook(body, input.secret ?? 'dev')

    const delivery = await prisma.webhookDelivery.create({
      data: {
        developerId: input.developerId,
        serviceId: input.serviceId,
        eventType: input.eventType,
        payload: input.payload as object,
        targetUrl: input.targetUrl,
        signature,
      },
    })

    void this.deliver(delivery.id)

    return delivery
  }

  async deliver(id: string) {
    const delivery = await prisma.webhookDelivery.findUnique({ where: { id } })

    if (!delivery) {
      return
    }

    const timestamp = Date.now().toString()
    const body = JSON.stringify(delivery.payload)

    try {
      const response = await request(delivery.targetUrl, {
        method: 'POST',
        body,
        headers: {
          'content-type': 'application/json',
          'X-FiberMeter-Event': delivery.eventType,
          'X-FiberMeter-Signature': delivery.signature ?? '',
          'X-FiberMeter-Timestamp': timestamp,
        },
      })

      await prisma.webhookDelivery.update({
        where: { id },
        data: {
          status: response.statusCode >= 200 && response.statusCode < 300 ? 'sent' : 'failed',
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
          responseStatus: response.statusCode,
          responseBody: await response.body.text(),
        },
      })
    } catch (error) {
      await prisma.webhookDelivery.update({
        where: { id },
        data: {
          status: 'failed',
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
          responseBody: error instanceof Error ? error.message : 'delivery failed',
        },
      })
    }
  }
}

export const webhookService = new WebhookService()
