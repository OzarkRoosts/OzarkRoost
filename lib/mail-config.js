function firstEnv(names) {
  return names.map((name) => process.env[name]).find((value) => value !== undefined && value !== '');
}

function resolveEmailConfig() {
  return {
    host: firstEnv(['EMAIL_HOST', 'SMTP_HOST', 'MAIL_HOST']) || 'smtp.gmail.com',
    port: Number(firstEnv(['EMAIL_PORT', 'SMTP_PORT', 'MAIL_PORT'])) || 587,
    user: firstEnv(['EMAIL_USER', 'SMTP_USER', 'GMAIL_USER', 'EMAIL_USERNAME']) || '',
    pass: firstEnv(['EMAIL_PASSWORD', 'SMTP_PASS', 'SMTP_PASSWORD', 'GMAIL_APP_PASSWORD', 'EMAIL_PASS']) || '',
    from: firstEnv(['EMAIL_FROM', 'MAILTRAP_FROM_EMAIL']) || firstEnv(['EMAIL_USER', 'SMTP_USER', 'GMAIL_USER']) || '',
  };
}

module.exports = { resolveEmailConfig };
