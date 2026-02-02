const { config } = require('./src/config');
const { watchDomain } = require('./src/watcher');

function validateConfig() {
  if (!config.DOMAIN) {
    console.error('Error: DOMAIN is required. Set it in .env');
    process.exit(1);
  }

  const validNotify = ['404', 'status_change', 'both'];
  if (!validNotify.includes(config.NOTIFY_ON)) {
    console.error('Error: NOTIFY_ON must be one of 404 | status_change | both');
    process.exit(1);
  }
}

async function main() {
  validateConfig();

  await watchDomain({
    domain: config.DOMAIN,
    intervalSec: config.DEFAULT_INTERVAL,
    jitterSec: config.DEFAULT_JITTER,
    timeoutMs: config.DEFAULT_TIMEOUT,
    notifyOn: config.NOTIFY_ON,
    loud: config.LOUD,
    statusUpdateIntervalMs: config.STATUS_UPDATE_INTERVAL_MS,
  });
}

main().catch(err => {
  console.error(`Fatal error: ${err.message || String(err)}`);
  process.exit(1);
});
