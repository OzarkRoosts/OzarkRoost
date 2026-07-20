// Listing submission queries.
// Owns: all read/write to listing_submissions table.
// Does NOT own: Stripe integration, payment link creation.
const pool = require('./index');

async function createListingSubmission({
  ownerName,
  ownerEmail,
  propertyName,
  location,
  propertyType,
  description,
  photoUrl,
  websiteUrl,
  paymentLinkUrl
}) {
  const result = await pool.query(
    `INSERT INTO listing_submissions
       (owner_name, owner_email, property_name, location, property_type,
        description, photo_url, website_url, payment_link_url, payment_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'unpaid')
     RETURNING *`,
    [ownerName, ownerEmail, propertyName, location, propertyType,
     description, photoUrl, websiteUrl, paymentLinkUrl]
  );
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
  let query = 'SELECT * FROM listing_submissions WHERE payment_status = $1 ORDER BY id';
  let params = ['paid'];

  const result = await pool.query(query, params);
  let rows = result.rows;

  if (location && location !== 'all') {
    rows = rows.filter(r => r.location === location);
  }
  if (type && type !== 'all') {
    rows = rows.filter(r => r.property_type === type);
  }

  return rows;
}

module.exports = { createListingSubmission, getSubmissionByEmail, getAllListings };