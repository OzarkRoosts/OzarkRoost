/**
 * OzarkRoost Super Agent — Self-Healing Operations Daemon
 *
 * Monitors: server, DB, email, Stripe, OpsBot, env.
 * Also surfaces Site Health + Affiliate Ops superagents.
 * No AI credits required for core checks.
 */

require('dotenv').config();
const { exec } = require('child_process');
const http = require('http');
const https = require('https');
const nodemailer = require('nodemailer');
const pool = require('../db/index');

let Imap = null;
try {
  Imap = require('imap');
} catch {
  console.warn('[SuperAgent] optional dep "imap" missing — email IMAP checks disabled until installed');
}

function normalizeSiteUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'http://127.0.0.1:3000';
  try {
    // Handle accidental duplicated protocol/prefix values defensively.
    const repaired = raw.replace(/^(https?:\/\/)+/i, (match) => match.toLowerCase().includes('https') ? 'https://' : 'http://');
    const url = new URL(repaired);
    return url.origin;
  } catch {
    return raw
      .replace(/^(https?:\/\/)+/i, 'https://')
      .replace(/\/+$|\s+$/g, '');
  }
}

const CONFIG = {
  checkInterval: Number(process.env.SUPERAGENT_INTERVAL_MS) || 2 * 60_000,
  siteUrl: normalizeSiteUrl(process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || 'http://127.0.0.1:3000'),
  maxRetries: 3,
  alertEmail: process.env.EMAIL_USER,
};

let started = false;
let timer = null;

const healthState = {
  server: { status: 'unknown', lastCheck: null, failures: 0 },
  database: { status: 'unknown', lastCheck: null, failures: 0 },
  email: { status: 'unknown', lastCheck: null, failures: 0 },
  stripe: { status: 'unknown', lastCheck: null, failures: 0 },
  opsbot: { status: 'unknown', lastCheck: null, failures: 0 },
  env: { status: 'unknown', lastCheck: null, failures: 0 },
};

function softRequire(p) {
  try {
    return require(p);
  } catch {
    return null;
  }
}

async function sendAlert(subject, message) {
  if (!CONFIG.alertEmail || !process.env.EMAIL_PASSWORD) {
    console.error('[SuperAgent] ALERT:', subject, '-', message);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: `"OzarkRoost SuperAgent" <${process.env.EMAIL_USER}>`,
      to: CONFIG.alertEmail,
      subject: `[ALERT] ${subject}`,
      text: message,
      html: `<p><strong>${subject}</strong></p><p>${message}</p><p><em>Time: ${new Date().toISOString()}</em></p>`,
    });
    console.log('[SuperAgent] Alert sent:', subject);
  } catch (err) {
    console.error('[SuperAgent] Failed to send alert:', err.message);
  }
}

async function checkServerHealth() {
  return new Promise((resolve) => {
    const url = `${CONFIG.siteUrl}/health`;
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 10000 }, (res) => {
      if (res.statusCode === 200) {
        healthState.server = { status: 'healthy', lastCheck: new Date(), failures: 0 };
        resolve(true);
      } else {
        healthState.server.failures += 1;
        healthState.server.status = 'unhealthy';
        resolve(false);
      }
    });
    req.on('error', () => {
      healthState.server.failures += 1;
      healthState.server.status = 'error';
      resolve(false);
    });
    req.on('timeout', () => {
      req.destroy();
      healthState.server.failures += 1;
      healthState.server.status = 'timeout';
      resolve(false);
    });
  });
}

async function runMigrations() {
  return new Promise((resolve) => {
    exec('npm run migrate', { timeout: 60000 }, (err) => {
      if (err) {
        console.error('[SuperAgent] Migration error:', err.message);
        resolve(false);
      } else {
        console.log('[SuperAgent] Migrations complete');
        resolve(true);
      }
    });
  });
}

async function checkDatabase() {
  try {
    const result = await pool.query('SELECT NOW()');
    if (result.rows[0]) {
      healthState.database = { status: 'connected', lastCheck: new Date(), failures: 0 };

      const tables = await pool.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
      `);
      const existing = tables.rows.map((r) => r.table_name);
      const required = ['opsbot_inbound_emails', 'opsbot_email_log', 'opsbot_affiliate_applications'];
      const missing = required.filter((t) => !existing.includes(t));
      if (missing.length > 0) {
        console.log('[SuperAgent] Missing tables:', missing.join(', '));
        await runMigrations();
      }
      return true;
    }
  } catch (err) {
    healthState.database.failures += 1;
    healthState.database.status = 'disconnected';
    console.error('[SuperAgent] Database error:', err.message);
    try {
      await pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

async function checkEmailSystem() {
  if (!process.env.IMAP_USER || !process.env.IMAP_PASSWORD) {
    healthState.email = { status: 'no-credentials', lastCheck: new Date(), failures: 0 };
    return false;
  }
  if (!Imap) {
    healthState.email = { status: 'imap-dep-missing', lastCheck: new Date(), failures: 0 };
    return false;
  }

  return new Promise((resolve) => {
    const imap = new Imap({
      user: process.env.IMAP_USER,
      password: process.env.IMAP_PASSWORD,
      host: process.env.IMAP_HOST || 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    const timeout = setTimeout(() => {
      try {
        imap.end();
      } catch {
        /* ignore */
      }
      healthState.email.failures += 1;
      healthState.email.status = 'timeout';
      resolve(false);
    }, 15000);

    imap.once('ready', () => {
      clearTimeout(timeout);
      imap.openBox('INBOX', true, (err) => {
        if (err) {
          healthState.email.failures += 1;
          healthState.email.status = 'error';
          imap.end();
          resolve(false);
        } else {
          healthState.email = { status: 'connected', lastCheck: new Date(), failures: 0 };
          imap.end();
          resolve(true);
        }
      });
    });

    imap.once('error', () => {
      clearTimeout(timeout);
      healthState.email.failures += 1;
      healthState.email.status = 'error';
      resolve(false);
    });

    imap.connect();
  });
}

async function checkStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    healthState.stripe = { status: 'no-key', lastCheck: new Date(), failures: 0 };
    return false;
  }
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const balance = await stripe.balance.retrieve();
    if (balance) {
      healthState.stripe = { status: 'connected', lastCheck: new Date(), failures: 0 };
      return true;
    }
  } catch (err) {
    healthState.stripe.failures += 1;
    healthState.stripe.status = 'error';
    console.error('[SuperAgent] Stripe error:', err.message);
  }
  return false;
}

async function checkOpsBot() {
  if (process.env.OPSBOT_ENABLED !== 'true') {
    healthState.opsbot = { status: 'disabled', lastCheck: new Date(), failures: 0 };
    return false;
  }
  try {
    const result = await pool.query(`
      SELECT COUNT(*) FROM opsbot_inbound_emails
      WHERE status = 'unread'
    `);
    const unreadCount = parseInt(result.rows[0].count, 10);
    healthState.opsbot = {
      status: 'running',
      lastCheck: new Date(),
      failures: 0,
      unread: unreadCount,
    };
    return true;
  } catch (err) {
    healthState.opsbot.failures += 1;
    healthState.opsbot.status = 'error';
    console.error('[SuperAgent] OpsBot error:', err.message);
    return false;
  }
}

async function checkEnvironment() {
  const required = ['DATABASE_URL'];
  const recommended = [
    'GROQ_API_KEY',
    'EMAIL_USER',
    'EMAIL_PASSWORD',
    'IMAP_USER',
    'IMAP_PASSWORD',
    'STRIPE_SECRET_KEY',
    'OPSBOT_ENABLED',
    'APP_URL',
  ];
  const missingRequired = required.filter((k) => !process.env[k]);
  const missingRecommended = recommended.filter((k) => !process.env[k]);

  if (missingRequired.length > 0) {
    healthState.env = {
      status: 'missing-required',
      lastCheck: new Date(),
      failures: 1,
      missing: missingRequired,
      missing_recommended: missingRecommended,
    };
    return false;
  }

  healthState.env = {
    status: missingRecommended.length ? 'partial' : 'complete',
    lastCheck: new Date(),
    failures: 0,
    missing_recommended: missingRecommended,
  };
  return true;
}

async function runHealthCheck() {
  console.log('[SuperAgent] Running health check at', new Date().toISOString());

  const results = {
    server: await checkServerHealth(),
    database: await checkDatabase(),
    email: await checkEmailSystem(),
    stripe: await checkStripe(),
    opsbot: await checkOpsBot(),
    env: await checkEnvironment(),
  };

  if (!results.server && healthState.server.failures >= CONFIG.maxRetries) {
    await sendAlert('Server Down', 'The server has been unreachable for multiple checks.');
  }
  if (!results.database && healthState.database.failures >= CONFIG.maxRetries) {
    await sendAlert('Database Down', 'Cannot connect to the database.');
  }
  if (!results.email && healthState.email.failures >= CONFIG.maxRetries) {
    await sendAlert('Email System Down', 'IMAP/SMTP connection failed.');
  }

  console.log('[SuperAgent] Check summary:', JSON.stringify(results));
  return results;
}

function getStatus() {
  const siteHealth = softRequire('./site-health-agent');
  const affiliateOps = softRequire('./affiliate-ops-agent');
  return {
    status: started ? 'running' : 'idle',
    health: healthState,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    site_url: CONFIG.siteUrl,
    site_health: siteHealth?.getStatus?.() || null,
    affiliate_ops: affiliateOps?.getStatus?.() || null,
  };
}

function start(options = {}) {
  if (started) return getStatus();
  started = true;
  console.log('[SuperAgent] OzarkRoost Super Agent starting...');
  console.log('[SuperAgent] Check interval:', CONFIG.checkInterval / 1000, 'seconds');
  console.log('[SuperAgent] Site URL:', CONFIG.siteUrl);

  // Ensure companion superagents are armed
  const siteHealth = softRequire('./site-health-agent');
  const affiliateOps = softRequire('./affiliate-ops-agent');
  try {
    siteHealth?.start?.(options.force ? { force: true } : {});
  } catch (err) {
    console.warn('[SuperAgent] site-health start:', err.message);
  }
  try {
    affiliateOps?.start?.(options.force ? { force: true } : {});
  } catch (err) {
    console.warn('[SuperAgent] affiliate-ops start:', err.message);
  }

  const delay = options.initialDelayMs ?? 20_000;
  setTimeout(() => {
    runHealthCheck().catch((err) => console.error('[SuperAgent] check error:', err.message));
  }, delay);

  timer = setInterval(() => {
    runHealthCheck().catch((err) => console.error('[SuperAgent] check error:', err.message));
  }, CONFIG.checkInterval);
  if (typeof timer.unref === 'function') timer.unref();

  console.log('[SuperAgent] armed');
  return getStatus();
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  started = false;
}

module.exports = {
  start,
  stop,
  getStatus,
  runHealthCheck,
  healthState,
};
