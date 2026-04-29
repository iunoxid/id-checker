const fs = require('fs');
const path = require('path');
const { config } = require('./src/config');
const { watchDomain } = require('./src/watcher');
const { sleep } = require('./src/utils');
const { startBotPolling } = require('./src/telegramBot');
const logger = require('./src/logger');

function loadDomains() {
  const domainsFile = path.join(__dirname, 'domains.txt');

  if (fs.existsSync(domainsFile)) {
    const lines = fs.readFileSync(domainsFile, 'utf-8')
      .split('\n')
      .map((l) => l.trim().toLowerCase())
      .filter((l) => l && !l.startsWith('#'));

    if (lines.length > 0) {
      logger.info(`[main] Loaded ${lines.length} domain(s) from domains.txt`);
      return lines;
    }
  }

  // Fallback ke DOMAIN di .env
  return config.DOMAINS;
}

function validateConfig(domains) {
  if (!domains || domains.length === 0) {
    logger.error('Error: Tidak ada domain. Isi domains.txt atau set DOMAIN di .env');
    process.exit(1);
  }

  const validNotify = ['404', 'status_change', 'both'];
  if (!validNotify.includes(config.NOTIFY_ON)) {
    logger.error('Error: NOTIFY_ON must be one of 404 | status_change | both');
    process.exit(1);
  }
}

async function main() {
  const domains = loadDomains();
  validateConfig(domains);

  logger.info(`[main] Watching ${domains.length} domain(s): ${domains.join(', ')}`);
  logger.info(`[main] Stagger delay: ${config.DOMAIN_START_DELAY_MS}ms between each domain`);

  // Jalankan bot polling paralel (non-blocking terhadap watcher)
  startBotPolling().catch((err) => logger.warn(`[bot] Crashed: ${err.message}`));

  await Promise.all(
    domains.map((domain, i) => {
      const startDelay = i * config.DOMAIN_START_DELAY_MS;
      return sleep(startDelay).then(() => {
        if (startDelay > 0) {
          logger.info(`[main] Starting watcher for ${domain} (delayed ${startDelay}ms)`);
        }
        return watchDomain({
          domain,
          intervalSec: config.DEFAULT_INTERVAL,
          jitterSec: config.DEFAULT_JITTER,
          timeoutMs: config.DEFAULT_TIMEOUT,
          notifyOn: config.NOTIFY_ON,
          loud: config.LOUD,
          statusUpdateIntervalMs: config.STATUS_UPDATE_INTERVAL_MS,
        });
      });
    })
  );
}

main().catch((err) => {
  logger.error(`Fatal error: ${err.message || String(err)}`);
  process.exit(1);
});

