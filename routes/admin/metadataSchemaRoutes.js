import express from 'express';
import {
  createMetadataSchema,
  updateMetadataSchema,
  getMetadataSchemaById,
  generateKey,
  validateSeoJson,
  autoGenerateSeoJson,
  getMetadataSchemas,
  bulkDeleteMetadataSchemas,
  deleteMetadataSchema,
} from '../../modules/admin/controllers/metadataSchemaController.js';
import { auth, authorizeRole } from '../../middlewares/authMiddleware.js';
import { withAudit } from '../../middlewares/auditMiddleware.js';

const router = express.Router();

router.use(auth, authorizeRole('admin'));

/**
 * @swagger
 * tags:
 *   name: Metadata Schema
 *   description: Dynamic form and SEO schema management
 */

/**
 * @swagger
 * /api/admin/metadata-schemas:
 *   get:
 *     summary: List Metadata Schemas with search, pagination, and filters
 *     tags: [Metadata Schema]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Inactive, "All Status"]
 *     responses:
 *       200:
 *         description: List of schemas retrieved
 */
router.get('/', getMetadataSchemas);

/**
 * @swagger
 * /api/admin/metadata-schemas/{id}:
 *   get:
 *     summary: Fetch all details for a Metadata Schema by ID (for Preview & Update)
 *     tags: [Metadata Schema]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Details retrieved successfully
 */
router.get('/:id', getMetadataSchemaById);

/**
 * @swagger
 * /api/admin/metadata-schemas/{id}:
 *   patch:
 *     summary: Update an existing Metadata Schema
 *     tags: [Metadata Schema]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated successfully
 */
router.patch('/:id', withAudit({ action: 'UPDATE_METADATA_SCHEMA', module: 'METADATA_SCHEMA' }), updateMetadataSchema);

/**
 * @swagger
 * /api/admin/metadata-schemas/{id}:
 *   delete:
 *     summary: Soft delete a Metadata Schema and its associated Content Types
 *     tags: [Metadata Schema]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
router.delete('/:id', withAudit({ action: 'DELETE_METADATA_SCHEMA', module: 'METADATA_SCHEMA' }), deleteMetadataSchema);

/**
 * @swagger
 * /api/admin/metadata-schemas/generate-key:
 *   post:
 *     summary: Generate a camelCase key from a field name
 *     tags: [Metadata Schema]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *     responses:
 *       200:
 *         description: Key generated successfully
 */
router.post('/generate-key', generateKey);

/**
 * @swagger
 * /api/admin/metadata-schemas/validate-json:
 *   post:
 *     summary: Validate a JSON string (stateless)
 *     tags: [Metadata Schema]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jsonString
 *     responses:
 *       200:
 *         description: JSON is valid
 */
router.post('/validate-json', validateSeoJson);

/**
 * @swagger
 * /api/admin/metadata-schemas/auto-generate-seo:
 *   post:
 *     summary: Generate a SEO JSON-LD template from fields
 *     tags: [Metadata Schema]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fields
 *             properties:
 *               schemaType:
 *                 type: string
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Template generated
 */
router.post('/auto-generate-seo', autoGenerateSeoJson);

/**
 * @swagger
 * /api/admin/metadata-schemas/bulk-delete:
 *   post:
 *     summary: Soft delete multiple Metadata Schemas
 *     tags: [Metadata Schema]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
router.post('/bulk-delete', withAudit({ action: 'BULK_DELETE_METADATA_SCHEMA', module: 'METADATA_SCHEMA' }), bulkDeleteMetadataSchemas);

/**
 * @swagger
 * /api/admin/metadata-schemas:
 *   post:
 *     summary: Save a new Metadata Schema
 *     tags: [Metadata Schema]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - schemaType
 *               - schema
 *             properties:
 *               title:
 *                 type: string
 *               schemaType:
 *                 type: string
 *               schema:
 *                 type: object
 *               seoSchema:
 *                 type: object
 *     responses:
 *       200:
 *         description: Schema saved successfully
 */
router.post('/', withAudit({ action: 'CREATE_METADATA_SCHEMA', module: 'METADATA_SCHEMA' }), createMetadataSchema);

export default router;
