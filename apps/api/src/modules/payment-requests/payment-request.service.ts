import { fiberProvider } from '../../providers/fiber/fiber-provider.js'
import { env } from '../../config/env.js'
import { Decimal, money } from '../../utils/money.js'
import { prisma } from '../../db/prisma.js'
import { ApiError } from '../../utils/errors.js'
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
    let amount: InstanceType<typeof Decimal>
    try {
      amount = new Decimal(input.amount)
    } catch {
      throw new ApiError('validation_error', 'Payment amount must be a valid number.', 400)
    }
    if (!amount.isFinite() || amount.lessThanOrEqualTo(0)) {
      throw new ApiError('validation_error', 'Payment amount must be positive.', 400)
    }

    if (env.fiberDemoAutopay) {
      if (env.fiberCurrency !== 'Fibt') {
        throw new ApiError(
          'demo_testnet_only',
          'The automated demo payer is restricted to Fiber testnet.',
          403,
        )
      }
      if (input.asset !== 'CKB' || amount.greaterThan(env.fiberDemoMaxPaymentCkb)) {
        throw new ApiError(
          'demo_payment_limit',
          `Automated demo payments are limited to ${env.fiberDemoMaxPaymentCkb} CKB.`,
          400,
        )
      }
    }

    const providerResponse = await fiberProvider.createPaymentRequest({
      amount: input.amount,
      asset: input.asset,
      customerId: input.customerId,
      metadata: input.metadata as Record<string, unknown> | undefined,
    })

    return prisma.paymentRequest.create({
      data: {
        developerId,
        customerId: input.customerId,
        amount: input.amount,
        asset: input.asset,
        paymentUri: providerResponse.paymentUri,
        provider: fiberProvider.name,
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

  /** Verify settlement with Fiber (or sim provider), then credit balance if paid. */
  async verify(developerId: string, id: string) {
    const paymentRequest = await prisma.paymentRequest.findFirstOrThrow({
      where: { id, developerId },
    })

    if (paymentRequest.status === 'paid') {
      return {
        paymentRequest,
        verification: { paid: true, alreadyPaid: true as const },
      }
    }

    if (paymentRequest.expiresAt.getTime() < Date.now()) {
      const expired = await prisma.paymentRequest.update({
        where: { id },
        data: { status: 'expired' },
      })
      throw new ApiError(
        'payment_expired',
        'This payment request has expired. Create a new one.',
        410,
        { paymentRequest: expired },
      )
    }

    const verification = await fiberProvider.verifyPayment(
      paymentRequest.providerReference,
    )

    if (verification.paid) {
      const paid = await this.markPaid(developerId, id)
      return {
        paymentRequest: paid,
        verification: { paid: true, alreadyPaid: false as const, raw: verification.raw },
      }
    }

    return {
      paymentRequest,
      verification: { paid: false, alreadyPaid: false as const, raw: verification.raw },
    }
  }
}

export const paymentRequestService = new PaymentRequestService()
