const { fetchDomain, BASE_URL } = require('./rdapClient');
const { sendDiscordMessage, editDiscordMessage } = require('./discordNotifier');
const { utcNow, formatUtcDate, formatGmtPlus7, sleep, randomJitter, beep } = require('./utils');
const { config } = require('./config');

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

function buildStatusEmbed(state) {
  const fields = [
    { name: 'Domain', value: state.domain, inline: true },
    { name: 'Last check (GMT+7)', value: state.lastCheckGmt7 || '-', inline: true },
    { name: 'HTTP', value: String(state.lastHttp || '-'), inline: true },
  ];

  if (state.lastStatus) fields.push({ name: 'Status', value: state.lastStatus, inline: false });
  if (state.registrar) fields.push({ name: 'Registrar', value: state.registrar, inline: false });
  if (state.expiryGmt7) fields.push({ name: 'Expiry (GMT+7)', value: state.expiryGmt7, inline: false });
  if (state.lastError) fields.push({ name: 'Error', value: state.lastError, inline: false });

  return [{
    title: 'RDAP Watch Status',
    color: 3447003,
    fields,
  }];
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
  const id = config.DISCORD_MENTION_ID;
  if (!id) return null;
  return `<@${id}>`;
}

async function watchDomain(options) {
  const {
    domain,
    intervalSec,
    jitterSec,
    timeoutMs,
    notifyOn,
    loud,
    statusUpdateIntervalMs,
  } = options;

  let lastStatus = null;
  let errorStreak = 0;
  let statusMessageId = null;
  const state = {
    domain,
    lastCheckGmt7: null,
    lastHttp: null,
    lastStatus: null,
    registrar: null,
    expiryGmt7: null,
    lastError: null,
  };

  console.log(`[watcher] Starting watch for ${domain}`);
  console.log(`[watcher] interval=${intervalSec}s jitter=+/-${jitterSec}s timeout=${timeoutMs}ms notifyOn=${notifyOn}`);

  if (statusUpdateIntervalMs > 0) {
    statusMessageId = await sendDiscordMessage(null, buildStatusEmbed(state));
    setInterval(() => {
      void editDiscordMessage(statusMessageId, null, buildStatusEmbed(state));
    }, statusUpdateIntervalMs);
  }

  while (true) {
    const { statusCode, data } = await fetchDomain(domain, timeoutMs);
    state.lastCheckGmt7 = formatGmtPlus7(new Date());
    state.lastHttp = statusCode || 'ERR';
    state.lastError = null;

    if (statusCode === 200) {
      errorStreak = 0;
      const currentStatus = Array.isArray(data?.status) ? data.status.join(', ') : (data?.status || 'unknown');
      console.log(`[rdap] ${domain} status: ${currentStatus}`);
      state.lastStatus = currentStatus;
      state.registrar = extractRegistrar(data);
      const expiryRaw = extractExpiry(data);
      state.expiryGmt7 = expiryRaw ? formatGmtPlus7(expiryRaw) : null;

      if (lastStatus && currentStatus !== lastStatus && (notifyOn === 'status_change' || notifyOn === 'both')) {
        await sendDiscordMessage(`Status change for ${domain}: ${lastStatus} -> ${currentStatus} (${utcNow()})`);
      }

      lastStatus = currentStatus;
    } else if (statusCode === 404) {
      await sendDiscordMessage(buildMention(), buildDropEmbed(domain));

      if (loud) {
        beep(6, 200);
      }

      console.log('[watcher] Drop detected. Exiting.');
      process.exit(0);
    } else {
      errorStreak += 1;
      const detail = data?.error ? ` (${data.error})` : '';
      console.warn(`[rdap] Unexpected status ${statusCode}${detail}`);
      state.lastError = data?.error ? String(data.error) : `HTTP ${statusCode}`;
    }

    const baseMs = intervalSec * 1000;
    const jitterMs = jitterSec * 1000;
    const backoffExtra = Math.min(600, errorStreak * 10);
    const delayMs = randomJitter(baseMs, jitterMs) + backoffExtra * 1000;

    await sleep(delayMs);
  }
}

module.exports = { watchDomain };
