/**
 * OzarkRoost Owner-Operator Agent policy.
 *
 * The agent can act with delegated authority, but never bypasses a service's
 * authentication/authorization boundary. High-impact actions require approval.
 */
const ACTION_CLASSES = Object.freeze({
  OBSERVE: 'observe',
  ANALYZE: 'analyze',
  PREPARE: 'prepare',
  EXECUTE: 'execute',
  HIGH_IMPACT: 'high_impact',
});

const DEFAULT_POLICY = Object.freeze({
  autonomy: 'delegated',
  allowed: [
    'observe.*',
    'analyze.*',
    'prepare.*',
    'execute.content.*',
    'execute.analytics.*',
    'execute.seo.*',
    'execute.site_health.*',
    'execute.github.branch',
    'execute.github.commit',
    'execute.github.pull_request',
  ],
  approval_required: [
    'high_impact.*',
    'execute.payments.*',
    'execute.billing.*',
    'execute.account.*',
    'execute.secrets.*',
    'execute.production.delete',
    'execute.external.send_first_contact',
  ],
  never_allowed: [
    'bypass.authentication',
    'bypass.authorization',
    'disable.security_controls',
    'exfiltrate.credentials',
    'capture.private_communications',
    'impersonate_human_without_disclosure',
    'access_unowned_account',
  ],
});

function matches(pattern, action) {
  if (pattern.endsWith('.*')) return action.startsWith(pattern.slice(0, -1));
  return pattern === action;
}

function decide(action, policy = DEFAULT_POLICY) {
  const normalized = String(action || '').trim().toLowerCase();
  if (!normalized) return { decision: 'deny', reason: 'missing_action' };
  if (policy.never_allowed.some(p => matches(p, normalized))) {
    return { decision: 'deny', reason: 'never_allowed', action: normalized };
  }
  if (policy.approval_required.some(p => matches(p, normalized))) {
    return { decision: 'approval_required', reason: 'high_impact_or_sensitive', action: normalized };
  }
  if (policy.allowed.some(p => matches(p, normalized))) {
    return { decision: 'allow', reason: 'delegated_owner_policy', action: normalized };
  }
  return { decision: 'approval_required', reason: 'not_explicitly_delegated', action: normalized };
}

function withOverrides(overrides = {}) {
  return {
    ...DEFAULT_POLICY,
    ...overrides,
    allowed: Array.isArray(overrides.allowed) ? overrides.allowed : DEFAULT_POLICY.allowed,
    approval_required: Array.isArray(overrides.approval_required) ? overrides.approval_required : DEFAULT_POLICY.approval_required,
    never_allowed: Array.isArray(overrides.never_allowed) ? overrides.never_allowed : DEFAULT_POLICY.never_allowed,
  };
}

module.exports = { ACTION_CLASSES, DEFAULT_POLICY, decide, withOverrides };
