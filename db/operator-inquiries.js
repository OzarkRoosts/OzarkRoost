// db/operator-inquiries.js — Operator inquiry submissions
const pool = require('./index');

async function createOperatorInquiry({ operator_name, email, property_name, property_type, location, phone, message, source }) {
  const sql = `
    INSERT INTO operator_inquiries (operator_name, email, property_name, property_type, location, phone, message, source, submitted_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    RETURNING id, operator_name, email, property_name, property_type, submitted_at
  `;
  const result = await pool.query(sql, [operator_name, email, property_name, property_type, location, phone || null, message || null, source || null]);
  return result.rows[0];
}

module.exports = { createOperatorInquiry };