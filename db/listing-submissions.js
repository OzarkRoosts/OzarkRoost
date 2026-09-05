// Listing submission queries.
// Owns: all read/write to listing_submissions table.
// Does NOT own: Stripe integration, payment link creation.
const pool = require('./index');

// Cache for listings — expires after 5 minutes (user can always refresh)
let listingsCache = null;
let listingsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function createListingSubmission({
  ownerName,
  ownerEmail,
  propertyName,
  location,
  propertyType,
  description,
  photoUrl,
  websiteUrl,
  paymentLinkUrl,
  paymentStatus = 'unpaid'
}) {
  const safePaymentStatus = ['unpaid', 'free'].includes(paymentStatus) ? paymentStatus : 'unpaid';
  const result = await pool.query(
    `INSERT INTO listing_submissions
       (owner_name, owner_email, property_name, location, property_type,
        description, photo_url, website_url, payment_link_url, payment_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [ownerName, ownerEmail, propertyName, location, propertyType,
     description, photoUrl, websiteUrl, paymentLinkUrl, safePaymentStatus]
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

  // Paid listings stay live. Founding free listings are visible for 90 days,
  // giving operators a real promotional window while keeping the directory honest.
  const result = await pool.query(
    `SELECT * FROM listing_submissions
     WHERE payment_status = 'paid'
        OR (payment_status = 'free' AND created_at >= NOW() - INTERVAL '90 days')
     ORDER BY CASE WHEN payment_status = 'paid' THEN 0 ELSE 1 END, id`
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
     RETURNING *`,
    [id, stripeSessionId]
  );
  listingsCache = null;
  return result.rows[0];
}

module.exports = { createListingSubmission, getSubmissionByEmail, getAllListings, markListingPaid };
