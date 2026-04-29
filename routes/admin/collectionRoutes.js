import express from "express";
import {
  getCollectionById,
  updateCollection,
  getAllCollections,
  addCollection,
  deleteCollection,
  bulkDeleteCollections,
  getCollectionList,
} from "../../modules/admin/controllers/collectionController.js";
import { auth, authorizeRole } from "../../middlewares/authMiddleware.js";
import { withAudit } from "../../middlewares/auditMiddleware.js";
import {
  createUploader,
  handleUploadError,
} from "../../middlewares/uploadMiddleware.js";

const router = express.Router();

// All collection routes require admin auth
router.use(auth, authorizeRole("admin"));

/**
 * @swagger
 * /api/admin/collections:
 *   get:
 *     summary: Retrieve all collections with search, filters and pagination
 *     tags: [Admin Collections]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or keywords
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *         description: Filter by status
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *         description: Filter by language code (e.g., 'en', 'es')
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
router.get("/", getAllCollections);

/**
 * @swagger
 * /api/admin/collections/list:
 *   get:
 *     summary: Minimal collection list for dropdowns
 *     tags: [Admin Collections]
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/list", getCollectionList);

/**
 * @swagger
 * /api/admin/collections/{id}:
 *   get:
 *     summary: Get a single collection by ID (language-aware)
 *     tags: [Admin Collections]
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
 *           default: en
 *         description: The language context for returned data
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/:id", getCollectionById);

/**
 * @swagger
 * /api/admin/collections:
 *   post:
 *     summary: Add a new Collection
 *     tags: [Admin Collections]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - translations
 *             properties:
 *               translations:
 *                 type: string
 *                 description: >
 *                   JSON array of language entries.
 *                 example: '[{"languageCode":"en","title":"Short Films","description":"..."}, {"languageCode":"es","title":"Cortometrajes"}]'
 *               isFeatured:
 *                 type: boolean
 *               sortOrder:
 *                 type: string
 *                 enum: [MANUAL, LATEST_FIRST]
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *               visibility:
 *                 type: string
 *                 enum: [PUBLIC, PRIVATE]
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *               banner:
 *                 type: string
 *                 format: binary
 *               contentIds:
 *                 type: string
 *                 description: JSON string array of content UUIDs for manual curation.
 *                 example: '["id1", "id2"]'
 *     responses:
 *       200:
 *         description: Collection created successfully
 */
router.post(
  "/",
  createUploader("COLLECTION_BANNER").fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  handleUploadError,
  withAudit({ action: "CREATE_COLLECTION", module: "COLLECTION" }),
  addCollection,
);

/**
 * @swagger
 * /api/admin/collections/{id}:
 *   patch:
 *     summary: Update an existing collection
 *     tags: [Admin Collections]
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               translations:
 *                 type: string
 *                 example: '[{"languageCode":"en","title":"New EN Title"}]'
 *               isFeatured:
 *                 type: boolean
 *               sortOrder:
 *                 type: string
 *                 enum: [MANUAL, LATEST_FIRST]
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *               visibility:
 *                 type: string
 *                 enum: [PUBLIC, PRIVATE]
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *               banner:
 *                 type: string
 *                 format: binary
 *               contentIds:
 *                 type: string
 *                 description: JSON string array to replace curated content list.
 *                 example: '["new-id1", "new-id2"]'
 *     responses:
 *       200:
 *         description: Updated successfully
 */
router.patch(
  "/:id",
  createUploader("COLLECTION_BANNER").fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  handleUploadError,
  withAudit({ action: "UPDATE_COLLECTION", module: "COLLECTION" }),
  updateCollection,
);

/**
 * @swagger
 * /api/admin/collections/bulk-delete:
 *   post:
 *     summary: Bulk delete multiple collections
 *     tags: [Admin Collections]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - collectionIds
 *             properties:
 *               collectionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["id1", "id2"]
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
router.post(
  "/bulk-delete",
  withAudit({ action: "BULK_DELETE_COLLECTION", module: "COLLECTION" }),
  bulkDeleteCollections,
);

/**
 * @swagger
 * /api/admin/collections/{id}:
 *   delete:
 *     summary: Delete a single collection
 *     tags: [Admin Collections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
router.delete(
  "/:id",
  withAudit({ action: "DELETE_COLLECTION", module: "COLLECTION" }),
  deleteCollection,
);

export default router;
