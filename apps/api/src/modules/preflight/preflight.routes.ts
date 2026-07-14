import { Router } from 'express'

import { getPreflightFiberRpcUrl, listChannels, nodeInfo } from './rpc.js'
import { channelStateName, runPreflight } from './preflight.js'
import { translateFiberError } from './errors.js'
import type { Channel } from './types.js'

export const preflightRouter = Router()

const EXPLORER_BASE = (process.env.CKB_EXPLORER_URL ?? 'https://testnet.explorer.nervos.org').replace(
  /\/$/,
  '',
)

/** Pull a 0x + 64-hex tx hash out of Fiber's channel_outpoint (object or molecule string). */
function fundingTxHash(outpoint: Channel['channel_outpoint']): string | undefined {
  if (!outpoint) return undefined
  const raw = typeof outpoint === 'string' ? outpoint : outpoint.tx_hash
  if (typeof raw !== 'string') return undefined
  const hex = raw.startsWith('0x') ? raw : `0x${raw}`
  // A molecule-encoded outpoint is tx_hash(32B) + index(4B); take the tx hash prefix.
  const candidate = hex.slice(0, 66)
  return /^0x[0-9a-fA-F]{64}$/.test(candidate) ? candidate.toLowerCase() : undefined
}

preflightRouter.get('/health', async (_req, res) => {
  const rpcUrl = getPreflightFiberRpcUrl()
  try {
    const info = await nodeInfo()
    res.json({
      ok: true,
      rpcUrl,
      node: {
        nodeId: info.node_id,
        version: info.version,
        peersCount: Number(info.peers_count),
        channelCount: Number(info.channel_count),
        chainHash: info.chain_hash,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Health check failed'
    res.status(503).json({
      ok: false,
      rpcUrl,
      error: message,
    })
  }
})

preflightRouter.post('/preflight', async (req, res) => {
  const invoice = typeof req.body?.invoice === 'string' ? req.body.invoice.trim() : ''
  if (!invoice) {
    res.status(400).json({
      error: { code: 'validation_error', message: 'Missing invoice in request body' },
    })
    return
  }

  try {
    const result = await runPreflight(invoice)
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Preflight failed'
    res.status(500).json({
      error: { code: 'preflight_error', message },
    })
  }
})

/**
 * Public, read-only "proof of live settlement" surface. A Fiber payment is
 * off-chain and not itself on any explorer — but the CHANNEL it settled through
 * is an on-chain CKB transaction. This returns each channel's funding tx with a
 * CKB testnet explorer link so auditors can independently verify the
 * node is running a real, funded channel on testnet.
 */
preflightRouter.get('/live-proof', async (_req, res) => {
  const rpcUrl = getPreflightFiberRpcUrl()
  try {
    const [info, { channels }] = await Promise.all([nodeInfo(), listChannels(false)])
    const proof = channels.map((channel) => {
      const txHash = fundingTxHash(channel.channel_outpoint)
      return {
        channelId: channel.channel_id,
        state: channelStateName(channel.state),
        enabled: channel.enabled,
        localBalance: String(channel.local_balance),
        remoteBalance: String(channel.remote_balance),
        fundingTxHash: txHash,
        explorerUrl: txHash ? `${EXPLORER_BASE}/transaction/${txHash}` : undefined,
      }
    })
    res.json({
      live: true,
      rpcUrl,
      node: { nodeId: info.node_id, version: info.version },
      explorerBase: EXPLORER_BASE,
      channels: proof,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to read channels'
    res.status(503).json({ live: false, rpcUrl, error: message, channels: [] })
  }
})

preflightRouter.post('/translate-error', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
  if (!message) {
    res.status(400).json({
      error: { code: 'validation_error', message: 'Missing message in request body' },
    })
    return
  }

  const code = typeof req.body?.code === 'number' ? req.body.code : undefined
  const translated = translateFiberError(
    message,
    code !== undefined ? { code, message } : undefined,
  )
  res.json(translated)
})
