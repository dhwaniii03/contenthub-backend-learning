import express from 'express';
import { uploadMedia, getMediaList, deleteMedia, updateMedia, getMediaDetail } from '../../modules/admin/controllers/mediaController.js';
import { auth, authorizeRole } from '../../middlewares/authMiddleware.js';
import { withAudit } from '../../middlewares/auditMiddleware.js';
import { createUploader, handleUploadError } from '../../middlewares/uploadMiddleware.js';

const router = express.Router();
const upload = createUploader('MEDIA_LIBRARY');

router.use(auth, authorizeRole('admin'));

/**
 * @swagger
 * /api/admin/media/upload:
 *   post:
 *     summary: Upload a new file to the Media Library
 *     tags: [Media Library]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               name:
 *                 type: string
 *               altText:
 *                 type: string
 *               caption:
 *                 type: string
 *               tags:
 *                 type: string
 *                 description: Comma separated tags
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/upload', upload.single('file'), handleUploadError, withAudit({ action: 'UPLOAD_MEDIA', module: 'MEDIA' }), uploadMedia);

/**
 * @swagger
 * /api/admin/media:
 *   get:
 *     summary: List all media assets with global stats
 *     tags: [Media Library]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [images, videos, documents]
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest, "size(small)", "size(large)"]
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalFiles:
 *                           type: integer
 *                         totalImages:
 *                           type: integer
 *                         totalVideos:
 *                           type: integer
 *                         totalStorageUsed:
 *                           type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         totalCount:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 */
router.get('/', getMediaList);

/**
 * @swagger
 * /api/admin/media/{id}:
 *   get:
 *     summary: Get detailed media asset information including usage stats
 *     tags: [Media Library]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Media UUID
 *     responses:
 *       200:
 *         description: Success
 *   patch:
 *     summary: Update media metadata OR replace the entire file
 *     tags: [Media Library]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Media UUID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Optional new file to replace the current one
 *               name:
 *                 type: string
 *               altText:
 *                 type: string
 *               caption:
 *                 type: string
 *               tags:
 *                 type: string
 *                 description: Comma separated tags
 *     responses:
 *       200:
 *         description: Success
 *   delete:
 *     summary: Delete a media asset (Soft Delete)
 *     tags: [Media Library]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Media UUID
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/:id', getMediaDetail);
router.patch('/:id', upload.single('file'), handleUploadError, withAudit({ action: 'UPDATE_MEDIA', module: 'MEDIA' }), updateMedia);
router.delete('/:id', withAudit({ action: 'DELETE_MEDIA', module: 'MEDIA' }), deleteMedia);

export default router;
