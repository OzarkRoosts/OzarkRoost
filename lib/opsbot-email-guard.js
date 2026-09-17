/** OpsBot outbound reply safety guard.
 * Preloaded before the app so unsafe automated replies cannot leave the service.
 */
const Module = require('module');
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  const exported = originalLoad.apply(this, arguments);
  if (request === './email-sender' && parent && /[\\/]lib[\\/]opsbot\.js$/.test(parent.filename)) {
    const originalSend = exported.sendOutboundEmail;
    if (typeof originalSend === 'function' && !originalSend.__ozarkGuarded) {
      const guarded = async function(opts = {}) {
        const subject = String(opts.subject || '');
        const to = String(opts.to || '');
        const text = String(opts.text || '').toLowerCase();
        const automatedRecipient = /\b(noreply|no-reply|mailer-daemon|postmaster|notifications?|newsletter|digest|marketing|promo|unsubscribe|trial|receipt|alert|automated|do-not-reply)\b/i.test(to);
        const automatedText = /\b(unsubscribe|newsletter|marketing|promotion|trial|digest|automated message|do not reply|no-reply)\b/i.test(text);
        if (/^re:\s*/i.test(subject) && (automatedRecipient || automatedText)) {
          console.warn('[OpsBot:Guard] Blocked unsafe automated reply to', to, subject);
          return { blocked: true, messageId: null };
        }
        if (/^re:\s*/i.test(subject)) {
          const pool = require(process.cwd() + '/db/index');
          try {
            const q = await pool.query(`SELECT body_text FROM opsbot_inbound_emails WHERE lower(sender) = lower($1) AND status = 'unread' ORDER BY received_at DESC LIMIT 1`, [to]);
            const body = String(q.rows[0]?.body_text || '').toLowerCase();
            const leadSignals = /(listing|list my|list our|cabin|property|lodging|rental|reservation|booking|book|ozark|buffalo river|advertis|advertise|partnership|partner|support|payment|invoice|price|pricing|rate|commission|affiliate|owner|operator|adventure|camping|rv|glamping|business)/i;
            if (!body || !leadSignals.test(body)) {
              console.warn('[OpsBot:Guard] Blocked reply: no verified OzarkRoost lead signal for', to, subject);
              return { blocked: true, messageId: null };
            }
          } catch (err) {
            console.error('[OpsBot:Guard] Verification failed; blocking reply:', err.message);
            return { blocked: true, messageId: null };
          }
        }
        return originalSend(opts);
      };
      guarded.__ozarkGuarded = true;
      exported.sendOutboundEmail = guarded;
    }
  }
  return exported;
};
