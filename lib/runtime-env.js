// Normalize deployment environment variable names before any bot modules load.
// Supports the Render blueprint's SMTP_* names and the OpsBot EMAIL_* names.
const aliases = {
  EMAIL_USER: 'SMTP_USER',
  EMAIL_PASSWORD: 'SMTP_PASS',
  EMAIL_HOST: 'SMTP_HOST',
  EMAIL_PORT: 'SMTP_PORT',
};

for (const [target, source] of Object.entries(aliases)) {
  if (!process.env[target] && process.env[source]) process.env[target] = process.env[source];
}

if (!process.env.EMAIL_FROM && process.env.EMAIL_USER) process.env.EMAIL_FROM = process.env.EMAIL_USER;
