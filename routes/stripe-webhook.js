const express = require('express');
const Stripe = require('stripe');
const { markListingPaid } = require('../db/listing-submissions');

const router = express.Router();

// Lightweight endpoint check for Render/Stripe configuration troubleshooting.
// Never exposes secret values.
router.get('/', (_req, res) => {
  res.status(200).json({
    service: 'stripe-webhook',
    configured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    endpoint: '/webhooks/stripe'
  });
});

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers['stripe-signature'];

  if (!secret || !signature || !process.env.STRIPE_SECRET_KEY) {
    return res.status(400).send('Stripe webhook is not configured.');
  }

  let event;
  try {
    event = new Stripe(process.env.STRIPE_SECRET_KEY).webhooks.constructEvent(req.body, signature, secret);
  } catch (error) {
    console.error('[stripe webhook] signature verification failed:', error.message);
    return res.status(400).send('Invalid webhook signature.');
  }

  try {
    // Payment Links can use delayed payment methods. Handle both the normal
    // completed event and the later async-success event.
    const isSuccessfulCheckout =
      (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') &&
      event.data.object.payment_status === 'paid';

    if (isSuccessfulCheckout) {
      const session = event.data.object;
      const listingId = Number.parseInt(session.client_reference_id, 10);
      if (Number.isInteger(listingId) && listingId > 0) {
        const listing = await markListingPaid(listingId, session.id);
        if (!listing) console.warn('[stripe webhook] listing not found:', listingId);
        else console.log(`[stripe webhook] listing ${listingId} marked paid (${event.type})`);
      } else {
        console.warn('[stripe webhook] missing listing reference:', session.id);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[stripe webhook] processing failed:', error.message);
    return res.status(500).send('Webhook processing failed.');
  }
});

module.exports = router;
