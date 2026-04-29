import express from "express";
import {
  createContent,
  getAllContents,
  getContentById,
  updateContent,
  deleteContent,
  bulkDeleteContents,
  getContentsForSelection,
  duplicateContent
} from "../../modules/admin/controllers/contentController.js";


import { auth, authorizeRole } from "../../middlewares/authMiddleware.js";
import { withAudit } from "../../middlewares/auditMiddleware.js";

const router = express.Router();

// All content routes require admin auth
router.use(auth, authorizeRole("admin"));

/**
 * @swagger
 * /api/admin/contents:
 *   post:
 *     summary: Create new headless content
 *     tags: [Content]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [contentTypeId, content]
 *             properties:
 *               contentTypeId:
 *                 type: string
 *                 example: "uuid-of-book-type"
 *               collectionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["uuid-1", "uuid-2"]
 *               content:
 *                 type: object
 *                 properties:
 *                   fields:
 *                     type: object
 *                     example: { "title": { "en": "My Book" }, "author": { "en": "John Doe" } }
 *                   media:
 *                     type: array
 *                     items:
 *                       type: object
 *                       example: { "coverImage": "uuid-of-media" }
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["fiction", "bestseller"]
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *                 default: ACTIVE
 *               visibility:
 *                 type: string
 *                 enum: [PUBLIC, PRIVATE]
 *                 default: PUBLIC
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/", withAudit({ action: "CREATE_CONTENT", module: "CONTENT" }), createContent);

/**
 * @swagger
 * /api/admin/contents:
 *   get:
 *     summary: List all content with pagination and search
 *     tags: [Content]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: collectionId
 *         schema:
 *           type: string
 *       - in: query
 *         name: languageCode
 *         schema:
 *           type: string
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
router.get("/", getAllContents);

/**
 * @swagger
 * /api/admin/contents/selection:
 *   get:
 *     summary: Search contents for collection selection with isPresent flag
 *     tags: [Content]
 *     parameters:
 *       - in: query
 *         name: collectionId
 *         required: false
 *         description: The ID of the collection being edited.
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         description: Keyword search for title or tags.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/selection", getContentsForSelection);

/**
 * @swagger
 * /api/admin/contents/{id}:
 *   get:
 *     summary: Get content details by ID
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *         description: Optional language code to return flat localizedFields for preview.
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/:id", getContentById);

/**
 * @swagger
 * /api/admin/contents/{id}:
 *   patch:
 *     summary: Update existing headless content
 *     tags: [Content]
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
 *               content:
 *                 type: object
 *               collectionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *               visibility:
 *                 type: string
 *                 enum: [PUBLIC, PRIVATE]
 *     responses:
 *       200:
 *         description: Success
 */
router.patch("/:id", withAudit({ action: "UPDATE_CONTENT", module: "CONTENT" }), updateContent);

/**
 * @swagger
 * /api/admin/contents/{id}:
 *   delete:
 *     summary: Soft delete content (comma-separated IDs possible)
 *     tags: [Content]
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
router.delete("/:id", withAudit({ action: "DELETE_CONTENT", module: "CONTENT" }), deleteContent);

/**
 * @swagger
 * /api/admin/contents/bulk-delete:
 *   post:
 *     summary: Soft delete multiple contents
 *     tags: [Content]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
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
router.post("/bulk-delete", withAudit({ action: "BULK_DELETE_CONTENT", module: "CONTENT" }), bulkDeleteContents);

/**
 * @swagger
 * /api/admin/contents/{id}/duplicate:
 *   post:
 *     summary: Duplicate existing content
 *     tags: [Content]
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
router.post("/:id/duplicate", withAudit({ action: "DUPLICATE_CONTENT", module: "CONTENT" }), duplicateContent);

export default router;

