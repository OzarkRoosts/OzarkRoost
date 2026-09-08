const pool = require('../db/index');
const { prospects } = require('./local-outreach-agent');

async function seed() {
  let count = 0;
  for (const raw of prospects || []) {
    const [business_name, email, phone, website, address, location, personalization, source_url] = raw;
    if (!business_name || !email || !source_url) continue;
    await pool.query(`
      INSERT INTO opsbot_sales_prospects
        (business_name, area, email, phone, source_url, hook)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (email) DO UPDATE SET
        business_name=EXCLUDED.business_name,
        area=EXCLUDED.area,
        phone=COALESCE(EXCLUDED.phone, opsbot_sales_prospects.phone),
        source_url=EXCLUDED.source_url,
        hook=EXCLUDED.hook
    `, [business_name, location || address || null, email.trim().toLowerCase(), phone || null, source_url, personalization || null]);
    count++;
  }
  return count;
}

module.exports = { seed };