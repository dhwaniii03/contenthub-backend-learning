import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { UPLOAD_RULES } from "../config/multerRules.js";
import {
  unsuccessResponseWithoutData,
  ErrorResponse,
} from "../utils/apiResponse.js";

/**
 * Utility to detect file type folder based on MIME type
 */
const getFileTypeFolder = (mimetype) => {
  if (mimetype.startsWith("image/")) return "images";
  if (mimetype.startsWith("video/")) return "videos";
  if (mimetype === "application/pdf") return "documents";
  if (mimetype === "image/x-icon") return "icons";
  return "others";
};

/**
 * Higher-Order Function to create a configured Multer Instance
 * @param {string} componentName - The key from UPLOAD_RULES (e.g., 'PROFILE_PICTURE')
 */
export const createUploader = (componentName) => {
  const rules = UPLOAD_RULES[componentName];

  if (!rules) {
    throw new Error(`Invalid Multer Component: ${componentName}`);
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const fileTypeFolder = getFileTypeFolder(file.mimetype); // Map component keys to actual folder names for cleaner paths

      const componentFolderMap = {
        PROFILE_PICTURE: "profile",
        CONTENT_THUMBNAIL: "content",
        COLLECTION_BANNER: "collections",
        MEDIA_LIBRARY: "media-library",
        SITE_SETTINGS: "settings",
        ADMIN_PROFILE: "profiles",
        SYSTEM_TEXT: "system-text",
      };

      const folderName =
        componentFolderMap[componentName] || componentName.toLowerCase();
      const uploadPath =
        componentName === "ADMIN_PROFILE"
          ? path.join("public", "uploads", folderName)
          : path.join("public", "uploads", folderName, fileTypeFolder); // Create directories recursively if they don't exist

      fs.mkdirSync(uploadPath, { recursive: true });

      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + crypto.randomUUID();
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    },
  });

  const fileFilter = (req, file, cb) => {
    if (rules.mimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file type for ${componentName}. Allowed types: ${rules.mimeTypes.join(", ")}`,
        ),
        false,
      );
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: rules.maxSize,
      files: rules.maxFiles,
    },
  });
};

/**
 * Helper to handle Multer Error responses cleanly
 */
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return unsuccessResponseWithoutData(res, "File too large");
    }
    return unsuccessResponseWithoutData(res, err.message);
  } else if (err) {
    return unsuccessResponseWithoutData(res, err.message);
  }
  next();
};
