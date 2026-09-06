const { planActions } = require('./agent-orchestrator');

function toAgentOpportunities(opportunities = []) {
  return opportunities.map((opp) => ({
    agentId: 'affiliate-ai',
    capability: 'score_opportunity',
    target: `${opp.page_path || 'unknown'}:${opp.platform || 'unknown'}:${opp.opportunity_type || 'unknown'}`,
    payload: { page_path: opp.page_path, platform: opp.platform, opportunity_type: opp.opportunity_type },
    expectedRevenue: Number(opp.estimated_value) || 0,
    confidence: Number(opp.confidence ?? 0.5),
    urgency: Number(opp.urgency ?? 0.5),
    effort: Number(opp.effort ?? 1),
    reversibility: Number(opp.reversibility ?? 1),
    dependencyReadiness: opp.blocked ? 0 : Number(opp.dependencyReadiness ?? 1),
  }));
}

function planAffiliateOpportunities(opportunities) {
  return planActions(toAgentOpportunities(opportunities));
}

module.exports = { toAgentOpportunities, planAffiliateOpportunities };
