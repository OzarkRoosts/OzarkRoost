const crypto = require('node:crypto');

function threadKeyFor(email) {
  const sender = String(email.sender || '').trim().toLowerCase();
  const subject = String(email.subject || '').replace(/^\s*(re|fw|fwd):\s*/gi, '').trim().toLowerCase();
  return crypto.createHash('sha256').update(`${sender}|${subject}`).digest('hex');
}

async function getConversationState(client, threadKey) {
  const { rows } = await client.query('SELECT * FROM opsbot_conversation_state WHERE thread_key = $1', [threadKey]);
  return rows[0] || { thread_key: threadKey, suppressed: false, payment_verified: false };
}

async function recordConversationEvent(client, event) {
  await client.query(
    `INSERT INTO opsbot_conversation_events
      (thread_key, message_id, direction, intent, confidence, action, reason_codes, outcome)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`,
    [event.threadKey, event.messageId || null, event.direction, event.intent || null, event.confidence ?? null, event.action || null, JSON.stringify(event.reasonCodes || []), event.outcome || null]
  );
}

async function upsertConversationState(client, state) {
  await client.query(
    `INSERT INTO opsbot_conversation_state
      (thread_key, sender_email, suppressed, payment_verified, last_intent, last_confidence, last_action, last_response_hash, last_inbound_at, last_outbound_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
     ON CONFLICT (thread_key) DO UPDATE SET
       sender_email=EXCLUDED.sender_email,
       suppressed=EXCLUDED.suppressed,
       payment_verified=EXCLUDED.payment_verified,
       last_intent=EXCLUDED.last_intent,
       last_confidence=EXCLUDED.last_confidence,
       last_action=EXCLUDED.last_action,
       last_response_hash=EXCLUDED.last_response_hash,
       last_inbound_at=COALESCE(EXCLUDED.last_inbound_at, opsbot_conversation_state.last_inbound_at),
       last_outbound_at=COALESCE(EXCLUDED.last_outbound_at, opsbot_conversation_state.last_outbound_at),
       updated_at=NOW()`,
    [state.threadKey, state.senderEmail || null, !!state.suppressed, !!state.paymentVerified, state.lastIntent || null, state.lastConfidence ?? null, state.lastAction || null, state.lastResponseHash || null, state.lastInboundAt || null, state.lastOutboundAt || null]
  );
}

module.exports = { threadKeyFor, getConversationState, recordConversationEvent, upsertConversationState };
