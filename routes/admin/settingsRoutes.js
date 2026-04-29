import express from "express";
import {
  getGlobalSettings,
  updateGeneralSettings,
  updateSeoSettings,
  updatePreferences,
  resetAllSettings,
} from "../../modules/admin/controllers/settingsController.js";
import { auth, authorizeRole } from "../../middlewares/authMiddleware.js";
import { withAudit } from "../../middlewares/auditMiddleware.js";
import {
  createUploader,
  handleUploadError,
} from "../../middlewares/uploadMiddleware.js";
import { validate } from "../../middlewares/validateMiddleware.js";
import {
  generalSettingsSchema,
  seoSettingsSchema,
  preferencesSchema,
} from "../../validators/settingsValidator.js";

const router = express.Router();

router.use(auth, authorizeRole("admin"));

/**
 * @swagger
 * /api/admin/settings/fetch-settings:
 *   get:
 *     summary: Get all global settings
 *     tags: [Admin Settings]
 *     responses:
 *       200:
 *         description: Settings retrieved
 */
router.get("/fetch-settings", getGlobalSettings);

/**
 * @swagger
 * /api/admin/settings/general-settings:
 *   patch:
 *     summary: Update General Settings (with Logo/Favicon)
 *     tags: [Admin Settings]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               siteName:
 *                 type: string
 *                 example: Stefan Content Hub
 *               siteDescription:
 *                 type: string
 *                 example: A curated platform to explore high-quality digital content.
 *               contactEmail:
 *                 type: string
 *                 example: admin@stefan-contenthub.io
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Upload a new file, or pass 'null' to remove the current logo.
 *               favicon:
 *                 type: string
 *                 format: binary
 *                 description: Upload a new file, or pass 'null' to remove the current favicon.
 *     responses:
 *       200:
 *         description: Settings updated
 */
router.patch(
  "/general-settings",
  createUploader("SITE_SETTINGS").fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
  ]),
  handleUploadError,
  validate(generalSettingsSchema),
  withAudit({ action: "UPDATE_GENERAL_SETTINGS", module: "SETTINGS" }),
  updateGeneralSettings,
);

/**
 * @swagger
 * /api/admin/settings/seo:
 *   patch:
 *     summary: Update SEO Settings
 *     tags: [Admin Settings]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               metaTitle:
 *                 type: string
 *                 example: Stefan Content Hub - Modern CMS
 *               metaDescription:
 *                 type: string
 *                 example: The most powerful backend for your content needs.
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - "CMS"
 *                   - "Backend"
 *                   - "Content Hub"
 *     responses:
 *       200:
 *         description: SEO updated
 */
router.patch("/seo", validate(seoSettingsSchema), withAudit({ action: "UPDATE_SEO_SETTINGS", module: "SETTINGS" }), updateSeoSettings);

/**
 * @swagger
 * /api/admin/settings/preferences-settings:
 *   patch:
 *     summary: Update Platform Preferences (Feature Toggles)
 *     tags: [Admin Settings]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               enablePublicContent: true
 *               enableSearch: true
 *               enableMultiLanguage: true
 *               enableUserNotifications: true
 *               enableUserRegistration: true
 *     responses:
 *       200:
 *         description: Preferences updated
 */
router.patch(
  "/preferences-settings",
  validate(preferencesSchema),
  withAudit({ action: "UPDATE_PREFERENCES", module: "SETTINGS" }),
  updatePreferences,
);

/**
 * @swagger
 * /api/admin/settings/reset-all:
 *   post:
 *     summary: RESET EVERYTHING (Settings, Files, and Languages)
 *     tags: [Admin Settings]
 *     responses:
 *       200:
 *         description: All settings and languages reset to defaults
 */
router.post("/reset-all", withAudit({ action: "RESET_ALL_SETTINGS", module: "SETTINGS" }), resetAllSettings);

export default router;
