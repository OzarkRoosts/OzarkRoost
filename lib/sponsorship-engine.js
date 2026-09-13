const { normalizePartnerKey } = require('./partner-attribution');
const { scoreSponsorshipCandidate } = require('./partner-scoring');
const { decideSponsorshipAction } = require('./partner-policy');
const { createPartnerOpportunity } = require('./partner-registry');
const { buildSponsorshipPitch } = require('./partner-application');
const { getSponsorshipInventory } = require('./sponsorship-offers');

function qualifySponsors(candidates = [], context = {}) {
  const seen = new Set();
  return candidates
    .map(raw => {
      const key = normalizePartnerKey(raw.name, raw.contactUrl || raw.contactEmail || raw.sourceUrl);
      return { ...raw, partnerKey: key, score: scoreSponsorshipCandidate(raw, context) };
    })
    .filter(candidate => {
      if (!candidate.name || !candidate.partnerKey || seen.has(candidate.partnerKey)) return false;
      seen.add(candidate.partnerKey);
      return candidate.policyCompatible !== false;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(Number(context.maxCandidates) || 25, 50));
}

async function discoverSponsors(context = {}) {
  if (typeof context.discover !== 'function') return [];
  const raw = await context.discover({ kind: 'sponsorship', limit: Math.min(Number(context.discoveryLimit) || 25, 50) });
  return qualifySponsors(raw, context);
}

function prepareSponsorPitch(opportunity, context = {}) {
  return {
    action: decideSponsorshipAction(opportunity),
    pitch: buildSponsorshipPitch(opportunity, context.businessProfile || {}),
    inventory: getSponsorshipInventory(),
  };
}

async function persistSponsorCandidate(candidate, context = {}) {
  return createPartnerOpportunity({
    ...candidate,
    kind: 'sponsorship',
    sourceUrl: candidate.sourceUrl || candidate.contactUrl,
    needsHuman: decideSponsorshipAction(candidate) === 'needs_human',
    metadata: { ...(candidate.metadata || {}), engine: 'sponsorship', contactEmail: candidate.contactEmail || null, contactUrl: candidate.contactUrl || null },
  }, context.pool);
}

async function queueSponsorOutreach(opportunity, context = {}) {
  const decision = decideSponsorshipAction(opportunity);
  if (decision !== 'queue_outreach') return { queued: false, decision };
  if (typeof context.queueOutreach !== 'function') return { queued: false, decision: 'needs_human' };
  return context.queueOutreach({ opportunity, pitch: prepareSponsorPitch(opportunity, context).pitch });
}

async function recordSponsorResponse(opportunityId, event, context = {}) {
  if (typeof context.recordEvent !== 'function') return null;
  return context.recordEvent({ opportunityId, eventType: event.type, externalId: event.externalId || null, metadata: event.metadata || {} });
}

module.exports = { discoverSponsors, qualifySponsors, prepareSponsorPitch, persistSponsorCandidate, queueSponsorOutreach, recordSponsorResponse };
