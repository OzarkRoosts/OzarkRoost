// Netlify Function: track.js
// Receives POST { project, id, product_id, ts } from r/<id>.html and forwards to GA Measurement Protocol if configured.

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  let payload = {};
  try { payload = JSON.parse(event.body || '{}'); } catch(e){ return { statusCode: 400, body: 'Invalid JSON' }; }

  // Minimal validation
  const project = payload.project || 'default';
  const id = payload.id || '';
  const product_id = payload.product_id || '';

  // Optionally forward to GA4 Measurement Protocol
  const GA_ID = process.env.GA_ID || process.env.NEXT_PUBLIC_GA_ID;
  const GA_API_SECRET = process.env.GA_API_SECRET;

  if (GA_ID && GA_API_SECRET) {
    try {
      const body = {
        client_id: 'affiliate-tracker',
        events: [{ name: 'affiliate_click', params: { project, id, product_id, ts: Date.now() } }]
      };
      const url = `https://www.google-analytics.com/mp/collect?measurement_id=${GA_ID}&api_secret=${GA_API_SECRET}`;
      await fetch(url, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) });
    } catch (err) { console.warn('GA forward failed', err); }
  }

  // Optionally append to a basic logging service (we'll just respond OK)
  return { statusCode: 200, body: JSON.stringify({ status: 'ok', received: { project, id, product_id } }) };
};
