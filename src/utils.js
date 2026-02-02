function utcNow() {
  return new Date().toISOString();
}

function formatUtcDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(d.getUTCDate());
  const month = pad(d.getUTCMonth() + 1);
  const year = d.getUTCFullYear();
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function formatGmtPlus7(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  const pad = (n) => String(n).padStart(2, '0');
  const ms = d.getTime() + 7 * 60 * 60 * 1000;
  const local = new Date(ms);
  const day = pad(local.getUTCDate());
  const month = pad(local.getUTCMonth() + 1);
  const year = local.getUTCFullYear();
  const hours = pad(local.getUTCHours());
  const minutes = pad(local.getUTCMinutes());
  const seconds = pad(local.getUTCSeconds());
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomJitter(baseMs, jitterMs) {
  const jitter = Math.floor(Math.random() * (jitterMs * 2 + 1)) - jitterMs;
  return Math.max(0, baseMs + jitter);
}

function beep(times = 3, intervalMs = 250) {
  for (let i = 0; i < times; i += 1) {
    setTimeout(() => process.stdout.write('\u0007'), i * intervalMs);
  }
}

module.exports = { utcNow, formatUtcDate, formatGmtPlus7, sleep, randomJitter, beep };
