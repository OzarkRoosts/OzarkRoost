const express = require('express');
const pool = require('../db/index');
const { normalizeSubscriber, syncSubscriberToMailchimp, unsubscribeSubscriberFromMailchimp } = require('../lib/marketing-funnel');
const router = express.Router();
router.post('/', async (req, res) => {
  try {
    const subscriber = normalizeSubscriber({ email: req.body.email, consent: req.body.consent === true || req.body.consent === 'on' || req.body.consent === 'true', source: req.body.source });
    const result = await pool.query(`INSERT INTO marketing_subscribers (email, source, consented_at, consent_ip, unsubscribed_at, updated_at) VALUES ($1, $2, NOW(), $3, NULL, NOW()) ON CONFLICT (email) DO UPDATE SET source=EXCLUDED.source, consented_at=EXCLUDED.consented_at, consent_ip=EXCLUDED.consent_ip, unsubscribed_at=NULL, updated_at=NOW() RETURNING id, email, source`, [subscriber.email, subscriber.source, req.ip || null]);
    let mailchimp = { configured: false, synced: false };
    try { mailchimp = await syncSubscriberToMailchimp(subscriber); if (mailchimp.synced) await pool.query('UPDATE marketing_subscribers SET mailchimp_synced_at=NOW(), mailchimp_status=$2, updated_at=NOW() WHERE id=$1', [result.rows[0].id, 'subscribed']); }
    catch (err) { console.error('[Mailchimp] subscriber sync failed:', err.message); await pool.query('UPDATE marketing_subscribers SET mailchimp_status=$2, updated_at=NOW() WHERE id=$1', [result.rows[0].id, `error:${err.message}`]); }
    return res.status(201).json({ ok: true, subscriber: result.rows[0], mailchimp: { configured: mailchimp.configured, synced: mailchimp.synced } });
  } catch (err) { return res.status(400).json({ ok: false, error: err.message }); }
});
router.post('/unsubscribe', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false, error: 'Valid email required' });
  await pool.query('UPDATE marketing_subscribers SET unsubscribed_at=NOW(), mailchimp_status=$2, updated_at=NOW() WHERE email=$1', [email, 'unsubscribed']);
  try { await unsubscribeSubscriberFromMailchimp(email); } catch (err) { console.error('[Mailchimp] unsubscribe sync failed:', err.message); }
  return res.json({ ok: true });
});
module.exports = router;
