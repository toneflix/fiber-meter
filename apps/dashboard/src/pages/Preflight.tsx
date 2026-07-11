import React, { useCallback, useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { API_BASE, tokenStore } from '../lib/api'

type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip'

interface PreflightCheck {
  id: string
  label: string
  status: CheckStatus
  detail: string
  suggestion?: string
}

interface PreflightResult {
  ready: boolean
  invoice?: {
    amount: string
    currency: string
    paymentHash: string
    description?: string
  }
  checks: PreflightCheck[]
  estimatedFee?: string
  ranAt: string
}

type HealthState =
  | { status: 'loading' }
  | { status: 'ok'; peers: number; channels: number; version: string }
  | { status: 'error'; message: string }

function statusBadge(status: CheckStatus) {
  if (status === 'pass') return <Badge variant="success">OK</Badge>
  if (status === 'warn') return <Badge variant="secondary">WARN</Badge>
  if (status === 'fail') return <Badge variant="destructive">FAIL</Badge>
  return <Badge variant="outline">SKIP</Badge>
}

export function Preflight() {
  const [invoice, setInvoice] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PreflightResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [health, setHealth] = useState<HealthState>({ status: 'loading' })

  const loadHealth = useCallback(async () => {
    setHealth({ status: 'loading' })
    try {
      const res = await fetch(`${API_BASE}/fiber/health`)
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setHealth({
          status: 'error',
          message: data.error ?? 'Fiber node unreachable',
        })
        return
      }
      setHealth({
        status: 'ok',
        peers: data.node.peersCount,
        channels: data.node.channelCount,
        version: data.node.version,
      })
    } catch {
      setHealth({ status: 'error', message: 'Could not reach FiberMeter API' })
    }
  }, [])

  useEffect(() => {
    void loadHealth()
    const pending = sessionStorage.getItem('fibermeter_preflight_invoice')
    if (pending) {
      setInvoice(pending)
      sessionStorage.removeItem('fibermeter_preflight_invoice')
    }
  }, [loadHealth])

  async function runPreflight() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      const token = tokenStore.get()
      if (token) headers.Authorization = `Bearer ${token}`

      const res = await fetch(`${API_BASE}/fiber/preflight`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ invoice }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error?.message ?? 'Preflight request failed')
        return
      }
      setResult(data as PreflightResult)
    } catch {
      setError('Network error — is the FiberMeter API running on :4000?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-blue-600" />
          Payment Preflight
        </h1>
        <p className="text-zinc-500 mt-1">
          Can this Fiber invoice be paid? Run PayReady-style checks before top-up
          or send_payment.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Fiber node</CardTitle>
          <Button variant="outline" size="sm" onClick={() => void loadHealth()}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {health.status === 'loading' && (
            <p className="text-sm text-zinc-500">Checking…</p>
          )}
          {health.status === 'ok' && (
            <p className="text-sm text-green-700 font-medium">
              v{health.version} · {health.peers} peers · {health.channels} channels
            </p>
          )}
          {health.status === 'error' && (
            <p className="text-sm text-red-600">{health.message}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fiber invoice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            rows={4}
            value={invoice}
            onChange={(e) => setInvoice(e.target.value)}
            placeholder="Paste encoded Fiber invoice (fibt1…)"
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button
            onClick={() => void runPreflight()}
            disabled={loading || !invoice.trim()}
          >
            {loading ? 'Running checks…' : 'Run preflight'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="pt-6 text-sm text-red-600">{error}</CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={result.ready ? 'success' : 'destructive'}>
              {result.ready ? 'Ready to pay' : 'Not ready'}
            </Badge>
            {result.estimatedFee && (
              <span className="text-sm text-zinc-500">
                Est. fee: {result.estimatedFee}
              </span>
            )}
          </div>

          {result.invoice && (
            <Card>
              <CardContent className="pt-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Amount</span>
                  <span className="font-medium">{result.invoice.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Currency</span>
                  <span className="font-medium">{result.invoice.currency}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {result.checks.map((c) => (
              <Card key={c.id}>
                <CardContent className="pt-4 flex gap-3">
                  <div className="pt-0.5">{statusBadge(c.status)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{c.label}</p>
                    <p className="text-sm text-zinc-500 mt-1">{c.detail}</p>
                    {c.suggestion && (
                      <p className="text-sm text-blue-700 mt-2">→ {c.suggestion}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
