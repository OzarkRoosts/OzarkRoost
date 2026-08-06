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
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { OpenAI } = require('openai');
const pool = require('../db/index');

// ── AI client (Groq free tier) ─────────────────────────────────────────────
const AI = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : undefined,
});
const AI_MODEL = process.env.GROQ_API_KEY
  ? (process.env.GROQ_MODEL || 'llama-3.1-8b-instant')
  : (process.env.OPENAI_MODEL || 'gpt-4o-mini');

// ── Email sender ───────────────────────────────────────────────────────────
const mailer = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function sendEmail({ to, subject, html, text }) {
  if (!process.env.EMAIL_USER) {
    console.warn('[OpsBot] EMAIL_USER not set — skipping send to', to);
    return null;
  }
  try {
    const info = await mailer.sendMail({
      from: `"OzarkRoost OpsBot" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      html: html || `<p>${text}</p>`,
      text,
    });
    await logEmail({ to, subject, status: 'sent', messageId: info.messageId });
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

// ── AI helper ──────────────────────────────────────────────────────────────
async function aiChat(systemPrompt, userPrompt, maxTokens = 400) {
  const resp = await AI.chat.completions.create({
    model: AI_MODEL,
    temperature: 0.35,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });
  return resp.choices[0]?.message?.content?.trim() || '';
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 1 — EMAIL MONITOR
// Reads queued inbound messages, categorises them, auto-responds.
// ═══════════════════════════════════════════════════════════════════════════
async function runEmailMonitor() {
  console.log('[OpsBot:Email] Checking inbox queue...');
  try {
    const { rows } = await pool.query(`
      SELECT * FROM opsbot_inbound_emails
      WHERE status = 'unread'
      ORDER BY received_at ASC
      LIMIT 20
    `);

    if (rows.length === 0) {
      console.log('[OpsBot:Email] No new emails.');
      return;
    }

    for (const email of rows) {
      await processInboundEmail(email);
    }
  } catch (err) {
    console.error('[OpsBot:Email] Monitor error:', err.message);
  }
}

async function processInboundEmail(email) {
  try {
    // Classify the email
    const category = await aiChat(
      `You are an email classifier for OzarkRoost, a cabin and outdoor recreation directory in the Arkansas Ozarks.
Classify the email into exactly one of: payment_confirmation, listing_inquiry, affiliate_application, partnership_inquiry, support_request, spam, other.
Respond with only the category name.`,
      `From: ${email.sender}\nSubject: ${email.subject}\nBody: ${email.body_text?.substring(0, 500)}`
    );

    // Generate a reply
    const reply = await aiChat(
      `You are OpsBot, the autonomous operations assistant for OzarkRoost.
Write a professional, warm, concise reply (3-5 sentences max).
OzarkRoost is an Ozarks cabin & outdoor directory. Listing fee is $49/month.
Affiliate commissions: 8-10%. Always end with a clear next step.`,
      `Email category: ${category}\nFrom: ${email.sender}\nSubject: ${email.subject}\nBody: ${email.body_text?.substring(0, 800)}`
    );

    // Send reply
    await sendEmail({
      to: email.sender,
      subject: `Re: ${email.subject}`,
      html: reply.replace(/\n/g, '<br>'),
      text: reply,
    });

    // Mark as processed
    await pool.query(
      `UPDATE opsbot_inbound_emails SET status = 'processed', category = $1, replied_at = NOW() WHERE id = $2`,
      [category.trim(), email.id]
    );

    // If payment confirmation — flag for payment watchdog
    if (category.trim() === 'payment_confirmation') {
      await pool.query(
        `INSERT INTO opsbot_payment_events (source, reference, amount_text, status, created_at)
         VALUES ('email', $1, $2, 'received', NOW())
         ON CONFLICT DO NOTHING`,
        [email.id, email.subject]
      );
    }

    console.log(`[OpsBot:Email] Processed: ${email.subject} (${category.trim()})`);
  } catch (err) {
    console.error('[OpsBot:Email] Process error:', err.message);
    await pool.query(`UPDATE opsbot_inbound_emails SET status = 'error' WHERE id = $1`, [email.id]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 2 — AFFILIATE HUNTER
// Finds new affiliate programs, drafts applications, logs them.
// ═══════════════════════════════════════════════════════════════════════════

// Known affiliate programs to apply to
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
      // Check if already applied
      const existing = await pool.query(
        `SELECT id, status FROM opsbot_affiliate_applications WHERE program_name = $1`,
        [target.name]
      );

      if (existing.rows.length > 0) {
        console.log(`[OpsBot:Affiliate] Already tracked: ${target.name} (${existing.rows[0].status})`);
        continue;
      }

      // Generate application message
      const appText = await aiChat(
        `You are writing an affiliate program application for OzarkRoost.
OzarkRoost is an Arkansas Ozarks cabin and outdoor recreation directory at ozarkroosts.com.
We have guides, listings, an adventure section, and growing traffic from outdoor/travel enthusiasts.
Write a professional 3-paragraph affiliate application email. Be genuine, mention our niche relevance.`,
        `Affiliate program: ${target.name}\nCategory: ${target.category}\nCommission: ${target.commission}\nApplication URL: ${target.url}`
      );

      // Log the application
      await pool.query(
        `INSERT INTO opsbot_affiliate_applications
         (program_name, category, commission_rate, apply_url, application_text, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'drafted', NOW())`,
        [target.name, target.category, target.commission, target.url, appText]
      );

      // Send application email if we can determine the contact
      // For now log it and notify owner
      console.log(`[OpsBot:Affiliate] Drafted application for ${target.name}`);
    }

    // Notify owner of pending applications
    const pending = await pool.query(
      `SELECT COUNT(*) as cnt FROM opsbot_affiliate_applications WHERE status = 'drafted'`
    );
    const count = parseInt(pending.rows[0]?.cnt || 0);
    if (count > 0) {
      await sendEmail({
        to: process.env.EMAIL_USER,
        subject: `[OpsBot] ${count} affiliate applications ready to submit`,
        html: `<h2>OpsBot Affiliate Report</h2>
<p>${count} affiliate program applications have been drafted and are ready to submit.</p>
<p>Visit <a href="${process.env.APP_URL}/api/opsbot/dashboard">OpsBot Dashboard</a> to review and send them.</p>`,
        text: `${count} affiliate applications drafted. Review at ${process.env.APP_URL}/api/opsbot/dashboard`,
      });
    }
  } catch (err) {
    console.error('[OpsBot:Affiliate] Hunter error:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 3 — OUTREACH OVERSEER
// Manages proactive outreach to cabin owners, partners, and leads.
// ═══════════════════════════════════════════════════════════════════════════
async function runOutreachOverseer() {
  console.log('[OpsBot:Outreach] Running outreach cycle...');
  try {
    // 1. Follow up on unanswered operator inquiries (> 24h old, no follow-up sent)
    const coldInquiries = await pool.query(`
      SELECT id, operator_name, email, property_name, property_type, location
      FROM operator_inquiries
      WHERE submitted_at < NOW() - INTERVAL '24 hours'
      AND id NOT IN (SELECT reference_id FROM opsbot_outreach_log WHERE outreach_type = 'operator_followup')
      LIMIT 10
    `);

    for (const inquiry of coldInquiries.rows) {
      const followup = await aiChat(
        `You are an outreach specialist for OzarkRoost, an Ozarks cabin directory.
Write a short, warm follow-up email (3-4 sentences) to a cabin operator who inquired about listing.
Listing fee is $49/month. Emphasize exposure to Ozarks travelers, easy setup, no long-term contract.
End with a payment link placeholder: [PAYMENT_LINK].`,
        `Name: ${inquiry.operator_name}\nProperty: ${inquiry.property_name}\nType: ${inquiry.property_type}\nLocation: ${inquiry.location}`
      );

      const paymentLink = process.env.STRIPE_PAYMENT_LINK_URL || 'https://ozarkroosts.com/list-your-cabin';
      const emailHtml = followup.replace('[PAYMENT_LINK]', `<a href="${paymentLink}">${paymentLink}</a>`);

      await sendEmail({
        to: inquiry.email,
        subject: `Following up — List ${inquiry.property_name} on OzarkRoost`,
        html: emailHtml,
        text: followup.replace('[PAYMENT_LINK]', paymentLink),
      });

      await pool.query(
        `INSERT INTO opsbot_outreach_log (outreach_type, reference_id, recipient_email, status, sent_at)
         VALUES ('operator_followup', $1, $2, 'sent', NOW())`,
        [inquiry.id, inquiry.email]
      );
      console.log(`[OpsBot:Outreach] Followed up with ${inquiry.operator_name}`);
    }

    // 2. Nurture lead magnet subscribers who haven't received step 2 yet
    const nurturePending = await pool.query(`
      SELECT n.lead_email, l.source
      FROM nurture_email_queue n
      LEFT JOIN lead_magnet_submissions l ON l.email = n.lead_email
      WHERE n.sequence_step = 2
      AND n.status = 'pending'
      AND n.scheduled_at <= NOW()
      LIMIT 20
    `);

    for (const lead of nurturePending.rows) {
      const nurtureEmail = await aiChat(
        `You are writing nurture email #2 for OzarkRoost's email sequence.
The subscriber came from: ${lead.source || 'the website'}.
Write a warm, value-packed email (4-5 sentences) about planning an Ozarks trip.
Include a natural CTA to browse listings at https://ozarkroosts.com/listings.
Subject line should be catchy and under 50 chars. Start with "Subject: " then the body.`,
        'Write the full email now.'
      );

      const lines = nurtureEmail.split('\n');
      const subjectLine = lines[0].replace(/^subject:\s*/i, '').trim();
      const body = lines.slice(1).join('\n').trim();

      await sendEmail({
        to: lead.lead_email,
        subject: subjectLine || 'Your Ozarks trip is waiting',
        html: body.replace(/\n/g, '<br>'),
        text: body,
      });

      await pool.query(
        `UPDATE nurture_email_queue SET status = 'sent', sent_at = NOW()
         WHERE lead_email = $1 AND sequence_step = 2`,
        [lead.lead_email]
      );
    }

    // 3. Referral partner outreach — people who submitted referral forms but haven't been contacted
    const newReferrals = await pool.query(`
      SELECT r.id, r.name, r.email, r.website, r.promotion_method
      FROM referral_submissions r
      WHERE r.submitted_at > NOW() - INTERVAL '48 hours'
      AND r.id NOT IN (SELECT reference_id FROM opsbot_outreach_log WHERE outreach_type = 'referral_welcome')
      LIMIT 10
    `);

    for (const ref of newReferrals.rows) {
      const welcomeMsg = await aiChat(
        `Write a warm welcome email to a new OzarkRoost affiliate/referral partner.
OzarkRoost pays 10% commission on every paid listing they refer ($49/month = $4.90 per referral per month).
Explain how to get their referral link and what to do next.
Keep it to 4-5 sentences. End with next steps.`,
        `Partner name: ${ref.name}\nPromotion method: ${ref.promotion_method || 'unknown'}\nWebsite: ${ref.website || 'none'}`
      );

      await sendEmail({
        to: ref.email,
        subject: 'Welcome to the OzarkRoost Partner Program!',
        html: welcomeMsg.replace(/\n/g, '<br>'),
        text: welcomeMsg,
      });

      await pool.query(
        `INSERT INTO opsbot_outreach_log (outreach_type, reference_id, recipient_email, status, sent_at)
         VALUES ('referral_welcome', $1, $2, 'sent', NOW())`,
        [ref.id, ref.email]
      );
    }

    console.log('[OpsBot:Outreach] Cycle complete.');
  } catch (err) {
    console.error('[OpsBot:Outreach] Overseer error:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 4 — PAYMENT WATCHDOG
// Checks every payment touchpoint — Stripe, overdue invoices, unpaid listings.
// ═══════════════════════════════════════════════════════════════════════════
async function runPaymentWatchdog() {
  console.log('[OpsBot:Payments] Running payment watchdog...');
  try {
    // 1. Listings submitted > 48h ago but still unpaid — send payment reminder
    const unpaidListings = await pool.query(`
      SELECT id, owner_name, owner_email, property_name, payment_link_url, created_at
      FROM listing_submissions
      WHERE payment_status = 'unpaid'
      AND created_at < NOW() - INTERVAL '48 hours'
      AND id NOT IN (SELECT reference_id FROM opsbot_outreach_log WHERE outreach_type = 'payment_reminder')
      LIMIT 20
    `);

    for (const listing of unpaidListings.rows) {
      const payLink = listing.payment_link_url || process.env.STRIPE_PAYMENT_LINK_URL || 'https://ozarkroosts.com/list-your-cabin';
      const msg = await aiChat(
        `Write a short, friendly payment reminder email for OzarkRoost.
The cabin owner submitted their listing but hasn't paid yet ($49/month to go live).
Keep it to 3-4 sentences. Include the payment link placeholder [PAYMENT_LINK]. No pressure, just helpful.`,
        `Owner: ${listing.owner_name}\nProperty: ${listing.property_name}\nSubmitted: ${listing.created_at}`
      );

      const emailHtml = msg.replace('[PAYMENT_LINK]', `<a href="${payLink}">Complete your listing payment</a>`);

      await sendEmail({
        to: listing.owner_email,
        subject: `Your listing "${listing.property_name}" is almost live — one step left`,
        html: emailHtml,
        text: msg.replace('[PAYMENT_LINK]', payLink),
      });

      await pool.query(
        `INSERT INTO opsbot_outreach_log (outreach_type, reference_id, recipient_email, status, sent_at)
         VALUES ('payment_reminder', $1, $2, 'sent', NOW())`,
        [listing.id, listing.owner_email]
      );
      console.log(`[OpsBot:Payments] Payment reminder sent to ${listing.owner_name}`);
    }

    // 2. Log revenue snapshot
    const revenue = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM listing_submissions WHERE payment_status = 'paid') as paid_listings,
        (SELECT COUNT(*) FROM listing_submissions WHERE payment_status = 'unpaid') as unpaid_listings,
        (SELECT COUNT(*) FROM autonomous_contracts WHERE status = 'signed') as signed_contracts,
        (SELECT COALESCE(SUM(price), 0) FROM autonomous_contracts WHERE status = 'signed') as mrr
    `);

    const snap = revenue.rows[0];
    await pool.query(
      `INSERT INTO opsbot_revenue_snapshots (paid_listings, unpaid_listings, signed_contracts, mrr, snapshot_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [snap.paid_listings, snap.unpaid_listings, snap.signed_contracts, snap.mrr]
    );

    console.log(`[OpsBot:Payments] Snapshot: ${snap.paid_listings} paid listings, MRR $${snap.mrr}`);
  } catch (err) {
    console.error('[OpsBot:Payments] Watchdog error:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DAILY DIGEST — sends owner a full daily report
// ═══════════════════════════════════════════════════════════════════════════
async function sendDailyDigest() {
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM listing_submissions WHERE payment_status = 'paid') as paid_listings,
        (SELECT COUNT(*) FROM listing_submissions WHERE payment_status = 'unpaid') as unpaid_listings,
        (SELECT COUNT(*) FROM opsbot_email_log WHERE status = 'sent' AND sent_at > NOW() - INTERVAL '24 hours') as emails_today,
        (SELECT COUNT(*) FROM opsbot_affiliate_applications WHERE status = 'drafted') as pending_affiliates,
        (SELECT COUNT(*) FROM operator_inquiries WHERE submitted_at > NOW() - INTERVAL '24 hours') as new_inquiries,
        (SELECT COALESCE(SUM(price), 0) FROM autonomous_contracts WHERE status = 'signed') as mrr
    `);

    const s = stats.rows[0];

    await sendEmail({
      to: process.env.EMAIL_USER,
      subject: `[OpsBot Daily] MRR $${s.mrr} | ${s.emails_today} emails sent | ${s.new_inquiries} new inquiries`,
      html: `
<h2>OzarkRoost OpsBot — Daily Report</h2>
<table style="border-collapse:collapse;width:100%;max-width:500px">
  <tr><td style="padding:8px;border:1px solid #ddd"><strong>Paid Listings</strong></td><td style="padding:8px;border:1px solid #ddd">${s.paid_listings}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd"><strong>Unpaid (pending)</strong></td><td style="padding:8px;border:1px solid #ddd">${s.unpaid_listings}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd"><strong>Emails Sent Today</strong></td><td style="padding:8px;border:1px solid #ddd">${s.emails_today}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd"><strong>Affiliate Apps Drafted</strong></td><td style="padding:8px;border:1px solid #ddd">${s.pending_affiliates}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd"><strong>New Operator Inquiries</strong></td><td style="padding:8px;border:1px solid #ddd">${s.new_inquiries}</td></tr>
  <tr style="background:#e8f5e9"><td style="padding:8px;border:1px solid #ddd"><strong>Monthly Recurring Revenue</strong></td><td style="padding:8px;border:1px solid #ddd"><strong>$${s.mrr}</strong></td></tr>
</table>
<p style="margin-top:16px">Dashboard: <a href="${process.env.APP_URL}/api/opsbot/dashboard">${process.env.APP_URL}/api/opsbot/dashboard</a></p>
      `,
      text: `OpsBot Daily: MRR $${s.mrr} | Paid listings: ${s.paid_listings} | Emails sent: ${s.emails_today}`,
    });

    console.log('[OpsBot] Daily digest sent.');
  } catch (err) {
    console.error('[OpsBot] Digest error:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 0 — IMAP EMAIL FETCHER
// Pulls emails from Gmail inbox into the database queue.
// ═══════════════════════════════════════════════════════════════════════════
async function fetchInboundEmails() {
  if (!process.env.IMAP_USER || !process.env.IMAP_PASSWORD) {
    console.log('[OpsBot:IMAP] IMAP credentials not set — skipping email fetch.');
    return;
  }

  console.log('[OpsBot:IMAP] Fetching emails from inbox...');

  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: process.env.IMAP_USER,
      password: process.env.IMAP_PASSWORD,
      host: process.env.IMAP_HOST || 'imap.gmail.com',
      port: Number(process.env.IMAP_PORT) || 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    let emailsFound = 0;
    let emailsAdded = 0;

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err) => {
        if (err) {
          console.error('[OpsBot:IMAP] Open inbox error:', err.message);
          imap.end();
          return resolve();
        }

        // Search for unseen (unread) emails
        imap.search(['UNSEEN'], (err, results) => {
          if (err) {
            console.error('[OpsBot:IMAP] Search error:', err.message);
            imap.end();
            return resolve();
          }

          if (!results || results.length === 0) {
            console.log('[OpsBot:IMAP] No new emails.');
            imap.end();
            return resolve();
          }

          emailsFound = results.length;
          // Only fetch last 20 to avoid overload
          const toFetch = results.slice(-20);
          const f = imap.fetch(toFetch, { bodies: '' });

          f.on('message', (msg) => {
            let raw = '';
            msg.on('body', (stream) => {
              stream.on('data', (chunk) => { raw += chunk.toString('utf8'); });
            });
            msg.once('end', async () => {
              try {
                const parsed = await simpleParser(raw);
                const sender = parsed.from?.text || parsed.from?.value?.[0]?.address || 'unknown';
                const subject = parsed.subject || '(no subject)';
                const text = parsed.text || '';
                const html = parsed.html || '';

                // Check if we already have this email (by subject+sender+date)
                const existing = await pool.query(
                  `SELECT id FROM opsbot_inbound_emails 
                   WHERE sender = $1 AND subject = $2 AND received_at > NOW() - INTERVAL '1 hour'
                   LIMIT 1`,
                  [sender, subject]
                );

                if (existing.rows.length === 0) {
                  await pool.query(
                    `INSERT INTO opsbot_inbound_emails (sender, subject, body_text, body_html, status, received_at)
                     VALUES ($1, $2, $3, $4, 'unread', NOW())`,
                    [sender, subject, text, html]
                  );
                  emailsAdded++;
                  console.log(`[OpsBot:IMAP] Queued: ${subject} from ${sender}`);
                }
              } catch (e) {
                console.error('[OpsBot:IMAP] Parse error:', e.message);
              }
            });
          });

          f.once('end', () => {
            imap.end();
          });
          f.once('error', (fetchErr) => {
            console.error('[OpsBot:IMAP] Fetch error:', fetchErr.message);
            imap.end();
          });
        });
      });
    });

    imap.once('error', (imapErr) => {
      console.error('[OpsBot:IMAP] Connection error:', imapErr.message);
      resolve();
    });

    imap.once('end', () => {
      console.log(`[OpsBot:IMAP] Done. Found ${emailsFound}, queued ${emailsAdded}.`);
      resolve();
    });

    imap.connect();

    // Timeout after 30 seconds
    setTimeout(() => {
      try { imap.end(); } catch (_) {}
      resolve();
    }, 30_000);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// START — wires all modules onto intervals
// ═══════════════════════════════════════════════════════════════════════════
function start() {
  if (process.env.OPSBOT_ENABLED !== 'true') {
    console.log('[OpsBot] Disabled (set OPSBOT_ENABLED=true to activate).');
    return;
  }

  console.log('[OpsBot] Starting autonomous operations superbot...');

  const emailInterval    = Number(process.env.OPSBOT_EMAIL_CHECK_INTERVAL)    || 5 * 60_000;   // 5 min
  const affiliateInterval = Number(process.env.OPSBOT_AFFILIATE_SCAN_INTERVAL) || 60 * 60_000; // 1 hr
  const outreachInterval  = Number(process.env.OPSBOT_OUTREACH_INTERVAL)       || 15 * 60_000; // 15 min
  const paymentInterval   = Number(process.env.OPSBOT_PAYMENT_CHECK_INTERVAL)  || 10 * 60_000; // 10 min

  // Stagger starts to avoid hammering DB at once
  // IMAP fetch runs first, then email monitor processes the queue
  setTimeout(async () => {
    await fetchInboundEmails();
    await runEmailMonitor();
    // Then repeat on interval
    setInterval(async () => {
      await fetchInboundEmails();
      await runEmailMonitor();
    }, emailInterval).unref();
  }, 5_000);

  setTimeout(() => {
    runAffiliateHunter();
    setInterval(runAffiliateHunter, affiliateInterval).unref();
  }, 15_000);

  setTimeout(() => {
    runOutreachOverseer();
    setInterval(runOutreachOverseer, outreachInterval).unref();
  }, 30_000);

  setTimeout(() => {
    runPaymentWatchdog();
    setInterval(runPaymentWatchdog, paymentInterval).unref();
  }, 45_000);

  // Daily digest at 7 AM (check every hour, send once)
  let lastDigestDate = null;
  setInterval(() => {
    const now = new Date();
    const today = now.toDateString();
    if (now.getHours() === 7 && lastDigestDate !== today) {
      lastDigestDate = today;
      sendDailyDigest();
    }
  }, 60 * 60_000).unref();

  console.log('[OpsBot] All modules armed and running.');
}

module.exports = {
  start,
  fetchInboundEmails,
  runEmailMonitor,
  runAffiliateHunter,
  runOutreachOverseer,
  runPaymentWatchdog,
  sendDailyDigest,
  sendEmail,
};
