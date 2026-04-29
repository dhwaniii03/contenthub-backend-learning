import prisma from '../../../utils/prismaClient.js';
import {
  successResponseWithData,
  ErrorResponse,
  validationErrorWithData,
  unsuccessResponseWithoutData,
  notFoundResponse,
} from '../../../utils/apiResponse.js';
import { addContentTypeSchema, updateContentTypeSchema } from '../../../validators/contentTypeValidator.js';
import { generateSlug, ensureUniqueSlug } from '../../../utils/slugHelper.js';
import eventBus from '../../../utils/eventBus.js';


const toCamelCase = (str) => str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => index === 0 ? word.toLowerCase() : word.toUpperCase()).replace(/\s+/g, '');

/**
 * POST /api/admin/content-types
 */
export const addContentType = async (req, res) => {
  try {
    const parsed = addContentTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => ({ path: e.path.join('.'), message: e.message }));
      return await validationErrorWithData(res, 'error_validation_failed', errors);
    }

    const { name, description, status, isEnabledContent, allowMediaUpload, allowTags, metadataSchemaId } = parsed.data;
    const key = toCamelCase(name);
    const baseSlug = generateSlug(name);
    const slug = await ensureUniqueSlug(baseSlug, prisma.contentType);

    const existingKey = await prisma.contentType.findUnique({ where: { key } });
    if (existingKey) return await unsuccessResponseWithoutData(res, 'error_already_exists');

    if (metadataSchemaId) {
      const schemaExists = await prisma.metadataSchema.findFirst({ where: { id: metadataSchemaId, isDeleted: false } });
      if (!schemaExists) return await unsuccessResponseWithoutData(res, 'error_not_found');
    }

    const contentType = await prisma.contentType.create({
      data: { name, key, slug, description, status, isEnabledContent, allowMediaUpload, allowTags, metadataSchemaId },
      include: { metadataSchema: true }
    });

    // Audit Context
    res.locals.afterData = contentType;
    res.locals.entityId = contentType.id;
    res.locals.entityType = 'ContentType';

    eventBus.emit("data:created", {
      module: "CONTENT_TYPE",
      title: "Content Type Created",
      message: `Content type "${contentType.name}" has been created.`,
      userId: req.user.id,
      data: { id: contentType.id, key: contentType.key }
    });

    return await successResponseWithData(res, 'success_created', contentType);

  } catch (error) {
    console.error('Add content type error:', error);
    return await ErrorResponse(res, 'error_internal_server');
  }
};

/**
 * GET /api/admin/content-types
 */
export const getAllContentTypes = async (req, res) => {
  const { search, status, page = 1, limit = 10 } = req.query;
  try {
    const limitNumber = Math.min(parseInt(limit, 10) || 10, 100);
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (pageNumber - 1) * limitNumber;
    const whereClause = { isDeleted: false };
    if (status) whereClause.status = status.toUpperCase();
    if (search) whereClause.OR = [{ name: { contains: search, mode: 'insensitive' } }, { key: { contains: search, mode: 'insensitive' } }];

    const [totalCount, contentTypes] = await Promise.all([
      prisma.contentType.count({ where: whereClause }),
      prisma.contentType.findMany({ where: whereClause, orderBy: { createdAt: 'desc' }, skip, take: limitNumber, include: { metadataSchema: true } }),
    ]);

    const results = contentTypes.map(item => ({
      id: item.id, typeName: item.name, description: item.description || '',
      metadataSchema: item.metadataSchema ? { id: item.metadataSchema.id, name: item.metadataSchema.title } : null,
      totalContent: 0, status: item.status, created: item.createdAt.toISOString().split('T')[0],
    }));

    return await successResponseWithData(res, 'success_generic', {
      results,
      pagination: { totalCount, page: pageNumber, limit: limitNumber, totalPages: Math.ceil(totalCount / limitNumber) },
    });
  } catch (error) {
    console.error('Get all content types error:', error);
    return await ErrorResponse(res, 'error_internal_server');
  }
};

/**
 * PATCH /api/admin/content-types/:id
 */
export const updateContentType = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.contentType.findFirst({ where: { id, isDeleted: false } });
    if (!existing) return await notFoundResponse(res, 'error_not_found');

    // Audit Context: capture before state
    res.locals.beforeData = existing;
    res.locals.entityId = id;
    res.locals.entityType = 'ContentType';

    const parsed = updateContentTypeSchema.safeParse(req.body);
    if (!parsed.success) return await validationErrorWithData(res, 'error_validation_failed', parsed.error.issues);

    const updateData = { ...parsed.data };
    if (parsed.data.name && parsed.data.name !== existing.name) {
      const baseSlug = generateSlug(parsed.data.name);
      updateData.slug = await ensureUniqueSlug(baseSlug, prisma.contentType);
    }

    if (updateData.metadataSchemaId && updateData.metadataSchemaId !== existing.metadataSchemaId) {
      const schemaExists = await prisma.metadataSchema.findFirst({ where: { id: updateData.metadataSchemaId, isDeleted: false } });
      if (!schemaExists) return await unsuccessResponseWithoutData(res, 'error_not_found');
    }

    const updated = await prisma.contentType.update({ where: { id }, data: updateData, include: { metadataSchema: true } });

    // Audit Context: capture after state
    res.locals.afterData = updated;

    eventBus.emit("data:updated", {
      module: "CONTENT_TYPE",
      title: "Content Type Updated",
      message: `Content type "${updated.name}" has been updated.`,
      userId: req.user.id,
      data: { id: id, key: updated.key }
    });

    return await successResponseWithData(res, 'success_updated', updated);

  } catch (error) {
    console.error('Update content type error:', error);
    return await ErrorResponse(res, 'error_internal_server');
  }
};

/**
 * POST /api/admin/content-types/delete
 */
export const deleteContentTypes = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return await validationErrorWithData(res, 'error_bad_request', []);

  try {
    // Audit Context
    res.locals.entityType = 'ContentType';
    res.locals.metadata = { deletedIds: ids, count: ids.length };

    const result = await prisma.contentType.updateMany({ where: { id: { in: ids }, isDeleted: false }, data: { isDeleted: true } });
    if (result.count === 0) return await notFoundResponse(res, 'error_not_found');
    eventBus.emit("data:deleted", {
      module: "CONTENT_TYPE",
      title: "Bulk Content Type Deletion",
      message: `${ids.length} content type(s) have been deleted.`,
      userId: req.user.id,
      data: { deletedIds: ids }
    });

    return await successResponseWithData(res, 'success_deleted', null);

  } catch (error) {
    console.error('Delete content types error:', error);
    return await ErrorResponse(res, 'error_internal_server');
  }
};

/**
 * GET /api/admin/content-types/:id
 */
export const getContentTypeById = async (req, res) => {
  const { id } = req.params;
  try {
    const contentType = await prisma.contentType.findFirst({ where: { id, isDeleted: false }, include: { metadataSchema: true } });
    if (!contentType) return await notFoundResponse(res, 'error_not_found');

    const totalContent = await prisma.content.count({
      where: { contentTypeId: id, isDeleted: false }
    });

    const quickStats = {
      totalContent,
      schemaAssigned: contentType.metadataSchemaId ? 'Yes' : 'No',
      contentCreation: contentType.isEnabledContent ? 'Enabled' : 'Disabled',
      mediaUpload: contentType.allowMediaUpload ? 'Allowed' : 'Not Allowed',
      tags: contentType.allowTags ? 'Allowed' : 'Not Allowed'
    };

    const responseData = {
      id: contentType.id,
      name: contentType.name,
      slug: contentType.slug,
      description: contentType.description,
      status: contentType.status,
      isEnabledContent: contentType.isEnabledContent,
      allowMediaUpload: contentType.allowMediaUpload,
      allowTags: contentType.allowTags,
      createdAt: contentType.createdAt,
      updatedAt: contentType.updatedAt,
      metadataSchema: contentType.metadataSchema
        ? { id: contentType.metadataSchema.id, name: contentType.metadataSchema.title }
        : null,
      quickStats,
    };

    return await successResponseWithData(res, 'success_generic', responseData);
  } catch (error) {
    console.error('Get content type by ID error:', error);
    return await ErrorResponse(res, 'error_internal_server');
  }
};

/**
 * GET /api/admin/content-types/:id/schema
 */
export const getContentTypeSchema = async (req, res) => {
  const { id } = req.params;
  try {
    const contentType = await prisma.contentType.findFirst({ where: { id, isDeleted: false }, include: { metadataSchema: true } });
    if (!contentType) return await notFoundResponse(res, 'error_not_found');
    if (!contentType.metadataSchema) return await notFoundResponse(res, 'error_not_found');
    return await successResponseWithData(res, 'success_generic', contentType.metadataSchema);
  } catch (error) {
    console.error('Get content type schema error:', error);
    return await ErrorResponse(res, 'error_internal_server');
  }
};

/**
 * GET /api/admin/content-types/list
 */
export const getContentTypeList = async (req, res) => {
  try {
    const list = await prisma.contentType.findMany({ where: { isDeleted: false, status: 'ACTIVE' }, select: { id: true, name: true, key: true }, orderBy: { name: 'asc' } });
    return await successResponseWithData(res, 'success_generic', list);
  } catch (error) {
    console.error('Get content type list error:', error);
    return await ErrorResponse(res, 'error_internal_server');
  }
};
