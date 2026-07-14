// ============================================
// scripts/logger.mjs - loguru-style log formatter
// ============================================
// Produces: 2026-04-20 09:14:22.341 | INFO     | module:fn:line - message

const LEVEL_COLORS = {
  DEBUG: '\x1b[36m',   // cyan
  INFO: '\x1b[32m',    // green
  WARN: '\x1b[33m',    // yellow
  ERROR: '\x1b[31m',   // red
  SUCCESS: '\x1b[92m', // bright green
};
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const ANSI_RE = /\x1b\[[0-9;]*m/g;

function ts() {
  const d = new Date();
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.` +
    `${pad(d.getMilliseconds(), 3)}`
  );
}

export function format(level, module, message, { location = '-' } = {}) {
  const lvl = String(level).toUpperCase();
  const color = LEVEL_COLORS[lvl] ?? '';
  const clean = String(message).replace(ANSI_RE, '').trimEnd();
  const loc = location && location !== '-' ? `:${location}` : '';
  return (
    `${DIM}${ts()}${RESET} | ` +
    `${color}${BOLD}${lvl.padEnd(8)}${RESET} | ` +
    `${color}${module}${loc}${RESET} - ${clean}`
  );
}

export function inferLevel(line, { stderr = false } = {}) {
  const l = line.toLowerCase();
  if (/\b(error|failed|exception|uncaught|fatal)\b/.test(l)) return 'ERROR';
  if (/\b(warn|warning|deprecat)/.test(l)) return 'WARN';
  if (stderr) return 'WARN';
  if (/\b(ready|compiled|connected|ok)\b/.test(l) || /✓/.test(line)) return 'SUCCESS';
  return 'INFO';
}

export function makeLogger(module) {
  const log = (level, msg, opts) =>
    console.log(format(level, module, msg, opts));
  return {
    debug: (m, o) => log('DEBUG', m, o),
    info: (m, o) => log('INFO', m, o),
    warn: (m, o) => log('WARN', m, o),
    error: (m, o) => log('ERROR', m, o),
    success: (m, o) => log('SUCCESS', m, o),
  };
}
