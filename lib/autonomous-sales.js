/**
 * Autonomous sales engine.
 * Safe mode: email/outreach automation is allowed; billing always requires
 * an explicit customer payment action. No simulated acceptance and no
 * off-session card charging.
 */

const { OpenAI } = require('openai');
const stripeLib = require('stripe');
const pool = require('../db/index');
const { sendOutboundEmail } = require('./email-sender');

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : undefined,
});
const AI_MODEL = process.env.GROQ_API_KEY
  ? (process.env.GROQ_MODEL || 'llama-3.1-8b-instant')
  : (process.env.OPENAI_MODEL || 'gpt-4o-mini');
const stripe = process.env.STRIPE_SECRET_KEY ? stripeLib(process.env.STRIPE_SECRET_KEY) : null;

async function sendEmailAutonomously({ to, subject, body, attachments = [], trackingId }) {
  const from = process.env.MAILTRAP_FROM_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER;
  if (!from) throw new Error('No outbound sender configured');
  try {
    const info = await sendOutboundEmail({
      from: `OzarkRoost <${from}>`,
      to,
      subject,
      html: body,
      text: String(body || '').replace(/<[^>]+>/g, ' '),
    });
    await pool.query(
      `INSERT INTO autonomous_email_log (email_id, recipient, subject, status, message_id, sent_at)
       VALUES ($1, $2, $3, 'sent', $4, NOW())`,
      [trackingId || `auto-${Date.now()}`, to, subject, info?.messageId || info?.message_id || null]
    );
    return { success: true, messageId: info?.messageId || info?.message_id || null };
  } catch (err) {
    try {
      await pool.query(
        `INSERT INTO autonomous_email_log (email_id, recipient, status, error_message)
         VALUES ($1, $2, 'failed', $3)`,
        [trackingId || `auto-${Date.now()}`, to, err?.message || 'email send failed']
      );
    } catch (_) {}
    throw err;
  }
}

async function aiReply({ prospect_name, company, subject }) {
  const response = await client.chat.completions.create({
    model: AI_MODEL,
    max_tokens: 300,
    temperature: 0.35,
    messages: [
      { role: 'system', content: 'You are a concise, professional sales representative for OzarkRoost, an Arkansas Ozarks cabin and outdoor directory. Move interested prospects toward a $49/month listing. Never claim a payment was made unless Stripe confirms it. Always give one clear next step.' },
      { role: 'user', content: `Prospect: ${prospect_name || 'there'} at ${company || 'their business'}\nSubject: ${subject || 'OzarkRoost listing'}\nWrite a 2-4 sentence reply that moves the conversation toward the listing payment link.` },
    ],
  });
  return response.choices[0]?.message?.content?.trim() || '';
}

async function monitorAndRespond() {
  const { rows } = await pool.query(`
    SELECT id, prospect_email, prospect_name, company, last_email_subject
    FROM autonomous_conversations
    WHERE status = 'awaiting_response'
      AND last_message_received_at > NOW() - INTERVAL '24 hours'
      AND response_sent = FALSE
    ORDER BY last_message_received_at ASC
    LIMIT 10
  `);
  for (const conversation of rows) await generateAndSendResponse(conversation);
}

async function generateAndSendResponse(conversation) {
  const body = await aiReply(conversation);
  if (!body) return;
  await sendEmailAutonomously({
    to: conversation.prospect_email,
    subject: `Re: ${conversation.last_email_subject || 'OzarkRoost listing'}`,
    body: body.replace(/\n/g, '<br>'),
    trackingId: conversation.id,
  });
  await pool.query(`UPDATE autonomous_conversations SET response_sent = TRUE, responded_at = NOW() WHERE id = $1`, [conversation.id]);
  console.log(`[Autonomous] Responded to ${conversation.prospect_name || conversation.prospect_email}`);
}

async function generateContract({ prospect_name, company, service_description, price, terms }) {
  return `
    <h2>OzarkRoost Listing Agreement</h2>
    <p><strong>Client:</strong> ${prospect_name}, ${company || ''}</p>
    <p><strong>Service:</strong> ${service_description}</p>
    <p><strong>Price:</strong> $${price}/month</p>
    <p><strong>Terms:</strong> ${terms}</p>
    <p>To continue, use the explicit Stripe payment link provided by OzarkRoost. No card is charged by email acceptance alone.</p>
  `;
}

async function sendContract({ prospect_email, prospect_name, company, service, price, terms, trackingId }) {
  const contract = await generateContract({ prospect_name, company, service_description: service, price, terms });
  await sendEmailAutonomously({
    to: prospect_email,
    subject: `OzarkRoost listing agreement — $${price}/month`,
    body: contract,
    trackingId,
  });
  await pool.query(
    `INSERT INTO autonomous_contracts (prospect_email, prospect_name, company, price, status, sent_at)
     VALUES ($1, $2, $3, $4, 'sent', NOW())`,
    [prospect_email, prospect_name, company || '', price]
  );
  return { success: true, message: 'Contract sent' };
}

/**
 * Kept for API compatibility. This function never charges a card. It creates
 * the same explicit Stripe payment request used by the public acceptance route.
 */
async function processContractAcceptance(args) {
  return sendInvoice({
    prospect_email: args.prospect_email,
    prospect_name: args.prospect_name || 'Customer',
    amount: args.price,
    description: args.contract_terms || 'OzarkRoost listing',
    dueDate: new Date().toISOString().split('T')[0],
  });
}

function detectContractAcceptance(emailBody) {
  const text = String(emailBody || '').toLowerCase();
  return /\bi\s+(?:accept|agree)\b.*\b(?:terms|agreement)\b/.test(text)
    || /\bi\s+authorize\b.*\b(?:payment|charge)\b/.test(text);
}

async function sendInvoice({ prospect_email, prospect_name, amount, description, dueDate }) {
  if (!stripe) throw new Error('STRIPE_SECRET_KEY is not configured');
  const safeAmount = Number(amount);
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) throw new Error('A positive payment amount is required');
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: description || 'OzarkRoost listing' },
        unit_amount: Math.round(safeAmount * 100),
      },
      quantity: 1,
    }],
    after_completion: {
      type: 'redirect',
      redirect: { url: `${process.env.APP_URL || 'https://ozartkroost.onrender.com'}/success` },
    },
  });
  await sendEmailAutonomously({
    to: prospect_email,
    subject: `OzarkRoost payment link — $${safeAmount}`,
    body: `<h2>Complete your OzarkRoost listing</h2><p>Hi ${prospect_name || 'there'},</p><p>Amount: <strong>$${safeAmount}</strong></p><p><a href="${paymentLink.url}">Complete payment securely with Stripe</a></p><p>No card is charged until you complete the Stripe checkout.</p>`,
    trackingId: `payment-link-${Date.now()}`,
  });
  return { success: true, paymentLink: paymentLink.url };
}

async function autonomousWorkflow() {
  console.log('[Autonomous] Running safe sales workflow...');
  try {
    await monitorAndRespond();
    console.log('[Autonomous] Billing automation disabled; customer payment action required.');
  } catch (err) {
    console.error('[autonomous-workflow] error:', err?.message);
  }
}

async function getAutonomousReport() {
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM autonomous_email_log WHERE status = 'sent') as emails_sent,
        (SELECT COUNT(*) FROM autonomous_conversations WHERE response_sent = TRUE) as responses_sent,
        (SELECT COUNT(*) FROM autonomous_contracts WHERE status = 'signed') as contracts_signed,
        (SELECT COALESCE(SUM(price), 0) FROM autonomous_contracts WHERE status = 'signed') as monthly_revenue,
        (SELECT COALESCE(SUM(price), 0) * 12 FROM autonomous_contracts WHERE status = 'signed') as annual_run_rate
    `);
    return stats.rows[0];
  } catch (err) {
    console.error('[autonomous-report] error:', err?.message);
    return {};
  }
}

function startAutonomous() {
  console.log('[Autonomous Sales] Starting safe autonomous engine...');
  autonomousWorkflow();
  setInterval(autonomousWorkflow, 5 * 60 * 1000);
}

module.exports = {
  sendEmailAutonomously,
  monitorAndRespond,
  generateAndSendResponse,
  generateContract,
  sendContract,
  processContractAcceptance,
  detectContractAcceptance,
  sendInvoice,
  autonomousWorkflow,
  getAutonomousReport,
  startAutonomous,
};
