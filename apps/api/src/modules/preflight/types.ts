export type HexString = `0x${string}`

export interface FiberRpcError {
  code: number
  message: string
  data?: unknown
}

export interface NodeInfo {
  version: string
  commit_hash: string
  node_id: string
  node_name?: string
  peers_count: string | number
  channel_count: string | number
  pending_channel_count: string | number
  chain_hash: HexString
  tlc_min_value: string | number
}

export interface PeerInfo {
  pubkey: string
  peer_id: string
  address: string
}

export interface ChannelState {
  ChannelReady?: Record<string, never>
  NegotiatingFunding?: Record<string, unknown>
  Closed?: Record<string, unknown>
  ShuttingDown?: Record<string, unknown>
  [key: string]: unknown
}

export interface Channel {
  channel_id: HexString
  peer_id: string
  state: ChannelState
  local_balance: string | number
  offered_tlc_balance: string | number
  remote_balance: string | number
  enabled: boolean
  funding_udt_type_script?: unknown
  /** On-chain funding outpoint. Object `{ tx_hash, index }` or a hex string. */
  channel_outpoint?: { tx_hash?: string; index?: string } | string
}

export interface InvoiceAttribute {
  Description?: string
  ExpiryTime?: string | number
  UdtScript?: unknown
  PayeePublicKey?: string
  FinalHtlcMinimumExpiryDelta?: string | number
  [key: string]: unknown
}

export interface CkbInvoice {
  currency: string
  amount?: string | number | null
  data: {
    timestamp: string | number
    payment_hash: HexString
    attrs: InvoiceAttribute[]
  }
}

export interface ParseInvoiceResult {
  invoice: CkbInvoice
}

export interface ListChannelsResult {
  channels: Channel[]
}

export interface ListPeersResult {
  peers: PeerInfo[]
}

export interface SendPaymentResult {
  payment_hash: HexString
  status: string | Record<string, unknown>
  fee: string | number
  failed_error?: string | null
  routers?: unknown[]
}

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip'

export interface PreflightCheck {
  id: string
  label: string
  status: CheckStatus
  detail: string
  suggestion?: string
  /** Raw error string returned by the Fiber node, when the check failed on an RPC error. */
  raw?: string
  /** Fiber RPC error code, when available. */
  code?: number
}

export interface PreflightResult {
  ready: boolean
  invoice?: {
    amount: string
    currency: string
    paymentHash: string
    description?: string
    payee?: string
  }
  node?: {
    nodeId: string
    version: string
    peersCount: number
    channelCount: number
  }
  checks: PreflightCheck[]
  estimatedFee?: string
  routeHops?: number
  ranAt: string
}

export interface TranslatedError {
  code?: number
  raw: string
  title: string
  explanation: string
  suggestions: string[]
  category:
    | 'connectivity'
    | 'invoice'
    | 'routing'
    | 'liquidity'
    | 'peer'
    | 'fee'
    | 'unknown'
}
