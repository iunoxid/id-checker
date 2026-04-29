const dotenv = require('dotenv');

dotenv.config();

function toInt(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'y', 'on'].includes(String(value).toLowerCase());
}

const config = {
  TELEGRAM_BOT_TOKEN: (process.env.TELEGRAM_BOT_TOKEN || '').trim(),
  TELEGRAM_CHAT_ID: (process.env.TELEGRAM_CHAT_ID || '').trim(),
  TELEGRAM_MENTION_ID: (process.env.TELEGRAM_MENTION_ID || '').trim(),
  DOMAINS: (process.env.DOMAIN || '')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean),
  NOTIFY_ON: (process.env.NOTIFY_ON || '404').trim(),
  LOUD: toBool(process.env.LOUD, false),
  STATUS_UPDATE_INTERVAL_MS: toInt(process.env.STATUS_UPDATE_INTERVAL_MS, 15000),
  DOMAIN_START_DELAY_MS: toInt(process.env.DOMAIN_START_DELAY_MS, 30000),
  DEFAULT_INTERVAL: toInt(process.env.DEFAULT_INTERVAL, 180),
  DEFAULT_JITTER: toInt(process.env.DEFAULT_JITTER, 15),
  DEFAULT_TIMEOUT: toInt(process.env.DEFAULT_TIMEOUT, 15000),
};

if (!config.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is required. Set it in .env');
}

if (!config.TELEGRAM_CHAT_ID) {
  throw new Error('TELEGRAM_CHAT_ID is required. Set it in .env');
}

module.exports = { config };
