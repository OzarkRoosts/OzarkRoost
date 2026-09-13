const { dedupeAffiliateCandidates } = require('./affiliate-partner-sources');
const { scoreAffiliateCandidate } = require('./partner-scoring');
const { decideApplicationAction } = require('./partner-policy');
const { createPartnerOpportunity } = require('./partner-registry');
const { buildAffiliateApplication } = require('./partner-application');

function qualifyAffiliatePrograms(candidates = [], context = {}) {
  return dedupeAffiliateCandidates(candidates)
    .map(candidate => ({ ...candidate, score: scoreAffiliateCandidate(candidate, context) }))
    .filter(candidate => candidate.policyCompatible !== false)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(Number(context.maxCandidates) || 25, 50));
}

async function discoverAffiliatePrograms(context = {}) {
  if (typeof context.discover !== 'function') return [];
  const raw = await context.discover({ kind: 'affiliate', limit: Math.min(Number(context.discoveryLimit) || 25, 50) });
  return qualifyAffiliatePrograms(raw, context);
}

async function prepareAffiliateApplications(candidates = [], context = {}) {
  const profile = context.businessProfile || {};
  return candidates.map(candidate => ({
    candidate,
    action: decideApplicationAction(candidate),
    application: buildAffiliateApplication(candidate, profile),
  }));
}

async function persistAffiliateCandidate(candidate, context = {}) {
  return createPartnerOpportunity({ ...candidate, metadata: { ...(candidate.metadata || {}), engine: 'affiliate' } }, context.pool);
}

async function verifyAffiliateIntegration(opportunity, context = {}) {
  if (typeof context.verify !== 'function') return { verified: false, reason: 'verification_adapter_missing' };
  const result = await context.verify(opportunity);
  return { verified: Boolean(result && result.verified), details: result || null };
}

module.exports = { discoverAffiliatePrograms, qualifyAffiliatePrograms, prepareAffiliateApplications, persistAffiliateCandidate, verifyAffiliateIntegration };
