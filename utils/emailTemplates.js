export const emailTemplates = {
  PASSWORD_RESET: {
    subject: "Password Reset Request",
    content: `
      <h1>Password Reset</h1>
      <p>Hello {{name}},</p>
      <p>You requested a password reset. Please use the below  to reset your password:</p>
      <a href="{{reset_link}}">Reset Password</a>
      <p>This link will expire in 20 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  },
};
