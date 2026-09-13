const pool = require('../db/index');

const AFFILIATE_SEEDS = [
  ['Booking.com Affiliate', 'lodging', 'https://www.booking.com/', 'https://www.booking.com/affiliate-program/v2/index.html'],
  ['GetYourGuide Affiliate', 'experiences', 'https://www.getyourguide.com/', 'https://partner.getyourguide.com/'],
  ['Hipcamp Affiliate', 'camping', 'https://www.hipcamp.com/', 'https://www.hipcamp.com/ambassadors'],
  ['Outdoorsy Affiliate', 'rv', 'https://www.outdoorsy.com/', 'https://www.outdoorsy.com/affiliate'],
  ['AllTrails Affiliate', 'hiking', 'https://www.alltrails.com/', 'https://www.alltrails.com/affiliate'],
  ['REI Affiliate', 'gear', 'https://www.rei.com/', 'https://www.rei.com/affiliate'],
  ['Expedia Affiliate', 'lodging', 'https://www.expedia.com/', 'https://www.expedia.com/affiliate-program'],
  ['Tripadvisor Affiliate', 'travel', 'https://www.tripadvisor.com/', 'https://www.tripadvisor.com/business/affiliate-program'],
  ['Airbnb Affiliate', 'lodging', 'https://www.airbnb.com/', 'https://www.airbnb.com/affiliate-program'],
  ['Amazon Associates Outdoor', 'gear', 'https://www.amazon.com/', 'https://affiliate-program.amazon.com/'],
];

async function seedAffiliatePartners() {
  for (const [name, category, websiteUrl, applicationUrl] of AFFILIATE_SEEDS) {
    await pool.query(`
      INSERT INTO partner_prospects
        (name, category, partner_type, website_url, application_url, region, fit_score, status, verification_status, metadata)
      VALUES ($1,$2,'affiliate',$3,$4,'Ozarks',$5,'needs_review','verified_source',$6)
      ON CONFLICT (name, COALESCE(website_url, '')) DO UPDATE SET
        application_url = EXCLUDED.application_url,
        fit_score = GREATEST(partner_prospects.fit_score, EXCLUDED.fit_score),
        verification_status = 'verified_source',
        metadata = partner_prospects.metadata || EXCLUDED.metadata,
        updated_at = NOW()
    `, [name, category, websiteUrl, applicationUrl, category === 'lodging' || category === 'experiences' ? 95 : 88, JSON.stringify({ partnerAgentSeed: true, automationPermitted: true })]);
  }
}

module.exports = { AFFILIATE_SEEDS, seedAffiliatePartners };
