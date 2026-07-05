import { Prisma } from '@prisma/client'

export const Decimal = Prisma.Decimal

export function calculateCharge(
  model: string,
  price: Prisma.Decimal.Value,
  quantity: Prisma.Decimal.Value,
) {
  const unitPrice = new Decimal(price)
  const usageQuantity = new Decimal(quantity)

  if (model === 'fixed_per_request') {
    return unitPrice
  }

  if (model === 'per_1000_units') {
    return unitPrice.mul(usageQuantity).div(1000).toDecimalPlaces(12)
  }

  return unitPrice.mul(usageQuantity).toDecimalPlaces(12)
}

export function money(value: Prisma.Decimal.Value) {
  return new Decimal(value).toString()
}
