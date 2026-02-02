const { config } = require('./config');

function buildPayload(content, embeds) {
  const payload = {};
  if (content) payload.content = content;
  if (Array.isArray(embeds) && embeds.length > 0) payload.embeds = embeds;
  if (config.DISCORD_USERNAME) payload.username = config.DISCORD_USERNAME;
  if (config.DISCORD_AVATAR_URL) payload.avatar_url = config.DISCORD_AVATAR_URL;
  return payload;
}

async function sendDiscordMessage(content, embeds) {
  const payload = buildPayload(content, embeds);

  try {
    const res = await fetch(`${config.DISCORD_WEBHOOK_URL}?wait=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`[discord] Failed to send message: ${res.status} ${res.statusText} ${text}`);
      return null;
    }

    const data = await res.json().catch(() => null);
    return data?.id || null;
  } catch (err) {
    console.warn(`[discord] Error sending message: ${err.message || String(err)}`);
    return null;
  }
}

async function editDiscordMessage(messageId, content, embeds) {
  if (!messageId) return false;
  const payload = buildPayload(content, embeds);

  try {
    const res = await fetch(`${config.DISCORD_WEBHOOK_URL}/messages/${messageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`[discord] Failed to edit message: ${res.status} ${res.statusText} ${text}`);
      return false;
    }

    return true;
  } catch (err) {
    console.warn(`[discord] Error editing message: ${err.message || String(err)}`);
    return false;
  }
}

module.exports = { sendDiscordMessage, editDiscordMessage };
