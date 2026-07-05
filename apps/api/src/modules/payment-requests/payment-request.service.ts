import { prisma } from '../../db/prisma.js'
import { fiberProvider } from '../../providers/fiber/fiber-provider.js'
import { money } from '../../utils/money.js'
import { webhookService } from '../webhooks/webhook.service.js'

export class PaymentRequestService {
  async create(
    developerId: string,
    input: {
      customerId: string
      amount: string
      asset: string
      metadata?: object
    },
  ) {
    const providerResponse = await fiberProvider.createPaymentRequest({
      amount: input.amount,
      asset: input.asset,
      customerId: input.customerId,
      metadata: input.metadata,
    })

    return prisma.paymentRequest.create({
      data: {
        developerId,
        customerId: input.customerId,
        amount: input.amount,
        asset: input.asset,
        paymentUri: providerResponse.paymentUri,
        providerReference: providerResponse.providerReference,
        expiresAt: providerResponse.expiresAt,
        metadata: input.metadata,
      },
    })
  }

  async markPaid(developerId: string, id: string) {
    return prisma.$transaction(async (tx) => {
      const paymentRequest = await tx.paymentRequest.findFirstOrThrow({
        where: { id, developerId },
        include: { customer: true },
      })

      if (paymentRequest.status === 'paid') {
        return paymentRequest
      }

      const balance = await tx.balance.upsert({
        where: {
          customerId_asset: {
            customerId: paymentRequest.customerId,
            asset: paymentRequest.asset,
          },
        },
        create: {
          customerId: paymentRequest.customerId,
          asset: paymentRequest.asset,
          availableBalance: paymentRequest.amount,
          totalFunded: paymentRequest.amount,
        },
        update: {
          availableBalance: { increment: paymentRequest.amount },
          totalFunded: { increment: paymentRequest.amount },
        },
      })

      const paidPaymentRequest = await tx.paymentRequest.update({
        where: { id },
        data: {
          status: 'paid',
          paidAt: new Date(),
        },
      })

      await tx.ledgerEntry.create({
        data: {
          developerId,
          customerId: paymentRequest.customerId,
          type: 'balance_funded',
          direction: 'credit',
          amount: paymentRequest.amount,
          asset: paymentRequest.asset,
          balanceAfter: balance.availableBalance,
          referenceType: 'payment_request',
          referenceId: paymentRequest.id,
        },
      })

      void webhookService.enqueue({
        developerId,
        eventType: 'balance.funded',
        payload: {
          paymentRequestId: id,
          customer: paymentRequest.customer.externalId,
          amount: money(paymentRequest.amount),
          asset: paymentRequest.asset,
        },
        targetUrl: undefined,
      })

      return paidPaymentRequest
    })
  }
}

export const paymentRequestService = new PaymentRequestService()
