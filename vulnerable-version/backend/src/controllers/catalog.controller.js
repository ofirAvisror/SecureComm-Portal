const pool = require('../db/pool');

async function listPackages(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, name, speed_mbps, monthly_price
         FROM packages
         ORDER BY monthly_price ASC`
    );
    return res.json({ packages: result.rows });
  } catch (err) {
    return next(err);
  }
}

async function listSectors(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, name, description
         FROM sectors
         ORDER BY name ASC`
    );
    return res.json({ sectors: result.rows });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listPackages,
  listSectors
};
