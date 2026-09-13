const TRANSITIONS = {
  discovered: new Set(['qualified', 'blocked']),
  qualified: new Set(['application_ready', 'pitch_ready', 'needs_human', 'blocked']),
  application_ready: new Set(['submitted', 'needs_human', 'blocked']),
  pitch_ready: new Set(['contacted', 'needs_human', 'blocked']),
  submitted: new Set(['approved', 'rejected', 'needs_human']),
  approved: new Set(['integrated', 'rejected', 'needs_human']),
  rejected: new Set(['discovered']),
  contacted: new Set(['replied', 'needs_human', 'blocked']),
  replied: new Set(['negotiating', 'needs_human']),
  negotiating: new Set(['awaiting_human', 'contracted', 'needs_human']),
  awaiting_human: new Set(['contracted', 'blocked']),
  contracted: new Set(['paid', 'needs_human']),
  paid: new Set(['fulfilled', 'renewed']),
  fulfilled: new Set(['renewed']),
  integrated: new Set(['verified', 'needs_human']),
  verified: new Set([]),
  needs_human: new Set(['application_ready', 'pitch_ready', 'submitted', 'contacted', 'approved', 'integrated', 'contracted', 'paid', 'fulfilled', 'renewed', 'blocked']),
  blocked: new Set(['discovered', 'needs_human']),
  already_active: new Set([]),
};

function canTransition(from, to) {
  return Boolean(TRANSITIONS[from] && TRANSITIONS[from].has(to));
}

function decideApplicationAction(candidate = {}) {
  if (candidate.existingActiveApplication) return 'already_active';
  if (candidate.policyCompatible === false) return 'blocked';
  if (!candidate.automationPermitted || !candidate.requiredFieldsAvailable) return 'needs_human';
  if (!candidate.applicationUrl) return 'needs_human';
  return 'auto_submit';
}

function decideSponsorshipAction(candidate = {}) {
  if (candidate.existingActiveOpportunity) return 'already_active';
  if (candidate.policyCompatible === false) return 'blocked';
  if (!candidate.contactMethodAvailable) return 'needs_human';
  return candidate.automationPermitted === false ? 'needs_human' : 'queue_outreach';
}

module.exports = {
  TRANSITIONS,
  canTransition,
  decideApplicationAction,
  decideSponsorshipAction,
};
