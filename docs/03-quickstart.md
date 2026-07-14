# FiberMeter quickstart

FiberMeter is reusable Fiber Network infrastructure for prepaid balances, service metering, payment tracking, ledgering, and signed webhooks.

The default setup uses `SimulatedFiberPaymentProvider`, so payment requests,
balance funding, metering, ledger entries, and webhooks work without a Fiber
node. Set `FIBER_PROVIDER=live` to create real `fibt1...` invoices and verify
settlement through Fiber RPC; live mode requires funded nodes and channels as
described in [08-fiber-integration.md](08-fiber-integration.md).


## Local setup without Docker

If Docker is not available, run FiberMeter against a native PostgreSQL instance.

### 1. Install and start PostgreSQL

Install PostgreSQL 15 or newer. Then start the database service, for example:

```bash
# macOS Homebrew
brew services start postgresql@16

# Ubuntu/Debian
sudo service postgresql start
```

### 2. Create a database user and database

```bash
createuser fibermeter --pwprompt
createdb fibermeter --owner fibermeter
```

When prompted, use `fibermeter` as the password if you want to keep the default connection string from `.env.example`. If you choose another password, update `DATABASE_URL` accordingly.

### 3. Configure the API

```bash
cp apps/api/.env.example apps/api/.env
```

The default local connection string is:

```env
DATABASE_URL="postgresql://fibermeter:fibermeter@localhost:5432/fibermeter?schema=public"
```

Adjust the username, password, host, port, or database name if your local PostgreSQL setup differs.

### 4. Prepare and run FiberMeter

```bash
pnpm install
pnpm --filter @fibermeter/api prisma:generate
pnpm --filter @fibermeter/api prisma:migrate
pnpm --filter @fibermeter/api seed
pnpm dev
```

After seeding, sign in with `demo@fibermeter.dev` and `password123`.
