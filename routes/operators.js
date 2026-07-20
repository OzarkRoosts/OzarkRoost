// routes/operators.js — Operator referral program page and inquiry handler
const express = require('express');
const router = express.Router();
const { createOperatorInquiry } = require('../db/operator-inquiries');

router.get('/', (_req, res) => {
  res.render('operators');
});

router.post('/', async (req, res) => {
  const { operator_name, email, property_name, property_type, location, phone, message, source } = req.body;

  const required = [operator_name, email, property_name, property_type, location];
  if (required.some(f => !f || !String(f).trim())) {
    return res.render('operators', {
      error: 'Please fill in all required fields.',
      values: { operator_name, email, property_name, property_type, location, phone, message, source }
    });
  }

  const emailRegex = /^[^\t\n\r@]+@[^\t\n\r@]+\.[^\t\n\r@]+$/;
  if (!emailRegex.test(email)) {
    return res.render('operators', {
      error: 'Please enter a valid email address.',
      values: { operator_name, email, property_name, property_type, location, phone, message, source }
    });
  }

  try {
    await createOperatorInquiry({
      operator_name: operator_name.trim(),
      email: email.trim().toLowerCase(),
      property_name: property_name.trim(),
      property_type,
      location: location.trim(),
      phone: phone ? phone.trim() : null,
      message: message ? message.trim() : null,
      source: source || null
    });
  } catch (err) {
    console.error('Operator inquiry error:', err);
    return res.render('operators', {
      error: 'Something went wrong. Please try again.',
      values: { operator_name, email, property_name, property_type, location, phone, message, source }
    });
  }

  res.render('operators', { success: true });
});

module.exports = router;