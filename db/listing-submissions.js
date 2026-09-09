// Listing submission queries.
// Owns: all read/write to listing_submissions table.
// Does NOT own: Stripe API calls or webhook signature verification.
const pool = require('./index');

let listingsCache = null;
let listingsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

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

async function markListingPaid(id, stripeSessionId, stripeCustomerId, stripeSubscriptionId, stripePriceId, listingTier, subscriptionStatus, periodEnd) {
  const result = await pool.query(
    `UPDATE listing_submissions
     SET payment_status = 'paid',
         stripe_checkout_session_id = COALESCE($2, stripe_checkout_session_id),
         stripe_customer_id = COALESCE($3, stripe_customer_id),
         stripe_subscription_id = COALESCE($4, stripe_subscription_id),
         stripe_price_id = COALESCE($5, stripe_price_id),
         listing_tier = COALESCE($6, listing_tier),
         subscription_status = COALESCE($7, subscription_status),
         subscription_current_period_end = COALESCE($8, subscription_current_period_end),
         paid_at = COALESCE(paid_at, NOW())
     WHERE id = $1
     RETURNING *`,
    [id, stripeSessionId, stripeCustomerId, stripeSubscriptionId, stripePriceId, listingTier, subscriptionStatus, periodEnd]
  );
  listingsCache = null;
  return result.rows[0];
}

async function updateListingSubscription({ stripeSubscriptionId, status, periodEnd, paymentStatus }) {
  const result = await pool.query(
    `UPDATE listing_submissions
     SET subscription_status = $2,
         subscription_current_period_end = $3,
         payment_status = $4
     WHERE stripe_subscription_id = $1
     RETURNING *`,
    [stripeSubscriptionId, status, periodEnd, paymentStatus]
  );
  listingsCache = null;
  return result.rows[0];
}

async function recordStripeWebhookEvent(eventId, eventType) {
  const result = await pool.query(
    `INSERT INTO stripe_webhook_events (stripe_event_id, event_type)
     VALUES ($1, $2)
     ON CONFLICT (stripe_event_id) DO NOTHING
     RETURNING stripe_event_id`,
    [eventId, eventType]
  );
  return result.rowCount === 1;
}

module.exports = {
  createListingSubmission,
  getSubmissionByEmail,
  getAllListings,
  markListingPaid,
  updateListingSubscription,
  recordStripeWebhookEvent,
};
