import prisma from "../../../utils/prismaClient.js";
import { successResponseWithData, ErrorResponse } from "../../../utils/apiResponse.js";

/**
 * GET /api/admin/audit-logs
 * Simple paginated fetch of audit logs.
 */
export const getAuditLogs = async (req, res) => {
  const { page = 1, limit = 5 } = req.query;

  try {
    const limitNumber = Math.min(parseInt(limit, 10) || 5, 100);
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (pageNumber - 1) * limitNumber;

    const [totalCount, logs] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNumber,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        }
      })
    ]);

    const results = logs.map(log => ({
      id: log.id,
      action: log.action,
      module: log.module,
      entityType: log.entityType,
      entityId: log.entityId,
      description: log.description,
      changes: log.changes,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      status: log.status,
      timestamp: log.createdAt,
      user: log.user ? {
        id: log.user.id,
        name: log.user.fullName || "Admin",
        email: log.user.email
      } : null
    }));

    return await successResponseWithData(res, "success_generic", {
      results,
      pagination: {
        totalCount,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalCount / limitNumber)
      }
    });
  } catch (error) {
    console.error("Get audit logs error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};
