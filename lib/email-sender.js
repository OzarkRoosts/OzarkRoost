const nodemailer = require('nodemailer');
const mailtrap = require('./mailtrap');

function smtpTransport() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT || process.env.SMTP_PORT) || 587,
    secure: String(process.env.EMAIL_SECURE || '').toLowerCase() === 'true',
    auth: {
      user: process.env.EMAIL_USER || process.env.SMTP_USER,
      pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS,
    },
  });
}

async function sendOutboundEmail({ to, subject, html, text, from, transport }) {
  const sender = from || process.env.MAILTRAP_FROM_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER;
  if (!sender) throw new Error('MAILTRAP_FROM_EMAIL (or EMAIL_FROM/EMAIL_USER) is not configured');

  if (mailtrap.isConfigured()) {
    const result = transport
      ? await transport({
          from: typeof sender === 'string' ? { email: sender, name: process.env.MAILTRAP_FROM_NAME || 'OzarkRoost' } : sender,
          to: (Array.isArray(to) ? to : [to]).flatMap((recipient) =>
            typeof recipient === 'string'
              ? recipient.split(',').map((email) => ({ email: email.trim() }))
              : [recipient]
          ).filter((recipient) => recipient?.email),
          subject,
          html: html || undefined,
          text: text || undefined,
        })
      : await mailtrap.sendMail({ from: sender, to, subject, html, text });
    return result;
  }

  if (!process.env.EMAIL_USER && !process.env.SMTP_USER) {
    throw new Error('MAILTRAP_TOKEN is not configured and SMTP credentials are not configured');
  }

  const smtp = transport || smtpTransport();
  return smtp.sendMail({
    from: sender,
    to,
    subject,
    html: html || `<p>${text || ''}</p>`,
    text,
  });
}

module.exports = { sendOutboundEmail, smtpTransport };
