# Native Ubuntu 24.04 deployment

This deployment keeps the two static Vite applications on Netlify and runs the
stateful tier on the VPS:

- `https://app.fibermeter.toneflix.net` — Netlify dashboard
- `https://demo.fibermeter.toneflix.net` — Netlify demo UI
- `https://api.fibermeter.toneflix.net` — Nginx/TinyCP to `127.0.0.1:4000`
- PostgreSQL, API, two Fiber nodes, and the bounded auto-payer — VPS/systemd

Fiber RPC (`8237`, `8247`) and PostgreSQL (`5432`) must never be publicly
exposed. Fiber P2P uses `8238` for the payee and `8248` for the payer.

## 0. Confirm memory and swap

TinyCP is already using roughly 2.4 GiB of this VPS's 3.8 GiB. Check whether
swap exists before starting PostgreSQL and two Fiber nodes:

```bash
free -h
swapon --show
```

If `swapon --show` is empty, add a 4 GiB swap file:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

## 1. DNS

Point the API hostname at the VPS. Point the app and demo hostnames to the
values Netlify shows under **Domain management**. Wait for all three to resolve
before requesting certificates.

## 2. Install the application prerequisites

Run as a sudo-capable SSH user:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git jq nginx postgresql postgresql-contrib
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo corepack enable
sudo corepack prepare pnpm@9.12.0 --activate
node --version
pnpm --version
```

Create the service account and runtime directories. TinyCP owns the existing
site directory as `www-data`; keep its `.user.ini`, remove only the placeholder,
and initialize the repository in place:

```bash
sudo useradd --system --create-home --home-dir /var/lib/fibermeter --shell /usr/sbin/nologin fibermeter
sudo mkdir -p /etc/fibermeter /var/lib/fibermeter/payee /var/lib/fibermeter/payer /var/cache/fibermeter
sudo chown -R fibermeter:fibermeter /var/lib/fibermeter
sudo chown www-data:www-data /var/cache/fibermeter
sudo chmod 750 /etc/fibermeter

cd /var/www/api.fibermeter.toneflix.net
sudo rm -f index.html
sudo -u www-data git init
sudo -u www-data git remote add origin YOUR_GITHUB_REPOSITORY_URL
sudo -u www-data git fetch --depth=1 origin main
sudo -u www-data git checkout -B main FETCH_HEAD
sudo -u www-data mkdir -p bin
```

Then build it:

```bash
cd /var/www/api.fibermeter.toneflix.net
sudo -u www-data env HOME=/var/cache/fibermeter npx --yes pnpm@9.12.0 install --frozen-lockfile
sudo -u www-data env HOME=/var/cache/fibermeter npx --yes pnpm@9.12.0 --filter @fibermeter/api prisma:generate
sudo -u www-data env HOME=/var/cache/fibermeter npx --yes pnpm@9.12.0 --filter @fibermeter/api build
```

## 3. PostgreSQL and secrets

Generate secrets without pasting them into chat:

```bash
openssl rand -hex 32
openssl rand -base64 24
```

Create the database, replacing `REPLACE_DATABASE_PASSWORD` with the generated
database password:

```bash
sudo -u postgres psql <<'SQL'
CREATE USER fibermeter WITH PASSWORD 'REPLACE_DATABASE_PASSWORD';
CREATE DATABASE fibermeter OWNER fibermeter;
SQL
```

Install and edit the environment files:

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

Apply the schema and seed the demo account:

```bash
set -a
source /etc/fibermeter/api.env
set +a
sudo -u www-data --preserve-env=DATABASE_URL env HOME=/var/cache/fibermeter npx --yes pnpm@9.12.0 --dir /var/www/api.fibermeter.toneflix.net/apps/api exec prisma migrate deploy
sudo -u www-data --preserve-env=DATABASE_URL env HOME=/var/cache/fibermeter npx --yes pnpm@9.12.0 --dir /var/www/api.fibermeter.toneflix.net/apps/api seed
```

Set the same strong demo email/password in `api.env` and `autopay.env`. The seed
reads `DEMO_EMAIL` and `DEMO_PASSWORD`; the auto-payer reads `API_EMAIL` and
`API_PASSWORD`.

## 4. Fiber nodes

Download the current Linux release of `fnn` and `fnn-cli` from the official
Fiber releases page. Do not copy the macOS binaries or node keys from a laptop.
Install the Linux binaries as:

```text
/var/www/api.fibermeter.toneflix.net/bin/fnn
/var/www/api.fibermeter.toneflix.net/bin/fnn-cli
```

Make them executable and owned by the service account:

```bash
sudo chown fibermeter:fibermeter /var/www/api.fibermeter.toneflix.net/bin/fnn /var/www/api.fibermeter.toneflix.net/bin/fnn-cli
sudo chmod 750 /var/www/api.fibermeter.toneflix.net/bin/fnn /var/www/api.fibermeter.toneflix.net/bin/fnn-cli
```

Create two testnet configs based on the release's example:

| File | P2P address | RPC address |
|---|---|---|
| `/etc/fibermeter/payee.yml` | `/ip4/0.0.0.0/tcp/8238` | `127.0.0.1:8237` |
| `/etc/fibermeter/payer.yml` | `/ip4/0.0.0.0/tcp/8248` | `127.0.0.1:8247` |

Set both to `chain: testnet` and use `https://testnet.ckbapp.dev/` for the CKB
RPC. Keep the Fiber RPC addresses on localhost. The payer and payee must have
different data directories and keys.

## 5. systemd and Nginx/TinyCP

```bash
sudo cp deploy/native/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now fiber-payee fiber-payer
sudo systemctl enable --now fibermeter-api
```

Do not start `fibermeter-autopay` until the payer is funded, the two nodes are
peered, and a channel is ready.

For Nginx managed directly:

```bash
sudo cp deploy/native/nginx/api.fibermeter.toneflix.net.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/api.fibermeter.toneflix.net.conf /etc/nginx/sites-enabled/api.fibermeter.toneflix.net.conf
sudo nginx -t
sudo systemctl reload nginx
```

If TinyCP manages Nginx, create `api.fibermeter.toneflix.net` with the repository
root as its document root. TinyCP includes the repository's
`.nginx-fibermeter.conf` inside its generated server block, proxying `/` to
`http://127.0.0.1:4000`. Validate and reload after each checkout:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Enable the domain's Let's Encrypt certificate in TinyCP. Do not also install the
standalone server block above, because that would create a competing virtual
host.

Verify:

```bash
curl -fsS http://127.0.0.1:4000/health | jq
curl -fsS https://api.fibermeter.toneflix.net/health | jq
sudo systemctl --no-pager --full status fiber-payee fiber-payer fibermeter-api
```

## 6. Netlify

Create two Netlify sites from the same GitHub repository. Leave **Base
directory** empty (repository root) and set **Package directory** separately:

| Site | Package directory | Config file |
|---|---|---|
| Dashboard | `apps/dashboard` | `apps/dashboard/netlify.toml` |
| Demo | `apps/demo-service` | `apps/demo-service/netlify.toml` |

The dashboard config bakes
`VITE_API_URL=https://api.fibermeter.toneflix.net/api` into its build. Add the
custom domains in Netlify and wait for Netlify TLS to become active.

## 7. Channel and auto-payer

Follow `docs/11-live-hosted-demo.md` to fund the payer, peer the nodes, and open
the testnet channel. Once `list_channels` reports `ChannelReady`:

```bash
sudo systemctl enable --now fibermeter-autopay
sudo journalctl -u fibermeter-autopay -f
```

Firewall policy: allow SSH, HTTP, HTTPS, and only the Fiber P2P ports you need.
Never allow public access to `4000`, `5432`, `8237`, or `8247`.
