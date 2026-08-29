const BASE_URL = process.env.TRAVELPAYOUTS_API_BASE_URL || 'https://www.travelpayouts.com/api';

function getToken() {
  return process.env.TRAVELPAYOUTS_API_TOKEN || process.env.TRAVELPAYOUTS_API_KEY || '';
}

async function request(path, options = {}) {
  const token = getToken();
  if (!token) throw new Error('Travelpayouts API token is not configured');

  const url = new URL(path, BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`);
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(`Travelpayouts API ${response.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  return data;
}

function configured() { return Boolean(getToken()); }

module.exports = { request, configured };
