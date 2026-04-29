import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { initSocket } from "./utils/socket.js";
import "./services/notificationService.js";


import { seedAdmin } from "./scripts/seedAdmin.js";
import { seedPageNames } from "./scripts/seedPageNames.js";
import { seedApiResponses } from "./scripts/seedApiResponses.js";
import indexRoutes from "./routes/indexRoutes.js";
import setupSwagger from "./utils/swagger.js";

import { langMiddleware } from "./middlewares/langMiddleware.js";

const app = express();
app.use(cookieParser());
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: true, // Echo back the requesting origin
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-lang"],
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);

app.use(express.json());
app.use("/public", express.static("public"));
app.use(langMiddleware);

// Routes
app.use("/api", indexRoutes);
setupSwagger(app);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Stefan Content Hub API!" });
});

// Start Server — run seeders sequentially to avoid Prisma connection conflicts
async function startServer() {
  try {
    await seedAdmin();
    await seedPageNames();
    await seedApiResponses();

    const server = http.createServer(app);
    initSocket(server);

    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
