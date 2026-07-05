import type React from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

function Page({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  )
}

function Overview() {
  const cards = ['Services', 'Customers', 'Total funded', 'Usage charged', 'Webhook deliveries', 'Low balances']

  return (
    <Page title="FiberMeter Dashboard">
      <div className="grid">
        {cards.map((label, index) => (
          <div className="card" key={label}>
            <span className="badge">MVP</span>
            <h2>{index < 2 ? 'Live CRUD' : index === 2 ? '100 CKB' : 'Demo-ready'}</h2>
            <p>{label}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Infrastructure positioning</h2>
        <p>
          Reusable prepaid balances, usage metering, Fiber payment requests, ledgering, and webhooks for developers
          building paid APIs and digital services.
        </p>
      </div>
    </Page>
  )
}

function Crud({ name }: { name: string }) {
  return (
    <Page title={name}>
      <div className="card">
        <p>
          Connects to <code>{API}</code>. Use demo login <b>demo@fibermeter.dev</b> / <b>password123</b>.
        </p>
        <table>
          <tbody>
            <tr>
              <th>Status</th>
              <td>
                <span className="badge">polished MVP shell</span>
              </td>
            </tr>
            <tr>
              <th>Actions</th>
              <td>Create, inspect, copy IDs, and simulate payments via API.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Page>
  )
}

function Quickstart() {
  return (
    <Page title="Developer Quickstart">
      <div className="card">
        <pre>{`const meter = new FiberMeter({ apiKey: 'fm_...', baseUrl: '${API.replace('/api', '')}' })
await meter.recordUsage({ service:'ai-summary', customer:'cus_demo_001', metricKey:'tokens', quantity:1250, idempotencyKey:'req_123' })`}</pre>
      </div>
    </Page>
  )
}

export function App() {
  const links = ['Overview', 'Services', 'Customers', 'Payment Requests', 'Usage Events', 'Webhooks', 'Quickstart']

  return (
    <div className="layout">
      <aside className="side">
        <h2>⚡ FiberMeter</h2>
        {links.map((link) => (
          <NavLink key={link} to={link === 'Overview' ? '/' : `/${link.toLowerCase().replaceAll(' ', '-')}`}>
            {link}
          </NavLink>
        ))}
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Overview />} />
          {links.slice(1, -1).map((link) => (
            <Route key={link} path={`/${link.toLowerCase().replaceAll(' ', '-')}`} element={<Crud name={link} />} />
          ))}
          <Route path="/quickstart" element={<Quickstart />} />
        </Routes>
      </main>
    </div>
  )
}
