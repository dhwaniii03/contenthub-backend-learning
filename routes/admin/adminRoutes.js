import express from "express";
import authRoutes from "./authRoutes.js";
import settingsRoutes from "./settingsRoutes.js";
import languageRoutes from "./languageRoutes.js";
import collectionRoutes from "./collectionRoutes.js";
import contentTypeRoutes from "./contentTypeRoutes.js";
import adminProfileRoutes from "./adminProfileRoutes.js";
import metadataSchemaRoutes from "./metadataSchemaRoutes.js";
import mediaRoutes from "./mediaRoutes.js";
import contentRoutes from "./contentRoutes.js";
import systemTextRoutes from "./systemTextRoutes.js";
import googleAuthRoutes from "./googleAuthRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import auditRoutes from "./auditRoutes.js";
import notificationRoutes from "./notificationRoutes.js";


const router = express.Router();

router.use("/auth", authRoutes);
router.use("/settings", settingsRoutes);
router.use("/languages", languageRoutes);
router.use("/collections", collectionRoutes);
router.use("/content-types", contentTypeRoutes);
router.use("/profile", adminProfileRoutes);
router.use("/metadata-schemas", metadataSchemaRoutes);
router.use("/media", mediaRoutes);
router.use("/contents", contentRoutes);
router.use("/system-texts", systemTextRoutes);
router.use("/2fa", googleAuthRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/audit-logs", auditRoutes);
router.use("/notifications", notificationRoutes);


export default router;
