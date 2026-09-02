// routes/operators.js — Operator referral program page and inquiry handler
const express = require('express');
const router = express.Router();
const { createOperatorInquiry } = require('../db/operator-inquiries');
const { enqueueOperatorNurtureSequence } = require('../db/nurture-email-queue');
const { activateOperatorFunnel } = require('../lib/funnel-ops');
const opsbot = require('../lib/opsbot');

router.get('/', (_req, res) => {
  res.render('operators');
});

router.post('/', async (req, res) => {
  const { operator_name, email, property_name, property_type, location, phone, message, source } = req.body;
  const values = { operator_name, email, property_name, property_type, location, phone, message, source };

  const required = [operator_name, email, property_name, property_type, location];
  if (required.some(f => !f || !String(f).trim())) {
    return res.render('operators', { error: 'Please fill in all required fields.', values });
  }

  const emailRegex = /^[^\t\n\r@]+@[^\t\n\r@]+\.[^\t\n\r@]+$/;
  if (!emailRegex.test(email)) {
    return res.render('operators', { error: 'Please enter a valid email address.', values });
  }

  try {
    const inquiry = await createOperatorInquiry({
      operator_name: operator_name.trim(),
      email: email.trim().toLowerCase(),
      property_name: property_name.trim(),
      property_type,
      location: location.trim(),
      phone: phone ? phone.trim() : null,
      message: message ? message.trim() : null,
      source: source || null
    });

    const paymentLink = process.env.STRIPE_PAYMENT_LINK_URL || `${process.env.APP_URL || 'https://ozarkroosts.com'}/list-your-cabin`;
    await activateOperatorFunnel({
      inquiry,
      paymentLink,
      sendEmail: opsbot.sendEmail,
      enqueueNurtureSequence: enqueueOperatorNurtureSequence,
    });
  } catch (err) {
    console.error('Operator funnel error:', err);
    return res.render('operators', { error: 'We received your inquiry, but the automated follow-up could not be started. Please try again or contact us directly.', values });
  }

  res.render('operators', { success: true });
});

module.exports = router;
