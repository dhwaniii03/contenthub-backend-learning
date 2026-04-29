import prisma from '../../../utils/prismaClient.js';
import {
  successResponseWithData,
  ErrorResponse,
  validationErrorWithData,
  unsuccessResponseWithoutData,
  notFoundResponse,
} from '../../../utils/apiResponse.js';
import { addMetadataSchema, updateMetadataSchema as updateMetadataSchemaValidator } from '../../../validators/metadataSchemaValidator.js';
import { generateSlug, ensureUniqueSlug } from '../../../utils/slugHelper.js';
import eventBus from '../../../utils/eventBus.js';


const toCamelCase = (str) => str.toLowerCase().replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => index === 0 ? word.toLowerCase() : word.toUpperCase()).replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');

/**
 * POST /api/admin/metadata-schemas/generate-key
 */
export const generateKey = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') return await unsuccessResponseWithoutData(res, 'error_bad_request');
    const key = toCamelCase(name);
    return await successResponseWithData(res, 'success_generic', { key });
  } catch (error) {
    return await ErrorResponse(res, 'error_internal_server');
  }
};

/**
 * GET /api/admin/metadata-schemas
 */
export const getMetadataSchemas = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10, status } = req.query;
    const parsedLimit = Math.min(parseInt(limit, 10) || 10, 100);
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const where = { isDeleted: false, AND: [] };
    if (search) where.AND.push({ OR: [{ title: { contains: search, mode: 'insensitive' } }, { schemaType: { contains: search, mode: 'insensitive' } }] });
    if (status && status !== 'All Status') where.AND.push({ status: status.toUpperCase() });

    const [schemas, total] = await prisma.$transaction([
      prisma.metadataSchema.findMany({ where, skip, take: parsedLimit, include: { contentTypes: { where: { isDeleted: false }, select: { name: true, id: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.metadataSchema.count({ where }),
    ]);

    const mappedSchemas = schemas.map(s => {
      const fields = Array.isArray(s.schema) ? s.schema : [];
      return { id: s.id, title: s.title, schemaType: s.schemaType, numFields: fields.length, assignedContentTypes: s.contentTypes.map(ct => ct.name).join(', ') || 'None', status: s.status, createdAt: s.createdAt };
    });

    return await successResponseWithData(res, 'success_generic', {
      schemas: mappedSchemas,
      pagination: { total, page: parseInt(page), limit: parsedLimit, totalPages: Math.ceil(total / parsedLimit) },
    });
  } catch (error) {
    console.error('List metadata schemas error:', error);
    return await ErrorResponse(res, 'error_internal_server');
  }
};

/**
 * GET /api/admin/metadata-schemas/:id
 */
export const getMetadataSchemaById = async (req, res) => {
  const { id } = req.params;
  try {
    const schema = await prisma.metadataSchema.findFirst({ where: { id, isDeleted: false } });
    if (!schema) return await notFoundResponse(res, 'error_not_found');

    const fields = Array.isArray(schema.schema) ? schema.schema : [];
    const stats = {
      totalFields: fields.length,
      requiredFields: fields.filter((f) => f.validation?.required || f.required).length,
      optionalFields: 0, schemaType: schema.schemaType,
    };
    stats.optionalFields = stats.totalFields - stats.requiredFields;

    return await successResponseWithData(res, 'success_generic', { ...schema, stats });
  } catch (error) {
    console.error('Get metadata schema by ID error:', error);
    return await ErrorResponse(res, 'error_internal_server');
  }
};

/**
 * POST /api/admin/metadata-schemas
 */
export const createMetadataSchema = async (req, res) => {
  try {
    const parsed = addMetadataSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => ({ path: e.path.join('.'), message: e.message }));
      return await validationErrorWithData(res, 'error_validation_failed', errors);
    }

    const { title, schemaType, schema, seoSchema, status } = parsed.data;
    const existing = await prisma.metadataSchema.findFirst({ where: { title, isDeleted: false } });
    if (existing) return await unsuccessResponseWithoutData(res, 'error_already_exists');

    const baseSlug = generateSlug(title);
    const slug = await ensureUniqueSlug(baseSlug, prisma.metadataSchema);

    const metadataSchema = await prisma.metadataSchema.create({
      data: { title, slug, schemaType, schema, seoSchema: seoSchema || {}, status: status || 'ACTIVE', version: 1 }
    });

    // Audit Context
    res.locals.afterData = metadataSchema;
    res.locals.entityId = metadataSchema.id;
    res.locals.entityType = 'MetadataSchema';

    eventBus.emit("data:created", {
      module: "METADATA",
      title: "New Metadata Schema",
      message: `Schema "${title}" has been created.`,
      userId: req.user.id,
      data: { id: metadataSchema.id, slug: metadataSchema.slug }
    });

    return await successResponseWithData(res, 'success_created', metadataSchema);

  } catch (error) {
    console.error('Create metadata schema error:', error);
    return await ErrorResponse(res, 'error_internal_server');
  }
};

/**
 * PATCH /api/admin/metadata-schemas/:id
 */
export const updateMetadataSchema = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.metadataSchema.findFirst({ where: { id, isDeleted: false } });
    if (!existing) return await notFoundResponse(res, 'error_not_found');

    // Audit Context: capture before state
    res.locals.beforeData = existing;
    res.locals.entityId = id;
    res.locals.entityType = 'MetadataSchema';

    const parsed = updateMetadataSchemaValidator.safeParse(req.body);
    if (!parsed.success) return await validationErrorWithData(res, 'error_validation_failed', parsed.error.issues);

    const updateData = { ...parsed.data, version: (existing.version || 1) + 1 };
    if (updateData.title && updateData.title !== existing.title) {
      const baseSlug = generateSlug(updateData.title);
      updateData.slug = await ensureUniqueSlug(baseSlug, prisma.metadataSchema);
    }

    const updated = await prisma.metadataSchema.update({ where: { id }, data: updateData });

    // Audit Context: capture after state
    res.locals.afterData = updated;

    return await successResponseWithData(res, 'success_updated', updated);
  } catch (error) {
    console.error('Update metadata schema error:', error);
    return await ErrorResponse(res, 'error_internal_server');
  }
};

/**
 * DELETE /api/admin/metadata-schemas/:id
 */
export const deleteMetadataSchema = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.metadataSchema.findFirst({ where: { id, isDeleted: false } });
    if (!existing) return await notFoundResponse(res, 'error_not_found');

    // Audit Context
    res.locals.beforeData = existing;
    res.locals.entityId = id;
    res.locals.entityType = 'MetadataSchema';

    await prisma.$transaction([
      prisma.metadataSchema.update({ where: { id }, data: { isDeleted: true } }),
      prisma.contentType.updateMany({ where: { metadataSchemaId: id, isDeleted: false }, data: { isDeleted: true } }),
    ]);

    eventBus.emit("data:deleted", {
      module: "METADATA",
      title: "Metadata Schema Deleted",
      message: `Schema "${existing.title}" and its related content types have been removed.`,
      userId: req.user.id,
      data: { id: id }
    });

    return await successResponseWithData(res, 'success_deleted', null);

  } catch (error) {
    console.error('Delete metadata schema error:', error);
    return await ErrorResponse(res, 'error_internal_server');
  }
};

/**
 * POST /api/admin/metadata-schemas/validate-json
 */
export const validateSeoJson = async (req, res) => {
  try {
    const { jsonString } = req.body;
    if (!jsonString) return await unsuccessResponseWithoutData(res, 'error_bad_request');

    const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    if (typeof parsed !== 'object' || parsed === null) throw new Error('Not a valid JSON object');

    const hasLdFields = parsed['@context'] && parsed['@type'];
    return await successResponseWithData(res, 'success_generic', { isValid: true, isTypicalJsonLd: !!hasLdFields });
  } catch (error) {
    return await unsuccessResponseWithoutData(res, 'error_validation_failed');
  }
};

/**
 * POST /api/admin/metadata-schemas/auto-generate-seo
 */
export const autoGenerateSeoJson = async (req, res) => {
  try {
    const { fields, schemaType } = req.body;
    const template = { "@context": "https://schema.org", "@type": schemaType || "Article" };
    if (Array.isArray(fields)) fields.forEach(f => { if (f.key) template[f.key] = `{{${f.key}}}`; });
    return await successResponseWithData(res, 'success_generic', { template });
  } catch (error) {
    return await ErrorResponse(res, 'error_internal_server');
  }
};

/**
 * POST /api/admin/metadata-schemas/bulk-delete
 */
export const bulkDeleteMetadataSchemas = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return await validationErrorWithData(res, 'error_bad_request', []);

  try {
    // Audit Context: capture ids being deleted
    res.locals.entityType = 'MetadataSchema';
    res.locals.metadata = { deletedIds: ids, count: ids.length };

    await prisma.$transaction([
      prisma.metadataSchema.updateMany({ where: { id: { in: ids }, isDeleted: false }, data: { isDeleted: true } }),
      prisma.contentType.updateMany({ where: { metadataSchemaId: { in: ids }, isDeleted: false }, data: { isDeleted: true } }),
    ]);
    eventBus.emit("data:deleted", {
      module: "METADATA",
      title: "Bulk Metadata Deletion",
      message: `${ids.length} schemas have been deleted.`,
      userId: req.user.id,
      data: { deletedIds: ids }
    });

    return await successResponseWithData(res, 'success_deleted', null);

  } catch (error) {
    console.error('Bulk delete metadata schemas error:', error);
    return await ErrorResponse(res, 'error_internal_server');
  }
};
