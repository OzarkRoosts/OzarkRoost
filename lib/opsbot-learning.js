function extractLesson({ inbound, outbound, outcome }) {
  const intent = String(inbound?.intent || '').trim();
  const response = String(outbound || '').trim();
  if (!intent || !response || !outcome) return null;
  if (['complaint', 'false_information', 'removal_request', 'payment_question'].includes(intent)) return null;
  return {
    category: intent,
    triggerPattern: intent,
    responsePrinciple: response.slice(0, 500),
    evidenceCount: 1,
  };
}

function scoreLesson(lesson) {
  if (!lesson) return { confidence: 0, safety: 0, status: 'rejected' };
  const evidence = Number(lesson.evidenceCount || 1);
  const confidence = Math.min(0.98, 0.55 + Math.min(evidence, 8) * 0.05);
  const safety = ['listing_inquiry', 'partnership_inquiry', 'support_request'].includes(lesson.category) ? 0.90 : 0.70;
  return { confidence, safety, status: confidence >= 0.85 && safety >= 0.85 ? 'candidate' : 'quarantined' };
}

async function recordLesson(client, lesson, sourceThreadKey) {
  const scored = scoreLesson(lesson);
  await client.query(
    `INSERT INTO opsbot_learning_lessons
      (category, trigger_pattern, response_principle, evidence_count, confidence, safety_score, status, source_thread_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [lesson.category, lesson.triggerPattern, lesson.responsePrinciple, lesson.evidenceCount || 1, scored.confidence, scored.safety, scored.status, sourceThreadKey || null]
  );
  return scored;
}

async function buildLearningContext(client, limit = 8) {
  const { rows } = await client.query(
    `SELECT category, trigger_pattern, response_principle, evidence_count
       FROM opsbot_learning_lessons
      WHERE status = 'approved'
      ORDER BY confidence DESC, evidence_count DESC, approved_at DESC NULLS LAST
      LIMIT $1`,
    [Math.max(1, Math.min(20, Number(limit) || 8))]
  );
  return rows.map((row) => `Pattern: ${row.trigger_pattern}\nResponse principle: ${row.response_principle}`).join('\n\n');
}

module.exports = { extractLesson, scoreLesson, recordLesson, buildLearningContext };
