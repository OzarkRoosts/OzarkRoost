function normalizeTrackingUrl(raw) {
  if (!raw) return null;
  try {
    const url = new URL(String(raw).trim());
    if (url.protocol !== 'https:') return null;
    return url.toString();
  } catch (_) {
    return null;
  }
}

function isActivatable(record = {}) {
  const status = String(record.status || '').toLowerCase();
  return (status === 'approved' || status === 'applied') && Boolean(normalizeTrackingUrl(record.response_url));
}

function buildOverrides(records = []) {
  const overrides = {};
  for (const record of records) {
    const key = String(record.affiliate_key || '').trim();
    const url = normalizeTrackingUrl(record.response_url);
    if (!key || !url || !isActivatable(record)) continue;
    overrides[key] = url;
  }
  return overrides;
}

module.exports = { normalizeTrackingUrl, isActivatable, buildOverrides };
