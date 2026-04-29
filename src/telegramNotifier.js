const { config } = require('./config');

const BASE_API = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`;

function buildText(content, embed) {
  const lines = [];

  if (embed) {
    if (embed.title) lines.push(`*${escMd(embed.title)}*`);
    if (Array.isArray(embed.fields)) {
      for (const field of embed.fields) {
        lines.push(`\n*${escMd(field.name)}:* ${escMd(String(field.value || '-'))}`);
      }
    }
  }

  if (content) lines.push(`\n${escMd(content)}`);

  return lines.join('\n');
}

function escMd(text) {
  // Escape MarkdownV2 special characters
  return String(text).replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

async function sendTelegramMessage(content, embeds) {
  const embed = Array.isArray(embeds) && embeds.length > 0 ? embeds[0] : null;
  const text = buildText(content, embed);
  if (!text.trim()) return null;

  try {
    const res = await fetch(`${BASE_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'MarkdownV2',
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      console.warn(`[telegram] Failed to send message: ${JSON.stringify(data)}`);
      return null;
    }

    return data?.result?.message_id || null;
  } catch (err) {
    console.warn(`[telegram] Error sending message: ${err.message || String(err)}`);
    return null;
  }
}

async function editTelegramMessage(messageId, content, embeds) {
  if (!messageId) return false;
  const embed = Array.isArray(embeds) && embeds.length > 0 ? embeds[0] : null;
  const text = buildText(content, embed);
  if (!text.trim()) return false;

  try {
    const res = await fetch(`${BASE_API}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.TELEGRAM_CHAT_ID,
        message_id: messageId,
        text,
        parse_mode: 'MarkdownV2',
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      // Telegram menolak edit jika konten tidak berubah — ini normal, bukan error
      const isUnchanged = data?.error_code === 400 &&
        typeof data?.description === 'string' &&
        data.description.includes('message is not modified');
      if (!isUnchanged) {
        console.warn(`[telegram] Failed to edit message: ${JSON.stringify(data)}`);
      }
      return false;
    }

    return true;
  } catch (err) {
    console.warn(`[telegram] Error editing message: ${err.message || String(err)}`);
    return false;
  }
}

async function sendTelegramText(text) {
  if (!text || !text.trim()) return null;

  try {
    const res = await fetch(`${BASE_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.TELEGRAM_CHAT_ID,
        text,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      console.warn(`[telegram] Failed to send text: ${JSON.stringify(data)}`);
      return null;
    }

    return data?.result?.message_id || null;
  } catch (err) {
    console.warn(`[telegram] Error sending text: ${err.message || String(err)}`);
    return null;
  }
}

async function editTelegramText(messageId, text) {
  if (!messageId || !text || !text.trim()) return false;

  try {
    const res = await fetch(`${BASE_API}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.TELEGRAM_CHAT_ID,
        message_id: messageId,
        text,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      const isUnchanged = data?.error_code === 400 &&
        typeof data?.description === 'string' &&
        data.description.includes('message is not modified');
      if (!isUnchanged) {
        console.warn(`[telegram] Failed to edit text: ${JSON.stringify(data)}`);
      }
      return false;
    }

    return true;
  } catch (err) {
    console.warn(`[telegram] Error editing text: ${err.message || String(err)}`);
    return false;
  }
}

module.exports = { sendTelegramMessage, editTelegramMessage, sendTelegramText, editTelegramText };
