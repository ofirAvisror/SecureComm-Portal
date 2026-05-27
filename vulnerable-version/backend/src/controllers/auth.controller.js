// auth.controller.js — PART B: deliberate SQL injection in register (section 1) and login (section 3).
const pool = require('../db/pool');
const passwordService = require('../services/password.service');
const tokenService = require('../services/token.service');
const emailService = require('../services/email.service');
const { passwordPolicy } = require('../config');

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,64}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidUsername(value) {
  return typeof value === 'string' && USERNAME_REGEX.test(value);
}

function isValidEmail(value) {
  return typeof value === 'string' && EMAIL_REGEX.test(value) && value.length <= 255;
}

async function register(req, res, next) {
  try {
    const { username, email, password } = req.body || {};

    // Username validation disabled intentionally for Part B SQLi demos (section 1).
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    const passwordErrors = await passwordService.validateNewPassword(null, password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ error: passwordErrors[0], errors: passwordErrors });
    }

    const safeUsername = username.replace(/'/g, "''");
    const safeEmail = email.replace(/'/g, "''");

    const existing = await pool.query(
        `SELECT id FROM users WHERE username = '${safeUsername}' OR email = '${safeEmail}' LIMIT 1`
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Username or email already in use.' });
    }

    const salt = passwordService.generateSalt();
    const hash = passwordService.hashPassword(password, salt);

    const insertResult = await pool.query(
        `INSERT INTO users (username, email, password_hash, password_salt)
         VALUES ('${safeUsername}', '${safeEmail}', '${hash}', '${salt}')
           RETURNING id, username, email, created_at`
    );
    const user = insertResult.rows[0];

    await passwordService.recordPasswordHistory(user.id, hash, salt);

    req.session.userId = user.id;
    req.session.username = user.username;

    return res.status(201).json({ user });
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const result = await pool.query(
        `SELECT id, username, email, password_hash, password_salt, failed_attempts, locked_until
         FROM users
         WHERE username = '${username}'
           LIMIT 1`
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User does not exist.' });
    }
    const user = result.rows[0];

    const lockoutPolicy = passwordPolicy.lockout || {};
    const lockoutEnabled = !!lockoutPolicy.enabled;
    const maxAttempts = lockoutPolicy.maxAttempts || 3;
    const lockMinutes = lockoutPolicy.lockMinutes || 15;

    if (lockoutEnabled && user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      return res.status(423).json({
        error: `Account is locked. Try again later.`,
        lockedUntil: user.locked_until
      });
    }

    const passwordOk = passwordService.verifyPassword(password, user.password_salt, user.password_hash);

    if (!passwordOk) {
      let nextFailed = user.failed_attempts + 1;
      let lockedUntil = null;
      let responseStatus = 401;
      let responseError = 'Invalid password.';

      if (lockoutEnabled && nextFailed >= maxAttempts) {
        lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
        responseStatus = 423;
        responseError = `Too many failed attempts. Account is locked for ${lockMinutes} minutes.`;
      }

      await pool.query(
        `UPDATE users
            SET failed_attempts = $1,
                locked_until    = $2
          WHERE id = $3`,
        [nextFailed, lockedUntil, user.id]
      );

      return res.status(responseStatus).json({ error: responseError });
    }

    if (user.failed_attempts !== 0 || user.locked_until) {
      await pool.query(
        `UPDATE users
            SET failed_attempts = 0,
                locked_until    = NULL
          WHERE id = $1`,
        [user.id]
      );
    }

    req.session.regenerate(err => {
      if (err) {
        return next(err);
      }
      req.session.userId = user.id;
      req.session.username = user.username;
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    });
  } catch (err) {
    return next(err);
  }
}

async function logout(req, res, next) {
  if (!req.session) {
    return res.json({ ok: true });
  }
  req.session.destroy(err => {
    if (err) {
      return next(err);
    }
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
}

async function me(req, res, next) {
  try {
    const userId = req.session && req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const result = await pool.query(
      `SELECT id, username, email, created_at FROM users WHERE id = $1`,
      [userId]
    );
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    return res.json({ user: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const userId = req.session.userId;
    const { currentPassword, newPassword } = req.body || {};

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'Current and new passwords are required.' });
    }

    const result = await pool.query(
      `SELECT id, username, email, password_hash, password_salt
         FROM users
         WHERE id = $1`,
      [userId]
    );
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const user = result.rows[0];

    const passwordOk = passwordService.verifyPassword(
      currentPassword,
      user.password_salt,
      user.password_hash
    );
    if (!passwordOk) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from the current password.' });
    }

    const errors = await passwordService.validateNewPassword(user.id, newPassword);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors[0], errors });
    }

    const salt = passwordService.generateSalt();
    const hash = passwordService.hashPassword(newPassword, salt);

    await pool.query(
      `UPDATE users
          SET password_hash = $1,
              password_salt = $2,
              failed_attempts = 0,
              locked_until = NULL
        WHERE id = $3`,
      [hash, salt, user.id]
    );

    await passwordService.recordPasswordHistory(user.id, hash, salt);

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body || {};
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    const result = await pool.query(
      `SELECT id, username, email FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );

    const genericResponse = { ok: true, message: 'If the email is registered, a reset code has been sent.' };

    if (result.rowCount === 0) {
      return res.json(genericResponse);
    }
    const user = result.rows[0];

    const { rawToken, expiresAt } = await tokenService.createResetToken(user.id);

    try {
      await emailService.sendPasswordResetEmail({
        to: user.email,
        username: user.username,
        rawToken,
        expiresAt
      });
    } catch (mailErr) {
      console.error('Failed to send reset email:', mailErr.message);
      return res.status(500).json({ error: 'Failed to send reset email. Please try again later.' });
    }

    return res.json(genericResponse);
  } catch (err) {
    return next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body || {};
    if (typeof token !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    const tokenRecord = await tokenService.consumeResetToken(token);
    if (!tokenRecord) {
      return res.status(400).json({ error: 'Reset code is invalid or has expired.' });
    }

    const errors = await passwordService.validateNewPassword(tokenRecord.userId, newPassword);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors[0], errors });
    }

    const salt = passwordService.generateSalt();
    const hash = passwordService.hashPassword(newPassword, salt);

    await pool.query(
      `UPDATE users
          SET password_hash = $1,
              password_salt = $2,
              failed_attempts = 0,
              locked_until = NULL
        WHERE id = $3`,
      [hash, salt, tokenRecord.userId]
    );

    await passwordService.recordPasswordHistory(tokenRecord.userId, hash, salt);
    await tokenService.markTokenUsed(tokenRecord.id);

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

function getPasswordPolicy(req, res) {
  const policy = passwordPolicy;
  res.json({
    minLength: policy.minLength,
    requireUppercase: policy.requireUppercase,
    requireLowercase: policy.requireLowercase,
    requireDigit: policy.requireDigit,
    requireSpecial: policy.requireSpecial,
    blockCommonPasswords: policy.blockCommonPasswords,
    history: policy.history,
    lockout: policy.lockout
  });
}

module.exports = {
  register,
  login,
  logout,
  me,
  changePassword,
  forgotPassword,
  resetPassword,
  getPasswordPolicy
};
