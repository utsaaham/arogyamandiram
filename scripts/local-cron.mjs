// ============================================
// scripts/local-cron.mjs - Local cron simulator
// ============================================
// Fires local cron endpoints every 15 minutes.
// Run alongside `next dev` via `npm run dev`.

import { readFileSync } from 'fs';
import { resolve } from 'path';

const log = {
  info:  (m) => console.log(m),
  warn:  (m) => console.warn(m),
  error: (m) => console.error(m),
};

function loadEnv() {
  try {
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* env already set or no .env.local */ }
}

loadEnv();

const PORT = process.env.PORT ?? '3000';
const BASE = `http://localhost:${PORT}`;
const SECRET = process.env.CRON_SECRET ?? '';

if (!SECRET) {
  log.warn('CRON_SECRET not found - requests will be rejected with 401');
}

async function runCron(path) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'x-cron-secret': SECRET },
    });
    const json = await res.json();
    const { sent, processed, errors, usersFound, usersScanned } = json;
    const info = [
      sent != null && `sent=${sent}`,
      processed != null && `processed=${processed}`,
      (usersFound ?? usersScanned) != null && `users=${usersFound ?? usersScanned}`,
      errors?.length && `errors=${errors.length}`,
    ].filter(Boolean).join(' ');
    log.info(`${path} → ${info || 'ok'}`);
    if (errors?.length) log.warn(`errors: ${JSON.stringify(errors)}`);
  } catch (err) {
    log.error(`${path} failed: ${err.message}`);
  }
}

async function tick() {
  log.info('cron tick');
  await runCron('/api/cron/sync-health-data');
  await runCron('/api/cron/send-reminders');
  await runCron('/api/cron/process-email-replies');
}

const INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes, same as Vercel

log.info('local cron runner started - first tick in 10s, then every 15 min');
setTimeout(async () => {
  await tick();
  setInterval(tick, INTERVAL_MS);
}, 10_000);
