// Security helpers — headers, sanitization, safe redirects.
// No external deps; keep deploy surface small.

const ALLOWED_REDIRECT_HOSTS = new Set([
  'vrbo.com',
  'www.vrbo.com',
  'booking.com',
  'www.booking.com',
  'airbnb.com',
  'www.airbnb.com',
  'hipcamp.com',
  'www.hipcamp.com',
  'getyourguide.com',
  'www.getyourguide.com',
  'outdoorsy.com',
  'www.outdoorsy.com',
  'rei.com',
  'www.rei.com',
  'stay22.com',
  'www.stay22.com',
  'viator.com',
  'www.viator.com',
  'alltrails.com',
  'www.alltrails.com',
]);

function applySecurityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-XSS-Protection', '0');
  // Allow same-origin + Google fonts + CDN images + Stripe
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.openai.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com https://www.stay22.com",
      "base-uri 'self'",
      "form-action 'self' https://buy.stripe.com https://checkout.stripe.com",
    ].join('; ')
  );
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeText(value, maxLen = 500) {
  if (value == null) return '';
  return String(value).trim().slice(0, maxLen);
}

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

function isSafeExternalUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (ALLOWED_REDIRECT_HOSTS.has(host)) return true;
    // allow subdomains of known partners
    for (const allowed of ALLOWED_REDIRECT_HOSTS) {
      if (host.endsWith('.' + allowed.replace(/^www\./, ''))) return true;
    }
    // allow same host as APP_URL (for internal absolute links)
    try {
      if (process.env.APP_URL) {
        const appHost = new URL(process.env.APP_URL).hostname.toLowerCase();
        if (host === appHost) return true;
      }
    } catch { /* ignore bad APP_URL */ }
    return false;
  } catch {
    return false;
  }
}

module.exports = {
  applySecurityHeaders,
  escapeHtml,
  sanitizeText,
  isValidEmail,
  isSafeExternalUrl,
};
