import express from 'express';
import {
  addContentType,
  getAllContentTypes,
  updateContentType,
  deleteContentTypes,
  getContentTypeById,
  getContentTypeList,
  getContentTypeSchema,
} from '../../modules/admin/controllers/contentTypeController.js';
import { auth, authorizeRole } from '../../middlewares/authMiddleware.js';
import { withAudit } from '../../middlewares/auditMiddleware.js';

const router = express.Router();

// All content-type routes require admin auth
router.use(auth, authorizeRole('admin'));

/**
 * @swagger
 * /api/admin/content-types/list:
 *   get:
 *     summary: Minimal content type list for dropdowns
 *     tags: [Admin Content Types]
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/list', getContentTypeList);

/**
 * @swagger
 * /api/admin/content-types/delete:
 *   post:
 *     summary: Unified delete (single or bulk) for content types
 *     tags: [Admin Content Types]
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
 *                 example: ["id1", "id2"]
 *     responses:
 *       200:
 *         description: Deleted successfully
 *       404:
 *         description: No active content types found
 */
router.post('/delete', withAudit({ action: 'DELETE_CONTENT_TYPES', module: 'CONTENT_TYPE' }), deleteContentTypes);

/**
 * @swagger
 * /api/admin/content-types:
 *   get:
 *     summary: Retrieve all content types with search, filters and pagination
 *     tags: [Admin Content Types]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or key
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *         description: Filter by status
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
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', getAllContentTypes);

/**
 * @swagger
 * /api/admin/content-types/{id}:
 *   patch:
 *     summary: Update an existing content type
 *     tags: [Admin Content Types]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *               isEnabledContent:
 *                 type: boolean
 *               allowMediaUpload:
 *                 type: boolean
 *               allowTags:
 *                 type: boolean
 *               metadataSchemaId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Updated successfully
 *       404:
 *         description: Content Type not found
 *       422:
 *         description: Validation error
 */
router.patch('/:id', withAudit({ action: 'UPDATE_CONTENT_TYPE', module: 'CONTENT_TYPE' }), updateContentType);

/**
 * @swagger
 * /api/admin/content-types/{id}:
 *   get:
 *     summary: Get a single content type by ID
 *     tags: [Admin Content Types]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 *       404:
 *         description: Not found
 */
router.get('/:id', getContentTypeById);

/**
 * @swagger
 * /api/admin/content-types/{id}/schema:
 *   get:
 *     summary: Retrieve Metadata Schema for a Content Type
 *     tags: [Admin Content Types]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/:id/schema', getContentTypeSchema);

/**
 * @swagger
 * /api/admin/content-types:
 *   post:
 *     summary: Add a new Content Type
 *     tags: [Admin Content Types]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - status
 *             properties:
 *               name:
 *                 type: string
 *                 example: News Article
 *               description:
 *                 type: string
 *                 example: Used for written articles and blogs style content.
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *                 example: ACTIVE
 *               isEnabledContent:
 *                 type: boolean
 *                 default: true
 *               allowMediaUpload:
 *                 type: boolean
 *                 default: true
 *               allowTags:
 *                 type: boolean
 *                 default: true
 *               metadataSchemaId:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Content Type created successfully
 *       422:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/', withAudit({ action: 'ADD_CONTENT_TYPE', module: 'CONTENT_TYPE' }), addContentType);

export default router;
