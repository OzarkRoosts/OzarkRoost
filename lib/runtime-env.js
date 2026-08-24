// Normalize deployment environment variable names before any bot modules load.
// Supports Render's SMTP_* names and OpsBot's EMAIL_*/IMAP_* names.
const aliases = {
  EMAIL_USER: 'SMTP_USER',
  EMAIL_PASSWORD: 'SMTP_PASS',
  EMAIL_HOST: 'SMTP_HOST',
  EMAIL_PORT: 'SMTP_PORT',
  IMAP_USER: 'SMTP_USER',
  IMAP_PASSWORD: 'SMTP_PASS',
};

for (const [target, source] of Object.entries(aliases)) {
  if (!process.env[target] && process.env[source]) process.env[target] = process.env[source];
}

if (!process.env.EMAIL_FROM && process.env.EMAIL_USER) process.env.EMAIL_FROM = process.env.EMAIL_USER;
if (!process.env.IMAP_HOST && /gmail/i.test(process.env.EMAIL_HOST || '')) process.env.IMAP_HOST = 'imap.gmail.com';
if (!process.env.IMAP_PORT && process.env.EMAIL_HOST) process.env.IMAP_PORT = '993';

console.log(`[runtime-env] mail config: smtp=${Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD)} imap=${Boolean(process.env.IMAP_USER && process.env.IMAP_PASSWORD)}`);
