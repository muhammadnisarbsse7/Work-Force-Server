const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT) || 587,
  secure:false, // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"Auth System" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
};

const sendVerificationEmail = (to, token) =>
  sendEmail({
    to,
    subject: 'Verify your email address',
    html: `
      <h2>Email Verification</h2>
      <p>Click the link below to verify your email. This link expires in <strong>24 hours</strong>.</p>
      <a href="${process.env.BACKEND_URL || process.env.CLIENT_URL}/api/auth/verify-email/${token}">Verify Email</a>

      <p>If you did not create an account, ignore this email.</p>
    `,
  });

const sendPasswordResetEmail = (to, token) =>
  sendEmail({
    to,
    subject: 'Password reset request',
    html: `
      <h2>Password Reset</h2>
      <p>Click the link below to reset your password. This link expires in <strong>10 minutes</strong>.</p>
      <a href="${process.env.BACKEND_URL || process.env.CLIENT_URL}/api/auth/reset-password/${token}">Reset Password</a>

      <p>If you did not request this, ignore this email and your password will remain unchanged.</p>
    `,
  });

module.exports = { sendVerificationEmail, sendPasswordResetEmail };