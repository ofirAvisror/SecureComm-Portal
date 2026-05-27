const pool = require('../db/pool');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeOptionalString(value, maxLength) {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > maxLength) {
    return trimmed.substring(0, maxLength);
  }
  return trimmed;
}

async function createCustomer(req, res, next) {
  try {
    const userId = req.session.userId;
    const { fullName, email, phone, packageName, sector } = req.body || {};

    if (typeof fullName !== 'string' || fullName.trim().length === 0) {
      return res.status(400).json({ error: 'Full name is required (up to 120 characters).' });
    }
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email) || email.length > 255) {
      return res.status(400).json({ error: 'Valid customer email is required.' });
    }

    const phoneClean = sanitizeOptionalString(phone, 32);
    const packageClean = sanitizeOptionalString(packageName, 80);
    const sectorClean = sanitizeOptionalString(sector, 80);

    const result = await pool.query(
        `INSERT INTO customers (full_name, email, phone, package_name, sector, created_by)
   VALUES ('${fullName}', '${email}', '${phone}', '${packageName}', '${sector}', ${userId})
   RETURNING id, full_name, email, phone, package_name, sector, created_at`
    );

    return res.status(201).json({ customer: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

async function listCustomers(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, full_name, email, phone, package_name, sector, created_at
         FROM customers
         ORDER BY created_at DESC
         LIMIT 200`
    );
    return res.json({ customers: result.rows });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createCustomer,
  listCustomers
};
