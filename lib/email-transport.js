const nodemailer = require('nodemailer');

if (!process.env.SMTP_HOST) {
  console.warn('[email-transport] SMTP_HOST not set — email transport disabled.');
}

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: (Number(process.env.SMTP_PORT) || 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

module.exports = transporter;
