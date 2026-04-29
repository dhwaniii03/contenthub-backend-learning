import jwt from "jsonwebtoken";
import crypto from "crypto";

/**
 * Generate a UUID to use as the session JTI.
 * This stays constant for the lifetime of the session.
 */
export const generateJTI = () => crypto.randomUUID();

/**
 * Access token — short-lived JWT that includes jti.
 * Call generateJTI() first and pass the result here.
 */
export const generateAccessToken = (user, jti) => {
  return jwt.sign(
    { jti, id: user.id, email: user.email, role: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" },
  );
};

/**
 * Refresh token — secure random bytes (NOT a JWT).
 * Never stored in plain text; always hashed before DB insert.
 */
export const generateRefreshToken = () =>
  crypto.randomBytes(40).toString("hex");

/**
 * SHA-256 hash a token for safe DB storage.
 */
export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

/**
 * 2FA temporary token — short-lived, single-purpose.
 */
export const generate2FAToken = (userId) => {
  return jwt.sign(
    { type: "2fa", userId },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.TWO_FA_TOKEN_EXPIRY || "5m" },
  );
};

/**
 * Returns an absolute Date 7 days from now — used as session expiry.
 */
export const getSessionExpiry = () =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

