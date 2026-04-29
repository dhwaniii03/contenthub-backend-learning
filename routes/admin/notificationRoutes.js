import express from "express";
import {
  getMyNotifications,
  markAllAsRead,
} from "../../modules/admin/controllers/notificationController.js";
import { auth, authorizeRole } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.use(auth, authorizeRole("admin"));

/**
 * @swagger
 * /api/admin/notifications:
 *   get:
 *     summary: Get notifications for the current admin
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications retrieved successfully
 *       401:
 *         description: Unauthorized - Token missing or invalid
 */
router.get("/", getMyNotifications);

/**
 * @swagger
 * /api/admin/notifications/mark-all-read:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401:
 *         description: Unauthorized
 */
router.patch("/mark-all-read", markAllAsRead);


export default router;
