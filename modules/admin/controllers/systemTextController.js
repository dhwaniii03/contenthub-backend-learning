import prisma from "../../../utils/prismaClient.js";
import {
  successResponseWithData,
  ErrorResponse,
  validationErrorWithData,
  unsuccessResponseWithoutData,
  notFoundResponse,
} from "../../../utils/apiResponse.js";
import {
  saveSystemTextSchema,
  updateSystemTextSchema,
} from "../../../validators/systemTextValidator.js";
import mediaService from "../../../utils/mediaService.js";
import eventBus from "../../../utils/eventBus.js";


/**
 * GET /api/admin/system-texts
 * List all system keys with their page names and basic translation status.
 */
export const getAllSystemTexts = async (req, res) => {
  const {
    search,
    pageNameId,
    languageCode,
    type,
    page = 1,
    limit = 10,
  } = req.query;

  try {
    const limitNumber = Math.min(parseInt(limit, 10) || 10, 100);
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (pageNumber - 1) * limitNumber;

    const whereClause = {
      isDeleted: false,
    };

    if (pageNameId) whereClause.pageNameId = pageNameId;
    if (type) whereClause.type = type.toUpperCase();

    // Search logic: matches key name OR translation content
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        {
          translations: {
            some: {
              content: { contains: search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    // Language Filter: Only show keys that have this translation
    if (languageCode) {
      whereClause.translations = {
        some: {
          languageCode: languageCode,
        },
      };
    }

    const [totalCount, keys] = await Promise.all([
      prisma.systemKey.count({ where: whereClause }),
      prisma.systemKey.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNumber,
        include: {
          page: true,
          media: {
            select: { id: true, url: true, name: true, fileType: true },
          },
          translations: {
            select: { languageCode: true, content: true },
          },
        },
      }),
    ]);

    const results = keys.map((k) => {
      const primaryTranslation = languageCode
        ? k.translations.find((t) => t.languageCode === languageCode)
        : k.translations.find((t) => t.languageCode === "en") ||
          k.translations[0];

      return {
        id: k.id,
        name: k.name,
        textContent: primaryTranslation?.content || "",
        pageName: k.page?.pageName || "Uncategorized",
        pageNameId: k.pageNameId,
        type: k.type,
        description: k.description || "",
        availableLanguages: k.translations.map((t) =>
          t.languageCode.toUpperCase(),
        ),
        media: k.media,
        lastUpdated: k.updatedAt.toISOString().split("T")[0],
      };
    });

    return await successResponseWithData(res, "success_generic", {
      results,
      pagination: {
        totalCount,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalCount / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get all system texts error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

/**
 * POST /api/admin/system-texts
 * Create a new System Key and its initial translations.
 */
export const saveSystemText = async (req, res) => {
  try {
    // Handle translations if they arrive as a JSON string (typical for multipart/form-data)
    if (typeof req.body.translations === "string") {
      try {
        req.body.translations = JSON.parse(req.body.translations);
      } catch (e) {
        return await validationErrorWithData(res, "error_validation_failed", [
          { message: "Invalid translations JSON format" },
        ]);
      }
    }

    const parsed = saveSystemTextSchema.safeParse(req.body);
    if (!parsed.success) {
      return await validationErrorWithData(
        res,
        "error_validation_failed",
        parsed.error.issues,
      );
    }

    const {
      name,
      pageNameId,
      type,
      description,
      status: globalStatus,
      translations,
      media,
    } = parsed.data;

    // Handle Media (Hybrid: file or UUID)
    const finalMediaId = await mediaService.handleMediaField(
      "media",
      media,
      req.files,
      { name: `system-${name}` },
    );

    // Check if key already exists
    const existingKey = await prisma.systemKey.findUnique({
      where: { name },
    });
    if (existingKey) {
      return await unsuccessResponseWithoutData(res, "error_already_exists");
    }

    // Create Key and Translations in a transaction
    const newKey = await prisma.$transaction(async (tx) => {
      const key = await tx.systemKey.create({
        data: {
          name,
          pageNameId,
          type,
          description,
          mediaId: finalMediaId || null,
          isPredefined: false,
          translations: {
            create: (translations || []).map((t) => {
              const effectiveStatus = globalStatus || t.status || "PUBLISHED";
              const isPublished = effectiveStatus === "PUBLISHED";
              return {
                languageCode: t.languageCode,
                content: isPublished ? t.content : null,
                draftContent: t.content,
                status: effectiveStatus,
              };
            }),
          },
        },
        include: {
          translations: true,
          page: true,
          media: true,
        },
      });
      return key;
    });

    // Audit Context
    res.locals.afterData = newKey;
    res.locals.entityId = newKey.id;
    res.locals.entityType = "SystemKey";

    eventBus.emit("data:created", {
      module: "SYSTEM_TEXT",
      title: "System Text Created",
      message: `System text key "${newKey.name}" has been created.`,
      userId: req.user.id,
      data: { id: newKey.id, name: newKey.name }
    });

    return await successResponseWithData(res, "success_created", newKey);

  } catch (error) {
    console.error("Save system text error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

/**
 * GET /api/admin/system-texts/:id
 */
export const getSystemTextById = async (req, res) => {
  const { id } = req.params;

  try {
    const key = await prisma.systemKey.findFirst({
      where: { id, isDeleted: false },
      include: {
        page: true,
        translations: true,
        media: true,
      },
    });

    if (!key) {
      return await notFoundResponse(res, "error_not_found");
    }

    return await successResponseWithData(res, "success_generic", key);
  } catch (error) {
    console.error("Get system text by ID error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

/**
 * PATCH /api/admin/system-texts/:id
 * Update Key details and synchronize translations.
 */
export const updateSystemText = async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.systemKey.findFirst({
      where: { id, isDeleted: false },
      include: { translations: true, page: true, media: true },
    });

    if (!existing) {
      return await notFoundResponse(res, "error_not_found");
    }

    // Audit Context: capture before state
    res.locals.beforeData = existing;
    res.locals.entityId = id;
    res.locals.entityType = "SystemKey";

    // Handle translations if they arrive as a JSON string
    if (typeof req.body.translations === "string") {
      try {
        req.body.translations = JSON.parse(req.body.translations);
      } catch (e) {
        return await validationErrorWithData(res, "error_validation_failed", [
          { message: "Invalid translations JSON format" },
        ]);
      }
    }

    const parsed = updateSystemTextSchema.safeParse(req.body);
    if (!parsed.success) {
      return await validationErrorWithData(
        res,
        "error_validation_failed",
        parsed.error.issues,
      );
    }

    const {
      name,
      pageNameId,
      type,
      description,
      status: globalStatus,
      translations,
      media,
    } = parsed.data;

    // Block renaming if it's a predefined system key
    if (name && name !== existing.name && existing.isPredefined) {
      return await unsuccessResponseWithoutData(
        res,
        "error_forbidden",
        "Cannot rename predefined system keys",
      );
    }

    // Check if new name is already taken
    if (name && name !== existing.name) {
      const nameConflict = await prisma.systemKey.findUnique({
        where: { name },
      });
      if (nameConflict) {
        return await unsuccessResponseWithoutData(
          res,
          "error_already_exists",
          "Key name already in use",
        );
      }
    }

    // Handle Media (Hybrid: file or UUID)
    const finalMediaId = await mediaService.handleMediaField(
      "media",
      media,
      req.files,
      { name: `system-${name || existing.name}` },
    );

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update Key metadata
      const updateData = {
        name,
        pageNameId,
        type,
        description,
      };

      if (finalMediaId !== undefined) {
        updateData.mediaId = finalMediaId;
      }

      const key = await tx.systemKey.update({
        where: { id },
        data: updateData,
      });

      // 2. Synchronize Translations (upsert based on languageCode)
      if (translations && translations.length > 0) {
        for (const t of translations) {
          const effectiveStatus = globalStatus || t.status || "PUBLISHED";
          const isPublished = effectiveStatus === "PUBLISHED";

          await tx.systemTranslation.upsert({
            where: {
              keyId_languageCode: {
                keyId: id,
                languageCode: t.languageCode,
              },
            },
            update: {
              content: isPublished ? t.content : undefined,
              draftContent: t.content,
              status: effectiveStatus,
            },
            create: {
              keyId: id,
              languageCode: t.languageCode,
              content: isPublished ? t.content : null,
              draftContent: t.content,
              status: effectiveStatus,
            },
          });
        }
      }

      return await tx.systemKey.findUnique({
        where: { id },
        include: { translations: true, page: true, media: true },
      });
    });

    // Audit Context: capture after state
    res.locals.afterData = updated;

    eventBus.emit("data:updated", {
      module: "SYSTEM_TEXT",
      title: "System Text Updated",
      message: `System text key "${updated.name}" has been updated.`,
      userId: req.user.id,
      data: { id: updated.id, name: updated.name }
    });

    return await successResponseWithData(res, "success_updated", updated);

  } catch (error) {
    console.error("Update system text error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

/**
 * DELETE /api/admin/system-texts (Bulk / Single handled by body)
 */
export const deleteSystemText = async (req, res) => {
  const { id } = req.params;
  const { ids } = req.body; // Support both path param and bulk body

  const targetIds = ids || (id ? [id] : []);

  if (!Array.isArray(targetIds) || targetIds.length === 0) {
    return await unsuccessResponseWithoutData(res, "error_bad_request");
  }

  // Audit Context
  res.locals.entityType = "SystemKey";
  res.locals.metadata = { targetIds, count: targetIds.length };

  try {
    const result = await prisma.systemKey.updateMany({
      where: {
        id: { in: targetIds },
        isDeleted: false,
      },
      data: { isDeleted: true },
    });

    if (result.count === 0) {
      return await notFoundResponse(res, "error_not_found");
    }

    eventBus.emit("data:deleted", {
      module: "SYSTEM_TEXT",
      title: "System Text Deleted",
      message: `${result.count} system text(s) have been deleted.`,
      userId: req.user.id,
      data: { deletedIds: targetIds }
    });

    return await successResponseWithData(res, "success_deleted", null);

  } catch (error) {
    console.error("Delete system text error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

/**
 * GET /api/admin/system-texts/page-names
 * Helper to populate dropdowns.
 */
export const getPageNames = async (req, res) => {
  try {
    const pages = await prisma.pageName.findMany({
      orderBy: { pageName: "asc" },
    });
    return await successResponseWithData(res, "success_generic", pages);
  } catch (error) {
    return await ErrorResponse(res, "error_internal_server");
  }
};
