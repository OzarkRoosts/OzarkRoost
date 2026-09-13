function verifiedClaims(profile = {}) {
  return Array.isArray(profile.verifiedClaims) ? profile.verifiedClaims : [];
}

function buildAffiliateApplication(candidate = {}, profile = {}) {
  const claims = verifiedClaims(profile);
  const description = [
    `${profile.brand || 'OzarkRoost'} helps travelers discover Ozark destinations, places to stay, food, and adventures.`,
    profile.tagline || 'Discover the Ozarks. Stay. Eat. Explore.',
    claims.length ? `Verified focus: ${claims.join('; ')}.` : '',
  ].filter(Boolean).join(' ');

  return {
    partnerName: candidate.name || 'Unknown partner',
    programUrl: candidate.programUrl || null,
    applicationUrl: candidate.applicationUrl || null,
    description,
    claims,
  };
}

function buildSponsorshipPitch(candidate = {}, profile = {}) {
  const claims = verifiedClaims(profile);
  const description = [
    `${profile.brand || 'OzarkRoost'} is building a focused Ozarks travel and adventure discovery platform.`,
    'We can discuss sponsored destination, lodging, restaurant, adventure, homepage, newsletter, regional-page, social, or campaign placements based on your goals.',
    claims.length ? `Verified focus: ${claims.join('; ')}.` : '',
    'Placement, audience, traffic, and pricing details will be confirmed before any commitment.',
  ].filter(Boolean).join(' ');

  return {
    partnerName: candidate.name || 'Potential sponsor',
    description,
    inventory: [
      'sponsored destination page',
      'featured lodging',
      'featured restaurant',
      'featured adventure',
      'homepage placement',
      'newsletter sponsorship',
      'sponsored regional page',
      'featured social promotion',
      'campaign package',
    ],
  };
}

module.exports = {
  buildAffiliateApplication,
  buildSponsorshipPitch,
};
