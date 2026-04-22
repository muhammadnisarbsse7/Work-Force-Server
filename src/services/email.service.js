
// const nodemailer = require('nodemailer');

// const transporter = nodemailer.createTransport({
//   host:   process.env.SMTP_HOST,
//   port:   Number(process.env.SMTP_PORT) || 587,
//   secure: process.env.SMTP_PORT === '465',
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//   },
// });

// const sendEmail = async ({ to, subject, html }) => {
//   await transporter.sendMail({
//     from: `"Workforce Ease" <${process.env.SMTP_USER}>`,
//     to,
//     subject,
//     html,
//   });
// };

// const sendVerificationEmail = (to, token) =>
//   sendEmail({
//     to,
//     subject: 'Verify your email address',
//     html: `
//       <div style="font-family:sans-serif;max-width:480px;margin:auto">
//         <h2>Email Verification</h2>
//         <p>Click the link below to verify your email.
//            This link expires in <strong>24 hours</strong>.</p>
//         <a href="${process.env.BACKEND_URL || process.env.CLIENT_URL}/api/auth/verify-email/${token}"
//            style="display:inline-block;padding:12px 24px;background:#e75d50;
//                   color:#fff;border-radius:8px;text-decoration:none">
//           Verify Email
//         </a>
//         <p style="color:#888;font-size:12px;margin-top:24px">
//           If you did not create an account, ignore this email.
//         </p>
//       </div>
//     `,
//   });

// // ─── Password reset email — token embedded in the frontend route ─────────────
// const sendPasswordResetEmail = (to, token) =>
//   sendEmail({
//     to,
//     subject: 'Reset your password — expires in 10 minutes',
//     html: `
//       <div style="font-family:sans-serif;max-width:480px;margin:auto">
//         <h2>Reset Your Password</h2>
//         <p>Click the button below to set a new password.
//            This link expires in <strong>10 minutes</strong>.</p>
//         <a href="${process.env.BACKEND_URL || process.env.CLIENT_URL}/api/auth/reset-password/${token}"
//            style="display:inline-block;padding:12px 24px;background:#e75d50;
//                   color:#fff;border-radius:8px;text-decoration:none">
//           Reset Password
//         </a>
//         <p style="color:#888;font-size:12px;margin-top:16px">
//           If you did not request this, ignore this email —
//           your password will remain unchanged.
//         </p>
//         <p style="color:#bbb;font-size:11px">
//           This link will expire at
//           ${new Date(Date.now() + 10 * 60 * 1000).toUTCString()}
//         </p>
//       </div>
//     `,
//   });

// module.exports = { sendVerificationEmail, sendPasswordResetEmail };

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"Workforce Ease" <${process.env.SMTP_USER}>`,
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
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
        <h2 style="color:#414141">Verify your email</h2>
        <p style="color:#666">Click below to verify. Expires in <strong>24 hours</strong>.</p>
        <a href="${'https://work-force-five.vercel.app/'}/verify-email/${token}"
           style="display:inline-block;padding:12px 28px;background:#e75d50;
                  color:#fff;border-radius:10px;text-decoration:none;margin:16px 0">
          Verify Email
        </a>
        <p style="color:#999;font-size:12px">If you did not create an account, ignore this email.</p>
      </div>
    `,
  });

const sendPasswordResetEmail = (to, token) => {
  const resetUrl  = `${process.env.CLIENT_URL}/reset-password/${token}`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit',
  });

  return sendEmail({
    to,
    subject: 'Reset your Workforce Ease password',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
        <h2 style="color:#414141">Reset your password</h2>
        <p style="color:#666">
          Someone requested a password reset for your account.
          Click the button below — this link expires at <strong>${expiresAt}</strong> (10 minutes).
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:12px 28px;background:#e75d50;
                  color:#fff;border-radius:10px;text-decoration:none;margin:16px 0;
                  font-weight:600">
          Reset Password
        </a>
        <p style="color:#999;font-size:13px">
          Or copy this link into your browser:<br/>
          <span style="color:#e75d50">${resetUrl}</span>
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#bbb;font-size:11px">
          If you did not request this, ignore this email — your password will remain unchanged.
        </p>
      </div>
    `,
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };