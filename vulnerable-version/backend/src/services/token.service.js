const crypto = require('crypto');
const pool = require('../db/pool');
const { passwordPolicy } = require('../config');

function generateRawToken() {
  return crypto.randomBytes(20).toString('hex');
}

function sha1(value) {
  return crypto.createHash('sha1').update(value).digest('hex');
}

async function createResetToken(userId) {
  const rawToken = generateRawToken();
  const tokenSha1 = sha1(rawToken);
  const expiryMinutes = passwordPolicy.resetTokenExpiryMinutes || 30;
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  await pool.query(
    `UPDATE password_resets
        SET used_at = COALESCE(used_at, now())
      WHERE user_id = $1
        AND used_at IS NULL`,
    [userId]
  );

  await pool.query(
    `INSERT INTO password_resets (user_id, token_sha1, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenSha1, expiresAt]
  );

  return { rawToken, tokenSha1, expiresAt };
}

async function consumeResetToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    return null;
  }
  const tokenSha1 = sha1(rawToken.trim());

  const result = await pool.query(
    `SELECT id, user_id, expires_at, used_at
       FROM password_resets
       WHERE token_sha1 = $1
       ORDER BY created_at DESC
       LIMIT 1`,
    [tokenSha1]
  );

  if (result.rowCount === 0) {
    return null;
  }
  const record = result.rows[0];
  if (record.used_at) {
    return null;
  }
  if (new Date(record.expires_at).getTime() < Date.now()) {
    return null;
  }
  return { id: record.id, userId: record.user_id };
}

async function markTokenUsed(tokenId) {
  await pool.query(
    `UPDATE password_resets SET used_at = now() WHERE id = $1`,
    [tokenId]
  );
}

module.exports = {
  createResetToken,
  consumeResetToken,
  markTokenUsed,
  sha1
};
