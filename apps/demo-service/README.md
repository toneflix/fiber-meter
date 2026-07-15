# FiberMeter demo service

This app demonstrates a service that records usage and charges a prepaid customer before returning its result. The browser calls a Netlify function, and that function submits the `tokens` usage event to FiberMeter with a server-side API key.

## Configuration

Copy `.env.example` to `.env` for local Netlify development. Configure the same server variables in the Netlify site environment for deployment:

- `FIBERMETER_API_URL` — FiberMeter API origin (the SDK appends `/api`)
- `FIBERMETER_API_KEY` — API key for the demo developer account; keep this server-only
- `FIBERMETER_CUSTOMER_ID` — prepaid customer external ID (defaults to `cus_demo_001`)
- `FIBERMETER_SERVICE_SLUG` — metered service slug (defaults to `ai-summary`)
- `FIBERMETER_WEBHOOK_SECRET` — server-only secret shared with the service's
  webhook configuration
- `VITE_DASHBOARD_URL` — public dashboard link shown in the browser

For the hosted demo, set `FIBERMETER_API_URL=https://api.fibermeter.toneflix.net`. Do not name the API key `VITE_FIBERMETER_API_KEY`; Vite variables are embedded in browser assets.

## Run locally

Run the FiberMeter API first, then use Netlify Dev from the repository root so the function and redirect are available:

```sh
netlify dev --filter @fibermeter/demo-service
```

The regular `pnpm --filter @fibermeter/demo-service dev` command starts only the Vite interface and does not emulate the server function.

## Webhooks

Set the metered service's webhook URL to:

```text
https://demo.fibermeter.toneflix.net/api/webhooks/fibermeter
```

The service's `webhookSecret` must exactly match the server-only
`FIBERMETER_WEBHOOK_SECRET` configured in Netlify. The receiver verifies the
signature and timestamp before acknowledging the event.
