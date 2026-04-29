import prisma from "../../../utils/prismaClient.js";
import {
  successResponseWithData,
  ErrorResponse,
  validationErrorWithData,
  unsuccessResponseWithoutData,
  notFoundResponse,
  forbiddenResponse,
} from "../../../utils/apiResponse.js";
import {
  addContentSchema,
  updateContentSchema,
  contentSelectionSearchSchema,
} from "../../../validators/contentValidator.js";
import { generateSlug, ensureUniqueSlug } from "../../../utils/slugHelper.js";
import { duplicateContentService } from "../../../services/contentService.js";
import eventBus from "../../../utils/eventBus.js";



/**
 * Helper to validate dynamic JSON content against MetadataSchema
 */
const validateDynamicContent = async (metadataSchema, content) => {
  const errors = [];
  const fieldsConfig = Array.isArray(metadataSchema.schema)
    ? metadataSchema.schema
    : metadataSchema.schema.fields || [];

  // Detailed Validation for defined fields

  for (const field of fieldsConfig) {
    const { key, name, validation, type } = field;

    // Handle validation being an array [ { required: true } ] or an object { required: true }
    const isRequired = Array.isArray(validation)
      ? validation.some((v) => v.required === true)
      : validation?.required === true;

    // Check translatable fields
    if (type === "text" || type === "longtext" || type === "richtext") {
      const fieldValue = content.fields?.[key];
      if (isRequired) {
        if (!fieldValue || Object.keys(fieldValue).length === 0) {
          errors.push({
            path: `content.fields.${key}`,
            message: `${name} is required`,
          });
        } else {
          // At least one language must have a non-empty string
          const hasValue = Object.values(fieldValue).some(
            (v) => v && v.toString().trim() !== "",
          );
          if (!hasValue) {
            errors.push({
              path: `content.fields.${key}`,
              message: `${name} must have a value in at least one language`,
            });
          }
        }
      }
    }

    // Check media fields (Non-translatable in this design)
    if (type === "media") {
      const mediaEntry = content.media?.find((m) => m[key]);
      const mediaId = mediaEntry ? mediaEntry[key] : null;

      if (isRequired && !mediaId) {
        errors.push({
          path: `content.media.${key}`,
          message: `${name} is required`,
        });
      }

      // Strictly validate if Media IDs exist and follow UUID format
      if (mediaId) {
        const ids = Array.isArray(mediaId) ? mediaId : [mediaId];

        // 1. Format check: Ensure they are valid UUID strings
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const invalidFormat = ids.some((id) => !uuidRegex.test(id));
        if (invalidFormat) {
          errors.push({
            path: `content.media.${key}`,
            message: `One or more IDs for ${name} have an invalid UUID format`,
          });
        } else {
          // 2. Database check: Ensure they actually exist
          const foundMedia = await prisma.media.findMany({
            where: { id: { in: ids }, isDeleted: false },
            select: { id: true },
          });
          if (foundMedia.length !== ids.length) {
            errors.push({
              path: `content.media.${key}`,
              message: `One or more Media IDs for ${name} do not exist in the library`,
            });
          }
        }
      }
    }
  }

  return errors;
};

/**
 * POST /api/admin/contents
 */
export const createContent = async (req, res) => {
  try {
    // DIAGNOSTIC BYPASS: Using manual extraction to avoid Zod internal version crash
    const { contentTypeId, collectionIds, content, tags, status, visibility } =
      req.body;

    if (!contentTypeId) {
      return await unsuccessResponseWithoutData(res, "error_bad_request");
    }

    const statusNormalized = (status || "DRAFT").toUpperCase();
    const visibilityNormalized = (visibility || "PUBLIC").toUpperCase();

    // Map to exact Prisma Enum values for ContentStatus (DRAFT, PUBLISHED)
    const finalStatus = ["PUBLISHED", "ACTIVE"].includes(statusNormalized)
      ? "PUBLISHED"
      : "DRAFT";
    const finalVisibility =
      visibilityNormalized === "PRIVATE" ? "PRIVATE" : "PUBLIC";

    // 1. Fetch ContentType with its Schema
    const contentType = await prisma.contentType.findFirst({
      where: { id: contentTypeId, isDeleted: false },
      include: { metadataSchema: true },
    });

    if (!contentType) {
      return await notFoundResponse(res, "error_not_found");
    }

    // --- 1.5. Validate Collection IDs existence ---
    if (collectionIds && collectionIds.length > 0) {
      const validCollections = await prisma.collection.findMany({
        where: { id: { in: collectionIds }, isDeleted: false },
        select: { id: true },
      });
      if (validCollections.length !== collectionIds.length) {
        return await unsuccessResponseWithoutData(res, "error_bad_request");
      }
    }

    // --- Strict Content Type Constraints ---
    if (contentType.status !== "ACTIVE") {
      return await forbiddenResponse(res, "error_inactive_content_type");
    }

    if (contentType.isEnabledContent === false) {
      return await forbiddenResponse(res, "error_forbidden");
    }

    // Check if media is being uploaded when not allowed
    const hasMedia = content.media && content.media.length > 0;
    if (hasMedia && contentType.allowMediaUpload === false) {
      return await forbiddenResponse(res, "error_media_not_allowed");
    }

    // Check if tags are being sent when not allowed
    const hasTags = tags && tags.length > 0;
    if (hasTags && contentType.allowTags === false) {
      return await forbiddenResponse(res, "error_tags_not_allowed");
    }

    // 2. Run Dynamic Validation if Schema exists
    if (contentType.metadataSchema) {
      const dynamicErrors = await validateDynamicContent(
        contentType.metadataSchema,
        content,
      );
      if (dynamicErrors.length > 0) {
        return await validationErrorWithData(
          res,
          "error_validation_failed",
          dynamicErrors,
        );
      }
    }

    // 3. Generate Slug from Title (Search for 'title' key in default language 'en', then fallback)
    const titleObj = content.fields?.title || {};
    const slugSource =
      titleObj["en"] || Object.values(titleObj)[0] || "untitled-content";
    const baseSlug = generateSlug(slugSource);
    const slug = await ensureUniqueSlug(baseSlug, prisma.content);

    // 4. Create Content with many-to-many Collections
    const newContent = await prisma.content.create({
      data: {
        contentTypeId,
        content,
        slug,
        tags,
        status: finalStatus,
        visibility: finalVisibility,
        collections: {
          create: collectionIds.map((id, index) => ({
            collectionId: id,
            sortOrder: index,
          })),
        },
      },
      include: {
        collections: {
          select: {
            collection: {
              select: { id: true, title: true },
            },
          },
        },
        contentType: {
          select: { name: true },
        },
      },
    });

    // 5. Return minimal response for UI
    const resTitleObj = content.fields?.title || {};
    const displayTitle =
      resTitleObj["en"] || Object.values(resTitleObj)[0] || "Untitled";

    const responseData = {
      id: newContent.id,
      title: displayTitle,
      contentTypeId: newContent.contentTypeId,
      collectionIds: newContent.collections.map((c) => c.collection.id),
    };

    eventBus.emit("data:created", {
      module: "CONTENT",
      title: "New Content Created",
      message: `Content "${displayTitle}" has been created.`,
      userId: req.user.id,
      data: { id: newContent.id, slug: newContent.slug }
    });

    return await successResponseWithData(

      res,
      "success_content_created",
      responseData,
    );
  } catch (error) {
    console.error("Create content error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

/**
 * GET /api/admin/contents
 */
export const getAllContents = async (req, res) => {
  try {
    const {
      search,
      contentType,
      status,
      collectionId,
      languageCode,
      page = 1,
      limit = 10,
    } = req.query;

    const parsedLimit = Math.min(parseInt(limit, 10) || 10, 100);
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const where = { isDeleted: false };

    if (contentType) {
      where.contentTypeId = contentType;
    }

    if (status) {
      where.status = status.toUpperCase();
    }

    // Filter by Collection ID (Many-to-Many)
    if (collectionId) {
      where.collections = {
        some: { id: collectionId },
      };
    }

    // Filter by Language Availability
    // (Removed strict 'title' path check here because dynamic schemas might name their fields 'textTitle' or similar,
    // which caused false-positive empty result sets.)

    // Search inside the dynamic content JSON title fields or tags
    if (search) {
      where.OR = [
        { slug: { contains: search, mode: "insensitive" } },
        { tags: { has: search } },
        {
          content: {
            path: ["fields", "title", "en"],
            string_contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    // Fetch all matching records first without pagination
    // (Because we must introspect the JSON keys dynamically for languages, which Prisma path doesn't support dynamically)
    const allRecords = await prisma.content.findMany({
      where,
      include: {
        contentType: { select: { name: true } },
        collections: {
          select: {
            collection: {
              select: { id: true, title: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // In-memory Filter for Language Availability (Check ANY dynamic field)
    let filteredRecords = allRecords;
    if (languageCode) {
      const targetLang = languageCode.toUpperCase();
      filteredRecords = allRecords.filter((item) => {
        const fields = item.content?.fields || {};
        let hasLanguage = false;
        Object.values(fields).forEach((fieldVal) => {
          if (
            fieldVal &&
            typeof fieldVal === "object" &&
            !Array.isArray(fieldVal)
          ) {
            if (
              Object.keys(fieldVal).some((k) => k.toUpperCase() === targetLang)
            ) {
              hasLanguage = true;
            }
          }
        });
        return hasLanguage;
      });
    }

    const totalCount = filteredRecords.length;
    const paginatedRecords = filteredRecords.slice(skip, skip + parsedLimit);

    // Format for UI List View
    const results = paginatedRecords.map((item) => {
      const contentJson = item.content || {};
      const fields = contentJson.fields || {};
      // Dynamically locate the best title object (check for 'title', 'textTitle', 'name', or just take the first text field available)
      let titleObj = fields.title || fields.textTitle || fields.name;
      if (!titleObj) {
        // Find the first field that looks like a localized text object
        const firstTextField = Object.values(fields).find(
          (f) => typeof f === "object" && f !== null && !Array.isArray(f),
        );
        titleObj = firstTextField || {};
      }

      // 1. Fallback Title Logic: Requested -> English -> Any available -> Untitled
      const preferredLang = (languageCode || "en").toLowerCase();
      const title =
        titleObj[preferredLang] ||
        titleObj["en"] ||
        Object.values(titleObj)[0] ||
        "Untitled";

      // 2. Available Languages Extraction (unique keys across all dynamic fields)
      const langSet = new Set();
      Object.values(fields).forEach((fieldVal) => {
        if (fieldVal && typeof fieldVal === "object") {
          Object.keys(fieldVal).forEach((k) => langSet.add(k.toUpperCase()));
        }
      });

      return {
        id: item.id,
        title,
        type: item.contentType?.name || "Unknown",
        collections: item.collections.map((c) => {
          // Access the nested collection object
          const colObj = c.collection || {};
          const cTitle = colObj.title;
          return typeof cTitle === "object"
            ? cTitle["en"] || Object.values(cTitle)[0]
            : cTitle || "Untitled";
        }),
        languages: Array.from(langSet),
        status: item.status,
        visibility: item.visibility,
        createdAt: item.createdAt.toISOString().split("T")[0], // YYYY-MM-DD
      };
    });

    return await successResponseWithData(res, "success_generic", {
      results,
      pagination: {
        totalCount,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(totalCount / parsedLimit),
      },
    });
  } catch (error) {
    console.error("Get contents error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

/**
 * GET /api/admin/contents/:id
 */
export const getContentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { language } = req.query;

    const content = await prisma.content.findFirst({
      where: { id, isDeleted: false },
      include: {
        contentType: true,
        collections: {
          include: {
            collection: true,
          },
        },
      },
    });

    if (!content) {
      return await notFoundResponse(res, "error_not_found");
    }

    // Attempt to dynamically populate Media UUIDs with full Media objects
    if (
      content?.content &&
      typeof content.content === "object" &&
      Array.isArray(content.content.media)
    ) {
      const allMediaIds = [];
      const safeMediaObjects = [];

      content.content.media.forEach((m) => {
        if (m && typeof m === "object" && !Array.isArray(m)) {
          safeMediaObjects.push(m);
          Object.values(m).forEach((ids) => {
            if (Array.isArray(ids))
              allMediaIds.push(...ids.filter((id) => typeof id === "string"));
            else if (typeof ids === "string") allMediaIds.push(ids);
          });
        }
      });

      if (allMediaIds.length > 0) {
        const mediaRecords = await prisma.media.findMany({
          where: { id: { in: allMediaIds }, isDeleted: false },
          select: {
            id: true,
            fileName: true,
            url: true,
            mime: true,
            size: true,
            ext: true,
            name: true,
            caption: true,
            alternativeText: true,
          },
        });

        const mediaMap = {};
        mediaRecords.forEach((record) => {
          Object.assign(record, {
            sizeFormatted: ((record.size || 0) / 1024).toFixed(2) + " KB",
          });
          mediaMap[record.id] = record;
        });

        content.content.media = safeMediaObjects.map((m) => {
          const newObj = {};
          Object.keys(m).forEach((key) => {
            const ids = Array.isArray(m[key]) ? m[key] : [m[key]];
            newObj[key] = ids
              .map((id) => (typeof id === "object" ? id : mediaMap[id]))
              .filter(Boolean);
          });
          return newObj;
        });
      }
    }

    // If language is specified, return a clean, localized preview object
    if (language) {
      const lang = language.toLowerCase();
      const rawFields = content.content?.fields || {};
      const rawMedia = content.content?.media || [];

      const localizedFields = {};
      Object.keys(rawFields).forEach((key) => {
        const fieldVal = rawFields[key] || {};
        // Priority: Requested Language -> English -> Any Available -> Empty
        localizedFields[key] =
          fieldVal[lang] || fieldVal["en"] || Object.values(fieldVal)[0] || "";
      });

      const flattenedMedia = {};
      rawMedia.forEach((m) => {
        Object.assign(flattenedMedia, m);
      });

      const langSet = new Set();
      Object.values(rawFields).forEach((fieldVal) => {
        if (fieldVal && typeof fieldVal === "object") {
          Object.keys(fieldVal).forEach((k) => langSet.add(k.toUpperCase()));
        }
      });

      const title = localizedFields.title || "Untitled";

      const slimResponse = {
        id: content.id,
        ownerType: content.ownerType,
        title,
        type: content.contentType?.name || "Unknown",
        collection: content.collections.map((c) => {
          const colObj = c.collection || {};
          const cTitle = colObj.title;
          return typeof cTitle === "object"
            ? cTitle[lang] || cTitle["en"] || Object.values(cTitle)[0]
            : cTitle || "Untitled";
        }),
        languages: Array.from(langSet),
        status: content.status,
        visibility: content.visibility,
        tags: content.tags,
        createdAt: content.createdAt.toISOString().split("T")[0],
        fields: localizedFields,
        media: flattenedMedia,
        content: content.content,
      };

      return await successResponseWithData(
        res,
        "success_generic",
        slimResponse,
      );
    }

    return await successResponseWithData(res, "success_generic", content);
  } catch (error) {
    console.error("Get content by ID error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

/**
 * PATCH /api/admin/contents/:id
 */
export const updateContent = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.content.findFirst({
      where: { id, isDeleted: false },
      include: { collections: true, contentType: true }
    });

    if (!existing) {
      return await notFoundResponse(res, "error_not_found");
    }

    // Audit Context: capture before state
    res.locals.beforeData = existing;
    res.locals.entityId = id;
    res.locals.entityType = "Content";

    const parsed = updateContentSchema.safeParse(req.body);
    if (!parsed.success) {
      return await validationErrorWithData(
        res,
        "error_validation_failed",
        parsed.error.issues,
      );
    }

    const { collectionIds, content, tags, status, visibility } = parsed.data;

    // Build the data object for Prisma update
    const data = {
      content: content !== undefined ? content : undefined,
      tags: tags !== undefined ? tags : undefined,
      status: status !== undefined ? status : undefined,
      visibility: visibility !== undefined ? visibility : undefined,
    };

    // Remove undefined fields to prevent Prisma from trying to set nulls incorrectly
    Object.keys(data).forEach(
      (key) => data[key] === undefined && delete data[key],
    );

    // --- 1. Fetch and Validate Content Type Constraints ---
    const contentType = await prisma.contentType.findFirst({
      where: { id: existing.contentTypeId, isDeleted: false },
      include: { metadataSchema: true },
    });

    if (!contentType) {
      return await notFoundResponse(res, "error_not_found");
    }

    if (contentType.status !== "ACTIVE") {
      return await forbiddenResponse(res, "error_inactive_content_type");
    }
    if (contentType.isEnabledContent === false) {
      return await forbiddenResponse(res, "error_forbidden");
    }

    // --- 2. Feature-specific permission checks ---
    // Media assignments
    const mediaToUpdate = content?.media || [];
    if (mediaToUpdate.length > 0 && contentType.allowMediaUpload === false) {
      return await forbiddenResponse(res, "error_media_not_allowed");
    }

    const tagsToUpdate = tags || [];
    if (tagsToUpdate.length > 0 && contentType.allowTags === false) {
      return await forbiddenResponse(res, "error_tags_not_allowed");
    }

    // --- 3. Dynamic JSON Content Validation ---
    if (content) {
      if (contentType.metadataSchema) {
        const dynamicErrors = await validateDynamicContent(
          contentType.metadataSchema,
          content,
        );
        if (dynamicErrors.length > 0) {
          return await validationErrorWithData(
            res,
            "error_validation_failed",
            dynamicErrors,
          );
        }
      }

      // Sync slug if title changed significantly
      const titleObj = content.fields?.title || {};
      const newSource = titleObj["en"] || Object.values(titleObj)[0];
      if (newSource) {
        const baseSlug = generateSlug(newSource);
        if (baseSlug !== existing.slug) {
          data.slug = await ensureUniqueSlug(baseSlug, prisma.content);
        }
      }
    }

    // 2. Handle Collection many-to-many sync with validation
    if (collectionIds) {
      if (collectionIds.length > 0) {
        const validCollections = await prisma.collection.findMany({
          where: { id: { in: collectionIds }, isDeleted: false },
          select: { id: true },
        });
        if (validCollections.length !== collectionIds.length) {
          return await unsuccessResponseWithoutData(res, "error_bad_request");
        }
      }
      data.collections = {
        deleteMany: {},
        create: collectionIds.map((cid, index) => ({
          collectionId: cid,
          sortOrder: index,
        })),
      };
    }

    const updated = await prisma.content.update({
      where: { id },
      data,
      include: {
        collections: {
          include: {
            collection: true,
          },
        },
        contentType: true,
      },
    });

    // Audit Context: capture after state
    res.locals.afterData = updated;

    // 3. Return minimal response for UI
    const finalContentObj = updated.content || {};
    const finalFields = finalContentObj.fields || {};
    const finalTitleObj = finalFields.title || {};
    const displayTitle =
      finalTitleObj["en"] || Object.values(finalTitleObj)[0] || "Untitled";

    const responseData = {
      id: updated.id,
      title: displayTitle,
      contentTypeId: updated.contentTypeId,
      collectionIds: updated.collections.map((c) => c.collectionId),
    };

    // Detect status transitions for specialized notifications
    if (status && status !== existing.status) {
      if (status === "PUBLISHED") {
        eventBus.emit("data:updated", {
          module: "CONTENT",
          title: "Content Published",
          message: `"${displayTitle}" was published successfully.`,
          userId: req.user.id,
          data: { id: id, slug: updated.slug }
        });
      } else if (status === "ARCHIVED") { // Assuming ARCHIVED status exists or will be added
         eventBus.emit("data:updated", {
          module: "CONTENT",
          title: "Content Archived",
          message: `"${displayTitle}" was moved to the archive.`,
          userId: req.user.id,
          data: { id: id, slug: updated.slug }
        });
      }
    } else {
      // General update notification
      eventBus.emit("data:updated", {
        module: "CONTENT",
        title: "Content Updated",
        message: `Content "${displayTitle}" has been updated.`,
        userId: req.user.id,
        data: { id: id, slug: updated.slug }
      });
    }

    return await successResponseWithData(
      res,
      "success_content_updated",
      responseData,
    );


  } catch (error) {
    console.error("Update content error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

/**
 * DELETE /api/admin/contents/:id
 */
export const deleteContent = async (req, res) => {
  try {
    const { id } = req.params;
    const ids = id.split(",").map((i) => i.trim());

    // Audit Context
    res.locals.entityType = "Content";
    res.locals.metadata = { deletedIds: ids, count: ids.length };

    const result = await prisma.content.updateMany({
      where: { id: { in: ids }, isDeleted: false },
      data: { isDeleted: true },
    });

    eventBus.emit("data:deleted", {
      module: "CONTENT",
      title: "Content Deleted",
      message: `${result.count} content item(s) have been deleted.`,
      userId: req.user.id,
      data: { deletedIds: ids }
    });

    return await successResponseWithData(res, "success_content_deleted");

  } catch (error) {
    console.error("Delete content error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

/**
 * POST /api/admin/contents/bulk-delete
 */
export const bulkDeleteContents = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return await unsuccessResponseWithoutData(res, "error_bad_request");
    }

    // Audit Context
    res.locals.entityType = "Content";
    res.locals.metadata = { deletedIds: ids, count: ids.length };

    const result = await prisma.content.updateMany({
      where: { id: { in: ids }, isDeleted: false },
      data: { isDeleted: true },
    });

    eventBus.emit("data:deleted", {
      module: "CONTENT",
      title: "Bulk Content Deletion",
      message: `${result.count} content item(s) were removed in bulk.`,
      userId: req.user.id,
      data: { deletedIds: ids }
    });

    return await successResponseWithData(res, "success_content_deleted");

  } catch (error) {
    console.error("Bulk delete contents error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

/**
 * GET /api/admin/contents/selection
 * Returns content that is NOT already in the specified collection.
 */
export const getContentsForSelection = async (req, res) => {
  try {
    const parsed = contentSelectionSearchSchema.safeParse(req.query);
    if (!parsed.success) {
      return await validationErrorWithData(
        res,
        "error_validation_failed",
        parsed.error.issues,
      );
    }

    const { search, collectionId, page, limit } = parsed.data;

    const skip = (page - 1) * limit;

    const where = {
      isDeleted: false,
    };

    if (collectionId) {
      where.NOT = {
        collections: {
          some: {
            collectionId: collectionId,
          },
        },
      };
    }

    if (search) {
      where.OR = [
        { slug: { contains: search, mode: "insensitive" } },
        { tags: { has: search } },
        {
          content: {
            path: ["fields", "title", "en"],
            string_contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    const [totalCount, contents] = await Promise.all([
      prisma.content.count({ where }),
      prisma.content.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          contentType: { select: { id: true, name: true } },
        },
      }),
    ]);

    const results = contents.map((item) => {
      const contentJson = item.content || {};
      const fields = contentJson.fields || {};

      // Dynamically locate the best title object (consistent with getAllContents)
      let titleObj = fields.title || fields.textTitle || fields.name;
      if (!titleObj) {
        const firstTextField = Object.values(fields).find(
          (f) => typeof f === "object" && f !== null && !Array.isArray(f),
        );
        titleObj = firstTextField || {};
      }

      const title = titleObj["en"] || Object.values(titleObj)[0] || "Untitled";

      // 2. Available Languages Extraction (unique keys across all dynamic fields)
      const langSet = new Set();
      Object.values(fields).forEach((fieldVal) => {
        if (fieldVal && typeof fieldVal === "object") {
          Object.keys(fieldVal).forEach((k) => langSet.add(k.toUpperCase()));
        }
      });

      return {
        id: item.id,
        title,
        contentType: item.contentType?.name || "Unknown",
        languages: Array.from(langSet),
        createdAt: item.createdAt,
      };
    });

    return await successResponseWithData(res, "success_generic", {
      results,
      pagination: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Get selection content error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

/**
 * POST /api/admin/contents/:id/duplicate
 */
export const duplicateContent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const duplicated = await duplicateContentService(id, userId);

    // Audit Context
    res.locals.entityId = duplicated.id;
    res.locals.entityType = "Content";
    res.locals.afterData = duplicated;

    // Format minimal response for UI
    const contentObj = duplicated.content || {};
    const fields = contentObj.fields || {};
    const titleObj = fields.title || {};
    const displayTitle =
      titleObj["en"] || Object.values(titleObj)[0] || "Untitled Copy";

    const responseData = {
      id: duplicated.id,
      title: displayTitle,
      contentTypeId: duplicated.contentTypeId,
      collectionIds: duplicated.collections.map((c) => c.collection.id),
    };

    eventBus.emit("data:created", {
      module: "CONTENT",
      title: "Content Duplicated",
      message: `Content "${displayTitle}" has been duplicated.`,
      userId: req.user.id,
      data: { id: duplicated.id, originalId: id }
    });

    return await successResponseWithData(
      res,
      "success_content_created",
      responseData,
    );

  } catch (error) {
    console.error("Duplicate content error:", error);
    if (error.message === "error_not_found") {
      return await notFoundResponse(res, "error_not_found");
    }
    return await ErrorResponse(res, "error_internal_server");
  }
};
