import express from "express";
import { getAuditLogs } from "../../modules/admin/controllers/auditController.js";
import { auth, authorizeRole } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// Audit routes require admin authentication
router.use(auth, authorizeRole("admin"));

/**
 * @swagger
 * /api/admin/audit-logs:
 *   get:
 *     summary: Retrieve paginated audit logs (Latest First)
 *     tags: [Audit Logs]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 */
router.get("/", getAuditLogs);

export default router;
