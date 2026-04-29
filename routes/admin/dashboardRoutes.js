import express from "express";
import { auth, authorizeRole } from "../../middlewares/authMiddleware.js";
import { getDashboardStats } from "../../modules/admin/controllers/dashboardController.js";

const router = express.Router();

// All dashboard routes are admin-only
/**
 * @swagger
 * /api/admin/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Returns counts for content, collections, media, and metadata schemas.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved successfully.
 *       401:
 *         description: Unauthorized.
 */
router.get("/stats", auth, authorizeRole("admin"), getDashboardStats);

export default router;
