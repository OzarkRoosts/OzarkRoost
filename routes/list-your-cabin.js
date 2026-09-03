// Handles /list-your-cabin form and /list-your-cabin/thank-you.
const express = require('express');
const router = express.Router();
const { createListingSubmission } = require('../db/listing-submissions');
const { isValidEmail, sanitizeText } = require('../lib/security');

const STRIPE_LINKS = {
  starter: process.env.STRIPE_STARTER_PAYMENT_LINK_URL || 'https://buy.stripe.com/6oU8wO1w57h03jkdU97wA01',
  featured: process.env.STRIPE_FEATURED_PAYMENT_LINK_URL || 'https://buy.stripe.com/3cI8wOgqZ58S5rseYd7wA02',
  dominant: process.env.STRIPE_DOMINANT_PAYMENT_LINK_URL || 'https://buy.stripe.com/14A9AS2A9eJs5rs03j7wA03',
};
const TIER_META = { starter: { label: 'Starter', price: 49 }, featured: { label: 'Featured', price: 99 }, dominant: { label: 'Dominant', price: 149 } };
function getTier(value) { return Object.prototype.hasOwnProperty.call(STRIPE_LINKS, value) ? value : 'starter'; }
function buildStripePaymentUrl(baseLink, submissionId, ownerEmail, tier, source = 'website') {
  const url = new URL(baseLink);
  url.searchParams.set('client_reference_id', String(submissionId));
  url.searchParams.set('prefilled_email', ownerEmail);
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', 'listing_funnel');
  url.searchParams.set('utm_campaign', 'premium_listing');
  url.searchParams.set('utm_content', tier);
  return url.toString();
}
router.get('/', (req, res) => {
  const tier = getTier(sanitizeText(req.query?.tier, 30));
  const source = sanitizeText(req.query?.source, 80) || 'website';
  res.render('list-your-cabin', { tier, tierMeta: TIER_META, acquisitionSource: source });
});
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
  const source = sanitizeText(req.body?.source, 80) || 'website';
  const campaign = sanitizeText(req.body?.campaign, 120) || 'premium_listing';
  const content = sanitizeText(req.body?.content, 120) || tier;
  const tierMeta = TIER_META[tier];
  const values = { owner_name: ownerName, owner_email: ownerEmail, property_name: propertyName, location, property_type: propertyType, description: description || '', photo_url: photoUrlRaw, website_url: websiteUrlRaw };
  const renderError = (status, error) => res.status(status).render('list-your-cabin', { error, values, tier, tierMeta: TIER_META, acquisitionSource: source });
  if (!ownerName || !ownerEmail || !propertyName || !location || !propertyType) return renderError(400, 'Please fill in all required fields.');
  if (!isValidEmail(ownerEmail)) return renderError(400, 'Please enter a valid email address.');
  const photoUrl = photoUrlRaw && /^https?:\/\//i.test(photoUrlRaw) ? photoUrlRaw : null;
  let websiteUrl = null;
  if (websiteUrlRaw) {
    if (!/^https?:\/\//i.test(websiteUrlRaw)) return renderError(400, 'Website URL must start with http:// or https://');
    websiteUrl = websiteUrlRaw;
  }
  const baseLink = STRIPE_LINKS[tier];
  let submission;
  try {
    submission = await createListingSubmission({ ownerName, ownerEmail: ownerEmail.toLowerCase(), propertyName, location, propertyType, description, photoUrl, websiteUrl, paymentLinkUrl: baseLink, listingTier: tier, acquisitionSource: source, acquisitionCampaign: campaign, acquisitionContent: content });
  } catch (dbErr) {
    console.error('[list-your-cabin] DB error:', dbErr && dbErr.message);
    return renderError(503, 'We could not save your listing. Please try again in a moment.');
  }
  if (/^https:\/\/buy\.stripe\.com\//i.test(baseLink)) return res.redirect(buildStripePaymentUrl(baseLink, submission.id, ownerEmail.toLowerCase(), tier, source));
  res.redirect('/list-your-cabin/thank-you?email=' + encodeURIComponent(ownerEmail) + '&manual=true');
});
router.get('/thank-you', (req, res) => res.render('thank-you', { email: sanitizeText(req.query.email, 254) || null, manual: req.query.manual === 'true' }));
module.exports = router;
