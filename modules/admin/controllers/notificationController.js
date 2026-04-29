import prisma from "../../../utils/prismaClient.js";
import {
  successResponseWithData,
  ErrorResponse,
  notFoundResponse,
} from "../../../utils/apiResponse.js";

/**
 * GET /api/admin/notifications
 * Fetch notifications for the current user with pagination
 */
export const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const parsedLimit = Math.min(parseInt(limit, 10) || 20, 100);
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const where = { userId };
    if (unreadOnly === "true" || unreadOnly === true) {
      where.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: parsedLimit,
      }),
      prisma.notification.count({ where }),
    ]);

    return await successResponseWithData(res, "success_generic", {
      notifications,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};


/**
 * PATCH /api/admin/notifications/mark-all-read
 * Mark all notifications for the current user as read
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return await successResponseWithData(res, "success_updated");
  } catch (error) {
    console.error("Mark all read error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};
