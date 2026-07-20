// Handles /list-your-cabin form and /list-your-cabin/thank-you.
// Owns: owner submission form, thank-you page, DB record creation.
// Does NOT own: Stripe payment link creation (done via MCP, stored in env).
const express = require('express');
const router = express.Router();
const { createListingSubmission } = require('../db/listing-submissions');

// GET /list-your-cabin — render the form
router.get('/', (_req, res) => {
  res.render('list-your-cabin');
});

// POST /list-your-cabin — handle form submission, redirect to Stripe, save record
router.post('/', async (req, res) => {
  const {
    owner_name: ownerName,
    owner_email: ownerEmail,
    property_name: propertyName,
    location,
    property_type: propertyType,
    description,
    photo_url: photoUrl,
    website_url: websiteUrl
  } = req.body;

  if (!ownerName || !ownerEmail || !propertyName || !location || !propertyType) {
    return res.status(400).render('list-your-cabin', {
      error: 'Please fill in all required fields.',
      values: req.body
    });
  }

  // Payment link is pre-created via Stripe MCP, stored as env var.
  // Append email so thank-you page can personalize the confirmation.
  const baseLink = process.env.STRIPE_PAYMENT_LINK_URL;
  const paymentLinkUrl = baseLink
    ? `${baseLink}${baseLink.includes('?') ? '&' : '?'}email=${encodeURIComponent(ownerEmail)}&property=${encodeURIComponent(propertyName)}`
    : null;

  // Save submission to DB regardless of Stripe result
  try {
    await createListingSubmission({
      ownerName,
      ownerEmail,
      propertyName,
      location,
      propertyType,
      description: description || null,
      photoUrl: photoUrl || null,
      websiteUrl: websiteUrl || null,
      paymentLinkUrl: baseLink || null
    });
  } catch (dbErr) {
    console.error('[list-your-cabin] DB error:', dbErr && dbErr.message);
  }

  if (paymentLinkUrl) {
    return res.redirect(paymentLinkUrl);
  }

  res.redirect('/list-your-cabin/thank-you?email=' + encodeURIComponent(ownerEmail) + '&manual=true');
});

// GET /list-your-cabin/thank-you — post-Stripe-payment landing page
router.get('/thank-you', (req, res) => {
  res.render('thank-you', {
    email: req.query.email || null,
    manual: req.query.manual === 'true'
  });
});

module.exports = router;