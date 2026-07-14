import { ArrowUpRight, Check, Gauge, LoaderCircle, Sparkles, WalletCards } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'

import { DEMO_RATE_PER_1000_TOKENS, MAX_TEXT_LENGTH, estimateTokens } from './lib/summary'

type MeteringResult = {
  status: 'charged'
  usageEventId: string
  amount: string
  asset: string
  balanceRemaining?: string
  quantity?: number
}

type SummaryResult = {
  summary: string
  metering: MeteringResult
}

type ErrorPayload = {
  error?: {
    code?: string
    message?: string
  }
  metering?: {
    required?: string
    available?: string
    asset?: string
  }
}

const DEFAULT_TEXT =
  'FiberMeter gives software services a prepaid balance and usage-based billing layer. Each API call records a metered event, deducts the configured price, and preserves an auditable ledger. Fiber payments can replenish the balance without exposing payment infrastructure to the service itself.'

const dashboardUrl = import.meta.env.VITE_DASHBOARD_URL || 'https://app.fibermeter.toneflix.net'

export function App() {
  const [text, setText] = useState(DEFAULT_TEXT)
  const [result, setResult] = useState<SummaryResult | null>(null)
  const [error, setError] = useState<ErrorPayload | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const tokens = useMemo(() => estimateTokens(text), [text])
  const estimatedCost = ((tokens * DEMO_RATE_PER_1000_TOKENS) / 1000).toFixed(4)
  const canSubmit = text.trim().length > 0 && text.length <= MAX_TEXT_LENGTH && !isSubmitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    setIsSubmitting(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, requestId: crypto.randomUUID() }),
      })
      const payload = (await response.json()) as SummaryResult & ErrorPayload

      if (!response.ok) {
        setError(payload)
        return
      }

      setResult(payload)
    } catch {
      setError({
        error: {
          code: 'network_error',
          message: 'The demo service could not be reached. Please try again.',
        },
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="FiberMeter demo home">
          <span className="brand-mark"><Gauge size={21} /></span>
          <span>FiberMeter</span>
          <span className="demo-label">Demo</span>
        </a>
        <a className="dashboard-link" href={dashboardUrl} target="_blank" rel="noreferrer">
          Open dashboard <ArrowUpRight size={16} />
        </a>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow"><Sparkles size={15} /> Live metering example</div>
          <h1>See usage-based billing happen inside an API call.</h1>
          <p>
            Submit text to the summary service. FiberMeter records the usage, charges the prepaid customer
            balance, and returns the result only after the charge succeeds.
          </p>
        </section>

        <section className="demo-grid">
          <form className="panel input-panel" onSubmit={handleSubmit}>
            <div className="panel-heading">
              <div>
                <span className="step">01</span>
                <h2>Submit text</h2>
              </div>
              <span className="status-dot">Service online</span>
            </div>

            <label htmlFor="summary-text">Text to summarize</label>
            <textarea
              id="summary-text"
              value={text}
              maxLength={MAX_TEXT_LENGTH}
              onChange={(event) => setText(event.target.value)}
              aria-describedby="text-meter"
            />

            <div className="usage-preview" id="text-meter">
              <div>
                <span>Estimated usage</span>
                <strong>{tokens.toLocaleString()} tokens</strong>
              </div>
              <div>
                <span>Estimated charge</span>
                <strong>{estimatedCost} CKB</strong>
              </div>
              <div>
                <span>Input</span>
                <strong>{text.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()}</strong>
              </div>
            </div>

            <button className="primary-button" type="submit" disabled={!canSubmit}>
              {isSubmitting ? <LoaderCircle className="spinner" size={19} /> : <Sparkles size={19} />}
              {isSubmitting ? 'Metering request…' : 'Summarize and charge'}
            </button>
            <p className="security-note">
              The demo credential stays in the server function; no FiberMeter API key is sent to your browser.
            </p>
          </form>

          <section className="panel result-panel" aria-live="polite">
            <div className="panel-heading">
              <div>
                <span className="step">02</span>
                <h2>Metered response</h2>
              </div>
              {result && <span className="charged-badge"><Check size={14} /> Charged</span>}
            </div>

            {isSubmitting && (
              <div className="result-state loading-state">
                <span className="loader-ring"><LoaderCircle className="spinner" size={30} /></span>
                <h3>Recording usage</h3>
                <p>FiberMeter is checking the balance and applying the configured pricing rule.</p>
              </div>
            )}

            {!isSubmitting && error && (
              <div className="result-state error-state">
                <span className="result-icon"><WalletCards size={28} /></span>
                <h3>{error.error?.code === 'payment_required' ? 'Balance required' : 'Request not completed'}</h3>
                <p>{error.error?.message || 'The metered request could not be completed.'}</p>
                {error.metering && (
                  <dl className="charge-details">
                    <div><dt>Required</dt><dd>{error.metering.required} {error.metering.asset}</dd></div>
                    <div><dt>Available</dt><dd>{error.metering.available} {error.metering.asset}</dd></div>
                  </dl>
                )}
                <a className="secondary-link" href={dashboardUrl} target="_blank" rel="noreferrer">
                  Manage balance <ArrowUpRight size={15} />
                </a>
              </div>
            )}

            {!isSubmitting && result && (
              <div className="completed-result">
                <div className="summary-copy">
                  <span>Extractive summary</span>
                  <p>{result.summary}</p>
                </div>
                <dl className="charge-details">
                  <div><dt>Usage charged</dt><dd>{result.metering.amount} {result.metering.asset}</dd></div>
                  <div>
                    <dt>Balance remaining</dt>
                    <dd>{result.metering.balanceRemaining ?? 'Recorded'} {result.metering.balanceRemaining ? result.metering.asset : ''}</dd>
                  </div>
                  <div><dt>Usage event</dt><dd className="event-id">{result.metering.usageEventId}</dd></div>
                </dl>
                <span className="verified-line"><Check size={15} /> Usage recorded before delivery</span>
              </div>
            )}

            {!isSubmitting && !result && !error && (
              <div className="result-state empty-state">
                <span className="result-icon"><WalletCards size={28} /></span>
                <h3>Ready for a metered request</h3>
                <p>Your summary and the actual FiberMeter charge will appear here.</p>
              </div>
            )}
          </section>
        </section>

        <section className="flow-strip" aria-label="Request flow">
          <div><span>1</span><p><strong>Submit</strong> Service receives the request</p></div>
          <i />
          <div><span>2</span><p><strong>Meter</strong> FiberMeter charges usage</p></div>
          <i />
          <div><span>3</span><p><strong>Deliver</strong> Result returns on success</p></div>
        </section>
      </main>
    </div>
  )
}
