import crypto from 'node:crypto'
import { request } from 'undici'

import { prisma } from '../../db/prisma.js'

export function signWebhook(body: string, secret: string, timestamp = Date.now().toString()) {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
}

export function createWebhookAuth(body: string, secret: string, timestamp = Date.now().toString()) {
  return {
    timestamp,
    signature: signWebhook(body, secret, timestamp),
  }
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
    const { signature } = createWebhookAuth(body, input.secret ?? 'dev')

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
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id },
      include: { service: { select: { webhookSecret: true, webhookUrl: true } } },
    })

    if (!delivery) {
      return
    }

    const body = JSON.stringify(delivery.payload)
    const auth = createWebhookAuth(body, delivery.service?.webhookSecret ?? 'dev')
    const targetUrl = delivery.service?.webhookUrl ?? delivery.targetUrl

    try {
      const response = await request(targetUrl, {
        method: 'POST',
        body,
        headers: {
          'content-type': 'application/json',
          'X-FiberMeter-Event': delivery.eventType,
          'X-FiberMeter-Signature': auth.signature,
          'X-FiberMeter-Timestamp': auth.timestamp,
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
          signature: auth.signature,
          targetUrl,
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
