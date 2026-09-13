function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function weightedScore(values) {
  const entries = Object.values(values).map(clamp);
  if (!entries.length) return 0;
  return Math.round((entries.reduce((sum, value) => sum + value, 0) / entries.length) * 100);
}

function scoreAffiliateCandidate(candidate = {}) {
  const policy = candidate.policyCompatible === false ? 0 : 1;
  const effort = 1 - clamp(candidate.integrationEffort);
  return weightedScore({
    geographicRelevance: candidate.geographicRelevance,
    travelerIntent: candidate.travelerIntent,
    commercialValue: candidate.commercialValue,
    integrationEase: effort,
    approvalLikelihood: candidate.approvalLikelihood,
    policyCompatibility: policy,
  });
}

function scoreSponsorshipCandidate(candidate = {}) {
  return weightedScore({
    audienceFit: candidate.audienceFit ?? candidate.geographicRelevance,
    geographicFit: candidate.geographicFit ?? candidate.geographicRelevance,
    businessRelevance: candidate.businessRelevance ?? candidate.travelerIntent,
    responseLikelihood: candidate.responseLikelihood ?? candidate.approvalLikelihood,
    sponsorshipValue: candidate.sponsorshipValue ?? candidate.commercialValue,
    policyCompatibility: candidate.policyCompatible === false ? 0 : 1,
  });
}

module.exports = {
  clamp,
  scoreAffiliateCandidate,
  scoreSponsorshipCandidate,
};
