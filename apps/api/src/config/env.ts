import dotenv from 'dotenv'

dotenv.config()

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  fiberRpcUrl: process.env.FIBER_RPC_URL ?? 'http://127.0.0.1:8227',
  /** `simulated` | `live` */
  fiberProvider: (process.env.FIBER_PROVIDER ?? 'simulated').toLowerCase() as
    | 'simulated'
    | 'live',
  /** Fiber invoice currency: Fibt (testnet) or Fibb (mainnet) */
  fiberCurrency: process.env.FIBER_CURRENCY ?? 'Fibt',
  fiberInvoiceExpirySecs: Number(process.env.FIBER_INVOICE_EXPIRY_SECS ?? 3600),
}
