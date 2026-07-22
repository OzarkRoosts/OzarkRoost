// routes/referral.js — Operator referral program page and form handler
const express = require('express');
const router = express.Router();
const { createReferralSubmission } = require('../db/referral-submissions');

// GET /referral — render the partner referral page
router.get('/', (_req, res) => {
  res.render('referral');
});

// POST /referral — handle partner application submissions
router.post('/', async (req, res) => {
  const { name, email, website, promotion_method, message } = req.body;

  if (!name || !email || !website || !promotion_method) {
    return res.render('referral', {
      error: 'Please fill in all required fields.',
      values: { name, email, website, promotion_method, message }
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.render('referral', {
      error: 'Please enter a valid email address.',
      values: { name, email, website, promotion_method, message }
    });
  }

  try {
    await createReferralSubmission({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      website: website.trim(),
      promotion_method,
      message: message ? message.trim() : null
    });
  } catch (err) {
    console.error('Referral submission error:', err);
    return res.render('referral', {
      error: 'Something went wrong. Please try again.',
      values: { name, email, website, promotion_method, message }
    });
  }

  res.render('referral', { success: true });
});

module.exports = router;