const BASE_URL = 'https://rdap.pandi.id/rdap/domain/';

async function fetchDomain(domain, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE_URL}${encodeURIComponent(domain)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/rdap+json, application/json, text/plain' },
      signal: controller.signal,
    });

    const contentType = res.headers.get('content-type') || '';
    let data;
    if (contentType.includes('json')) {
      data = await res.json().catch(() => null);
    } else {
      data = await res.text().catch(() => null);
    }

    return { statusCode: res.status, data };
  } catch (err) {
    return { statusCode: 0, data: { error: err.message || String(err) } };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { fetchDomain, BASE_URL };
