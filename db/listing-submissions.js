// Listing submission queries.
// Owns: all read/write to listing_submissions table.
// Does NOT own: Stripe integration, payment link creation.
const pool = require('./index');

let listingsCache = null;
let listingsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function createListingSubmission({
  ownerName, ownerEmail, propertyName, location, propertyType, description,
  photoUrl, websiteUrl, paymentLinkUrl, listingTier = 'starter', acquisitionSource = 'website',
  acquisitionCampaign = 'premium_listing', acquisitionContent = listingTier
}) {
  const result = await pool.query(
    `INSERT INTO listing_submissions
       (owner_name, owner_email, property_name, location, property_type,
        description, photo_url, website_url, payment_link_url, payment_status,
        listing_tier, acquisition_source, acquisition_campaign, acquisition_content)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'unpaid', $10, $11, $12, $13)
     RETURNING *`,
    [ownerName, ownerEmail, propertyName, location, propertyType, description, photoUrl,
      websiteUrl, paymentLinkUrl, listingTier, acquisitionSource, acquisitionCampaign, acquisitionContent]
  );
  listingsCache = null;
  return result.rows[0];
}

async function getSubmissionByEmail(email) {
  const result = await pool.query(
    `SELECT * FROM listing_submissions WHERE owner_email = $1 ORDER BY created_at DESC LIMIT 1`,
    [email]
  );
  return result.rows[0];
}

async function getAllListings({ location, type } = {}) {
  const now = Date.now();
  if (listingsCache && (now - listingsCacheTime) < CACHE_TTL) {
    let rows = listingsCache;
    if (location && location !== 'all') rows = rows.filter(r => r.location === location);
    if (type && type !== 'all') rows = rows.filter(r => r.property_type === type);
    return rows;
  }
  const result = await pool.query(
    'SELECT * FROM listing_submissions WHERE payment_status = $1 ORDER BY id', ['paid']
  );
  listingsCache = result.rows;
  listingsCacheTime = now;
  let rows = listingsCache;
  if (location && location !== 'all') rows = rows.filter(r => r.location === location);
  if (type && type !== 'all') rows = rows.filter(r => r.property_type === type);
  return rows;
}

async function markListingPaid(id, stripeSessionId) {
  const result = await pool.query(
    `UPDATE listing_submissions
     SET payment_status = 'paid', stripe_checkout_session_id = $2, paid_at = NOW()
     WHERE id = $1
     RETURNING *`, [id, stripeSessionId]
  );
  listingsCache = null;
  return result.rows[0];
}

module.exports = { createListingSubmission, getSubmissionByEmail, getAllListings, markListingPaid };
