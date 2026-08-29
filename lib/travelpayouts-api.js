const BASE_URL = process.env.TRAVELPAYOUTS_API_BASE_URL || 'https://api.travelpayouts.com';

function getToken() {
  return process.env.TRAVELPAYOUTS_API_TOKEN || process.env.TRAVELPAYOUTS_API_KEY || '';
}

async function request(path, options = {}) {
  const token = getToken();
  if (!token) throw new Error('Travelpayouts API token is not configured');

  const url = new URL(path, BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`);
  const headers = {
    Accept: 'application/json',
    'X-Access-Token': token,
    ...(options.headers || {})
  };
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(`Travelpayouts API ${response.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  return data;
}

async function getBalance() {
  return request('/finance/v2/get_user_balance');
}

async function getNextPayout() {
  return request('/finance/v2/get_user_next_payout');
}

async function getPayments() {
  return request('/finance/v2/get_user_payments');
}

async function getActions(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  }
  return request(`/finance/v2/get_user_actions_affecting_balance${query.toString() ? `?${query}` : ''}`);
}

async function getActionDetails(actionId, currency = 'usd') {
  const query = new URLSearchParams({ action_id: actionId, currency });
  return request(`/finance/v2/get_action_details?${query}`);
}

function configured() { return Boolean(getToken()); }

module.exports = {
  request,
  configured,
  getBalance,
  getNextPayout,
  getPayments,
  getActions,
  getActionDetails
};
