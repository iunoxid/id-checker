const { config } = require('./config');
const { getAll } = require('./stateRegistry');
const { buildStatusText } = require('./watcher');
const logger = require('./logger');

const BASE_API = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`;

let offset = 0;

async function sendReply(chatId, text) {
  try {
    await fetch(`${BASE_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (err) {
    logger.warn(`[bot] Reply error: ${err.message || String(err)}`);
  }
}

async function handleUpdate(update) {
  const msg = update.message;
  if (!msg?.text) return;

  const chatId = String(msg.chat.id);

  // Hanya respon dari chat yang dikonfigurasi (keamanan)
  if (chatId !== String(config.TELEGRAM_CHAT_ID)) return;

  const cmd = msg.text.trim().split('@')[0]; // handle /status@botname

  if (cmd === '/status') {
    const states = getAll();

    if (states.length === 0) {
      await sendReply(chatId, 'Belum ada domain yang dipantau saat ini.');
      return;
    }

    for (const state of states) {
      await sendReply(chatId, buildStatusText(state));
    }
  }
}

async function pollUpdates() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);

  try {
    const res = await fetch(
      `${BASE_API}/getUpdates?offset=${offset}&timeout=30&allowed_updates=${encodeURIComponent('["message"]')}`,
      { signal: controller.signal }
    );

    const data = await res.json().catch(() => null);

    if (!data?.ok) {
      logger.warn(`[bot] getUpdates failed: ${JSON.stringify(data)}`);
      return;
    }

    for (const update of data.result || []) {
      offset = update.update_id + 1;
      await handleUpdate(update);
    }
  } catch (err) {
    const isAbort = err.name === 'AbortError' || String(err.message).includes('abort');
    if (!isAbort) {
      logger.warn(`[bot] Poll error: ${err.message || String(err)}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function startBotPolling() {
  logger.info('[bot] Telegram /status command aktif. Ketik /status di chat untuk cek status domain.');
  while (true) {
    await pollUpdates();
  }
}

module.exports = { startBotPolling };
