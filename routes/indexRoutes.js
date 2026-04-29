import express from "express";
import adminRoutes from "./admin/adminRoutes.js";


const router = express.Router();

router.use("/admin", adminRoutes);

export default router;
