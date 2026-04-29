import { getAdminProfile, updateAdminProfile, changePassword, toggleNotification } from "../../modules/admin/controllers/adminProfileController.js";
import { auth, authorizeRole } from "../../middlewares/authMiddleware.js";
import { withAudit } from "../../middlewares/auditMiddleware.js";
import { createUploader } from "../../middlewares/uploadMiddleware.js";
import express from "express";
const router = express.Router();

// Middleware: Authenticate and Authorize
router.use(auth, authorizeRole("admin"));

/**
 * @swagger
 * tags:
 *   name: Admin Profile
 *   description: Endpoints for admin user profile management
 */

/**
 * @swagger
 * /api/admin/profile:
 *   get:
 *     summary: Fetch the currently logged-in admin's profile.
 *     tags: [Admin Profile]
 *     responses:
 *       200:
 *         description: Profile fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Admin profile retrieved successfully.
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "550e8400-e29b-41d4-a716-446655440000"
 *                     email:
 *                       type: string
 *                       example: "admin@contenthub.com"
 *                     fullName:
 *                       type: string
 *                       example: "Super Admin"
 *                     phoneNumber:
 *                       type: string
 *                       example: "+91 98765 43210"
 *                     profilePicture:
 *                       type: string
 *                       example: "/public/uploads/profiles/admin.jpg"
 *                     bio:
 *                       type: string
 *                       example: "Lead administrator for ContentHub."
 *                     role:
 *                       type: string
 *                       example: "admin"
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     is2FAEnabled:
 *                       type: boolean
 *                       example: false
 *                     emailNotifications:
 *                       type: boolean
 *                       example: true
 *                     systemAlerts:
 *                       type: boolean
 *                       example: true
 *                     contentUpdateNotifications:
 *                       type: boolean
 *                       example: true
 *                     platformAnnouncements:
 *                       type: boolean
 *                       example: true
 *                     lastLogin:
 *                       type: string
 *                       format: date-time
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Profile not found.
 */
router.get("/", getAdminProfile);

/**
 * @swagger
 * /api/admin/profile:
 *   patch:
 *     summary: Update the currently logged-in admin's profile.
 *     tags: [Admin Profile]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               bio:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated successfully.
 *       400:
 *         description: Validation failed.
 */
router.patch(
    "/",
    createUploader("ADMIN_PROFILE").fields([
        { name: "profilePicture", maxCount: 1 }
    ]),
    withAudit({ action: "UPDATE_PROFILE", module: "ADMIN_PROFILE" }),
    updateAdminProfile
);

/**
 * @swagger
 * /api/admin/profile/change-password:
 *   post:
 *     summary: Change the currently logged-in admin's password.
 *     tags: [Admin Profile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully.
 *       400:
 *         description: Invalid current password or validation error.
 */
router.post("/change-password", withAudit({ action: "CHANGE_PASSWORD", module: "ADMIN_PROFILE" }), changePassword);

/**
 * @swagger
 * /api/admin/profile/toggle-notification:
 *   patch:
 *     summary: Toggle a specific notification setting.
 *     tags: [Admin Profile]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [emailNotifications, systemAlerts, contentUpdateNotifications, platformAnnouncements]
 *         required: true
 *         description: The name of the notification field to toggle.
 *     responses:
 *       200:
 *         description: Notification setting toggled successfully.
 */
router.patch("/toggle-notification", withAudit({ action: "TOGGLE_NOTIFICATION", module: "ADMIN_PROFILE" }), toggleNotification);

export default router;
