const RISK_CLASSES = Object.freeze({
  READ_ONLY: 'read_only',
  REVERSIBLE: 'reversible',
  EXTERNAL_SIDE_EFFECT: 'external_side_effect',
  DESTRUCTIVE: 'destructive',
});

const ACTION_STATES = Object.freeze([
  'planned',
  'ready',
  'executing',
  'succeeded',
  'failed',
  'blocked',
  'verified',
]);

function defineAgent({ id, mission, capabilities = [], cadence = 'on_demand', dependencies = [], riskClass = RISK_CLASSES.READ_ONLY, escalation = 'none' }) {
  if (!id || !mission) throw new Error('agent id and mission are required');
  return Object.freeze({ id, mission, capabilities: Object.freeze([...capabilities]), cadence, dependencies: Object.freeze([...dependencies]), riskClass, escalation });
}

const AGENT_REGISTRY = Object.freeze([
  defineAgent({ id: 'superagent', mission: 'Coordinate priorities, delegation, execution, recovery, and escalation.', capabilities: ['orchestrate', 'prioritize', 'deduplicate', 'recover'] }),
  defineAgent({ id: 'affiliate-ai', mission: 'Discover and score legitimate affiliate opportunities.', capabilities: ['discover_affiliate', 'score_opportunity'] }),
  defineAgent({ id: 'affiliate-executor', mission: 'Execute permitted affiliate actions and report evidence.', capabilities: ['execute_affiliate'], riskClass: RISK_CLASSES.EXTERNAL_SIDE_EFFECT, escalation: 'credentials_or_policy' }),
  defineAgent({ id: 'affiliate-ops', mission: 'Maintain partner, link, application, and revenue opportunity health.', capabilities: ['audit_affiliate', 'repair_affiliate'] }),
  defineAgent({ id: 'autonomous-sales', mission: 'Prioritize qualified listing prospects and permitted outreach.', capabilities: ['score_lead', 'prepare_outreach'], riskClass: RISK_CLASSES.EXTERNAL_SIDE_EFFECT, escalation: 'consent_or_provider' }),
  defineAgent({ id: 'marketing-seo', mission: 'Find and execute high-value content, SEO, and conversion improvements.', capabilities: ['audit_seo', 'optimize_content'] }),
  defineAgent({ id: 'opsbot', mission: 'Monitor health, queues, email, payments, and recovery opportunities.', capabilities: ['monitor_ops', 'recover_ops'] }),
  defineAgent({ id: 'rover', mission: 'Provide user-facing intelligence from verified shared context.', capabilities: ['answer', 'recommend'] }),
]);

function getAgent(id) {
  return AGENT_REGISTRY.find(agent => agent.id === id) || null;
}

function isActionState(value) {
  return ACTION_STATES.includes(value);
}

module.exports = { ACTION_STATES, AGENT_REGISTRY, RISK_CLASSES, defineAgent, getAgent, isActionState };
