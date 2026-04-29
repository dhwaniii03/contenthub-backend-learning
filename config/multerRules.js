/**
 * Configuration for Unified Multer Upload System
 * Defines limits and allowed formats for each system component.
 */

export const UPLOAD_RULES = {
  PROFILE_PICTURE: {
    maxSize: 2 * 1024 * 1024, // 2MB
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxFiles: 1
  },

  CONTENT_THUMBNAIL: {
    maxSize: 2 * 1024 * 1024, // 2MB
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxFiles: 1
  },

  COLLECTION_BANNER: {
    maxSize: 5 * 1024 * 1024, // 5MB
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxFiles: 2
  },

  MEDIA_LIBRARY: {
    maxSize: 50 * 1024 * 1024, // 50MB
    mimeTypes: [
      "image/jpeg",
      "image/png",
      "video/mp4",
      "application/pdf",
      "image/svg+xml"
    ],
    maxFiles: 10
  },

  SITE_SETTINGS: {
    maxSize: 2 * 1024 * 1024, // 2MB
    mimeTypes: ["image/png", "image/jpeg", "image/svg+xml", "image/x-icon"],
    maxFiles: 2
  },

  ADMIN_PROFILE: {
    maxSize: 2 * 1024 * 1024, // 2MB
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxFiles: 1
  },

  SYSTEM_TEXT: {
    maxSize: 10 * 1024 * 1024, // 10MB
    mimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "application/pdf",
      "image/svg+xml"
    ],
    maxFiles: 1
  }
};
