const express = require('express');
const Stripe = require('stripe');
const {
  markListingPaid,
  updateListingSubscription,
  recordStripeWebhookEvent,
} = require('../db/listing-submissions');

const router = express.Router();

router.get('/', (_req, res) => {
  res.status(200).json({
    service: 'stripe-webhook',
    configured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    endpoint: '/webhooks/stripe',
  });
});

function toDate(unixSeconds) {
  if (!unixSeconds) return null;
  const date = new Date(Number(unixSeconds) * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function paymentStatusForSubscription(status) {
  if (status === 'active' || status === 'trialing') return 'paid';
  if (status === 'past_due' || status === 'unpaid') return 'past_due';
  if (status === 'canceled' || status === 'incomplete_expired') return 'canceled';
  return 'unpaid';
}

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers['stripe-signature'];
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!secret || !signature || !stripeKey) return res.status(400).send('Stripe webhook is not configured.');

  let event;
  try {
    event = new Stripe(stripeKey).webhooks.constructEvent(req.body, signature, secret);
  } catch (error) {
    console.error('[stripe webhook] signature verification failed:', error.message);
    return res.status(400).send('Invalid webhook signature.');
  }

  try {
    // Stripe retries webhook delivery. Record the event before mutating listings
    // so duplicate deliveries become harmless no-ops.
    const firstDelivery = await recordStripeWebhookEvent(event.id, event.type);
    if (!firstDelivery) return res.status(200).json({ received: true, duplicate: true });

    const stripe = new Stripe(stripeKey);

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object;
      if (session.payment_status !== 'paid') return res.status(200).json({ received: true, pending: true });

      const listingId = Number.parseInt(session.client_reference_id, 10);
      if (!Number.isInteger(listingId) || listingId < 1) {
        console.warn('[stripe webhook] missing listing reference:', session.id);
        return res.status(200).json({ received: true, ignored: true });
      }

      const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items.data.price', 'subscription'],
      });
      const subscription = expandedSession.subscription && typeof expandedSession.subscription === 'object'
        ? expandedSession.subscription
        : null;
      const lineItem = expandedSession.line_items?.data?.[0];
      const priceId = lineItem?.price?.id || null;
      const periodEnd = subscription?.current_period_end ? toDate(subscription.current_period_end) : null;

      const listing = await markListingPaid(
        listingId,
        expandedSession.id,
        typeof expandedSession.customer === 'string' ? expandedSession.customer : expandedSession.customer?.id || null,
        typeof expandedSession.subscription === 'string' ? expandedSession.subscription : subscription?.id || null,
        priceId,
        null,
        subscription?.status || 'active',
        periodEnd,
      );

      if (!listing) console.warn('[stripe webhook] listing not found:', listingId);
      else console.log(`[stripe webhook] listing ${listingId} activated (${event.type})`);
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const listing = await updateListingSubscription({
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        periodEnd: toDate(subscription.current_period_end),
        paymentStatus: paymentStatusForSubscription(subscription.status),
      });
      if (listing) console.log(`[stripe webhook] listing ${listing.id} subscription=${subscription.status}`);
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      if (invoice.subscription) {
        const listing = await updateListingSubscription({
          stripeSubscriptionId: String(invoice.subscription),
          status: 'past_due',
          periodEnd: null,
          paymentStatus: 'past_due',
        });
        if (listing) console.warn(`[stripe webhook] listing ${listing.id} payment failed; listing hidden until recovered`);
      }
    }

    if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      if (invoice.subscription) {
        const listing = await updateListingSubscription({
          stripeSubscriptionId: String(invoice.subscription),
          status: 'active',
          periodEnd: null,
          paymentStatus: 'paid',
        });
        if (listing) console.log(`[stripe webhook] listing ${listing.id} payment recovered`);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[stripe webhook] processing failed:', error.message);
    return res.status(500).send('Webhook processing failed.');
  }
});

module.exports = router;
