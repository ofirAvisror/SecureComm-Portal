const nodemailer = require('nodemailer');

let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP configuration is incomplete. Check SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });
  return cachedTransporter;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendPasswordResetEmail({ to, username, rawToken, expiresAt }) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const safeUsername = escapeHtml(username || '');
  const safeToken = escapeHtml(rawToken);
  const safeUrl = escapeHtml(resetUrl);
  const minutesLeft = Math.max(1, Math.round((expiresAt.getTime() - Date.now()) / 60000));

  const text = [
    `Hello ${username || ''},`,
    '',
    'A password reset was requested for your Comunication_LTD account.',
    `Your reset code: ${rawToken}`,
    `Or click the link: ${resetUrl}`,
    '',
    `This code expires in ${minutesLeft} minutes.`,
    'If you did not request this, you can ignore this email.'
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #222;">
      <h2>Password reset request</h2>
      <p>Hello ${safeUsername},</p>
      <p>A password reset was requested for your <strong>Comunication_LTD</strong> account.</p>
      <p>Your reset code:</p>
      <p style="font-family: monospace; font-size: 18px; padding: 10px; background: #f4f4f4; border: 1px solid #ddd; display: inline-block;">${safeToken}</p>
      <p>Or click the link below:</p>
      <p><a href="${safeUrl}">${safeUrl}</a></p>
      <p>This code expires in ${minutesLeft} minutes.</p>
      <p>If you did not request this, you can ignore this email.</p>
    </div>
  `;

  const info = await getTransporter().sendMail({
    from: process.env.MAIL_FROM || 'Comunication_LTD <noreply@example.com>',
    to,
    subject: 'Comunication_LTD password reset code',
    text,
    html
  });
  return info;
}

module.exports = {
  sendPasswordResetEmail
};
