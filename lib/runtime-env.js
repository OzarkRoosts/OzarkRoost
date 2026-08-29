// Normalize deployment environment variable names before ANY bot modules load.
// Render secrets may use SMTP_*, while OpsBot historically uses EMAIL_*.
// Support the common Gmail/SMTP aliases so one naming mismatch cannot silently
// disable outbound mail.
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

if (!process.env.EMAIL_HOST) process.env.EMAIL_HOST = 'smtp.gmail.com';
if (!process.env.EMAIL_PORT) process.env.EMAIL_PORT = '587';
if (!process.env.EMAIL_FROM && process.env.EMAIL_USER) process.env.EMAIL_FROM = process.env.EMAIL_USER;
if (!process.env.IMAP_HOST && /gmail/i.test(process.env.EMAIL_HOST || '')) process.env.IMAP_HOST = 'imap.gmail.com';
if (!process.env.IMAP_PORT && process.env.EMAIL_HOST) process.env.IMAP_PORT = '993';

const smtpReady = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
const imapReady = Boolean(process.env.IMAP_USER && process.env.IMAP_PASSWORD);
console.log(`[runtime-env] mail config: smtp=${smtpReady} imap=${imapReady} host=${process.env.EMAIL_HOST} port=${process.env.EMAIL_PORT}`);

if (!smtpReady) {
  console.error('[runtime-env] OUTBOUND SMTP NOT CONFIGURED: EMAIL_USER/EMAIL_PASSWORD (or SMTP_USER/SMTP_PASS) are missing.');
}
