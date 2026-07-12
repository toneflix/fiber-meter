import { Router } from 'express'

import { getFiberRpcUrl, nodeInfo } from './rpc.js'
import { runPreflight } from './preflight.js'
import { translateFiberError } from './errors.js'

export const preflightRouter = Router()

preflightRouter.get('/health', async (_req, res) => {
  const rpcUrl = getFiberRpcUrl()
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
