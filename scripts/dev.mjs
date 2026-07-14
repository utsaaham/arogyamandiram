// ============================================
// scripts/dev.mjs - dev runner with loguru-style logs
// ============================================
// Replaces `concurrently`. Spawns `next dev` and the local cron runner,
// pipes every stdout/stderr line through the shared formatter so both
// streams share one consistent shape.

import { spawn } from 'child_process';
import { format, inferLevel } from './logger.mjs';

const children = [];
let shuttingDown = false;

function pipe(module, stream, { stderr = false } = {}) {
  let buf = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buf += chunk;
    let idx;
    while ((idx = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.trim() === '') continue;
      const level = inferLevel(line, { stderr });
      process.stdout.write(format(level, module, line) + '\n');
    }
  });
  stream.on('end', () => {
    if (buf.trim()) {
      const level = inferLevel(buf, { stderr });
      process.stdout.write(format(level, module, buf) + '\n');
    }
  });
}

function start(module, cmd, args, env = {}) {
  const child = spawn(cmd, args, {
    env: { ...process.env, ...env, FORCE_COLOR: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  pipe(module, child.stdout);
  pipe(module, child.stderr, { stderr: true });
  child.on('exit', (code, signal) => {
    process.stdout.write(
      format(code === 0 ? 'INFO' : 'ERROR', module, `exited code=${code} signal=${signal ?? '-'}`) + '\n'
    );
    if (!shuttingDown) shutdown(code ?? 1);
  });
  children.push(child);
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) {
    if (!c.killed) c.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 200);
}

process.on('SIGINT', () => shutdown(130));
process.on('SIGTERM', () => shutdown(143));

start('next', 'next', ['dev', '--turbo'], {
  DOTENV_CONFIG_PATH: '.env.local',
  NODE_OPTIONS: '--require dotenv/config',
});

start('cron', 'node', ['scripts/local-cron.mjs']);
