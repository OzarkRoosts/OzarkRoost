const { normalizePartnerKey } = require('./partner-attribution');

function normalizeAffiliateCandidate(raw = {}) {
  const name = String(raw.name || '').trim();
  const applicationUrl = raw.applicationUrl || null;
  return {
    kind: 'affiliate',
    name,
    category: raw.category || 'travel',
    applicationUrl,
    programUrl: raw.programUrl || null,
    termsUrl: raw.termsUrl || null,
    sourceUrl: raw.sourceUrl || raw.programUrl || applicationUrl || null,
    sourceName: raw.sourceName || 'public-web-research',
    commission: raw.commission || null,
    cookieTerms: raw.cookieTerms || null,
    geographicRelevance: raw.geographicRelevance,
    travelerIntent: raw.travelerIntent,
    commercialValue: raw.commercialValue,
    integrationEffort: raw.integrationEffort,
    approvalLikelihood: raw.approvalLikelihood,
    policyCompatible: raw.policyCompatible !== false,
    automationPermitted: raw.automationPermitted === true,
    requiredFieldsAvailable: raw.requiredFieldsAvailable === true,
    partnerKey: normalizePartnerKey(name, applicationUrl || raw.programUrl || raw.sourceUrl),
  };
}

function dedupeAffiliateCandidates(candidates = []) {
  const map = new Map();
  for (const candidate of candidates) {
    const normalized = normalizeAffiliateCandidate(candidate);
    if (!normalized.name || !normalized.partnerKey.endsWith('|')) map.set(normalized.partnerKey, normalized);
  }
  return [...map.values()];
}

module.exports = { normalizeAffiliateCandidate, dedupeAffiliateCandidates };
