const crypto = require('crypto');
const pool = require('../db/pool');
const { passwordPolicy, commonPasswords } = require('../config');

const SPECIAL_CHARS_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/;
const UPPER_REGEX = /[A-Z]/;
const LOWER_REGEX = /[a-z]/;
const DIGIT_REGEX = /[0-9]/;

function getPepper() {
  const pepper = process.env.PEPPER;
  if (!pepper) {
    throw new Error('PEPPER environment variable is not configured');
  }
  return pepper;
}

function generateSalt() {
  return crypto.randomBytes(32).toString('hex');
}

function hashPassword(plainPassword, salt) {
  return crypto
    .createHmac('sha256', getPepper())
    .update(salt + plainPassword)
    .digest('hex');
}

function verifyPassword(plainPassword, salt, expectedHash) {
  const computed = hashPassword(plainPassword, salt);
  const a = Buffer.from(computed, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function validateComplexity(plainPassword) {
  const errors = [];
  const policy = passwordPolicy;

  if (typeof plainPassword !== 'string' || plainPassword.length === 0) {
    errors.push('Password is required.');
    return errors;
  }

  if (plainPassword.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long.`);
  }
  if (policy.requireUppercase && !UPPER_REGEX.test(plainPassword)) {
    errors.push('Password must contain at least one uppercase letter.');
  }
  if (policy.requireLowercase && !LOWER_REGEX.test(plainPassword)) {
    errors.push('Password must contain at least one lowercase letter.');
  }
  if (policy.requireDigit && !DIGIT_REGEX.test(plainPassword)) {
    errors.push('Password must contain at least one digit.');
  }
  if (policy.requireSpecial && !SPECIAL_CHARS_REGEX.test(plainPassword)) {
    errors.push('Password must contain at least one special character.');
  }
  if (policy.blockCommonPasswords && commonPasswords.has(plainPassword.toLowerCase())) {
    errors.push('Password is too common. Please choose a stronger password.');
  }

  return errors;
}

async function checkAgainstHistory(userId, plainPassword) {
  const policy = passwordPolicy.history;
  if (!policy || !policy.enabled) {
    return null;
  }
  const limit = Math.max(policy.previousCount || 0, 0);
  if (limit === 0) {
    return null;
  }

  const result = await pool.query(
    `SELECT password_hash, password_salt
       FROM password_history
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
    [userId, limit]
  );

  for (const row of result.rows) {
    if (verifyPassword(plainPassword, row.password_salt, row.password_hash)) {
      return `Password must be different from the last ${limit} password(s).`;
    }
  }
  return null;
}

async function recordPasswordHistory(userId, passwordHash, passwordSalt) {
  await pool.query(
    `INSERT INTO password_history (user_id, password_hash, password_salt)
     VALUES ($1, $2, $3)`,
    [userId, passwordHash, passwordSalt]
  );
}

async function validateNewPassword(userId, plainPassword) {
  const errors = validateComplexity(plainPassword);
  if (errors.length > 0) {
    return errors;
  }
  if (userId) {
    const historyError = await checkAgainstHistory(userId, plainPassword);
    if (historyError) {
      return [historyError];
    }
  }
  return [];
}

module.exports = {
  generateSalt,
  hashPassword,
  verifyPassword,
  validateComplexity,
  validateNewPassword,
  recordPasswordHistory
};
