/**
 * OpsBot — Autonomous Operations Superbot
 *
 * Runs 24/7 and handles email, affiliate operations, outreach, and payments.
 */

require('dotenv').config();
const { sendOutboundEmail } = require('./email-sender');
let Imap = null;
let simpleParser = null;
try { Imap = require('imap'); } catch { console.warn('[OpsBot] optional dep "imap" missing'); }
try { ({ simpleParser } = require('mailparser')); } catch { console.warn('[OpsBot] optional dep "mailparser" missing'); }
const { OpenAI } = require('openai');
const pool = require('../db/index');

const AI = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : undefined,
});
const AI_MODEL = process.env.GROQ_API_KEY
  ? (process.env.GROQ_MODEL || 'llama-3.1-8b-instant')
  : (process.env.OPENAI_MODEL || 'gpt-4o-mini');

async function sendEmail({ to, subject, html, text }) {
  const from = process.env.MAILTRAP_FROM_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER;
  if (!from) {
    console.error('[OpsBot] Outbound email not configured: set MAILTRAP_FROM_EMAIL + MAILTRAP_TOKEN, or SMTP_USER + SMTP_PASS');
    return null;
  }
  try {
    const info = await sendOutboundEmail({
      from: `OzarkRoost OpsBot <${from}>`,
      to,
      subject,
      html: html || `<p>${text || ''}</p>`,
      text,
    });
    await logEmail({ to, subject, status: 'sent', messageId: info?.messageId || info?.message_id || null });
    console.log('[OpsBot] Email sent to', to, '—', subject);
    return info;
  } catch (err) {
    console.error('[OpsBot] Email send failed:', err.message);
    await logEmail({ to, subject, status: 'failed', error: err.message });
    return null;
  }
}

async function logEmail({ to, subject, status, messageId, error }) {
  try {
    await pool.query(
      `INSERT INTO opsbot_email_log (recipient, subject, status, message_id, error_message, sent_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [to, subject, status, messageId || null, error || null]
    );
  } catch (_) {}
}

async function runEmailSmokeTest() {
  if (process.env.OPSBOT_EMAIL_SMOKE_TEST !== 'true') return;
  const to = process.env.MAILTRAP_FROM_EMAIL || process.env.EMAIL_USER || process.env.SMTP_USER || process.env.EMAIL_FROM;
  if (!to) {
    console.error('[OpsBot:EmailTest] skipped — no owner/sender address configured');
    return;
  }
  try {
    const recent = await pool.query(
      `SELECT id FROM opsbot_email_log WHERE subject = $1 AND sent_at > NOW() - INTERVAL '24 hours' LIMIT 1`,
      ['[OpsBot] Outbound email smoke test']
    );
    if (recent.rows.length) return;
  } catch (_) {}
  console.log('[OpsBot:EmailTest] Sending outbound email smoke test to configured owner address...');
  const result = await sendEmail({
    to,
    subject: '[OpsBot] Outbound email smoke test',
    html: '<p>OzarkRoost outbound email is working. This is an automated delivery test from OpsBot.</p>',
    text: 'OzarkRoost outbound email is working. This is an automated delivery test from OpsBot.',
  });
  console.log(result ? '[OpsBot:EmailTest] SUCCESS — outbound email accepted.' : '[OpsBot:EmailTest] FAILED — see email error above.');
}

async function aiChat(systemPrompt, userPrompt, maxTokens = 400) {
  const resp = await AI.chat.completions.create({ model: AI_MODEL, temperature: 0.35, max_tokens: maxTokens, messages: [
    { role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt },
  ]});
  return resp.choices[0]?.message?.content?.trim() || '';
}

async function runEmailMonitor() {
  console.log('[OpsBot:Email] Checking inbox queue...');
  try {
    const { rows } = await pool.query(`SELECT * FROM opsbot_inbound_emails WHERE status = 'unread' ORDER BY received_at ASC LIMIT 20`);
    if (rows.length === 0) { console.log('[OpsBot:Email] No new emails.'); return; }
    for (const email of rows) await processInboundEmail(email);
  } catch (err) { console.error('[OpsBot:Email] Monitor error:', err.message); }
}

async function processInboundEmail(email) {
  try {
    const category = await aiChat(
      `You are an email classifier for OzarkRoost, a cabin and outdoor recreation directory in the Arkansas Ozarks.\nClassify the email into exactly one of: payment_confirmation, listing_inquiry, affiliate_application, partnership_inquiry, support_request, spam, other.\nRespond with only the category name.`,
      `From: ${email.sender}\nSubject: ${email.subject}\nBody: ${email.body_text?.substring(0, 500)}`
    );
    const reply = await aiChat(
      `You are OpsBot, the autonomous operations assistant for OzarkRoost.\nWrite a professional, warm, concise reply (3-5 sentences max).\nOzarkRoost is an Ozarks cabin & outdoor directory. Listing fee is $49/month.\nAffiliate commissions: 8-10%. Always end with a clear next step.`,
      `Email category: ${category}\nFrom: ${email.sender}\nSubject: ${email.subject}\nBody: ${email.body_text?.substring(0, 800)}`
    );
    const sent = await sendEmail({ to: email.sender, subject: `Re: ${email.subject}`, html: reply.replace(/\n/g, '<br>'), text: reply });
    if (!sent) throw new Error('outbound reply failed');
    await pool.query(`UPDATE opsbot_inbound_emails SET status = 'processed', category = $1, replied_at = NOW() WHERE id = $2`, [category.trim(), email.id]);
    if (category.trim() === 'payment_confirmation') {
      await pool.query(`INSERT INTO opsbot_payment_events (source, reference, amount_text, status, created_at) VALUES ('email', $1, $2, 'received', NOW()) ON CONFLICT DO NOTHING`, [email.id, email.subject]);
    }
    console.log(`[OpsBot:Email] Processed: ${email.subject} (${category.trim()})`);
  } catch (err) {
    console.error('[OpsBot:Email] Process error:', err.message);
    await pool.query(`UPDATE opsbot_inbound_emails SET status = 'error' WHERE id = $1`, [email.id]);
  }
}

const AFFILIATE_TARGETS = [
  { name: 'Vrbo Affiliate', url: 'https://www.vrbo.com/info/affiliates', category: 'rentals', commission: '8%' },
  { name: 'Booking.com Affiliate', url: 'https://www.booking.com/affiliate-program', category: 'hotels', commission: '4-6%' },
  { name: 'Viator Affiliate', url: 'https://www.viatoraffiliateprogram.com', category: 'tours', commission: '8-10%' },
  { name: 'AllTrails Affiliate', url: 'https://www.alltrails.com/affiliates', category: 'hiking', commission: '6%' },
  { name: 'REI Affiliate', url: 'https://www.rei.com/help/affiliate-program.html', category: 'outdoor-gear', commission: '5%' },
  { name: 'Cabelas Affiliate', url: 'https://www.cabelas.com/s/affiliate-program', category: 'outdoor-gear', commission: '3-5%' },
  { name: 'Hipcamp Affiliate', url: 'https://www.hipcamp.com/affiliates', category: 'camping', commission: '7%' },
  { name: 'Outdoorsy Affiliate', url: 'https://www.outdoorsy.com/affiliate-program', category: 'rv-rentals', commission: '5%' },
  { name: 'KOA Affiliates', url: 'https://koa.com/affiliate', category: 'camping', commission: '5%' },
  { name: 'National Park Trips', url: 'https://nationalparktrips.com/affiliate', category: 'parks', commission: '8%' },
  { name: 'TripAdvisor Affiliate', url: 'https://www.tripadvisor.com/affiliates', category: 'travel', commission: '50% rev share' },
  { name: 'GetYourGuide Affiliate', url: 'https://www.getyourguide.com/partner', category: 'activities', commission: '8%' },
  { name: 'Amazon Associates (Outdoor)', url: 'https://affiliate-program.amazon.com', category: 'products', commission: '3-10%' },
  { name: 'Airbnb Affiliate', url: 'https://www.airbnb.com/d/affiliateprogram', category: 'rentals', commission: 'variable' },
];

async function runAffiliateHunter() {
  console.log('[OpsBot:Affiliate] Scanning for new affiliate opportunities...');
  try {
    for (const target of AFFILIATE_TARGETS) {
      const existing = await pool.query(`SELECT id, status FROM opsbot_affiliate_applications WHERE program_name = $1`, [target.name]);
      if (existing.rows.length > 0) { console.log(`[OpsBot:Affiliate] Already tracked: ${target.name} (${existing.rows[0].status})`); continue; }
      const appText = await aiChat(
        `You are writing an affiliate program application for OzarkRoost.\nOzarkRoost is an Arkansas Ozarks cabin and outdoor recreation directory at ozarkroosts.com.\nWe have guides, listings, an adventure section, and growing traffic from outdoor/travel enthusiasts.\nWrite a professional 3-paragraph affiliate application email. Be genuine, mention our niche relevance.`,
        `Affiliate program: ${target.name}\nCategory: ${target.category}\nCommission: ${target.commission}\nApplication URL: ${target.url}`
      );
      await pool.query(`INSERT INTO opsbot_affiliate_applications (program_name, category, commission_rate, apply_url, application_text, status, created_at) VALUES ($1, $2, $3, $4, $5, 'drafted', NOW())`, [target.name, target.category, target.commission, target.url, appText]);
      console.log(`[OpsBot:Affiliate] Drafted application for ${target.name}`);
    }
    const pending = await pool.query(`SELECT COUNT(*) as cnt FROM opsbot_affiliate_applications WHERE status = 'drafted'`);
    const count = parseInt(pending.rows[0]?.cnt || 0);
    if (count > 0) {
      const owner = process.env.MAILTRAP_FROM_EMAIL || process.env.EMAIL_USER || process.env.SMTP_USER || process.env.EMAIL_FROM;
      if (owner) await sendEmail({ to: owner, subject: `[OpsBot] ${count} affiliate applications ready to submit`, html: `<h2>OpsBot Affiliate Report</h2><p>${count} affiliate program applications have been drafted and are ready to submit.</p>`, text: `${count} affiliate applications drafted.` });
    }
  } catch (err) { console.error('[OpsBot:Affiliate] Hunter error:', err.message); }
}

async function runOutreachOverseer() {
  console.log('[OpsBot:Outreach] Running outreach cycle...');
  try {
    const coldInquiries = await pool.query(`SELECT id, operator_name, email, property_name, property_type, location FROM operator_inquiries WHERE submitted_at < NOW() - INTERVAL '24 hours' AND id NOT IN (SELECT reference_id FROM opsbot_outreach_log WHERE outreach_type = 'operator_followup') LIMIT 10`);
    for (const inquiry of coldInquiries.rows) {
      const followup = await aiChat(
        `You are an outreach specialist for OzarkRoost, an Ozarks cabin directory.\nWrite a short, warm follow-up email (3-4 sentences) to a cabin operator who inquired about listing.\nListing fee is $49/month. Emphasize exposure to Ozarks travelers, easy setup, no long-term contract.\nEnd with a payment link placeholder: [PAYMENT_LINK].`,
        `Name: ${inquiry.operator_name}\nProperty: ${inquiry.property_name}\nType: ${inquiry.property_type}\nLocation: ${inquiry.location}`
      );
      const paymentLink = process.env.STRIPE_PAYMENT_LINK_URL || 'https://ozarkroosts.com/list-your-cabin';
      const emailHtml = followup.replace('[PAYMENT_LINK]', `<a href="${paymentLink}">${paymentLink}</a>`);
      const sent = await sendEmail({ to: inquiry.email, subject: `Following up — List ${inquiry.property_name} on OzarkRoost`, html: emailHtml, text: followup.replace('[PAYMENT_LINK]', paymentLink) });
      if (!sent) continue;
      await pool.query(`INSERT INTO opsbot_outreach_log (outreach_type, reference_id, recipient_email, status, sent_at) VALUES ('operator_followup', $1, $2, 'sent', NOW())`, [inquiry.id, inquiry.email]);
      console.log(`[OpsBot:Outreach] Followed up with ${inquiry.operator_name}`);
    }
    console.log('[OpsBot:Outreach] Cycle complete.');
  } catch (err) { console.error('[OpsBot:Outreach] Overseer error:', err.message); }
}

async function runPaymentWatchdog() {
  console.log('[OpsBot:Payments] Running payment watchdog...');
  try {
    const revenue = await pool.query(`SELECT (SELECT COUNT(*) FROM listing_submissions WHERE payment_status = 'paid') as paid_listings, (SELECT COUNT(*) FROM listing_submissions WHERE payment_status = 'unpaid') as unpaid_listings, (SELECT COUNT(*) FROM autonomous_contracts WHERE status = 'signed') as signed_contracts, (SELECT COALESCE(SUM(price), 0) FROM autonomous_contracts WHERE status = 'signed') as mrr`);
    const snap = revenue.rows[0];
    await pool.query(`INSERT INTO opsbot_revenue_snapshots (paid_listings, unpaid_listings, signed_contracts, mrr, snapshot_at) VALUES ($1, $2, $3, $4, NOW())`, [snap.paid_listings, snap.unpaid_listings, snap.signed_contracts, snap.mrr]);
    console.log(`[OpsBot:Payments] Snapshot: ${snap.paid_listings} paid listings, MRR $${snap.mrr}`);
  } catch (err) { console.error('[OpsBot:Payments] Watchdog error:', err.message); }
}

async function sendDailyDigest() { /* retained by existing dashboard/reporting flow */ }

async function fetchInboundEmails() {
  if (!Imap || !simpleParser) { console.log('[OpsBot:IMAP] imap/mailparser not installed — skipping email fetch.'); return; }
  if (!(process.env.IMAP_USER || process.env.EMAIL_USER) || !(process.env.IMAP_PASSWORD || process.env.EMAIL_PASSWORD)) { console.log('[OpsBot:IMAP] IMAP credentials not set — skipping email fetch.'); return; }
  const imap = new Imap({ user: process.env.IMAP_USER || process.env.EMAIL_USER, password: process.env.IMAP_PASSWORD || process.env.EMAIL_PASSWORD, host: process.env.IMAP_HOST || 'imap.gmail.com', port: Number(process.env.IMAP_PORT) || 993, tls: true, tlsOptions: { rejectUnauthorized: false } });
  console.log('[OpsBot:IMAP] Fetching emails from inbox...');
  return new Promise((resolve) => {
    let emailsFound = 0; let emailsAdded = 0;
    imap.once('ready', () => imap.openBox('INBOX', false, (err) => {
      if (err) { console.error('[OpsBot:IMAP] Open inbox error:', err.message); imap.end(); return resolve(); }
      imap.search(['UNSEEN'], (err, results) => {
        if (err) { console.error('[OpsBot:IMAP] Search error:', err.message); imap.end(); return resolve(); }
        if (!results?.length) { imap.end(); return resolve(); }
        emailsFound = results.length;
        const f = imap.fetch(results.slice(-20), { bodies: '' });
        f.on('message', (msg) => {
          let raw = '';
          msg.on('body', (stream) => stream.on('data', (chunk) => { raw += chunk.toString('utf8'); }));
          msg.once('end', async () => {
            try {
              const parsed = await simpleParser(raw);
              const sender = parsed.from?.text || parsed.from?.value?.[0]?.address || 'unknown';
              const subject = parsed.subject || '(no subject)';
              const text = parsed.text || '';
              const html = parsed.html || '';
              const existing = await pool.query(`SELECT id FROM opsbot_inbound_emails WHERE sender = $1 AND subject = $2 AND received_at > NOW() - INTERVAL '1 hour' LIMIT 1`, [sender, subject]);
              if (!existing.rows.length) {
                await pool.query(`INSERT INTO opsbot_inbound_emails (sender, subject, body_text, body_html, status, received_at) VALUES ($1, $2, $3, $4, 'unread', NOW())`, [sender, subject, text, html]);
                emailsAdded++;
                console.log(`[OpsBot:IMAP] Queued: ${subject} from ${sender}`);
              }
            } catch (e) { console.error('[OpsBot:IMAP] Parse error:', e.message); }
          });
        });
        f.once('end', () => imap.end());
        f.once('error', (e) => { console.error('[OpsBot:IMAP] Fetch error:', e.message); imap.end(); });
      });
    }));
    imap.once('error', (e) => { console.error('[OpsBot:IMAP] Connection error:', e.message); resolve(); });
    imap.once('end', () => { console.log(`[OpsBot:IMAP] Done. Found ${emailsFound}, queued ${emailsAdded}.`); resolve(); });
    imap.connect();
    setTimeout(() => { try { imap.end(); } catch (_) {} resolve(); }, 30000);
  });
}

function start() {
  if (process.env.OPSBOT_ENABLED !== 'true') { console.log('[OpsBot] Disabled (set OPSBOT_ENABLED=true to activate).'); return; }
  console.log('[OpsBot] Starting autonomous operations superbot...');
  const emailInterval = Number(process.env.OPSBOT_EMAIL_CHECK_INTERVAL) || 5 * 60_000;
  const affiliateInterval = Number(process.env.OPSBOT_AFFILIATE_SCAN_INTERVAL) || 60 * 60_000;
  const outreachInterval = Number(process.env.OPSBOT_OUTREACH_INTERVAL) || 15 * 60_000;
  const paymentInterval = Number(process.env.OPSBOT_PAYMENT_CHECK_INTERVAL) || 10 * 60_000;

  setTimeout(async () => { await fetchInboundEmails(); await runEmailMonitor(); setInterval(async () => { await fetchInboundEmails(); await runEmailMonitor(); }, emailInterval).unref(); }, 5_000);
  setTimeout(() => { runAffiliateHunter(); setInterval(runAffiliateHunter, affiliateInterval).unref(); }, 15_000);
  setTimeout(() => { runOutreachOverseer(); setInterval(runOutreachOverseer, outreachInterval).unref(); }, 30_000);
  setTimeout(() => { runPaymentWatchdog(); setInterval(runPaymentWatchdog, paymentInterval).unref(); }, 45_000);
  setTimeout(() => { runEmailSmokeTest(); }, 8_000);
  let lastDigestDate = null;
  setInterval(() => { const now = new Date(); const today = now.toDateString(); if (now.getHours() === 7 && lastDigestDate !== today) { lastDigestDate = today; sendDailyDigest(); } }, 60 * 60_000).unref();
  console.log('[OpsBot] All modules armed and running.');
}

module.exports = { start, fetchInboundEmails, runEmailMonitor, runAffiliateHunter, runOutreachOverseer, runPaymentWatchdog, sendDailyDigest, sendEmail, runEmailSmokeTest };
