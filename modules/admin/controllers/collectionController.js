import prisma from "../../../utils/prismaClient.js";
import {
  successResponseWithData,
  ErrorResponse,
  validationErrorWithData,
  unsuccessResponseWithoutData,
  notFoundResponse,
} from "../../../utils/apiResponse.js";
import {
  addCollectionSchema,
  updateCollectionSchema,
  saveCollectionContentsSchema,
} from "../../../validators/collectionValidator.js";
import { generateSlug } from "../../../utils/slugHelper.js";
import mediaService from "../../../utils/mediaService.js";
import eventBus from "../../../utils/eventBus.js";


/**
 * POST /api/admin/collections
 */
export const addCollection = async (req, res) => {
  try {
    let rawTranslations;
    try {
      rawTranslations =
        typeof req.body.translations === "string"
          ? JSON.parse(req.body.translations)
          : req.body.translations;
    } catch {
      return await unsuccessResponseWithoutData(res, "error_bad_request");
    }

    const isFeatured =
      req.body.isFeatured === "true" || req.body.isFeatured === true;
    const sortOrder = req.body.sortOrder;
    const status = req.body.status;
    const visibility = req.body.visibility;
    let contentIds = [];
    if (req.body.contentIds) {
      try {
        contentIds =
          typeof req.body.contentIds === "string"
            ? JSON.parse(req.body.contentIds)
            : req.body.contentIds;
      } catch {
        return await unsuccessResponseWithoutData(
          res,
          "error_bad_request",
          "Invalid contentIds format",
        );
      }
    }

    const parsed = addCollectionSchema.safeParse({
      translations: rawTranslations,
      isFeatured,
      sortOrder,
      status,
      visibility,
      contentIds,
    });

    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      }));
      return await validationErrorWithData(
        res,
        "error_validation_failed",
        errors,
      );
    }

    const {
      translations,
      isFeatured: featuredVal,
      sortOrder: orderVal,
      status: statusVal,
      visibility: visibilityVal,
      contentIds: finalContentIds,
    } = parsed.data;

    const uniqueCodes = [...new Set(translations.map((t) => t.languageCode))];
    const registeredLangs = await prisma.language.findMany({
      where: { languageCode: { in: uniqueCodes } },
    });

    if (registeredLangs.length !== uniqueCodes.length) {
      return await unsuccessResponseWithoutData(res, "error_bad_request");
    }

    const titleJson = {};
    const descriptionJson = {};
    for (const t of translations) {
      titleJson[t.languageCode] = t.title;
      if (t.description) descriptionJson[t.languageCode] = t.description;
    }

    const slugSource = titleJson["en"] || titleJson[Object.keys(titleJson)[0]];
    const slug = generateSlug(slugSource);
    if (!slug)
      return await validationErrorWithData(res, "error_validation_failed", []);

    const thumbnailId = await mediaService.handleMediaField(
      "thumbnail",
      req.body.thumbnail,
      req.files,
    );
    const bannerId = await mediaService.handleMediaField(
      "banner",
      req.body.banner,
      req.files,
    );

    try {
      const collection = await prisma.$transaction(async (tx) => {
        const col = await tx.collection.create({
          data: {
            title: titleJson,
            description: Object.keys(descriptionJson).length
              ? descriptionJson
              : undefined,
            slug,
            thumbnailId,
            bannerId,
            visibility: visibilityVal,
            status: statusVal,
            isFeatured: featuredVal,
            sortOrder: orderVal,
          },
          include: { thumbnail: true, banner: true },
        });

        // Handle Content Selection (Deduplicated)
        if (finalContentIds && finalContentIds.length > 0) {
          const uniqueContentIds = [...new Set(finalContentIds)];
          await tx.collectionContent.createMany({
            data: uniqueContentIds.map((cid, index) => ({
              collectionId: col.id,
              contentId: cid,
              sortOrder: index,
            })),
          });
        }
        return col;
      });

      // Audit Context
      res.locals.afterData = collection;
      res.locals.entityId = collection.id;
      res.locals.entityType = "Collection";

      const formatted = {
        ...collection,
        thumbnail: mediaService.simplifyMedia(collection.thumbnail),
        banner: mediaService.simplifyMedia(collection.banner),
      };

      eventBus.emit("data:created", {
        module: "COLLECTION",
        title: "New Collection Created",
        message: `Collection "${slugSource}" has been created.`,
        userId: req.user.id,
        data: { id: collection.id, slug: collection.slug }
      });

      return await successResponseWithData(res, "success_created", formatted);

    } catch (createErr) {
      if (createErr.code === "P2002") {
        const retryCollection = await prisma.$transaction(async (tx) => {
          const col = await tx.collection.create({
            data: {
              title: titleJson,
              description: Object.keys(descriptionJson).length
                ? descriptionJson
                : undefined,
              slug: `${slug}-${Date.now()}`,
              thumbnailId,
              bannerId,
              visibility: visibilityVal,
              status: statusVal,
              isFeatured: featuredVal,
              sortOrder: orderVal,
            },
            include: { thumbnail: true, banner: true },
          });

          if (finalContentIds && finalContentIds.length > 0) {
            const uniqueContentIds = [...new Set(finalContentIds)];
            await tx.collectionContent.createMany({
              data: uniqueContentIds.map((cid, index) => ({
                collectionId: col.id,
                contentId: cid,
                sortOrder: index,
              })),
            });
          }
          return col;
        });
        const formattedRetry = {
          ...retryCollection,
          thumbnail: mediaService.withFormattedSize(retryCollection.thumbnail),
          banner: mediaService.withFormattedSize(retryCollection.banner),
        };

        eventBus.emit("data:created", {
          module: "COLLECTION",
          title: "New Collection Created",
          message: `Collection "${slugSource}" has been created.`,
          userId: req.user.id,
          data: { id: retryCollection.id, slug: retryCollection.slug }
        });

        return await successResponseWithData(

          res,
          "success_created",
          formattedRetry,
        );
      }
      throw createErr;
    }
  } catch (error) {
    console.error("Add collection error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

/**
 * GET /api/admin/collections
 */
export const getAllCollections = async (req, res) => {
  const { search, status, language, page = 1, limit = 10 } = req.query;

  try {
    const limitNumber = Math.min(parseInt(limit, 10) || 10, 100);
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (pageNumber - 1) * limitNumber;

    const whereClause = { isDeleted: false };
    if (status) whereClause.status = status.toUpperCase();
    if (language)
      whereClause.title = { path: [language.toLowerCase()], not: null };
    if (search) {
      const searchLang = language?.toLowerCase() || "en";
      whereClause.OR = [
        {
          title: {
            path: [searchLang],
            string_contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            path: [searchLang],
            string_contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    const [totalCount, collections] = await Promise.all([
      prisma.collection.count({ where: whereClause }),
      prisma.collection.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNumber,
        include: { thumbnail: true, banner: true },
      }),
    ]);

    const formattedCollections = collections.map((item) => {
      const displayLang = language?.toLowerCase() || "en";
      const availableLangs = Object.keys(item.title || {});
      const actualLang = availableLangs.includes(displayLang)
        ? displayLang
        : availableLangs[0] || "en";
      return {
        id: item.id,
        collectionName: item.title[actualLang] || "Untitled",
        description: item.description?.[actualLang] || "",
        totalContent: 0,
        language: actualLang.toUpperCase(),
        availableLanguages: availableLangs.map((code) => code.toUpperCase()),
        status: item.status,
        created: item.createdAt.toISOString().split("T")[0],
        thumbnail: mediaService.simplifyMedia(item.thumbnail),
        banner: mediaService.simplifyMedia(item.banner),
        slug: item.slug,
      };
    });

    return await successResponseWithData(res, "success_generic", {
      results: formattedCollections,
      pagination: {
        totalCount,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalCount / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get all collections error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

/**
 * GET /api/admin/collections/:id
 */
export const getCollectionById = async (req, res) => {
  const { id } = req.params;
  const { language = "en" } = req.query;

  try {
    const collection = await prisma.collection.findFirst({
      where: { id, isDeleted: false },
      include: {
        thumbnail: true,
        banner: true,
        contents: {
          where: { content: { isDeleted: false } },
          orderBy: { sortOrder: "asc" },
          include: {
            content: { include: { contentType: { select: { name: true } } } },
          },
        },
      },
    });

    if (!collection) return await notFoundResponse(res, "error_not_found");

    const lang = language.toLowerCase();
    if (!collection.title[lang])
      return await notFoundResponse(res, "error_not_found");

    const typeBreakdown = {};
    collection.contents.forEach((rel) => {
      const typeName = rel.content.contentType?.name || "Unknown";
      typeBreakdown[typeName.toLowerCase()] =
        (typeBreakdown[typeName.toLowerCase()] || 0) + 1;
    });

    const responseData = {
      id: collection.id,
      collectionName: collection.title[lang],
      collectionDescription: collection.description?.[lang] || "",
      slug: collection.slug,
      thumbnail: mediaService.simplifyMedia(collection.thumbnail),
      banner: mediaService.simplifyMedia(collection.banner),
      visibility: collection.visibility,
      status: collection.status,
      isFeatured: collection.isFeatured,
      sortOrder: collection.sortOrder,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      quickStats: {
        totalContent: collection.contents.length,
        ...typeBreakdown,
      },
      contents: collection.contents.map((relation) => {
        const item = relation.content;
        const contentFields = (item.content || {}).fields || {};

        // Dynamically locate the best title object (check for 'title', 'textTitle', 'name')
        let titleObj =
          contentFields.title || contentFields.textTitle || contentFields.name;
        if (!titleObj) {
          // Find the first field that looks like a localized text object
          const firstTextField = Object.values(contentFields).find(
            (f) => typeof f === "object" && f !== null && !Array.isArray(f),
          );
          titleObj = firstTextField || {};
        }

        const title =
          titleObj[lang] ||
          titleObj["en"] ||
          Object.values(titleObj)[0] ||
          "Untitled";

        const langSet = new Set();
        Object.values(contentFields).forEach((fv) => {
          if (fv && typeof fv === "object")
            Object.keys(fv).forEach((k) => langSet.add(k.toUpperCase()));
        });

        return {
          id: item.id,
          title,
          contentTypeId: item.contentTypeId,
          contentTypeName: item.contentType?.name || "Unknown",
          availableLanguages: Array.from(langSet),
          sortOrder: relation.sortOrder,
          createdAt: item.createdAt.toISOString().split("T")[0],
        };
      }),
    };

    return await successResponseWithData(res, "success_generic", responseData);
  } catch (error) {
    console.error("Get collection by ID error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

/**
 * PATCH /api/admin/collections/:id
 */
export const updateCollection = async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.collection.findFirst({
      where: { id, isDeleted: false },
    });
    if (!existing) return await notFoundResponse(res, "error_not_found");

    const targetLang = (
      req.query.language ||
      req.body.language ||
      "en"
    ).toLowerCase();

    let translations = undefined;
    if (req.body.translations) {
      try {
        translations =
          typeof req.body.translations === "string"
            ? JSON.parse(req.body.translations)
            : req.body.translations;
      } catch (e) {
        return await validationErrorWithData(
          res,
          "error_validation_failed",
          [],
        );
      }
    }

    let contentIds = undefined;
    if (req.body.contentIds) {
      try {
        contentIds =
          typeof req.body.contentIds === "string"
            ? JSON.parse(req.body.contentIds)
            : req.body.contentIds;
      } catch {
        return await unsuccessResponseWithoutData(
          res,
          "error_bad_request",
          "Invalid contentIds format",
        );
      }
    }

    const parsed = updateCollectionSchema.safeParse({
      title: req.body.title || req.body.collectionName,
      description: req.body.description || req.body.collectionDescription,
      translations,
      isFeatured:
        req.body.isFeatured !== undefined
          ? req.body.isFeatured === "true" || req.body.isFeatured === true
          : undefined,
      sortOrder:
        req.body.sortOrder !== undefined ? req.body.sortOrder : undefined,
      status: req.body.status,
      visibility: req.body.visibility,
      contentIds,
    });

    if (!parsed.success)
      return await validationErrorWithData(
        res,
        "error_validation_failed",
        parsed.error.issues,
      );

    const updateData = {};
    const {
      translations: newTranslations,
      isFeatured,
      sortOrder,
      status,
      visibility,
      title: newTitle,
      description: newDesc,
      contentIds: finalContentIds,
    } = parsed.data;

    const updatedTitle = { ...(existing.title || {}) };
    const updatedDesc = { ...(existing.description || {}) };
    let hasTextUpdate = false;

    if (newTranslations) {
      for (const t of newTranslations) {
        updatedTitle[t.languageCode] = t.title;
        if (t.description !== undefined)
          updatedDesc[t.languageCode] = t.description;
      }
      hasTextUpdate = true;
    }
    if (newTitle) {
      updatedTitle[targetLang] = newTitle;
      hasTextUpdate = true;
    }
    if (newDesc !== undefined) {
      updatedDesc[targetLang] = newDesc;
      hasTextUpdate = true;
    }

    if (hasTextUpdate) {
      updateData.title = updatedTitle;
      updateData.description = updatedDesc;
      const newEnTitle = updatedTitle["en"];
      if (newEnTitle && newEnTitle !== existing.title?.["en"]) {
        const newSlug = generateSlug(newEnTitle);
        const slugExists = await prisma.collection.findFirst({
          where: { slug: newSlug, id: { not: id } },
        });
        updateData.slug = slugExists ? `${newSlug}-${Date.now()}` : newSlug;
      }
    }

    const thumbnailId = await mediaService.handleMediaField(
      "thumbnail",
      req.body.thumbnail,
      req.files,
    );
    const bannerId = await mediaService.handleMediaField(
      "banner",
      req.body.banner,
      req.files,
    );
    if (thumbnailId !== undefined) updateData.thumbnailId = thumbnailId;
    if (bannerId !== undefined) updateData.bannerId = bannerId;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (status) updateData.status = status;
    if (visibility) updateData.visibility = visibility;

    const updated = await prisma.$transaction(async (tx) => {
      const col = await tx.collection.update({
        where: { id },
        data: updateData,
        include: { thumbnail: true, banner: true },
      });

      if (finalContentIds !== undefined) {
        // Replace curated content
        await tx.collectionContent.deleteMany({ where: { collectionId: id } });
        if (finalContentIds.length > 0) {
          const uniqueContentIds = [...new Set(finalContentIds)];
          await tx.collectionContent.createMany({
            data: uniqueContentIds.map((cid, index) => ({
              collectionId: id,
              contentId: cid,
              sortOrder: index,
            })),
          });
        }
      }
      return col;
    });

    // Audit Context: Capture state after update
    res.locals.afterData = updated;

    const responseData = {
      id: updated.id,
      collectionName:
        updated.title[targetLang] ||
        updated.title["en"] ||
        Object.values(updated.title)[0],
      collectionDescription:
        updated.description?.[targetLang] || updated.description?.["en"] || "",
      slug: updated.slug,
      thumbnail: mediaService.simplifyMedia(updated.thumbnail),
      banner: mediaService.simplifyMedia(updated.banner),
      visibility: updated.visibility,
      status: updated.status,
      isFeatured: updated.isFeatured,
      sortOrder: updated.sortOrder,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    const itemCount = finalContentIds !== undefined ? finalContentIds.length : (updated.contents?.length || 0);

    eventBus.emit("data:updated", {
      module: "COLLECTION",
      title: "Collection Updated",
      message: `The collection "${responseData.collectionName}" has been updated with ${itemCount} items.`,
      userId: req.user.id,
      data: { id: id, slug: responseData.slug }
    });


    return await successResponseWithData(res, "success_updated", responseData);

  } catch (error) {
    console.error("Update collection error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

/**
 * DELETE /api/admin/collections/:id
 */
export const deleteCollection = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.collection.findFirst({
      where: { id, isDeleted: false },
    });
    if (!existing) return await notFoundResponse(res, "error_not_found");
    await prisma.collection.update({
      where: { id },
      data: { isDeleted: true },
    });

    eventBus.emit("data:deleted", {
      module: "COLLECTION",
      title: "Collection Deleted",
      message: `Collection "${existing.title["en"] || Object.values(existing.title)[0]}" has been deleted.`,
      userId: req.user.id,
      data: { id: id }
    });

    return await successResponseWithData(res, "success_deleted", null);

  } catch (error) {
    console.error("Delete collection error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

/**
 * POST /api/admin/collections/bulk-delete
 */
export const bulkDeleteCollections = async (req, res) => {
  const { collectionIds } = req.body;
  if (!Array.isArray(collectionIds) || collectionIds.length === 0)
    return await validationErrorWithData(res, "error_bad_request", []);

  try {
    const collections = await prisma.collection.findMany({
      where: { id: { in: collectionIds }, isDeleted: false },
      select: { id: true },
    });
    if (collections.length === 0)
      return await notFoundResponse(res, "error_not_found");
    await prisma.collection.updateMany({
      where: { id: { in: collectionIds } },
      data: { isDeleted: true },
    });

    eventBus.emit("data:deleted", {
      module: "COLLECTION",
      title: "Bulk Collection Deletion",
      message: `${collections.length} collection(s) have been deleted.`,
      userId: req.user.id,
      data: { deletedIds: collectionIds }
    });

    return await successResponseWithData(res, "success_deleted", null);

  } catch (error) {
    console.error("Bulk delete collections error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};

/**
 * GET /api/admin/collections/list
 */
export const getCollectionList = async (req, res) => {
  const { lang = "en" } = req.query;
  const targetLang = lang.toLowerCase();
  try {
    const collections = await prisma.collection.findMany({
      where: { isDeleted: false },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    });
    const list = collections.map((c) => {
      const titles = c.title || {};
      const displayTitle =
        titles[targetLang] ||
        titles["en"] ||
        Object.values(titles)[0] ||
        "Untitled Collection";
      return { id: c.id, title: displayTitle };
    });
    return await successResponseWithData(res, "success_generic", list);
  } catch (error) {
    console.error("Get collection list error:", error);
    return await ErrorResponse(res, "error_internal_server");
  }
};
