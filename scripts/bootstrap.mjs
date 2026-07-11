#!/usr/bin/env node
/*
 * FiberMeter one-shot bootstrap for local development.
 *
 *   pnpm bootstrap        # install deps, start Postgres, migrate + seed
 *   pnpm dev              # then run all apps
 *
 * Brings up Postgres via Docker if available; otherwise uses an existing
 * PostgreSQL already listening on :5432. Defaults to the SIMULATED Fiber
 * provider, so no Fiber node / faucet / channels are required.
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, copyFileSync } from 'node:fs';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = path.join(root, 'apps', 'api');

function log(msg) {
  console.log(`\n\x1b[36m▶ ${msg}\x1b[0m`);
}
function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', cwd: root, ...opts });
}
function has(cmd) {
  const probe = process.platform === 'win32' ? `where ${cmd}` : `command -v ${cmd}`;
  return spawnSync(probe, { shell: true, stdio: 'ignore' }).status === 0;
}
function portOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    socket.setTimeout(1000);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForPort(port, tries = 40) {
  for (let i = 0; i < tries; i++) {
    if (await portOpen(port)) return true;
    await sleep(1000);
  }
  return false;
}

async function main() {
  // 1. Ensure the API env file exists (defaults to the simulated provider).
  const envPath = path.join(apiDir, '.env');
  if (!existsSync(envPath)) {
    log('Creating apps/api/.env from .env.example');
    copyFileSync(path.join(apiDir, '.env.example'), envPath);
  } else {
    console.log('apps/api/.env already exists — leaving it as-is.');
  }

  // 2. Install workspace dependencies.
  log('Installing dependencies (pnpm install)');
  run('pnpm install');

  // 3. Ensure Postgres is available on :5432.
  if (await portOpen(5432)) {
    console.log('PostgreSQL already reachable on :5432 — using it.');
  } else if (has('docker')) {
    log('Starting PostgreSQL via Docker (docker compose up -d postgres)');
    run('docker compose up -d postgres');
    log('Waiting for PostgreSQL to accept connections...');
    if (!(await waitForPort(5432))) {
      console.error('\n✗ PostgreSQL did not become ready on :5432. Check `docker compose logs postgres`.');
      process.exit(1);
    }
  } else {
    console.error(
      '\n✗ No PostgreSQL on :5432 and Docker is not installed.\n' +
        '  Start a PostgreSQL matching apps/api/.env (default:\n' +
        '  postgresql://fibermeter:fibermeter@localhost:5432/fibermeter) and re-run.',
    );
    process.exit(1);
  }

  // 4. Prisma: generate client, apply migrations, seed demo data.
  log('Generating Prisma client');
  run('pnpm --filter @fibermeter/api prisma:generate');

  log('Applying migrations');
  run('npx prisma migrate deploy', { cwd: apiDir });

  log('Seeding demo data (idempotent)');
  run('pnpm --filter @fibermeter/api seed');

  console.log(
    '\n\x1b[32m✔ FiberMeter is ready.\x1b[0m\n\n' +
      '  Start everything:   \x1b[1mpnpm dev\x1b[0m\n' +
      '    • dashboard   http://localhost:5173\n' +
      '    • demo app    http://localhost:5174\n' +
      '    • API         http://localhost:4000\n\n' +
      '  Dashboard login:  demo@fibermeter.dev / password123  (or "Explore in demo mode")\n',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
