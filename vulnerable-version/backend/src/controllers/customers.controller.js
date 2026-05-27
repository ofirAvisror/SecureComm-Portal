// PART B: deliberate SQL injection in createCustomer (section 4).
const pool = require('../db/pool');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sqlLiteral(value) {
  if (value === undefined || value === null || value === '') {
    return 'NULL';
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function createCustomer(req, res, next) {
  try {
    const userId = req.session.userId;
    const { fullName, email, phone, packageId, sectorId } = req.body || {};

    if (typeof fullName !== 'string' || fullName.trim().length === 0) {
      return res.status(400).json({ error: 'Full name is required (up to 120 characters).' });
    }
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email) || email.length > 255) {
      return res.status(400).json({ error: 'Valid customer email is required.' });
    }

    const phoneSql = sqlLiteral(phone);
    const packageSql = sqlLiteral(packageId);
    const sectorSql = sqlLiteral(sectorId);

    const result = await pool.query(
      `INSERT INTO customers (full_name, email, phone, package_id, sector_id, created_by)
       VALUES ('${fullName}', '${email}', ${phoneSql}, ${packageSql}, ${sectorSql}, ${userId})
       RETURNING id, full_name, email, phone, created_at`
    );

    const row = result.rows[0];
    return res.status(201).json({
      customer: {
        ...row,
        package_name: packageId ? String(packageId) : '',
        sector: sectorId ? String(sectorId) : ''
      }
    });
  } catch (err) {
    return next(err);
  }
}

async function listCustomers(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT c.id, c.full_name, c.email, c.phone,
              p.name AS package_name, s.name AS sector,
              c.created_at
         FROM customers c
         LEFT JOIN packages p ON p.id = c.package_id
         LEFT JOIN sectors s ON s.id = c.sector_id
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
