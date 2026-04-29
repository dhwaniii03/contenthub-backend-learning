import express from "express";
import {
  login,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  refreshAccessToken,
  logout,
  getActiveSessions,
  revokeSession,
  logoutAllSessions,
} from "../../modules/admin/controllers/adminAuthController.js";
import { auth } from "../../middlewares/authMiddleware.js";
import { withAudit } from "../../middlewares/auditMiddleware.js";
import { validate } from "../../middlewares/validateMiddleware.js";
import {
  loginSchema,
  forgotPasswordSchema,
  verifyResetTokenSchema,
  resetPasswordSchema,
} from "../../validators/authValidator.js";

const router = express.Router();

/**
 * @swagger
 * /api/admin/auth/login:
 *   post:
 *     summary: Admin Login
 *     tags: [Admin Auth]
 *     parameters:
 *       - in: header
 *         name: x-lang
 *         schema:
 *           type: string
 *         description: Language code (e.g., 'en', 'es', 'hi')
 *         example: es
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@contenthub.com
 *               password:
 *                 type: string
 *                 example: Admin@123
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post(
  "/login",
  validate(loginSchema),
  withAudit(login, { action: "LOGIN", module: "AUTH", entityType: "Admin", description: "Admin login attempt" })
);

/**
 * @swagger
 * /api/admin/auth/forgot-password:
 *   post:
 *     summary: Admin Forgot Password
 *     tags: [Admin Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@stefan-contenthub.io
 *     responses:
 *       200:
 *         description: Reset email sent
 */
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);

/**
 * @swagger
 * /api/admin/auth/verify-reset-token:
 *   post:
 *     summary: Verify Password Reset Token
 *     tags: [Admin Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: 3e8a... (UUID)
 *     responses:
 *       200:
 *         description: Token verified
 *       400:
 *         description: Invalid or expired token
 */
router.post("/verify-reset-token", validate(verifyResetTokenSchema), verifyResetToken);

/**
 * @swagger
 * /api/admin/auth/reset-password:
 *   post:
 *     summary: Reset Admin Password
 *     tags: [Admin Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: 3e8a... (UUID)
 *               newPassword:
 *                 type: string
 *                 example: NewSecurePass@123
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid request
 */
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

/**
 * @swagger
 * /api/admin/auth/refresh-token:
 *   post:
 *     summary: Refresh Access Token
 *     tags: [Admin Auth]
 *     parameters:
 *       - in: cookie
 *         name: refreshToken
 *         schema:
 *           type: string
 *         required: true
 *         description: The HttpOnly refresh token
 *     responses:
 *       200:
 *         description: New access token generated
 *       401:
 *         description: Unauthorized
 */
router.post("/refresh-token", refreshAccessToken);

/**
 * @swagger
 * /api/admin/auth/logout:
 *   post:
 *     summary: Admin Logout
 *     tags: [Admin Auth]
 *     parameters:
 *       - in: cookie
 *         name: refreshToken
 *         schema:
 *           type: string
 *         description: The HttpOnly refresh token to invalidate
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post(
  "/logout",
  withAudit(logout, { action: "LOGOUT", module: "AUTH", entityType: "Admin", description: "Admin logout" })
);

/**
 * @swagger
 * /api/admin/auth/sessions:
 *   get:
 *     summary: List all active sessions for the current user
 *     tags: [Admin Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active sessions retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/sessions", auth, getActiveSessions);

/**
 * @swagger
 * /api/admin/auth/sessions/revoke:
 *   post:
 *     summary: Revoke a specific session
 *     tags: [Admin Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tokenId
 *             properties:
 *               tokenId:
 *                 type: string
 *                 description: The jti/tokenId of the session to revoke
 *     responses:
 *       200:
 *         description: Session revoked successfully
 *       404:
 *         description: Session not found
 */
router.post("/sessions/revoke", auth, revokeSession);

/**
 * @swagger
 * /api/admin/auth/sessions/logout-all:
 *   post:
 *     summary: Logout from all devices (including current)
 *     tags: [Admin Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All sessions revoked successfully
 */
router.post("/sessions/logout-all", auth, logoutAllSessions);

export default router;
