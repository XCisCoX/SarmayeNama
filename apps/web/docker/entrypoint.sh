#!/bin/sh
# Web entrypoint: apply migrations, seed metadata, then start Next.js.
set -e

echo "[entrypoint] waiting for database…"
node -e "
const url = process.env.DATABASE_URL || 'postgresql://sarmaye:sarmaye@db:5432/sarmaye';
const m = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (!m) { console.error('cannot parse DATABASE_URL'); process.exit(1); }
const [, user, pass, host, port, db] = m;
const { createConnection } = require('net');
function tryConnect(retries) {
  const sock = createConnection({ host, port }, () => { sock.destroy(); console.log('[entrypoint] database ready'); start(); });
  sock.on('error', () => { sock.destroy(); if (retries <= 0) { console.error('database unreachable'); process.exit(1); } console.log('[entrypoint] database not ready, retrying…'); setTimeout(() => tryConnect(retries - 1), 3000); });
}
tryConnect(30);
function start() {
  console.log('[entrypoint] applying migrations…');
  const prismaBin = '/app/packages/database/node_modules/.bin/prisma';
  const tsxBin = '/app/packages/database/node_modules/.bin/tsx';
  require('child_process').execSync(prismaBin + ' migrate deploy --schema packages/database/prisma/schema.prisma', { stdio: 'inherit', cwd: '/app' });
  console.log('[entrypoint] seeding…');
  require('child_process').execSync(tsxBin + ' prisma/seed.ts', { stdio: 'inherit', cwd: '/app/packages/database' });
  console.log('[entrypoint] starting web…');
  const next = require('child_process').spawn('node', ['node_modules/next/dist/bin/next', 'start', '-p', '3000'], { stdio: 'inherit', cwd: '/app/apps/web' });
  next.on('exit', (code) => process.exit(code ?? 0));
}
"