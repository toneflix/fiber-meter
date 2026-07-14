# Native Linux deployment

This guide deploys FiberMeter without Docker. Static frontends may be hosted on
Netlify or another static host; the VPS runs PostgreSQL, the API, two Fiber
testnet nodes, and the bounded demo auto-payer.

The examples target Ubuntu 24.04. Substitute your own values throughout:

```bash
export APP_ROOT=/srv/fibermeter
export API_DOMAIN=api.example.com
export APP_ORIGIN=https://app.example.com
export DEMO_ORIGIN=https://demo.example.com
export REPOSITORY_URL=https://github.com/OWNER/fiber-meter.git
```

Keep application code, configuration, and persistent state separate:

```text
$APP_ROOT              application checkout
/etc/fibermeter        configuration and secrets
/var/lib/fibermeter    Fiber keys and channel state
/var/cache/fibermeter  disposable package-manager cache
```

Never expose PostgreSQL (`5432`), the API's origin port (`4000`), or Fiber RPC
(`8237`, `8247`) publicly. Only HTTP/HTTPS and any intentionally public Fiber
P2P ports should pass the firewall.

## 1. Prerequisites

Use at least 4 GiB RAM for two nodes. If the host has little available memory
and no swap, create swap according to the operating system's administration
guide before continuing.

```bash
sudo apt update
sudo apt install -y ca-certificates curl git jq nginx postgresql postgresql-contrib
node --version
```

Node 20 or newer is required. Commands below invoke the repository-pinned pnpm
version through `npx`, so a global pnpm installation is optional.

Create the service account and runtime directories:

```bash
sudo useradd --system --create-home --home-dir /var/lib/fibermeter --shell /usr/sbin/nologin fibermeter
sudo mkdir -p "$APP_ROOT" /etc/fibermeter /var/lib/fibermeter/{payee,payer} /var/cache/fibermeter
sudo chown -R fibermeter:fibermeter /var/lib/fibermeter
sudo chown root:fibermeter /etc/fibermeter
sudo chmod 750 /etc/fibermeter
```

Clone and build using whichever deployment user owns `APP_ROOT`:

```bash
git clone "$REPOSITORY_URL" "$APP_ROOT"
cd "$APP_ROOT"
npx --yes pnpm@9.12.0 install --frozen-lockfile
npx --yes pnpm@9.12.0 --filter @fibermeter/api prisma:generate
npx --yes pnpm@9.12.0 --filter @fibermeter/api build
```

## 2. PostgreSQL and environment

Create a dedicated PostgreSQL role/database with a strong generated password.
Copy the templates, replace every `REPLACE_...` value, and set the public
origins for this deployment:

```bash
sudo cp deploy/native/api.env.example /etc/fibermeter/api.env
sudo cp deploy/native/autopay.env.example /etc/fibermeter/autopay.env
sudo cp deploy/native/fiber.env.example /etc/fibermeter/fiber.env
sudo editor /etc/fibermeter/api.env
sudo editor /etc/fibermeter/autopay.env
sudo editor /etc/fibermeter/fiber.env
sudo chown root:fibermeter /etc/fibermeter/*.env
sudo chmod 640 /etc/fibermeter/*.env
```

For a native reverse-proxy deployment, keep `HOST=127.0.0.1`. Set
`CORS_ORIGINS` to the comma-separated dashboard/demo origins. In the hosted
two-node demo, keep `FIBER_RPC_URL` pointed at the payee (`8237`) for invoice
creation and verification, and point `FIBER_PREFLIGHT_RPC_URL` at the payer
(`8247`) for route and liquidity checks.

Load the environment, deploy migrations, and seed the configured demo account:

```bash
set -a
. /etc/fibermeter/api.env
set +a
cd "$APP_ROOT"
npx --yes pnpm@9.12.0 --dir apps/api exec prisma migrate deploy
npx --yes pnpm@9.12.0 --dir apps/api seed
```

## 3. Fiber nodes

Download the Linux build of `fnn` from the official
[Fiber releases](https://github.com/nervosnetwork/fiber/releases) and install it
as `/usr/local/bin/fnn`. Do not copy node keys from a development machine.

Create two configurations from the matching release's
`config/testnet/config.yml`:

| Config | P2P address | RPC address | State directory |
|---|---|---|---|
| `/etc/fibermeter/payee.yml` | `/ip4/0.0.0.0/tcp/8238` | `127.0.0.1:8237` | `/var/lib/fibermeter/payee` |
| `/etc/fibermeter/payer.yml` | `/ip4/0.0.0.0/tcp/8248` | `127.0.0.1:8247` | `/var/lib/fibermeter/payer` |

Use `chain: testnet` and a trusted CKB testnet RPC. The payer and payee must
have distinct keys and data directories.

## 4. systemd

The API and auto-payer units contain an `__APP_ROOT__` token. Render them for
the current host rather than committing a host path:

```bash
for unit in fibermeter-api fibermeter-autopay; do
  sed "s|__APP_ROOT__|$APP_ROOT|g" \
    "deploy/native/systemd/$unit.service" \
    | sudo tee "/etc/systemd/system/$unit.service" >/dev/null
done

sudo cp deploy/native/systemd/fiber-payee.service /etc/systemd/system/
sudo cp deploy/native/systemd/fiber-payer.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now fiber-payee fiber-payer fibermeter-api
```

Do not start `fibermeter-autopay` until the payer is funded and a channel is
ready.

## 5. Reverse proxy

For standalone Nginx, copy `deploy/native/nginx/api.conf.example`, replace
`api.example.com`, enable TLS, validate, and reload Nginx.

TinyCP users can copy the versioned location fragment into the domain document
root using the `.nginx*` filename pattern expected by TinyCP:

```bash
sudo cp "$APP_ROOT/deploy/native/tinycp/location.conf" \
  "PATH_TO_TINYCP_DOCUMENT_ROOT/.nginx-fibermeter.conf"
sudo nginx -t
sudo systemctl reload nginx
```

The fragment is intentionally not stored at the repository root: TinyCP is one
deployment option, not a project-wide runtime assumption.

Verify both routes:

```bash
curl -fsS http://127.0.0.1:4000/health | jq
curl -fsS "https://$API_DOMAIN/health" | jq
```

## 6. Static frontends

Create separate static-host projects for `apps/dashboard` and
`apps/demo-service`. Set this build-time variable for the dashboard:

```text
VITE_API_URL=https://api.example.com/api
```

The checked-in Netlify configurations contain only generic build settings; no
project owner's domains or credentials are committed.

## 7. Demo channel

Follow [the hosted-demo guide](../../docs/11-live-hosted-demo.md) to fund the
payer, peer the nodes, open a testnet channel, and verify it is ready. Then:

```bash
sudo systemctl enable --now fibermeter-autopay
sudo journalctl -u fibermeter-autopay -f
```
