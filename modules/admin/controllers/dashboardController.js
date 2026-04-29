import prisma from "../../../utils/prismaClient.js";
import {
  successResponseWithData,
  ErrorResponse,
} from "../../../utils/apiResponse.js";

/**
 * GET /api/admin/dashboard/stats
 * Fetch counts for core modules.
 */
export const getDashboardStats = async (req, res) => {
  try {
    const [contentCount, collectionCount, mediaCount, schemaCount] = await Promise.all([
      prisma.content.count({ where: { isDeleted: false } }),
      prisma.collection.count({ where: { isDeleted: false } }),
      prisma.media.count({ where: { isDeleted: false } }),
      prisma.metadataSchema.count({ where: { isDeleted: false } }),
    ]);

    const stats = {
      totalContent: contentCount,
      totalCollections: collectionCount,
      totalMedia: mediaCount,
      totalMetadataSchemas: schemaCount,
    };

    return await successResponseWithData(res, "success_generic", stats);
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};
