import type { FiberRpcError, TranslatedError } from './types.js'

interface ErrorPattern {
  pattern: RegExp
  category: TranslatedError['category']
  title: string
  explanation: string
  suggestions: string[]
}

const PATTERNS: ErrorPattern[] = [
  {
    pattern: /connect|connection refused|econnrefused|network|unreachable/i,
    category: 'connectivity',
    title: 'Cannot reach Fiber node',
    explanation:
      'FiberMeter could not talk to your Fiber node. The RPC endpoint may be down or the URL is wrong.',
    suggestions: [
      'Start your Fiber node and confirm the RPC port (default 8227).',
      'Set FIBER_RPC_URL in apps/api/.env to the correct endpoint.',
      'For testnet, try the public node at http://18.163.221.211:8227.',
    ],
  },
  {
    pattern: /parse.*invoice|invalid.*invoice|bech32|checksum/i,
    category: 'invoice',
    title: 'Invalid invoice',
    explanation:
      'The invoice string could not be parsed. It may be truncated, corrupted, or from a different network.',
    suggestions: [
      'Copy the full invoice string from the payee.',
      'Confirm the invoice is for the same network as your node (testnet vs mainnet).',
      'Ask the payee to generate a fresh invoice.',
    ],
  },
  {
    pattern: /expir/i,
    category: 'invoice',
    title: 'Invoice expired',
    explanation: 'This invoice is past its expiry time and can no longer be paid.',
    suggestions: [
      'Request a new invoice from the merchant or recipient.',
      'Pay sooner after receiving an invoice in future flows.',
    ],
  },
  {
    pattern: /no route|route not found|failed to find.*path|unreachable/i,
    category: 'routing',
    title: 'No payment route',
    explanation:
      'Your node cannot find a path to the payee through the Fiber network. This usually means missing channels or peers between you and the destination.',
    suggestions: [
      'Open a channel to a well-connected peer, or connect to more peers.',
      'If the invoice includes private hop hints, ensure you have a channel to the hinted peer.',
      'Try again after network liquidity improves, or pay via a closer intermediary.',
    ],
  },
  {
    pattern: /insufficient|not enough|capacity|balance|liquidity/i,
    category: 'liquidity',
    title: 'Insufficient channel liquidity',
    explanation:
      'Your node does not have enough outbound capacity in the right asset to cover this payment (plus forwarding fees).',
    suggestions: [
      'Check channel balances with list_channels on your node.',
      'Move liquidity to the outbound side of a channel (rebalance or open a new channel).',
      'For UDT invoices, ensure you have a channel funded with that asset.',
    ],
  },
  {
    pattern: /peer.*not|unknown peer|disconnect|not connected/i,
    category: 'peer',
    title: 'Peer not connected',
    explanation:
      'A required peer is not connected to your node, so the payment cannot be forwarded.',
    suggestions: [
      'Use connect_peer to reconnect to the destination or an intermediate hop.',
      'Verify the peer address is correct and the remote node is online.',
    ],
  },
  {
    pattern: /fee|max_fee/i,
    category: 'fee',
    title: 'Fee limit too low',
    explanation:
      'The route exists but the maximum fee you allowed is lower than what the path requires.',
    suggestions: [
      'Increase max_fee_amount when calling send_payment.',
      'Try a different route or wait for lower-fee paths.',
    ],
  },
  {
    pattern: /udt|type script|asset/i,
    category: 'liquidity',
    title: 'Wrong asset or UDT channel',
    explanation:
      'The invoice requests a specific asset (UDT) but your node may not have a matching funded channel.',
    suggestions: [
      'Open or fund a channel with the UDT type script from the invoice.',
      'Confirm the invoice currency matches channels you operate.',
    ],
  },
  {
    pattern: /timeout|timed out/i,
    category: 'routing',
    title: 'Payment timed out',
    explanation:
      'The payment did not complete within the allowed time. Intermediate hops may have been slow or offline.',
    suggestions: [
      'Retry with a higher timeout value.',
      'Check peer connectivity and channel health before retrying.',
    ],
  },
]

function matchPattern(message: string): ErrorPattern | undefined {
  return PATTERNS.find((p) => p.pattern.test(message))
}

export function translateFiberError(
  raw: string,
  rpcError?: FiberRpcError,
): TranslatedError {
  const message = rpcError?.message ?? raw
  const matched = matchPattern(message)

  if (matched) {
    return {
      code: rpcError?.code,
      raw: message,
      title: matched.title,
      explanation: matched.explanation,
      suggestions: matched.suggestions,
      category: matched.category,
    }
  }

  return {
    code: rpcError?.code,
    raw: message,
    title: 'Payment error',
    explanation:
      'Fiber returned an error that FiberMeter does not have a specific mapping for yet.',
    suggestions: [
      'Check your Fiber node logs for the full error context.',
      'Verify invoice, peers, channels, and liquidity manually.',
    ],
    category: 'unknown',
  }
}
