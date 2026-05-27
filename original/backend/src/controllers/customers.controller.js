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

function parseOptionalId(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) {
    return null;
  }
  return n;
}

async function assertCatalogIds(packageId, sectorId) {
  if (packageId != null) {
    const pkg = await pool.query(`SELECT id FROM packages WHERE id = $1`, [packageId]);
    if (pkg.rowCount === 0) {
      return 'Invalid internet package selected.';
    }
  }
  if (sectorId != null) {
    const sec = await pool.query(`SELECT id FROM sectors WHERE id = $1`, [sectorId]);
    if (sec.rowCount === 0) {
      return 'Invalid sector selected.';
    }
  }
  return null;
}

const CUSTOMER_SELECT = `
  SELECT c.id, c.full_name, c.email, c.phone,
         p.name AS package_name, s.name AS sector,
         c.created_at
    FROM customers c
    LEFT JOIN packages p ON p.id = c.package_id
    LEFT JOIN sectors s ON s.id = c.sector_id
`;

async function createCustomer(req, res, next) {
  try {
    const userId = req.session.userId;
    const { fullName, email, phone, packageId, sectorId } = req.body || {};

    if (typeof fullName !== 'string' || fullName.trim().length === 0 || fullName.length > 120) {
      return res.status(400).json({ error: 'Full name is required (up to 120 characters).' });
    }
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email) || email.length > 255) {
      return res.status(400).json({ error: 'Valid customer email is required.' });
    }

    const packageIdClean = parseOptionalId(packageId);
    const sectorIdClean = parseOptionalId(sectorId);
    const catalogError = await assertCatalogIds(packageIdClean, sectorIdClean);
    if (catalogError) {
      return res.status(400).json({ error: catalogError });
    }

    const phoneClean = sanitizeOptionalString(phone, 32);

    const insertResult = await pool.query(
      `INSERT INTO customers (full_name, email, phone, package_id, sector_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [fullName.trim(), email.trim(), phoneClean, packageIdClean, sectorIdClean, userId]
    );

    const detail = await pool.query(
      `${CUSTOMER_SELECT} WHERE c.id = $1`,
      [insertResult.rows[0].id]
    );

    return res.status(201).json({ customer: detail.rows[0] });
  } catch (err) {
    return next(err);
  }
}

async function listCustomers(req, res, next) {
  try {
    const result = await pool.query(
      `${CUSTOMER_SELECT}
         ORDER BY c.created_at DESC
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
