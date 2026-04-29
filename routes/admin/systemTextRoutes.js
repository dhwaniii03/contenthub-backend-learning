import express from 'express';
import {
  saveSystemText,
  getAllSystemTexts,
  getSystemTextById,
  updateSystemText,
  deleteSystemText,
  getPageNames
} from '../../modules/admin/controllers/systemTextController.js';
import { auth, authorizeRole } from '../../middlewares/authMiddleware.js';
import { withAudit } from '../../middlewares/auditMiddleware.js';
import { createUploader } from '../../middlewares/uploadMiddleware.js';

const router = express.Router();
const uploader = createUploader('SYSTEM_TEXT').fields([{ name: 'media', maxCount: 1 }]);

// Apply Admin Auth Middleware
router.use(auth);
router.use(authorizeRole('admin'));

/**
 * @swagger
 * /api/admin/system-texts/page-names:
 *   get:
 *     summary: Retrieve all available page names for categorization
 *     tags: [Admin System Texts]
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/page-names', getPageNames);

/**
 * @swagger
 * /api/admin/system-texts:
 *   get:
 *     summary: Retrieve paginated list of system texts
 *     tags: [Admin System Texts]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: languageCode
 *         schema:
 *           type: string
 *       - in: query
 *         name: pageNameId
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TEXT, ERROR, MEDIA]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 *   post:
 *     summary: Create a system key and its translations
 *     tags: [Admin System Texts]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "login_header_image"
 *               pageNameId:
 *                 type: string
 *                 format: uuid
 *               type:
 *                 type: string
 *                 enum: [TEXT, ERROR, MEDIA]
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PUBLISHED]
 *               media:
 *                 type: string
 *                 format: binary
 *               translations:
 *                 type: string
 *                 description: JSON string of translations array.
 *                 example: '[{"languageCode":"en","content":"Login","status":"PUBLISHED"}]'
 *     responses:
 *       201:
 *         description: Created
 */
router.get('/', getAllSystemTexts);
router.post('/', uploader, withAudit({ action: 'SAVE_SYSTEM_TEXT', module: 'SYSTEM_TEXT' }), saveSystemText);

/**
 * @swagger
 * /api/admin/system-texts/{id}:
 *   get:
 *     summary: Get a single system text by ID
 *     tags: [Admin System Texts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 *   patch:
 *     summary: Update a system text and its translations
 *     tags: [Admin System Texts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               pageNameId:
 *                 type: string
 *                 format: uuid
 *               type:
 *                 type: string
 *                 enum: [TEXT, ERROR, MEDIA]
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PUBLISHED]
 *               media:
 *                 type: string
 *                 format: binary
 *               translations:
 *                 type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/:id', getSystemTextById);
router.patch('/:id', uploader, withAudit({ action: 'UPDATE_SYSTEM_TEXT', module: 'SYSTEM_TEXT' }), updateSystemText);

/**
 * @swagger
 * /api/admin/system-texts/bulk-delete:
 *   post:
 *     summary: Bulk delete system texts by IDs
 *     tags: [Admin System Texts]
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
 *                 example: ["uuid-1", "uuid-2"]
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/bulk-delete', withAudit({ action: 'DELETE_SYSTEM_TEXT', module: 'SYSTEM_TEXT' }), deleteSystemText);

export default router;
