// Handles /list-your-cabin form and /list-your-cabin/thank-you.
// Owns: owner submission form, thank-you page, DB record creation.
// Stripe links are public checkout URLs; environment variables can override the defaults.
const express = require('express');
const router = express.Router();
const { createListingSubmission } = require('../db/listing-submissions');
const { isValidEmail, sanitizeText } = require('../lib/security');

// Live Stripe payment links currently attached to the OzarkRoost account.
// Render environment variables can override these without another code deploy.
const STRIPE_LINKS = {
  starter: process.env.STRIPE_STARTER_PAYMENT_LINK_URL || 'https://buy.stripe.com/6oU8wO1w57h03jkdU97wA01',
  featured: process.env.STRIPE_FEATURED_PAYMENT_LINK_URL || 'https://buy.stripe.com/3cI8wOgqZ58S5rseYd7wA02',
  dominant: process.env.STRIPE_DOMINANT_PAYMENT_LINK_URL || 'https://buy.stripe.com/14A9AS2A9eJs5rs03j7wA03',
};

const TIER_META = {
  starter: { label: 'Starter', price: 49 },
  featured: { label: 'Featured', price: 99 },
  dominant: { label: 'Dominant', price: 199 },
};

function getTier(value) {
  return Object.prototype.hasOwnProperty.call(STRIPE_LINKS, value) ? value : 'starter';
}

function buildStripePaymentUrl(baseLink, submissionId, ownerEmail, tier) {
  const url = new URL(baseLink);
  // Stripe Payment Links support client_reference_id for server-side reconciliation
  // and UTM parameters for conversion/source attribution.
  url.searchParams.set('client_reference_id', String(submissionId));
  url.searchParams.set('prefilled_email', ownerEmail);
  url.searchParams.set('utm_source', 'ozarkroost');
  url.searchParams.set('utm_medium', 'website');
  url.searchParams.set('utm_campaign', 'premium_listing');
  url.searchParams.set('utm_content', tier);
  return url.toString();
}

// GET /list-your-cabin — render the form
router.get('/', (_req, res) => {
  res.render('list-your-cabin', { tier: 'starter', tierMeta: TIER_META });
});

// POST /list-your-cabin — handle form submission, redirect to Stripe, save record
router.post('/', async (req, res) => {
  const ownerName = sanitizeText(req.body?.owner_name, 120);
  const ownerEmail = sanitizeText(req.body?.owner_email, 254);
  const propertyName = sanitizeText(req.body?.property_name, 160);
  const location = sanitizeText(req.body?.location, 160);
  const propertyType = sanitizeText(req.body?.property_type, 60);
  const description = sanitizeText(req.body?.description, 2000) || null;
  const photoUrlRaw = sanitizeText(req.body?.photo_url, 500);
  const websiteUrlRaw = sanitizeText(req.body?.website_url, 500);
  const tier = getTier(sanitizeText(req.body?.tier, 30));
  const tierMeta = TIER_META[tier];

  const values = { owner_name: ownerName, owner_email: ownerEmail, property_name: propertyName, location, property_type: propertyType, description: description || '', photo_url: photoUrlRaw, website_url: websiteUrlRaw };

  if (!ownerName || !ownerEmail || !propertyName || !location || !propertyType) {
    return res.status(400).render('list-your-cabin', { error: 'Please fill in all required fields.', values, tier, tierMeta: TIER_META });
  }
  if (!isValidEmail(ownerEmail)) {
    return res.status(400).render('list-your-cabin', { error: 'Please enter a valid email address.', values, tier, tierMeta: TIER_META });
  }

  const photoUrl = photoUrlRaw && /^https?:\/\//i.test(photoUrlRaw) ? photoUrlRaw : null;
  let websiteUrl = null;
  if (websiteUrlRaw) {
    if (!/^https?:\/\//i.test(websiteUrlRaw)) {
      return res.status(400).render('list-your-cabin', { error: 'Website URL must start with http:// or https://', values, tier, tierMeta: TIER_META });
    }
    websiteUrl = websiteUrlRaw;
  }

  const baseLink = STRIPE_LINKS[tier];
  let submission;
  try {
    submission = await createListingSubmission({
      ownerName,
      ownerEmail: ownerEmail.toLowerCase(),
      propertyName,
      location,
      propertyType,
      description,
      photoUrl,
      websiteUrl,
      paymentLinkUrl: baseLink,
    });
  } catch (dbErr) {
    console.error('[list-your-cabin] DB error:', dbErr && dbErr.message);
    return res.status(503).render('list-your-cabin', { error: 'We could not save your listing. Please try again in a moment.', values, tier, tierMeta: TIER_META });
  }

  if (/^https:\/\/buy\.stripe\.com\//i.test(baseLink)) {
    return res.redirect(buildStripePaymentUrl(baseLink, submission.id, ownerEmail.toLowerCase(), tier));
  }

  res.redirect('/list-your-cabin/thank-you?email=' + encodeURIComponent(ownerEmail) + '&manual=true');
});

router.get('/thank-you', (req, res) => {
  res.render('thank-you', { email: sanitizeText(req.query.email, 254) || null, manual: req.query.manual === 'true' });
});

module.exports = router;
