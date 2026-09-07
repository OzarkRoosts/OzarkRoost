const pool = require('../db/index');
const { prospects } = require('./local-outreach-agent');

async function seed() {
  let count = 0;
  for (const raw of prospects || []) {
    const [business_name, email, phone, website, address, location, personalization, source_url] = raw;
    if (!business_name) continue;
    await pool.query(`
      INSERT INTO local_outreach_prospects
        (business_name,email,phone,website,address,location,personalization,source_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (business_name) DO UPDATE SET
        email=COALESCE(EXCLUDED.email, local_outreach_prospects.email),
        phone=COALESCE(EXCLUDED.phone, local_outreach_prospects.phone),
        website=COALESCE(EXCLUDED.website, local_outreach_prospects.website),
        address=COALESCE(EXCLUDED.address, local_outreach_prospects.address),
        location=COALESCE(EXCLUDED.location, local_outreach_prospects.location),
        personalization=EXCLUDED.personalization,
        source_url=EXCLUDED.source_url
    `, [business_name, email || null, phone || null, website || null, address || null, location || null, personalization || null, source_url || null]);
    count++;
  }
  return count;
}

module.exports = { seed };