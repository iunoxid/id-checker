const { fetchDomain, BASE_URL } = require('./rdapClient');
const { sendTelegramMessage, sendTelegramText } = require('./telegramNotifier');
const { utcNow, formatUtcDate, formatGmtPlus7, sleep, randomJitter, beep } = require('./utils');
const { config } = require('./config');
const logger = require('./logger');
const stateRegistry = require('./stateRegistry');

function extractRegistrar(data) {
  const entities = Array.isArray(data?.entities) ? data.entities : [];
  for (const entity of entities) {
    const roles = Array.isArray(entity?.roles) ? entity.roles : [];
    if (!roles.includes('registrar')) continue;
    const vcard = Array.isArray(entity?.vcardArray) ? entity.vcardArray : null;
    const entries = Array.isArray(vcard?.[1]) ? vcard[1] : [];
    const fn = entries.find((e) => Array.isArray(e) && e[0] === 'fn');
    const org = entries.find((e) => Array.isArray(e) && e[0] === 'org');
    const value = (fn && fn[3]) || (org && org[3]);
    if (value) return String(value);
  }
  return null;
}

function extractExpiry(data) {
  const events = Array.isArray(data?.events) ? data.events : [];
  for (const ev of events) {
    const action = String(ev?.eventAction || '').toLowerCase();
    if (action === 'expiration' || action === 'expiry' || action === 'expires') {
      return ev?.eventDate || null;
    }
  }
  return null;
}


function buildStatusText(state) {
  const lines = [];

  lines.push('📡 RDAP Watch Status');
  lines.push('');
  lines.push(`Domain: ${state.domain}`);
  lines.push(`Last check (GMT+7): ${state.lastCheckGmt7 || '-'}`);
  lines.push(`HTTP: ${state.lastHttp || '-'}`);
  lines.push(`Status: ${state.lastStatus || '-'}`);

  if (state.registrar) {
    lines.push('');
    lines.push(`Registrar: ${state.registrar}`);
  }

  if (state.expiryGmt7) {
    lines.push('');
    lines.push(`Expiry (GMT+7): ${state.expiryGmt7}`);
  }

  if (state.lastError) {
    lines.push('');
    lines.push(`⚠️ Error: ${state.lastError}`);
  }

  return lines.join('\n');
}

const CRITICAL_STATUSES = ['pending delete', 'redemption'];

function isCritical(status) {
  if (!status) return false;
  const s = status.toLowerCase();
  return CRITICAL_STATUSES.some((c) => s.includes(c));
}

function buildCriticalAlertText(domain, prevStatus, currStatus, state) {
  const lines = [];
  const mention = buildMention();
  if (mention) lines.push(mention);

  lines.push('⚠️ STATUS KRITIS TERDETEKSI!');
  lines.push('');
  lines.push(`Domain: ${domain}`);
  lines.push(`Status sebelumnya: ${prevStatus || '-'}`);
  lines.push(`Status sekarang: ${currStatus}`);
  lines.push(`Waktu (GMT+7): ${formatGmtPlus7(new Date())}`);
  lines.push('');
  lines.push('Pantau terus — grab saat status jadi 404!');

  return lines.join('\n');
}

function buildDropEmbed(domain) {
  return [{
    title: 'DOMAIN DROP DETECTED',
    color: 15158332,
    fields: [
      { name: 'Domain', value: domain, inline: true },
      { name: 'Time (GMT+7)', value: formatGmtPlus7(new Date()), inline: true },
      { name: 'RDAP', value: `${BASE_URL}${domain}` },
    ],
  }];
}

function buildMention() {
  const id = config.TELEGRAM_MENTION_ID;
  if (!id) return null;
  return `@${id}`;
}

async function watchDomain(options) {
  const {
    domain,
    intervalSec,
    jitterSec,
    timeoutMs,
    notifyOn,
    loud,
  } = options;

  let lastStatus = null;
  let errorStreak = 0;
  const state = {
    domain,
    lastCheckGmt7: null,
    lastHttp: null,
    lastStatus: null,
    registrar: null,
    expiryRaw: null,
    expiryGmt7: null,
    lastError: null,
  };

  logger.info(`[watcher] Starting watch for ${domain}`);
  logger.info(`[watcher] interval=${intervalSec}s jitter=+/-${jitterSec}s timeout=${timeoutMs}ms notifyOn=${notifyOn}`);
  stateRegistry.updateState(domain, state);

  while (true) {
    const { statusCode, data } = await fetchDomain(domain, timeoutMs);
    state.lastCheckGmt7 = formatGmtPlus7(new Date());
    state.lastHttp = statusCode || 'ERR';
    state.lastError = null;

    if (statusCode === 200) {
      errorStreak = 0;
      const currentStatus = Array.isArray(data?.status) ? data.status.join(', ') : (data?.status || 'unknown');
      logger.info(`[rdap] ${domain} status: ${currentStatus}`);
      state.lastStatus = currentStatus;
      state.registrar = extractRegistrar(data);
      const expiryRaw = extractExpiry(data);
      state.expiryRaw = expiryRaw || null;
      state.expiryGmt7 = expiryRaw ? formatGmtPlus7(expiryRaw) : null;
      stateRegistry.updateState(domain, state);

      if (lastStatus && currentStatus !== lastStatus) {
        // Alert status change biasa
        if (notifyOn === 'status_change' || notifyOn === 'both') {
          await sendTelegramMessage(`Status change for ${domain}: ${lastStatus} -> ${currentStatus} (${utcNow()})`);
        }
        // Alert khusus jika masuk status KRITIS
        if (isCritical(currentStatus) && !isCritical(lastStatus)) {
          logger.warn(`[watcher] Status kritis terdeteksi untuk ${domain}: ${currentStatus}`);
          await sendTelegramText(buildCriticalAlertText(domain, lastStatus, currentStatus, state));
        }
      }

      lastStatus = currentStatus;
    } else if (statusCode === 404) {
      state.lastStatus = 'DROPPED (404)';
      state.lastHttp = 404;
      stateRegistry.updateState(domain, state);
      await sendTelegramMessage(buildMention(), buildDropEmbed(domain));

      if (loud) {
        beep(6, 200);
      }

      logger.info(`[watcher] Drop detected for ${domain}. Stopping watcher for this domain.`);
      return;
    } else {
      errorStreak += 1;
      const detail = data?.error ? ` (${data.error})` : '';
      logger.warn(`[rdap] Unexpected status ${statusCode}${detail}`);
      state.lastError = data?.error ? String(data.error) : `HTTP ${statusCode}`;
      stateRegistry.updateState(domain, state);
    }

    const baseMs = intervalSec * 1000;
    const jitterMs = jitterSec * 1000;
    const backoffExtra = Math.min(600, errorStreak * 10);
    const delayMs = randomJitter(baseMs, jitterMs) + backoffExtra * 1000;

    await sleep(delayMs);
  }
}

module.exports = { watchDomain, buildStatusText };
