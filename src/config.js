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
  DISCORD_WEBHOOK_URL: (process.env.DISCORD_WEBHOOK_URL || '').trim(),
  DISCORD_USERNAME: (process.env.DISCORD_USERNAME || 'Drop Watcher').trim(),
  DISCORD_AVATAR_URL: (process.env.DISCORD_AVATAR_URL || '').trim(),
  DOMAIN: (process.env.DOMAIN || '').trim(),
  NOTIFY_ON: (process.env.NOTIFY_ON || '404').trim(),
  LOUD: toBool(process.env.LOUD, false),
  DISCORD_MENTION_ID: (process.env.DISCORD_MENTION_ID || '').trim(),
  STATUS_UPDATE_INTERVAL_MS: toInt(process.env.STATUS_UPDATE_INTERVAL_MS, 15000),
  DEFAULT_INTERVAL: toInt(process.env.DEFAULT_INTERVAL, 180),
  DEFAULT_JITTER: toInt(process.env.DEFAULT_JITTER, 15),
  DEFAULT_TIMEOUT: toInt(process.env.DEFAULT_TIMEOUT, 15000),
};

if (!config.DISCORD_WEBHOOK_URL) {
  throw new Error('DISCORD_WEBHOOK_URL is required. Set it in .env');
}

module.exports = { config };
