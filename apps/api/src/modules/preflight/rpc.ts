import type { FiberRpcError } from './types.js'

let requestId = 1

const RPC_TIMEOUT_MS = 15_000

export function getFiberRpcUrl(): string {
  return process.env.FIBER_RPC_URL ?? 'http://127.0.0.1:8227'
}

/**
 * The node that evaluates whether an invoice can be paid. In a hosted demo
 * this is the payer node, while FIBER_RPC_URL remains the payee node used to
 * create and verify invoices.
 */
export function getPreflightFiberRpcUrl(): string {
  return process.env.FIBER_PREFLIGHT_RPC_URL ?? getFiberRpcUrl()
}

export class FiberRpcClientError extends Error {
  constructor(
    message: string,
    public readonly rpcError?: FiberRpcError,
  ) {
    super(message)
    this.name = 'FiberRpcClientError'
  }
}

export async function fiberRpc<T>(
  method: string,
  params: Record<string, unknown> = {},
  url = getFiberRpcUrl(),
): Promise<T> {
  const body = {
    jsonrpc: '2.0',
    id: requestId++,
    method,
    params: [params],
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reach Fiber node'
    const hint =
      err instanceof Error && err.name === 'AbortError'
        ? `Timed out after ${RPC_TIMEOUT_MS / 1000}s`
        : message
    throw new FiberRpcClientError(`Cannot connect to Fiber RPC at ${url}: ${hint}`)
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    throw new FiberRpcClientError(`Fiber RPC HTTP ${response.status} from ${url}`)
  }

  const payload = (await response.json()) as {
    result?: T
    error?: FiberRpcError
  }

  if (payload.error) {
    throw new FiberRpcClientError(payload.error.message, payload.error)
  }

  if (payload.result === undefined) {
    throw new FiberRpcClientError(`Fiber RPC returned no result for ${method}`)
  }

  return payload.result
}

export async function nodeInfo() {
  return fiberRpc<import('./types.js').NodeInfo>('node_info', {}, getPreflightFiberRpcUrl())
}

export async function listPeers() {
  return fiberRpc<import('./types.js').ListPeersResult>('list_peers', {}, getPreflightFiberRpcUrl())
}

export async function listChannels(includeClosed = false) {
  return fiberRpc<import('./types.js').ListChannelsResult>(
    'list_channels',
    { include_closed: includeClosed },
    getPreflightFiberRpcUrl(),
  )
}

export async function parseInvoice(invoice: string) {
  return fiberRpc<import('./types.js').ParseInvoiceResult>(
    'parse_invoice',
    { invoice },
    getPreflightFiberRpcUrl(),
  )
}

export async function sendPaymentDryRun(invoice: string) {
  return fiberRpc<import('./types.js').SendPaymentResult>(
    'send_payment',
    { invoice, dry_run: true },
    getPreflightFiberRpcUrl(),
  )
}

export interface NewInvoiceResult {
  invoice_address: string
  invoice: import('./types.js').CkbInvoice
}

export interface GetInvoiceResult {
  invoice_address: string
  invoice: import('./types.js').CkbInvoice
  status: string | Record<string, unknown>
}

export async function newInvoice(params: {
  amount: string
  currency: string
  description?: string
  expiry?: string
  payment_preimage: string
  hash_algorithm?: string
  final_cltv?: string
}) {
  return fiberRpc<NewInvoiceResult>('new_invoice', params)
}

export async function getInvoice(paymentHash: string) {
  return fiberRpc<GetInvoiceResult>('get_invoice', {
    payment_hash: paymentHash,
  })
}
