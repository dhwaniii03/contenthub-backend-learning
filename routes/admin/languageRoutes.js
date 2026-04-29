import express from 'express';
import { getLanguages, addLanguage, setDefaultLanguage, deleteLanguage } from '../../modules/admin/controllers/languageController.js';
import { auth, authorizeRole } from '../../middlewares/authMiddleware.js';
import { withAudit } from '../../middlewares/auditMiddleware.js';
import { validate } from '../../middlewares/validateMiddleware.js';
import { languageSchema } from '../../validators/languageValidator.js';

const router = express.Router();

// All routes protected by Admin Auth
router.use(auth, authorizeRole('admin'));

/**
 * @swagger
 * /api/admin/languages:
 *   get:
 *     summary: Get all supported languages
 *     tags: [Admin Languages]
 *     responses:
 *       200:
 *         description: Languages list retrieved
 */
router.get('/', getLanguages);

/**
 * @swagger
 * /api/admin/languages:
 *   post:
 *     summary: Add a new language
 *     tags: [Admin Languages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - languageName
 *               - languageCode
 *               - countryCode
 *             properties:
 *               languageName:
 *                 type: string
 *                 example: Spanish
 *               languageCode:
 *                 type: string
 *                 example: es
 *               countryCode:
 *                 type: string
 *                 example: ES
 *               isDefault:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Language added successfully
 *       400:
 *         description: Validation error
 */
router.post('/', validate(languageSchema), withAudit({ action: 'ADD_LANGUAGE', module: 'LANGUAGE' }), addLanguage);

/**
 * @swagger
 * /api/admin/languages/set-default:
 *   patch:
 *     summary: Set a language as platform default (Swaps current default)
 *     tags: [Admin Languages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newDefaultId
 *             properties:
 *               newDefaultId:
 *                 type: string
 *                 example: uuid-of-new-default
 *               oldDefaultId:
 *                 type: string
 *                 example: uuid-of-previous-default
 *     responses:
 *       200:
 *         description: Default language updated
 */
router.patch('/set-default', withAudit({ action: 'SET_DEFAULT_LANGUAGE', module: 'LANGUAGE' }), setDefaultLanguage);

/**
 * @swagger
 * /api/admin/languages/{id}:
 *   delete:
 *     summary: Remove a language
 *     tags: [Admin Languages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Language deleted successfully
 *       400:
 *         description: Cannot delete default language
 */
router.delete('/:id', withAudit({ action: 'DELETE_LANGUAGE', module: 'LANGUAGE' }), deleteLanguage);

export default router;
