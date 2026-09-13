const { discoverAffiliatePrograms, prepareAffiliateApplications } = require('./affiliate-partner-engine');
const { discoverSponsors, prepareSponsorPitch } = require('./sponsorship-engine');
const { persistAffiliateCandidate } = require('./affiliate-partner-engine');
const { persistSponsorCandidate } = require('./sponsorship-engine');

function bounded(value, fallback, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1) return fallback;
  return Math.min(Math.floor(number), max);
}

async function runAffiliateCycle(dependencies = {}, options = {}) {
  const candidates = await discoverAffiliatePrograms({ ...dependencies, maxCandidates: bounded(options.maxCandidates, 10, 25) });
  const applications = await prepareAffiliateApplications(candidates, dependencies);
  const persisted = [];
  for (const candidate of candidates.slice(0, bounded(options.persistLimit, 10, 10))) {
    persisted.push(await persistAffiliateCandidate(candidate, dependencies));
  }
  return { candidates, applications, persisted };
}

async function runSponsorshipCycle(dependencies = {}, options = {}) {
  const candidates = await discoverSponsors({ ...dependencies, maxCandidates: bounded(options.maxCandidates, 10, 25) });
  const prepared = candidates.map(candidate => ({ candidate, ...prepareSponsorPitch(candidate, dependencies) }));
  const persisted = [];
  for (const candidate of candidates.slice(0, bounded(options.persistLimit, 10, 10))) {
    persisted.push(await persistSponsorCandidate(candidate, dependencies));
  }
  return { candidates, prepared, persisted };
}

async function runPartnerAgentCycle(dependencies = {}, options = {}) {
  if (dependencies.enabled === false) return { status: 'disabled', affiliate: null, sponsorship: null };
  const startedAt = new Date().toISOString();
  const affiliate = await runAffiliateCycle(dependencies, options);
  const sponsorship = await runSponsorshipCycle(dependencies, options);
  return {
    status: 'completed',
    startedAt,
    completedAt: new Date().toISOString(),
    limits: { maxCandidates: bounded(options.maxCandidates, 10, 25), persistLimit: bounded(options.persistLimit, 10, 10) },
    affiliate,
    sponsorship,
  };
}

module.exports = { runPartnerAgentCycle, runAffiliateCycle, runSponsorshipCycle };
