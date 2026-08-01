const nodemailer = require('nodemailer');

if (!process.env.EMAIL_HOST) {
  console.warn('[email-transport] EMAIL_HOST not set — email transport disabled.');
}

const transporter = process.env.EMAIL_HOST
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: (Number(process.env.EMAIL_PORT) || 587) === 465,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS },
    })
  : null;

module.exports = transporter;
