/**
 * OpsBot — Autonomous Operations Superbot
 *
 * Runs 24/7 and handles:
 *  1. Email monitor  — reads inbox, auto-responds, flags payments
 *  2. Affiliate hunter — finds & applies to new affiliate programs
 *  3. Outreach overseer — manages cabin owner & partner outreach
 *  4. Payment watchdog — ensures every payment is collected
 *
 * Uses Groq (free) for all AI reasoning.
 */

require('dotenv').config();
const nodemailer = require('nodemailer');
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
const AI_MODEL = process.env.GROQ_API_KEY ? (process.env.GROQ_MODEL || 'llama-3.1-8b-instant') : (process.env.OPENAI_MODEL || 'gpt-4o-mini');

const SMTP_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.EMAIL_PORT) || 587;
const mailer = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
});

async function sendEmail({ to, subject, html, text }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error('EMAIL_USER and EMAIL_PASSWORD are required; email was not sent.');
  }
  if (!to) throw new Error('Recipient email is required; email was not sent.');
  try {
    const info = await mailer.sendMail({
      from: `"OzarkRoost OpsBot" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      html: html || `<p>${text || ''}</p>`,
      text,
    });
    await logEmail({ to, subject, status: 'sent', messageId: info.messageId });
    console.log('[OpsBot] Email sent to', to, '—', subject);
    return info;
  } catch (err) {
    console.error('[OpsBot] Email send failed:', err.message);
    await logEmail({ to, subject, status: 'failed', error: err.message });
    throw err;
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

async function aiChat(systemPrompt, userPrompt, maxTokens = 400) {
  const resp = await AI.chat.completions.create({
    model: AI_MODEL,
    temperature: 0.35,
    max_tokens: maxTokens,
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
  });
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
      `You are an email classifier for OzarkRoost. Classify the email into exactly one of: payment_confirmation, listing_inquiry, affiliate_application, partnership_inquiry, support_request, spam, other. Respond with only the category name.`,
      `From: ${email.sender}\nSubject: ${email.subject}\nBody: ${email.body_text?.substring(0, 500)}`
    );
    const reply = await aiChat(
      `You are OpsBot, the autonomous operations assistant for OzarkRoost. Write a professional, warm, concise reply (3-5 sentences max). OzarkRoost is an Ozarks cabin & outdoor directory. Listing fee is $49/month. Affiliate commissions: 8-10%. Always end with a clear next step.`,
      `Email category: ${category}\nFrom: ${email.sender}\nSubject: ${email.subject}\nBody: ${email.body_text?.substring(0, 800)}`
    );
    await sendEmail({ to: email.sender, subject: `Re: ${email.subject}`, html: reply.replace(/\n/g, '<br>'), text: reply });
    await pool.query(`UPDATE opsbot_inbound_emails SET status = 'processed', category = $1, replied_at = NOW() WHERE id = $2`, [category.trim(), email.id]);
    if (category.trim() === 'payment_confirmation') {
      await pool.query(`INSERT INTO opsbot_payment_events (source, reference, amount_text, status, created_at) VALUES ('email', $1, $2, 'received', NOW()) ON CONFLICT DO NOTHING`, [email.id, email.subject]);
    }
    console.log(`[OpsBot:Email] Processed: ${email.subject} (${category.trim()})`);
  } catch (err) {
    console.error('[OpsBot:Email] Process error:', err.message);
    await pool.query(`UPDATE opsbot_inbound_emails SET status = 'error' WHERE id = $1`, [email.id]).catch(() => {});
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
      if (existing.rows.length > 0) continue;
      const appText = await aiChat(
        `You are writing an affiliate program application for OzarkRoost. OzarkRoost is an Arkansas Ozarks cabin and outdoor recreation directory. Write a professional 3-paragraph affiliate application. Be genuine and mention niche relevance.`,
        `Affiliate program: ${target.name}\nCategory: ${target.category}\nCommission: ${target.commission}\nApplication URL: ${target.url}`
      );
      await pool.query(`INSERT INTO opsbot_affiliate_applications (program_name, category, commission_rate, apply_url, application_text, status, created_at) VALUES ($1, $2, $3, $4, $5, 'drafted', NOW())`, [target.name, target.category, target.commission, target.url, appText]);
      console.log(`[OpsBot:Affiliate] Drafted application for ${target.name}`);
    }
    const pending = await pool.query(`SELECT COUNT(*) as cnt FROM opsbot_affiliate_applications WHERE status = 'drafted'`);
    const count = parseInt(pending.rows[0]?.cnt || 0, 10);
    if (count > 0 && process.env.EMAIL_USER) {
      await sendEmail({
        to: process.env.EMAIL_USER,
        subject: `[OpsBot] ${count} affiliate applications ready to submit`,
        html: `<h2>OpsBot Affiliate Report</h2><p>${count} affiliate program applications have been drafted and are ready to submit.</p><p>Visit <a href="${process.env.APP_URL}/api/opsbot/dashboard">OpsBot Dashboard</a> to review and send them.</p>`,
        text: `${count} affiliate applications drafted. Review at ${process.env.APP_URL}/api/opsbot/dashboard`,
      });
    }
  } catch (err) { console.error('[OpsBot:Affiliate] Hunter error:', err.message); }
}

async function runOutreachOverseer() {
  console.log('[OpsBot:Outreach] Running outreach cycle...');
  try {
    const coldInquiries = await pool.query(`SELECT id, operator_name, email, property_name, property_type, location FROM operator_inquiries WHERE submitted_at < NOW() - INTERVAL '24 hours' AND id NOT IN (SELECT reference_id FROM opsbot_outreach_log WHERE outreach_type = 'operator_followup') LIMIT 10`);
    for (const inquiry of coldInquiries.rows) {
      const followup = await aiChat(`You are an outreach specialist for OzarkRoost, an Ozarks cabin directory. Write a short, warm follow-up email (3-4 sentences). Listing fee is $49/month. Emphasize exposure, easy setup, and no long-term contract. End with [PAYMENT_LINK].`, `Name: ${inquiry.operator_name}\nProperty: ${inquiry.property_name}\nType: ${inquiry.property_type}\nLocation: ${inquiry.location}`);
      const paymentLink = process.env.STRIPE_PAYMENT_LINK_URL || 'https://ozarkroosts.com/list-your-cabin';
      const emailHtml = followup.replace('[PAYMENT_LINK]', `<a href="${paymentLink}">${paymentLink}</a>`);
      await sendEmail({ to: inquiry.email, subject: `Following up — List ${inquiry.property_name} on OzarkRoost`, html: emailHtml, text: followup.replace('[PAYMENT_LINK]', paymentLink) });
      await pool.query(`INSERT INTO opsbot_outreach_log (outreach_type, reference_id, recipient_email, status, sent_at) VALUES ('operator_followup', $1, $2, 'sent', NOW())`, [inquiry.id, inquiry.email]);
    }

    const nurturePending = await pool.query(`SELECT n.lead_email, l.source FROM nurture_email_queue n LEFT JOIN lead_magnet_submissions l ON l.email = n.lead_email WHERE n.sequence_step = 2 AND n.status = 'pending' AND n.scheduled_at <= NOW() LIMIT 20`);
    for (const lead of nurturePending.rows) {
      const nurtureEmail = await aiChat(`You are writing nurture email #2 for OzarkRoost. Write a warm, value-packed email (4-5 sentences) about planning an Ozarks trip. Include a CTA to browse listings. Start with "Subject: ".`, `Subscriber source: ${lead.source || 'website'}`);
      const lines = nurtureEmail.split('\n');
      const subjectLine = lines[0].replace(/^subject:\s*/i, '').trim();
      const body = lines.slice(1).join('\n').trim();
      await sendEmail({ to: lead.lead_email, subject: subjectLine || 'Your Ozarks trip is waiting', html: body.replace(/\n/g, '<br>'), text: body });
      await pool.query(`UPDATE nurture_email_queue SET status = 'sent', sent_at = NOW() WHERE lead_email = $1 AND sequence_step = 2`, [lead.lead_email]);
    }

    const newReferrals = await pool.query(`SELECT r.id, r.name, r.email, r.website, r.promotion_method FROM referral_submissions r WHERE r.submitted_at > NOW() - INTERVAL '48 hours' AND r.id NOT IN (SELECT reference_id FROM opsbot_outreach_log WHERE outreach_type = 'referral_welcome') LIMIT 10`);
    for (const ref of newReferrals.rows) {
      const welcomeMsg = await aiChat(`Write a warm welcome email to a new OzarkRoost affiliate/referral partner. OzarkRoost pays 10% commission on paid listings. Explain next steps. Keep it to 4-5 sentences.`, `Partner name: ${ref.name}\nPromotion method: ${ref.promotion_method || 'unknown'}\nWebsite: ${ref.website || 'none'}`);
      await sendEmail({ to: ref.email, subject: 'Welcome to the OzarkRoost Partner Program!', html: welcomeMsg.replace(/\n/g, '<br>'), text: welcomeMsg });
      await pool.query(`INSERT INTO opsbot_outreach_log (outreach_type, reference_id, recipient_email, status, sent_at) VALUES ('referral_welcome', $1, $2, 'sent', NOW())`, [ref.id, ref.email]);
    }
    console.log('[OpsBot:Outreach] Cycle complete.');
  } catch (err) { console.error('[OpsBot:Outreach] Overseer error:', err.message); }
}

async function runPaymentWatchdog() {
  console.log('[OpsBot:Payments] Running payment watchdog...');
  try {
    const unpaidListings = await pool.query(`SELECT id, owner_name, owner_email, property_name, payment_link_url, created_at FROM listing_submissions WHERE payment_status = 'unpaid' AND created_at < NOW() - INTERVAL '48 hours' AND id NOT IN (SELECT reference_id FROM opsbot_outreach_log WHERE outreach_type = 'payment_reminder') LIMIT 20`);
    for (const listing of unpaidListings.rows) {
      const payLink = listing.payment_link_url || process.env.STRIPE_PAYMENT_LINK_URL || 'https://ozarkroosts.com/list-your-cabin';
      const msg = await aiChat(`Write a short, friendly payment reminder email for OzarkRoost. The cabin owner submitted their listing but hasn't paid yet ($49/month). Include [PAYMENT_LINK].`, `Owner: ${listing.owner_name}\nProperty: ${listing.property_name}`);
      const emailHtml = msg.replace('[PAYMENT_LINK]', `<a href="${payLink}">Complete your listing payment</a>`);
      await sendEmail({ to: listing.owner_email, subject: `Your listing "${listing.property_name}" is almost live — one step left`, html: emailHtml, text: msg.replace('[PAYMENT_LINK]', payLink) });
      await pool.query(`INSERT INTO opsbot_outreach_log (outreach_type, reference_id, recipient_email, status, sent_at) VALUES ('payment_reminder', $1, $2, 'sent', NOW())`, [listing.id, listing.owner_email]);
    }
    const revenue = await pool.query(`SELECT (SELECT COUNT(*) FROM listing_submissions WHERE payment_status = 'paid') as paid_listings, (SELECT COUNT(*) FROM listing_submissions WHERE payment_status = 'unpaid') as unpaid_listings, (SELECT COUNT(*) FROM autonomous_contracts WHERE status = 'signed') as signed_contracts, (SELECT COALESCE(SUM(price), 0) FROM autonomous_contracts WHERE status = 'signed') as mrr`);
    const snap = revenue.rows[0];
    await pool.query(`INSERT INTO opsbot_revenue_snapshots (paid_listings, unpaid_listings, signed_contracts, mrr, snapshot_at) VALUES ($1, $2, $3, $4, NOW())`, [snap.paid_listings, snap.unpaid_listings, snap.signed_contracts, snap.mrr]);
    console.log(`[OpsBot:Payments] Snapshot: ${snap.paid_listings} paid listings, MRR $${snap.mrr}`);
  } catch (err) { console.error('[OpsBot:Payments] Watchdog error:', err.message); }
}

async function sendDailyDigest() {
  try {
    const stats = await pool.query(`SELECT (SELECT COUNT(*) FROM listing_submissions WHERE payment_status = 'paid') as paid_listings, (SELECT COUNT(*) FROM listing_submissions WHERE payment_status = 'unpaid') as unpaid_listings, (SELECT COUNT(*) FROM opsbot_email_log WHERE status = 'sent' AND sent_at > NOW() - INTERVAL '24 hours') as emails_today, (SELECT COUNT(*) FROM opsbot_affiliate_applications WHERE status = 'drafted') as pending_affiliates, (SELECT COUNT(*) FROM operator_inquiries WHERE submitted_at > NOW() - INTERVAL '24 hours') as new_inquiries, (SELECT COALESCE(SUM(price), 0) FROM autonomous_contracts WHERE status = 'signed') as mrr`);
    const s = stats.rows[0];
    await sendEmail({ to: process.env.EMAIL_USER, subject: `[OpsBot Daily] MRR $${s.mrr} | ${s.emails_today} emails sent | ${s.new_inquiries} new inquiries`, html: `<h2>OzarkRoost OpsBot — Daily Report</h2><p>Paid listings: ${s.paid_listings}</p><p>Unpaid listings: ${s.unpaid_listings}</p><p>Emails sent today: ${s.emails_today}</p><p>Affiliate applications drafted: ${s.pending_affiliates}</p><p>New inquiries: ${s.new_inquiries}</p><p>MRR: $${s.mrr}</p><p>Dashboard: <a href="${process.env.APP_URL}/api/opsbot/dashboard">${process.env.APP_URL}/api/opsbot/dashboard</a></p>`, text: `OpsBot Daily: MRR $${s.mrr} | Paid listings: ${s.paid_listings} | Emails sent: ${s.emails_today}` });
    console.log('[OpsBot] Daily digest sent.');
  } catch (err) { console.error('[OpsBot] Digest error:', err.message); }
}

async function fetchInboundEmails() {
  if (!Imap || !simpleParser) { console.log('[OpsBot:IMAP] imap/mailparser not installed — skipping email fetch.'); return; }
  if (!process.env.IMAP_USER || !process.env.IMAP_PASSWORD) { console.log('[OpsBot:IMAP] IMAP credentials not set — skipping email fetch.'); return; }
  console.log('[OpsBot:IMAP] Fetching emails from inbox...');
  return new Promise((resolve) => {
    const imap = new Imap({ user: process.env.IMAP_USER, password: process.env.IMAP_PASSWORD, host: process.env.IMAP_HOST || 'imap.gmail.com', port: Number(process.env.IMAP_PORT) || 993, tls: true, tlsOptions: { rejectUnauthorized: false } });
    let emailsFound = 0;
    let emailsAdded = 0;
    const finish = () => { try { imap.end(); } catch (_) {} resolve(); };
    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err) => {
        if (err) { console.error('[OpsBot:IMAP] Open inbox error:', err.message); return finish(); }
        imap.search(['UNSEEN'], (err, results) => {
          if (err) { console.error('[OpsBot:IMAP] Search error:', err.message); return finish(); }
          if (!results || results.length === 0) { console.log('[OpsBot:IMAP] No new emails.'); return finish(); }
          emailsFound = results.length;
          const toFetch = results.slice(-20);
          const f = imap.fetch(toFetch, { bodies: '', markSeen: true });
          f.on('message', (msg) => {
            let raw = '';
            msg.on('body', (stream) => stream.on('data', (chunk) => { raw += chunk.toString('utf8'); }));
            msg.once('end', async () => {
              try {
                const parsed = await simpleParser(raw);
                const sender = parsed.from?.value?.[0]?.address || parsed.from?.text || 'unknown';
                const subject = parsed.subject || '(no subject)';
                const text = parsed.text || '';
                const html = parsed.html || '';
                const messageId = parsed.messageId || '';
                const existing = await pool.query(`SELECT id FROM opsbot_inbound_emails WHERE message_id = $1 LIMIT 1`, [messageId]);
                if (existing.rows.length === 0) {
                  await pool.query(`INSERT INTO opsbot_inbound_emails (sender, subject, body_text, body_html, message_id, status, received_at) VALUES ($1, $2, $3, $4, $5, 'unread', NOW())`, [sender, subject, text, html, messageId]);
                  emailsAdded++;
                  console.log(`[OpsBot:IMAP] Queued: ${subject} from ${sender}`);
                }
              } catch (e) { console.error('[OpsBot:IMAP] Parse error:', e.message); }
            });
          });
          f.once('end', finish);
          f.once('error', (fetchErr) => { console.error('[OpsBot:IMAP] Fetch error:', fetchErr.message); finish(); });
        });
      });
    });
    imap.once('error', (imapErr) => { console.error('[OpsBot:IMAP] Connection error:', imapErr.message); resolve(); });
    imap.once('end', () => console.log(`[OpsBot:IMAP] Done. Found ${emailsFound}, queued ${emailsAdded}.`));
    imap.connect();
    setTimeout(finish, 30_000);
  });
}

function start() {
  if (process.env.OPSBOT_ENABLED !== 'true') { console.log('[OpsBot] Disabled (set OPSBOT_ENABLED=true to activate).'); return; }
  console.log('[OpsBot] Starting autonomous operations superbot...');
  const emailInterval = Number(process.env.OPSBOT_EMAIL_CHECK_INTERVAL) || 5 * 60_000;
  const affiliateInterval = Number(process.env.OPSBOT_AFFILIATE_SCAN_INTERVAL) || 60 * 60_000;
  const outreachInterval = Number(process.env.OPSBOT_OUTREACH_INTERVAL) || 15 * 60_000;
  const paymentInterval = Number(process.env.OPSBOT_PAYMENT_CHECK_INTERVAL) || 10 * 60_000;

  setTimeout(async () => {
    await fetchInboundEmails();
    await runEmailMonitor();
    setInterval(async () => { await fetchInboundEmails(); await runEmailMonitor(); }, emailInterval).unref();
  }, 5_000);
  setTimeout(() => { runAffiliateHunter(); setInterval(runAffiliateHunter, affiliateInterval).unref(); }, 15_000);
  setTimeout(() => { runOutreachOverseer(); setInterval(runOutreachOverseer, outreachInterval).unref(); }, 30_000);
  setTimeout(() => { runPaymentWatchdog(); setInterval(runPaymentWatchdog, paymentInterval).unref(); }, 45_000);
  let lastDigestDate = null;
  setInterval(() => {
    const now = new Date();
    const today = now.toDateString();
    if (now.getHours() === 7 && lastDigestDate !== today) { lastDigestDate = today; sendDailyDigest(); }
  }, 60 * 60_000).unref();
  console.log('[OpsBot] All modules armed and running.');
}

module.exports = { start, fetchInboundEmails, runEmailMonitor, runAffiliateHunter, runOutreachOverseer, runPaymentWatchdog, sendDailyDigest, sendEmail };
