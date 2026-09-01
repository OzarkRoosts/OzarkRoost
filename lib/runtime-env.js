// Normalize deployment environment variable names before ANY bot modules load.
// Render secrets may use SMTP_*, while OpsBot historically uses EMAIL_*.
// Support common Gmail/SMTP aliases and Mailtrap's API sender so one naming
// mismatch cannot silently disable outbound mail.
const aliases = {
  EMAIL_USER: ['SMTP_USER', 'GMAIL_USER', 'EMAIL_USERNAME'],
  EMAIL_PASSWORD: ['SMTP_PASS', 'SMTP_PASSWORD', 'GMAIL_APP_PASSWORD', 'EMAIL_PASS'],
  EMAIL_HOST: ['SMTP_HOST', 'MAIL_HOST'],
  EMAIL_PORT: ['SMTP_PORT', 'MAIL_PORT'],
  IMAP_USER: ['SMTP_USER', 'GMAIL_USER', 'EMAIL_USER'],
  IMAP_PASSWORD: ['SMTP_PASS', 'SMTP_PASSWORD', 'GMAIL_APP_PASSWORD', 'EMAIL_PASSWORD'],
};

for (const [target, sources] of Object.entries(aliases)) {
  if (process.env[target]) continue;
  const source = sources.find((name) => process.env[name]);
  if (source) process.env[target] = process.env[source];
}

const mailtrapToken = process.env.MAILTRAP_TOKEN || process.env.MAILTRAP_API_KEY;
const mailtrapFrom = process.env.MAILTRAP_FROM_EMAIL || process.env.EMAIL_FROM;
const mailtrapReady = Boolean(mailtrapToken && mailtrapFrom);

// OpsBot historically uses EMAIL_USER as both its owner address and sender.
// When Mailtrap is the active transport, use its verified sender for that role
// too, so OpsBot does not stop before the Mailtrap Nodemailer shim can send.
if (!process.env.EMAIL_USER && mailtrapReady) process.env.EMAIL_USER = mailtrapFrom;
if (!process.env.EMAIL_FROM && process.env.EMAIL_USER) process.env.EMAIL_FROM = process.env.EMAIL_USER;
if (!process.env.EMAIL_HOST) process.env.EMAIL_HOST = 'smtp.gmail.com';
if (!process.env.EMAIL_PORT) process.env.EMAIL_PORT = '587';
if (!process.env.IMAP_HOST && /gmail/i.test(process.env.EMAIL_HOST || '')) process.env.IMAP_HOST = 'imap.gmail.com';
if (!process.env.IMAP_PORT && process.env.EMAIL_HOST) process.env.IMAP_PORT = '993';

const smtpReady = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
const imapReady = Boolean(process.env.IMAP_USER && process.env.IMAP_PASSWORD);
console.log(`[runtime-env] mail config: smtp=${smtpReady} mailtrap=${mailtrapReady} imap=${imapReady} host=${process.env.EMAIL_HOST} port=${process.env.EMAIL_PORT}`);

if (!smtpReady && !mailtrapReady) {
  console.error('[runtime-env] OUTBOUND EMAIL NOT CONFIGURED: set MAILTRAP_TOKEN + MAILTRAP_FROM_EMAIL, or SMTP_USER + SMTP_PASS.');
}
