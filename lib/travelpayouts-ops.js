const { request, configured } = require('./travelpayouts-api');

const REPORT_PATH = process.env.TRAVELPAYOUTS_REPORT_PATH || '/v1/analytics';

async function getAffiliateReport(params = {}) {
  if (!configured()) return { configured: false, data: null };
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  }
  const path = `${REPORT_PATH}${query.toString() ? `?${query}` : ''}`;
  try {
    const data = await request(path);
    return { configured: true, data };
  } catch (error) {
    return { configured: true, data: null, error: error.message };
  }
}

async function run() {
  const result = await getAffiliateReport();
  if (!result.configured) {
    console.log('[Travelpayouts] API not configured');
    return result;
  }
  if (result.error) {
    console.error(`[Travelpayouts] API report failed: ${result.error}`);
    return result;
  }
  console.log('[Travelpayouts] API report retrieved successfully');
  return result;
}

module.exports = { getAffiliateReport, run };
