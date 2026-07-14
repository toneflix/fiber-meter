import { afterEach, describe, expect, it } from 'vitest'

import {
  getFiberRpcUrl,
  getPreflightFiberRpcUrl,
} from '../src/modules/preflight/rpc.js'

const originalFiberRpcUrl = process.env.FIBER_RPC_URL
const originalPreflightRpcUrl = process.env.FIBER_PREFLIGHT_RPC_URL

afterEach(() => {
  if (originalFiberRpcUrl === undefined) delete process.env.FIBER_RPC_URL
  else process.env.FIBER_RPC_URL = originalFiberRpcUrl

  if (originalPreflightRpcUrl === undefined) delete process.env.FIBER_PREFLIGHT_RPC_URL
  else process.env.FIBER_PREFLIGHT_RPC_URL = originalPreflightRpcUrl
})

describe('Fiber RPC endpoint selection', () => {
  it('uses a dedicated payer endpoint for preflight when configured', () => {
    process.env.FIBER_RPC_URL = 'http://127.0.0.1:8237'
    process.env.FIBER_PREFLIGHT_RPC_URL = 'http://127.0.0.1:8247'

    expect(getFiberRpcUrl()).toBe('http://127.0.0.1:8237')
    expect(getPreflightFiberRpcUrl()).toBe('http://127.0.0.1:8247')
  })

  it('falls back to the invoice node for single-node installations', () => {
    process.env.FIBER_RPC_URL = 'http://127.0.0.1:8227'
    delete process.env.FIBER_PREFLIGHT_RPC_URL

    expect(getPreflightFiberRpcUrl()).toBe('http://127.0.0.1:8227')
  })
})
