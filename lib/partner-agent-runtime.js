const { schedulePartnerAgent } = require('./partner-agent-scheduler');
const { discoverCandidates } = require('./partner-agent-discovery-adapter');
const { runSponsorshipOutreachCycle } = require('./sponsorship-outreach-worker');
const { seedAffiliatePartners } = require('./partner-agent-seeder');

async function startPartnerAgent() {
  if (process.env.PARTNER_AGENT_ENABLED !== 'true') {
    console.log('[PartnerAgent] disabled; set PARTNER_AGENT_ENABLED=true to activate');
    return { enabled: false };
  }

  try {
    await seedAffiliatePartners();
    console.log('[PartnerAgent] affiliate partner seed verified');
  } catch (error) {
    console.error('[PartnerAgent] affiliate seed failed:', error.message);
  }

  const businessProfile = {
    brand: 'OzarkRoost',
    tagline: 'Discover the Ozarks. Stay. Eat. Explore.',
    verifiedClaims: ['Ozark travel and adventure directory'],
  };

  const scheduler = schedulePartnerAgent({
    enabled: true,
    businessProfile,
    discover: discoverCandidates,
  }, {
    maxCandidates: Number(process.env.PARTNER_AGENT_MAX_CANDIDATES) || 10,
    persistLimit: Number(process.env.PARTNER_AGENT_PERSIST_LIMIT) || 10,
    intervalMinutes: Number(process.env.PARTNER_AGENT_INTERVAL_MINUTES) || 360,
  });

  const sponsorshipTimer = setInterval(() => {
    runSponsorshipOutreachCycle().catch(error => console.error('[PartnerAgent:Sponsorship] cycle failed:', error.message));
  }, Math.min(Math.max(Number(process.env.PARTNER_SPONSORSHIP_INTERVAL_MINUTES) || 360, 30), 1440) * 60 * 1000);
  sponsorshipTimer.unref?.();
  runSponsorshipOutreachCycle().catch(error => console.error('[PartnerAgent:Sponsorship] initial cycle failed:', error.message));

  console.log('[PartnerAgent] affiliate + sponsorship engines armed');
  return { ...scheduler, sponsorshipTimer };
}

module.exports = { startPartnerAgent };
