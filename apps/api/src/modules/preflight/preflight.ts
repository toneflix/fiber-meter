import { FiberRpcClientError } from './rpc.js'
import {
  listChannels,
  listPeers,
  nodeInfo,
  parseInvoice,
  sendPaymentDryRun,
} from './rpc.js'
import { translateFiberError } from './errors.js'
import type {
  Channel,
  CkbInvoice,
  PreflightCheck,
  PreflightResult,
} from './types.js'

function toBigInt(value: string | number | null | undefined): bigint {
  if (value === null || value === undefined) return BigInt(0)
  if (typeof value === 'number') return BigInt(value)
  const trimmed = value.trim()
  if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
    return BigInt(trimmed)
  }
  return BigInt(trimmed)
}

function formatShannons(amount: bigint): string {
  const ckb = Number(amount) / 1e8
  if (ckb >= 0.0001) {
    return `${ckb.toLocaleString(undefined, { maximumFractionDigits: 8 })} CKB`
  }
  return `${amount.toString()} shannons`
}

function isChannelReady(channel: Channel): boolean {
  return (
    channel.enabled &&
    (channel.state?.ChannelReady !== undefined ||
      Object.keys(channel.state ?? {})[0] === 'ChannelReady')
  )
}

function getInvoiceAttr<T>(invoice: CkbInvoice, key: string): T | undefined {
  for (const attr of invoice.data.attrs) {
    if (key in attr) {
      return attr[key] as T
    }
  }
  return undefined
}

function check(
  id: string,
  label: string,
  status: PreflightCheck['status'],
  detail: string,
  suggestion?: string,
): PreflightCheck {
  return { id, label, status, detail, suggestion }
}

export async function runPreflight(invoiceStr: string): Promise<PreflightResult> {
  const checks: PreflightCheck[] = []
  let ready = true
  let parsedInvoice: CkbInvoice | undefined
  let estimatedFee: string | undefined
  let routeHops: number | undefined
  let nodeSummary: PreflightResult['node']
  let invoiceSummary: PreflightResult['invoice']

  const fail = (c: PreflightCheck) => {
    checks.push(c)
    ready = false
  }

  const add = (c: PreflightCheck) => {
    checks.push(c)
    if (c.status === 'fail') ready = false
  }

  try {
    const info = await nodeInfo()
    const peers = Number(info.peers_count)
    const channels = Number(info.channel_count)
    nodeSummary = {
      nodeId: info.node_id,
      version: info.version,
      peersCount: peers,
      channelCount: channels,
    }
    add(
      check(
        'node',
        'Fiber node online',
        'pass',
        `Connected to ${info.node_name ?? 'node'} v${info.version} (${peers} peers, ${channels} channels)`,
      ),
    )
  } catch (err) {
    const msg =
      err instanceof FiberRpcClientError ? err.message : 'Unknown connection error'
    const translated = translateFiberError(msg)
    fail(
      check(
        'node',
        'Fiber node online',
        'fail',
        translated.explanation,
        translated.suggestions[0],
      ),
    )
    return {
      ready: false,
      checks,
      ranAt: new Date().toISOString(),
    }
  }

  try {
    const parsed = await parseInvoice(invoiceStr.trim())
    parsedInvoice = parsed.invoice
    const amount = parsedInvoice.amount ? toBigInt(parsedInvoice.amount) : BigInt(0)
    const description = getInvoiceAttr<string>(parsedInvoice, 'Description')
    const payee = getInvoiceAttr<string>(parsedInvoice, 'PayeePublicKey')

    invoiceSummary = {
      amount: amount > BigInt(0) ? formatShannons(amount) : 'any',
      currency: parsedInvoice.currency,
      paymentHash: parsedInvoice.data.payment_hash,
      description,
      payee,
    }

    add(
      check(
        'invoice',
        'Invoice valid',
        'pass',
        `Parsed ${parsedInvoice.currency} invoice for ${invoiceSummary.amount}${
          description ? ` — "${description}"` : ''
        }`,
      ),
    )
  } catch (err) {
    const msg =
      err instanceof FiberRpcClientError ? err.message : 'Could not parse invoice'
    const translated = translateFiberError(msg)
    fail(
      check(
        'invoice',
        'Invoice valid',
        'fail',
        translated.explanation,
        translated.suggestions[0],
      ),
    )
    return { ready: false, checks, ranAt: new Date().toISOString() }
  }

  const expirySeconds = getInvoiceAttr<string | number>(parsedInvoice!, 'ExpiryTime')
  if (expirySeconds !== undefined) {
    const created = Number(parsedInvoice!.data.timestamp)
    const expiryMs =
      created + Number(expirySeconds) * (Number(expirySeconds) < 1e12 ? 1000 : 1)
    const now = Date.now()
    if (now > expiryMs) {
      fail(
        check(
          'expiry',
          'Invoice not expired',
          'fail',
          `Invoice expired at ${new Date(expiryMs).toISOString()}`,
          'Request a new invoice from the payee.',
        ),
      )
    } else {
      const remainingMin = Math.round((expiryMs - now) / 60000)
      add(
        check(
          'expiry',
          'Invoice not expired',
          remainingMin < 5 ? 'warn' : 'pass',
          remainingMin < 5
            ? `Expires in ${remainingMin} min — pay soon`
            : `Valid for ~${remainingMin} more minutes`,
          remainingMin < 5
            ? 'Consider requesting a fresh invoice if payment fails.'
            : undefined,
        ),
      )
    }
  } else {
    add(
      check(
        'expiry',
        'Invoice not expired',
        'pass',
        'No expiry attribute on invoice (assumed open)',
      ),
    )
  }

  try {
    const { peers } = await listPeers()
    if (peers.length === 0) {
      fail(
        check(
          'peers',
          'Peers connected',
          'fail',
          'No peers connected — you cannot route payments yet.',
          'Use connect_peer to join the Fiber network.',
        ),
      )
    } else {
      add(
        check(
          'peers',
          'Peers connected',
          peers.length < 2 ? 'warn' : 'pass',
          `${peers.length} peer(s) connected`,
          peers.length < 2 ? 'More peers improve routing options.' : undefined,
        ),
      )
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'list_peers failed'
    add(check('peers', 'Peers connected', 'warn', msg))
  }

  try {
    const { channels } = await listChannels()
    const readyChannels = channels.filter(isChannelReady)
    const payAmount = parsedInvoice!.amount
      ? toBigInt(parsedInvoice!.amount)
      : BigInt(0)
    const udtScript = getInvoiceAttr<unknown>(parsedInvoice!, 'UdtScript')

    const relevant = readyChannels.filter((ch) => {
      if (udtScript) return Boolean(ch.funding_udt_type_script)
      return !ch.funding_udt_type_script
    })

    const outbound = relevant.reduce((sum, ch) => {
      const local = toBigInt(ch.local_balance)
      const offered = toBigInt(ch.offered_tlc_balance)
      return sum + (local > offered ? local - offered : BigInt(0))
    }, BigInt(0))

    if (readyChannels.length === 0) {
      fail(
        check(
          'liquidity',
          'Channel liquidity',
          'fail',
          'No channels in ChannelReady state.',
          'Open a channel with open_channel before paying.',
        ),
      )
    } else if (payAmount > BigInt(0) && outbound < payAmount) {
      fail(
        check(
          'liquidity',
          'Channel liquidity',
          'fail',
          `Outbound capacity ~${formatShannons(outbound)} is below invoice ${formatShannons(payAmount)}.`,
          'Rebalance or open a channel with more outbound liquidity.',
        ),
      )
    } else {
      add(
        check(
          'liquidity',
          'Channel liquidity',
          'pass',
          payAmount > BigInt(0)
            ? `${relevant.length} ready channel(s), ~${formatShannons(outbound)} outbound`
            : `${readyChannels.length} ready channel(s)`,
        ),
      )
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'list_channels failed'
    add(
      check(
        'liquidity',
        'Channel liquidity',
        'warn',
        msg,
        'Could not verify liquidity automatically.',
      ),
    )
  }

  try {
    const dry = await sendPaymentDryRun(invoiceStr.trim())
    const fee = toBigInt(dry.fee)
    estimatedFee = formatShannons(fee)
    routeHops = Array.isArray(dry.routers) ? dry.routers.length : undefined

    const statusKey =
      typeof dry.status === 'string'
        ? dry.status
        : Object.keys(dry.status ?? {})[0] ?? 'unknown'

    if (dry.failed_error) {
      const translated = translateFiberError(dry.failed_error)
      fail(
        check(
          'route',
          'Route available (dry run)',
          'fail',
          translated.explanation,
          translated.suggestions[0],
        ),
      )
    } else {
      add(
        check(
          'route',
          'Route available (dry run)',
          'pass',
          `Route found — est. fee ${estimatedFee}${routeHops ? `, ${routeHops} hop(s)` : ''} (status: ${statusKey})`,
        ),
      )
    }
  } catch (err) {
    const msg =
      err instanceof FiberRpcClientError ? err.message : 'Dry-run routing failed'
    const translated = translateFiberError(
      msg,
      err instanceof FiberRpcClientError ? err.rpcError : undefined,
    )
    fail(
      check(
        'route',
        'Route available (dry run)',
        'fail',
        translated.explanation,
        translated.suggestions[0],
      ),
    )
  }

  return {
    ready,
    invoice: invoiceSummary,
    node: nodeSummary,
    checks,
    estimatedFee,
    routeHops,
    ranAt: new Date().toISOString(),
  }
}
