/**
 * Autonomous affiliate application executor.
 *
 * Executes only explicit application forms exposed by known affiliate targets.
 * It does not bypass CAPTCHA, MFA, login walls, or required human attestations.
 * Unsupported/blocked forms are recorded as needs_human with the exact reason.
 */

const pool = require('../db/index');

const INTERVAL_MS = Number(process.env.AFFILIATE_APPLICATION_INTERVAL_MS) || 30 * 60 * 1000;
const MAX_PER_CYCLE = Number(process.env.AFFILIATE_APPLICATIONS_PER_CYCLE) || 3;
const REQUEST_TIMEOUT_MS = 20_000;

const KNOWN_HOSTS = new Set([
  'vrbo.com','www.vrbo.com','booking.com','www.booking.com','viatoraffiliateprogram.com',
  'www.viatoraffiliateprogram.com','alltrails.com','www.alltrails.com','rei.com','www.rei.com',
  'cabelas.com','www.cabelas.com','hipcamp.com','www.hipcamp.com','outdoorsy.com','www.outdoorsy.com',
  'koa.com','www.koa.com','nationalparktrips.com','www.nationalparktrips.com','tripadvisor.com','www.tripadvisor.com',
  'getyourguide.com','www.getyourguide.com','affiliate-program.amazon.com','airbnb.com','www.airbnb.com'
]);

let started = false;
let timer = null;

function absoluteUrl(base, action) {
  try { return new URL(action || base, base).toString(); } catch { return null; }
}
function hostAllowed(raw) {
  try { return KNOWN_HOSTS.has(new URL(raw).hostname.toLowerCase()); } catch { return false; }
}
function hasBlocker(html) {
  return /captcha|recaptcha|hcaptcha|turnstile|cloudflare|two-factor|two factor|multi-factor|mfa|verify you are human/i.test(html);
}
function parseForms(html) {
  const forms = [];
  const formRe = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
  let m;
  while ((m = formRe.exec(html))) forms.push({ attrs: m[1], body: m[2] });
  return forms;
}
function attr(attrs, name) {
  const re = new RegExp('\\b' + name + '\\s*=\\s*["\\']([^"\\']*)["\\']', 'i');
  return (attrs.match(re) || [])[1] || '';
}
function parseInputs(body) {
  const fields = [];
  const re = /<(input|textarea|select)\b([^>]*)(?:>([\s\S]*?)<\/\1>|\s*\/?>)/gi;
  let m;
  while ((m = re.exec(body))) {
    const tag = m[1].toLowerCase();
    const attrs = m[2] || '';
    const inner = m[3] || '';
    const type = (attr(attrs, 'type') || (tag === 'textarea' ? 'textarea' : tag)).toLowerCase();
    const name = attr(attrs, 'name') || attr(attrs, 'id');
    if (!name) continue;
    fields.push({
      tag, type, name,
      value: attr(attrs, 'value'),
      required: /\brequired\b/i.test(attrs),
      checked: /\bchecked\b/i.test(attrs),
      options: [...inner.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)].map(o => ({ value: attr(o[1], 'value') || o[2].replace(/<[^>]+>/g, '').trim(), text: o[2].replace(/<[^>]+>/g, '').trim() }))
    });
  }
  return fields;
}
function profileValue(field, application) {
  const key = `${field.name} ${field.type}`.toLowerCase();
  const email = process.env.AFFILIATE_APPLICANT_EMAIL || process.env.EMAIL_USER || '';
  const site = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || '';
  const name = process.env.AFFILIATE_APPLICANT_NAME || 'OzarkRoost';
  const company = process.env.AFFILIATE_APPLICANT_COMPANY || 'OzarkRoost';
  const description = process.env.AFFILIATE_APPLICANT_DESCRIPTION || 'OzarkRoost is an Arkansas Ozarks travel directory connecting travelers with cabins, outdoor activities, and local stays.';
  if (/email|e-mail/.test(key)) return email;
  if (/website|url|site|homepage/.test(key)) return site;
  if (/company|organization|business|publisher|brand/.test(key)) return company;
  if (/first.*name|given/.test(key)) return name.split(/\s+/)[0];
  if (/last.*name|surname|family/.test(key)) return name.split(/\s+/).slice(1).join(' ');
  if (/name|contact|applicant/.test(key)) return name;
  if (/description|about|message|comments|notes|reason|details|promotion|website.*describe|how.*promote/.test(key)) return application.application_text;
  if (/phone|tel/.test(key)) return process.env.AFFILIATE_APPLICANT_PHONE || '';
  if (/address/.test(key)) return process.env.AFFILIATE_APPLICANT_ADDRESS || '';
  if (/country/.test(key)) return process.env.AFFILIATE_APPLICANT_COUNTRY || 'United States';
  if (/traffic|audience|reach/.test(key)) return process.env.AFFILIATE_APPLICANT_AUDIENCE || description;
  return null;
}
function buildPayload(fields, application) {
  const params = new URLSearchParams();
  const missing = [];
  for (const f of fields) {
    if (['submit', 'button', 'image', 'reset', 'file'].includes(f.type)) continue;
    if (['checkbox', 'radio'].includes(f.type)) {
      if (f.required) missing.push(f.name + ' (required selection)');
      if (f.checked && f.value) params.append(f.name, f.value || 'on');
      continue;
    }
    if (f.type === 'hidden') { params.append(f.name, f.value); continue; }
    let value = profileValue(f, application);
    if (value == null) value = f.value || (f.options[0]?.value || '');
    if (f.required && !String(value).trim()) missing.push(f.name);
    if (value !== null && value !== undefined) params.append(f.name, String(value));
  }
  return { params, missing };
}
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal, redirect: 'follow', headers: { 'User-Agent': 'OzarkRoost-AffiliateOps/1.0 (+https://ozartkroost.onrender.com)', ...(options.headers || {}) } });
  } finally { clearTimeout(timer); }
}
async function mark(id, status, details = {}) {
  await pool.query(`UPDATE opsbot_affiliate_applications SET status=$1, applied_at=CASE WHEN $1 IN ('submitted','applied') THEN NOW() ELSE applied_at END, execution_method=$2, response_status=$3, response_url=$4, last_error=$5, updated_at=NOW() WHERE id=$6`, [status, details.method || 'web-form', details.httpStatus || null, details.url || null, details.error || null, id]);
}
async function executeApplication(application) {
  await mark(application.id, 'processing', { method: 'executor' });
  if (!application.apply_url || !hostAllowed(application.apply_url)) {
    await mark(application.id, 'needs_human', { error: 'Application URL is missing or outside the approved affiliate target allowlist.' });
    return 'needs_human';
  }
  const page = await fetchWithTimeout(application.apply_url);
  const html = await page.text();
  if (hasBlocker(html)) {
    await mark(application.id, 'needs_human', { error: 'CAPTCHA, human verification, MFA, or anti-bot challenge detected.', httpStatus: page.status, url: page.url });
    return 'needs_human';
  }
  const forms = parseForms(html);
  if (!forms.length) {
    await mark(application.id, 'needs_human', { error: 'No HTML application form found; target likely uses an external portal or JavaScript workflow.', httpStatus: page.status, url: page.url });
    return 'needs_human';
  }
  const form = forms.find(f => /apply|affiliate|publisher|partner|application|signup|register/i.test(`${attr(f.attrs, 'action')} ${f.body}`)) || forms[0];
  const fields = parseInputs(form.body);
  const { params, missing } = buildPayload(fields, application);
  if (missing.length) {
    await mark(application.id, 'needs_human', { error: `Required fields could not be safely populated: ${missing.join(', ')}`, httpStatus: page.status, url: page.url });
    return 'needs_human';
  }
  const action = absoluteUrl(page.url, attr(form.attrs, 'action'));
  if (!action || !hostAllowed(action)) {
    await mark(application.id, 'needs_human', { error: 'Form action resolves outside the approved affiliate target allowlist.', httpStatus: page.status, url: action || page.url });
    return 'needs_human';
  }
  const method = (attr(form.attrs, 'method') || 'get').toLowerCase();
  let response;
  if (method === 'post') response = await fetchWithTimeout(action, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
  else {
    const target = new URL(action);
    for (const [k, v] of params) target.searchParams.append(k, v);
    response = await fetchWithTimeout(target.toString());
  }
  const resultHtml = await response.text();
  if (hasBlocker(resultHtml)) {
    await mark(application.id, 'needs_human', { error: 'Post-submit human verification detected.', httpStatus: response.status, url: response.url });
    return 'needs_human';
  }
  const success = response.ok && /thank|success|received|submitted|application|welcome|confirmation/i.test(resultHtml);
  if (!success) {
    await mark(application.id, 'failed', { error: `Application submission did not produce a success signal (HTTP ${response.status}).`, httpStatus: response.status, url: response.url });
    return 'failed';
  }
  await mark(application.id, 'submitted', { method: `web-form:${method}`, httpStatus: response.status, url: response.url });
  console.log(`[AffiliateExecutor] submitted: ${application.program_name}`);
  return 'submitted';
}
async function runCycle() {
  if (process.env.AFFILIATE_APPLICATION_EXECUTION === 'false') return;
  // Recover jobs interrupted by a restart, then pull the next batch.
  await pool.query(`UPDATE opsbot_affiliate_applications SET status='queued', last_error='Executor restarted before completion', updated_at=NOW() WHERE status='processing' AND updated_at < NOW() - INTERVAL '15 minutes'`).catch(() => {});
  const { rows } = await pool.query(`SELECT * FROM opsbot_affiliate_applications WHERE status IN ('drafted','queued','retry') ORDER BY created_at ASC LIMIT $1`, [MAX_PER_CYCLE]);
  if (!rows.length) return;
  console.log(`[AffiliateExecutor] executing ${rows.length} queued affiliate applications`);
  for (const row of rows) {
    try { await executeApplication(row); }
    catch (err) { await mark(row.id, 'retry', { error: err.message }); console.error(`[AffiliateExecutor] ${row.program_name}: ${err.message}`); }
  }
}
function start() {
  if (started) return;
  started = true;
  console.log('[AffiliateExecutor] autonomous application execution armed');
  runCycle().catch(err => console.error('[AffiliateExecutor] initial cycle:', err.message));
  timer = setInterval(() => runCycle().catch(err => console.error('[AffiliateExecutor] cycle:', err.message)), INTERVAL_MS);
  if (timer.unref) timer.unref();
}
function stop() { if (timer) clearInterval(timer); timer = null; started = false; }
module.exports = { start, stop, runCycle, executeApplication };
