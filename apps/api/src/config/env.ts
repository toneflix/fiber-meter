import dotenv from 'dotenv'

dotenv.config()

const csv = (value: string | undefined): string[] =>
  value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean) ?? []

export const env = {
  host: process.env.HOST ?? '0.0.0.0',
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  /** Empty in local development; a comma-separated allow-list when hosted. */
  corsOrigins: csv(process.env.CORS_ORIGINS),
  fiberRpcUrl: process.env.FIBER_RPC_URL ?? 'http://127.0.0.1:8227',
  /** `simulated` | `live` */
  fiberProvider: (process.env.FIBER_PROVIDER ?? 'simulated').toLowerCase() as
    | 'simulated'
    | 'live',
  /** Fiber invoice currency: Fibt (testnet) or Fibb (mainnet) */
  fiberCurrency: process.env.FIBER_CURRENCY ?? 'Fibt',
  fiberInvoiceExpirySecs: Number(process.env.FIBER_INVOICE_EXPIRY_SECS ?? 3600),
  /** Audit-only hosted demo: a separate controlled node pays pending invoices. */
  fiberDemoAutopay: process.env.FIBER_DEMO_AUTOPAY === 'true',
  fiberDemoMaxPaymentCkb: Number(process.env.FIBER_DEMO_MAX_PAYMENT_CKB ?? 5),
}
