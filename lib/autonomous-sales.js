const nodemailer = require('nodemailer');
const { OpenAI } = require('openai');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../db/index');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function createEmailTransporter() {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = Number(process.env.EMAIL_PORT) || 587;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error('EMAIL_USER and EMAIL_PASSWORD must be configured before autonomous email can send.');
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

async function sendEmailAutonomously({ to, subject, body, attachments = [], trackingId }) {
  if (!to || !subject) throw new Error('Recipient and subject are required.');
  try {
    const emailTransporter = createEmailTransporter();
    const info = await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html: body,
      attachments,
      headers: {
        'X-Campaign-ID': String(trackingId || ''),
        'X-Auto-Response': 'true',
      },
    });

    await pool.query(
      `INSERT INTO autonomous_email_log (email_id, recipient, subject, status, message_id, sent_at)
       VALUES ($1, $2, $3, 'sent', $4, NOW())`,
      [trackingId || `email-${Date.now()}`, to, subject, info.messageId]
    );

    console.log(`[Autonomous] Email sent to ${to}: ${subject}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[autonomous-send] error:', err?.message);
    try {
      await pool.query(
        `INSERT INTO autonomous_email_log (email_id, recipient, subject, status, error_message)
         VALUES ($1, $2, $3, 'failed', $4)`,
        [trackingId || `email-${Date.now()}`, to, subject, err?.message]
      );
    } catch (_) {}
    throw err;
  }
}

async function monitorAndRespond() {
  try {
    console.log('[Autonomous] Checking for new replies...');
    const result = await pool.query(`
      SELECT id, prospect_email, prospect_name, company, last_email_subject
      FROM autonomous_conversations
      WHERE status = 'awaiting_response'
        AND last_message_received_at > NOW() - INTERVAL '24 hours'
        AND response_sent = FALSE
      LIMIT 10
    `);
    for (const conversation of result.rows) await generateAndSendResponse(conversation);
  } catch (err) {
    console.error('[autonomous-monitor] error:', err?.message);
  }
}

async function generateAndSendResponse({ id, prospect_email, prospect_name, company, last_email_subject }) {
  try {
    const inbound = await pool.query(`
      SELECT body_text
      FROM opsbot_inbound_emails
      WHERE LOWER(sender) LIKE LOWER($1)
      ORDER BY received_at DESC
      LIMIT 1
    `, [`%${prospect_email}%`]);
    const latestMessage = inbound.rows[0]?.body_text || '(No inbound message body was captured.)';

    const systemPrompt = `You are a professional sales representative responding to a prospect's email.
Your goal is to move the sale forward. Be brief, professional, warm, specific to the prospect's actual message, and end with a clear CTA.`;
    const userPrompt = `Prospect: ${prospect_name} at ${company}
Subject: ${last_email_subject}
Actual inbound message:
${latestMessage.substring(0, 4000)}

Write the reply. Do not invent questions, objections, promises, pricing, or facts that are not supported by the message or known OzarkRoost configuration.`;

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      max_tokens: 300,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    });
    const responseBody = response.choices[0]?.message?.content?.trim() || '';
    if (!responseBody) throw new Error('AI returned an empty reply.');

    await sendEmailAutonomously({
      to: prospect_email,
      subject: `Re: ${last_email_subject}`,
      body: responseBody.replace(/\n/g, '<br>'),
      trackingId: id,
    });

    await pool.query(`UPDATE autonomous_conversations SET response_sent = TRUE, responded_at = NOW() WHERE id = $1`, [id]);
    console.log(`[Autonomous] Responded to ${prospect_name} at ${company}`);
  } catch (err) {
    console.error('[autonomous-response] error:', err?.message);
  }
}

async function generateContract({ prospect_name, company, service_description, price, terms }) {
  return `
    <h2>Contract for Services</h2>
    <p><strong>Client:</strong> ${prospect_name}, ${company}</p>
    <p><strong>Services:</strong> ${service_description}</p>
    <p><strong>Pricing:</strong> $${price}/month</p>
    <p><strong>Terms:</strong> ${terms}</p>
    <p>To accept, reply that you accept these terms and authorize the agreed recurring charge.</p>
    <p><strong>Signature:</strong> ___________________ &nbsp; <strong>Date:</strong> ___________________</p>
  `;
}

async function sendContract({ prospect_email, prospect_name, company, service, price, terms, trackingId }) {
  const contract = await generateContract({ prospect_name, company, service_description: service, price, terms });
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    max_tokens: 500,
    messages: [
      { role: 'system', content: 'Write a concise, professional contract-cover email. Do not invent terms.' },
      { role: 'user', content: `Client: ${prospect_name} at ${company}\nService: ${service}\nPrice: $${price}/month\nTerms: ${terms}` },
    ],
  });
  const emailBody = response.choices[0]?.message?.content?.trim() || 'Please review the contract below and reply if you agree to the stated terms.';
  await sendEmailAutonomously({
    to: prospect_email,
    subject: `Contract: ${service} - $${price}/month`,
    body: `${emailBody.replace(/\n/g, '<br>')}<hr>${contract}`,
    trackingId,
  });
  await pool.query(
    `INSERT INTO autonomous_contracts (prospect_email, prospect_name, company, price, status, sent_at)
     VALUES ($1, $2, $3, $4, 'sent', NOW())`,
    [prospect_email, prospect_name, company, price]
  );
  return { success: true, message: 'Contract sent' };
}

async function processContractAcceptance({ prospect_email, prospect_name, price, contract_terms }) {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured.');
  let customer = await pool.query(`SELECT stripe_customer_id FROM autonomous_contracts WHERE prospect_email = $1 ORDER BY sent_at DESC LIMIT 1`, [prospect_email]);
  let customerId = customer.rows[0]?.stripe_customer_id;

  if (!customerId) {
    const stripeCustomer = await stripe.customers.create({ email: prospect_email, name: prospect_name, metadata: { prospect_email, prospect_name } });
    customerId = stripeCustomer.id;
  }

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price_data: { currency: 'usd', product_data: { name: 'Professional Services', description: contract_terms }, unit_amount: Math.round(price * 100), recurring: { interval: 'month', interval_count: 1 } } }],
    off_session: true,
  });

  await pool.query(
    `UPDATE autonomous_contracts SET status = 'signed', stripe_subscription_id = $1, signed_at = NOW(), customer_id = $2 WHERE prospect_email = $3 AND status = 'sent'`,
    [subscription.id, customerId, prospect_email]
  );

  await sendEmailAutonomously({
    to: prospect_email,
    subject: 'Welcome! Your service is now active',
    body: `<h2>Welcome, ${prospect_name}!</h2><p>Your service is now active.</p><p><strong>Monthly charge: $${price}</strong></p><p>Questions? Reply to this email.</p>`,
    trackingId: `activation-${customerId}`,
  });

  console.log(`[Autonomous] Subscription created for ${prospect_name} - $${price}/month`);
  return { success: true, subscriptionId: subscription.id, customerId, message: `Subscription created for $${price}/month` };
}

function detectContractAcceptance(emailBody) {
  const lowerBody = String(emailBody || '').toLowerCase();
  const strongAcceptance = [
    /i\s+(?:accept|agree)\s+(?:to|with)\s+(?:these|the)\s+terms/,
    /i\s+authorize\s+(?:the|this|a)\s+(?:charge|payment)/,
    /i\s+accept.*authorize.*charge/,
  ];
  return strongAcceptance.some((pattern) => pattern.test(lowerBody));
}

async function checkForContractAcceptances() {
  const pending = await pool.query(`
    SELECT id, prospect_email, prospect_name, price, contract_terms, sent_at
    FROM autonomous_contracts
    WHERE status = 'sent'
      AND sent_at > NOW() - INTERVAL '30 days'
    ORDER BY sent_at ASC
  `);

  for (const contract of pending.rows) {
    const replies = await pool.query(`
      SELECT id, body_text, received_at
      FROM opsbot_inbound_emails
      WHERE LOWER(sender) LIKE LOWER($1)
        AND received_at >= $2
        AND received_at <= NOW()
      ORDER BY received_at DESC
      LIMIT 10
    `, [`%${contract.prospect_email}%`, contract.sent_at]);

    const acceptance = replies.rows.find((reply) => detectContractAcceptance(reply.body_text));
    if (!acceptance) continue;

    console.log(`[Autonomous] Explicit contract acceptance detected from ${contract.prospect_email}`);
    await processContractAcceptance({
      prospect_email: contract.prospect_email,
      prospect_name: contract.prospect_name,
      price: contract.price,
      contract_terms: contract.contract_terms || 'As stated in the signed contract.',
    });
  }
}

async function sendInvoice({ prospect_email, prospect_name, amount, description, dueDate }) {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured.');
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price_data: { currency: 'usd', product_data: { name: description }, unit_amount: Math.round(amount * 100) }, quantity: 1 }],
    after_completion: { type: 'redirect', redirect: { url: `${process.env.APP_URL}/success?email=${encodeURIComponent(prospect_email)}` } },
  });

  await sendEmailAutonomously({
    to: prospect_email,
    subject: `Invoice: ${description} - $${amount}`,
    body: `<h2>Invoice</h2><p>Hi ${prospect_name},</p><p><strong>Amount Due:</strong> $${amount}</p><p><strong>Description:</strong> ${description}</p><p><strong>Due Date:</strong> ${dueDate}</p><p><a href="${paymentLink.url}">Pay Now</a></p>`,
    trackingId: `invoice-${Date.now()}`,
  });
  return { success: true, paymentLink: paymentLink.url };
}

async function autonomousWorkflow() {
  try {
    console.log('[Autonomous] Running full sales workflow...');
    await monitorAndRespond();
    await checkForContractAcceptances();

    const dueSoon = await pool.query(`
      SELECT stripe_subscription_id, prospect_email, prospect_name, price
      FROM autonomous_contracts
      WHERE status = 'signed'
        AND next_invoice_date IS NOT NULL
        AND next_invoice_date <= NOW() + INTERVAL '3 days'
        AND NOT EXISTS (
          SELECT 1 FROM autonomous_email_log e
          WHERE e.recipient = autonomous_contracts.prospect_email
            AND e.subject LIKE 'Invoice:%'
            AND e.sent_at > NOW() - INTERVAL '24 hours'
            AND e.status = 'sent'
        )
    `);

    for (const invoice of dueSoon.rows) {
      await sendInvoice({
        prospect_email: invoice.prospect_email,
        prospect_name: invoice.prospect_name,
        amount: invoice.price,
        description: 'Monthly Service Fee',
        dueDate: new Date().toISOString().split('T')[0],
      });
    }
    console.log('[Autonomous] Workflow complete');
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
  console.log('[Autonomous Sales] Starting autonomous engine...');
  const run = () => autonomousWorkflow().catch((err) => console.error('[autonomous-workflow] fatal:', err?.message));
  run();
  const timer = setInterval(run, 5 * 60 * 1000);
  if (timer.unref) timer.unref();
}

module.exports = {
  sendEmailAutonomously,
  monitorAndRespond,
  generateAndSendResponse,
  sendContract,
  processContractAcceptance,
  detectContractAcceptance,
  checkForContractAcceptances,
  sendInvoice,
  autonomousWorkflow,
  getAutonomousReport,
  startAutonomous,
};
